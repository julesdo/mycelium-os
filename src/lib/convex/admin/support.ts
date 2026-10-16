import { ConvexError, v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { heuresOuvreesEntre } from '../../support/horaires';
import { relireLeMessageDeLEquipe } from '../../support/filtres';
import { LIBELLES_DES_SUJETS } from '../../support/sujets';
import { lireContexteDuCompte, vContexteDuCompte } from '../support/contexte';
import { ajouterEvenement, ajouterMessage } from '../support/commun';
import { suspendreLesRelances } from '../recouvrement/pilote';
import {
	vActe,
	vAuteurSupport,
	vCanalSupport,
	vEtatConversation,
	vEvenementSupport,
	vGenreMessage,
	vIssue,
	vRaisonDePassage,
	vSourcePhrase,
	vSujet
} from '../support/tables';
import { equipeMutation, equipeQuery, noterAuJournal, type Equipier } from './enveloppe';

/**
 * LA BOÎTE DU SUPPORT, CÔTÉ ÉQUIPE (16/10/2026, spec du service client § 6).
 *
 * ⚠️ LE RÔLE LECTURE VOIT LA FILE, JAMAIS LES MESSAGES : la question elle-même est un
 * message, son titre se remplace par son sujet. Une conversation réservée (données
 * personnelles, compte compromis) ne se montre qu'au FONDATEUR. Toute ouverture d'une
 * conversation s'inscrit au journal.
 */

const vVue = v.union(
	v.literal('A_VOUS'),
	v.literal('OUVERTES'),
	v.literal('EN_ATTENTE'),
	v.literal('TERMINEES'),
	v.literal('PLUME')
);

const vLigneDeFile = v.object({
	id: v.id('conversationsSupport'),
	etablissement: v.string(),
	titre: v.string(),
	sujet: v.optional(vSujet),
	canal: vCanalSupport,
	etat: vEtatConversation,
	raison: v.optional(vRaisonDePassage),
	acte: v.optional(vActe),
	passeeLe: v.optional(v.number()),
	dernierMessageLe: v.number(),
	dernierMessagePar: vAuteurSupport,
	assigneA: v.optional(v.string()),
	prioritaire: v.boolean(),
	verifiee: v.boolean(),
	reservee: v.boolean(),
	nonLue: v.boolean()
});

function visible(conversation: Doc<'conversationsSupport'>, equipier: Equipier): boolean {
	return conversation.reserveeAuFondateur !== true || equipier.role === 'FONDATEUR';
}

async function nomDeLEtablissement(
	ctx: QueryCtx | MutationCtx,
	conversation: Doc<'conversationsSupport'>
): Promise<string> {
	if (conversation.organizationId === undefined) {
		return conversation.verifiee
			? (conversation.adresse ?? 'Sans établissement')
			: 'Expéditeur non vérifié';
	}
	return (await ctx.db.get(conversation.organizationId))?.name ?? 'Établissement supprimé';
}

async function exigerConversation(
	ctx: QueryCtx | MutationCtx,
	conversationId: Id<'conversationsSupport'>,
	equipier: Equipier
): Promise<Doc<'conversationsSupport'>> {
	const conversation = await ctx.db.get(conversationId);
	if (conversation === null || !visible(conversation, equipier)) {
		throw new ConvexError('Conversation introuvable.');
	}
	return conversation;
}

export const file = equipeQuery('LECTURE')({
	args: { vue: vVue },
	returns: v.array(vLigneDeFile),
	handler: async (ctx, { vue }) => {
		const etat =
			vue === 'EN_ATTENTE'
				? 'EN_ATTENTE_CLIENT'
				: vue === 'TERMINEES'
					? 'TERMINEE'
					: vue === 'PLUME'
						? 'PLUME'
						: 'A_NOUS';
		const lignes = await ctx.db
			.query('conversationsSupport')
			.withIndex('by_etat_and_dernier', (q) => q.eq('etat', etat))
			.order(etat === 'A_NOUS' ? 'asc' : 'desc')
			.take(200);
		const retenues = lignes.filter(
			(c) =>
				visible(c, ctx.equipier) &&
				(vue !== 'A_VOUS' || c.assigneA === undefined || c.assigneA === ctx.equipier.email)
		);
		const lecture = ctx.equipier.role === 'LECTURE';
		const resultat = [];
		for (const c of retenues) {
			resultat.push({
				id: c._id,
				etablissement: await nomDeLEtablissement(ctx, c),
				titre: lecture
					? c.sujet === undefined
						? 'Question'
						: LIBELLES_DES_SUJETS[c.sujet]
					: c.titre,
				...(c.sujet === undefined ? {} : { sujet: c.sujet }),
				canal: c.canal,
				etat: c.etat,
				...(c.raisonDePassage === undefined ? {} : { raison: c.raisonDePassage }),
				...(c.acte === undefined ? {} : { acte: c.acte }),
				...(c.passeeLe === undefined ? {} : { passeeLe: c.passeeLe }),
				dernierMessageLe: c.dernierMessageLe,
				dernierMessagePar: c.dernierMessagePar,
				...(c.assigneA === undefined ? {} : { assigneA: c.assigneA }),
				prioritaire: c.prioritaire === true,
				verifiee: c.verifiee,
				reservee: c.reserveeAuFondateur === true,
				nonLue:
					(c.dernierMessagePar === 'GERANT' || c.dernierMessagePar === 'SYSTEME') &&
					(c.luParEquipeLe ?? 0) < c.dernierMessageLe
			});
		}
		// Les prioritaires d'abord, puis l'ordre de l'index.
		return resultat.sort((a, b) => Number(b.prioritaire) - Number(a.prioritaire));
	}
});

export const conversation = equipeQuery('SUPPORT')({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.object({
		id: v.id('conversationsSupport'),
		etablissement: v.string(),
		organizationId: v.optional(v.id('organizations')),
		auteurNom: v.optional(v.string()),
		titre: v.string(),
		etat: vEtatConversation,
		raison: v.optional(vRaisonDePassage),
		acte: v.optional(vActe),
		sujet: v.optional(vSujet),
		depuis: v.optional(v.string()),
		assigneA: v.optional(v.string()),
		prioritaire: v.boolean(),
		verifiee: v.boolean(),
		reservee: v.boolean(),
		canal: vCanalSupport,
		passeeLe: v.optional(v.number()),
		termineeLe: v.optional(v.number()),
		issue: v.optional(vIssue),
		avis: v.optional(
			v.object({ utile: v.boolean(), motif: v.optional(v.string()), le: v.number() })
		),
		contexte: v.union(vContexteDuCompte, v.null()),
		messages: v.array(
			v.object({
				id: v.id('messagesSupport'),
				auteur: vAuteurSupport,
				auteurNom: v.optional(v.string()),
				canal: vCanalSupport,
				genre: vGenreMessage,
				texte: v.string(),
				phrases: v.optional(v.array(v.object({ texte: v.string(), source: vSourcePhrase }))),
				ecrans: v.optional(v.array(v.string())),
				evenement: v.optional(vEvenementSupport),
				avis: v.optional(v.union(v.literal('OUI'), v.literal('NON'))),
				retire: v.boolean(),
				retirePar: v.optional(v.string()),
				le: v.number()
			})
		),
		precedentes: v.array(
			v.object({
				id: v.id('conversationsSupport'),
				titre: v.string(),
				etat: vEtatConversation,
				dernierMessageLe: v.number()
			})
		)
	}),
	handler: async (ctx, { conversationId }) => {
		const c = await exigerConversation(ctx, conversationId, ctx.equipier);
		const messages = await ctx.db
			.query('messagesSupport')
			.withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
			.take(500);
		// Le contexte du compte n'est montré que pour un expéditeur prouvé.
		const contexte =
			c.organizationId !== undefined && c.auteurUserId !== undefined && c.verifiee
				? await lireContexteDuCompte(ctx, c.organizationId, c.auteurUserId)
				: null;
		const organizationId = c.organizationId;
		const precedentes =
			organizationId === undefined
				? []
				: (
						await ctx.db
							.query('conversationsSupport')
							.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
							.take(50)
					)
						.filter((autre) => autre._id !== c._id && visible(autre, ctx.equipier))
						.sort((a, b) => b.dernierMessageLe - a.dernierMessageLe)
						.slice(0, 5)
						.map((autre) => ({
							id: autre._id,
							titre: autre.titre,
							etat: autre.etat,
							dernierMessageLe: autre.dernierMessageLe
						}));
		return {
			id: c._id,
			etablissement: await nomDeLEtablissement(ctx, c),
			...(c.organizationId === undefined ? {} : { organizationId: c.organizationId }),
			...(c.auteurNom === undefined ? {} : { auteurNom: c.auteurNom }),
			titre: c.titre,
			etat: c.etat,
			...(c.raisonDePassage === undefined ? {} : { raison: c.raisonDePassage }),
			...(c.acte === undefined ? {} : { acte: c.acte }),
			...(c.sujet === undefined ? {} : { sujet: c.sujet }),
			...(c.depuis === undefined ? {} : { depuis: c.depuis }),
			...(c.assigneA === undefined ? {} : { assigneA: c.assigneA }),
			prioritaire: c.prioritaire === true,
			verifiee: c.verifiee,
			reservee: c.reserveeAuFondateur === true,
			canal: c.canal,
			...(c.passeeLe === undefined ? {} : { passeeLe: c.passeeLe }),
			...(c.termineeLe === undefined ? {} : { termineeLe: c.termineeLe }),
			...(c.issue === undefined ? {} : { issue: c.issue }),
			...(c.avis === undefined ? {} : { avis: c.avis }),
			contexte,
			messages: messages.map((m) => {
				const retire = m.retireLe !== undefined;
				return {
					id: m._id,
					auteur: m.auteur,
					...(m.auteurNom === undefined ? {} : { auteurNom: m.auteurNom }),
					canal: m.canal,
					genre: m.genre,
					texte: retire ? '' : m.texte,
					...(retire || m.phrases === undefined ? {} : { phrases: m.phrases }),
					...(retire || m.ecrans === undefined ? {} : { ecrans: m.ecrans }),
					...(m.evenement === undefined ? {} : { evenement: m.evenement }),
					...(m.avis === undefined ? {} : { avis: m.avis }),
					retire,
					...(m.retirePar === undefined ? {} : { retirePar: m.retirePar }),
					le: m.le
				};
			}),
			precedentes
		};
	}
});

/** Ouvrir une conversation : elle est lue, et l'ouverture s'inscrit au journal. */
export const ouvrir = equipeMutation('SUPPORT')({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.null(),
	handler: async (ctx, { conversationId }): Promise<null> => {
		const c = await exigerConversation(ctx, conversationId, ctx.equipier);
		await ctx.db.patch(conversationId, { luParEquipeLe: Date.now() });
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'CONVERSATION_OUVERTE',
			cible: {
				type: 'CONVERSATION',
				id: conversationId,
				libelle: c.verifiee ? await nomDeLEtablissement(ctx, c) : 'un expéditeur non vérifié'
			},
			...(c.organizationId === undefined ? {} : { organizationId: c.organizationId })
		});
		return null;
	}
});

