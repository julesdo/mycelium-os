/**
 * organization-onboarding.spec.ts
 *
 * Tests the full signup → email verify → onboarding form → /app flow.
 * The onboarding form is a single step: name, établissement type, couverts/jour
 * (all required), and an optional SIRET. Each test creates a throwaway user so
 * tests are fully independent.
 *
 * Run with the chromium project (default); auth state is cleared per-describe
 * so the pre-authenticated user session from user.json is never used.
 */

import { test, expect } from '@playwright/test';
import { resolveSiteUrl } from './utils/site-url';
import {
	makeFreshUser,
	setupFreshUserOnOnboarding,
	completeOnboardingForm,
	deleteUserSafe
} from './utils/org-test-helpers';

// No stored auth — every test in this file drives its own session.
test.use({ storageState: { cookies: [], origins: [] } });

// Meme resolution que playwright.config.ts : le stack de test isole tourne
// sur un port calcule par projet, jamais sur 5173. La valeur en dur faisait
// echouer ces specs avec un `fetch failed` opaque.
const BASE_URL = resolveSiteUrl();

test.describe('Organisation onboarding', () => {
	// -----------------------------------------------------------------------
	// Happy path 1 — required fields only, no SIRET
	// -----------------------------------------------------------------------
	test('signup → onboarding → create org with required fields → redirect to /app', async ({
		page
	}) => {
		const user = makeFreshUser('onboard-basic');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		await expect(page).toHaveURL(/\/onboarding\/organization/);

		const orgName = `BasicOrg-${Date.now()}`;
		await completeOnboardingForm(page, orgName, { etablissementType: 'RIE', couvertsJour: 200 });

		await expect(page).toHaveURL(/\/app/);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Happy path 2 — optional SIRET filled in
	// -----------------------------------------------------------------------
	test('create org with optional SIRET filled in → redirect to /app', async ({ page }) => {
		const user = makeFreshUser('onboard-siret');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		const orgName = `SiretOrg-${Date.now()}`;
		// 14-digit SIRET (well-formed per the component's regex check).
		await completeOnboardingForm(page, orgName, {
			etablissementType: 'EHPAD',
			couvertsJour: 80,
			siret: '55203253400012'
		});

		await expect(page).toHaveURL(/\/app/);

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

		// Client-side validation blocks submission; user must NOT be redirected.
		await expect(page.getByTestId('org-name-input')).toHaveAttribute('aria-invalid', 'true');
		await expect(page).toHaveURL(/\/onboarding\/organization/);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Error case 2 — SIRET wrong format
	// -----------------------------------------------------------------------
	test('SIRET with wrong format shows an error on submit and blocks redirect', async ({
		page
	}) => {
		const user = makeFreshUser('onboard-badsiret');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		// Fill the other required fields so the only error is from the SIRET field.
		await page.getByTestId('org-name-input').fill('My Company');
		await page.getByRole('combobox').click();
		await page.getByRole('option', { name: 'RIE — Restaurant inter-entreprises' }).click();
		await page.getByTestId('couverts-jour-input').fill('150');

		// SIRET must be exactly 14 digits — this is 9 digits, fails the component's regex.
		await page.getByTestId('org-siret-input').fill('552032534');

		await page.getByTestId('onboarding-submit').click();

		await expect(page.getByTestId('siret-error')).toBeVisible();
		await expect(page).toHaveURL(/\/onboarding\/organization/);

		await deleteUserSafe(user.email);
	});

	// -----------------------------------------------------------------------
	// Visual — critical elements are rendered
	// -----------------------------------------------------------------------
	test('onboarding page renders all critical form elements', async ({ page }) => {
		const user = makeFreshUser('onboard-visual');
		await setupFreshUserOnOnboarding(page, user, BASE_URL);

		await expect(page.getByTestId('org-name-input')).toBeVisible();
		await expect(page.getByRole('combobox')).toBeVisible();
		await expect(page.getByTestId('couverts-jour-input')).toBeVisible();
		await expect(page.getByTestId('org-siret-input')).toBeVisible();
		await expect(page.getByTestId('onboarding-submit')).toBeVisible();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

		await deleteUserSafe(user.email);
	});
});
