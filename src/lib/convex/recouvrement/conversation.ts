'use node';

import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedAction } from '../functions';
import { requireEnv } from '../env';
import { extraireAvecClaude } from '../../socle/documents/extracteur';
import { RefusDeRendu, filtrerAvantRendu } from '../../verticales/recouvrement/compagnon/filtres';
import {
	AncreInconnue,
	ancresDuContexte,
	construireContexteDossier,
	construirePromptCompagnon,
	lireReponse,
	reponseCompagnonSchema,
	type ContexteDossier,
	type PhraseSourcee
} from '../../verticales/recouvrement/compagnon/prompt';
import {
	coutDuTour,
	evaluerPlafond,
	refusAppelEchoue,
	refusSansCle
} from '../../verticales/recouvrement/compagnon/disponibilite';
import { composerRefus, type Refus } from '../../verticales/recouvrement/compagnon/refus';

/**
 * LA CONVERSATION — le seul endroit du produit où une question part au modèle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE PRODUIT ENTIER SE REND SANS CE FICHIER (D4, B1)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La file, son tri, les échéances, la prescription, les décomptes et leurs
 * segments, les propositions posées sur les rangées : rien de tout cela ne
 * passe par ici. C'est ce qui rend le coût proportionnel à l'usage volontaire
 * et non au nombre d'ouvertures de l'application — et c'est aussi ce qui fait
 * qu'un plafond atteint ne rend jamais le produit inutilisable.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUN CHEMIN DE SORTIE NE REMONTE UNE EXCEPTION (D0, B14)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cinq choses peuvent empêcher une réponse, et les cinq rendent un REFUS en
 * quatre parties, jamais une erreur : la clé absente, le dossier illisible, le
 * plafond de sécurité atteint, un filtre avant rendu qui lève, et un appel qui
 * n'aboutit pas. Un message technique en anglais au milieu d'un dossier de
 * recouvrement n'est pas un refus, c'est un mur avec l'air d'une panne.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE PRÉFIXE SYSTÈME EST FIGÉ, LE DOSSIER PASSE APRÈS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `extraireAvecClaude` envoie le prompt dans le bloc système avec
 * `cache_control: ephemeral`, et le contenu dans `messages`. Le cache Claude ne
 * sert que sur un préfixe identique à l'octet : le prompt du compagnon est donc
 * figé (`compagnon/prompt.ts`, verrouillé par empreinte), et le contexte du
 * dossier — qui change à chaque question — part APRÈS le point de coupure.
 *
 * ⚠️ ET C'EST LA MÊME MACHINERIE QUE L'EXTRACTION, DÉLIBÉRÉMENT. Un second site
 * d'appel au SDK aurait fini par diverger sur le modèle, sur la reprise ou sur
 * le transport de l'usage facturé — qui est précisément ce dont le compteur de
 * coût a besoin. Le socle porte la machinerie ; la verticale porte ce qu'elle
 * veut lire.
 */

/** Une phrase rendue : son texte, et sa source ou l'aveu qu'elle n'en a pas. */
const vPhraseRendue = v.object({
	texte: v.string(),
	genreSource: v.union(
		v.literal('PARAMETRE'),
		v.literal('DECOMPTE'),
		v.literal('PIECE'),
		v.literal('AUCUNE')
	),
	reference: v.string()
});

const vRefus = v.object({
	peutFaire: v.string(),
	constat: v.string(),
	blocages: v.array(v.string()),
	coutDeLAttente: v.string()
});

const vReponse = v.union(
	v.object({
		genre: v.literal('REPONSE'),
		phrases: v.array(vPhraseRendue),
		/** Renseigné au seul niveau `AVERTI` : on prévient, on ne coupe rien. */
		avertissement: v.union(v.string(), v.null())
	}),
	v.object({
		genre: v.literal('REFUS'),
		refus: vRefus,
		/** La barrière qui a mordu, quand c'en est une. Pour la mesure. */
		barriere: v.union(v.string(), v.null()),
		/** Le terme retenu, mot pour mot. Pour qu'on sache quoi relire. */
		terme: v.union(v.string(), v.null())
	})
);