/** Le prénom que voit le client : choisi par le membre, jamais son adresse. */
async function prenomAffiche(ctx: MutationCtx, equipier: Equipier): Promise<string> {
	const membre = await ctx.db
		.query('equipe')
		.withIndex('by_email', (q) => q.eq('email', equipier.email))
		.first();
	if (membre?.prenomAffiche === undefined) {
		throw new ConvexError('Posez d’abord le prénom que verront les clients, dans Équipe.');
	}
	return membre.prenomAffiche;
}

/**
 * RÉPONDRE AU GÉRANT — dans le fil, puis par e-mail s'il ne l'a pas lue dix minutes après.
 *
 * ⚠️ LES LIGNES ROUGES TIENNENT AUSSI POUR L'ÉQUIPE : le mot interdit et les verdicts ne
 * partent jamais ; un conseil ou une voie de justice partent après confirmation.
 */
export const repondre = equipeMutation('SUPPORT')({
	args: {
		conversationId: v.id('conversationsSupport'),
		texte: v.string(),
		terminer: v.boolean(),
		confirme: v.boolean()
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => repondreCommeEquipe(ctx, ctx.equipier, args)
});

/** Le cœur de `repondre`, sans la session : les tests l'appellent avec un équipier posé à la main. */
export async function repondreCommeEquipe(
	ctx: MutationCtx,
	equipier: Equipier,
	{
		conversationId,
		texte,
		terminer,
		confirme
	}: {
		readonly conversationId: Id<'conversationsSupport'>;
		readonly texte: string;
		readonly terminer: boolean;
		readonly confirme: boolean;
	}
): Promise<null> {
	const c = await exigerConversation(ctx, conversationId, equipier);
	const net = texte.trim();
	if (net === '') throw new ConvexError('Écrivez votre réponse.');
	const relecture = relireLeMessageDeLEquipe(net);
	if (relecture.refus !== null) throw new ConvexError(relecture.refus);
	if (relecture.avertissement !== null && !confirme) throw new ConvexError(relecture.avertissement);
	const prenom = await prenomAffiche(ctx, equipier);
	const maintenant = Date.now();

	if (c.repondantNom !== prenom) {
		await ajouterEvenement(
			ctx,
			c,
			'REJOINT',
			`${prenom}, de l’équipe Letikette, a rejoint la conversation`
		);
	}
	const messageId = await ajouterMessage(ctx, c, {
		auteur: 'EQUIPE',
		auteurUserId: equipier.userId,
		auteurNom: prenom,
		canal: 'APP',
		genre: 'MESSAGE',
		texte: net
	});
	const premiere = c.premiereReponseHumaineLe === undefined && c.passeeLe !== undefined;
	await ctx.db.patch(conversationId, {
		etat: terminer ? 'TERMINEE' : 'EN_ATTENTE_CLIENT',
		repondantNom: prenom,
		luParEquipeLe: maintenant,
		...(c.assigneA === undefined ? { assigneA: equipier.email } : {}),
		...(premiere
			? {
					premiereReponseHumaineLe: maintenant,
					premiereReponseOuvreeMin: Math.round(heuresOuvreesEntre(c.passeeLe!, maintenant) / 60_000)
				}
			: {}),
		...(terminer
			? {
					termineeLe: maintenant,
					issue: 'RESOLUE_PAR_EQUIPE' as const,
					resolutionOuvreeMin: Math.round(heuresOuvreesEntre(c.creeeLe, maintenant) / 60_000)
				}
			: {}),
		rappelLe: undefined
	});
	if (terminer) await ajouterEvenement(ctx, c, 'TERMINEE', 'Conversation terminée');

	if (c.organizationId !== undefined && c.auteurUserId !== undefined) {
		await ctx.db.insert('notifications', {
			organizationId: c.organizationId,
			userId: c.auteurUserId,
			type: 'HUMAN_ASSIST_REPLY',
			title: `${prenom} vous a répondu`,
			message: `Votre question : « ${c.titre} »`,
			link: `/app/aide/${conversationId}`,
			isRead: false,
			createdAt: maintenant
		});
		const depart = await ctx.scheduler.runAfter(
			10 * 60 * 1000,
			internal.support.emails.envoyerLaReponse,
			{ messageId }
		);
		await ctx.db.patch(messageId, { emailProgramme: depart });
	}
	return null;
}

/** Une note pour l'équipe seule : le gérant ne la lit jamais. */
export const noter = equipeMutation('SUPPORT')({
	args: { conversationId: v.id('conversationsSupport'), texte: v.string() },
	returns: v.null(),
	handler: async (ctx, { conversationId, texte }): Promise<null> => {
		const c = await exigerConversation(ctx, conversationId, ctx.equipier);
		const net = texte.trim();
		if (net === '') throw new ConvexError('Écrivez votre note.');
		await ajouterMessage(ctx, c, {
			auteur: 'EQUIPE',
			auteurUserId: ctx.equipier.userId,
			auteurNom: ctx.equipier.nom,
			canal: 'APP',
			genre: 'NOTE',
			texte: net
		});
		return null;
	}
});

export const regler = equipeMutation('SUPPORT')({
	args: {
		conversationId: v.id('conversationsSupport'),
		assigneA: v.optional(v.union(v.string(), v.null())),
		prioritaire: v.optional(v.boolean()),
		etat: v.optional(v.union(v.literal('TERMINEE'), v.literal('A_NOUS')))
	},
	returns: v.null(),
	handler: async (ctx, { conversationId, assigneA, prioritaire, etat }): Promise<null> => {
		const c = await exigerConversation(ctx, conversationId, ctx.equipier);
		await ctx.db.patch(conversationId, {
			...(assigneA === undefined ? {} : { assigneA: assigneA ?? undefined }),
			...(prioritaire === undefined ? {} : { prioritaire }),
			...(etat === 'TERMINEE'
				? {
						etat,
						termineeLe: Date.now(),
						issue:
							c.premiereReponseHumaineLe === undefined
								? ('SANS_NOUVELLES' as const)
								: ('RESOLUE_PAR_EQUIPE' as const),
						...(c.premiereReponseHumaineLe === undefined
							? {}
							: { resolutionOuvreeMin: Math.round(heuresOuvreesEntre(c.creeeLe, Date.now()) / 60_000) })
					}
				: etat === 'A_NOUS'
					? { etat, termineeLe: undefined, issue: undefined, passeeLe: Date.now() }
					: {})
		});
		if (etat === 'TERMINEE' && c.etat !== 'TERMINEE') {
			await ajouterEvenement(ctx, c, 'TERMINEE', 'Conversation terminée');
		} else if (etat === 'A_NOUS' && c.etat === 'TERMINEE') {
			await ajouterEvenement(ctx, c, 'ROUVERTE', 'Conversation rouverte');
		}
		return null;
	}
});

/** Retirer un contenu : il laisse sa trace (« Contenu retiré »), et le journal le garde. */
export const retirerContenu = equipeMutation('SUPPORT')({
	args: { messageId: v.id('messagesSupport') },
	returns: v.null(),
	handler: async (ctx, { messageId }): Promise<null> => {
		const message = await ctx.db.get(messageId);
		if (message === null) throw new ConvexError('Message introuvable.');
		const c = await exigerConversation(ctx, message.conversationId, ctx.equipier);
		await ctx.db.patch(messageId, {
			retireLe: Date.now(),
			retirePar: ctx.equipier.email,
			texte: '',
			texteEntier: undefined,
			phrases: undefined
		});
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'CONTENU_RETIRE',
			cible: { type: 'CONVERSATION', id: c._id, libelle: await nomDeLEtablissement(ctx, c) },
			...(c.organizationId === undefined ? {} : { organizationId: c.organizationId })
		});
		return null;
	}
});

