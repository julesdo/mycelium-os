// LA COQUILLE COMMUNE DES E-MAILS DE LETIKETTE (refaite le 15/10/2026).
//
// Le fondateur : « hyper moches et pas du tout pros, pas du tout dans la DA de
// l'application ni UX friendly ». Relevé chez Mercury, Linear, Stripe et Qonto : un
// fond calme, une carte blanche, la marque en tête, un titre qui dit l'essentiel,
// UN bouton, et le reste en petit. C'est la même matière que l'application — le
// papier chaud, l'encre, le titre en serif — pour qu'un e-mail se reconnaisse au
// premier coup d'œil, et que ce qu'on ouvre ensuite lui ressemble.
//
// LES CONTRAINTES DU COURRIEL, qui expliquent tout ce qui suit :
//
//   - Tableaux pour la mise en page : Outlook rend le HTML avec le moteur de Word,
//     qui ignore `flex`, `grid` et la moitié des marges.
//   - Styles en ligne. Une feuille dans le `<head>` ne sert qu'aux téléphones (le
//     rembourrage plus court), que Gmail et Apple Mail lisent.
//   - Les polices du produit (Newsreader, Plus Jakarta Sans) se chargent chez Apple
//     Mail et sur iOS ; ailleurs, Georgia et la police du système prennent le
//     relais, à la même place.
//   - Les images sont hébergées (`EMAIL_ASSET_URL`, `public/emails/`, régénérées par
//     `scripts/generer-images-emails.tsx`), et rien ne repose sur elles : bloquées,
//     la marque se lit encore en texte.
//   - 560 pixels de large : la colonne se lit d'un coup d'œil, sur un téléphone comme
//     sur un écran.
//   - En clair seulement (`color-scheme: light`) : un client qui inverse les couleurs
//     d'un e-mail sombre le rend illisible.
//
// LES COULEURS SONT ÉCRITES EN CLAIR, et c'est obligé : un courriel n'a pas accès
// aux variables CSS du produit. Elles sont celles du thème clair de l'app
// (`tokens.css`, converties depuis oklch) ; si la palette bouge, ce bloc bouge.
//
// ⚠️ PAS DE COULEUR DE SEUIL ICI. Le vert, l'ambre et le rouge ne disent qu'une
// chose dans ce produit ; un montant dû n'est ni l'un ni l'autre.

import { LEGAL_CONFIG, SITE_CANONIQUE, getLegalEmailAddress } from '../../../config/legal';

const ENCRE = '#1b253f';
const TEXTE = '#3f485b';
const DOUX = '#555c6c';
const DISCRET = '#6b7180';
const MARQUE = '#2f4fd8';
const PAPIER = '#f7f0e5';
const CARTE = '#ffffff';
const PANNEAU = '#faf6ee';
const FILET = '#e8e1d5';
const FILET_DOUX = '#efe8dc';

const POLICE =
	"'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const POLICE_TITRE = "'Newsreader', Georgia, 'Times New Roman', serif";

export type RangeeEmail = { readonly libelle: string; readonly valeur: string };

export type BlocEmail = {
	/** Ce que la boîte de réception affiche sous l'objet, avant qu'on ouvre. */
	readonly apercu: string;
	/** Plume en tête, quand c'est lui qui parle : le point du matin, la bienvenue. */
	readonly plume?: boolean;
	/** Le titre affiché en tête. Jamais l'objet du message, qui vit ailleurs. */
	readonly titre: string;
	/** Le premier paragraphe. */
	readonly intro: string;
	/** Le chiffre en vedette, dans un panneau : son libellé, sa valeur, une précision. */
	readonly montant?: {
		readonly libelle: string;
		readonly valeur: string;
		readonly precision?: string;
	};
	/** Des faits en rangées, le libellé à gauche et la valeur à droite. */
	readonly rangees?: readonly RangeeEmail[];
	/** Une liste courte : ce qui s'est passé, ce qui attend. */
	readonly points?: readonly string[];
	/** Les paragraphes qui suivent. */
	readonly corps?: readonly string[];
	/** Le seul bouton. `secours` écrit l'adresse en clair dessous, pour les liens qui expirent. */
	readonly bouton?: { readonly libelle: string; readonly url: string; readonly secours?: boolean };
	/** Une précision sous le bouton : « Ce lien expire dans 20 minutes. » */
	readonly apresBouton?: string;
	/** La ligne discrète du bas, qui dit pourquoi ce message arrive. */
	readonly note?: string;
	/** Le lien qui coupe ce genre de message en un clic (les conseils de Plume). */
	readonly desinscription?: string;
};