/**
 * Ce que l'action rend.
 *
 * ⚠️ TYPE NOMMÉ, ET ANNOTÉ SUR LE HANDLER. Une action qui appelle
 * `internal.<…>` sans type de retour explicite crée un cycle d'inférence : le
 * type d'`internal` contient celui du handler, qui dépend d'`internal`.
 * TypeScript renonce, retombe sur `any`, et cet `any` remonte dans le type
 * d'`api` TOUT ENTIER — des dizaines de `TS7006` surgissent alors dans des
 * fichiers qu'on n'a pas touchés, et la cause n'est jamais là où ça se plaint.
 */
export type ReponseDuCompagnon =
	| {
			genre: 'REPONSE';
			phrases: {
				texte: string;
				genreSource: 'PARAMETRE' | 'DECOMPTE' | 'PIECE' | 'AUCUNE';
				reference: string;
			}[];
			avertissement: string | null;
	  }
	| {
			genre: 'REFUS';
			/**
			 * ⚠️ `blocages` EST UN TABLEAU MUTABLE ICI, ET C'EST VOULU. `Refus` le
			 * porte en `readonly`, ce que le validateur Convex ne sait pas rendre :
			 * la copie se fait à la frontière, dans `enRefus`, plutôt que d'affaiblir
			 * le type du domaine pour arranger la plateforme.
			 */
			refus: {
				peutFaire: string;
				constat: string;
				blocages: string[];
				coutDeLAttente: string;
			};
			barriere: string | null;
			terme: string | null;
	  };

/** Ce que consomme un tour du compagnon, aux noms d'`UsageAppel`. */
interface Consommation {
	tokensIn: number;
	tokensOut: number;
	cacheReadTokens: number;
	coutEstime: number;
}

type Pastille = { phrase: number; source: SourceDeLaPhrase };

type SourceDeLaPhrase =
	| { nature: 'PIECE'; pieceId: Id<'pieces'>; page?: number }
	| { nature: 'DECOMPTE'; decompteId: Id<'decomptes'> }
	| { nature: 'REFERENTIEL'; cleParametre: string };

function enRefus(refus: Refus, barriere: string | null, terme: string | null): ReponseDuCompagnon {
	return {
		genre: 'REFUS',
		refus: {
			peutFaire: refus.peutFaire,
			constat: refus.constat,
			blocages: [...refus.blocages],
			coutDeLAttente: refus.coutDeLAttente
		},
		barriere,
		terme
	};
}

/**
 * Le dossier introuvable, ou celui d'un autre établissement.
 *
 * ⚠️ LE MÊME REFUS DANS LES DEUX CAS, ET C'EST LE CLOISONNEMENT. Un message
 * distinct dirait au demandeur que l'identifiant existe ailleurs.
 */
function refusDossierIllisible(): Refus {
	return composerRefus({
		peutFaire:
			'La file reste entière et se rend sans ce dossier : les autres rangées, leurs ' +
			'échéances, leurs décomptes et leur prescription sont à l’écran.',
		constat: 'Ce dossier n’est pas lisible depuis cet établissement.',
		blocages: [
			'Ce refus se lève en ouvrant le dossier depuis la file de l’établissement auquel il ' +
				'appartient.'
		],
		coutDeLAttente:
			'Ce que l’attente coûte est chiffrable, et vaut zéro : aucune échéance ni aucune ' +
			'somme de cet établissement ne dépend de cette lecture.'
	});
}

/**
 * Combien de tours du fil repartent avec la question.
 *
 * ⚠️ BORNÉ, ET LA BORNE EST LE SUJET. Un fil sans mémoire redemande au gérant
 * ce qu'il vient de dire ; un fil sans borne fait grossir le contexte de chaque
 * question jusqu'à ce que le plafond du mois morde en trois jours. Dix tours
 * couvrent un échange complet et pèsent quelques centaines de jetons.
 */
const TOURS_REPRIS = 10;

/**
 * Le refus s'inscrit AU FIL, comme une réponse.
 *
 * ⚠️ CE QUI A ÉTÉ DEMANDÉ FAIT PARTIE DE CE QUI S'EST PASSÉ. Un fil qui
 * n'afficherait que les échanges aboutis ferait disparaître la question sous
 * les yeux de celui qui vient de la taper, et il la reposerait — au même prix.
 */