/**
 * LE COUPE-CIRCUIT — sur la demande écrite d'un administrateur de l'établissement, dans
 * le fil. Les relances déjà programmées sont retenues aussi (`suspendreLesRelances`), le
 * gérant le lit dans son fil, et l'équipe ne réactive jamais : lui seul le fait.
 */
export const suspendreRelances = equipeMutation('SUPPORT')({
	args: { conversationId: v.id('conversationsSupport') },
	returns: v.number(),
	handler: async (ctx, { conversationId }): Promise<number> => {
		const c = await exigerConversation(ctx, conversationId, ctx.equipier);
		if (c.organizationId === undefined || c.auteurUserId === undefined || !c.verifiee) {
			throw new ConvexError('Seul un administrateur vérifié de l’établissement peut le demander.');
		}
		const organizationId = c.organizationId;
		const auteurUserId = c.auteurUserId;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', auteurUserId)
			)
			.first();
		if (membre?.role !== 'ORG_ADMIN') {
			throw new ConvexError('La demande ne vient pas d’un administrateur de l’établissement.');
		}
		const retenues = await suspendreLesRelances(ctx, organizationId);
		await ajouterEvenement(
			ctx,
			c,
			'RELANCES_SUSPENDUES',
			'L’équipe a coupé vos relances automatiques, à votre demande. Vous les rallumez depuis Aujourd’hui.'
		);
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'RELANCES_SUSPENDUES',
			cible: { type: 'CONVERSATION', id: c._id, libelle: await nomDeLEtablissement(ctx, c) },
			organizationId
		});
		return retenues;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// RÉPONSES ENREGISTRÉES, PRÉNOM AFFICHÉ, ABSENCE
