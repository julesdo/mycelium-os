// Convex httpAction handlers for OAuth callbacks (Xero, QuickBooks)
// Registered in http.ts — all credentials come from Convex dashboard env vars

import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { xeroExchangeCode, xeroGetTenants } from './xeroConnector';
import { qbExchangeCode } from './quickbooksConnector';
import { faExchangeCode } from './freeagentConnector';
import { fxExchangeCode } from './fortnoxConnector';
import { vismaExchangeCode } from './vismaConnector';

async function encryptToken(plaintext: string, keyBase64: string): Promise<string> {
	const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(plaintext)
	);
	const combined = new Uint8Array(12 + ciphertext.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ciphertext), 12);
	return btoa(String.fromCharCode(...combined));
}

function siteUrl(): string {
	return process.env.SITE_URL ?? 'http://localhost:5173';
}

function errRedirect(provider: string, code: string): Response {
	return new Response(null, {
		status: 302,
		headers: {
			Location: `${siteUrl()}/admin/settings/integrations?error=${code}&provider=${provider}`
		}
	});
}

function okRedirect(provider: string): Response {
	return new Response(null, {
		status: 302,
		headers: { Location: `${siteUrl()}/admin/settings/integrations?connected=${provider}` }
	});
}

export const xeroCallbackHandler = httpAction(async (ctx, request) => {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (url.searchParams.get('error')) return errRedirect('xero', 'access_denied');
	if (!code || !state) return errRedirect('xero', 'invalid_state');

	const stateRecord = await ctx.runQuery(internal.integrations.accounting.lookupOAuthState, {
		state
	});
	if (!stateRecord) return errRedirect('xero', 'invalid_state');

	// Expire after 10 minutes
	if (Date.now() - stateRecord.createdAt > 10 * 60 * 1000) {
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('xero', 'invalid_state');
	}

	const clientId = process.env.XERO_CLIENT_ID;
	const clientSecret = process.env.XERO_CLIENT_SECRET;
	const encryptionKey = process.env.ACCOUNTING_ENCRYPTION_KEY;

	if (!clientId || !clientSecret || !encryptionKey) {
		return errRedirect('xero', 'not_configured');
	}

	const redirectUri = `${url.protocol}//${url.host}/xero/callback`;

	try {
		const tokens = await xeroExchangeCode(code, redirectUri, clientId, clientSecret);
		const tenants = await xeroGetTenants(tokens.access_token);
		const primary = tenants[0];
		if (!primary) {
			await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
				stateId: stateRecord._id
			});
			return errRedirect('xero', 'no_tenant');
		}

		const [encAccess, encRefresh] = await Promise.all([
			encryptToken(tokens.access_token, encryptionKey),
			encryptToken(tokens.refresh_token, encryptionKey)
		]);

		await ctx.runMutation(internal.integrations.accounting.connectWithOAuthInternal, {
			provider: 'xero',
			organizationId: stateRecord.organizationId,
			encryptedAccessToken: encAccess,
			encryptedRefreshToken: encRefresh,
			tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
			externalCompanyId: primary.tenantId,
			externalCompanyName: primary.tenantName,
			connectedByUserId: stateRecord.userId
		});

		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return okRedirect('xero');
	} catch (err) {
		console.error('[xero/callback]', err);
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('xero', 'token_exchange');
	}
});

export const freeagentCallbackHandler = httpAction(async (ctx, request) => {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (url.searchParams.get('error')) return errRedirect('freeagent', 'access_denied');
	if (!code || !state) return errRedirect('freeagent', 'invalid_state');

	const stateRecord = await ctx.runQuery(internal.integrations.accounting.lookupOAuthState, {
		state
	});
	if (!stateRecord) return errRedirect('freeagent', 'invalid_state');

	if (Date.now() - stateRecord.createdAt > 10 * 60 * 1000) {
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('freeagent', 'invalid_state');
	}

	const clientId = process.env.FA_CLIENT_ID;
	const clientSecret = process.env.FA_CLIENT_SECRET;
	const encryptionKey = process.env.ACCOUNTING_ENCRYPTION_KEY;

	if (!clientId || !clientSecret || !encryptionKey) {
		return errRedirect('freeagent', 'not_configured');
	}

	const redirectUri = `${url.protocol}//${url.host}/freeagent/callback`;

	try {
		const tokens = await faExchangeCode(code, redirectUri, clientId, clientSecret);

		const [encAccess, encRefresh] = await Promise.all([
			encryptToken(tokens.access_token, encryptionKey),
			encryptToken(tokens.refresh_token, encryptionKey)
		]);

		await ctx.runMutation(internal.integrations.accounting.connectWithOAuthInternal, {
			provider: 'freeagent',
			organizationId: stateRecord.organizationId,
			encryptedAccessToken: encAccess,
			encryptedRefreshToken: encRefresh,
			tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
			externalCompanyId: 'freeagent',
			connectedByUserId: stateRecord.userId
		});

		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return okRedirect('freeagent');
	} catch (err) {
		console.error('[freeagent/callback]', err);
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('freeagent', 'token_exchange');
	}
});