async function consignerRefus(
	ctx: ActionCtx,
	creanceId: Id<'creances'>,
	question: string,
	refus: Refus,
	usage: Consommation | undefined
): Promise<void> {
	await ctx.runMutation(internal.recouvrement.conversationLecture.consignerEchange, {
		creanceId,
		fil: creanceId,
		question,
		reponse: [refus.peutFaire, refus.constat, ...refus.blocages, refus.coutDeLAttente].join(' '),
		pastilles: [],
		usage
	});
}

/**
 * Les pastilles à persister, une par phrase sourcée.
 *
 * ⚠️ LES IDENTIFIANTS SONT DÉJÀ VÉRIFIÉS quand on arrive ici : `lireReponse` a
 * refusé toute référence qui ne figurait pas dans ce qu'on a nous-mêmes envoyé.
 * La conversion de type ci-dessous ne CROIT donc pas le modèle : elle constate
 * qu'on lui a redonné l'un de nos propres identifiants.
 */
function pastillesDe(phrases: readonly PhraseSourcee[]): Pastille[] {
	const posees: Pastille[] = [];

	phrases.forEach((phrase, rang) => {
		if (phrase.genreSource === 'PARAMETRE') {
			posees.push({
				phrase: rang,
				source: { nature: 'REFERENTIEL', cleParametre: phrase.reference }
			});
		} else if (phrase.genreSource === 'DECOMPTE') {
			posees.push({
				phrase: rang,
				source: { nature: 'DECOMPTE', decompteId: phrase.reference as Id<'decomptes'> }
			});
		} else if (phrase.genreSource === 'PIECE') {
			posees.push({
				phrase: rang,
				source: { nature: 'PIECE', pieceId: phrase.reference as Id<'pieces'> }
			});
		}
	});

	return posees;
}

/**
 * L'appel, et `null` quand il n'aboutit pas.
 *
 * ⚠️ IL NE LÈVE JAMAIS VERS L'APPELANT, et c'est la même discipline que le
 * traitement d'un fichier déposé : une exception remontée disparaît dans les
 * journaux du serveur, où le gérant ne va pas. Ici, elle deviendrait en plus un
 * message technique en anglais au milieu d'un dossier.
 */
async function appelerLeModele(contexte: ContexteDossier, question: string) {
	try {
		return await extraireAvecClaude({
			contenu: { type: 'texte', texte: construireContexteDossier(contexte, question) },
			schema: reponseCompagnonSchema,
			prompt: construirePromptCompagnon()
		});
	} catch {
		return null;
	}
}

function avertissementDu(compteur: { avertissement: number; arret: number }): string {
	return (
		`Le compteur de conversation de cet établissement a dépassé ${compteur.avertissement} ` +
		`ce mois-ci, pour un plafond de sécurité de ${compteur.arret} — un budget de pilotage, ` +
		`jamais une facture. Au plafond, la conversation libre s’arrête, et rien d’autre : la ` +
		`file, les décomptes, les échéances et la prescription continuent de se calculer sans elle.`
	);
}

/**
 * Une question sur un dossier, et la réponse phrase par phrase.
 *
 * ⚠️ L'ÉTABLISSEMENT NE VIENT JAMAIS DU CLIENT. L'action n'a pas de base de
 * données : elle passe par une `internalQuery` qui appelle `getUserOrg`, lequel
 * REVÉRIFIE l'appartenance au point de lecture. Accepter un `organizationId` en
 * argument reviendrait à croire l'appelant sur parole, ce que ce dépôt a déjà
 * payé une fois.
 */
