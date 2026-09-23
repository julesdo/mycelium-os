/**
 * L'image de partage — celle qui s'affiche quand le lien est collé dans un
 * message, un fil, un courriel.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE A ANNONCÉ EGALIM PENDANT TROIS SEMAINES, EN LIGNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le `partage.png` servi par letikette.com datait du 27 août 2026 et disait,
 * mot pour mot : « Vos trois taux EGalim sont déjà dans vos factures », sous un
 * sur-titre « RESTAURATION COLLECTIVE · LOI EGALIM », avec 50 % de produits
 * durables, 20 % de bio, 60 % sur viande et poisson, et « Déclaration avant le
 * 31 mars ».
 *
 * Le produit a pivoté vers le recouvrement le 3 septembre. Chaque partage du
 * site sur LinkedIn, WhatsApp ou par courriel a donc montré, pendant trois
 * semaines, un produit qui n'existe plus — et c'est la SEULE chose que voit
 * quelqu'un à qui on envoie le lien avant qu'il clique.
 *
 * C'est le troisième cas du même défaut : les trois raisons de l'abonnement
 * restées en EGalim vingt jours, les commentaires des tarifs parlant encore de
 * « couverts servis », et celui-ci. Le balayage d'une réécriture de domaine ne
 * doit pas s'arrêter au code de la page : il doit atteindre ce que la page
 * PRODUIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE PORTE, ET RIEN D'AUTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle est lue à trois cents pixels de large, une seconde, dans un fil qui
 * défile. Quatre choses : la marque, la promesse, les chiffres de la loi, et de
 * quoi comprendre qu'il s'agit d'une obligation légale.
 *
 * ELLE EST NOIRE, comme la page. Dans un fil majoritairement blanc, un
 * rectangle noir s'arrête ; un rectangle blanc se fond dans l'interface.
 *
 * ⚠️ LE TAUX EST ÉCRIT COMME UNE RÈGLE, PAS COMME UN NOMBRE. « BCE + 10 points »
 * plutôt que « 12,40 % », et c'est délibéré : le taux est réancré chaque
 * semestre, alors que cette image est régénérée à la main. Un nombre exact y
 * deviendrait faux en janvier sans que personne le remarque, puisque personne ne
 * relit une image. La règle, elle, ne périme pas.
 *
 * Les deux autres valeurs sont LUES sur `parametres.ts`, avec leur garde : une
 * valeur non relevée ne s'affiche pas plutôt que de s'afficher de mémoire.
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
import { PARAMETRES, estUtilisable } from '../src/lib/verticales/recouvrement/parametres';
import { REGIMES_PRESCRIPTION } from '../src/lib/verticales/recouvrement/pays/france/prescription';

const RACINE = join(import.meta.dirname, '..');
const PUBLIC = join(RACINE, 'public');
const MODULES = join(RACINE, 'node_modules');

/**
 * Les couleurs de la nuit, converties depuis `tokens.css`.
 *
 * Les jetons sont en oklch ; resvg ne le lit pas. Les équivalents sRGB sont
 * calculés une fois et écrits ici — c'est le seul endroit du dépôt où une
 * couleur de la page est dupliquée, et c'est parce qu'un moteur de rendu SVG
 * hors navigateur n'a pas accès à la feuille de style.
 */
const NUIT = '#000000';
const CRAIE = '#ffffff';
/** `--color-craie-douce`, oklch(0.74 0 0). */
const CRAIE_DOUCE = '#a8a8a8';
/** `--color-craie-claire`, oklch(0.58 0 0). */
const CRAIE_CLAIRE = '#7a7a7a';
/** `--color-craie-sourde`, oklch(0.46 0 0) — filets et sur-titres seulement. */
const CRAIE_SOURDE = '#595959';
/** `--color-filet-nuit`, du blanc à 14 % sur du noir. */
const FILET = '#242424';

/**
 * LES NOMS DE FAMILLE VIENNENT DU BINAIRE, PAS DE LA FEUILLE DE STYLE.
 *
 * `@fontsource` étiquette ses fontes « Inter Tight Variable » et « Plus Jakarta
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
 *
 * ⚠️ LA SERIF EST PARTIE AVEC LE FOND CRÈME. Newsreader portait les titres de la
 * page publique ; la page est passée à la grotesque d'affiche le 23 septembre,
 * et l'image de partage la suit. Charger une fonte de moins, c'est aussi une
 * famille de moins à se tromper de nom.
 */
const AFFICHE = 'Inter Tight';
const SANS = 'Plus Jakarta Sans';
const BROSSE = 'Caveat Brush';

const LARGEUR = 1200;
const HAUTEUR = 630;

/**
 * LES TROIS CHIFFRES DE LA LOI.
 *
 * ⚠️ DEUX SONT LUS, UN EST UNE RÈGLE. L'indemnité et le délai de prescription
 * sont des constantes : elles viennent de `parametres.ts`, avec le garde
 * `estUtilisable` qui exige qu'elles aient été relevées sur une source citable.
 * Le taux, lui, est réancré chaque semestre — voir l'en-tête : il s'écrit comme
 * la règle qui le produit, jamais comme le nombre du jour.
 */
