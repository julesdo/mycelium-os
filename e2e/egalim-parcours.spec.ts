/**
 * egalim-parcours.spec.ts
 *
 * Le parcours de la cantine, de bout en bout : ouvrir un dépôt, y verser des
 * factures, voir l'extraction aboutir, et voir le lot avancer tout seul vers
 * l'étape suivante.
 *
 * Choix de conception : le jeu de test est un EXPORT COMPTABLE CSV, dont
 * l'extraction est déterministe et ne coûte aucun appel d'API. Le backend
 * Convex isolé du harnais E2E n'a pas de clé Anthropic, ce qui met à
 * l'épreuve exactement ce qu'on veut prouver : quand la classification ne
 * peut pas s'exécuter, la chaîne ne casse pas, elle bascule les libellés vers
 * l'arbitrage humain. Un lot reste exploitable, jamais perdu.
 *
 * Le parcours complet jusqu'au diagnostic, lui, demande un appel réel et vit
 * dans les tests d'intégration (`EGALIM_LIVE_API=1`).
 */

import { test, expect, chromium, type Browser, type Page } from '@playwright/test';
import { resolveSiteUrl } from './utils/site-url';
import path from 'node:path';
import { createIsolatedUserWithOrg, deleteUserSafe } from './utils/org-test-helpers';

// Meme resolution que playwright.config.ts : le stack de test isole tourne
// sur un port calcule par projet, jamais sur 5173. La valeur en dur faisait
// echouer ces specs avec un `fetch failed` opaque.
const BASE_URL = resolveSiteUrl();
const FIXTURES = path.join(process.cwd(), 'src', 'lib', 'fixtures', 'factures');

/** Le CSV comptable de référence, réellement encodé en ISO-8859-1. */
const EXPORT_COMPTABLE = path.join(FIXTURES, 'export-comptable-01.csv');

/**
 * Aucun débordement horizontal du document, à aucune largeur. C'est la
 * garantie « utilisable sur téléphone » la plus dure à contourner : elle ne
 * dépend d'aucun texte ni d'aucune classe, seulement de la géométrie rendue.
 */
async function attendreAucunDebordement(page: Page, largeur: number, hauteur: number) {
	await page.setViewportSize({ width: largeur, height: hauteur });
	// Laisse le temps aux media queries et au layout de se stabiliser.
	await page.waitForTimeout(300);
	const debordement = await page.evaluate(() =>
		Math.max(
			document.documentElement.scrollWidth - document.documentElement.clientWidth,
			document.body.scrollWidth - document.body.clientWidth
		)
	);
	expect(
		debordement,
		`débordement horizontal de ${debordement}px à ${largeur}px de large`
	).toBeLessThanOrEqual(0);
}

