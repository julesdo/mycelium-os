import { v } from 'convex/values';
import { internalQuery, internalMutation } from '../_generated/server';
import type { QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { depuisCentimes, versEuros } from '../../socle/montants';
import { etatDuReferentiel } from '../../verticales/recouvrement/referentiel';
import { pourcentageDepuisTaux } from '../../verticales/recouvrement/taux-contractuel';
import {
	AVERTISSEMENT_MENSUEL,
	ARRET_MENSUEL,
	evaluerPlafond
} from '../../verticales/recouvrement/compagnon/disponibilite';
import { vSourceConstat } from './tables';

/**
 * CE QUI SE LIT ET S'ÉCRIT AUTOUR DE LA CONVERSATION.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE FICHIER EST SÉPARÉ DE `conversation.ts`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `conversation.ts` porte `"use node"`, parce que l'appel modèle passe par le
 * SDK. Un module `"use node"` n'exporte QUE des actions : ni `query`, ni
 * `mutation`. Le dépôt sépare déjà `depot.ts` de `depotMutations.ts` pour cette
 * raison exacte, et on la suit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE CLOISONNEMENT SE FAIT ICI, PAS DANS L'ACTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une action n'a pas de base de données : elle ne peut pas appeler
 * `getUserOrg`, qui relit le profil et REVÉRIFIE l'appartenance. Tout ce que
 * ces fonctions rendent est donc filtré par `organizationId` ici, et l'action
 * ne reçoit jamais d'identifiant d'établissement du client — ce qui reviendrait
 * à le croire sur parole.
 *
 * ⚠️ ET UNE CRÉANCE D'UN AUTRE ÉTABLISSEMENT REND `null`, PAS UNE ERREUR. Un
 * message distinct dirait au demandeur que l'identifiant existe ailleurs.
 */

// ═══════════════════════════════════════════════════════════════════════════
// LE CONTEXTE DU DOSSIER, TEL QUE LE COMPAGNON A LE DROIT DE LE VOIR
// ═══════════════════════════════════════════════════════════════════════════

const vContexteDossier = v.object({
	debiteur: v.string(),
	faits: v.array(v.string()),
	pieces: v.array(v.object({ id: v.string(), libelle: v.string() })),
	decomptes: v.array(
		v.object({
			id: v.string(),
			arreteAu: v.union(v.string(), v.null()),
			total: v.string(),
			segments: v.array(v.string())
		})
	),
	valeurs: v.array(
		v.object({
			cle: v.string(),
			source: v.string(),
			verifieLe: v.string(),
			verifie: v.boolean(),
			valideParAvocat: v.boolean()
		})
	),
	hypotheses: v.array(v.string()),
	anglesMorts: v.array(v.string()),
	echanges: v.array(
		v.object({
			role: v.union(v.literal('GERANT'), v.literal('COMPAGNON')),
			texte: v.string()
		})
	)
});

const vCompteur = v.object({
	niveau: v.union(v.literal('OUVERT'), v.literal('AVERTI'), v.literal('ARRETE')),
	cumul: v.number(),
	reste: v.number(),
	avertissement: v.number(),
	arret: v.number(),
	mois: v.string()
});

/** `AAAA-MM`, en UTC comme toutes les dates du produit. */
function moisCourant(): string {
	return new Date().toISOString().slice(0, 7);
}

/**
 * Ce que l'établissement a consommé ce mois-ci, en budget de pilotage.
 *
 * ⚠️ ON SOMME CE QUI A ÉTÉ ÉCRIT, ON NE LE RECALCULE PAS. `coutEstime` est figé
 * au moment du tour ; refaire la somme depuis les jetons ferait dépendre les
 * mois passés du barème du jour, et le seuil se serait déplacé sans que
 * personne ne l'ait décidé.
 */
async function cumulDuMois(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	mois: string
): Promise<number> {
	const tours = await ctx.db
		.query('conversations')
		.withIndex('by_org_and_mois', (q) => q.eq('organizationId', organizationId).eq('mois', mois))
		.collect();

	let cumul = 0;
	for (const tour of tours) cumul += tour.usage?.coutEstime ?? 0;
	return cumul;
}

function compteurDepuis(cumul: number, mois: string) {
	const etat = evaluerPlafond(cumul);
	return {
		niveau: etat.niveau,
		cumul: etat.cumul,
		reste: etat.reste,
		avertissement: AVERTISSEMENT_MENSUEL,
		arret: ARRET_MENSUEL,
		mois
	};
}

/**
 * Le dossier réduit à ce qui se cite, et le compteur du mois.
 *
 * ⚠️ TOUT MONTANT PART EN TOUTES LETTRES, DÉJÀ RENDU. Les centimes sont des
 * `bigint` partout dans le produit ; `versEuros` est la seule conversion, et
 * elle se fait ici, une fois. Laisser un nombre traverser jusqu'au modèle
 * rouvrirait la porte au flottant sur un chiffre qui finit dans un décompte.
 */
interface ContexteLu {
	contexte: {
		debiteur: string;
		faits: string[];
		pieces: { id: string; libelle: string }[];
		decomptes: { id: string; arreteAu: string | null; total: string; segments: string[] }[];
		valeurs: {
			cle: string;
			source: string;
			verifieLe: string;
			verifie: boolean;
			valideParAvocat: boolean;
		}[];
		hypotheses: string[];
		anglesMorts: string[];
		echanges: { role: 'GERANT' | 'COMPAGNON'; texte: string }[];
	};
	compteur: {
		niveau: 'OUVERT' | 'AVERTI' | 'ARRETE';
		cumul: number;
		reste: number;
		avertissement: number;
		arret: number;
		mois: string;
	};
}

export const contexteDuDossier = internalQuery({
	args: { creanceId: v.id('creances'), toursRepris: v.number() },
	returns: v.union(v.null(), v.object({ contexte: vContexteDossier, compteur: vCompteur })),
	handler: async (ctx, { creanceId, toursRepris }): Promise<ContexteLu | null> => {
		const { organizationId } = await getUserOrg(ctx);
		const mois = moisCourant();

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;

		const debiteur = await ctx.db.get(creance.debiteurId);

		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();

		const decomptes = (
			await ctx.db
				.query('decomptes')
				.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
				.collect()
		).filter((decompte) => decompte.organizationId === organizationId);

		const pieces = (
			await ctx.db
				.query('pieces')
				.withIndex('by_debiteur', (q) => q.eq('debiteurId', creance.debiteurId))
				.collect()
		).filter((piece) => piece.organizationId === organizationId);

		const faits: string[] = [
			`La créance est au statut ${creance.statut}.`,
			`${factures.length} facture${factures.length > 1 ? 's' : ''} y sont rattachée${factures.length > 1 ? 's' : ''}.`,
			`Qualité de commerçant du débiteur : ${creance.entreCommercants}.`,
			`Créance certaine : ${creance.certaine}. Liquide : ${creance.liquide}. Exigible : ${creance.exigible}.`
		];
		for (const facture of factures) {
			faits.push(
				`Facture ${facture.reference}, émise le ${facture.dateEmission}, ` +
					`échue le ${facture.dateEcheance}, ` +
					`montant TTC ${versEuros(depuisCentimes(facture.montantTTC))} €, ` +
					`statut de paiement ${facture.statutPaiement}.`
			);
		}

		/**
		 * ⚠️ LE SECTEUR INDÉTERMINÉ EST UNE HYPOTHÈSE, ET ELLE S'ANNONCE.
		 * `surveillance.ts` retient alors le délai le plus court, et un gérant
		 * qui croit sa prescription surveillée ne la surveille pas lui-même.
		 */
		const hypotheses: string[] =
			debiteur?.secteur === undefined || debiteur.secteur === 'INDETERMINE'
				? [
						'Le secteur de ce client n’est pas déterminé : le logiciel retient le délai de ' +
							'prescription le plus court, et le déclare comme une hypothèse.'
					]
				: [`Le secteur retenu pour ce client est ${debiteur.secteur}.`];

		const anglesMorts: string[] = [];
		if (debiteur?.siren === undefined) {
			anglesMorts.push(
				'Ce débiteur n’a pas de SIREN relevé : sa santé n’est pas surveillée au registre public.'
			);
		}
		if (decomptes.length === 0) {
			anglesMorts.push(
				'Aucun décompte n’a été arrêté sur cette créance : aucune somme n’y est encore figée ni datée.'
			);
		}

		return {
			contexte: {
				debiteur: debiteur?.denomination ?? 'Débiteur inconnu',
				faits,
				pieces: pieces.map((piece) => ({
					id: piece._id,
					libelle:
						`${piece.type}${piece.reference === undefined ? '' : ` ${piece.reference}`}` +
						`${piece.dateDocument === undefined ? '' : `, daté du ${piece.dateDocument}`}` +
						`${piece.reserves === undefined ? '' : `, réserve portée : « ${piece.reserves} »`}`
				})),
				decomptes: decomptes.map((decompte) => ({
					id: decompte._id,
					arreteAu: decompte.arreteAu,
					total: `${versEuros(depuisCentimes(decompte.total))} €`,
					segments: decompte.lignes.flatMap((ligne) =>
						ligne.segments.map(
							(segment) =>
								`${ligne.reference} : ${versEuros(depuisCentimes(segment.principal))} € ` +
								`du ${segment.debut} au ${segment.fin}, ${segment.jours} jours, ` +
								`taux ${pourcentageDepuisTaux(segment.taux)} %, base annuelle ${segment.baseAnnuelle}, ` +
								`intérêts ${versEuros(depuisCentimes(segment.interets))} €`
						)
					)
				})),
				/**
				 * ⚠️ LES VALEURS PARTENT DÉJÀ RÉSOLUES, AVEC LEURS DEUX BOOLÉENS.
				 * Le compagnon cite une CLÉ, jamais un module de pays (B15) : c'est
				 * le registre qui sait qu'une valeur appartient à une juridiction, et
				 * c'est lui qui nomme le module dans `resoluPar`.
				 */
				valeurs: etatDuReferentiel().fiches.map((fiche) => ({
					cle: fiche.cle,
					source: fiche.source,
					verifieLe: fiche.verifieLe,
					verifie: fiche.verifie,
					valideParAvocat: fiche.valideParAvocat
				})),
				hypotheses,
				anglesMorts,
				/**
				 * ⚠️ LES DERNIERS TOURS, ET CEUX-LÀ SEULS. Un fil sans mémoire
				 * redemande au gérant ce qu'il vient de dire ; un fil sans borne
				 * fait grossir le contexte de chaque question jusqu'à ce que le
				 * plafond du mois morde en trois jours.
				 */
				echanges: (
					await ctx.db
						.query('conversations')
						.withIndex('by_org_and_fil', (q) =>
							q.eq('organizationId', organizationId).eq('fil', creanceId)
						)
						.collect()
				)
					.sort((a, b) => a.diteLe - b.diteLe)
					.slice(-toursRepris)
					.map((tour) => ({ role: tour.role, texte: tour.texte }))
			},
			compteur: compteurDepuis(await cumulDuMois(ctx, organizationId, mois), mois)
		};
	}
});

// ═══════════════════════════════════════════════════════════════════════════
// L'ÉCRITURE DES DEUX TOURS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les deux tours d'un échange, écrits ENSEMBLE.
 *
 * ⚠️ UNE LIGNE PAR TOUR, et c'est la leçon d'`attestationRequests` : un tableau
 * Convex plafonne à 8 192 entrées et le dépassement fait échouer l'écriture
 * entière — un fil bavard perdrait son dernier tour ET tous les autres.
 *
 * ⚠️ LA QUESTION S'ÉCRIT MÊME QUAND LA RÉPONSE EST REFUSÉE. Ce qui a été
 * demandé fait partie de ce qui s'est passé, et le fil doit pouvoir le dire. Le
 * tour du compagnon porte alors le texte du refus, et son usage quand l'appel a
 * bien été émis : un appel refusé au rendu a quand même été facturé.
 */
export const consignerEchange = internalMutation({
	args: {
		creanceId: v.id('creances'),
		fil: v.string(),
		question: v.string(),
		reponse: v.string(),
		pastilles: v.array(v.object({ phrase: v.number(), source: vSourceConstat })),
		usage: v.optional(
			v.object({
				tokensIn: v.number(),
				tokensOut: v.number(),
				cacheReadTokens: v.number(),
				coutEstime: v.number()
			})
		)
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);

		const creance = await ctx.db.get(args.creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;

		const horodatage = Date.now();
		const moisDuTour = moisCourant();

		await ctx.db.insert('conversations', {
			organizationId,
			fil: args.fil,
			portee: 'CREANCE',
			cible: args.creanceId,
			role: 'GERANT',
			texte: args.question,
			pastilles: [],
			mois: moisDuTour,
			diteLe: horodatage
		});

		await ctx.db.insert('conversations', {
			organizationId,
			fil: args.fil,
			portee: 'CREANCE',
			cible: args.creanceId,
			role: 'COMPAGNON',
			texte: args.reponse,
			pastilles: args.pastilles,
			usage: args.usage,
			mois: moisDuTour,
			// +1 ms : deux tours écrits dans la même transaction porteraient sinon
			// le même horodatage, et l'ordre du fil dépendrait de l'ordre d'insertion.
			diteLe: horodatage + 1
		});

		return null;
	}
});

// ═══════════════════════════════════════════════════════════════════════════
// CE QUE L'ÉCRAN LIT
// ═══════════════════════════════════════════════════════════════════════════

const vTourAffiche = v.object({
	_id: v.id('conversations'),
	fil: v.string(),
	role: v.union(v.literal('GERANT'), v.literal('COMPAGNON')),
	texte: v.string(),
	pastilles: v.array(v.object({ phrase: v.number(), source: vSourceConstat })),
	diteLe: v.number()
});

/**
 * Le fil d'un dossier, et où en est le compteur du mois.
 *
 * ⚠️ IL REND LE COMPTEUR MÊME QUAND LE FIL EST VIDE. Le champ de saisie doit
 * pouvoir dire, avant qu'on tape, que la conversation libre est arrêtée pour ce
 * mois-ci — et ce que le produit continue de faire sans elle. Un champ qui
 * accepterait la frappe pour refuser à l'envoi serait un mur avec un délai.
 */
export const filDuDossier = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.object({ tours: v.array(vTourAffiche), compteur: vCompteur }),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const mois = moisCourant();
		const compteur = compteurDepuis(await cumulDuMois(ctx, organizationId, mois), mois);

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			return { tours: [], compteur };
		}

		const tours = await ctx.db
			.query('conversations')
			.withIndex('by_org_and_cible', (q) =>
				q.eq('organizationId', organizationId).eq('cible', creanceId)
			)
			.collect();

		return {
			tours: tours
				.sort((a, b) => a.diteLe - b.diteLe)
				.map((tour) => ({
					_id: tour._id,
					fil: tour.fil,
					role: tour.role,
					texte: tour.texte,
					pastilles: tour.pastilles,
					diteLe: tour.diteLe
				})),
			compteur
		};
	}
});
