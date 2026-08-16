import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { authComponent, createAuth } from './auth';
import { resend } from './emails/resend';
import { webhookHandler as paddleWebhookHandler } from './paddle';

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

export default http;
