import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import type { ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { CID_DU_LOGO, relanceHtml } from '../../verticales/recouvrement/courriel-relance';
import { expediteurPour, NOM_DE_L_ETAPE } from './pilote';

/**
 * L'EXPÉDITION D'UNE RELANCE — par l'API de Resend, son logo DANS l'e-mail (23/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI PLUS LE COMPOSANT RESEND
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le composant envoie par LOTS, et l'API de Resend n'accepte aucune pièce jointe
 * sur un lot. Or le logo du gérant doit voyager dans l'e-mail (`cid:`) : hébergé,
 * il deviendrait une image qu'on charge à l'ouverture — un pixel en puissance, et
 * le cadre vide d'Outlook tant qu'on n'a pas cliqué « afficher les images ». La
 * relance part donc d'ici, une à une, et ce que le composant faisait pour elle se
 * fait ici :
 *
 * - UNE MÊME RELANCE NE PART QU'UNE FOIS : la clé d'idempotence la nomme, et
 *   Resend ignore un second envoi sous la même clé ;
 * - UNE PANNE PASSAGÈRE (429, 5xx, réseau) SE RÉESSAIE, de plus en plus loin,
 *   quatre fois au plus ;
 * - UN REFUS DÉFINITIF SE DIT. La relance redevient un courrier à valider, comme
 *   quand l'envoi n'est pas configuré, et le gérant reçoit l'avis qui y mène. Un
 *   échec tu laisserait le plan croire la relance partie.
 *
 * Les autres e-mails (compte, Plume, équipe) restent au composant : aucun ne porte
 * de pièce jointe.
 */

const URL_RESEND = 'https://api.resend.com/emails';

/** Le délai avant la tentative suivante, en millisecondes : 30 s, 2 min, 10 min. */
const REPRISES_MS = [30_000, 120_000, 600_000] as const;

/** Une pièce jointe au format de l'API de Resend. */
export interface PieceJointe {
	readonly filename: string;
	readonly content: string;
	readonly content_type: string;
	readonly content_id: string;
}

export type ReponseDeResend =
	| { readonly ok: true }
	| { readonly ok: false; readonly definitif: boolean; readonly raison: string };

function enBase64(octets: Uint8Array): string {
	let binaire = '';
	for (let i = 0; i < octets.length; i += 0x8000) {
		binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
	}
	return btoa(binaire);
}

/** Les huit premiers octets de tout fichier PNG. */
const SIGNATURE_PNG = [137, 80, 78, 71, 13, 10, 26, 10] as const;

/**
 * Le logo, lu au stockage et prêt à joindre ; rien quand il n'est pas posé, plus
 * là, ou pas un PNG. L'écran prépare toujours un PNG : un autre fichier n'arrive
 * que d'un client qui l'a contourné, et la lettre part alors avec le nom en tête,
 * comme sans logo.
 */
export async function piecesDuLogo(
	ctx: ActionCtx,
	logo: { readonly storageId: Id<'_storage'> } | null
): Promise<PieceJointe[]> {
	if (logo === null) return [];
	const fichier = await ctx.storage.get(logo.storageId);
	if (fichier === null) return [];
	const octets = new Uint8Array(await fichier.arrayBuffer());
	if (!SIGNATURE_PNG.every((octet, i) => octets[i] === octet)) return [];
	return [
		{
			filename: 'logo.png',
			content: enBase64(octets),
			content_type: 'image/png',
			content_id: CID_DU_LOGO
		}
	];
}

/** Ce que Resend dit d'un refus, en une phrase lisible par le gérant. */
async function raisonDuRefus(reponse: Response): Promise<string> {
	try {
		const corps = (await reponse.json()) as { message?: unknown };
		if (typeof corps.message === 'string' && corps.message !== '') {
			return `le service d’envoi l’a refusé (« ${corps.message} »).`;
		}
	} catch {
		// Un corps illisible : le code suffit.
	}
	return `le service d’envoi a répondu ${reponse.status}.`;
}

/** Un e-mail, posté à l'API de Resend sous une clé d'idempotence. */
export async function posterChezResend(
	courriel: Record<string, unknown>,
	cle: string
): Promise<ReponseDeResend> {
	const apiKey = process.env.RESEND_API_KEY;
	if (apiKey === undefined || apiKey === '') {
		return { ok: false, definitif: true, raison: 'l’envoi des e-mails n’est pas configuré.' };
	}
	let reponse: Response;
	try {
		reponse = await fetch(URL_RESEND, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'Idempotency-Key': cle
			},
			body: JSON.stringify(courriel)
		});
	} catch {
		return { ok: false, definitif: false, raison: 'le service d’envoi ne répond pas.' };
	}
	if (reponse.ok) return { ok: true };
	return {
		ok: false,
		definitif: !(reponse.status === 429 || reponse.status >= 500),
		raison: await raisonDuRefus(reponse)
	};
}

