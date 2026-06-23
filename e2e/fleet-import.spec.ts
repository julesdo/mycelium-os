/**
 * fleet-import.spec.ts
 *
 * Tests the 3-step CSV fleet import flow on /admin/fleet.
 * Each test creates a fresh user + org to ensure isolation.
 *
 * Run: bun run test:e2e --grep "fleet"
 */

import { test, expect } from '@playwright/test';
import {
	makeFreshUser,
	setupFreshUserOnOnboarding,
	completeOnboardingForm,
	deleteUserSafe
} from './utils/org-test-helpers';

test.use({ storageState: { cookies: [], origins: [] } });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

// ---------------------------------------------------------------------------
// CSV fixture — 20 vehicles with French column names, 2 duplicate entries
// ---------------------------------------------------------------------------
function generateCsvBuffer(rows = 20): Buffer {
	const header = 'Immatriculation,Marque,Modele,Annee,Energie,Categorie,Kilometrage,Site';
	const brands = ['Renault', 'Peugeot', 'Citroën', 'Volkswagen', 'BMW'];
	const models = ['Clio', '308', 'C3', 'Golf', 'Serie 3'];
	const energies = ['Thermique', 'Hybride', 'Electrique'];
	const categories = ['Tourisme', 'Utilitaire', 'Camion'];

	const dataRows: string[] = [];
	for (let i = 0; i < rows; i++) {
		const brand = brands[i % brands.length];
		const model = models[i % models.length];
		const immat = `AB-${String(100 + i).padStart(3, '0')}-CD`;
		const year = 2018 + (i % 6);
		const energy = energies[i % energies.length];
		const category = categories[i % categories.length];
		const km = 10000 + i * 2500;
		const site = `Site ${(i % 3) + 1}`;
		dataRows.push(`${immat},${brand},${model},${year},${energy},${category},${km},${site}`);
	}

	return Buffer.from([header, ...dataRows].join('\n'), 'utf-8');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setupUserWithFleet(page: Parameters<typeof setupFreshUserOnOnboarding>[0], prefix: string) {
	const user = makeFreshUser(prefix);
	await setupFreshUserOnOnboarding(page, user, BASE_URL);
	const orgName = `FleetOrg-${Date.now()}`;
	await completeOnboardingForm(page, orgName);
	await page.waitForURL(/\/admin/, { timeout: 15_000 });
	await page.goto(`${BASE_URL}/admin/fleet`);
	return user;
}

async function openImportModal(page: Parameters<typeof setupFreshUserOnOnboarding>[0]) {
	const btn = page.getByTestId('btn-import-csv').first();
	await expect(btn).toBeVisible({ timeout: 10_000 });
	await btn.click();
	// Dialog should appear
	await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
}

async function uploadCsvInModal(
	page: Parameters<typeof setupFreshUserOnOnboarding>[0],
	csvBuffer: Buffer
) {
	const fileInput = page.getByTestId('csv-file-input');
	await fileInput.setInputFiles({
		name: 'fleet-test.csv',
		mimeType: 'text/csv',
		buffer: csvBuffer
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Fleet CSV import', () => {
	// -------------------------------------------------------------------------
	// 1. Bouton import visible (page vide)
	// -------------------------------------------------------------------------
	test('le bouton Importer CSV est visible sur la page flotte vide', async ({ page }) => {
		const user = await setupUserWithFleet(page, 'fleet-btn');

		const btn = page.getByTestId('btn-import-csv').first();
		await expect(btn).toBeVisible({ timeout: 10_000 });

		await deleteUserSafe(user.email);
	});

	// -------------------------------------------------------------------------
	// 2. Upload ouvre le step 2 avec auto-mapping
	// -------------------------------------------------------------------------
	test('upload CSV valide passe au step 2 avec auto-mapping des colonnes', async ({ page }) => {
		const user = await setupUserWithFleet(page, 'fleet-map');
		await openImportModal(page);

		const csvBuffer = generateCsvBuffer(5);
		await uploadCsvInModal(page, csvBuffer);

		// File info should appear in dropzone
		await expect(page.locator('text=fleet-test.csv')).toBeVisible({ timeout: 5_000 });

		// Click Next
		await page.getByTestId('btn-next').click();

		// Step 2 mapping should appear
		await expect(page.getByTestId('step-mapping')).toBeVisible({ timeout: 5_000 });

		// "Immatriculation" field should be auto-mapped (select has a non-empty value)
		// We check the row exists and the select is not on '—'
		await expect(page.locator('text=Immatriculation')).toBeVisible();

		await deleteUserSafe(user.email);
	});

	// -------------------------------------------------------------------------
	// 3. Import de 20 vehicules — happy path
	// -------------------------------------------------------------------------
	test('import de 20 vehicules reussit et les affiche dans le tableau', async ({ page }) => {
		const user = await setupUserWithFleet(page, 'fleet-import');
		await openImportModal(page);

		const csvBuffer = generateCsvBuffer(20);
		await uploadCsvInModal(page, csvBuffer);

		// Wait for parse result
		await expect(page.locator('text=fleet-test.csv')).toBeVisible({ timeout: 5_000 });

		// Step 1 → Step 2
		await page.getByTestId('btn-next').click();
		await expect(page.getByTestId('step-mapping')).toBeVisible({ timeout: 5_000 });

		// Step 2 → Step 3
		await page.getByTestId('btn-next').click();
		await expect(page.locator('text=vehicule').first()).toBeVisible({ timeout: 5_000 });

		// Click the import button (in step 3 body)
		const importBtn = page.getByTestId('btn-import-confirm');
		await expect(importBtn).toBeVisible({ timeout: 5_000 });
		await importBtn.click();

		// Progress bar should appear
		await expect(page.getByTestId('import-progress')).toBeVisible({ timeout: 10_000 });

		// Wait for success
		await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 30_000 });

		// Modal should close automatically (no duplicates)
		await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

		// Table should now contain vehicles
		await expect(page.locator('text=AB-100-CD')).toBeVisible({ timeout: 10_000 });

		await deleteUserSafe(user.email);
	});

	// -------------------------------------------------------------------------
	// 4. Doublons détectés au 2e import
	// -------------------------------------------------------------------------
	test('les doublons sont detectes et affiches lors d\'un second import', async ({ page }) => {
		const user = await setupUserWithFleet(page, 'fleet-dup');
		const csvBuffer = generateCsvBuffer(5);

		// First import
		await openImportModal(page);
		await uploadCsvInModal(page, csvBuffer);
		await expect(page.locator('text=fleet-test.csv')).toBeVisible({ timeout: 5_000 });
		await page.getByTestId('btn-next').click();
		await expect(page.getByTestId('step-mapping')).toBeVisible({ timeout: 5_000 });
		await page.getByTestId('btn-next').click();
		const importBtn1 = page.getByTestId('btn-import-confirm');
		await expect(importBtn1).toBeVisible({ timeout: 5_000 });
		await importBtn1.click();
		await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 30_000 });

		// Wait for modal to close
		await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

		// Second import — same CSV
		await openImportModal(page);
		await uploadCsvInModal(page, csvBuffer);
		await expect(page.locator('text=fleet-test.csv')).toBeVisible({ timeout: 5_000 });
		await page.getByTestId('btn-next').click();
		await expect(page.getByTestId('step-mapping')).toBeVisible({ timeout: 5_000 });
		await page.getByTestId('btn-next').click();
		const importBtn2 = page.getByTestId('btn-import-confirm');
		await expect(importBtn2).toBeVisible({ timeout: 5_000 });
		await importBtn2.click();

		// Wait for done state
		await expect(page.getByTestId('import-success')).toBeVisible({ timeout: 30_000 });

		// Skipped list should appear
		await expect(page.getByTestId('import-skipped-list')).toBeVisible({ timeout: 5_000 });

		await deleteUserSafe(user.email);
	});

	// -------------------------------------------------------------------------
	// 5. Fichier invalide (non-CSV) → message d'erreur
	// -------------------------------------------------------------------------
	test('un fichier non-CSV affiche une erreur', async ({ page }) => {
		const user = await setupUserWithFleet(page, 'fleet-err');
		await openImportModal(page);

		// Upload a fake PNG file
		const fileInput = page.getByTestId('csv-file-input');
		await fileInput.setInputFiles({
			name: 'image.png',
			mimeType: 'image/png',
			buffer: Buffer.from('fake png content')
		});

		// Error should appear, Next button still disabled
		await expect(page.locator('text=format .csv')).toBeVisible({ timeout: 3_000 });
		await expect(page.getByTestId('btn-next')).toBeDisabled();

		await deleteUserSafe(user.email);
	});
});
