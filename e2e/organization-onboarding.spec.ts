/**
 * organization-onboarding.spec.ts
 *
 * Tests the full signup → email verify → onboarding form → /admin flow.
 * Each test creates a throwaway user so tests are fully independent.
 *
 * Run with the chromium project (default); auth state is cleared per-describe
 * so the pre-authenticated user session from user.json is never used.
 */

import { test, expect } from '@playwright/test';
import {
	makeFreshUser,
	setupFreshUserOnOnboarding,
	completeOnboardingForm,
	deleteUserSafe
} from './utils/org-test-helpers';

// No stored auth — every test in this file drives its own session.
test.use({ storageState: { cookies: [], origins: [] } });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

test.describe('Organisation onboarding', () => {
	// -----------------------------------------------------------------------
	// Happy path 1 — name only
	// -----------------------------------------------------------------------
	test('signup → onboarding → create org with name only → redirect to /admin', async ({
		page
	}) => {
		const user = makeFreshUser('onboard-basic');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		await expect(page).toHaveURL(/\/onboarding\/organization/);

		const orgName = `BasicOrg-${Date.now()}`;
		await completeOnboardingForm(page, orgName);

		await expect(page).toHaveURL(/\/admin/);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Happy path 2 — SIREN lookup pre-fills the name
	// -----------------------------------------------------------------------
	test('valid SIREN triggers Pappers lookup and pre-fills org name', async ({ page }) => {
		const user = makeFreshUser('onboard-siren');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		// Intercept Pappers before the user types the SIREN.
		await page.route('https://api.pappers.fr/**', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					nom_entreprise: 'ACME SAS',
					libelle_code_naf: '62.01Z'
				})
			});
		});

		const sirenInput = page.getByTestId('org-siren-input');
		await expect(sirenInput).toBeVisible();
		// 552032534 passes the Luhn check used in the component.
		await sirenInput.fill('552032534');

		// Wait for the debounced Pappers lookup to resolve and pre-fill the name.
		const nameInput = page.getByTestId('org-name-input');
		await expect(nameInput).toHaveValue('ACME SAS', { timeout: 3000 });

		await page.getByTestId('onboarding-submit').click();
		await page.waitForURL(/\/admin/, { timeout: 15_000 });

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Error case 1 — submit without a name
	// -----------------------------------------------------------------------
	test('submit without a name shows a validation error and stays on the page', async ({
		page
	}) => {
		const user = makeFreshUser('onboard-empty');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		await page.getByTestId('onboarding-submit').click();

		// Inline error must appear; user must NOT be redirected.
		await expect(page.getByTestId('onboarding-error')).toBeVisible();
		await expect(page).toHaveURL(/\/onboarding\/organization/);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Error case 2 — SIREN wrong format
	// -----------------------------------------------------------------------
	test('SIREN with wrong format shows error on submit and never calls Pappers', async ({
		page
	}) => {
		const user = makeFreshUser('onboard-badsiren');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		let pappersWasCalled = false;
		await page.route('https://api.pappers.fr/**', (route) => {
			pappersWasCalled = true;
			route.abort();
		});

		// Fill a valid name so the only error is from the SIREN field.
		await page.getByTestId('org-name-input').fill('My Company');

		const sirenInput = page.getByTestId('org-siren-input');
		await expect(sirenInput).toBeVisible();
		// "XXXXXXXXX" is 9 chars but not digits → fails the Luhn + format check.
		await sirenInput.fill('XXXXXXXXX');

		await page.getByTestId('onboarding-submit').click();

		await expect(page.getByTestId('siren-error')).toBeVisible();
		await expect(page).toHaveURL(/\/onboarding\/organization/);

		// The component only sends the Pappers request when the SIREN passes
		// validateSiren(). "XXXXXXXXX" fails immediately.
		expect(pappersWasCalled).toBe(false);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Visual — critical elements are rendered
	// -----------------------------------------------------------------------
	test('onboarding page renders all critical form elements', async ({ page }) => {
		const user = makeFreshUser('onboard-visual');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		await expect(page.getByTestId('org-name-input')).toBeVisible();
		await expect(page.getByTestId('org-siren-input')).toBeVisible();
		await expect(page.getByTestId('onboarding-submit')).toBeVisible();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		await deleteUserSafe(user.email);
	});
});