// ─────────────────────────────────────────────────────────────────────────

export const reponses = equipeQuery('SUPPORT')({
	args: {},
	returns: v.array(
		v.object({
			id: v.id('reponsesEnregistrees'),
			titre: v.string(),
			texte: v.string(),
			sujet: v.optional(vSujet)
		})
	),
	handler: async (ctx) =>
		(await ctx.db.query('reponsesEnregistrees').withIndex('by_titre').take(200)).map((r) => ({
			id: r._id,
			titre: r.titre,
			texte: r.texte,
			...(r.sujet === undefined ? {} : { sujet: r.sujet })
		}))
});

export const enregistrerReponse = equipeMutation('SUPPORT')({
	args: {
		id: v.optional(v.id('reponsesEnregistrees')),
		titre: v.string(),
		texte: v.string(),
		sujet: v.optional(vSujet)
	},
	returns: v.null(),
	handler: async (ctx, { id, titre, texte, sujet }): Promise<null> => {
		const t = titre.trim();
		const corps = texte.trim();
		if (t === '' || corps === '') throw new ConvexError('Un titre et un texte.');
		const relecture = relireLeMessageDeLEquipe(corps);
		if (relecture.refus !== null) throw new ConvexError(relecture.refus);
		const maintenant = Date.now();
		if (id === undefined) {
			await ctx.db.insert('reponsesEnregistrees', {
				titre: t,
				texte: corps,
				...(sujet === undefined ? {} : { sujet }),
				creePar: ctx.equipier.email,
				creeLe: maintenant,
				majLe: maintenant
			});
		} else {
			await ctx.db.patch(id, { titre: t, texte: corps, sujet, majLe: maintenant });
		}
		return null;
	}
});

