import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { vSourceConstat } from './tables';
import { vEvenementDeSurveillance } from './surveillance';
import { QUESTIONS_LITIGE, type CleFait, type Reponse } from '../../verticales/recouvrement/litige';
import { estDateReelle } from '../../verticales/recouvrement/calendrier';
import {
	CHAMP_PRESCRIPTION,
	champEteintUnDroit,
	eteintUnDroit,
	mesurerLeJour,
	plafonner,
	resumeDuPlafond,
	type CandidatProposition,
	type LigneMesuree,
	type MesuresDuJour
} from '../../verticales/recouvrement/compagnon/propositions';

/**
 * CE QUE LE COMPAGNON PROPOSE, ET CE QU'ON EN A FAIT (D13).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA POSE EST UN GESTE DU BATTEMENT, JAMAIS D'UN RENDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une `query` n'écrit pas, et une mutation déclenchée sur un chemin de lecture
 * réactif est une boucle. `battement.ts` tourne déjà une fois par jour et par
 * établissement, ce qui est exactement le grain du plafond : la pose vit donc
 * là, et la file se contente de LIRE. Elle n'écrit que sur un appui.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ JAMAIS UNE SUPPRESSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On pose, on retient, on écarte avec son motif en toutes lettres. Le cycle de
 * vie de la proposition EST la piste d'audit : le jour où le débiteur conteste,
 * il faut pouvoir dire ce qu'on n'a PAS retenu, et quand. La seule suppression
 * est la purge RGPD, et elle n'épargne pas les écartées.
 *
 * ⚠️ `PROPOSEE` N'EST PAS `ok`. Une proposition non confirmée retombe sur
 * `unknown` partout où un critère la lit — le doute ne profite jamais au
 * produit. C'est pour ça que la pose n'écrit RIEN sur la créance : elle dépose
 * un constat, elle ne répond pas à sa place.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUN APPEL MODÈLE (D4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une proposition est DÉTERMINISTE : elle sort d'une réserve déjà lue sur une
 * pièce, ou d'une date calculée depuis le référentiel juridique. Un quota épuisé
 * n'éteint donc ni la file, ni ses propositions.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ANNOTATIONS DE RETOUR OBLIGATOIRES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les handlers ci-dessous appellent `internal.` : sans type de retour explicite,
 * le cycle d'inférence ferait retomber `api` TOUT ENTIER sur `any`, et des
 * dizaines d'erreurs apparaîtraient dans des fichiers qu'on n'a pas touchés. Le
 * remède est documenté sur place à `rgpd.ts` et à `creances.ts`.
 */

// ── Ce que le domaine nomme, et ce que la base valide ───────────────────────

const vEtatProposition = v.union(
	v.literal('PROPOSEE'),
	v.literal('RETENUE'),
	v.literal('ECARTEE')
);

const vProposition = v.object({
	_id: v.id('propositions'),
	cible: v.string(),
	champ: v.string(),
	valeur: v.string(),
	source: vSourceConstat,
	etat: vEtatProposition,
	jour: v.string(),
	afficheeLe: v.optional(v.number()),
	decideeLe: v.optional(v.number()),
	decideePar: v.optional(v.string()),
	motifEcart: v.optional(v.string()),
	poseeLe: v.number()
});

/** La clé de `parametres.ts` d'où sort une échéance de prescription. */
const CLE_PRESCRIPTION = 'delaiPrescriptionCommerciale';

/**
 * Les champs de la proposition qui sont AUSSI une réponse au questionnaire.
 *
 * ⚠️ IL N'Y EN A PAS D'AUTRES, ET C'EST LE COMPILATEUR QUI LE TIENT. La liste
 * se dérive de `QUESTIONS_LITIGE` : un fait ajouté au questionnaire entre ici
 * sans qu'on y pense, et un fait retiré en sort.
 */
const CHAMPS_DE_LITIGE: ReadonlySet<string> = new Set(QUESTIONS_LITIGE.map((q) => q.cle));

/**
 * LA VALEUR PORTE SA RÉPONSE EN TÊTE, ET C'EST UN CONTRAT ÉCRIT DEUX FOIS ICI.
 *
 * `valeur` est affichée telle quelle — « en toutes lettres », dit le schéma —
 * mais une proposition retenue doit AUSSI pouvoir être appliquée. Elle est donc
 * composée par `valeurDeFait` et relue par `reponseDeLaValeur`, qui sont exactes
 * l'une de l'autre et vivent côte à côte. Rien ne se devine par expression
 * régulière ailleurs dans le produit.
 */
