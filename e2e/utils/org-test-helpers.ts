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
	const res = await page.request.post('/api/auth/sign-in/email', {
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

/**
 * Fill the onboarding form and submit. Waits for the /admin redirect.
 * Returns the org name that was used.
 */
export async function completeOnboardingForm(page: Page, orgName: string): Promise<void> {
	await page.getByTestId('org-name-input').fill(orgName);
	await page.getByTestId('onboarding-submit').click();
	await page.waitForURL(/\/admin/, { timeout: 15_000 });
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

	const context = await browser.newContext();
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