export const supprimerReponse = equipeMutation('SUPPORT')({
	args: { id: v.id('reponsesEnregistrees') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		await ctx.db.delete(id);
		return null;
	}
});

/** Mon prénom affiché, et ma photo si je l'ai posée. */
export const moi = equipeQuery('LECTURE')({
	args: {},
	returns: v.object({
		email: v.string(),
		prenomAffiche: v.union(v.string(), v.null()),
		absentJusquAu: v.union(v.number(), v.null())
	}),
	handler: async (ctx) => {
		const membre = await ctx.db
			.query('equipe')
			.withIndex('by_email', (q) => q.eq('email', ctx.equipier.email))
			.first();
		const reglages = await ctx.db.query('reglagesSupport').first();
		return {
			email: ctx.equipier.email,
			prenomAffiche: membre?.prenomAffiche ?? null,
			absentJusquAu: reglages?.absentJusquAu ?? null
		};
	}
});

export const poserPrenom = equipeMutation('LECTURE')({
	args: { prenom: v.string() },
	returns: v.null(),
	handler: async (ctx, { prenom }): Promise<null> => {
		const net = prenom.trim();
		if (net === '' || net.length > 30 || net.includes('@')) {
			throw new ConvexError('Un prénom, sans adresse : c’est ce que voient les clients.');
		}
		const membre = await ctx.db
			.query('equipe')
			.withIndex('by_email', (q) => q.eq('email', ctx.equipier.email))
			.first();
		if (membre === null) throw new ConvexError('Membre introuvable.');
		await ctx.db.patch(membre._id, { prenomAffiche: net });
		return null;
	}
});

