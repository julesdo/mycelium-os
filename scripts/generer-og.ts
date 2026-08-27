/**
 * L'image de partage — celle qui s'affiche quand le lien est collé dans un
 * message, un fil, un courriel.
 *
 * POURQUOI ELLE EST DESSINÉE ET NON PHOTOGRAPHIÉE. Reprendre la photo du héros
 * donne une vignette qui pourrait appartenir à n'importe quel site de cuisine :
 * elle ne dit ni le nom, ni le sujet, ni ce qu'on vend. Une image de partage est
 * lue à trois cents pixels de large, une seconde, dans un fil qui défile. Elle
 * doit porter quatre choses et rien d'autre — la marque, la promesse, le sujet,
 * et de quoi comprendre qu'il s'agit d'une obligation légale.
 *
 * ELLE EST SUR L'ENCRE, comme la section d'autorité de la page. Dans un fil
 * majoritairement blanc, un rectangle sombre s'arrête ; un rectangle blanc se
 * fond dans l'interface qui l'entoure.
 *
 * LES CHIFFRES SONT CEUX DE LA LOI, PAS CEUX D'UNE CANTINE. 50, 20 et 60 sont
 * des seuils réglementaires, vrais pour tout le monde. Reprendre les 39/21/42 de
 * la démonstration du héros aurait affiché, hors contexte, trois taux d'échec
 * sans dire de qui.
 *
 * ⚠️ LES POLICES SONT DÉCOMPRESSÉES AVANT D'ÊTRE PASSÉES À resvg. Le rendu SVG
 * ne sait pas lire le woff2 — et, ce qui est pire, il ne le dit pas : on lui
 * passe le fichier, il répond « rendu OK », et l'image sort VIDE de tout texte.
 * Un premier essai est parti comme ça, et seul le fait de regarder le PNG l'a
 * montré. `wawoff2` rend le TTF que resvg attend.
 *
 *     bun scripts/generer-og.ts
 */
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const RACINE = join(import.meta.dirname, '..');
const PUBLIC = join(RACINE, 'public');
const MODULES = join(RACINE, 'node_modules');

/** Les couleurs de la page publique. Mêmes valeurs que `tokens.css`. */
const ENCRE = '#252b38';
const FILET = '#39404e';
const PAPIER = '#f4f6f9';
const DOUX = '#aab2c0';
const BLEU = '#4d78e0';

/**
 * LES NOMS DE FAMILLE VIENNENT DU BINAIRE, PAS DE LA FEUILLE DE STYLE.
 *
 * `@fontsource` étiquette ses fontes « Newsreader Variable » et « Plus Jakarta
 * Sans Variable » dans son CSS — mais resvg ne lit pas le CSS, il lit la table
 * `name` du TTF, qui dit tout autre chose. Un nom qui ne correspond pas ne
 * provoque aucune erreur : le rendu retombe sur la première fonte chargée, et
 * toute l'image sort dans la mauvaise famille. C'est le troisième essai qui l'a
 * montré, en la regardant.
 *
 * Relevés avec fontkit sur les TTF décompressés. Les revérifier après toute
 * montée de version de `@fontsource` :
 *
 *     fontkit.openSync(chemin).familyName
 */
const SERIF = 'Newsreader 16pt 16pt';
const SANS = 'Plus Jakarta Sans';
const BROSSE = 'Caveat Brush';

/**
 * L'épaississement optique de la serif, en clair sur l'encre.
 *
 * POURQUOI PAS `font-weight`. Le fichier chargé est une fonte VARIABLE, et resvg
 * n'en instancie pas les axes : il rend l'instance par défaut, c'est-à-dire le
 * romain. Demander 600 ne produit donc rigoureusement rien.
 *
 * Le contour de la même couleur, avec `paint-order`, grossit le tracé sans le
 * salir — c'est le remède déjà employé pour le logotype, et documenté dans
 * `src/ui/logo.tsx`. Il compense le fait qu'un texte clair sur fond sombre
 * paraît plus fin qu'il ne l'est : la lumière déborde sur les contours et ronge
 * les déliés, ce dont une serif souffre plus qu'une grotesque.
 *
 * Six dixièmes de pixel, pas plus. Au-delà, les empattements se referment et le
 * titre passe de « imprimé » à « gras synthétique ».
 */
const GRAS = `stroke="${PAPIER}" stroke-width="0.6" paint-order="stroke fill"`;

const LARGEUR = 1200;
const HAUTEUR = 630;

/**
 * Les trois seuils du barème, dans l'ordre où la loi les énonce.
 *
 * Écrits ici plutôt qu'importés du référentiel : ce script produit une image, il
 * n'a pas à embarquer le domaine. Le jour où le barème change, c'est la revue de
 * code du référentiel qui doit le rattraper — et elle passera aussi ici.
 */
const SEUILS = [
	{ valeur: '50 %', quoi: 'de produits durables' },
	{ valeur: '20 %', quoi: 'dont du bio' },
	{ valeur: '60 %', quoi: 'sur viande et poisson' }
];