function valeurDeFait(reponse: Reponse, phrase: string): string {
	return `${reponse} — ${phrase}`;
}

/**
 * La réponse portée par une valeur, ou `null` si elle n'en porte pas.
 *
 * ⚠️ `null` NE VAUT PAS « INCONNU ». L'appelant qui applique une proposition
 * LÈVE dessus : appliquer un fait de litige sur une valeur qu'on n'a pas su
 * relire poserait une qualification juridique tirée d'un texte libre, et c'est
 * la chose que ce produit refuse le plus fermement de faire.
 */
function reponseDeLaValeur(valeur: string): Reponse | null {
	for (const reponse of ['OUI', 'NON', 'INCONNU'] as const) {
		if (valeur === reponse || valeur.startsWith(`${reponse} `)) return reponse;
	}
	return null;
}

// ── La pose ─────────────────────────────────────────────────────────────────

/**
 * LES CONSTATS QUI SORTENT D'UNE RÉSERVE LUE SUR UNE PIÈCE.
 *
 * Le gisement est celui de `creances.propositionsLitige`, pris par l'autre
 * bout : on part des pièces PORTEUSES D'UNE RÉSERVE plutôt que de chaque
 * créance. Une seule lecture d'index par établissement, puis une par pièce
 * concernée — au lieu d'un parcours de tout le portefeuille, chaque nuit, pour
 * un gisement qui est presque toujours vide.
 *
 * ⚠️ LE CLOISONNEMENT EST REVÉRIFIÉ DOCUMENT PAR DOCUMENT. `by_piece` et
 * `by_debiteur` ne portent pas l'organisation : la barrière se pose donc sur
 * chaque document lu, comme à `tauxContractuel.ts`. Sans exception.
 *
 * ⚠️ ON NE REPOSE PAS UNE QUESTION DÉJÀ RÉPONDUE. Une créance dont
 * `faitsLitige` porte déjà la clé est passée : le logiciel ne demande pas une
 * saisie qu'il a déjà.
 */
async function constatsDeReserve(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>
): Promise<CandidatProposition[]> {
	const pieces = await ctx.db
		.query('pieces')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	const candidats: CandidatProposition[] = [];
	const dejaVues = new Set<string>();

	for (const piece of pieces) {
		const reserve = piece.reserves?.trim();
		if (reserve === undefined || reserve === '') continue;

		const creances = new Map<Id<'creances'>, Doc<'creances'>>();

		// Les créances atteintes par les factures auxquelles la pièce est liée.
		const liaisons = await ctx.db
			.query('piecesFactures')
			.withIndex('by_piece', (q) => q.eq('pieceId', piece._id))
			.collect();
		for (const liaison of liaisons) {
			if (liaison.organizationId !== organizationId) continue;
			const facture = await ctx.db.get(liaison.factureId);
			if (facture === null || facture.organizationId !== organizationId) continue;
			if (facture.creanceId === undefined) continue;
			const creance = await ctx.db.get(facture.creanceId);
			if (creance === null || creance.organizationId !== organizationId) continue;
			creances.set(creance._id, creance);
		}

		// Et celles du client, quand la pièce est de portée débiteur (CGV,
		// contrat-cadre) : c'est la seconde portée de `propositionsLitige`.
		if (piece.debiteurId !== undefined) {
			const duClient = await ctx.db
				.query('creances')
				.withIndex('by_debiteur', (q) => q.eq('debiteurId', piece.debiteurId!))
				.collect();
			for (const creance of duClient) {
				if (creance.organizationId !== organizationId) continue;
				creances.set(creance._id, creance);
			}
		}

		for (const creance of creances.values()) {
			// Une créance close ne se requalifie pas : proposer dessus ferait
			// décider sur un dossier que plus rien n'attend.
			if (creance.statut === 'CLOSE') continue;
			const dejaDeclare = (creance.faitsLitige ?? []).some(
				(fait) => fait.cle === 'CONTESTATION_ECRITE'
			);
			if (dejaDeclare) continue;

			const cle = `${creance._id}|CONTESTATION_ECRITE`;
			if (dejaVues.has(cle)) continue;
			dejaVues.add(cle);

			candidats.push({
				cible: creance._id as string,
				champ: 'CONTESTATION_ECRITE',
				valeur: valeurDeFait(
					'OUI',
					`une réserve est lue sur la pièce ${piece.reference ?? piece.filename} : « ${reserve} »`
				),
				source: { nature: 'PIECE', pieceId: piece._id as string },
				eteintUnDroit: false
			});
		}
	}

	return candidats;
}

