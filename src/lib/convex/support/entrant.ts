import { v } from 'convex/values';
import { internalMutation, internalQuery, type MutationCtx } from '../_generated/server';
import { components, internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { resend } from '../emails/resend';
import { htmlEnTexte, retirerCitation } from '../../support/citation';
import { titreDe } from '../../support/conversation';
import { masquerDonneesSensibles } from '../../support/masquage';
import { demandeDActe } from '../../support/passage';
import { acteReserveAuFondateur, SUJET_DE_L_ACTE } from '../../support/sujets';
import {
	adresseLue,
	classerEntrant,
	dmarcPasse,
	estReponseAutomatique,
	toutEchoue,
	type ExpediteurConnu
} from '../../support/tri-entrant';
import { ajouterMessage, passerALEquipe } from './commun';
import { envoiPossible } from './emails';

/**
 * LE TRI D'UN E-MAIL ENTRANT, ÉCRIT (16/10/2026, spec § 5.2). La décision vient de
 * `support/tri-entrant.ts` ; ce module lit ce que la décision demande (qui est
 * l'expéditeur, à quoi répond le jeton) et l'applique.
 */

const ESSAIS_MAX = 5;
const SEPT_JOURS = 7 * 24 * 60 * 60 * 1000;

export const enregistrer = internalMutation({
	args: { emailId: v.string(), de: v.optional(v.string()), objet: v.optional(v.string()) },
	returns: v.null(),
	handler: async (ctx, { emailId, de, objet }): Promise<null> => {
		const deja = await ctx.db
			.query('emailsEntrants')
			.withIndex('by_email_id', (q) => q.eq('emailId', emailId))
			.first();
		if (deja !== null) return null;
		const id = await ctx.db.insert('emailsEntrants', {
			emailId,
			etat: 'A_LIRE',
			essais: 0,
			...(de === undefined ? {} : { de }),
			...(objet === undefined ? {} : { objet }),
			recuLe: Date.now()
		});
		await ctx.scheduler.runAfter(0, internal.support.entrantLecture.lire, { id });
		return null;
	}
});

export const ligne = internalQuery({
	args: { id: v.id('emailsEntrants') },
	returns: v.union(
		v.null(),
		v.object({
			emailId: v.string(),
			etat: v.string(),
			de: v.optional(v.string()),
			objet: v.optional(v.string())
		})
	),
	handler: async (ctx, { id }) => {
		const l = await ctx.db.get(id);
		if (l === null) return null;
		return {
			emailId: l.emailId,
			etat: l.etat,
			...(l.de === undefined ? {} : { de: l.de }),
			...(l.objet === undefined ? {} : { objet: l.objet })
		};
	}
});

/** Une lecture qui échoue : elle se reprend plus tard, cinq fois, puis s'arrête en `ECHEC`. */
export const echec = internalMutation({
	args: { id: v.id('emailsEntrants') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		const l = await ctx.db.get(id);
		if (l === null || l.etat !== 'A_LIRE') return null;
		const essais = l.essais + 1;
		await ctx.db.patch(id, {
			essais,
			...(essais >= ESSAIS_MAX
				? { etat: 'ECHEC' as const, prochainEssaiLe: undefined }
				: { prochainEssaiLe: Date.now() + 2 ** essais * 5 * 60 * 1000 })
		});
		return null;
	}
});

function adresseNue(brute: string): string {
	return (/<([^>]+)>/.exec(brute)?.[1] ?? brute).trim().toLowerCase();
}

/** Ce que l'expéditeur est pour nous : un titulaire (vérifié ou non), un prospect, un inconnu. */
async function quiEcrit(
	ctx: MutationCtx,
	adresse: string
): Promise<{ genre: ExpediteurConnu; userId?: string; nom?: string; prospectId?: Id<'prospects'> }> {
	// Un compte introuvable, ou l'annuaire des comptes injoignable, vaut « pas un titulaire » :
	// le doute ne fait jamais entrer un e-mail dans le fil d'un gérant.
	type CompteLu = { _id?: string; name?: string; emailVerified?: boolean } | null;
	let utilisateur: CompteLu = null;
	try {
		utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: 'email', operator: 'eq', value: adresse }]
		})) as CompteLu;
	} catch {
		utilisateur = null;
	}
	if (utilisateur?._id !== undefined) {
		const userId = utilisateur._id;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.first();
		if (membre !== null) {
			return {
				genre: utilisateur.emailVerified === true ? 'TITULAIRE_VERIFIE' : 'TITULAIRE_NON_VERIFIE',
				userId,
				...(utilisateur.name === undefined ? {} : { nom: utilisateur.name })
			};
		}
	}
	const prospect = await ctx.db
		.query('prospects')
		.withIndex('by_email', (q) => q.eq('email', adresse))
		.first();
	if (prospect !== null) return { genre: 'PROSPECT', prospectId: prospect._id };
	return { genre: 'INCONNU' };
}

