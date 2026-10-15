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
 * adresses qu'il cite rendues cliquables. Les couleurs sont des gris neutres :
 * c'est sa lettre, pas la nôtre.
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
function lier(html: string): string {
	return html
		.replace(
			/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g,
			(url) => `<a href="${url}" style="color:${LIEN};text-decoration:underline">${url}</a>`
		)
		.replace(
			/(^|[\s(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g,
			(_tout, avant: string, adresse: string) =>
				`${avant}<a href="mailto:${adresse}" style="color:${LIEN};text-decoration:underline">${adresse}</a>`
		);
}

/** Une ligne de liste dans la lettre : « — facture… » ou « – facture… ». */
const PUCE = /^[—–-]\s+/;

/** La puce s'efface et la rangée prend sa majuscule : « facture FA-12… » devient « Facture FA-12… ». */
function enRangee(ligne: string): string {
	const sans = ligne.replace(PUCE, '');
	return sans.charAt(0).toUpperCase() + sans.slice(1);
}

function enRangees(lignes: readonly string[]): string {
	const rangees = lignes
		.map(
			(ligne, i) =>
				`<tr><td style="padding:12px 16px;${i === 0 ? '' : `border-top:1px solid ${FILET};`}font-family:${POLICE};font-size:14px;line-height:1.55;color:${TEXTE}">${lier(echapper(enRangee(ligne)))}</td></tr>`
		)
		.join('');
	return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;margin:0 0 18px;background-color:${PANNEAU};border:1px solid ${FILET};border-radius:12px">${rangees}</table>`;
}

function enParagraphe(bloc: string): string {
	return `<p style="margin:0 0 18px;font-family:${POLICE};font-size:15px;line-height:1.65;color:${TEXTE}">${lier(echapper(bloc)).replace(/\n/g, '<br>')}</p>`;
}

export function relanceHtml(corps: string, creancier?: string): string {
	const contenu = corps
		.split(/\n{2,}/)
		.map((bloc) => bloc.trim())
		.filter((bloc) => bloc !== '')
		.map((bloc) => {
			const lignes = bloc.split('\n');
			return lignes.every((l) => PUCE.test(l)) ? enRangees(lignes) : enParagraphe(bloc);
		})
		.join('\n');

	const nom = creancier?.trim();
	const entete = nom
		? `<tr><td style="padding:0 4px 16px;font-family:${POLICE};font-size:15px;font-weight:600;color:${TEXTE}">${echapper(nom)}</td></tr>`
		: '';
	const pied = nom
		? `<tr><td style="padding:18px 8px 0;font-family:${POLICE};font-size:12px;line-height:1.6;color:${DOUX}">Message de ${echapper(nom)}. Pour répondre, répondez simplement à cet e-mail.</td></tr>`
		: '';

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
<tr><td class="lettre" bgcolor="${CARTE}" style="background-color:${CARTE};border:1px solid ${FILET};border-radius:16px;padding:32px 36px 16px">
${contenu}
</td></tr>
${pied}
</table>
</td></tr></table>
</body></html>`;
}
