import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { authComponent, createAuth } from './auth';
import { resend } from './emails/resend';
import { chat } from './agents/concierge';
import { chat as managerChat } from './agents/manager';
import { chat as complianceChat } from './agents/compliance';
import {
	listCostsHandler,
	createCostHandler,
	listVehiclesHandler,
	listExpensesHandler,
	listWebhooksHandler,
	createWebhookHandler
} from './integrations/publicApi';
import { webhookHandler as paddleWebhookHandler } from './paddle';
import { handleSmartcarWebhook } from './smartcar';

const http = httpRouter();

// Better Auth routes
authComponent.registerRoutes(http, createAuth);

// Resend webhook endpoint
// Configure this URL in your Resend dashboard: https://your-deployment.convex.site/resend-webhook
// This endpoint receives email events (delivered, bounced, complained, opened, clicked)
http.route({
	path: '/resend-webhook',
	method: 'POST',
	handler: httpAction(async (ctx, req) => {
		return await resend.handleResendEventWebhook(ctx, req);
	})
});

// Concierge AI streaming endpoint (SSE)
http.route({ path: '/api/concierge/chat', method: 'POST', handler: chat });
http.route({ path: '/api/concierge/chat', method: 'OPTIONS', handler: chat });

// Manager Agent streaming endpoint (SSE) — ORG_ADMIN/ORG_MANAGER only
http.route({ path: '/api/manager/chat', method: 'POST', handler: managerChat });
http.route({ path: '/api/manager/chat', method: 'OPTIONS', handler: managerChat });

// Compliance Officer streaming endpoint (SSE) — ORG_ADMIN/ORG_MANAGER only
http.route({ path: '/api/compliance/chat', method: 'POST', handler: complianceChat });
http.route({ path: '/api/compliance/chat', method: 'OPTIONS', handler: complianceChat });

// Paddle webhook — https://your-deployment.convex.site/paddle-webhook
// Configure in Paddle Dashboard → Notifications
http.route({ path: '/paddle-webhook', method: 'POST', handler: paddleWebhookHandler });

// Smartcar webhook — https://your-deployment.convex.site/smartcar-webhook
// Configure in Smartcar Dashboard → Webhooks → Callback URI
// For local dev: ngrok http {CONVEX_LOCAL_PORT} → use the ngrok HTTPS URL
http.route({ path: '/smartcar-webhook', method: 'POST', handler: handleSmartcarWebhook });

// Public API v1 — Bearer myc_live_xxx auth, scopée par organisation
http.route({ path: '/api/v1/costs', method: 'GET', handler: listCostsHandler });
http.route({ path: '/api/v1/costs', method: 'POST', handler: createCostHandler });
http.route({ path: '/api/v1/costs', method: 'OPTIONS', handler: listCostsHandler });
http.route({ path: '/api/v1/vehicles', method: 'GET', handler: listVehiclesHandler });
http.route({ path: '/api/v1/vehicles', method: 'OPTIONS', handler: listVehiclesHandler });
http.route({ path: '/api/v1/expenses', method: 'GET', handler: listExpensesHandler });
http.route({ path: '/api/v1/expenses', method: 'OPTIONS', handler: listExpensesHandler });
http.route({ path: '/api/v1/webhooks', method: 'GET', handler: listWebhooksHandler });
http.route({ path: '/api/v1/webhooks', method: 'POST', handler: createWebhookHandler });
http.route({ path: '/api/v1/webhooks', method: 'OPTIONS', handler: listWebhooksHandler });

export default http;
