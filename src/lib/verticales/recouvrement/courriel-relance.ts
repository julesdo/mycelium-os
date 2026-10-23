import { tailleDuLogo, teintesDuCourriel } from './marque';

/**
 * LA RELANCE QUE LE PILOTE ENVOIE, EN HTML — la lettre du créancier, et rien d'autre.
 *
 * ⚠️ PAS LA COQUILLE DES AUTRES COURRIELS (`disposition.ts`). Celle-là porte la
 * marque du produit ; celle-ci part chez le CLIENT du gérant, à son nom. C'est la
 * quatrième surface qui part vers un tiers, et elle tient la même règle que les
 * trois autres : elle ne nomme pas le logiciel, ne menace d'aucune procédure, et
 * ne fait rien remonter du débiteur (aucun pixel de suivi, aucune image hébergée,
 * aucun lien qui passe par nous).
 *
 * ⚠️ LE TEXTE EST CELUI DE LA LETTRE, MOT POUR MOT. Il vient des gabarits
 * (`relance.ts`, `gabarits/`), que leurs propres tests balaient ; ce fichier ne
 * fait que le mettre en page (15/10/2026) : le nom du créancier en tête, des
 * paragraphes qui se lisent sur un téléphone, les factures en rangées, et les
 * adresses qu'il cite rendues cliquables.
 *
 * ⚠️ SON IMAGE, QUAND IL L'A POSÉE (23/10/2026). Sans rien de posé, la lettre est
 * en gris neutres : c'est sa lettre, pas la nôtre. Avec son logo, le logo prend
 * la place du nom en tête ; avec sa couleur, une bande au haut de la lettre, les
 * liens et son nom au pied (assombris s'ils ne se liraient pas, `marque.ts`), et
 * le relevé des factures à peine teinté. Le logo voyage DANS l'e-mail (`cid:`) :
 * aucune image ne se charge depuis un serveur.
 *
 * ⚠️ L'APERÇU DE L'APPLICATION PASSE PAR ICI AUSSI. « Logo et couleurs » rend ce
 * même HTML, une adresse d'aperçu à la place du `cid:` : ce que le gérant voit
 * est ce que son client recevra.
 */

const TEXTE = '#24262b';
const DOUX = '#6a6e76';
const FOND = '#f4f4f2';
const CARTE = '#ffffff';
const FILET = '#e4e4e0';
const PANNEAU = '#f8f8f6';
const LIEN = '#24262b';
const POLICE =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Ce que le gérant a posé : son logo, et l'adresse d'où la lettre le lit. */
export interface MarqueDuCourriel {
	/** `cid:logo` à l'envoi ; une adresse d'aperçu dans l'application. */
	readonly logo?: {
		readonly src: string;
		readonly largeur: number;
		readonly hauteur: number;
	} | null;
	readonly couleur?: string | null;
}

/** Le nom du logo joint à l'e-mail, que la lettre appelle par `cid:`. */
export const CID_DU_LOGO = 'logo';

/** Les couleurs d'une lettre : les gris, ou ceux que la marque remplace. */
interface Palette {
	readonly lien: string;
	readonly panneau: string;
	readonly filet: string;
	readonly bande: string | null;
	readonly signature: string;
}

function paletteDe(marque: MarqueDuCourriel | undefined): Palette {
	const teintes = teintesDuCourriel(marque?.couleur);
	if (teintes === null) {
		return { lien: LIEN, panneau: PANNEAU, filet: FILET, bande: null, signature: DOUX };
	}
	return {
		lien: teintes.texte,
		panneau: teintes.panneau,
		filet: teintes.filet,
		bande: teintes.accent,
		signature: teintes.texte
	};
}

