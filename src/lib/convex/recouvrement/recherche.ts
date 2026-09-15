import { v, type Infer } from 'convex/values';
import { authedQuery } from '../functions';
import { internalQuery, type QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { getUserOrg } from '../lib/auth';
import { additionner, enCentimes, ZERO } from '../../socle/montants';
import { normaliserFournisseur } from '../../socle/normalisation';
import { normaliserSiren, sirenDepuisSiret } from '../../verticales/recouvrement/pays/france/siren';
import { PROCEDURES } from '../../verticales/recouvrement/procedures';
import { resteDu } from './lecture';
import { lireSuivi } from './apresProcedure';

/**
 * LA RECHERCHE : débiteurs, factures, procédures, dans cet ordre et sans score
 * entre familles (spec § 7).
 *
 * ⚠️ LE CLOISONNEMENT SE POSE À TROIS ENDROITS, ET AUCUN NE SUFFIT SEUL. Les
 * deux index de recherche déclarent `organizationId` en filtre ; chaque appel
 * `withSearchIndex` l'applique ; chaque document rendu est revérifié ici.
 * `__tests__/recherche-cloisonnee.test.ts` échoue si l'un des deux premiers
 * manque. Un index de recherche sans filtre rendrait les débiteurs de TOUS les
 * clients : c'est le seul oubli du produit à la fois silencieux et total.
 *
 * ⚠️ LA RECHERCHE PLEIN TEXTE DE CONVEX NE DÉCOUPE PAS COMME ON LE CROIT.
 * `FA-2026-0311` y devient `fa`, `2026`, `0311` combinés en OU, et seul le
 * dernier jeton compte en préfixe. La correspondance exacte passe donc
 * TOUJOURS devant, par un index ordinaire : le plein texte ne sert qu'au
 * partiel.
 */

/** Ce qu'une famille montre repliée. */
const PREMIERS = 3;
/**
 * Ce qu'une famille lit au plus. Convex refuse au-delà de 1024 documents
 * parcourus par recherche : la lecture s'arrête à 51, et la 51e ne sert qu'à
 * savoir qu'il y en a plus. Au-delà, l'écran le dit, et n'invente pas de total.
 */
const BORNE = 50;

const vFamille = v.union(v.literal('DEBITEURS'), v.literal('FACTURES'), v.literal('PROCEDURES'));

const vDebiteurTrouve = v.object({
	_id: v.id('debiteurs'),
	denomination: v.string(),
	/** Ce qui distingue deux homonymes. */
	siren: v.optional(v.string()),
	/** Ce qui reste dû, toutes factures non soldées confondues, en centimes. */
	encours: v.int64()
});

const vFactureTrouvee = v.object({
	_id: v.id('facturesVente'),
	reference: v.string(),
	debiteurId: v.id('debiteurs'),
	debiteur: v.string(),
	dateEcheance: v.optional(v.string()),
	resteDu: v.int64()
});

const vProcedureTrouvee = v.object({
	creanceId: v.id('creances'),
	/** Le nom de la procédure, tel que le domaine l'écrit. */
	procedure: v.string(),
	debiteur: v.string(),
	/** La date limite qui commande, ou `null` s'il n'y en a pas. */
	prochaineEcheance: v.union(v.string(), v.null())
});

/**
 * `total` est VRAI jusqu'à la borne. `borne` dit que la lecture s'est arrêtée
 * avant la fin : `total` est alors un plancher, et l'écran l'écrit comme tel.
 */
const vSectionDebiteurs = v.object({
	total: v.number(),
	borne: v.boolean(),
	premiers: v.array(vDebiteurTrouve)
});
const vSectionFactures = v.object({
	total: v.number(),
	borne: v.boolean(),
	premiers: v.array(vFactureTrouvee)
});
const vSectionProcedures = v.object({
	total: v.number(),
	borne: v.boolean(),
	premiers: v.array(vProcedureTrouvee)
});

const vResultat = v.object({
	debiteurs: vSectionDebiteurs,
	factures: vSectionFactures,
	procedures: vSectionProcedures,
	/** Avant la frappe : les débiteurs dont quelque chose a bougé, résolus ici. */
	recents: v.array(vDebiteurTrouve),
	/** Aucun débiteur dans l'établissement : la palette montre le chemin de l'import. */
	etablissementVide: v.boolean()
});

export type ResultatRecherche = Infer<typeof vResultat>;
type DebiteurTrouve = Infer<typeof vDebiteurTrouve>;
type FactureTrouvee = Infer<typeof vFactureTrouvee>;
type ProcedureTrouvee = Infer<typeof vProcedureTrouvee>;
type Famille = Infer<typeof vFamille>;

const vArgs = {
	terme: v.string(),
	/** La famille dépliée par « Voir tout » : elle seule est enrichie jusqu'à la borne. */
	deplier: v.optional(vFamille),
	/**
	 * Les identifiants des débiteurs du flux, dans son ordre. Des CHAÎNES, parce
	 * que le flux les porte ainsi : chacun est relu et revérifié ici, et un
	 * identifiant d'un autre établissement ne rend rien.
	 */
	recents: v.optional(v.array(v.string()))
};

interface ArgsRecherche {
	terme: string;
	deplier?: Famille;
	recents?: string[];
}

/** Fusionne des lectures dans leur ordre, sans doublon ni document d'un autre établissement. */
function fusionner<T extends { _id: string; organizationId: Id<'organizations'> }>(
	organizationId: Id<'organizations'>,
	...lectures: readonly (readonly T[])[]
): { trouves: T[]; borne: boolean } {
	const vus = new Set<string>();
	const trouves: T[] = [];
	for (const lecture of lectures) {
		for (const doc of lecture) {
			if (doc.organizationId !== organizationId || vus.has(doc._id)) continue;
			vus.add(doc._id);
			trouves.push(doc);
		}
	}
	return { trouves: trouves.slice(0, BORNE), borne: trouves.length > BORNE };
}

async function debiteurTrouve(ctx: QueryCtx, debiteur: Doc<'debiteurs'>): Promise<DebiteurTrouve> {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteur._id))
		.collect();
	const restes = await Promise.all(
		factures
			.filter((f) => f.organizationId === debiteur.organizationId && f.statutPaiement !== 'SOLDEE')
			.map((f) => resteDu(ctx, f))
	);
	return {
		_id: debiteur._id,
		denomination: debiteur.denomination,
		siren: debiteur.siren,
		encours: enCentimes(restes.length > 0 ? additionner(...restes) : ZERO)
	};
}