export const repondre = authedAction({
	args: { creanceId: v.id('creances'), question: v.string() },
	returns: vReponse,
	handler: async (ctx, { creanceId, question }): Promise<ReponseDuCompagnon> => {
		// ── 1. La clé, avant tout le reste ────────────────────────────────────
		// `requireEnv` lève un message écrit pour un développeur. Il ne doit pas
		// atteindre l'écran : le refus le remplace, en quatre parties.
		try {
			requireEnv('ANTHROPIC_API_KEY', { feature: 'la conversation du compagnon' });
		} catch {
			return enRefus(refusSansCle(), null, null);
		}

		// ── 2. Le dossier, le fil et le compteur, en une lecture cloisonnée ───
		const lu = await ctx.runQuery(internal.recouvrement.conversationLecture.contexteDuDossier, {
			creanceId,
			toursRepris: TOURS_REPRIS
		});
		if (lu === null) return enRefus(refusDossierIllisible(), null, null);

		// ── 3. Le plafond de sécurité, et D0 quand il mord ────────────────────
		// Il arrête la conversation LIBRE, et elle seule : la file, les calculs,
		// les propositions et le décompte continuent de se rendre entièrement.
		const plafond = evaluerPlafond(lu.compteur.cumul);
		if (plafond.refus !== null) {
			await consignerRefus(ctx, creanceId, question, plafond.refus, undefined);
			return enRefus(plafond.refus, null, null);
		}

		const contexte: ContexteDossier = lu.contexte;
		const ancres = ancresDuContexte(contexte);

		// ── 4. L'appel, et l'usage facturé qu'il rend ─────────────────────────
		const appel = await appelerLeModele(contexte, question);
		if (appel === null) {
			// ⚠️ ANGLE MORT DÉCLARÉ : l'appel a pu être émis, donc facturé, et son
			// usage voyage dans l'erreur. On ne l'écrit pas au compteur, parce
			// qu'aucun tour ne le porterait à l'écran et que le gérant ne pourrait
			// pas relier le chiffre à un échange. La reprise du socle le borne.
			const refus = refusAppelEchoue();
			await consignerRefus(ctx, creanceId, question, refus, undefined);
			return enRefus(refus, null, null);
		}

		const consommation: Consommation = {
			tokensIn: appel.usage.tokensIn,
			tokensOut: appel.usage.tokensOut,
			cacheReadTokens: appel.usage.cacheReadTokens,
			coutEstime: coutDuTour(appel.usage)
		};

		// ── 5. Les ancres, puis les quatre filtres avant rendu ────────────────
		let rendu: { phrases: readonly PhraseSourcee[]; texte: string };
		try {
			const { sortie, phrases } = lireReponse(appel.doc, ancres);
			filtrerAvantRendu(sortie);
			rendu = { phrases, texte: sortie.texte };
		} catch (erreur) {
			// ⚠️ LE REFUS PORTE L'USAGE, PARCE QUE L'APPEL A BIEN ÉTÉ FACTURÉ. Une
			// réponse retenue avant rendu a coûté exactement ce qu'aurait coûté une
			// réponse rendue ; ne pas la compter ferait qu'un modèle qui déraille
			// coûte, au compteur, moins cher qu'un modèle qui répond.
			if (erreur instanceof RefusDeRendu) {
				await consignerRefus(ctx, creanceId, question, erreur.refus, consommation);
				return enRefus(erreur.refus, erreur.barriere, erreur.terme);
			}
			if (erreur instanceof AncreInconnue) {
				await consignerRefus(ctx, creanceId, question, erreur.refus, consommation);
				return enRefus(erreur.refus, 'ANCRE', erreur.reference);
			}
			const refus = refusAppelEchoue();
			await consignerRefus(ctx, creanceId, question, refus, consommation);
			return enRefus(refus, null, null);
		}

		// ── 6. Les deux tours, écrits ensemble ────────────────────────────────
		await ctx.runMutation(internal.recouvrement.conversationLecture.consignerEchange, {
			creanceId,
			fil: creanceId,
			question,
			reponse: rendu.texte,
			pastilles: pastillesDe(rendu.phrases),
			usage: consommation
		});

		return {
			genre: 'REPONSE',
			phrases: rendu.phrases.map((phrase) => ({
				texte: phrase.texte,
				genreSource: phrase.genreSource,
				reference: phrase.reference
			})),
			avertissement: plafond.niveau === 'AVERTI' ? avertissementDu(lu.compteur) : null
		};
	}
});