/**
 * CE QU'UN ÉVÉNEMENT QUI ÉTEINT UN DROIT PEUT CITER — ou `null`.
 *
 * ⚠️ UNE CADUCITÉ ÉTEINT BIEN UN DROIT, ET NE PRODUIT POURTANT RIEN AUJOURD'HUI.
 * `eteintUnDroit` la reconnaît — c'est sa gravité qui la fait remonter en
 * CRITIQUE — mais aucune entrée de `parametres.ts` ne nomme le délai dont elle
 * sort, et les trois délais de procédure relevés ne se rattachent pas à une
 * échéance sans deviner lequel. B3 tranche : un énoncé juridique résout vers une
 * entrée du référentiel, ou il n'est pas rendu. Se taire ici ne perd rien — la
 * rangée de caducité, elle, reste dans le flux, avec son montant et sa date.
 *
 * Écrire `delaiPrescriptionCommerciale` sur une caducité serait le pire des
 * deux mondes : une pastille qui a l'air vérifiable et qui cite le mauvais
 * texte.
 */
function cleDuReferentiel(type: string): string | null {
	return type === 'PRESCRIPTION_PROCHE' ? CLE_PRESCRIPTION : null;
}

/**
 * LES CONSTATS QUI ÉTEIGNENT UN DROIT, LUS SUR LE FLUX DU JOUR.
 *
 * ⚠️ L'EXPLICATION DU DOMAINE EST RECOPIÉE MOT POUR MOT. La reformuler ici
 * créerait une seconde version de la vérité, qui dériverait de la première —
 * c'est déjà la règle du battement pour les notifications, et elle vaut ici
 * pour la même raison : ces phrases portent une date de prescription.
 *
 * ⚠️ UN ÉVÉNEMENT SANS CIBLE NE PRODUIT RIEN. Une proposition sans cible serait
 * une rangée qu'on ne peut ni ouvrir ni décider ; fabriquer un identifiant
 * ouvrirait le mauvais dossier, ce qui est pire.
 */
function constatsDEcheance(
	evenements: readonly {
		type: string;
		urgence: string;
		explication: string;
		cible?: { genre: string; id: string };
	}[]
): CandidatProposition[] {
	const candidats: CandidatProposition[] = [];
	const dejaVues = new Set<string>();

	for (const evenement of evenements) {
		if (!eteintUnDroit(evenement)) continue;
		if (evenement.cible === undefined) continue;

		const cleParametre = cleDuReferentiel(evenement.type);
		if (cleParametre === null) continue;

		// Une seule par cible : un client dont six factures se prescrivent n'a
		// pas six décisions à prendre, il en a une.
		if (dejaVues.has(evenement.cible.id)) continue;
		dejaVues.add(evenement.cible.id);

		candidats.push({
			cible: evenement.cible.id,
			champ: CHAMP_PRESCRIPTION,
			valeur: evenement.explication,
			source: { nature: 'REFERENTIEL', cleParametre },
			eteintUnDroit: true
		});
	}

	return candidats;
}

/**
 * A-T-ON DÉJÀ POSÉ CECI SUR CETTE RANGÉE, UN JOUR QUELCONQUE ?
 *
 * ⚠️ ON NE REGARDE PAS L'ÉTAT. Une proposition écartée hier ne se repose pas
 * aujourd'hui : l'écart est une décision, et la reposer serait redemander au
 * gérant ce qu'il vient de trancher — le rythme d'acquittement exact que le
 * plafond existe pour empêcher. Elle se lève par le geste du gérant, pas par le
 * passage du temps.
 */
async function dejaPoseSurLaCible(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	cible: string,
	champ: string
): Promise<boolean> {
	const surLaCible = await ctx.db
		.query('propositions')
		.withIndex('by_org_and_cible', (q) =>
			q.eq('organizationId', organizationId).eq('cible', cible)
		)
		.collect();
	return surLaCible.some((proposition) => proposition.champ === champ);
}