/** L'accroche, coupée à la main : SVG ne sait pas faire de retour à la ligne. */
const ACCROCHE = ['Vos trois taux EGalim', 'sont déjà dans vos factures.'];

/**
 * Décompresse un woff2 et le dépose en TTF, puis rend son chemin.
 *
 * ⚠️ ON PASSE PAR DES FICHIERS, ET NON PAR DES TAMPONS. `fontBuffers` n'existe
 * pas dans resvg-js 2.6.2 — l'option est acceptée sans broncher puis ignorée, et
 * le rendu se rabat sur une police système. Le résultat n'est pas une erreur :
 * c'est une image entièrement composée dans la mauvaise fonte, qui ne se voit
 * qu'en la REGARDANT. Deux essais sont partis comme ça. `fontFiles` est la seule
 * entrée que cette version connaît.
 *
 * Les TTF vont dans le dossier temporaire du système : ce sont des dérivés, ils
 * n'ont rien à faire dans le dépôt.
 */
async function police(chemin: string, nom: string): Promise<string> {
	const ttf = Buffer.from(await decompress(readFileSync(join(MODULES, chemin))));
	const sortie = join(tmpdir(), `letikette-${nom}.ttf`);
	writeFileSync(sortie, ttf);
	return sortie;
}

/** Le corps de l'assiette, repris de l'icône pour qu'il n'existe qu'un dessin. */
function assiette(): string {
	return readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8')
		.replace(/<\?xml[^>]*\?>/, '')
		.replace(/<svg[^>]*>/, '')
		.replace(/<\/svg>\s*$/, '');
}

function composition(): string {
	const marge = 76;
	const seuils = SEUILS.map((s, i) => {
		const x = marge + i * 212;
		return `
<text x="${x}" y="512" font-family="${SERIF}" font-size="52" fill="${PAPIER}">${s.valeur}</text>
<text x="${x}" y="545" font-family="${SANS}" font-size="17" fill="${DOUX}">${s.quoi}</text>`;
	}).join('');

	return `<svg width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" xmlns="http://www.w3.org/2000/svg">
<rect width="${LARGEUR}" height="${HAUTEUR}" fill="${ENCRE}"/>
<!-- La trame de papier de sécurité, la même que sur la page. -->
<defs>
  <pattern id="trame" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="14" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1"/>
  </pattern>
</defs>
<rect width="${LARGEUR}" height="${HAUTEUR}" fill="url(#trame)"/>

<!-- L'assiette déborde à droite : elle ancre la marque sans disputer le texte. -->
<g transform="translate(842 118) scale(3.94)">${assiette()}</g>

<!-- Le logotype, à la brosse et en capitales, comme partout ailleurs. -->
<text x="${marge}" y="112" font-family="${BROSSE}" font-size="42" fill="${PAPIER}" letter-spacing="2">LETIKETTE</text>
<text x="${marge}" y="146" font-family="${SANS}" font-size="16" fill="${BLEU}" letter-spacing="2.4">RESTAURATION COLLECTIVE · LOI EGALIM</text>

<!-- L'accroche. Deux lignes posées à la main, faute de retour automatique. -->
<text x="${marge}" y="268" font-family="${SERIF}" font-size="62" fill="${PAPIER}" ${GRAS}>${ACCROCHE[0]}</text>
<text x="${marge}" y="338" font-family="${SERIF}" font-size="62" fill="${PAPIER}" ${GRAS}>${ACCROCHE[1]}</text>

<text x="${marge}" y="392" font-family="${SANS}" font-size="21" fill="${DOUX}">Le logiciel les mesure ligne à ligne, et justifie chaque classement.</text>

<line x1="${marge}" y1="440" x2="740" y2="440" stroke="${FILET}" stroke-width="1"/>
${seuils}
<line x1="${marge}" y1="578" x2="${LARGEUR - marge}" y2="578" stroke="${FILET}" stroke-width="1"/>
<text x="${marge}" y="606" font-family="${SANS}" font-size="17" fill="${DOUX}">letikette.com</text>
<text x="${LARGEUR - marge}" y="606" text-anchor="end" font-family="${SANS}" font-size="17" fill="${DOUX}">Déclaration avant le 31 mars</text>
</svg>`;
}

const polices = [
	await police(
		'@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2',
		'newsreader'
	),
	await police(
		'@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
		'jakarta'
	),
	await police('@fontsource/caveat-brush/files/caveat-brush-latin-400-normal.woff2', 'caveat')
];

const png = new Resvg(composition(), {
	font: {
		fontFiles: polices,
		// Aucune police système : si un nom de famille est faux, le texte sort
		// VIDE — ce qui se voit — au lieu d'être silencieusement substitué.
		loadSystemFonts: false,
		defaultFontFamily: SANS
	},
	fitTo: { mode: 'width', value: LARGEUR }
})
	.render()
	.asPng();

writeFileSync(join(PUBLIC, 'partage.png'), png);
console.log(`partage.png  ${LARGEUR}×${HAUTEUR}  ${Math.round(png.length / 1024)} ko`);