/** « Équipe absente jusqu'au… » : le délai annoncé aux clients part de ce jour-là. */
export const poserAbsence = equipeMutation('FONDATEUR')({
	args: { jusquAu: v.union(v.number(), v.null()) },
	returns: v.null(),
	handler: async (ctx, { jusquAu }): Promise<null> => {
		const reglages = await ctx.db.query('reglagesSupport').first();
		const valeur = {
			absentJusquAu: jusquAu ?? undefined,
			majPar: ctx.equipier.email,
			majLe: Date.now()
		};
		if (reglages === null) await ctx.db.insert('reglagesSupport', valeur);
		else await ctx.db.patch(reglages._id, valeur);
		return null;
	}
});

// ─────────────────────────────────────────────────────────────────────────
// LA MESURE
// ─────────────────────────────────────────────────────────────────────────

const vEntonnoir = v.object({
	conversations: v.number(),
	resoluesParPlume: v.number(),
	passees: v.number(),
	resoluesParLEquipe: v.number(),
	sansNouvelles: v.number()
});

/**
 * LA MESURE, LUE DANS SON DOCUMENT MATÉRIALISÉ. Les titres de « ce que Plume n'a pas
 * su » se relisent en direct (le document n'en garde aucun) ; le rôle LECTURE n'en lit
 * que le sujet.
 */
