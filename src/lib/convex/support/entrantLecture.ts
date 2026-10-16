import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';

/**
 * LIRE UN E-MAIL ENTRANT CHEZ RESEND (16/10/2026). Le webhook ne porte que des
 * métadonnées ; le texte, les en-têtes et l'authentification (SPF, DKIM, DMARC calculés
 * à la réception, que l'expéditeur ne peut pas forger) se lisent ici. Un échec laisse la
 * ligne en reprise : l'entretien la relance, cinq essais, puis `ECHEC`.
 */

/** Les seuls en-têtes gardés : ceux qui servent à trier. */
const EN_TETES_UTILES = [
	'message-id',
	'in-reply-to',
	'references',
	'auto-submitted',
	'x-autoreply',
	'x-autorespond',
	'precedence'
];

export const lire = internalAction({
	args: { id: v.id('emailsEntrants') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		const ligne = await ctx.runQuery(internal.support.entrant.ligne, { id });
		if (ligne === null || ligne.etat !== 'A_LIRE') return null;
		const cle = process.env.RESEND_API_KEY;
		if (!cle) {
			await ctx.runMutation(internal.support.entrant.echec, { id });
			return null;
		}
		let reponse: Response;
		try {
			reponse = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(ligne.emailId)}`, {
				headers: { Authorization: `Bearer ${cle}` }
			});
		} catch {
			await ctx.runMutation(internal.support.entrant.echec, { id });
			return null;
		}
		if (!reponse.ok) {
			await ctx.runMutation(internal.support.entrant.echec, { id });
			return null;
		}
		const message = (await reponse.json()) as {
			from?: unknown;
			to?: unknown;
			subject?: unknown;
			text?: unknown;
			html?: unknown;
			headers?: unknown;
			authentication?: unknown;
		};
		const enTetes: Record<string, string> = {};
		if (typeof message.headers === 'object' && message.headers !== null) {
			for (const [nom, valeur] of Object.entries(message.headers as Record<string, unknown>)) {
				const cleBasse = nom.toLowerCase();
				if (EN_TETES_UTILES.includes(cleBasse) && typeof valeur === 'string') {
					enTetes[cleBasse] = valeur.slice(0, 1000);
				}
			}
		}
		const authentification: Record<string, string> = {};
		if (typeof message.authentication === 'object' && message.authentication !== null) {
			for (const [nom, valeur] of Object.entries(message.authentication as Record<string, unknown>)) {
				const lu =
					typeof valeur === 'string'
						? valeur
						: typeof valeur === 'object' && valeur !== null
							? String(
									(valeur as Record<string, unknown>).result ??
										(valeur as Record<string, unknown>).status ??
										''
								)
							: '';
				if (lu !== '') authentification[nom.toLowerCase()] = lu.slice(0, 40);
			}
		}
		await ctx.runMutation(internal.support.entrant.trier, {
			id,
			de: typeof message.from === 'string' ? message.from.slice(0, 320) : (ligne.de ?? ''),
			destinataires: Array.isArray(message.to)
				? message.to.filter((a): a is string => typeof a === 'string').slice(0, 20)
				: [],
			objet: typeof message.subject === 'string' ? message.subject.slice(0, 300) : (ligne.objet ?? ''),
			texte: typeof message.text === 'string' ? message.text.slice(0, 100_000) : '',
			html: typeof message.html === 'string' ? message.html.slice(0, 300_000) : '',
			enTetes,
			authentification
		});
		return null;
	}
});
