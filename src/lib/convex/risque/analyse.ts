import { v, ConvexError } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { authedAction } from '../functions';
import { configPappers, type ConfigPappers } from './pappersConfig';
import {
	analyserLeRisque,
	MOT_DU_NIVEAU,
	ORDRE_DES_NIVEAUX,
	type Niveau,
	type PaiementsChezVous,
	type ParcoursDirigeant
} from '../../verticales/recouvrement/risque/analyse';
import {
	BAISSE_SIGNALEE,
	DIRIGEANTS_LUS,
	INTERVALLE_MINIMAL_MS
} from '../../verticales/recouvrement/risque/regles';
import {
	CHAMPS_SUPPLEMENTAIRES,
	lireFichePappers,
	rapprocherLeDirigeant,
	rechercheDuDirigeant
} from '../../verticales/recouvrement/pays/france/pappers';
import {
	filtreDesProcedures,
	proceduresOuvertes
} from '../../verticales/recouvrement/pays/france/antecedents';
import { lireEtablissements } from '../../verticales/recouvrement/pays/france/etablissements';
import { estSirenValide } from '../../verticales/recouvrement/pays/france/siren';

/**
 * L'ANALYSE DU RISQUE, BRANCHÉE SUR PAPPERS ET LE JOURNAL OFFICIEL (13/10/2026).
 *
 * Toute la règle vit dans `verticales/recouvrement/risque/` ; ce fichier
 * interroge, assemble et écrit.
 *
 *   1. LE BUDGET : une analyse par heure et par entreprise au plus, et un plafond
 *      mensuel par établissement (`ANALYSES_PAR_MOIS`).
 *   2. LA FICHE PAPPERS (1 crédit, + 1 pour l'actif net).
 *   3. LES DIRIGEANTS PERSONNES PHYSIQUES, quatre au plus : une recherche chacun
 *      (0,1 crédit par résultat, cinq résultats au plus), le rapprochement par la
 *      société analysée, puis leurs autres sociétés au journal officiel (gratuit).
 *   4. VOTRE HISTORIQUE, si c'est un client (`comportement.ts`).
 *   5. LE CALCUL, l'enregistrement, et une notification si l'indice baisse franchement.
 *
 * ⚠️ UNE RECHERCHE DE DIRIGEANT QUI ÉCHOUE N'EMPORTE PAS L'ANALYSE : ce dirigeant
 * devient « non lu », et la lisibilité le dit.
 *
 * ⚠️ CHAQUE HANDLER ANNOTE SON TYPE DE RETOUR : ce module se planifie lui-même.
 */

const BASE_BODACC =
	'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';

/** Une erreur de Pappers, avec son statut. */
class ErreurPappers extends Error {
	constructor(readonly statut: number) {
		super(`Pappers a répondu ${statut}`);
	}
}

async function appelPappers(
	config: ConfigPappers,
	chemin: string,
	parametres: Readonly<Record<string, string>>
): Promise<unknown> {
	const url = new URL(`${config.hote}/${chemin}`);
	for (const [cle, valeur] of Object.entries(parametres)) url.searchParams.set(cle, valeur);
	// ⚠️ LA CLÉ DANS L'EN-TÊTE, jamais dans l'adresse (qui finirait dans des journaux).
	const reponse = await fetch(url, { headers: { 'api-key': config.cle } });
	if (!reponse.ok) throw new ErreurPappers(reponse.status);
	return (await reponse.json()) as unknown;
}

/** Les jugements d'ouverture des autres sociétés d'un dirigeant, au journal officiel. */
async function proceduresDesSocietes(
	societes: ParcoursDirigeant['societes']
): Promise<ParcoursDirigeant['procedures']> {
	const filtre = filtreDesProcedures(societes);
	if (filtre === null) return [];
	const url =
		`${BASE_BODACC}?limit=100&order_by=${encodeURIComponent('dateparution DESC')}` +
		`&where=${encodeURIComponent(filtre)}`;
	const reponse = await fetch(url);
	if (!reponse.ok) throw new Error(`Le journal officiel a répondu ${reponse.status}`);
	const charge = (await reponse.json()) as { results?: unknown[] };
	return proceduresOuvertes(Array.isArray(charge.results) ? charge.results : [], societes);
}

