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
		.query('echangesCompagnon')
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
						.query('echangesCompagnon')
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
		/**
		 * ⚠️ LES PHRASES, ET C'EST ELLES QUI SE RELISENT. `reponse` reste leur
		 * concaténation — le fil la réinjecte telle quelle dans le contexte du
		 * tour suivant — mais les bornes ne se déduisent plus de la ponctuation.
		 *
		 * Facultatif : un refus et une question n'ont pas de phrases sourcées, et
		 * ils n'en reçoivent pas d'inventées.
		 */
		phrases: v.optional(
			v.array(v.object({ texte: v.string(), source: v.optional(vSourceConstat) }))
		),
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

		await ctx.db.insert('echangesCompagnon', {
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

		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: args.fil,
			portee: 'CREANCE',
			cible: args.creanceId,
			role: 'COMPAGNON',
			texte: args.reponse,
			pastilles: args.pastilles,
			phrases: args.phrases,
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

/**
 * UN TOUR TEL QUE L'ÉCRAN LE REÇOIT — ET LE CONTENU N'Y PASSE QU'UNE FOIS.
 *
 * ⚠️ `texte` ET `phrases` SONT EXCLUSIFS, DÉLIBÉRÉMENT. `texte` est la
 * concaténation des phrases : les envoyer tous les deux faisait traverser le
 * réseau deux fois le même contenu, dont une moitié que `compagnon/tour.ts` ne
 * lit jamais quand les phrases sont là. La requête est réactive et tout le fil
 * repart à chaque question posée, donc ce doublon se payait à chaque tour.
 *
 * ⚠️ ET `pastilles` NE SORT PLUS DU TOUT. Les rangs étaient l'ancien chemin de
 * relecture ; il a été retiré (voir `compagnon/tour.ts`, au-dessus de
 * `relireTour`), et plus personne ne les lit à l'écran. Le champ reste ÉCRIT —
 * il est requis au schéma et une table qui porte des documents ne perd pas un
 * champ requis sans casser son déploiement — mais il ne se transporte plus.
 */
const vTourAffiche = v.object({
	_id: v.id('echangesCompagnon'),
	fil: v.string(),
	role: v.union(v.literal('GERANT'), v.literal('COMPAGNON')),
	/**
	 * Le texte recollé, rendu SEULEMENT quand `phrases` ne le porte pas : les
	 * tours du gérant, les refus, et les tours écrits avant que les phrases le
	 * soient. Absent quand `phrases` est là.
	 */
	texte: v.optional(v.string()),
	/** Absent sur les tours écrits avant que les phrases le soient, et sur les refus. */
	phrases: v.optional(v.array(v.object({ texte: v.string(), source: v.optional(vSourceConstat) }))),
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
			.query('echangesCompagnon')
			.withIndex('by_org_and_cible', (q) =>
				q.eq('organizationId', organizationId).eq('cible', creanceId)
			)
			.collect();

		return {
			tours: tours
				.sort((a, b) => a.diteLe - b.diteLe)
				.map((tour) => {
					// ⚠️ LA CONDITION EST CELLE DE `relireTour`, À LA LETTRE. Un tableau
					// de phrases VIDE s'y lit comme une absence — c'est le cas des tours
					// du gérant et des refus —, et le texte reste alors le seul contenu
					// du tour. Écrire ici une condition plus large ferait disparaître le
					// texte d'un tour que l'écran rendrait vide.
					const portePhrases = tour.phrases !== undefined && tour.phrases.length > 0;
					return {
						_id: tour._id,
						fil: tour.fil,
						role: tour.role,
						texte: portePhrases ? undefined : tour.texte,
						phrases: portePhrases ? tour.phrases : undefined,
						diteLe: tour.diteLe
					};
				}),
			compteur
		};
	}
});

/**
 * LE COMPTEUR DU MOIS, SANS DOSSIER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL EXISTE À CÔTÉ DE `filDuDossier`, QUI LE REND DÉJÀ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le plafond de coût est PAR ÉTABLISSEMENT et PAR MOIS — jamais par dossier. Or
 * il n'était lisible qu'en demandant le fil d'une créance, c'est-à-dire en
 * ouvrant un dossier. Le bouton flottant du compagnon, lui, vit sur tous les
 * écrans, y compris ceux où aucune créance n'est ouverte : sans cette lecture,
 * il ne pouvait pas dire que la conversation libre est arrêtée, et il l'aurait
 * proposée jusqu'au refus.
 *
 * ⚠️ ELLE NE LIT AUCUN TOUR, ET C'EST TOUT L'INTÉRÊT. `filDuDossier` collecte
 * les échanges d'une créance en plus du cumul ; celle-ci ne parcourt que
 * `by_org_and_mois`, l'index du cumul, et ne rend aucun texte. C'est ce qui
 * permet de la monter en permanence dans la coquille sans payer un dossier.
 *
 * ⚠️ AUCUN APPEL À `internal.<ce module>`. Une fonction Convex qui s'appelle
 * elle-même par `internal` crée un cycle d'inférence qui fait retomber le type
 * de `api` TOUT ENTIER sur `any`, et fait surgir des dizaines de `TS7006` dans
 * des fichiers qu'on n'a pas touchés. Les deux aides employées ici sont de
 * simples fonctions du module.
 */
export const compteurDeLEtablissement = authedQuery({
	args: {},
	returns: vCompteur,
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const mois = moisCourant();
		return compteurDepuis(await cumulDuMois(ctx, organizationId, mois), mois);
	}
});