function echapper(texte: string): string {
	return texte
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Les adresses que la lettre cite (l'e-mail du créancier, un site) deviennent des
 * liens directs : `mailto:` ou l'adresse elle-même, jamais une redirection.
 * S'applique à du texte DÉJÀ échappé.
 */
function lier(html: string, couleur: string): string {
	return html
		.replace(
			/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g,
			(url) => `<a href="${url}" style="color:${couleur};text-decoration:underline">${url}</a>`
		)
		.replace(
			/(^|[\s(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g,
			(_tout, avant: string, adresse: string) =>
				`${avant}<a href="mailto:${adresse}" style="color:${couleur};text-decoration:underline">${adresse}</a>`
		);
}

/** Une ligne de liste dans la lettre : « — facture… » ou « – facture… ». */
const PUCE = /^[—–-]\s+/;

/** La puce s'efface et la rangée prend sa majuscule : « facture FA-12… » devient « Facture FA-12… ». */
function enRangee(ligne: string): string {
	const sans = ligne.replace(PUCE, '');
	return sans.charAt(0).toUpperCase() + sans.slice(1);
}

function enRangees(lignes: readonly string[], p: Palette): string {
	const rangees = lignes
		.map(
			(ligne, i) =>
				`<tr><td style="padding:12px 16px;${i === 0 ? '' : `border-top:1px solid ${p.filet};`}font-family:${POLICE};font-size:14px;line-height:1.55;color:${TEXTE}">${lier(echapper(enRangee(ligne)), p.lien)}</td></tr>`
		)
		.join('');
	return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;margin:0 0 18px;background-color:${p.panneau};border:1px solid ${p.filet};border-radius:12px">${rangees}</table>`;
}

function enParagraphe(bloc: string, p: Palette): string {
	return `<p style="margin:0 0 18px;font-family:${POLICE};font-size:15px;line-height:1.65;color:${TEXTE}">${lier(echapper(bloc), p.lien).replace(/\n/g, '<br>')}</p>`;
}

/** L'en-tête : le logo s'il est posé, sinon le nom, sinon rien. */
function enTete(nom: string | undefined, marque: MarqueDuCourriel | undefined): string {
	const logo = marque?.logo;
	if (logo !== null && logo !== undefined) {
		const { largeur, hauteur } = tailleDuLogo(logo.largeur, logo.hauteur);
		return `<tr><td style="padding:0 4px 16px"><img src="${echapper(logo.src)}" width="${largeur}" height="${hauteur}" alt="${echapper(nom ?? '')}" style="display:block;border:0;outline:none;text-decoration:none;width:${largeur}px;height:${hauteur}px"></td></tr>`;
	}
	return nom
		? `<tr><td style="padding:0 4px 16px;font-family:${POLICE};font-size:15px;font-weight:600;color:${TEXTE}">${echapper(nom)}</td></tr>`
		: '';
}

export function relanceHtml(corps: string, creancier?: string, marque?: MarqueDuCourriel): string {
	const p = paletteDe(marque);
	const contenu = corps
		.split(/\n{2,}/)
		.map((bloc) => bloc.trim())
		.filter((bloc) => bloc !== '')
		.map((bloc) => {
			const lignes = bloc.split('\n');
			return lignes.every((l) => PUCE.test(l)) ? enRangees(lignes, p) : enParagraphe(bloc, p);
		})
		.join('\n');

	const nom = creancier?.trim();
	const entete = enTete(nom, marque);
	const pied = nom
		? `<tr><td style="padding:18px 8px 0;font-family:${POLICE};font-size:12px;line-height:1.6;color:${DOUX}">Message de <span style="color:${p.signature};font-weight:600">${echapper(nom)}</span>. Pour répondre, répondez simplement à cet e-mail.</td></tr>`
		: '';
	const bande = p.bande === null ? '' : `border-top:4px solid ${p.bande};`;

	return `<!DOCTYPE html>
<html lang="fr"><head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<style>
:root { color-scheme: light; }
@media (max-width: 600px) {
  .cadre { padding: 16px 10px 28px !important; }
  .lettre { padding: 24px 20px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${FOND};-webkit-text-size-adjust:100%">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background-color:${FOND}">
<tr><td align="center" class="cadre" style="padding:32px 16px 40px">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;max-width:600px;width:100%">
${entete}
<tr><td class="lettre" bgcolor="${CARTE}" style="background-color:${CARTE};border:1px solid ${FILET};${bande}border-radius:16px;padding:32px 36px 16px">
${contenu}
</td></tr>
${pied}
</table>
</td></tr></table>
</body></html>`;
}