function seuilsDeLaLoi(): { valeur: string; quoi: string }[] {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	const general = REGIMES_PRESCRIPTION.GENERAL;

	const seuils = [{ valeur: 'BCE + 10 pts', quoi: 'd’intérêts de retard' }];

	if (estUtilisable(indemnite) && indemnite.valeur !== null) {
		const euros = Number(indemnite.valeur) / 100;
		seuils.push({ valeur: `${euros.toLocaleString('fr-FR')} €`, quoi: 'par facture en retard' });
	}

	seuils.push({ valeur: `${general.dureeAnnees} ans`, quoi: 'et souvent bien moins' });
	return seuils;
}

/** Les articles, lus sur les sources des paramètres. Jamais écrits de mémoire. */
function articles(): string {
	const trouves = [
		PARAMETRES.tauxInteretLegalDefaut.source,
		PARAMETRES.delaiPrescriptionCommerciale.source
	]
		.map((source) => source.match(/\b[LRD]\.? ?\d{3}-\d+/))
		.filter((trouve): trouve is RegExpMatchArray => trouve !== null)
		.map((trouve) => trouve[0]);
	return trouves.length > 0 ? trouves.join(' · ') : 'CODE DE COMMERCE';
}

/** L'accroche, coupée à la main : SVG ne sait pas faire de retour à la ligne. */
const ACCROCHE = { eteint: 'Vos impayés', vif: 'ont une date limite.' };

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

/** La marque, reprise du favicon pour qu'il n'existe qu'un seul dessin. */
function marque(): string {
	return readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8')
		.replace(/<\?xml[^>]*\?>/, '')
		.replace(/<svg[^>]*>/, '')
		.replace(/<\/svg>\s*$/, '');
}

function composition(): string {
	const marge = 76;
	/* ⚠️ LA COLONNE EST CALCULEE, PAS CHOISIE. Un pas fixe de 232 px a fait
	   CHEVAUCHER « BCE + 10 pts » et « 40 € » : le premier seuil mesure environ
	   trois cents pixels a ce corps, et se voyait recouvert par le deuxieme. La
	   largeur utile divisee par trois donne 349 px, ce qui laisse de la marge au
	   plus long des trois. Vu en REGARDANT le PNG — aucune erreur n avait ete
	   levee. */
	const COLONNE = Math.floor((LARGEUR - 2 * marge) / 3);
	const seuils = seuilsDeLaLoi()
		.map((s, i) => {
			const x = marge + i * COLONNE;
			return `
<text x="${x}" y="512" font-family="${AFFICHE}" font-size="46" font-weight="600" letter-spacing="-1" fill="${CRAIE}">${s.valeur}</text>
<text x="${x}" y="545" font-family="${SANS}" font-size="17" fill="${CRAIE_DOUCE}">${s.quoi}</text>`;
		})
		.join('');

	return `<svg width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" xmlns="http://www.w3.org/2000/svg">
<rect width="${LARGEUR}" height="${HAUTEUR}" fill="${NUIT}"/>

<!-- Le logotype, à la brosse et en capitales, comme dans la barre du site. -->
<g transform="translate(${marge} 62) scale(0.46)">${marque()}</g>
<text x="${marge + 62}" y="104" font-family="${BROSSE}" font-size="40" fill="${CRAIE}" letter-spacing="2">LETIKETTE</text>

<!-- LE RAIL TECHNIQUE, tireté, comme en tête de chaque section de la page. -->
<line x1="${marge}" y1="146" x2="${LARGEUR - marge}" y2="146" stroke="${FILET}" stroke-width="1" stroke-dasharray="4 4"/>
<text x="${marge}" y="176" font-family="${SANS}" font-size="15" fill="${CRAIE_SOURDE}" letter-spacing="2.4">CODE DE COMMERCE</text>
<text x="${LARGEUR - marge}" y="176" text-anchor="end" font-family="${SANS}" font-size="15" fill="${CRAIE_SOURDE}" letter-spacing="2.4">${articles()}</text>

<!-- L'accroche. La première ligne baisse la voix, la seconde porte la
     révélation : c'est l'emphase par la VALEUR, la seule dont dispose une page
     en noir et blanc. Deux lignes posées à la main, faute de retour auto. -->
<text x="${marge}" y="288" font-family="${AFFICHE}" font-size="66" font-weight="600" letter-spacing="-1.6" fill="${CRAIE_CLAIRE}">${ACCROCHE.eteint}</text>
<text x="${marge}" y="356" font-family="${AFFICHE}" font-size="66" font-weight="600" letter-spacing="-1.6" fill="${CRAIE}">${ACCROCHE.vif}</text>

<text x="${marge}" y="406" font-family="${SANS}" font-size="20" fill="${CRAIE_DOUCE}">Letikette surveille cette date sur chacune de vos factures,</text>
<text x="${marge}" y="434" font-family="${SANS}" font-size="20" fill="${CRAIE_DOUCE}">et calcule au centime ce qui vous est dû.</text>

<line x1="${marge}" y1="466" x2="${LARGEUR - marge}" y2="466" stroke="${FILET}" stroke-width="1" stroke-dasharray="4 4"/>
${seuils}
<line x1="${marge}" y1="578" x2="${LARGEUR - marge}" y2="578" stroke="${FILET}" stroke-width="1" stroke-dasharray="4 4"/>
<text x="${marge}" y="606" font-family="${SANS}" font-size="17" fill="${CRAIE_DOUCE}">letikette.com</text>
<text x="${LARGEUR - marge}" y="606" text-anchor="end" font-family="${SANS}" font-size="17" fill="${CRAIE_DOUCE}">Trente jours d’essai</text>
</svg>`;
}

const polices = [
	await police(
		'@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2',
		'inter-tight'
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
