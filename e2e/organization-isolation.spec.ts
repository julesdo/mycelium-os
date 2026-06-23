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
 *   1. /admin/settings/organization — org name shown in Card.Title
 *   2. /admin                       — org name shown in sidebar switcher
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
	// Isolation on /admin/settings/organization
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
			await pageA.goto('/admin/settings/organization');
			await pageA.waitForURL(/\/admin\/settings\/organization/);

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
	// Isolation on /admin dashboard (sidebar org name)
	// -----------------------------------------------------------------------
	test('user B cannot see org A name on the admin dashboard', async () => {
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
			await pageB.goto('/admin');
			await pageB.waitForURL(/\/admin/);

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
				pageA
					.goto('/admin/settings/organization')
					.then(() => pageA.waitForURL(/\/admin\/settings\/organization/)),
				pageB
					.goto('/admin/settings/organization')
					.then(() => pageB.waitForURL(/\/admin\/settings\/organization/))
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
	// Unauthenticated access redirects away from /admin
	// -----------------------------------------------------------------------
	test('unauthenticated access to /admin redirects to signin', async () => {
		const context = await browser.newContext(); // no cookies
		try {
			const page = await context.newPage();
			await page.goto('/admin');

			// Must be redirected away from /admin (to signin or onboarding).
			await page.waitForURL((url) => !url.pathname.includes('/admin'), { timeout: 10_000 });
			await expect(page).not.toHaveURL(/\/admin/);
		} finally {
			await context.close();
		}
	});
});
