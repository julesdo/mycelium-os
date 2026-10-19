import { v, ConvexError, type Infer } from 'convex/values';
import { internal } from '../_generated/api';
import {
	adresseDeRecherche,
	lireReponseDeLAnnuaire,
	type EntrepriseTrouvee,
	type PageDeLAnnuaire,
	SECTEURS,
	versProspect,
	ZONES,
	type CleSecteur,
	type CleZone
} from '../../crm/annuaire';
import { equipeAction } from './action';
import { equipeMutation, noterAuJournal } from './enveloppe';
import { naissanceDuProspect } from './prospects';
import type { Parcours } from '../../crm/parcours';

/** Le parcours de prospection de chaque secteur cherché à l'annuaire. */
const PARCOURS_DU_SECTEUR: Readonly<Record<CleSecteur, Parcours>> = {
	TRANSPORT: 'TRANSPORTEUR',
	BATIMENT: 'PME_LOGICIEL',
	SERVICES: 'PME_LOGICIEL',
	CABINETS: 'EXPERT_COMPTABLE'
};

/**
 * TROUVER DES ENTREPRISES À L'ANNUAIRE, PUIS LES AJOUTER (17/10/2026).
 *
 * `chercher` lit une page de l'API Recherche d'entreprises (logique pure dans
 * `crm/annuaire.ts`) et dit, pour chaque entreprise, si elle est déjà au CRM.
 * `ajouter` écrit celles que l'équipe a cochées, en revérifiant les doublons par
 * SIREN au moment même, et inscrit l'ajout dans l'historique des imports.
 */

const vSecteur = v.union(
	v.literal('TRANSPORT'),
	v.literal('BATIMENT'),
	v.literal('SERVICES'),
	v.literal('CABINETS')
);
const vZone = v.union(v.literal('PARIS'), v.literal('PETITE_COURONNE'), v.literal('ILE_DE_FRANCE'));
// Les validateurs suivent les clés du module pur : un secteur ajouté là casse ici.
const _secteurs: Record<CleSecteur, Infer<typeof vSecteur>> = {
	TRANSPORT: 'TRANSPORT',
	BATIMENT: 'BATIMENT',
	SERVICES: 'SERVICES',
	CABINETS: 'CABINETS'
};
const _zones: Record<CleZone, Infer<typeof vZone>> = {
	PARIS: 'PARIS',
	PETITE_COURONNE: 'PETITE_COURONNE',
	ILE_DE_FRANCE: 'ILE_DE_FRANCE'
};
void _secteurs;
void _zones;

const vEntrepriseTrouvee = v.object({
	siren: v.string(),
	entreprise: v.string(),
	activite: v.optional(v.string()),
	effectif: v.optional(v.string()),
	ville: v.optional(v.string()),
	dirigeant: v.optional(v.string()),
	fonction: v.optional(v.string())
});

/** Une page cochée entière, quatre fois : au-delà, on ajoute en plusieurs fois. */
const AJOUT_MAX = 100;

/** Une page de l'annuaire ne garde parfois que huit sièges dans la zone : on enchaîne. */
const SIEGES_VISES = 15;
const PAGES_PAR_APPEL = 3;

async function lirePage(
	secteur: CleSecteur,
	zone: CleZone,
	page: number
): Promise<PageDeLAnnuaire> {
	let reponse: Response;
	try {
		reponse = await fetch(adresseDeRecherche({ secteur, zone, page }), {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		throw new ConvexError('L’annuaire ne répond pas. Réessayez dans un instant.');
	}
	if (reponse.status === 429) {
		throw new ConvexError('L’annuaire demande de ralentir. Réessayez dans quelques secondes.');
	}
	if (!reponse.ok) {
		throw new ConvexError(`L’annuaire a refusé la recherche (erreur ${reponse.status}).`);
	}
	try {
		return lireReponseDeLAnnuaire(await reponse.json(), ZONES[zone].departements);
	} catch {
		throw new ConvexError('L’annuaire a rendu une réponse inattendue.');
	}
}

type EntrepriseMarquee = EntrepriseTrouvee & { connue: boolean };

export const chercher = equipeAction('SUPPORT')({
	args: { secteur: vSecteur, zone: vZone, page: v.number() },
	returns: v.object({
		pages: v.number(),
		/** La dernière page lue : « Voir la suite » repart de la suivante. */
		derniere: v.number(),
		entreprises: v.array(v.object({ ...vEntrepriseTrouvee.fields, connue: v.boolean() }))
	}),
	handler: async (
		ctx,
		{ secteur, zone, page }
	): Promise<{ pages: number; derniere: number; entreprises: EntrepriseMarquee[] }> => {
		const trouvees: EntrepriseTrouvee[] = [];
		let pages = 1;
		let derniere = Math.max(1, Math.trunc(page));
		for (let lues = 0; lues < PAGES_PAR_APPEL; lues += 1) {
			const lue = await lirePage(secteur, zone, derniere);
			pages = lue.pages;
			trouvees.push(...lue.entreprises);
			if (trouvees.length >= SIEGES_VISES || derniere >= pages) break;
			derniere += 1;
		}
		const connus = new Set(
			await ctx.runQuery(internal.admin.annuaireLecture.sirensConnus, {
				sirens: trouvees.map((e) => e.siren)
			})
		);
		return {
			pages,
			derniere,
			entreprises: trouvees.map((e) => ({ ...e, connue: connus.has(e.siren) }))
		};
	}
});

export const ajouter = equipeMutation('SUPPORT')({
	args: { secteur: vSecteur, zone: vZone, entreprises: v.array(vEntrepriseTrouvee) },
	returns: v.object({ importes: v.number(), ecartes: v.number() }),
	handler: async (ctx, { secteur, zone, entreprises }) => {
		if (entreprises.length === 0) throw new ConvexError('Aucune entreprise cochée.');
		if (entreprises.length > AJOUT_MAX) {
			throw new ConvexError(`Au plus ${AJOUT_MAX} entreprises à la fois.`);
		}
		const maintenant = Date.now();
		const vues = new Set<string>();
		const retenues = [];
		for (const e of entreprises) {
			if (!/^\d{9}$/.test(e.siren) || e.entreprise.trim() === '' || vues.has(e.siren)) continue;
			vues.add(e.siren);
			const deja = await ctx.db
				.query('prospects')
				.withIndex('by_siren', (q) => q.eq('siren', e.siren))
				.first();
			if (deja === null) retenues.push(e);
		}
		const libelle = `Annuaire : ${SECTEURS[secteur].libelle}, ${ZONES[zone].libelle}`;
		const importId = await ctx.db.insert('importsProspects', {
			fichier: libelle,
			lignes: entreprises.length,
			importes: retenues.length,
			ecartes: entreprises.length - retenues.length,
			oppositions: 0,
			par: ctx.equipier.email,
			le: maintenant
		});
		for (const e of retenues) {
			const prospect = versProspect(e, secteur, maintenant);
			await ctx.db.insert('prospects', {
				...prospect,
				...naissanceDuProspect({ ...prospect, parcours: PARCOURS_DU_SECTEUR[secteur] }),
				importId,
				creePar: ctx.equipier.email,
				creeLe: maintenant
			});
		}
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'IMPORT',
			cible: { type: 'IMPORT', id: importId, libelle: `${libelle} : ${retenues.length} prospects` }
		});
		return { importes: retenues.length, ecartes: entreprises.length - retenues.length };
	}
});
