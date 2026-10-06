/**
 * LES ÉCRANS DE L'APPLICATION, EN PNG, POUR LA PAGE D'ACCUEIL (06/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI DES IMAGES, ET PLUS UN TÉLÉPHONE DESSINÉ EN COMPOSANTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le héros rendait l'écran d'accueil du produit en composants React, dans une
 * coque et sous un ciel de nébuleuse en SVG. Sur téléphone, le tout pesait
 * lourd et faisait saccader la page (constat du fondateur). Une image ne coûte
 * qu'un décodage, se charge à la bonne taille par `srcset`, et montre EXACTEMENT
 * ce que montre le produit : elle est prise dans la salle d'exposition, sur les
 * vrais écrans, avec leurs données de démonstration.
 *
 * Pré-requis : un serveur de développement sur le port 20173 (`bun run dev`).
 *
 *     bun scripts/capturer-ecrans.ts
 *
 * Chaque écran sort en deux largeurs — 393 px et 786 px — dans
 * `public/ecrans/`, en PNG quantifié : la page les sert par `srcset`.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://localhost:20173/showroom';
const SORTIE = join(import.meta.dirname, '..', 'public', 'ecrans');
const LARGEUR = 393;
const HAUTEUR = 852;

interface Capture {
	/** Le nom du fichier, sans extension. */
	readonly nom: string;
	/** Le libellé du bouton de l'écran dans la salle d'exposition. */
	readonly ecran: string;
	/** Une variante nommée de cet écran, s'il en faut une. */
	readonly variante?: string;
	/** Défilement vertical avant la prise, en pixels CSS. */
	readonly defilement?: number;
	/**
	 * Sans la barre du bas : la salle d'exposition la monte sur tous ses écrans,
	 * mais la page où le client paie ne la porte pas — un débiteur n'a pas d'onglets.
	 */
	readonly sansBarre?: boolean;
}

const CAPTURES: readonly Capture[] = [
	{ nom: 'aujourdhui', ecran: 'aujourd’hui' },
	// La file du matin : le même écran, descendu jusqu'aux clients à traiter.
	{ nom: 'file', ecran: 'aujourd’hui', defilement: 330 },
	{ nom: 'dossier', ecran: 'créance' },
	{ nom: 'decompte', ecran: 'arrêt du décompte' },
	{ nom: 'paiement', ecran: 'le client paie', sansBarre: true },
	{ nom: 'depots', ecran: 'dépôt' }
];

async function main(): Promise<void> {
	mkdirSync(SORTIE, { recursive: true });
	const navigateur = await chromium.launch();
	const page = await navigateur.newPage({
		viewport: { width: LARGEUR, height: HAUTEUR },
		deviceScaleFactor: 2,
		colorScheme: 'light',
		locale: 'fr-FR'
	});

	for (const capture of CAPTURES) {
		await page.goto(BASE, { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: capture.ecran, exact: true }).first().click();
		if (capture.variante !== undefined) {
			await page.getByRole('button', { name: capture.variante, exact: true }).first().click();
		}
		// La rangée de la salle d'exposition n'appartient pas au produit. Le bouton
		// flottant du compagnon, si : mais posé sur une image fixe, il masque la
		// ligne qu'on montre sans rien pouvoir ouvrir.
		await page.evaluate(() => {
			const rangee = document.querySelector('.shrink-0.overflow-x-auto');
			if (rangee instanceof HTMLElement) rangee.style.display = 'none';
			for (const bouton of document.querySelectorAll('button')) {
				if (bouton.textContent?.trim() === 'Demander') bouton.style.visibility = 'hidden';
			}
			// Sa lueur est une sœur du bouton, pas un enfant : masquer le bouton seul
			// laissait une tache bleue sans objet en bas de chaque capture.
			for (const halo of document.querySelectorAll('.halo-compagnon')) {
				if (halo instanceof HTMLElement) halo.style.visibility = 'hidden';
			}
		});
		await page.waitForTimeout(900);
		if (capture.sansBarre === true) {
			await page.evaluate(() => {
				// La barre est le seul bloc FIXE qui porte l'onglet « Dossiers ».
				for (const bloc of document.querySelectorAll('body *')) {
					if (!(bloc instanceof HTMLElement)) continue;
					if (getComputedStyle(bloc).position !== 'fixed') continue;
					if (bloc.textContent?.includes('Dossiers')) bloc.style.display = 'none';
				}
			});
		}
		if (capture.defilement !== undefined) {
			await page.mouse.move(LARGEUR / 2, HAUTEUR / 2);
			await page.mouse.wheel(0, capture.defilement);
			// Le pointeur quitte l'écran : sinon la rangée qu'il survole reste en surbrillance.
			await page.mouse.move(1, 1);
			await page.waitForTimeout(500);
		}
		const brute = await page.screenshot({ type: 'png' });

		for (const largeur of [LARGEUR, LARGEUR * 2]) {
			const fichier = join(SORTIE, `${capture.nom}-${largeur}.png`);
			const info = await sharp(brute)
				.resize({ width: largeur })
				.png({ palette: true, quality: 88, compressionLevel: 9, effort: 10 })
				.toFile(fichier);
			console.log(`${fichier} — ${Math.round(info.size / 1024)} Ko`);
		}
	}

	await navigateur.close();
}

await main();
