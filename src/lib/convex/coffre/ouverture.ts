import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { ouvrirLesOctets } from './serrure';

/**
 * L'OUVERTURE D'UN DOCUMENT DU COFFRE — POST `/coffre/ouvrir`, le jeton dans le
 * corps (12/10/2026).
 *
 * ⚠️ LE JETON VOYAGE DANS LE CORPS, PAS DANS L'ADRESSE. Une adresse se retrouve
 * dans un historique, un journal de serveur, une capture ; un corps de requête
 * non. Et un corps en `text/plain` ne déclenche pas de requête préalable : la
 * réponse n'a qu'à autoriser l'origine de l'application.
 *
 * Le jeton se consomme AVANT tout le reste (une seule fois, une minute) ; le
 * document se déchiffre en mémoire, son empreinte se revérifie, et il part avec
 * `Cache-Control: no-store` : ni le navigateur ni un intermédiaire ne le gardent.
 */

function enTetesDOrigine(): Record<string, string> {
	const site = process.env.SITE_URL;
	if (site === undefined) return {};
	try {
		return { 'Access-Control-Allow-Origin': new URL(site).origin, Vary: 'Origin' };
	} catch {
		return {};
	}
}

function refus(statut: number, message: string): Response {
	return new Response(message, {
		status: statut,
		headers: {
			...enTetesDOrigine(),
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	});
}

export const ouvrirDocument = httpAction(async (ctx, requete) => {
	const jeton = (await requete.text()).trim();
	if (!/^[0-9a-f]{64}$/.test(jeton)) return refus(400, 'Jeton d’ouverture illisible.');

	const document = await ctx.runMutation(internal.coffre.coffreInterne.consommerTicket, {
		jeton,
		maintenant: Date.now()
	});
	if (document === null) {
		return refus(
			410,
			'Ce lien d’ouverture a expiré ou a déjà servi. Rouvrez le document depuis le coffre.'
		);
	}

	const blob = await ctx.storage.get(document.storageId);
	if (blob === null) return refus(404, 'Le fichier de ce document est introuvable.');

	let octets = new Uint8Array(await blob.arrayBuffer());
	if (document.chiffrement !== undefined) {
		try {
			octets = await ouvrirLesOctets(ctx, {
				organizationId: document.organizationId,
				chiffre: octets,
				chiffrement: document.chiffrement,
				...(document.empreinte === undefined ? {} : { empreinte: document.empreinte })
			});
		} catch (erreur) {
			return refus(500, erreur instanceof Error ? erreur.message : 'Ce document ne s’ouvre pas.');
		}
	}

	const disposition = document.geste === 'TELECHARGEMENT' ? 'attachment' : 'inline';
	return new Response(octets, {
		status: 200,
		headers: {
			...enTetesDOrigine(),
			'Content-Type': document.mime,
			'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(document.nom)}`,
			'Cache-Control': 'no-store, private',
			'X-Content-Type-Options': 'nosniff',
			'Access-Control-Expose-Headers': 'Content-Disposition'
		}
	});
});
