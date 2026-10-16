import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { signatureSvixValide } from '../../support/svix';
import { laReceptionEstOuverte } from './commun';

/**
 * `POST /resend/reception` — LE WEBHOOK `email.received` DE RESEND (16/10/2026, spec § 5.2).
 *
 * ⚠️ FERMÉE, ELLE RÉPOND 200 SANS RIEN TRAITER : tant que les relances partent du domaine
 * de Letikette, une réponse de débiteur arriverait à l'équipe (ligne rouge n° 1). Ouverte,
 * elle vérifie la signature Svix sur le corps BRUT, inscrit l'e-mail une fois (par son
 * `email_id`), répond vite, et une action lit le contenu ensuite : Resend relance une
 * livraison qui tarde, pas Convex.
 */
export const recevoir = httpAction(async (ctx, requete) => {
	if (!laReceptionEstOuverte()) return new Response('fermée', { status: 200 });
	const corps = await requete.text();
	const valide = await signatureSvixValide({
		secret: process.env.RESEND_RECEPTION_WEBHOOK_SECRET ?? '',
		id: requete.headers.get('svix-id'),
		timestamp: requete.headers.get('svix-timestamp'),
		signatures: requete.headers.get('svix-signature'),
		corps
	});
	if (!valide) return new Response(null, { status: 401 });

	let evenement: { type?: unknown; data?: { email_id?: unknown; from?: unknown; subject?: unknown } };
	try {
		evenement = JSON.parse(corps) as typeof evenement;
	} catch {
		return new Response(null, { status: 400 });
	}
	if (evenement.type !== 'email.received' || typeof evenement.data?.email_id !== 'string') {
		return new Response(null, { status: 200 });
	}
	await ctx.runMutation(internal.support.entrant.enregistrer, {
		emailId: evenement.data.email_id,
		...(typeof evenement.data.from === 'string' ? { de: evenement.data.from.slice(0, 320) } : {}),
		...(typeof evenement.data.subject === 'string' ? { objet: evenement.data.subject.slice(0, 300) } : {})
	});
	return new Response(null, { status: 200 });
});