type Issue =
	| { readonly etat: 'FAITE' }
	| { readonly etat: 'RECENTE' }
	| { readonly etat: 'BUDGET' };

const vIssue = v.union(
	v.object({ etat: v.literal('FAITE') }),
	v.object({ etat: v.literal('RECENTE') }),
	v.object({ etat: v.literal('BUDGET') })
);

function rangDuNiveau(niveau: Niveau): number {
	return ORDRE_DES_NIVEAUX.indexOf(niveau);
}

/**
 * UNE ANALYSE, de bout en bout du calcul : la fiche, les dirigeants, votre
 * historique, l'enregistrement. Appelée par les gestes du gérant et par la
 * relecture mensuelle.
 */
export const analyser = internalAction({
	args: {
		organizationId: v.id('organizations'),
		siren: v.string(),
		debiteurId: v.optional(v.id('debiteurs')),
		demandePar: v.string(),
		/** La relecture mensuelle ne connaît pas l'intervalle d'une heure : elle passe une fois par mois. */
		relecture: v.boolean()
	},
	returns: vIssue,
	handler: async (ctx, args): Promise<Issue> => {
		const config = configPappers();
		if (config === null) throw new ConvexError('L’analyse n’est pas encore activée.');
		if (!estSirenValide(args.siren))
			throw new ConvexError('Ce SIREN ne passe pas sa clé de contrôle.');

		const maintenant = Date.now();
		if (!args.relecture) {
			const derniere: number | null = await ctx.runQuery(internal.risque.donnees.derniereAnalyse, {
				organizationId: args.organizationId,
				siren: args.siren
			});
			if (derniere !== null && maintenant - derniere < INTERVALLE_MINIMAL_MS)
				return { etat: 'RECENTE' };
		}
		const reservee: boolean = await ctx.runMutation(internal.risque.donnees.reserverUneAnalyse, {
			organizationId: args.organizationId,
			mois: new Date(maintenant).toISOString().slice(0, 7)
		});
		if (!reservee) return { etat: 'BUDGET' };

		const aujourdHui = new Date(maintenant).toISOString().slice(0, 10);

		// ── 2. LA FICHE ──────────────────────────────────────────────────────
		let brut: unknown;
		try {
			brut = await appelPappers(config, 'entreprise', {
				siren: args.siren,
				champs_supplementaires: CHAMPS_SUPPLEMENTAIRES
			});
		} catch (e) {
			if (e instanceof ErreurPappers && e.statut === 404) {
				throw new ConvexError('Pappers ne connaît pas ce SIREN.');
			}
			throw new ConvexError('Pappers ne répond pas pour l’instant. Réessayez dans un instant.');
		}
		const fiche = lireFichePappers(brut, aujourdHui);
		if (fiche === null) throw new ConvexError('La fiche de cette entreprise est illisible.');

		// ── 3. LES DIRIGEANTS ────────────────────────────────────────────────
		const dirigeants: ParcoursDirigeant[] = [];
		let cherches = 0;
		for (const dirigeant of fiche.dirigeants) {
			const commun = {
				nomComplet: dirigeant.nomComplet,
				qualites: dirigeant.qualites,
				...(dirigeant.depuis === undefined ? {} : { depuis: dirigeant.depuis })
			};
			if (dirigeant.personneMorale) {
				dirigeants.push({
					...commun,
					rapprochement: 'PERSONNE_MORALE',
					societes: [],
					procedures: []
				});
				continue;
			}
			const recherche = rechercheDuDirigeant(dirigeant);
			if (recherche === null) {
				dirigeants.push({
					...commun,
					rapprochement: 'SANS_NAISSANCE',
					societes: [],
					procedures: []
				});
				continue;
			}
			if (cherches >= DIRIGEANTS_LUS) {
				dirigeants.push({ ...commun, rapprochement: 'NON_LU', societes: [], procedures: [] });
				continue;
			}
			cherches += 1;
			try {
				const trouve = await appelPappers(config, 'recherche-dirigeants', recherche);
				const lu = rapprocherLeDirigeant(trouve, fiche.siren);
				const procedures =
					lu.rapprochement === 'IDENTIFIE' ? await proceduresDesSocietes(lu.societes) : [];
				dirigeants.push({
					...commun,
					rapprochement: lu.rapprochement,
					...(lu.societesTotal === undefined ? {} : { societesTotal: lu.societesTotal }),
					societes: lu.societes,
					procedures
				});
			} catch (e) {
				// Aucun dirigeant trouvé, pour Pappers, c'est un 404 : ce n'est pas une panne.
				const rapprochement =
					e instanceof ErreurPappers && e.statut === 404 ? 'NON_TROUVE' : 'NON_LU';
				dirigeants.push({ ...commun, rapprochement, societes: [], procedures: [] });
			}
		}

		// ── 4. VOTRE HISTORIQUE ──────────────────────────────────────────────
		let paiements: PaiementsChezVous | null = null;
		if (args.debiteurId !== undefined) {
			const comportement: {
				habitude: { connue: boolean; delaiMedianJours?: number; echantillon?: number };
				enCours: { retardJours: number }[];
			} = await ctx.runQuery(internal.recouvrement.comportement.lireInterne, {
				organizationId: args.organizationId,
				debiteurId: args.debiteurId,
				aujourdHui
			});
			const retards = comportement.enCours.map((e) => e.retardJours);
			paiements = {
				habitudeJours: comportement.habitude.connue
					? (comportement.habitude.delaiMedianJours ?? null)
					: null,
				echantillon: comportement.habitude.echantillon ?? 0,
				plusVieuxRetardJours: retards.length === 0 ? null : Math.max(...retards),
				facturesEnRetard: retards.length
			};
		}

		// ── 5. LE CALCUL ET L'ENREGISTREMENT ─────────────────────────────────
		const analyse = analyserLeRisque({ fiche, dirigeants, paiements, aujourdHui });
		const dernierDepot = [...fiche.comptes].sort((a, b) => b.anneeCloture - a.anneeCloture)[0];
		const bilan: {
			id: Id<'analysesRisque'>;
			indiceAvant: number | null;
			niveauAvant: Niveau | null;
		} = await ctx.runMutation(internal.risque.donnees.enregistrerAnalyse, {
			organizationId: args.organizationId,
			siren: fiche.siren,
			...(args.debiteurId === undefined ? {} : { debiteurId: args.debiteurId }),
			demandePar: args.demandePar,
			analyseLe: maintenant,
			denomination: fiche.denomination,
			...(fiche.formeJuridique === undefined ? {} : { formeJuridique: fiche.formeJuridique }),
			...(fiche.dateCreation === undefined ? {} : { dateCreation: fiche.dateCreation }),
			indice: analyse.indice,
			niveau: analyse.niveau,
			faits: analyse.faits.map((f) => ({
				cle: f.cle,
				pilier: f.pilier,
				titre: f.titre,
				court: f.court,
				...(f.detail === undefined ? {} : { detail: f.detail }),
				effet: f.effet,
				poids: f.poids,
				source: {
					nom: f.source.nom,
					...(f.source.date === undefined ? {} : { date: f.source.date }),
					...(f.source.url === undefined ? {} : { url: f.source.url }),
					...(f.source.article === undefined ? {} : { article: f.source.article })
				}
			})),
			piliers: analyse.piliers.map((p) => ({ ...p })),
			lisibilite: analyse.lisibilite,
			...(analyse.lisibiliteRaison === null ? {} : { lisibiliteRaison: analyse.lisibiliteRaison }),
			// ⚠️ SANS LA DATE DE NAISSANCE : elle a servi à rapprocher, elle n'est pas gardée.
			dirigeants: dirigeants.map((d) => ({
				nomComplet: d.nomComplet,
				qualites: [...d.qualites],
				...(d.depuis === undefined ? {} : { depuis: d.depuis }),
				rapprochement: d.rapprochement,
				...(d.societesTotal === undefined ? {} : { societesTotal: d.societesTotal }),
				societesActives: d.societes.filter((s) => s.enActivite).length,
				societes: d.societes.slice(0, 20).map((s) => ({
					siren: s.siren,
					denomination: s.denomination,
					enActivite: s.enActivite
				})),
				procedures: d.procedures.slice(0, 20).map((p) => ({ ...p }))
			})),
			exercices: fiche.exercices.slice(0, 3).map((e) => ({
				annee: e.annee,
				...(e.chiffreAffaires === undefined ? {} : { chiffreAffaires: e.chiffreAffaires }),
				...(e.resultat === undefined ? {} : { resultat: e.resultat }),
				...(e.tresorerie === undefined ? {} : { tresorerie: e.tresorerie }),
				...(e.delaiFournisseursJours === undefined
					? {}
					: { delaiFournisseursJours: e.delaiFournisseursJours })
			})),
			comptesConfidentiels: dernierDepot?.confidentiels === true,
			versionDesRegles: analyse.versionDesRegles
		});

		// ── UNE BAISSE FRANCHE SE DIT, une fois ──────────────────────────────
		if (bilan.indiceAvant !== null) {
			const baisse = bilan.indiceAvant - analyse.indice;
			const pire =
				bilan.niveauAvant !== null &&
				rangDuNiveau(analyse.niveau) > rangDuNiveau(bilan.niveauAvant);
			if (baisse >= BAISSE_SIGNALEE || pire) {
				await ctx.runMutation(internal.risque.donnees.prevenirDUneBaisse, {
					organizationId: args.organizationId,
					lien:
						args.debiteurId === undefined
							? `/app/risque/verifier?siren=${fiche.siren}`
							: `/app/risque/${args.debiteurId}`,
					denomination: fiche.denomination,
					niveau: MOT_DU_NIVEAU[analyse.niveau],
					indiceAvant: bilan.indiceAvant,
					indiceApres: analyse.indice,
					fait: analyse.faits.find((f) => f.effet < 0)?.titre ?? null
				});
			}
		}
		return { etat: 'FAITE' };
	}
});

