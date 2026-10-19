/**
 * LES ÉCRANS DE L'APPLICATION, EN PNG, POUR LE SITE (06/10/2026, refait le 14/10).
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
 * Pré-requis : un serveur de développement sur le port 20173 (`bun run dev:cloud`).
 * Playwright se bloque sous Bun sur Windows : passer par Node.
 *
 *     node --experimental-strip-types scripts/capturer-ecrans.ts
 *     node --experimental-strip-types scripts/capturer-ecrans.ts coffre sante
 *
 * Un écran de téléphone sort en 393 et 786 px de large, un écran d'ordinateur
 * en 800 et 1600 px, dans `public/ecrans/`, en PNG quantifié : le site les sert
 * par `srcset` (`EcranProduit`, `EcranBureau`).
 *
 * ⚠️ LA LISTE SUIT LE SITE (`docs/superpowers/specs/2026-10-14-site-refonte.md`).
 * Une capture que plus aucune page ne lit est un fichier mort : la retirer d'ici
 * ET de `public/ecrans/`.
 */
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// `SALLE=http://localhost:20067/showroom` pour la salle d'un worktree (port de `scripts/dev-ports.ts`).
const BASE = process.env.SALLE ?? 'http://localhost:20173/showroom';
const SORTIE = join(import.meta.dirname, '..', 'public', 'ecrans');

const TELEPHONE = { width: 393, height: 852 } as const;
const BUREAU = { width: 1280, height: 800 } as const;

/** Les métiers des pages `/secteurs/<métier>` : `SECTEURS_PUBLICS`, recopiés (Node ne lit pas le registre). */
const METIERS = [
	'transport-routier',
	'batiment',
	'services-aux-entreprises',
	'fournisseurs-publics'
] as const;

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
	/** Pris à la largeur d'un ordinateur, en deux volets. */
	readonly bureau?: boolean;
}

const CAPTURES: readonly Capture[] = [
	// Le héros : l'accueil, le montant, Plume dans la barre.
	{ nom: 'aujourdhui', ecran: 'aujourd’hui', variante: 'principale' },
	// Le même écran, descendu jusqu'au bloc de Plume : « Part bientôt », « Retenir ».
	{ nom: 'part-bientot', ecran: 'aujourd’hui', variante: 'principale', defilement: 300 },
	{ nom: 'aujourdhui-bureau', ecran: 'aujourd’hui', variante: 'principale', bureau: true },
	// Plume : sa maison, une réponse qui propose un geste, un travail qui se coche.
	// Sa conversation est plein écran dans le produit : sans la barre, le
	// compositeur se lit au lieu de passer sous les onglets.
	{
		nom: 'plume-maison',
		ecran: 'Plume, tout l’établissement',
		variante: 'principale',
		sansBarre: true
	},
	{
		nom: 'plume-maison-bureau',
		ecran: 'Plume, tout l’établissement',
		variante: 'principale',
		sansBarre: true,
		bureau: true
	},
	{ nom: 'plume-geste', ecran: 'Parler à Plume', variante: 'geste', sansBarre: true },
	{ nom: 'plume-travail', ecran: 'Parler à Plume', variante: 'travail', sansBarre: true },
	// Le paiement en plusieurs fois, descendu jusqu'à son calendrier.
	{ nom: 'echeancier', ecran: 'créance', variante: 'échéancier en cours', defilement: 560 },
	// Brancher ses factures : les logiciels, et le dépôt.
	{ nom: 'logiciels', ecran: 'aujourd’hui', variante: 'brancher : le choix', sansBarre: true },
	{ nom: 'depot', ecran: 'le coffre-fort', variante: 'dépôt : le choix', sansBarre: true },
	// Tout ce qui va avec.
	{ nom: 'coffre', ecran: 'le coffre-fort', variante: 'principale' },
	{ nom: 'sante', ecran: 'sa santé', variante: 'principale' },
	{ nom: 'defense', ecran: 'votre défense', variante: 'avec une équipe' },
	{ nom: 'paiement', ecran: 'le client paie', variante: 'principale', sansBarre: true },
	// Les pages métier (19/10/2026) : l'écran « Aujourd'hui » de chaque métier, en tête puis
	// descendu jusqu'à ses cartes. Données : `src/marketing/scenes-metiers.ts`.
	...METIERS.flatMap((metier): Capture[] => [
		{ nom: `metier-${metier}`, ecran: 'aujourd’hui', variante: `métier : ${metier}` },
		{
			nom: `metier-${metier}-cartes`,
			ecran: 'aujourd’hui',
			variante: `métier : ${metier}`,
			defilement: 640
		}
	])
];

async function prendre(page: Page, capture: Capture): Promise<Buffer> {
	await page.goto(BASE, { waitUntil: 'networkidle' });
	await page.getByRole('button', { name: capture.ecran, exact: true }).first().click();
	if (capture.variante !== undefined) {
		// La variante déjà affichée est un bouton désactivé : on ne la touche pas.
		const variante = page.getByRole('button', { name: capture.variante, exact: true }).first();
		if (await variante.isEnabled()) await variante.click();
	}
	// La rangée de la salle d'exposition n'appartient pas au produit.
	await page.evaluate(() => {
		const rangee = document.querySelector('.shrink-0.overflow-x-auto');
		if (rangee instanceof HTMLElement) rangee.style.display = 'none';
	});
	await page.waitForTimeout(1200);
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
		const { width, height } = page.viewportSize() ?? TELEPHONE;
		await page.mouse.move(width / 2, height / 2);
		await page.mouse.wheel(0, capture.defilement);
		await page.waitForTimeout(500);
	}
	// Le pointeur quitte l'écran : sinon la rangée qu'il survole reste en surbrillance.
	await page.mouse.move(1, 1);
	await page.waitForTimeout(300);
	return page.screenshot({ type: 'png' });
}

async function main(): Promise<void> {
	mkdirSync(SORTIE, { recursive: true });
	const navigateur = await chromium.launch();
	const options = { deviceScaleFactor: 2, colorScheme: 'light', locale: 'fr-FR' } as const;
	const telephone = await navigateur.newPage({ ...options, viewport: TELEPHONE });
	const bureau = await navigateur.newPage({ ...options, viewport: BUREAU });

	// `node … capturer-ecrans.ts coffre` ne refait que cette capture-là.
	const seulement = process.argv.slice(2);
	const aPrendre =
		seulement.length === 0
			? CAPTURES
			: CAPTURES.filter((capture) => seulement.includes(capture.nom));
	for (const capture of aPrendre) {
		const page = capture.bureau === true ? bureau : telephone;
		const brute = await prendre(page, capture);
		const largeurs = capture.bureau === true ? [800, 1600] : [TELEPHONE.width, TELEPHONE.width * 2];
		for (const largeur of largeurs) {
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
