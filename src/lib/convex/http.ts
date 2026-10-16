import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { authComponent, createAuth } from './auth';
import { resend } from './emails/resend';
import { webhookHandler as paddleWebhookHandler } from './paddle';
import { retourQonto, webhookQonto } from './connexions/qonto';
import { webhookNango } from './connexions/nango';
import { ouvrirDocument } from './coffre/ouverture';
import { desinscriptionConseils } from './croissance/conseils';

const http = httpRouter();

// Better Auth routes
authComponent.registerRoutes(http, createAuth);

// Resend webhook endpoint
// Configure this URL in your Resend dashboard: https://your-deployment.convex.site/resend-webhook
http.route({
	path: '/resend-webhook',
	method: 'POST',
	handler: httpAction(async (ctx, req) => {
		return await resend.handleResendEventWebhook(ctx, req);
	})
});

// Paddle webhook — https://your-deployment.convex.site/paddle-webhook
// Configure in Paddle Dashboard → Notifications
http.route({ path: '/paddle-webhook', method: 'POST', handler: paddleWebhookHandler });

// Retour OAuth de Qonto — à déclarer à l'identique sur https://developers.qonto.com :
// https://<deployment>.convex.site/qonto/retour
http.route({ path: '/qonto/retour', method: 'GET', handler: retourQonto });

// Webhooks Qonto (factures clients, retrait d'accès), signés en HMAC-SHA256.
http.route({ path: '/qonto/webhook', method: 'POST', handler: webhookQonto });

// Webhooks Nango (logiciel branché, accès renouvelé ou perdu), signés en HMAC-SHA256
// avec NANGO_WEBHOOK_SIGNING_KEY. À déclarer dans le tableau de bord de Nango
// (Environment Settings > Webhook URLs) : https://<deployment>.convex.site/nango/webhook
http.route({ path: '/nango/webhook', method: 'POST', handler: webhookNango });

// Le coffre : un document ne sort que par ici, contre un jeton d'une minute
// émis par `coffre/coffre.ts:ouvrirAuCoffre`. Voir `coffre/ouverture.ts`.
http.route({ path: '/coffre/ouvrir', method: 'POST', handler: ouvrirDocument });

// Les conseils de Plume se coupent ici : un GET montre la page, seul le POST
// désinscrit (les antivirus ouvrent les liens). Voir `croissance/conseils.ts`.
http.route({ path: '/conseils/desinscription', method: 'GET', handler: desinscriptionConseils });
http.route({ path: '/conseils/desinscription', method: 'POST', handler: desinscriptionConseils });

export default http;