/**
 * LA POSE DU JOUR — appelée par `battement.ts`, une fois par jour et par
 * établissement.
 *
 * Elle rend ce qu'elle a posé et ce qu'elle a différé. Le second nombre est
 * écrit sur le relevé du battement, parce que ce qui dépasse est COMPTÉ et
 * NOMMÉ, jamais tronqué en silence.
 */
export const poserLesPropositionsDuJour = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		jour: v.string(),
		evenements: v.array(vEvenementDeSurveillance)
	},
	returns: v.object({ posees: v.number(), enAttente: v.number() }),
	handler: async (
		ctx,
		{ organizationId, jour, evenements }
	): Promise<{ posees: number; enAttente: number }> => {
		// L'ORDRE D'ENTRÉE EST L'ORDRE DE PRIORITÉ, et `plafonner` ne trie pas.
		// Les échéances d'abord : elles ne consomment aucune place, mais elles
		// doivent être posées même si la suite tombe.
		const candidats = [
			...constatsDEcheance(evenements),
			...(await constatsDeReserve(ctx, organizationId))
		];

		const neufs: CandidatProposition[] = [];
		for (const candidat of candidats) {
			if (await dejaPoseSurLaCible(ctx, organizationId, candidat.cible, candidat.champ)) continue;
			neufs.push(candidat);
		}

		const dejaCeJour = await ctx.db
			.query('propositions')
			.withIndex('by_org_and_jour', (q) =>
				q.eq('organizationId', organizationId).eq('jour', jour)
			)
			.collect();

		const pose = plafonner(
			neufs,
			dejaCeJour.map((proposition) => ({
				cible: proposition.cible,
				// ⚠️ RELU DU CHAMP PAR LE DOMAINE, ET PAS COMPARÉ ICI. L'événement qui
				// a produit ce candidat n'existe plus ; il ne reste que le champ écrit
				// en base. Une seconde règle recopiée ici finirait par diverger, et une
				// prescription posée le matin consommerait alors une des sept places de
				// l'après-midi — en silence.
				eteintUnDroit: champEteintUnDroit(proposition.champ)
			}))
		);

		const maintenant = Date.now();
		for (const candidat of pose.aPoser) {
			await ctx.db.insert('propositions', {
				organizationId,
				cible: candidat.cible,
				champ: candidat.champ,
				valeur: candidat.valeur,
				source:
					candidat.source.nature === 'PIECE'
						? { nature: 'PIECE', pieceId: candidat.source.pieceId as Id<'pieces'> }
						: { nature: 'REFERENTIEL', cleParametre: candidat.source.cleParametre },
				etat: 'PROPOSEE',
				jour,
				poseeLe: maintenant
			});
		}

		return { posees: pose.aPoser.length, enAttente: pose.enAttente };
	}
});

// ── Ce que la file lit ──────────────────────────────────────────────────────

/**
 * LES PROPOSITIONS DU JOUR, ET CE QUI ATTEND DERRIÈRE.
 *
 * ⚠️ `enAttente` EST LU SUR LE RELEVÉ DU BATTEMENT, PAS RECALCULÉ. Le
 * recalculer demanderait de reparcourir les pièces et le flux à chaque rendu.
 * Absent — battement en échec, ou relevé antérieur au champ — il vaut `null`,
 * qui se lit « on ne sait pas » et jamais zéro : annoncer « rien en attente »
 * sur un battement qui n'a pas tourné serait un repli silencieux.
 */
export const propositionsDuJour = authedQuery({
	args: { jour: v.string() },
	returns: v.object({
		propositions: v.array(vProposition),
		enAttente: v.union(v.number(), v.null()),
		/** Ce qui dépasse, NOMMÉ. `null` quand on ne sait pas ce qui attend. */
		resume: v.union(v.string(), v.null())
	}),
	handler: async (ctx, { jour }) => {
		const { organizationId } = await getUserOrg(ctx);

		const propositions = await ctx.db
			.query('propositions')
			.withIndex('by_org_and_jour', (q) =>
				q.eq('organizationId', organizationId).eq('jour', jour)
			)
			.collect();

		const releve = await ctx.db
			.query('battements')
			.withIndex('by_org_and_jour', (q) =>
				q.eq('organizationId', organizationId).eq('jour', jour)
			)
			.unique();

		const enAttente = releve?.propositionsEnAttente ?? null;

		return {
			propositions: propositions.map(versAffichage),
			enAttente,
			resume: enAttente === null ? null : resumeDuPlafond(propositions.length, enAttente)
		};
	}
});