test.describe('Parcours EGalim de la cantine', () => {
	let browser: Browser;

	test.beforeAll(async () => {
		browser = await chromium.launch();
	});

	test.afterAll(async () => {
		await browser.close();
	});

	test('un export comptable déposé produit des lignes et fait avancer le lot', async () => {
		test.setTimeout(180_000);

		const { context, user } = await createIsolatedUserWithOrg(browser, BASE_URL, 'egalim-depot');
		try {
			const page = await context.newPage();
			await page.goto('/app/factures');

			// --- Ouvrir le dépôt ---
			await expect(page.getByTestId('depot-ouvrir')).toBeVisible({ timeout: 30_000 });
			await page.getByTestId('depot-libelle').fill('Factures E2E');
			await page.getByTestId('depot-ouvrir').click();

			// La zone de dépôt remplace le formulaire d'ouverture.
			await expect(page.getByTestId('depot-fichiers')).toBeAttached({ timeout: 30_000 });

			// --- Verser la facture ---
			await page.getByTestId('depot-fichiers').setInputFiles(EXPORT_COMPTABLE);

			// --- L'extraction aboutit ---
			// L'écran ne liste pas les fichiers qui ont marché : il les résume en
			// un compteur, et n'expose en clair que ce qui appelle un geste. On
			// vérifie donc ce que le gestionnaire voit réellement.
			const lus = page.getByTestId('depot-lus');
			await expect(lus).toBeVisible({ timeout: 90_000 });
			await expect(lus).toContainText('1 fichier lu');
			await expect(page.getByTestId('depot-echec')).toHaveCount(0);

			// Le détail, lui, porte le nom du fichier et son compte de lignes.
			await page.getByTestId('depot-lus-detail').click();
			await expect(lus).toContainText('export-comptable-01.csv');
			await expect(lus).toContainText('18');

			// Le compteur de lignes du lot est renseigné : l'extraction a bien
			// produit des données, pas seulement changé un statut.
			const compteur = page.getByTestId('depot-lignes-total');
			await expect(compteur).toBeVisible();
			const texte = (await compteur.textContent()) ?? '';
			const lignes = Number.parseInt(texte.replace(/\D/g, ''), 10);
			expect(lignes, 'le lot doit porter au moins une ligne extraite').toBeGreaterThan(0);

			// --- Le lot avance tout seul jusqu'à l'arbitrage ---
			// Sans clé d'API sur le backend isolé, la classification ne peut pas
			// aboutir : les libellés partent en arbitrage humain. C'est
			// exactement le comportement voulu, et c'est ce qu'on vérifie.
			//
			// On affirme l'état d'ARRIVÉE, pas l'absence de l'état de départ :
			// une assertion négative passerait à vide si elle s'évaluait avant
			// que le statut ne bascule, et ne prouverait rien.
			await expect(page.getByTestId('depot-statut-lot')).toContainText(
				'Vérification par un opérateur',
				{ timeout: 120_000 }
			);
		} finally {
			await context.close();
			await deleteUserSafe(user.email);
		}
	});

	test('un format que l’extraction ne sait pas ouvrir est refusé au dépôt, avec la marche à suivre', async () => {
		test.setTimeout(120_000);

		const { context, user } = await createIsolatedUserWithOrg(browser, BASE_URL, 'egalim-refus');
		try {
			const page = await context.newPage();
			await page.goto('/app/factures');

			await expect(page.getByTestId('depot-ouvrir')).toBeVisible({ timeout: 30_000 });
			await page.getByTestId('depot-libelle').fill('Factures refus');
			await page.getByTestId('depot-ouvrir').click();
			await expect(page.getByTestId('depot-fichiers')).toBeAttached({ timeout: 30_000 });

			// Un classeur : refusé AVANT l'extraction, pour ne pas faire attendre
			// l'utilisateur puis lui dire « ça n'a pas marché ».
			await page.getByTestId('depot-fichiers').setInputFiles({
				name: 'grand-livre.xlsx',
				mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				buffer: Buffer.from('PK pas vraiment un classeur')
			});

			// Le message dit quoi faire, pas seulement que ça a échoué.
			await expect(page.getByText(/Enregistrer sous.*CSV/i)).toBeVisible({ timeout: 30_000 });

			// Et rien n'a été enregistré : ni réussite, ni échec dans le lot. Le
			// fichier a été refusé AVANT d'entrer dans le traitement.
			await expect(page.getByTestId('depot-lus')).toHaveCount(0);
			await expect(page.getByTestId('depot-echec')).toHaveCount(0);
		} finally {
			await context.close();
			await deleteUserSafe(user.email);
		}
	});

	test('le dépôt tient sur téléphone, tablette et desktop sans débordement', async () => {
		test.setTimeout(120_000);

		const { context, user } = await createIsolatedUserWithOrg(browser, BASE_URL, 'egalim-resp');
		try {
			const page = await context.newPage();
			await page.goto('/app/factures');
			await expect(page.getByTestId('depot-ouvrir')).toBeVisible({ timeout: 30_000 });

			await attendreAucunDebordement(page, 375, 812); // iPhone
			await attendreAucunDebordement(page, 768, 1024); // iPad portrait
			await attendreAucunDebordement(page, 1280, 800); // desktop

			// Puis avec du contenu réel : un lot ouvert et un document déposé.
			await page.setViewportSize({ width: 1280, height: 800 });
			await page.getByTestId('depot-libelle').fill('Factures responsive');
			await page.getByTestId('depot-ouvrir').click();
			await expect(page.getByTestId('depot-fichiers')).toBeAttached({ timeout: 30_000 });
			await page.getByTestId('depot-fichiers').setInputFiles(EXPORT_COMPTABLE);
			await expect(page.getByTestId('depot-lus')).toBeVisible({ timeout: 90_000 });
			await page.getByTestId('depot-lus-detail').click();

			await attendreAucunDebordement(page, 375, 812);
			await attendreAucunDebordement(page, 768, 1024);
			await attendreAucunDebordement(page, 1280, 800);
		} finally {
			await context.close();
			await deleteUserSafe(user.email);
		}
	});
});
