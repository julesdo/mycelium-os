import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { depuisCentimes, enCentimes } from '../../socle/montants';
import { composerBriefing } from '../../verticales/recouvrement/briefing';
import type { Evenement } from '../../verticales/recouvrement/surveillance';

/**
 * LE BRIEFING DU JOUR, LISIBLE À L'ÉCRAN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL N'EXISTAIT QUE DANS UN COURRIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `composerBriefing` n'avait qu'un appelant, `battement.ts`, et son résultat
 * partait directement dans un e-mail. Conséquence : la seule phrase du produit
 * qui dise « voilà ce que vaut votre journée, et la chose à regarder » vivait
 * hors de l'application. Un gérant qui ouvre le logiciel sans avoir lu son
 * courrier — ou dont l'envoi a échoué — ne pouvait pas l'obtenir, alors que
 * toute la matière est en base.
 *
 * ⚠️ ET CE N'EST PAS UN DIGEST. La règle est entière dans
 * `verticales/recouvrement/briefing.ts` : trois lignes au plus, UNE action, et
 * le silence quand il n'y a rien à dire. Ce fichier lit et met en forme. Il ne
 * décide de rien, et surtout il ne complète rien : un briefing qui n'a qu'une
 * ligne en rend une.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL NE REND PAS, ET POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le VERDICT de `decider()` — parler ou se taire — n'est pas exposé ici. Il
 * décide d'un ENVOI, pas d'un affichage : il se compare au relevé de la veille,
 * et « sept jours sans nouvelle » le fait parler même quand rien n'a bougé. À
 * l'écran, la question ne se pose pas dans ces termes — l'écran est déjà ouvert.
 * Le jour où la file voudra se taire, elle lira `battements`, qui porte déjà le
 * verdict de la nuit.
 */

const vBriefing = v.object({
	titre: v.string(),
	intro: v.string(),
	/**
	 * Une ligne quand il n'y a rien à signaler, deux pour un seul événement,
	 * trois à partir de deux. Le nombre varie honnêtement selon ce qu'il y a à
	 * dire : il n'est jamais rempli pour faire un compte rond.
	 */
	lignes: v.array(v.string()),
	/** L'action du jour, ou `null` quand il n'y a rien à faire. */
	action: v.union(v.string(), v.null()),
	/** En centimes, comme tout montant de ce produit. */
	montantIdentifie: v.int64(),
	/** Combien d'événements le flux a rendus. Zéro se lit aussi. */
	nombreEvenements: v.number()
});

export const duJour = authedQuery({
	args: {
		/**
		 * La date est un argument pour rester rejouable ; à défaut, celle du
		 * serveur, en UTC, qui est aussi celle des dates ISO stockées. Même
		 * convention que `surveillance.flux`.
		 */
		aujourdHui: v.optional(v.string())
	},
	returns: vBriefing,
	/**
	 * Le type de retour est annoté à la main. Ce handler appelle une fonction par
	 * `internal.` ; l'annotation coupe net tout risque de cycle d'inférence, dont
	 * le coût n'est jamais local — il fait retomber le type de `api` tout entier
	 * sur `any`, et tous les écrans perdent leur inférence d'un coup.
	 */
	handler: async (
		ctx,
		{ aujourdHui }
	): Promise<{
		titre: string;
		intro: string;
		lignes: string[];
		action: string | null;
		montantIdentifie: bigint;
		nombreEvenements: number;
	}> => {
		const { organizationId } = await getUserOrg(ctx);
		const jour = aujourdHui ?? new Date().toISOString().slice(0, 10);

		const flux = await ctx.runQuery(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: jour
		});

		// La même traduction que `battement.ts` : le domaine travaille en montants,
		// Convex transporte des centimes.
		const evenements: Evenement[] = flux.evenements.map((brut) => ({
			type: brut.type,
			reference: brut.reference,
			montant: brut.montant === null ? null : depuisCentimes(brut.montant),
			urgence: brut.urgence,
			explication: brut.explication,
			action: brut.action,
			...(brut.cible === undefined ? {} : { cible: brut.cible }),
			// ⚠️ QUATRIÈME SITE QUI RECONSTRUIT L'ÉVÉNEMENT CHAMP PAR CHAMP, et le plus
			// facile à oublier parce qu'il vit dans un autre fichier que les trois
			// autres. Sans cette ligne, le briefing du matin se rangerait sur le
			// montant pendant que la file se range sur l'échéance : deux ordres au
			// monde, alors que `comparerEvenements` existe pour qu'il n'y en ait qu'un.
			...(brut.dateDuFait === undefined ? {} : { dateDuFait: brut.dateDuFait })
		}));

		const briefing = composerBriefing(evenements, depuisCentimes(flux.montantIdentifie));

		return {
			titre: briefing.titre,
			intro: briefing.intro,
			lignes: [...briefing.lignes],
			action: briefing.action,
			montantIdentifie: enCentimes(briefing.montantIdentifie),
			nombreEvenements: evenements.length
		};
	}
});