/** Le nom d'un débiteur, lu une fois par recherche. */
async function nomDu(
	ctx: QueryCtx,
	noms: Map<Id<'debiteurs'>, string>,
	debiteurId: Id<'debiteurs'>,
	organizationId: Id<'organizations'>
): Promise<string> {
	const connu = noms.get(debiteurId);
	if (connu !== undefined) return connu;
	const debiteur = await ctx.db.get(debiteurId);
	const nom =
		debiteur !== null && debiteur.organizationId === organizationId
			? debiteur.denomination
			: 'Débiteur inconnu';
	noms.set(debiteurId, nom);
	return nom;
}

function nomDeProcedure(cle: string): string {
	return (
		(PROCEDURES as Readonly<Record<string, { readonly nom: string } | undefined>>)[cle]?.nom ?? cle
	);
}

function vide() {
	return { total: 0, borne: false, premiers: [] };
}

async function chercher(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	{ terme: brut, deplier, recents }: ArgsRecherche
): Promise<ResultatRecherche> {
	const unDebiteur = await ctx.db
		.query('debiteurs')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	const etablissementVide = unDebiteur === null;
	const terme = brut.trim();

	if (terme === '') {
		const vus = new Set<string>();
		const lus: DebiteurTrouve[] = [];
		for (const brutId of recents ?? []) {
			if (lus.length >= PREMIERS) break;
			const debiteurId = ctx.db.normalizeId('debiteurs', brutId);
			if (debiteurId === null || vus.has(debiteurId)) continue;
			vus.add(debiteurId);
			const debiteur = await ctx.db.get(debiteurId);
			if (debiteur === null || debiteur.organizationId !== organizationId) continue;
			lus.push(await debiteurTrouve(ctx, debiteur));
		}
		return {
			debiteurs: vide(),
			factures: vide(),
			procedures: vide(),
			recents: lus,
			etablissementVide
		};
	}

	const combien = (famille: Famille) => (deplier === famille ? BORNE : PREMIERS);

	/*
	  LES DÉBITEURS. Le SIREN d'abord, exactement : un SIREN à un chiffre près
	  désigne une autre entreprise. Un SIRET collé depuis une facture se lit par
	  ses neuf premiers chiffres plutôt que de rendre « rien ».
	*/
	const siren = normaliserSiren(terme) ?? sirenDepuisSiret(terme);
	const parSiren =
		siren === null
			? []
			: await ctx.db
					.query('debiteurs')
					.withIndex('by_org_and_siren', (q) =>
						q.eq('organizationId', organizationId).eq('siren', siren)
					)
					.take(BORNE + 1);
	/*
	  ⚠️ LE TERME PASSE PAR LA FONCTION QUI ÉCRIT LE CHAMP. L'analyseur Convex met
	  en minuscules mais garde les accents : « Société Durand » tapé ne trouverait
	  pas « SOCIETE DURAND » stocké.
	*/
	const nom = normaliserFournisseur(terme);
	const parNom =
		nom === ''
			? []
			: await ctx.db
					.query('debiteurs')
					.withSearchIndex('recherche_denomination', (q) =>
						q.search('denominationNormalisee', nom).eq('organizationId', organizationId)
					)
					.take(BORNE + 1);
	const debiteurs = fusionner(organizationId, parSiren, parNom);

	/* LES FACTURES. La référence exacte d'abord, le plein texte complète. */
	const exactes = await ctx.db
		.query('facturesVente')
		.withIndex('by_org_and_reference', (q) =>
			q.eq('organizationId', organizationId).eq('reference', terme)
		)
		.take(BORNE + 1);
	const approchees = await ctx.db
		.query('facturesVente')
		.withSearchIndex('recherche_reference', (q) =>
			q.search('reference', terme).eq('organizationId', organizationId)
		)
		.take(BORNE + 1);
	const factures = fusionner(organizationId, exactes, approchees);

	/*
	  LES PROCÉDURES n'ont pas d'index : un dossier engagé se trouve par son
	  débiteur, ou par une facture qu'il porte. C'est la lecture de
	  `dossiersEngages`, sans une table ni un index de plus.
	*/
	const debiteursTrouves = new Set<string>(debiteurs.trouves.map((d) => d._id));
	const creancesDesFactures = new Set<string>(
		factures.trouves.flatMap((f) => (f.creanceId === undefined ? [] : [f.creanceId]))
	);
	const engagees = await ctx.db
		.query('creances')
		.withIndex('by_org_and_statut', (q) =>
			q.eq('organizationId', organizationId).eq('statut', 'ENGAGEE')
		)
		.collect();
	const dossiers = engagees.filter(
		(c) =>
			c.organizationId === organizationId &&
			c.procedureEngagee !== undefined &&
			c.engageeLe !== undefined &&
			(debiteursTrouves.has(c.debiteurId) || creancesDesFactures.has(c._id))
	);

	const noms = new Map<Id<'debiteurs'>, string>(
		debiteurs.trouves.map((d) => [d._id, d.denomination])
	);

	const premiersDebiteurs: DebiteurTrouve[] = [];
	for (const debiteur of debiteurs.trouves.slice(0, combien('DEBITEURS'))) {
		premiersDebiteurs.push(await debiteurTrouve(ctx, debiteur));
	}

	const premieresFactures: FactureTrouvee[] = [];
	for (const facture of factures.trouves.slice(0, combien('FACTURES'))) {
		premieresFactures.push({
			_id: facture._id,
			reference: facture.reference,
			debiteurId: facture.debiteurId,
			debiteur: await nomDu(ctx, noms, facture.debiteurId, organizationId),
			dateEcheance: facture.dateEcheance,
			resteDu: enCentimes(await resteDu(ctx, facture))
		});
	}

	const premieresProcedures: ProcedureTrouvee[] = [];
	for (const creance of dossiers.slice(0, combien('PROCEDURES'))) {
		const suivi = await lireSuivi(ctx, creance);
		premieresProcedures.push({
			creanceId: creance._id,
			procedure: nomDeProcedure(creance.procedureEngagee ?? ''),
			debiteur: await nomDu(ctx, noms, creance.debiteurId, organizationId),
			prochaineEcheance: suivi.echeances[0]?.dateLimite ?? null
		});
	}

	return {
		debiteurs: {
			total: debiteurs.trouves.length,
			borne: debiteurs.borne,
			premiers: premiersDebiteurs
		},
		factures: {
			total: factures.trouves.length,
			borne: factures.borne,
			premiers: premieresFactures
		},
		procedures: {
			total: Math.min(dossiers.length, BORNE),
			// Des débiteurs ou des factures coupés à la borne peuvent porter des
			// dossiers qu'on n'a pas croisés : le total devient alors un plancher.
			borne: dossiers.length > BORNE || debiteurs.borne || factures.borne,
			premiers: premieresProcedures
		},
		recents: [],
		etablissementVide
	};
}

export const recherche = authedQuery({
	args: vArgs,
	returns: vResultat,
	handler: async (ctx, args): Promise<ResultatRecherche> => {
		const { organizationId } = await getUserOrg(ctx);
		return await chercher(ctx, organizationId, args);
	}
});

/** Le jumeau à `organizationId`, pour les tests : aucun test ne se connecte. */
export const rechercheInterne = internalQuery({
	args: { organizationId: v.id('organizations'), ...vArgs },
	returns: vResultat,
	handler: async (ctx, { organizationId, ...args }): Promise<ResultatRecherche> =>
		await chercher(ctx, organizationId, args)
});
