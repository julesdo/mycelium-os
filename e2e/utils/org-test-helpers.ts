/**
 * Helpers for organisation E2E tests.
 *
 * Creates throwaway users (email @e2e.example.com) that the global teardown
 * catches automatically. Each helper function is self-contained so tests stay
 * readable.
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../src/lib/convex/_generated/api';
import { resolveConvexUrl } from './convex-url';
import { resolveSiteUrl } from './site-url';
import type { Page, BrowserContext } from '@playwright/test';

const TEST_PASSWORD = 'TestPassword123!';

export interface FreshUser {
	email: string;
	password: string;
	name: string;
}

export function makeFreshUser(prefix = 'org'): FreshUser {
	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	return {
		email: `${prefix}-${id}@e2e.example.com`,
		password: TEST_PASSWORD,
		name: `Test ${prefix} ${id}`
	};
}

function convexClient(): ConvexHttpClient {
	const url = resolveConvexUrl();
	if (!url) throw new Error('[org-test-helpers] Convex URL not resolved — is the backend running?');
	return new ConvexHttpClient(url);
}

function testSecret(): string {
	const s = process.env.AUTH_E2E_TEST_SECRET;
	if (!s) throw new Error('[org-test-helpers] AUTH_E2E_TEST_SECRET not set');
	return s;
}

/**
 * Sign up a fresh user and immediately verify their email via the Convex test
 * API (bypasses the email flow). After this call the user can sign in.
 */
export async function signupAndVerify(baseUrl: string, user: FreshUser): Promise<void> {
	const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Origin: baseUrl },
		body: JSON.stringify({ email: user.email, password: user.password, name: user.name })
	});
	if (!res.ok) {
		throw new Error(`signup failed ${res.status}: ${await res.text()}`);
	}

	const result = await convexClient().mutation(api.tests.verifyTestUserEmail, {
		email: user.email,
		secret: testSecret()
	});
	if (!result.success) {
		throw new Error(`email verification failed: ${(result as { error?: string }).error}`);
	}
}

/**
 * Sign in an existing user via the Better Auth API within the given Playwright
 * page context. After this call page requests carry the session cookie.
 */
export async function signinViaApi(page: Page, user: FreshUser): Promise<void> {
	// `Origin` explicite : `page.request` n'en pose pas, et BetterAuth refuse la
	// requête avec un 403 « Missing or null Origin ». `signupAndVerify` juste
	// au-dessus le posait déjà ; l'oubli ici ne se voyait que sur ce chemin.
	// L'origine doit être celle que le backend a reçue comme SITE_URL, d'où la
	// résolution partagée plutôt qu'une valeur en dur.
	const origin = resolveSiteUrl();
	const res = await page.request.post(`${origin}/api/auth/sign-in/email`, {
		headers: { Origin: origin },
		data: { email: user.email, password: user.password }
	});
	if (!res.ok()) {
		throw new Error(`signin failed ${res.status()}: ${await res.text()}`);
	}
	// Reload so the session cookie is picked up by all subsequent navigation.
	await page.reload();
}

/**
 * Full setup: signup → verify email → sign in → land on onboarding.
 * Returns immediately after the page reaches /onboarding/organization.
 */
export async function setupFreshUserOnOnboarding(
	page: Page,
	user: FreshUser,
	baseUrl: string
): Promise<void> {
	await signupAndVerify(baseUrl, user);
	await signinViaApi(page, user);
	await page.goto('/onboarding/organization');
	await page.waitForURL(/\/onboarding\/organization/);
}

/** Mirrors the `etablissementTypes` options rendered by /onboarding/organization. */
const ETABLISSEMENT_TYPE_LABELS: Record<string, string> = {
	RIE: 'RIE — Restaurant inter-entreprises',
	CLINIQUE: 'Clinique / établissement de santé',
	EHPAD: 'EHPAD',
	CRECHE: 'Crèche',
	ECOLE_PRIVEE: 'École privée',
	AUTRE: 'Autre'
};

/**
 * Fill the single-step onboarding form (name, établissement type, couverts/jour,
 * optional SIRET) and submit. Waits for the /app redirect.
 */
export async function completeOnboardingForm(
	page: Page,
	orgName: string,
	options: { etablissementType?: string; couvertsJour?: number; siret?: string } = {}
): Promise<void> {
	const { etablissementType = 'RIE', couvertsJour = 120, siret } = options;

	await page.getByTestId('org-name-input').fill(orgName);

	await page.getByRole('combobox').click();
	await page.getByRole('option', { name: ETABLISSEMENT_TYPE_LABELS[etablissementType] }).click();

	await page.getByTestId('couverts-jour-input').fill(String(couvertsJour));

	if (siret) {
		await page.getByTestId('org-siret-input').fill(siret);
	}

	await page.getByTestId('onboarding-submit').click();
	await page.waitForURL(/\/app/, { timeout: 15_000 });
}

/**
 * Create a completely fresh user with their own org.
 * Uses a separate browser context so session cookies never leak to other users.
 * The caller is responsible for closing the returned context.
 */
export async function createIsolatedUserWithOrg(
	browser: import('@playwright/test').Browser,
	baseUrl: string,
	prefix: string
): Promise<{ context: BrowserContext; orgName: string; user: FreshUser }> {
	const user = makeFreshUser(prefix);
	const orgName = `OrgOf-${prefix}-${Date.now()}`;

	// baseURL sur le contexte : un contexte cree a la main n'herite PAS des
	// options `use` de la config, et tous les page.goto() relatifs du parcours
	// (/onboarding/organization, /app/...) echouent sans lui.
	const context = await browser.newContext({ baseURL: baseUrl });
	const page = await context.newPage();

	await setupFreshUserOnOnboarding(page, user, baseUrl);
	await completeOnboardingForm(page, orgName);

	return { context, orgName, user };
}

/** Best-effort cleanup — called in afterEach/afterAll. Never throws. */
export async function deleteUserSafe(email: string): Promise<void> {
	try {
		await convexClient().mutation(api.tests.deleteTestUser, {
			email,
			secret: testSecret()
		});
	} catch {
		// Best effort — global teardown will pick up @e2e.example.com users anyway.
	}
}