function versAffichage(proposition: Doc<'propositions'>) {
	return {
		_id: proposition._id,
		cible: proposition.cible,
		champ: proposition.champ,
		valeur: proposition.valeur,
		source: proposition.source,
		etat: proposition.etat,
		jour: proposition.jour,
		afficheeLe: proposition.afficheeLe,
		decideeLe: proposition.decideeLe,
		decideePar: proposition.decideePar,
		motifEcart: proposition.motifEcart,
		poseeLe: proposition.poseeLe
	};
}

// ── Les deux gestes, et leur trace ──────────────────────────────────────────

/**
 * LE DÉLAI DE LECTURE, MESURÉ PAR L'ÉCRAN ET PAS PAR L'HORLOGE DU SERVEUR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL ARRIVE AVEC L'APPUI, ET PAS PAR UNE ÉCRITURE AU RENDU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `afficheeLe` et `decideeLe` s'écrivent TOUS LES DEUX, et ici, ensemble. La
 * file LIT et n'écrit que sur un appui : marquer l'affichage au rendu ferait
 * une écriture sur un chemin de lecture réactif, c'est-à-dire la chose que la
 * décision 9 du plan interdit.
 *
 * L'écran envoie donc une DURÉE — combien de millisecondes la proposition est
 * restée sous les yeux avant l'appui — et le serveur en déduit l'horodatage.
 * Une durée est immune à l'horloge du navigateur : deux horodatages absolus
 * venus du client rendraient une médiane fausse dès qu'une machine est
 * déréglée, et c'est précisément la médiane qui doit dire si on a lu ou tapé.
 *
 * ⚠️ IL EST REQUIS. Optionnel, chaque site d'appel l'oublierait sans que rien
 * ne tombe, et la seconde des trois mesures serait morte à la naissance —
 * « déclaré et lu, jamais alimenté », le défaut le plus cher de ce dépôt.
 */
const vLecture = { lueDepuisMs: v.number() };

/**
 * L'horodatage d'affichage, borné par la pose.
 *
 * Une proposition ne peut pas avoir été affichée avant d'exister. La borne ne
 * mord que sur une durée absurde — un onglet rouvert, une horloge qui saute —
 * et elle est dite ici plutôt que laissée à produire une médiane négative.
 */
function afficheeDepuis(proposition: Doc<'propositions'>, lueDepuisMs: number, decideeLe: number) {
	return Math.max(proposition.poseeLe, decideeLe - Math.max(0, lueDepuisMs));
}

/** La proposition, cloisonnée. Le cloisonnement AVANT tout le reste. */
async function propositionDeLOrganisation(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	propositionId: Id<'propositions'>
): Promise<Doc<'propositions'>> {
	const proposition = await ctx.db.get(propositionId);
	if (proposition === null || proposition.organizationId !== organizationId) {
		throw new ConvexError('Proposition introuvable');
	}
	return proposition;
}

/**
 * RETENIR — un appui, et ce qu'il emporte.
 *
 * ⚠️ RETENIR APPLIQUE LA VALEUR, DANS LA MÊME TRANSACTION. Une proposition qui
 * s'affiche « Retenue » pendant que le questionnaire continue de répondre
 * « indéterminé » serait un mensonge à l'écran, et le gérant croirait avoir
 * tranché. Quand le champ est un fait de litige, l'appui passe donc par
 * `declarerFaitLitige` — le seul chemin d'écriture de ces faits, qui exige un
 * appui et qui remplace la réponse précédente au lieu d'en empiler une seconde.
 *
 * ⚠️ ET IL LÈVE PLUTÔT QUE D'APPLIQUER À MOITIÉ. Une valeur dont on ne sait pas
 * relire la réponse n'est pas appliquée « au mieux » : elle est refusée, en le
 * disant. Poser une qualification juridique tirée d'un texte libre est la chose
 * que ce produit refuse le plus fermement.
 *
 * ⚠️ UN CHAMP QUE LE PRODUIT NE SAIT PAS ÉCRIRE — `PRESCRIPTION` en est un —
 * NE FAIT RIEN D'AUTRE QUE SA TRACE, et c'est exact : une date de prescription
 * est un CALCUL, pas une saisie. La retenir dit « j'ai vu », et c'est le
 * journal qui porte cette phrase, daté et signé.
 */