const vMessage = v.object({
	from: v.string(),
	to: v.string(),
	objet: v.string(),
	corps: v.string(),
	/** L'adresse où le client répond ; `null` si elle a disparu depuis la programmation. */
	repondreA: v.union(v.null(), v.string()),
	denomination: v.string(),
	logo: v.union(
		v.null(),
		v.object({ storageId: v.id('_storage'), largeur: v.number(), hauteur: v.number() })
	),
	couleur: v.union(v.null(), v.string())
});

/** Ce qui part : la relance telle que le pilote l'a marquée partie, et l'image du gérant. */
export const messageDeLEnvoi = internalQuery({
	args: { envoiId: v.id('envois') },
	returns: v.union(v.null(), vMessage),
	handler: async (ctx, { envoiId }) => {
		const envoi = await ctx.db.get(envoiId);
		if (envoi === null || envoi.etat !== 'PARTI') return null;
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', envoi.organizationId))
			.first();
		const organisation = await ctx.db.get(envoi.organizationId);
		const denomination = profil?.denomination ?? organisation?.name ?? '';
		return {
			from: expediteurPour(denomination),
			to: envoi.destinataire,
			objet: envoi.objet,
			corps: envoi.corps,
			repondreA: profil?.email === undefined || profil.email === '' ? null : profil.email,
			denomination,
			logo:
				profil?.logoCourriers === undefined
					? null
					: {
							storageId: profil.logoCourriers.storageId,
							largeur: profil.logoCourriers.largeur,
							hauteur: profil.logoCourriers.hauteur
						},
			couleur: profil?.couleurCourriers ?? null
		};
	}
});

export const expedier = internalAction({
	args: { envoiId: v.id('envois'), tentative: v.optional(v.number()) },
	returns: v.null(),
	handler: async (ctx, { envoiId, tentative = 1 }): Promise<null> => {
		const message = await ctx.runQuery(internal.recouvrement.expedition.messageDeLEnvoi, {
			envoiId
		});
		if (message === null) return null;
		if (message.repondreA === null) {
			await ctx.runMutation(internal.recouvrement.expedition.expeditionEchouee, {
				envoiId,
				raison: 'il manque votre adresse e-mail pour les réponses (Mon compte).'
			});
			return null;
		}
		const pieces = await piecesDuLogo(ctx, message.logo);
		const logo =
			message.logo !== null && pieces.length > 0
				? { src: `cid:${CID_DU_LOGO}`, largeur: message.logo.largeur, hauteur: message.logo.hauteur }
				: null;
		const reponse = await posterChezResend(
			{
				from: message.from,
				to: [message.to],
				subject: message.objet,
				text: message.corps,
				html: relanceHtml(message.corps, message.denomination, { logo, couleur: message.couleur }),
				reply_to: [message.repondreA],
				...(pieces.length > 0 ? { attachments: pieces } : {})
			},
			`relance-${envoiId}`
		);
		if (reponse.ok) return null;
		const delai = REPRISES_MS[tentative - 1];
		if (!reponse.definitif && delai !== undefined) {
			await ctx.scheduler.runAfter(delai, internal.recouvrement.expedition.expedier, {
				envoiId,
				tentative: tentative + 1
			});
			return null;
		}
		await ctx.runMutation(internal.recouvrement.expedition.expeditionEchouee, {
			envoiId,
			raison: reponse.raison
		});
		return null;
	}
});

/**
 * LA RELANCE N'EST PAS PARTIE : elle redevient un courrier à valider, et chaque
 * membre de l'établissement reçoit l'avis qui mène à sa relecture.
 */
export const expeditionEchouee = internalMutation({
	args: { envoiId: v.id('envois'), raison: v.string() },
	returns: v.null(),
	handler: async (ctx, { envoiId, raison }): Promise<null> => {
		const envoi = await ctx.db.get(envoiId);
		if (envoi === null || envoi.etat !== 'PARTI') return null;
		await ctx.db.patch(envoiId, {
			etat: 'A_VALIDER',
			partiLe: undefined,
			empreinte: undefined,
			validePar: undefined,
			valideLe: undefined
		});
		const creance = await ctx.db.get(envoi.creanceId);
		const debiteur = creance === null ? null : await ctx.db.get(creance.debiteurId);
		const nom = envoi.etapePlan === undefined ? 'la relance' : NOM_DE_L_ETAPE[envoi.etapePlan];
		const feminin = nom.startsWith('la ');
		const message = `${nom.charAt(0).toUpperCase()}${nom.slice(1)} pour ${debiteur?.denomination ?? 'ce client'} n’est pas ${feminin ? 'partie' : 'parti'} : ${raison} ${feminin ? 'Elle' : 'Il'} attend votre validation dans le dossier.`;
		const membres = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', envoi.organizationId))
			.collect();
		for (const membre of membres) {
			await ctx.runMutation(internal.notifications.createNotification, {
				organizationId: envoi.organizationId,
				userId: membre.userId,
				type: 'PILOTE_BLOQUE',
				title: 'Plume a besoin de vous',
				message,
				link: `/app/dossier/${envoi.creanceId}?faire=RELIRE&envoi=${envoiId}`
			});
		}
		return null;
	}
});