export const mesure = equipeQuery('LECTURE')({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			calculeeLe: v.number(),
			entonnoir: vEntonnoir,
			precedent: vEntonnoir,
			medianes: v.object({
				premiereReponseH: v.union(v.number(), v.null()),
				resolutionH: v.union(v.number(), v.null()),
				reponses: v.number()
			}),
			tauxDeOuiPlume: v.union(v.number(), v.null()),
			satisfaction: v.union(v.number(), v.null()),
			parSujet: v.array(v.object({ sujet: vSujet, conversations: v.number(), passees: v.number() })),
			lacunes: v.array(
				v.object({
					id: v.id('conversationsSupport'),
					titre: v.string(),
					sujet: v.optional(vSujet),
					raison: v.union(v.literal('LACUNE'), v.literal('REFUS')),
					organizationId: v.optional(v.id('organizations'))
				})
			)
		})
	),
	handler: async (ctx) => {
		const document = await ctx.db.query('mesuresSupport').first();
		if (document === null) return null;
		const lecture = ctx.equipier.role === 'LECTURE';
		const lacunes = [];
		for (const lacune of document.lacunes) {
			const c = await ctx.db.get(lacune.id);
			if (c === null || !visible(c, ctx.equipier)) continue;
			lacunes.push({
				id: lacune.id,
				titre: lecture ? (c.sujet === undefined ? 'Question' : LIBELLES_DES_SUJETS[c.sujet]) : c.titre,
				...(lacune.sujet === undefined ? {} : { sujet: lacune.sujet }),
				raison: lacune.raison,
				...(c.organizationId === undefined ? {} : { organizationId: c.organizationId })
			});
		}
		return {
			calculeeLe: document.calculeeLe,
			entonnoir: document.entonnoir,
			precedent: document.precedent,
			medianes: document.medianes,
			tauxDeOuiPlume: document.tauxDeOuiPlume,
			satisfaction: document.satisfaction,
			parSujet: document.parSujet,
			lacunes
		};
	}
});