export const retenir = authedMutation({
	args: { propositionId: v.id('propositions'), ...vLecture },
	returns: v.null(),
	handler: async (ctx, { propositionId, lueDepuisMs }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const proposition = await propositionDeLOrganisation(ctx, organizationId, propositionId);

		const decideeLe = Date.now();

		if (CHAMPS_DE_LITIGE.has(proposition.champ)) {
			const reponse = reponseDeLaValeur(proposition.valeur);
			if (reponse === null) {
				throw new ConvexError(
					'Cette proposition ne porte pas de réponse relisible, et rien n’a été écrit sur la ' +
						'créance. Ce qui manque est la réponse en tête de la valeur proposée ; ce refus se ' +
						'lève par une réponse donnée au questionnaire de litige, qui reste le chemin ' +
						'ordinaire. L’attente ne coûte rien : la créance est dans l’état où vous l’avez ' +
						'laissée.'
				);
			}

			/*
			  ⚠️ LE CLOISONNEMENT AVANT LA DÉLÉGATION. `declarerFaitLitige` fait
			  confiance à son appelant — c'est le motif de tout le module
			  `creances.ts` — donc la barrière se pose ICI. Elle est redondante par
			  construction, puisque la pose n'écrit que des cibles déjà vérifiées ;
			  elle reste parce qu'une invariante tenue par construction se perd au
			  premier producteur ajouté, et parce que `cible` est une CHAÎNE, que
			  rien n'empêche de pointer ailleurs.
			*/
			// `normalizeId` et pas un `as Id<…>` : un identifiant de DÉBITEUR passe
			// la conversion de type sans un mot et rend un document qui porte bien
			// un `organizationId`. Seul le normalisateur dit à quelle TABLE il est.
			const cibleCreance = ctx.db.normalizeId('creances', proposition.cible);
			const creance = cibleCreance === null ? null : await ctx.db.get(cibleCreance);
			if (creance === null || creance.organizationId !== organizationId) {
				throw new ConvexError(
					'La créance visée par cette proposition est introuvable, et rien n’a été écrit. Le ' +
						'constat reste affiché tel quel ; ce refus se lève en répondant au questionnaire de ' +
						'litige sur la créance elle-même. L’attente ne coûte rien ici.'
				);
			}

			await ctx.runMutation(internal.recouvrement.creances.declarerFaitLitige, {
				creanceId: creance._id,
				cle: proposition.champ as CleFait,
				reponse,
				aujourdHui: new Date().toISOString().slice(0, 10)
			});
		}

		await ctx.db.patch(propositionId, {
			etat: 'RETENUE',
			afficheeLe: afficheeDepuis(proposition, lueDepuisMs, decideeLe),
			decideeLe,
			decideePar: user._id
		});

		// « Toute proposition retenue s'inscrit au journal AVEC SA SOURCE », de
		// sorte que le jour où le débiteur conteste, on sait que le logiciel a lu
		// et que le gérant a confirmé.
		await ctx.db.insert('journal', {
			organizationId,
			cible: propositionId as string,
			cle: 'PROPOSITION_RETENUE',
			avant: 'proposée',
			apres: `${proposition.champ} : ${proposition.valeur}`,
			source: await sourceEnToutesLettres(ctx, proposition),
			auteur: 'GERANT',
			auteurUserId: user._id,
			consigneLe: decideeLe
		});

		return null;
	}
});

/**
 * ÉCARTER — avec son motif, en toutes lettres, et jamais une suppression.
 *
 * ⚠️ LE MOTIF EST REQUIS, ET C'EST TOUT L'INTÉRÊT DU GESTE. Pas de pouce bas,
 * pas d'étoiles : on ne note pas un constat, il est juste ou faux. Le seul
 * retour qui vaille est la correction elle-même, et c'est elle qui produit une
 * trace opposable si le débiteur conteste.
 *
 * ⚠️ ÉCARTER UNE PROPOSITION RETENUE EST UNE CORRECTION, ET LE JOURNAL LE DIT
 * AUTREMENT. C'est la troisième des trois mesures — la seule qui ne soit pas
 * auto-référentielle, parce qu'elle vient du monde réel. Les confondre sous
 * une même clé ferait compter comme correction un premier refus, qui n'en est
 * pas un.
 *
 * ⚠️ ET ÇA NE REPOSE RIEN SUR LA CRÉANCE. Écarter « contestation écrite : oui »
 * ne vaut PAS « non » : le critère retombe sur `unknown`, et le doute ne profite
 * jamais au produit. Un écart efface une proposition de l'écran, jamais une
 * réponse déjà donnée.
 */
