import { ConvexError } from 'convex/values';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import {
	moisDe,
	PLAFOND_SUPPORT_GLOBAL,
	PLAFOND_SUPPORT_MENSUEL,
	receptionOuverte
} from '../../support/conversation';
import type { Passage } from '../../support/passage';
import { acteReserveAuFondateur, SUJET_DE_L_ACTE } from '../../support/sujets';
import { getLegalEmailAddress } from '../../config/legal';

/**
 * CE QUE PARTAGENT LES FONCTIONS DU SUPPORT (16/10/2026) — aucune n'est exportée vers
 * le client d'ici : ce module ne porte que des aides.
 */

/** Plume support répond seulement après le préavis de la politique 2.8 (spec § 4). */
export function plumeSupportOuvert(): boolean {
	return process.env.PLUME_SUPPORT_OUVERT === 'oui';
}

/** L'adresse où écrire au support, seulement quand la réception est ouverte (spec § 5.2). */
export function adresseDuSupport(): string | null {
	return receptionOuverte({
		secret: process.env.RESEND_RECEPTION_WEBHOOK_SECRET,
		domaine: process.env.SUPPORT_RECEPTION_DOMAINE,
		relancesEmail: process.env.RELANCES_EMAIL,
		authEmail: process.env.AUTH_EMAIL
	})
		? getLegalEmailAddress()
		: null;
}

/**
 * UNE CONVERSATION, LUE PAR SON AUTEUR.
 *
 * ⚠️ PRIVÉE À SON AUTEUR, ET L'APPARTENANCE SE REVÉRIFIE À L'ÉTABLISSEMENT DE LA
 * CONVERSATION, jamais à l'établissement courant : un compte retiré de
 * l'établissement depuis ne relit plus ce qu'il y avait écrit, et un collègue ne lit
 * pas la conversation d'un autre, même administrateur.
 */
export async function conversationDuGerant(
	ctx: QueryCtx | MutationCtx,
	conversationId: Id<'conversationsSupport'>,
	userId: string
): Promise<Doc<'conversationsSupport'> | null> {
	const conversation = await ctx.db.get(conversationId);
	if (
		conversation === null ||
		conversation.auteurUserId !== userId ||
		conversation.organizationId === undefined
	) {
		return null;
	}
	const organizationId = conversation.organizationId;
	const membre = await ctx.db
		.query('organizationMembers')
		.withIndex('by_org_and_user', (q) =>
			q.eq('organizationId', organizationId).eq('userId', userId)
		)
		.first();
	return membre === null ? null : conversation;
}

export async function exigerConversationDuGerant(
	ctx: QueryCtx | MutationCtx,
	conversationId: Id<'conversationsSupport'>,
	userId: string
): Promise<Doc<'conversationsSupport'>> {
	const conversation = await conversationDuGerant(ctx, conversationId, userId);
	if (conversation === null) throw new ConvexError('Cette conversation est introuvable.');
	return conversation;
}

type NouveauMessage = Omit<
	Doc<'messagesSupport'>,
	'_id' | '_creationTime' | 'conversationId' | 'organizationId' | 'mois' | 'le'
>;

/**
 * Ajoute un message au fil. Un MESSAGE fait avancer la conversation (`dernierMessageLe`,
 * qui doit agir) ; une NOTE ou un ÉVÉNEMENT n'y touchent pas : une note de l'équipe ne
 * dit pas au gérant qu'on lui a répondu.
 */
export async function ajouterMessage(
	ctx: MutationCtx,
	conversation: Doc<'conversationsSupport'>,
	message: NouveauMessage
): Promise<Id<'messagesSupport'>> {
	const le = Date.now();
	const id = await ctx.db.insert('messagesSupport', {
		...message,
		conversationId: conversation._id,
		...(conversation.organizationId === undefined
			? {}
			: { organizationId: conversation.organizationId }),
		mois: moisDe(le),
		le
	});
	if (message.genre === 'MESSAGE' || message.genre === 'NON_VERIFIE') {
		await ctx.db.patch(conversation._id, {
			dernierMessageLe: le,
			dernierMessagePar: message.auteur
		});
	}
	return id;
}

/** Une ligne du fil, au nom du système. */
export async function ajouterEvenement(
	ctx: MutationCtx,
	conversation: Doc<'conversationsSupport'>,
	evenement: NonNullable<Doc<'messagesSupport'>['evenement']>,
	texte: string
): Promise<void> {
	await ajouterMessage(ctx, conversation, {
		auteur: 'SYSTEME',
		canal: conversation.canal,
		genre: 'EVENEMENT',
		evenement,
		texte
	});
}

/**
 * LA CONVERSATION PASSE À L'ÉQUIPE, À L'INSTANT (spec § 3.1).
 *
 * Aucun geste à confirmer : la carte « Transmis » est déjà envoyée quand le gérant la
 * lit, et Plume se tait. L'horloge de la réponse attendue part d'ici.
 */
export async function passerALEquipe(
	ctx: MutationCtx,
	conversation: Doc<'conversationsSupport'>,
	passage: Passage
): Promise<void> {
	const reservee =
		conversation.reserveeAuFondateur === true ||
		(passage.acte !== undefined && acteReserveAuFondateur(passage.acte));
	const sujet =
		conversation.sujet ?? (passage.acte === undefined ? undefined : SUJET_DE_L_ACTE[passage.acte]);
	await ctx.db.patch(conversation._id, {
		etat: 'A_NOUS',
		raisonDePassage: passage.raison,
		...(passage.acte === undefined ? {} : { acte: passage.acte }),
		...(sujet === undefined ? {} : { sujet }),
		...(reservee ? { reserveeAuFondateur: true } : {}),
		passeeLe: Date.now(),
		plumeReflechitDepuis: undefined,
		termineeLe: undefined,
		issue: undefined
	});
	await ajouterEvenement(ctx, conversation, 'PASSE', 'Transmis à l’équipe');
}

async function compteur(
	ctx: QueryCtx | MutationCtx,
	organizationId: Id<'organizations'> | undefined,
	mois: string
): Promise<Doc<'compteursSupport'> | null> {
	return ctx.db
		.query('compteursSupport')
		.withIndex('by_org_and_mois', (q) => q.eq('organizationId', organizationId).eq('mois', mois))
		.first();
}

/** Le budget de Plume support est-il épuisé, pour cet établissement ou pour tous ? */
export async function plafondDePlumeAtteint(
	ctx: QueryCtx | MutationCtx,
	organizationId: Id<'organizations'>,
	instant: number
): Promise<boolean> {
	const mois = moisDe(instant);
	const sien = await compteur(ctx, organizationId, mois);
	if ((sien?.reponses ?? 0) >= PLAFOND_SUPPORT_MENSUEL) return true;
	const global = await compteur(ctx, undefined, mois);
	return (global?.reponses ?? 0) >= PLAFOND_SUPPORT_GLOBAL;
}

/** Une réponse de Plume de plus, au compte de l'établissement et à celui de tous. */
export async function compterUneReponse(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	instant: number
): Promise<void> {
	const mois = moisDe(instant);
	for (const cible of [organizationId, undefined]) {
		const ligne = await compteur(ctx, cible, mois);
		if (ligne === null) {
			await ctx.db.insert('compteursSupport', {
				...(cible === undefined ? {} : { organizationId: cible }),
				mois,
				reponses: 1
			});
		} else {
			await ctx.db.patch(ligne._id, { reponses: ligne.reponses + 1 });
		}
	}
}