// ─────────────────────────────────────────────────────────────────────────
// CE QUE L'ÉCRAN APPELLE
// ─────────────────────────────────────────────────────────────────────────

/** ANALYSER UN CLIENT : son SIREN est lu ici, jamais pris de l'écran. */
export const analyserClient = authedAction({
	args: { debiteurId: v.id('debiteurs') },
	returns: vIssue,
	handler: async (ctx, { debiteurId }): Promise<Issue> => {
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.risque.donnees.organisationDuMembre,
			{ userId: ctx.user._id }
		);
		const client: { siren: string | null } = await ctx.runQuery(
			internal.risque.donnees.clientAAnalyser,
			{ organizationId, debiteurId }
		);
		if (client.siren === null) {
			throw new ConvexError('Retrouvez d’abord son SIREN : sans lui, rien ne s’analyse.');
		}
		return ctx.runAction(internal.risque.analyse.analyser, {
			organizationId,
			siren: client.siren,
			debiteurId,
			demandePar: ctx.user._id,
			relecture: false
		});
	}
});

/**
 * VÉRIFIER UNE ENTREPRISE AVANT DE LA SERVIR, par son SIREN. Si elle est déjà
 * cliente, l'analyse se rattache à sa fiche.
 */
export const verifierEntreprise = authedAction({
	args: { siren: v.string() },
	returns: vIssue,
	handler: async (ctx, { siren }): Promise<Issue> => {
		const propre = siren.replace(/\s/g, '');
		if (!estSirenValide(propre)) throw new ConvexError('Ce SIREN ne passe pas sa clé de contrôle.');
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.risque.donnees.organisationDuMembre,
			{ userId: ctx.user._id }
		);
		const debiteurId: Id<'debiteurs'> | null = await ctx.runQuery(
			internal.risque.donnees.clientDuSiren,
			{ organizationId, siren: propre }
		);
		return ctx.runAction(internal.risque.analyse.analyser, {
			organizationId,
			siren: propre,
			...(debiteurId === null ? {} : { debiteurId }),
			demandePar: ctx.user._id,
			relecture: false
		});
	}
});