export const ecarter = authedMutation({
	args: { propositionId: v.id('propositions'), motif: v.string(), ...vLecture },
	returns: v.null(),
	handler: async (ctx, { propositionId, motif, lueDepuisMs }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const proposition = await propositionDeLOrganisation(ctx, organizationId, propositionId);

		const enToutesLettres = motif.trim();
		if (enToutesLettres === '') {
			throw new ConvexError(
				'Le constat reste affiché, et rien n’est perdu. Ce qui manque est le motif de l’écart : ' +
					'c’est lui qui dira, le jour d’une contestation, ce qu’on n’a pas retenu et pourquoi. ' +
					'Ce refus se lève par une phrase, si courte soit-elle. L’attente ne coûte rien ici ; ' +
					'ce qui court est la prescription de la créance, que cet écart ne touche pas.'
			);
		}

		const decideeLe = Date.now();
		const corrige = proposition.etat === 'RETENUE';

		await ctx.db.patch(propositionId, {
			etat: 'ECARTEE',
			afficheeLe: afficheeDepuis(proposition, lueDepuisMs, decideeLe),
			decideeLe,
			decideePar: user._id,
			motifEcart: enToutesLettres
		});

		await ctx.db.insert('journal', {
			organizationId,
			cible: propositionId as string,
			cle: corrige ? 'PROPOSITION_CORRIGEE' : 'PROPOSITION_ECARTEE',
			avant: corrige ? 'retenue' : 'proposée',
			apres: `écartée : ${enToutesLettres}`,
			source: await sourceEnToutesLettres(ctx, proposition),
			auteur: 'GERANT',
			auteurUserId: user._id,
			consigneLe: decideeLe
		});

		return null;
	}
});

/**
 * D'où sort la proposition, dit au journal comme on le dirait à l'écran.
 *
 * ⚠️ LA PIÈCE EST NOMMÉE, PAS IDENTIFIÉE. Un identifiant de document dans une
 * ligne de journal est illisible par celui qui en aura besoin — le gérant, six
 * mois plus tard, devant une contestation. Et si la pièce a disparu, on le DIT
 * plutôt que d'écrire un identifiant qui ne mène plus nulle part.
 */
async function sourceEnToutesLettres(
	ctx: MutationCtx,
	proposition: Doc<'propositions'>
): Promise<string> {
	if (proposition.source.nature === 'REFERENTIEL') {
		return `Référentiel juridique, entrée « ${proposition.source.cleParametre} »`;
	}
	const piece = await ctx.db.get(proposition.source.pieceId);
	if (piece === null) return 'Pièce du dossier, retirée depuis';
	return `Pièce du dossier : ${piece.reference ?? piece.filename}`;
}

// ── L'instrumentation (§ 10, Q3) ────────────────────────────────────────────

const vMesures = v.object({
	jour: v.string(),
	posees: v.number(),
	enAttente: v.union(v.number(), v.null()),
	retenues: v.number(),
	ecartees: v.number(),
	indecises: v.number(),
	tauxRetention: v.union(v.number(), v.null()),
	delaiMedianMs: v.union(v.number(), v.null()),
	decideesSansHorodatage: v.number(),
	corrections: v.number(),
	tauxCorrection: v.union(v.number(), v.null())
});

/**
 * Combien de jours en arrière la section repliée regarde par défaut, et au plus.
 *
 * ⚠️ BORNÉES, PARCE QUE LA LECTURE EST BORNÉE PAR JOUR. Chaque jour coûte une
 * lecture d'index sur `propositions`, une sur `battements`, et une par retenue
 * sur `journal`. Quatorze jours tiennent largement sous la limite de documents
 * lus par transaction ; une fenêtre libre finirait par la heurter, et la section
 * s'éteindrait sans dire pourquoi.
 */
const FENETRE_PAR_DEFAUT = 14;
const FENETRE_MAXIMALE = 30;