/**
 * Échappe ce qui part dans du HTML.
 *
 * Tout ce qui traverse cette coquille vient de la base : un nom d'établissement, un
 * libellé sorti d'une facture. Un `&` ou un `<` dans un nom casserait le rendu, et
 * un `<script>` dans un libellé serait pire.
 */
function echapper(valeur: string): string {
	return valeur
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/** L'adresse des images : celle du déploiement, à défaut le site public. */
function images(): string {
	return (process.env.EMAIL_ASSET_URL ?? SITE_CANONIQUE).replace(/\/$/, '');
}

/** L'adresse du site, pour les liens du pied. */
function site(): string {
	return (process.env.SITE_URL ?? SITE_CANONIQUE).replace(/\/$/, '');
}

/**
 * Les séparateurs de milliers, écrits à la main plutôt que par `Intl`.
 *
 * Ces fonctions tournent dans le moteur de Convex, dont le support d'`Intl` est
 * partiel et dépend de la version. Un `toLocaleString('fr-FR')` qui retomberait
 * silencieusement sur le format anglais donnerait « 1,842 lignes » à un gérant
 * français, c'est-à-dire un nombre à virgule.
 *
 * L'espace est insécable : un montant coupé en fin de ligne se lit mal, et un
 * client de messagerie coupe où il veut.
 */
/** Écrite par son code : tapée, elle est invisible, et un éditeur la remplace en silence. */
const INSECABLE = String.fromCharCode(0x00a0);

export function formaterEntier(n: number): string {
	const signe = n < 0 ? '-' : '';
	const chiffres = Math.abs(Math.round(n)).toString();
	let sortie = '';
	for (let i = 0; i < chiffres.length; i++) {
		if (i > 0 && (chiffres.length - i) % 3 === 0) sortie += INSECABLE;
		sortie += chiffres[i];
	}
	return signe + sortie;
}

export function formaterEuros(n: number): string {
	return `${formaterEntier(n)}${INSECABLE}€`;
}

function paragraphe(texte: string, taille = 15): string {
	return `<p style="margin:0 0 14px;font-family:${POLICE};font-size:${taille}px;line-height:1.65;color:${TEXTE}">${echapper(texte)}</p>`;
}

function blocMontant(m: NonNullable<BlocEmail['montant']>): string {
	return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;margin:6px 0 22px">
<tr><td bgcolor="${PANNEAU}" style="background-color:${PANNEAU};border:1px solid ${FILET_DOUX};border-radius:16px;padding:20px 22px">
<p style="margin:0 0 6px;font-family:${POLICE};font-size:13px;font-weight:600;color:${DOUX}">${echapper(m.libelle)}</p>
<p style="margin:0;font-family:${POLICE_TITRE};font-size:36px;line-height:1.1;font-weight:500;color:${ENCRE};white-space:nowrap">${echapper(m.valeur)}</p>
${m.precision ? `<p style="margin:8px 0 0;font-family:${POLICE};font-size:13px;line-height:1.5;color:${DOUX}">${echapper(m.precision)}</p>` : ''}
</td></tr></table>`;
}

function blocRangees(rangees: readonly RangeeEmail[]): string {
	const lignes = rangees
		.map(
			(r, i) => `<tr>
<td style="padding:12px 0;${i === 0 ? '' : `border-top:1px solid ${FILET_DOUX};`}font-family:${POLICE};font-size:14px;color:${DOUX}">${echapper(r.libelle)}</td>
<td align="right" style="padding:12px 0 12px 16px;${i === 0 ? '' : `border-top:1px solid ${FILET_DOUX};`}font-family:${POLICE};font-size:14px;font-weight:600;color:${ENCRE};text-align:right">${echapper(r.valeur)}</td>
</tr>`
		)
		.join('');
	return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:4px 0 22px;border-top:1px solid ${FILET};border-bottom:1px solid ${FILET}">${lignes}</table>`;
}

function blocPoints(points: readonly string[]): string {
	const lignes = points
		.map(
			(p) => `<tr>
<td valign="top" width="18" style="padding:3px 0 9px;font-family:${POLICE};font-size:15px;line-height:1.55;color:${MARQUE}">&#9679;</td>
<td style="padding:3px 0 9px;font-family:${POLICE};font-size:15px;line-height:1.55;color:${TEXTE}">${echapper(p)}</td>
</tr>`
		)
		.join('');
	return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:0 0 16px">${lignes}</table>`;
}

/**
 * LE BOUTON : une cellule de tableau colorée, pas un `<a>` stylé seul. C'est la
 * forme qu'Outlook rend avec sa hauteur et son fond. Il a la couleur du bouton
 * principal de l'application : l'encre, le papier écrit dessus.
 */
function blocBouton(b: NonNullable<BlocEmail['bouton']>): string {
	return `<table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;margin:10px 0 6px">
<tr><td align="center" bgcolor="${ENCRE}" style="background-color:${ENCRE};border-radius:999px">
<a href="${echapper(b.url)}" style="display:inline-block;padding:15px 30px;font-family:${POLICE};font-size:15px;font-weight:700;line-height:1;color:${PAPIER};text-decoration:none;border-radius:999px">${echapper(b.libelle)}</a>
</td></tr></table>`;
}

function blocSecours(url: string): string {
	return `<p style="margin:18px 0 0;font-family:${POLICE};font-size:12px;line-height:1.6;color:${DISCRET}">Le bouton ne s’ouvre pas&nbsp;? Copiez cette adresse dans votre navigateur&nbsp;:<br><a href="${echapper(url)}" style="color:${MARQUE};text-decoration:underline;word-break:break-all">${echapper(url)}</a></p>`;
}

export function coquilleHtml(bloc: BlocEmail): string {
	const base = images();
	const accueil = site();
	const aide = getLegalEmailAddress();

	const plume = bloc.plume
		? `<img src="${base}/emails/plume.png" width="88" height="88" alt="" style="display:block;width:88px;height:88px;margin:0 0 14px;border:0">`
		: '';

	const contenu = [
		plume,
		`<h1 class="titre" style="margin:0 0 12px;font-family:${POLICE_TITRE};font-size:28px;line-height:1.22;font-weight:500;letter-spacing:-0.01em;color:${ENCRE}">${echapper(bloc.titre)}</h1>`,
		paragraphe(bloc.intro, 16),
		bloc.montant ? blocMontant(bloc.montant) : '',
		bloc.rangees?.length ? blocRangees(bloc.rangees) : '',
		bloc.points?.length ? blocPoints(bloc.points) : '',
		(bloc.corps ?? []).map((p) => paragraphe(p)).join(''),
		bloc.bouton ? blocBouton(bloc.bouton) : '',
		bloc.apresBouton
			? `<p style="margin:10px 0 0;font-family:${POLICE};font-size:13px;line-height:1.55;color:${DOUX}">${echapper(bloc.apresBouton)}</p>`
			: '',
		bloc.bouton?.secours ? blocSecours(bloc.bouton.url) : '',
		bloc.note
			? `<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid ${FILET_DOUX};font-family:${POLICE};font-size:13px;line-height:1.6;color:${DISCRET}">${echapper(bloc.note)}</p>`
			: '',
		bloc.desinscription
			? `<p style="margin:10px 0 0;font-family:${POLICE};font-size:12px;line-height:1.6;color:${DISCRET}"><a href="${echapper(bloc.desinscription)}" style="color:${DOUX};text-decoration:underline">Ne plus recevoir les conseils de Plume</a></p>`
			: ''
	].join('\n');

	return `<!DOCTYPE html>
<html lang="fr"><head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${echapper(bloc.titre)}</title>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&amp;family=Plus+Jakarta+Sans:wght@400;600;700&amp;display=swap" rel="stylesheet">
<style>
:root { color-scheme: light; }
@media (max-width: 600px) {
  .cadre { padding: 20px 12px 32px !important; }
  .carte { padding: 28px 22px 26px !important; border-radius: 18px !important; }
  .titre { font-size: 25px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${PAPIER};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${PAPIER}">${echapper(bloc.apercu)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background-color:${PAPIER}">
<tr><td align="center" class="cadre" style="padding:36px 16px 44px">
<table width="560" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;max-width:560px;width:100%">
<tr><td style="padding:0 6px 20px">
<table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse"><tr>
<td style="padding:0 10px 0 0" valign="middle"><img src="${base}/emails/marque.png" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0"></td>
<td valign="middle" style="font-family:${POLICE_TITRE};font-size:21px;font-weight:500;color:${ENCRE};letter-spacing:-0.01em">Letikette</td>
</tr></table>
</td></tr>
<tr><td class="carte" bgcolor="${CARTE}" style="background-color:${CARTE};border:1px solid ${FILET};border-radius:20px;padding:36px 36px 32px">
${contenu}
</td></tr>
<tr><td align="center" style="padding:24px 12px 0;font-family:${POLICE};font-size:12px;line-height:1.7;color:${DISCRET}">
<a href="${accueil}/app" style="color:${DOUX};text-decoration:none;font-weight:600">Ouvrir Letikette</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:${aide}" style="color:${DOUX};text-decoration:none;font-weight:600">Nous écrire</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${accueil}/politique-de-confidentialite" style="color:${DOUX};text-decoration:none;font-weight:600">Confidentialité</a><br>
${echapper(LEGAL_CONFIG.brandName)}, ${echapper(LEGAL_CONFIG.address)}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/**
 * La version texte, obligatoire et pas décorative.
 *
 * Un e-mail sans partie texte part plus souvent en indésirable, et certains
 * clients n'affichent que celle-là. Elle se déduit du même bloc, donc les deux
 * versions ne peuvent pas raconter deux choses différentes.
 */
export function coquilleTexte(bloc: BlocEmail): string {
	const morceaux: string[] = [bloc.titre, '', bloc.intro];

	if (bloc.montant) {
		morceaux.push(
			'',
			`${bloc.montant.libelle} : ${bloc.montant.valeur}`,
			...(bloc.montant.precision ? [bloc.montant.precision] : [])
		);
	}
	if (bloc.rangees?.length) {
		morceaux.push('', ...bloc.rangees.map((r) => `${r.libelle} : ${r.valeur}`));
	}
	if (bloc.points?.length) {
		morceaux.push('', ...bloc.points.map((p) => `- ${p}`));
	}
	if (bloc.corps?.length) {
		morceaux.push('', ...bloc.corps.flatMap((p, i) => (i === 0 ? [p] : ['', p])));
	}
	if (bloc.bouton) {
		morceaux.push('', `${bloc.bouton.libelle} : ${bloc.bouton.url}`);
	}
	if (bloc.apresBouton) {
		morceaux.push(bloc.apresBouton);
	}
	if (bloc.note) {
		morceaux.push('', bloc.note);
	}
	if (bloc.desinscription) {
		morceaux.push(`Ne plus recevoir les conseils de Plume : ${bloc.desinscription}`);
	}
	morceaux.push(
		'',
		'--',
		`${LEGAL_CONFIG.brandName}, ${LEGAL_CONFIG.address}`,
		`Nous écrire : ${getLegalEmailAddress()}`
	);

	return morceaux.join('\n');
}
