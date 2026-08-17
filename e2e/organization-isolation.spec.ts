/**
 * organization-isolation.spec.ts
 *
 * Verifies the multi-tenant isolation guarantee: a user in org A must never
 * see data that belongs to org B.
 *
 * Each test creates two fresh users in two separate BrowserContexts so
 * session cookies can never bleed between them.
 *
 * Endpoints tested:
 *   1. /app/parametres — org name shown in Card.Title
 *   2. /app             — org name shown in the sidebar switcher
 */

import { test, expect, chromium, type Browser } from '@playwright/test';
import { createIsolatedUserWithOrg, deleteUserSafe } from './utils/org-test-helpers';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

test.describe('Multi-tenant data isolation', () => {
	let browser: Browser;

	test.beforeAll(async () => {
		browser = await chromium.launch();
	});

	test.afterAll(async () => {
		await browser.close();
	});

	// -----------------------------------------------------------------------
	// Isolation on /app/parametres
	// -----------------------------------------------------------------------
	test('user A cannot see org B name on the settings page', async () => {
		const { context: ctxA, orgName: orgAName, user: userA } = await createIsolatedUserWithOrg(
			browser,
			BASE_URL,
			'iso-set-a'
		);
		const { context: ctxB, orgName: orgBName, user: userB } = await createIsolatedUserWithOrg(
			browser,
			BASE_URL,
			'iso-set-b'
		);

		try {
			const pageA = await ctxA.newPage();
			await pageA.goto('/app/parametres');
			await pageA.waitForURL(/\/app\/parametres/);

			// org-settings-name is in Card.Title which shows the live org name.
			const orgTitle = pageA.getByTestId('org-settings-name');
			await expect(orgTitle).toBeVisible();
			await expect(orgTitle).toContainText(orgAName);
			await expect(pageA.getByText(orgBName)).not.toBeVisible();
		} finally {
			await ctxA.close();
			await ctxB.close();
			await deleteUserSafe(userA.email);
			await deleteUserSafe(userB.email);
		}
	});

	// -----------------------------------------------------------------------
	// Isolation on /app (sidebar org name)
	// -----------------------------------------------------------------------
	test('user B cannot see org A name on the app sidebar', async () => {
		const { context: ctxA, orgName: orgAName, user: userA } = await createIsolatedUserWithOrg(
			browser,
			BASE_URL,
			'iso-dash-a'
		);
		const { context: ctxB, orgName: orgBName, user: userB } = await createIsolatedUserWithOrg(
			browser,
			BASE_URL,
			'iso-dash-b'
		);

		try {
			const pageB = await ctxB.newPage();
			await pageB.goto('/app');
			await pageB.waitForURL(/\/app/);

			// The sidebar shows current-org-name for single-org users.
			const orgName = pageB.getByTestId('current-org-name');
			await expect(orgName).toBeVisible();
			await expect(orgName).toContainText(orgBName);
			await expect(pageB.getByText(orgAName)).not.toBeVisible();
		} finally {
			await ctxA.close();
			await ctxB.close();
			await deleteUserSafe(userA.email);
			await deleteUserSafe(userB.email);
		}
	});

	// -----------------------------------------------------------------------
	// Cross-check — both users see their own org simultaneously
	// -----------------------------------------------------------------------
	test('two users viewing their settings pages at the same time see only their own org', async () => {
		const { context: ctxA, orgName: orgAName, user: userA } = await createIsolatedUserWithOrg(
			browser,
			BASE_URL,
			'iso-both-a'
		);
		const { context: ctxB, orgName: orgBName, user: userB } = await createIsolatedUserWithOrg(
			browser,
			BASE_URL,
			'iso-both-b'
		);

		try {
			const pageA = await ctxA.newPage();
			const pageB = await ctxB.newPage();

			await Promise.all([
				pageA.goto('/app/parametres').then(() => pageA.waitForURL(/\/app\/parametres/)),
				pageB.goto('/app/parametres').then(() => pageB.waitForURL(/\/app\/parametres/))
			]);

			const nameInA = pageA.getByTestId('org-settings-name');
			const nameInB = pageB.getByTestId('org-settings-name');

			await Promise.all([expect(nameInA).toBeVisible(), expect(nameInB).toBeVisible()]);

			await expect(nameInA).toContainText(orgAName);
			await expect(nameInB).toContainText(orgBName);

			await expect(pageA.getByText(orgBName)).not.toBeVisible();
			await expect(pageB.getByText(orgAName)).not.toBeVisible();
		} finally {
			await ctxA.close();
			await ctxB.close();
			await deleteUserSafe(userA.email);
			await deleteUserSafe(userB.email);
		}
	});

	// -----------------------------------------------------------------------
	// Unauthenticated access redirects away from /app
	// -----------------------------------------------------------------------
	test('unauthenticated access to /app redirects to signin', async () => {
		const context = await browser.newContext(); // no cookies
		try {
			const page = await context.newPage();
			await page.goto('/app');

			// Must be redirected away from /app (to signin or onboarding).
			await page.waitForURL((url) => !url.pathname.includes('/app'), { timeout: 10_000 });
			await expect(page).not.toHaveURL(/\/app/);
		} finally {
			await context.close();
		}
	});
});