/**
 * LA MISSION « ANALYSER » EN UN GESTE : les clients qui vous doivent de l'argent
 * et qu'aucune analyse récente ne couvre, les plus gros d'abord, dans la limite du
 * budget du mois. Réservé aux administrateurs : chaque analyse coûte des crédits.
 */
export const analyserLesClients = authedAction({
	args: {},
	returns: v.object({ lancees: v.number() }),
	handler: async (ctx): Promise<{ lancees: number }> => {
		if (configPappers() === null) throw new ConvexError('L’analyse n’est pas encore activée.');
		const organizationId: Id<'organizations'> = await ctx.runQuery(
			internal.risque.donnees.organisationAdministree,
			{ userId: ctx.user._id }
		);
		const ids: Id<'debiteurs'>[] = await ctx.runQuery(internal.risque.donnees.clientsAAnalyser, {
			organizationId,
			maintenant: Date.now()
		});
		const lot = ids.slice(0, 50);
		for (const [i, debiteurId] of lot.entries()) {
			// Espacées : Pappers et le journal officiel ne voient pas arriver cinquante requêtes d'un coup.
			await ctx.scheduler.runAfter(i * 2000, internal.risque.analyse.analyserUnClientPlanifie, {
				organizationId,
				debiteurId,
				demandePar: ctx.user._id
			});
		}
		return { lancees: lot.length };
	}
});