/** L'accusé d'un e-mail entré, une fois par conversation, marqué automatique. */
async function accuserReception(
	ctx: MutationCtx,
	conversation: Doc<'conversationsSupport'>,
	adresse: string
): Promise<void> {
	const envoi = envoiPossible();
	if (envoi === null) return;
	await resend.sendEmail(ctx, {
		from: envoi.expediteur,
		to: adresse,
		subject: `Bien reçu : ${conversation.titre}`,
		text: `Votre message est bien arrivé à l’équipe Letikette. Elle vous répond en semaine, de 9 h à 18 h, par e-mail et dans l’application : ${envoi.site}/app/aide/${conversation._id}\n\nCe message est envoyé automatiquement.`,
		headers: [{ name: 'Auto-Submitted', value: 'auto-replied' }]
	});
}

export const trier = internalMutation({
	args: {
		id: v.id('emailsEntrants'),
		de: v.string(),
		destinataires: v.array(v.string()),
		objet: v.string(),
		texte: v.string(),
		html: v.string(),
		enTetes: v.record(v.string(), v.string()),
		authentification: v.record(v.string(), v.string())
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const ligneEntrante = await ctx.db.get(args.id);
		if (ligneEntrante === null || ligneEntrante.etat !== 'A_LIRE') return null;
		const domaine = process.env.SUPPORT_RECEPTION_DOMAINE ?? '';
		const adresse = adresseNue(args.de);
		const lue = adresseLue(args.destinataires, domaine);
		const qui = await quiEcrit(ctx, adresse);
		const conversationDuJeton =
			lue?.genre === 'FIL'
				? await ctx.db
						.query('conversationsSupport')
						.withIndex('by_jeton', (q) => q.eq('jeton', lue.jeton))
						.first()
				: null;
		let jetonDeLAuteur = false;
		if (conversationDuJeton !== null && qui.userId !== undefined) {
			if (conversationDuJeton.auteurUserId === qui.userId) jetonDeLAuteur = true;
			else if (conversationDuJeton.organizationId !== undefined) {
				const organizationId = conversationDuJeton.organizationId;
				const userId = qui.userId;
				const membre = await ctx.db
					.query('organizationMembers')
					.withIndex('by_org_and_user', (q) => q.eq('organizationId', organizationId).eq('userId', userId))
					.first();
				jetonDeLAuteur = membre?.role === 'ORG_ADMIN';
			}
		}
		const classement = classerEntrant({
			adresse: lue,
			automatique: estReponseAutomatique(args.enTetes),
			dmarc: dmarcPasse(args.authentification),
			toutEchoue: toutEchoue(args.authentification),
			expediteur: qui.genre,
			conversationDuJeton: conversationDuJeton !== null,
			jetonDeLAuteur
		});
		const resumeAuth = Object.entries(args.authentification)
			.map(([cle, valeur]) => `${cle} ${valeur}`)
			.join(', ');
		const marquer = async (
			etat: Doc<'emailsEntrants'>['etat'],
			plus: { conversationId?: Id<'conversationsSupport'>; organizationId?: Id<'organizations'> } = {}
		) => {
			await ctx.db.patch(args.id, {
				etat,
				classement,
				objet: args.objet,
				de: adresse,
				...(resumeAuth === '' ? {} : { authentification: resumeAuth }),
				prochainEssaiLe: undefined,
				...plus
			});
		};

		if (classement === 'IGNORE') return marquer('IGNORE').then(() => null);
		if (classement === 'INDESIRABLE') return marquer('INDESIRABLE').then(() => null);

		// Le texte : jamais le HTML stocké ; la citation coupée, l'entier gardé et plafonné ;
		// ce qui se détecte, masqué avant tout stockage.
		const brut = args.texte.trim() !== '' ? args.texte : htmlEnTexte(args.html);
		const { visible } = retirerCitation(brut);
		const { texte, masques } = masquerDonneesSensibles(visible);
		const entier = masquerDonneesSensibles(brut.slice(0, 100_000)).texte;
		const acte = demandeDActe(`${args.objet}\n${texte}`);
		const reserve = acte !== null && acteReserveAuFondateur(acte);

		if (classement === 'PROSPECT' && qui.prospectId !== undefined) {
			const opposition = /désinscri|ne plus (?:me )?(?:contacter|écrire)|\bstop\b|opposition/i.test(texte);
			await ctx.db.insert('evenementsCrm', {
				prospectId: qui.prospectId,
				type: 'REPONSE',
				texte: `${opposition ? 'Demande peut-être de ne plus être contacté. ' : ''}Réponse par e-mail : « ${args.objet || 'sans objet'} »`,
				auteur: 'e-mail',
				le: Date.now()
			});
			await ctx.db.patch(qui.prospectId, { statut: 'A_REPONDU', dernierContactLe: Date.now() });
			return marquer('LU').then(() => null);
		}

		const genreDuMessage: 'MESSAGE' | 'NON_VERIFIE' =
			classement === 'FIL_VERIFIE' || classement === 'NOUVELLE_VERIFIEE' ? 'MESSAGE' : 'NON_VERIFIE';
		const message = {
			auteur: 'GERANT' as const,
			...(qui.userId === undefined || genreDuMessage === 'NON_VERIFIE' ? {} : { auteurUserId: qui.userId }),
			auteurNom: genreDuMessage === 'MESSAGE' ? (qui.nom ?? adresse) : adresse,
			canal: 'EMAIL' as const,
			genre: genreDuMessage,
			texte: texte || '(message vide)',
			...(entier !== texte ? { texteEntier: entier } : {}),
			...(masques.length === 0 ? {} : { masques: [...masques] })
		};

		// Une réponse à un fil existant.
		if ((classement === 'FIL_VERIFIE' || classement === 'FIL_NON_VERIFIE') && conversationDuJeton !== null) {
			await ajouterMessage(ctx, conversationDuJeton, message);
			if (conversationDuJeton.etat !== 'A_NOUS') {
				await passerALEquipe(ctx, conversationDuJeton, {
					raison: 'EMAIL',
					...(acte === null ? {} : { acte })
				});
			}
			return marquer('LU', {
				conversationId: conversationDuJeton._id,
				...(conversationDuJeton.organizationId === undefined
					? {}
					: { organizationId: conversationDuJeton.organizationId })
			}).then(() => null);
		}

		// Un titulaire : sa conversation ouverte de moins de sept jours, sinon une nouvelle.
		let organizationId: Id<'organizations'> | undefined;
		if (qui.userId !== undefined) {
			const userId = qui.userId;
			organizationId = (
				await ctx.db
					.query('organizationMembers')
					.withIndex('by_user', (q) => q.eq('userId', userId))
					.first()
			)?.organizationId;
		}
		const verifiee = classement === 'NOUVELLE_VERIFIEE';
		let conversation: Doc<'conversationsSupport'> | null = null;
		if (verifiee && qui.userId !== undefined) {
			const userId = qui.userId;
			conversation =
				(
					await ctx.db
						.query('conversationsSupport')
						.withIndex('by_auteur', (q) => q.eq('auteurUserId', userId))
						.order('desc')
						.take(10)
				).find(
					(c) => c.etat !== 'TERMINEE' && c.verifiee && Date.now() - c.dernierMessageLe < SEPT_JOURS
				) ?? null;
		}
		const nouvelle = conversation === null;
		if (conversation === null) {
			const maintenant = Date.now();
			const id = await ctx.db.insert('conversationsSupport', {
				...(classement === 'A_TRIER' || organizationId === undefined ? {} : { organizationId }),
				...(verifiee && qui.userId !== undefined ? { auteurUserId: qui.userId } : {}),
				...(qui.nom === undefined ? {} : { auteurNom: qui.nom }),
				adresse,
				canal: 'EMAIL',
				etat: 'PLUME',
				titre: titreDe(args.objet || texte),
				verifiee,
				jeton: crypto.randomUUID().replace(/-/g, ''),
				dernierMessageLe: maintenant,
				dernierMessagePar: 'GERANT',
				nonsConsecutifs: 0,
				// Un inconnu, ou ce qui touche aux données et à un compte compromis : au fondateur.
				...(classement === 'A_TRIER' || reserve ? { reserveeAuFondateur: true } : {}),
				...(acte === null ? {} : { acte, sujet: SUJET_DE_L_ACTE[acte] }),
				creeeLe: maintenant
			});
			conversation = (await ctx.db.get(id))!;
		}
		await ajouterMessage(ctx, conversation, message);
		if (conversation.etat !== 'A_NOUS') {
			await passerALEquipe(ctx, conversation, { raison: 'EMAIL', ...(acte === null ? {} : { acte }) });
		}
		if (nouvelle && verifiee) await accuserReception(ctx, conversation, adresse);
		return marquer('LU', {
			conversationId: conversation._id,
			...(conversation.organizationId === undefined ? {} : { organizationId: conversation.organizationId })
		}).then(() => null);
	}
});
