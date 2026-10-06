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
 * ELLE EST SUR LE PAPIER CHAUD, comme la page depuis le 06/10/2026 : crème,
 * encre bleue, galets et titre en serif. Le noir de l'ancienne page est parti
 * avec elle.
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
/* Les jetons du papier chaud (`tokens.css`), convertis d'oklch en sRGB :
   resvg ne lit pas oklch. */
const CREME = '#fbf6ec';
const ENCRE = '#1b253f';
const ENCRE_DOUCE = '#3f485b';
const ENCRE_CLAIRE = '#5c6374';
const TEINTE_ARGENT = '#dbebff';
const TEINTE_PAPIERS = '#d2f2fa';
const TEINTE_TEMPS = '#ece2ff';

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
// Le nom de famille INTERNE du fichier variable (table name, id 1) : « Newsreader »
// seul ne trouve rien, et resvg rend alors le texte dans la fonte par défaut.
const SERIF = 'Newsreader 16pt 16pt';
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

	const seuils = [{ valeur: 'BCE + 10 pts', quoi: 'de pénalités de retard' }];

	if (estUtilisable(indemnite) && indemnite.valeur !== null) {
		const euros = Number(indemnite.valeur) / 100;
		seuils.push({ valeur: `${euros.toLocaleString('fr-FR')} €`, quoi: 'par facture en retard' });
	}

	seuils.push({ valeur: `${general.dureeAnnees} ans`, quoi: 'pour agir en justice' });
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
const ACCROCHE = { eteint: 'Relancez vos factures impayées', vif: 'au bon montant, et à temps.' };

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
	   CHEVAUCHER « BCE + 10 pts » et « 40 € ». La largeur utile divisee par trois
	   laisse de la marge au plus long des trois. */
	const COLONNE = Math.floor((LARGEUR - 2 * marge) / 3);
	const TEINTES = [TEINTE_ARGENT, TEINTE_PAPIERS, TEINTE_TEMPS];
	const seuils = seuilsDeLaLoi()
		.map((s, i) => {
			const x = marge + i * COLONNE;
			return `
<rect x="${x}" y="452" width="${COLONNE - 18}" height="116" rx="20" fill="${TEINTES[i] ?? TEINTE_ARGENT}"/>
<text x="${x + 24}" y="512" font-family="${SERIF}" font-size="44" font-weight="500" fill="${ENCRE}">${s.valeur}</text>
<text x="${x + 24}" y="545" font-family="${SANS}" font-size="17" fill="${ENCRE_DOUCE}">${s.quoi}</text>`;
		})
		.join('');

	return `<svg width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 ${LARGEUR} ${HAUTEUR}" xmlns="http://www.w3.org/2000/svg">
<rect width="${LARGEUR}" height="${HAUTEUR}" fill="${CREME}"/>


<!-- Le logotype, à la brosse et en capitales, comme dans la barre du site. -->
<g transform="translate(${marge} 58) scale(0.46)">${marque()}</g>
<text x="${marge + 62}" y="100" font-family="${BROSSE}" font-size="40" fill="${ENCRE}" letter-spacing="2">LETIKETTE</text>

<!-- À qui ça s'adresse, en une ligne : plus de pastille (06/10/2026 au soir). -->
<text x="${marge}" y="178" font-family="${SANS}" font-size="19" font-weight="600" fill="${ENCRE_DOUCE}">Logiciel de recouvrement pour les PME</text>

<!-- L'accroche en serif, d'une seule valeur. -->
<text x="${marge}" y="270" font-family="${SERIF}" font-size="68" font-weight="500" fill="${ENCRE}">${ACCROCHE.eteint}</text>
<text x="${marge}" y="346" font-family="${SERIF}" font-size="68" font-weight="500" fill="${ENCRE}">${ACCROCHE.vif}</text>

<text x="${marge}" y="406" font-family="${SANS}" font-size="20" fill="${ENCRE_DOUCE}">Letikette calcule les pénalités et les frais dus sur chaque facture,</text>
<text x="${marge}" y="432" font-family="${SANS}" font-size="20" fill="${ENCRE_DOUCE}">surveille les délais et prépare vos relances.</text>

${seuils}
<text x="${marge}" y="606" font-family="${SANS}" font-size="17" fill="${ENCRE_CLAIRE}">letikette.com · ${articles()}</text>
<text x="${LARGEUR - marge}" y="606" text-anchor="end" font-family="${SANS}" font-size="17" font-weight="600" fill="${ENCRE_DOUCE}">30 jours d’essai, sans carte bancaire</text>
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
