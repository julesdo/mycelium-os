/**
 * organization-switcher.spec.ts
 *
 * Verifies the org-switcher feature in the admin sidebar:
 *   - Trigger appears only when the user belongs to > 1 org
 *   - Clicking an entry switches the active org
 *   - The switch persists when navigating to other admin pages
 *
 * Each test creates a fresh user who first creates org A (via onboarding),
 * then creates org B (by calling /api/org/create which wraps the Convex
 * mutation), then switches between them via the sidebar UI.
 */

import { test, expect, type Page } from '@playwright/test';
import {
	makeFreshUser,
	setupFreshUserOnOnboarding,
	completeOnboardingForm,
	deleteUserSafe
} from './utils/org-test-helpers';

test.use({ storageState: { cookies: [], origins: [] } });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Helper — create a second org for an already-authenticated user
// ---------------------------------------------------------------------------

async function createSecondOrg(page: Page): Promise<string> {
	const orgName = `OrgB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

	// Use the thin API route created alongside these tests.
	const res = await page.request.post('/api/org/create', {
		data: { name: orgName }
	});

	if (!res.ok()) {
		throw new Error(`/api/org/create failed ${res.status()}: ${await res.text()}`);
	}

	return orgName;
}

// ---------------------------------------------------------------------------
// Helper — open the switcher and click the given org
// ---------------------------------------------------------------------------

async function switchToOrg(page: Page, targetOrgName: string): Promise<void> {
	const trigger = page.getByTestId('org-switcher-trigger');
	await expect(trigger).toBeVisible();
	await trigger.click();

	const menu = page.getByTestId('org-switcher-menu');
	await expect(menu).toBeVisible();

	const item = menu.locator(
		`[data-testid="org-switcher-item"][data-org-name="${targetOrgName}"]`
	);
	await expect(item).toBeVisible();
	await item.click();

	// The component calls window.location.reload() after a successful switch, so
	// wait for the navigation to settle.
	await page.waitForLoadState('domcontentloaded');
	await expect(page.getByTestId('current-org-name')).toContainText(targetOrgName, {
		timeout: 10_000
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Organisation switcher', () => {
	// -----------------------------------------------------------------------
	// Trigger visibility
	// -----------------------------------------------------------------------
	test('switcher trigger is NOT visible when user has only 1 org', async ({ page }) => {
		const user = makeFreshUser('sw-single');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);
		await completeOnboardingForm(page, `SingleOrg-${Date.now()}`);

		// Single org — the switcher must not render.
		await expect(page.getByTestId('org-switcher-trigger')).not.toBeVisible();

		await deleteUserSafe(user.email);
	});

	test('switcher trigger IS visible when user has 2 orgs', async ({ page }) => {
		const user = makeFreshUser('sw-visible');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);
		const orgAName = `OrgA-${Date.now()}`;
		await completeOnboardingForm(page, orgAName);

		await createSecondOrg(page);

		// Navigate to admin to refresh the sidebar.
		await page.goto('/admin');
		await page.waitForURL(/\/admin/);

		await expect(page.getByTestId('org-switcher-trigger')).toBeVisible();

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Happy path — switch from A to B
	// -----------------------------------------------------------------------
	test('switching to org B updates the org name in the sidebar', async ({ page }) => {
		const user = makeFreshUser('sw-switch');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);
		const orgAName = `OrgA-${Date.now()}`;
		await completeOnboardingForm(page, orgAName);

		const orgBName = await createSecondOrg(page);

		// Go to admin; after createSecondOrg we may already be there.
		await page.goto('/admin');
		await page.waitForURL(/\/admin/);

		// Start on org A (switch explicitly in case we landed on org B).
		if (!(await page.getByTestId('current-org-name').textContent())?.includes(orgAName)) {
			await switchToOrg(page, orgAName);
		}

		await expect(page.getByTestId('current-org-name')).toContainText(orgAName);

		// Switch to org B.
		await switchToOrg(page, orgBName);
		await expect(page.getByTestId('current-org-name')).toContainText(orgBName);
		await expect(page.getByTestId('current-org-name')).not.toContainText(orgAName);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Round-trip: A → B → A
	// -----------------------------------------------------------------------
	test('switching back to org A after visiting org B restores org A context', async ({
		page
	}) => {
		const user = makeFreshUser('sw-roundtrip');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);
		const orgAName = `OrgA-${Date.now()}`;
		await completeOnboardingForm(page, orgAName);

		const orgBName = await createSecondOrg(page);

		await page.goto('/admin');
		await page.waitForURL(/\/admin/);

		// Ensure we start on org A.
		if (!(await page.getByTestId('current-org-name').textContent())?.includes(orgAName)) {
			await switchToOrg(page, orgAName);
		}

		await switchToOrg(page, orgBName);
		await expect(page.getByTestId('current-org-name')).toContainText(orgBName);

		await switchToOrg(page, orgAName);
		await expect(page.getByTestId('current-org-name')).toContainText(orgAName);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Settings page reflects active org after switch
	// -----------------------------------------------------------------------
	test('settings page shows org B name after switching to org B', async ({ page }) => {
		const user = makeFreshUser('sw-settings');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);
		const orgAName = `OrgA-${Date.now()}`;
		await completeOnboardingForm(page, orgAName);

		const orgBName = await createSecondOrg(page);

		await page.goto('/admin');
		await page.waitForURL(/\/admin/);

		await switchToOrg(page, orgBName);

		await page.goto('/admin/settings/organization');
		await page.waitForURL(/\/admin\/settings\/organization/);

		const settingsName = page.getByTestId('org-settings-name');
		await expect(settingsName).toBeVisible();
		await expect(settingsName).toContainText(orgBName);
		await expect(settingsName).not.toContainText(orgAName);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Menu lists all orgs
	// -----------------------------------------------------------------------
	test('switcher menu lists both organisations', async ({ page }) => {
		const user = makeFreshUser('sw-list');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);
		const orgAName = `OrgA-${Date.now()}`;
		await completeOnboardingForm(page, orgAName);

		const orgBName = await createSecondOrg(page);

		await page.goto('/admin');
		await page.waitForURL(/\/admin/);

		await page.getByTestId('org-switcher-trigger').click();

		const menu = page.getByTestId('org-switcher-menu');
		await expect(menu).toBeVisible();
		await expect(menu.getByText(orgAName)).toBeVisible();
		await expect(menu.getByText(orgBName)).toBeVisible();

		await deleteUserSafe(user.email);
	});
});
