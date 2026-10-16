import { ConvexError, v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { heureDeParis } from '../../admin/dates';
import { ECRANS_D_AIDE } from '../../support/articles';
import { LONGUEUR_MAX_MESSAGE, MESSAGES_PAR_HEURE, titreDe } from '../../support/conversation';
import { masquerDonneesSensibles } from '../../support/masquage';
import { decidePassage, reponseSansModele, type Passage } from '../../support/passage';
import { questionsDuCompte } from '../../support/questions';
import { lireContexteDuCompte } from './contexte';
import {
	adresseDuSupport,
	ajouterEvenement,
	ajouterMessage,
	conversationDuGerant,
	exigerConversationDuGerant,
	passerALEquipe,
	plafondDePlumeAtteint,
	plumeSupportOuvert
} from './commun';
import {
	vActe,
	vAuteurSupport,
	vEtatConversation,
	vEvenementSupport,
	vIssue,
	vRaisonDePassage,
	vSourcePhrase
} from './tables';

/**
 * LE FIL DU GÉRANT (16/10/2026, spec § 3).
 *
 * Plume répond d'abord, l'équipe prend le relais dans le même fil. Toutes les règles
 * qui décident se lisent dans la logique pure (`src/lib/support/`) ; ce module les
 * applique, dans l'ordre : masquer, compter, répondre par le code ce qui se répond
 * par le code, passer à l'équipe ce qui doit l'être, sinon réveiller Plume.
 */

const REPONSE_ARRETER =
	'Je peux retenir une relance qui part bientôt, ou couper toutes les relances automatiques. Les deux se font ici, tout de suite.';
const REPONSE_DROIT =
	'Je ne réponds pas aux questions de droit : ce serait un avis juridique. Le Plume de votre espace montre ce que dit la loi sur vos dossiers, et l’écran Défense propose des professionnels près de vos clients.';

/** Le débit d'un compte : au-delà, un refus daté, sans passage à l'équipe. */
async function exigerLeDebit(ctx: MutationCtx, userId: string, maintenant: number): Promise<void> {
	const recents = await ctx.db
		.query('messagesSupport')
		.withIndex('by_auteur_user_and_le', (q) =>
			q.eq('auteurUserId', userId).gte('le', maintenant - 60 * 60 * 1000)
		)
		.take(MESSAGES_PAR_HEURE);
	if (recents.length < MESSAGES_PAR_HEURE) return;
	const reprise = (recents[0]?.le ?? maintenant) + 60 * 60 * 1000;
	throw new ConvexError(
		`Vous avez écrit beaucoup de messages en une heure : réessayez vers ${heureDeParis(reprise)}.`
	);
}

/** Les derniers messages du gérant, pour voir s'il redit la même chose. */
async function messagesDuGerant(
	ctx: MutationCtx,
	conversationId: Id<'conversationsSupport'>
): Promise<string[]> {
	const derniers = await ctx.db
		.query('messagesSupport')
		.withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
		.order('desc')
		.take(12);
	return derniers
		.filter((m) => m.auteur === 'GERANT' && m.genre === 'MESSAGE')
		.map((m) => m.texte)
		.reverse();
}

/** Rouvrir : chez l'équipe si elle l'avait déjà eue, chez Plume sinon. */
async function rouvrir(
	ctx: MutationCtx,
	conversation: Doc<'conversationsSupport'>
): Promise<Doc<'conversationsSupport'>> {
	if (conversation.etat === 'TERMINEE') {
		await ctx.db.patch(conversation._id, {
			etat: conversation.passeeLe === undefined ? 'PLUME' : 'A_NOUS',
			termineeLe: undefined,
			issue: undefined,
			nonsConsecutifs: 0,
			rappelLe: undefined,
			...(conversation.passeeLe === undefined ? {} : { passeeLe: Date.now() })
		});
		await ajouterEvenement(ctx, conversation, 'ROUVERTE', 'Conversation rouverte');
	} else if (conversation.etat === 'EN_ATTENTE_CLIENT') {
		await ctx.db.patch(conversation._id, {
			etat: 'A_NOUS',
			rappelLe: undefined,
			passeeLe: Date.now()
		});
	}
	return (await ctx.db.get(conversation._id))!;
}

/** Réveiller Plume : il lira la conversation et répondra, ou passera la main. */
async function reveillerPlume(
	ctx: MutationCtx,
	conversation: Doc<'conversationsSupport'>,
	messageId: Id<'messagesSupport'>,
	reformuler: boolean
): Promise<void> {
	await ctx.db.patch(conversation._id, { plumeReflechitDepuis: Date.now() });
	await ctx.scheduler.runAfter(0, internal.support.plume.repondre, {
		conversationId: conversation._id,
		messageId,
		reformuler
	});
}

/**
 * ÉCRIRE AU SUPPORT — une conversation nouvelle, ou un message de plus.
 *
 * ⚠️ LE TEXTE EST MASQUÉ AVANT TOUT STOCKAGE ET TOUT ENVOI AU MODÈLE (spec § 2.2) :
 * un IBAN, une carte, une clé collés par mégarde ne sont jamais écrits en base.
 */
export const envoyer = authedMutation({
	args: {
		conversationId: v.optional(v.id('conversationsSupport')),
		texte: v.string(),
		/** L'écran d'où l'on vient (`ECRANS_D_AIDE`) : l'équipe le lit dans la carte « Transmis ». */
		depuis: v.optional(v.string()),
		/** « Parler à l'équipe » touché avant d'écrire : la conversation va droit à l'équipe. */
		aLEquipe: v.optional(v.boolean())
	},
	returns: v.id('conversationsSupport'),
	handler: async (ctx, args): Promise<Id<'conversationsSupport'>> =>
		ecrireAuSupport(
			ctx,
			{
				userId: ctx.user._id,
				...(ctx.user.name === undefined ? {} : { nom: ctx.user.name }),
				organisation: async () => (await getUserOrg(ctx)).organizationId
			},
			args
		)
});

/**
 * Le cœur de `envoyer`, sans la session : les tests l'appellent avec un auteur posé à
 * la main (Better Auth ne se monte pas dans `convex-test`).
 */
export async function ecrireAuSupport(
	ctx: MutationCtx,
	auteur: {
		readonly userId: string;
		readonly nom?: string;
		/** L'établissement courant, lu seulement pour une conversation nouvelle. */
		readonly organisation: () => Promise<Id<'organizations'>>;
	},
	args: {
		readonly conversationId?: Id<'conversationsSupport'>;
		readonly texte: string;
		readonly depuis?: string;
		readonly aLEquipe?: boolean;
	}
): Promise<Id<'conversationsSupport'>> {
	const brut = args.texte.trim();
	if (brut === '') throw new ConvexError('Écrivez votre question.');
	if (brut.length > LONGUEUR_MAX_MESSAGE) {
		throw new ConvexError(
			`Votre message dépasse ${LONGUEUR_MAX_MESSAGE} caractères : coupez-le en deux.`
		);
	}
	const maintenant = Date.now();
	const userId = auteur.userId;
	await exigerLeDebit(ctx, userId, maintenant);
	const { texte, masques } = masquerDonneesSensibles(brut);

	let conversation: Doc<'conversationsSupport'>;
	if (args.conversationId === undefined) {
		const organizationId = await auteur.organisation();
		const depuis =
			args.depuis !== undefined && args.depuis in ECRANS_D_AIDE ? args.depuis : undefined;
		const id = await ctx.db.insert('conversationsSupport', {
			organizationId,
			auteurUserId: userId,
			...(auteur.nom === undefined ? {} : { auteurNom: auteur.nom }),
			canal: 'APP',
			etat: 'PLUME',
			titre: titreDe(texte),
			...(depuis === undefined ? {} : { depuis }),
			verifiee: true,
			jeton: crypto.randomUUID().replace(/-/g, ''),
			dernierMessageLe: maintenant,
			dernierMessagePar: 'GERANT',
			luParAuteurLe: maintenant,
			nonsConsecutifs: 0,
			creeeLe: maintenant
		});
		conversation = (await ctx.db.get(id))!;
	} else {
		conversation = await rouvrir(
			ctx,
			await exigerConversationDuGerant(ctx, args.conversationId, userId)
		);
	}

	const messageId = await ajouterMessage(ctx, conversation, {
		auteur: 'GERANT',
		auteurUserId: userId,
		...(auteur.nom === undefined ? {} : { auteurNom: auteur.nom }),
		canal: 'APP',
		genre: 'MESSAGE',
		texte,
		...(masques.length === 0 ? {} : { masques: [...masques] })
	});
	await ctx.db.patch(conversation._id, { luParAuteurLe: maintenant });

	// Chez l'équipe, Plume se tait : le message s'ajoute à la demande, et c'est tout.
	if (conversation.etat !== 'PLUME' || conversation.organizationId === undefined) {
		return conversation._id;
	}

	const special = args.aLEquipe === true ? null : reponseSansModele(texte);
	if (special === 'ARRETER_LES_ENVOIS') {
		await ajouterMessage(ctx, conversation, {
			auteur: 'PLUME',
			canal: 'APP',
			genre: 'MESSAGE',
			texte: REPONSE_ARRETER,
			phrases: [{ texte: REPONSE_ARRETER, source: { genre: 'AUCUNE' } }],
			ecrans: ['PILOTE'],
			carte: 'ARRETER_LES_ENVOIS'
		});
	} else if (special === 'QUESTION_DE_DROIT') {
		await ajouterMessage(ctx, conversation, {
			auteur: 'PLUME',
			canal: 'APP',
			genre: 'MESSAGE',
			texte: REPONSE_DROIT,
			phrases: [{ texte: REPONSE_DROIT, source: { genre: 'AUCUNE' } }],
			ecrans: ['PLUME', 'DEFENSE']
		});
	}

	const passage: Passage | null =
		args.aLEquipe === true
			? { raison: 'DEMANDE' }
			: decidePassage({
					texte,
					messagesDuGerant: await messagesDuGerant(ctx, conversation._id),
					nonsConsecutifs: conversation.nonsConsecutifs,
					plafondAtteint: await plafondDePlumeAtteint(ctx, conversation.organizationId, maintenant),
					plumeOuvert: plumeSupportOuvert()
				});
	// Une réponse composée par le code n'a besoin ni du modèle ni de son budget :
	// elle ne passe la main que si le gérant demande l'équipe, ou un acte.
	const passe =
		passage !== null &&
		(special === null ||
			passage.raison === 'DEMANDE' ||
			passage.raison === 'ACTE' ||
			passage.raison === 'FERME');
	if (passe) {
		await passerALEquipe(ctx, conversation, passage);
	} else if (special === null) {
		await reveillerPlume(ctx, conversation, messageId, false);
	}
	return conversation._id;
}

/** « Parler à l'équipe », dans l'en-tête du fil. */
export const parlerALEquipe = authedMutation({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.null(),
	handler: async (ctx, { conversationId }): Promise<null> => {
		const conversation = await rouvrir(
			ctx,
			await exigerConversationDuGerant(ctx, conversationId, ctx.user._id)
		);
		if (conversation.etat === 'PLUME')
			await passerALEquipe(ctx, conversation, { raison: 'DEMANDE' });
		return null;
	}
});

/**
 * « ÇA RÉPOND À VOTRE QUESTION ? » — sous la dernière réponse de Plume seulement.
 *
 * Oui : la conversation se termine, c'est l'avis sur Plume. Non : Plume reformule une
 * fois ; au second, la conversation passe à l'équipe (`REFUS`).
 */
export const avisSurPlume = authedMutation({
	args: { messageId: v.id('messagesSupport'), utile: v.boolean() },
	returns: v.null(),
	handler: async (ctx, { messageId, utile }): Promise<null> => {
		const message = await ctx.db.get(messageId);
		if (message === null || message.auteur !== 'PLUME')
			throw new ConvexError('Réponse introuvable.');
		const conversation = await exigerConversationDuGerant(
			ctx,
			message.conversationId,
			ctx.user._id
		);
		if (conversation.etat !== 'PLUME' || message.avis !== undefined) return null;
		await ctx.db.patch(messageId, { avis: utile ? 'OUI' : 'NON' });

		if (utile) {
			await ctx.db.patch(conversation._id, {
				etat: 'TERMINEE',
				issue: 'RESOLUE_PAR_PLUME',
				termineeLe: Date.now(),
				nonsConsecutifs: 0
			});
			await ajouterEvenement(ctx, conversation, 'TERMINEE', 'Conversation terminée');
			return null;
		}

		const nons = conversation.nonsConsecutifs + 1;
		await ctx.db.patch(conversation._id, { nonsConsecutifs: nons });
		if (nons >= 2 || !plumeSupportOuvert()) {
			await passerALEquipe(ctx, conversation, { raison: nons >= 2 ? 'REFUS' : 'FERME' });
			return null;
		}
		const question = (
			await ctx.db
				.query('messagesSupport')
				.withIndex('by_conversation', (q) => q.eq('conversationId', conversation._id))
				.order('desc')
				.take(12)
		).find((m) => m.auteur === 'GERANT' && m.genre === 'MESSAGE');
		if (question === undefined) {
			await passerALEquipe(ctx, conversation, { raison: 'REFUS' });
			return null;
		}
		await reveillerPlume(ctx, conversation, question._id, true);
		return null;
	}
});

/**
 * LA CONVERSATION EST LUE — et l'e-mail qui devait porter la réponse de l'équipe ne
 * part plus (Intercom : on ne redit pas par e-mail ce qu'on vient de lire).
 */
export const marquerLue = authedMutation({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.null(),
	handler: async (ctx, { conversationId }): Promise<null> => {
		const conversation = await conversationDuGerant(ctx, conversationId, ctx.user._id);
		if (conversation === null) return null;
		await ctx.db.patch(conversationId, { luParAuteurLe: Date.now() });
		const recents = await ctx.db
			.query('messagesSupport')
			.withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
			.order('desc')
			.take(20);
		for (const message of recents) {
			if (message.emailProgramme === undefined) continue;
			await ctx.scheduler.cancel(message.emailProgramme);
			await ctx.db.patch(message._id, { emailProgramme: undefined });
		}
		return null;
	}
});

/** L'avis après une conversation terminée par l'équipe, une fois. */
export const donnerSonAvis = authedMutation({
	args: {
		conversationId: v.id('conversationsSupport'),
		utile: v.boolean(),
		motif: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { conversationId, utile, motif }): Promise<null> => {
		const conversation = await exigerConversationDuGerant(ctx, conversationId, ctx.user._id);
		if (conversation.issue !== 'RESOLUE_PAR_EQUIPE' || conversation.avis !== undefined) return null;
		const motifNet = motif?.trim().slice(0, 300);
		await ctx.db.patch(conversationId, {
			avis: { utile, ...(motifNet ? { motif: motifNet } : {}), le: Date.now() }
		});
		return null;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// CE QUE LIT LE GÉRANT
// ─────────────────────────────────────────────────────────────────────────

const vCarteDeConversation = v.object({
	id: v.id('conversationsSupport'),
	titre: v.string(),
	etat: vEtatConversation,
	dernierMessageLe: v.number(),
	dernierMessagePar: vAuteurSupport,
	passeeLe: v.optional(v.number()),
	termineeLe: v.optional(v.number()),
	repondantNom: v.optional(v.string()),
	/** L'équipe a répondu depuis la dernière lecture. */
	nonLue: v.boolean()
});

function enCarte(c: Doc<'conversationsSupport'>) {
	return {
		id: c._id,
		titre: c.titre,
		etat: c.etat,
		dernierMessageLe: c.dernierMessageLe,
		dernierMessagePar: c.dernierMessagePar,
		...(c.passeeLe === undefined ? {} : { passeeLe: c.passeeLe }),
		...(c.termineeLe === undefined ? {} : { termineeLe: c.termineeLe }),
		...(c.repondantNom === undefined ? {} : { repondantNom: c.repondantNom }),
		nonLue: c.dernierMessagePar === 'EQUIPE' && (c.luParAuteurLe ?? 0) < c.dernierMessageLe
	};
}

/**
 * L'ACCUEIL DE L'AIDE : les conversations de l'auteur dans cet établissement, trois
 * questions calculées sur l'état du compte, l'équipe et ses horaires.
 *
 * ⚠️ `mois` VIENT DE L'ÉCRAN, comme toute date d'une requête : il ne change qu'une
 * fois par mois, l'abonnement reste en cache.
 */
export const accueil = authedQuery({
	args: { mois: v.string() },
	returns: v.object({
		plumeOuvert: v.boolean(),
		plafondAtteint: v.boolean(),
		adresse: v.union(v.string(), v.null()),
		equipe: v.array(v.object({ prenom: v.string(), photo: v.union(v.string(), v.null()) })),
		absentJusquAu: v.union(v.number(), v.null()),
		questions: v.array(v.object({ cle: v.string(), question: v.string() })),
		conversations: v.array(vCarteDeConversation)
	}),
	handler: async (ctx, { mois }) => {
		const { organizationId } = await getUserOrg(ctx);
		const userId = ctx.user._id;
		const contexte = await lireContexteDuCompte(ctx, organizationId, userId);
		const enErreur = contexte.connexions.find(
			(c) => c.etat === 'LECTURE_ECHOUEE' || c.etat === 'REVOQUEE'
		);
		const siennes = (
			await ctx.db
				.query('conversationsSupport')
				.withIndex('by_auteur', (q) => q.eq('auteurUserId', userId))
				.order('desc')
				.take(60)
		).filter((c) => c.organizationId === organizationId);

		const membres = (await ctx.db.query('equipe').take(50)).filter(
			(m) => m.retireLe === undefined && m.rejointLe !== undefined && m.prenomAffiche !== undefined
		);
		const equipe = [];
		for (const membre of membres) {
			equipe.push({
				prenom: membre.prenomAffiche!,
				photo:
					membre.photoStorageId === undefined
						? null
						: await ctx.storage.getUrl(membre.photoStorageId)
			});
		}
		const reglages = await ctx.db.query('reglagesSupport').first();
		const debutDuMois = Date.parse(`${/^\d{4}-\d{2}$/.test(mois) ? mois : '2026-01'}-15T12:00:00Z`);

		return {
			plumeOuvert: plumeSupportOuvert(),
			plafondAtteint: await plafondDePlumeAtteint(ctx, organizationId, debutDuMois),
			adresse: adresseDuSupport(),
			equipe,
			absentJusquAu: reglages?.absentJusquAu ?? null,
			questions: questionsDuCompte({
				relancesActivees: contexte.relancesActivees,
				essaiEnCours: contexte.etatAbonnement === 'essai en cours',
				connexionEnErreur: enErreur?.fournisseur ?? null,
				documentsEnEchec: contexte.documentsEnEchec,
				estAdministrateur: contexte.role === 'ADMINISTRATEUR'
			}),
			conversations: siennes.map(enCarte)
		};
	}
});

/** Le nombre de réponses de l'équipe non lues : le point de la rangée « Aide ». */
export const nonLues = authedQuery({
	args: {},
	returns: v.number(),
	handler: async (ctx): Promise<number> => {
		const { organizationId } = await getUserOrg(ctx);
		const siennes = await ctx.db
			.query('conversationsSupport')
			.withIndex('by_auteur', (q) => q.eq('auteurUserId', ctx.user._id))
			.order('desc')
			.take(30);
		return siennes.filter((c) => c.organizationId === organizationId && enCarte(c).nonLue).length;
	}
});

/**
 * UNE CONVERSATION, TELLE QUE LA LIT SON AUTEUR.
 *
 * ⚠️ NI LES NOTES DE L'ÉQUIPE, NI UN E-MAIL NON VÉRIFIÉ : ce sont des genres que le
 * gérant ne lit jamais. Un contenu retiré laisse sa trace, sans son texte.
 */
export const conversation = authedQuery({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.union(
		v.null(),
		v.object({
			id: v.id('conversationsSupport'),
			titre: v.string(),
			etat: vEtatConversation,
			raisonDePassage: v.optional(vRaisonDePassage),
			acte: v.optional(vActe),
			depuis: v.optional(v.string()),
			passeeLe: v.optional(v.number()),
			termineeLe: v.optional(v.number()),
			issue: v.optional(vIssue),
			repondantNom: v.optional(v.string()),
			plumeReflechit: v.boolean(),
			avisDemande: v.boolean(),
			messages: v.array(
				v.object({
					id: v.id('messagesSupport'),
					auteur: vAuteurSupport,
					auteurNom: v.optional(v.string()),
					canal: v.union(v.literal('APP'), v.literal('EMAIL')),
					genre: v.union(v.literal('MESSAGE'), v.literal('EVENEMENT')),
					texte: v.string(),
					phrases: v.optional(v.array(v.object({ texte: v.string(), source: vSourcePhrase }))),
					ecrans: v.optional(v.array(v.string())),
					carte: v.optional(v.literal('ARRETER_LES_ENVOIS')),
					evenement: v.optional(vEvenementSupport),
					masques: v.optional(
						v.array(
							v.object({
								genre: v.union(v.literal('IBAN'), v.literal('CARTE'), v.literal('CLE')),
								nombre: v.number()
							})
						)
					),
					avis: v.optional(v.union(v.literal('OUI'), v.literal('NON'))),
					retire: v.boolean(),
					le: v.number()
				})
			)
		})
	),
	handler: async (ctx, { conversationId }) => {
		const c = await conversationDuGerant(ctx, conversationId, ctx.user._id);
		if (c === null) return null;
		const messages = await ctx.db
			.query('messagesSupport')
			.withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
			.take(300);
		return {
			id: c._id,
			titre: c.titre,
			etat: c.etat,
			...(c.raisonDePassage === undefined ? {} : { raisonDePassage: c.raisonDePassage }),
			...(c.acte === undefined ? {} : { acte: c.acte }),
			...(c.depuis === undefined ? {} : { depuis: c.depuis }),
			...(c.passeeLe === undefined ? {} : { passeeLe: c.passeeLe }),
			...(c.termineeLe === undefined ? {} : { termineeLe: c.termineeLe }),
			...(c.issue === undefined ? {} : { issue: c.issue }),
			...(c.repondantNom === undefined ? {} : { repondantNom: c.repondantNom }),
			plumeReflechit: c.etat === 'PLUME' && c.plumeReflechitDepuis !== undefined,
			avisDemande: c.issue === 'RESOLUE_PAR_EQUIPE' && c.avis === undefined,
			messages: messages
				.filter(
					(m): m is Doc<'messagesSupport'> & { genre: 'MESSAGE' | 'EVENEMENT' } =>
						m.genre === 'MESSAGE' || m.genre === 'EVENEMENT'
				)
				.map((m) => {
					const retire = m.retireLe !== undefined;
					return {
						id: m._id,
						auteur: m.auteur,
						...(m.auteurNom === undefined || m.auteur === 'GERANT'
							? {}
							: { auteurNom: m.auteurNom }),
						canal: m.canal,
						genre: m.genre,
						texte: retire ? '' : m.texte,
						...(retire || m.phrases === undefined ? {} : { phrases: m.phrases }),
						...(retire || m.ecrans === undefined ? {} : { ecrans: m.ecrans }),
						...(retire || m.carte === undefined ? {} : { carte: m.carte }),
						...(m.evenement === undefined ? {} : { evenement: m.evenement }),
						...(m.masques === undefined ? {} : { masques: m.masques }),
						...(m.avis === undefined ? {} : { avis: m.avis }),
						retire,
						le: m.le
					};
				})
		};
	}
});