/** Une analyse planifiée par le lot : un client sans SIREN entre-temps est sauté. */
export const analyserUnClientPlanifie = internalAction({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		demandePar: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const client: { siren: string | null } = await ctx.runQuery(
			internal.risque.donnees.clientAAnalyser,
			{ organizationId: args.organizationId, debiteurId: args.debiteurId }
		);
		if (client.siren === null) return null;
		try {
			await ctx.runAction(internal.risque.analyse.analyser, {
				...args,
				siren: client.siren,
				relecture: false
			});
		} catch {
			// Une entreprise que Pappers ne connaît pas ne retient pas le lot.
		}
		return null;
	}
});

/** Assez d'annonces pour couvrir les homonymes, assez peu pour rester rapide. */
const ANNONCES_LUES = 60;

/**
 * CHERCHER UNE ENTREPRISE PAR SON NOM, avant de la servir, au journal officiel
 * (gratuit) : les établissements distincts, du plus récent au plus ancien. Le
 * gérant choisit ; rien n'est retenu à sa place.
 */
export const chercherUneEntreprise = authedAction({
	args: { terme: v.string() },
	returns: v.array(
		v.object({
			siren: v.string(),
			denomination: v.string(),
			formeJuridique: v.optional(v.string()),
			ville: v.optional(v.string()),
			adresse: v.optional(v.string()),
			derniereParution: v.optional(v.string())
		})
	),
	handler: async (
		_ctx,
		{ terme }
	): Promise<
		{
			siren: string;
			denomination: string;
			formeJuridique?: string;
			ville?: string;
			adresse?: string;
			derniereParution?: string;
		}[]
	> => {
		// Le guillemet fermerait le littéral ODSQL : on le retire.
		const propre = terme.replace(/"/g, ' ').trim().slice(0, 120);
		if (propre.length < 2) return [];
		const url =
			`${BASE_BODACC}?limit=${ANNONCES_LUES}&order_by=${encodeURIComponent('dateparution DESC')}` +
			`&where=${encodeURIComponent(`commercant like "${propre}"`)}`;
		const reponse = await fetch(url);
		if (!reponse.ok) {
			throw new ConvexError(
				`Le registre a répondu ${reponse.status}. La recherche n’a pas pu aboutir.`
			);
		}
		const charge = (await reponse.json()) as { results?: unknown[] };
		return [...lireEtablissements(Array.isArray(charge.results) ? charge.results : [])].slice(0, 8);
	}
});
