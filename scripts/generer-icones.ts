/**
 * Les icônes matricielles, dérivées de `public/favicon.svg`.
 *
 * POURQUOI UN SCRIPT ET NON QUATRE PNG DÉPOSÉS À LA MAIN. Un jeu d'icônes
 * dessiné une fois puis exporté à la main diverge dès la première retouche : on
 * corrige le SVG, on oublie le 192, et l'écran d'accueil d'un téléphone garde
 * l'ancienne marque pendant des mois sans que personne le voie. Ici la source
 * est unique, et les dérivés se régénèrent d'une commande :
 *
 *     bun scripts/generer-icones.ts
 *
 * CE QUI EST PRODUIT, ET POURQUOI CHACUN EXISTE.
 *
 *   favicon.png (48)        Le repli des navigateurs qui ignorent le SVG.
 *                           Transparent, comme le SVG.
 *   apple-touch-icon (180)  iOS ne respecte pas la transparence sur l'écran
 *                           d'accueil : il compose sur du noir ou du blanc
 *                           selon l'humeur du système. On lui donne donc un
 *                           fond d'encre, opaque et décidé.
 *   icone-192, icone-512    Android, via le manifeste. Déclarées « maskable »,
 *                           donc l'assiette est réduite à 72 % et centrée : le
 *                           système rogne jusqu'à 20 % du bord pour la mettre à
 *                           la forme du lanceur, et une marque à fond perdu s'y
 *                           fait amputer son liseré.
 *
 * Le rendu passe par resvg, qui était déjà une dépendance de développement.
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(import.meta.dirname, '..');
const PUBLIC = join(RACINE, 'public');

/** L'encre de la marque. La même valeur que `--color-encre-nuit`. */
const ENCRE = '#252b38';

const assiette = readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8');

/**
 * Pose l'assiette sur un fond plein, réduite à `part` de la largeur.
 *
 * On enveloppe le SVG source plutôt que de le réécrire : le dessin reste
 * défini à un seul endroit, et ce fichier ne connaît que la mise en boîte.
 */
function surFond(part: number, fond: string): string {
	const marge = ((1 - part) / 2) * 100;
	const interieur = assiette
		.replace(/<\?xml[^>]*\?>/, '')
		.replace(/<svg[^>]*>/, '')
		.replace(/<\/svg>\s*$/, '');
	return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<rect width="100" height="100" fill="${fond}"/>
<g transform="translate(${marge} ${marge}) scale(${part})">${interieur}</g>
</svg>`;
}

function rendre(svg: string, largeur: number, fichier: string): void {
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: largeur } }).render().asPng();
	writeFileSync(join(PUBLIC, fichier), png);
	console.log(`${fichier.padEnd(22)} ${largeur}px  ${Math.round(png.length / 1024)} ko`);
}

rendre(assiette, 48, 'favicon.png');
rendre(surFond(0.78, ENCRE), 180, 'apple-touch-icon.png');
rendre(surFond(0.72, ENCRE), 192, 'icone-192.png');
rendre(surFond(0.72, ENCRE), 512, 'icone-512.png');