/**
 * LES TROIS NOMBRES, PAR ÉTABLISSEMENT ET PAR JOUR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE PART AVEC LE PLAFOND, PAS PLUS TARD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sans elle, la seule réponse possible à une file décevante serait d'annuler
 * tout le lot, au lieu de DÉPLACER le sept. Sept est une hypothèse datée ; une
 * hypothèse sans instrument ne se déplace pas, elle s'abandonne.
 *
 * ⚠️ AUCUN DE CES NOMBRES N'APPROCHE UNE CRÉANCE (D8). Ce sont des taux sur un
 * JOUR d'un établissement, lus dans une section repliée de `/app/compte` : pas
 * un score, pas une confiance, et rien qui s'affiche sur une rangée de la file.
 *
 * ⚠️ LE TROISIÈME SE LIT DANS LE JOURNAL, ET C'EST POURQUOI LE JOURNAL VISE LA
 * PROPOSITION. Une correction journalisée sur la créance obligerait à balayer
 * un journal en append seul, qui grossit sans borne, pour compter trois lignes.
 * Visée sur la proposition, elle se lit par `by_org_and_cible` en une lecture
 * bornée par proposition retenue.
 */
export const mesures = authedQuery({
	args: { depuis: v.string(), jours: v.optional(v.number()) },
	returns: v.array(vMesures),
	handler: async (ctx, { depuis, jours }): Promise<MesuresDuJour[]> => {
		const { organizationId } = await getUserOrg(ctx);

		const fenetre = Math.min(Math.max(1, jours ?? FENETRE_PAR_DEFAUT), FENETRE_MAXIMALE);
		const mesurees: MesuresDuJour[] = [];

		for (const jour of joursAvant(depuis, fenetre)) {
			const propositions = await ctx.db
				.query('propositions')
				.withIndex('by_org_and_jour', (q) =>
					q.eq('organizationId', organizationId).eq('jour', jour)
				)
				.collect();

			const releve = await ctx.db
				.query('battements')
				.withIndex('by_org_and_jour', (q) =>
					q.eq('organizationId', organizationId).eq('jour', jour)
				)
				.unique();

			const lignes: LigneMesuree[] = [];
			for (const proposition of propositions) {
				lignes.push({
					etat: proposition.etat,
					afficheeLe: proposition.afficheeLe,
					decideeLe: proposition.decideeLe,
					corrigee:
						proposition.etat === 'ECARTEE' &&
						(await aEteCorrigee(ctx, organizationId, proposition._id))
				});
			}

			mesurees.push(mesurerLeJour(jour, lignes, releve?.propositionsEnAttente ?? null));
		}

		return mesurees;
	}
});

/** Une proposition RETENUE puis écartée. Lu dans le journal, jamais ailleurs. */
async function aEteCorrigee(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	propositionId: Id<'propositions'>
): Promise<boolean> {
	const entrees = await ctx.db
		.query('journal')
		.withIndex('by_org_and_cible', (q) =>
			q.eq('organizationId', organizationId).eq('cible', propositionId as string)
		)
		.collect();
	return entrees.some((entree) => entree.cle === 'PROPOSITION_CORRIGEE');
}

/**
 * Les `n` jours calendaires qui finissent à `depuis`, du plus récent au plus
 * ancien.
 *
 * ⚠️ AUCUNE LECTURE D'HORLOGE : la date d'arrivée est un argument, ce qui rend
 * la lecture rejouable à n'importe quelle date. Et le pas se fait en UTC, comme
 * toutes les dates du produit, pour qu'un client à l'ouest ne saute pas un jour
 * une fois sur deux.
 *
 * ⚠️ LA DATE EST VALIDÉE AU CALENDRIER, PAS PAR `Number.isNaN`. `Date.parse`
 * ne lève pas sur un 30 février : il roule sur le 2 mars, et la fenêtre serait
 * décalée sans qu'aucun garde-fou ne morde. `estDateReelle` vérifie l'existence
 * au calendrier, ce que le repli arithmétique ne fait pas.
 */
function joursAvant(depuis: string, n: number): string[] {
	if (!estDateReelle(depuis)) {
		throw new ConvexError(
			`La date « ${depuis} » n’existe pas au calendrier : aucune mesure n’est lue plutôt ` +
				'qu’une fenêtre décalée en silence.'
		);
	}

	const jours: string[] = [];
	const debut = Date.parse(`${depuis}T00:00:00.000Z`);
	for (let i = 0; i < n; i += 1) {
		jours.push(new Date(debut - i * 86_400_000).toISOString().slice(0, 10));
	}
	return jours;
}