export const fortnoxCallbackHandler = httpAction(async (ctx, request) => {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (url.searchParams.get('error')) return errRedirect('fortnox', 'access_denied');
	if (!code || !state) return errRedirect('fortnox', 'invalid_state');

	const stateRecord = await ctx.runQuery(internal.integrations.accounting.lookupOAuthState, {
		state
	});
	if (!stateRecord) return errRedirect('fortnox', 'invalid_state');

	if (Date.now() - stateRecord.createdAt > 10 * 60 * 1000) {
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('fortnox', 'invalid_state');
	}

	const clientId = process.env.FX_CLIENT_ID;
	const clientSecret = process.env.FX_CLIENT_SECRET;
	const encryptionKey = process.env.ACCOUNTING_ENCRYPTION_KEY;

	if (!clientId || !clientSecret || !encryptionKey) {
		return errRedirect('fortnox', 'not_configured');
	}

	const redirectUri = `${url.protocol}//${url.host}/fortnox/callback`;

	try {
		const tokens = await fxExchangeCode(code, redirectUri, clientId, clientSecret);

		const [encAccess, encRefresh] = await Promise.all([
			encryptToken(tokens.access_token, encryptionKey),
			encryptToken(tokens.refresh_token, encryptionKey)
		]);

		await ctx.runMutation(internal.integrations.accounting.connectWithOAuthInternal, {
			provider: 'fortnox',
			organizationId: stateRecord.organizationId,
			encryptedAccessToken: encAccess,
			encryptedRefreshToken: encRefresh,
			tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
			externalCompanyId: 'fortnox',
			connectedByUserId: stateRecord.userId
		});

		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return okRedirect('fortnox');
	} catch (err) {
		console.error('[fortnox/callback]', err);
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('fortnox', 'token_exchange');
	}
});

export const vismaCallbackHandler = httpAction(async (ctx, request) => {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (url.searchParams.get('error')) return errRedirect('visma', 'access_denied');
	if (!code || !state) return errRedirect('visma', 'invalid_state');

	const stateRecord = await ctx.runQuery(internal.integrations.accounting.lookupOAuthState, {
		state
	});
	if (!stateRecord) return errRedirect('visma', 'invalid_state');

	if (Date.now() - stateRecord.createdAt > 10 * 60 * 1000) {
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('visma', 'invalid_state');
	}

	const clientId = process.env.VISMA_CLIENT_ID;
	const clientSecret = process.env.VISMA_CLIENT_SECRET;
	const encryptionKey = process.env.ACCOUNTING_ENCRYPTION_KEY;

	if (!clientId || !clientSecret || !encryptionKey) {
		return errRedirect('visma', 'not_configured');
	}

	const redirectUri = `${url.protocol}//${url.host}/visma/callback`;

	try {
		const tokens = await vismaExchangeCode(code, redirectUri, clientId, clientSecret);

		const [encAccess, encRefresh] = await Promise.all([
			encryptToken(tokens.access_token, encryptionKey),
			encryptToken(tokens.refresh_token, encryptionKey)
		]);

		await ctx.runMutation(internal.integrations.accounting.connectWithOAuthInternal, {
			provider: 'visma',
			organizationId: stateRecord.organizationId,
			encryptedAccessToken: encAccess,
			encryptedRefreshToken: encRefresh,
			tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
			externalCompanyId: 'visma',
			connectedByUserId: stateRecord.userId
		});

		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return okRedirect('visma');
	} catch (err) {
		console.error('[visma/callback]', err);
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('visma', 'token_exchange');
	}
});

export const quickbooksCallbackHandler = httpAction(async (ctx, request) => {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const realmId = url.searchParams.get('realmId');

	if (url.searchParams.get('error')) return errRedirect('quickbooks', 'access_denied');
	if (!code || !state || !realmId) return errRedirect('quickbooks', 'invalid_state');

	const stateRecord = await ctx.runQuery(internal.integrations.accounting.lookupOAuthState, {
		state
	});
	if (!stateRecord) return errRedirect('quickbooks', 'invalid_state');

	if (Date.now() - stateRecord.createdAt > 10 * 60 * 1000) {
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('quickbooks', 'invalid_state');
	}

	const clientId = process.env.QB_CLIENT_ID;
	const clientSecret = process.env.QB_CLIENT_SECRET;
	const encryptionKey = process.env.ACCOUNTING_ENCRYPTION_KEY;

	if (!clientId || !clientSecret || !encryptionKey) {
		return errRedirect('quickbooks', 'not_configured');
	}

	const redirectUri = `${url.protocol}//${url.host}/quickbooks/callback`;

	try {
		const tokens = await qbExchangeCode(code, redirectUri, clientId, clientSecret);

		const [encAccess, encRefresh] = await Promise.all([
			encryptToken(tokens.access_token, encryptionKey),
			encryptToken(tokens.refresh_token, encryptionKey)
		]);

		await ctx.runMutation(internal.integrations.accounting.connectWithOAuthInternal, {
			provider: 'quickbooks',
			organizationId: stateRecord.organizationId,
			encryptedAccessToken: encAccess,
			encryptedRefreshToken: encRefresh,
			tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
			externalCompanyId: realmId,
			externalCompanyName: `QuickBooks (${realmId})`,
			connectedByUserId: stateRecord.userId
		});

		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return okRedirect('quickbooks');
	} catch (err) {
		console.error('[quickbooks/callback]', err);
		await ctx.runMutation(internal.integrations.accounting.consumeOAuthState, {
			stateId: stateRecord._id
		});
		return errRedirect('quickbooks', 'token_exchange');
	}
});
