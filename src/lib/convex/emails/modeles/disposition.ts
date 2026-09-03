// La coquille commune aux e-mails produit.
//
// POURQUOI ELLE N'EST PAS FAITE COMME LES AUTRES MODÈLES. Les six modèles
// historiques sont des blocs de HTML générés depuis des composants Svelte, en
// anglais, dans la police et le gris de l'ancienne marque. Ce sont des sources
// figées qu'on ne régénère plus. Les recopier pour les e-mails produit aurait
// multiplié un artefact au lieu de l'éteindre.
//
// Ici le HTML est écrit à la main, en français, à l'identité Letikette, et
// UNE SEULE FOIS. Les trois e-mails produit ne décrivent que leur contenu.
//
// LES CONTRAINTES DU COURRIEL, qui expliquent tout ce qui suit et qui n'ont pas
// bougé depuis vingt ans :
//
//   - Tableaux pour la mise en page. Outlook rend le HTML avec le moteur de
//     Word, qui ignore `flex`, `grid` et la moitié des marges.
//   - Styles en ligne uniquement. Gmail retire les feuilles de style.
//   - Aucune police distante. On déclare une pile système ; Caveat Brush et
//     Plus Jakarta Sans ne se chargeront jamais dans une boîte aux lettres, et
//     un logotype en image est bloqué par défaut chez la plupart des clients.
//     La marque s'écrit donc en texte, en gras, dans le bleu d'encre.
//   - 600 pixels de large, c'est le dernier standard que tout le monde respecte.
//
// LES COULEURS SONT ÉCRITES EN CLAIR, et c'est obligé : un courriel n'a pas
// accès aux variables CSS du produit. Elles reprennent `src/ui/couleurs-
// impression.ts`, qui fait la même conversion pour le PDF. Si la palette bouge,
// ces deux fichiers bougent ensemble.

const ENCRE = '#1d3fa0';
const TEXTE = '#1e2431';
const DOUX = '#595e67';
const TRES_DOUX = '#757980';
const FOND = '#f6efec';
const CARTE = '#fdfaf9';
const FILET = '#e5dedc';

/** Les trois états de seuil. Ils ne signifient QUE ça, ici comme ailleurs. */
const SEUIL = {
	atteint: '#05893e',
	proche: '#de9300',
	manque: '#c92f33'
} as const;

export type EtatSeuil = keyof typeof SEUIL;

export type ChiffreEmail = {
	libelle: string;
	valeur: string;
	etat: EtatSeuil;
	precision?: string;
};

export type BlocEmail = {
	/** Le titre affiché en tête. Jamais l'objet du message, qui vit ailleurs. */
	titre: string;
	/** Le premier paragraphe. C'est lui qu'on lit dans l'aperçu. */
	intro: string;
	/** Les trois taux, quand l'e-mail en porte. */
	chiffres?: readonly ChiffreEmail[];
	/** Les paragraphes qui suivent. */
	corps?: readonly string[];
	bouton?: { libelle: string; url: string };
	/** La ligne discrète du bas, qui dit pourquoi ce message arrive. */
	note?: string;
};

/**
 * Échappe ce qui part dans du HTML.
 *
 * Tout ce qui traverse cette coquille vient de la base : un nom
 * d'établissement, un libellé de produit sorti d'une facture. Un `&` ou un `<`
 * dans un nom casserait le rendu, et un `<script>` dans un libellé serait pire.
 */
function echapper(valeur: string): string {
	return valeur
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

const PILE_POLICES =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Les séparateurs de milliers, écrits à la main plutôt que par `Intl`.
 *
 * Ces fonctions tournent dans le moteur de Convex, dont le support d'`Intl` est
 * partiel et dépend de la version. Un `toLocaleString('fr-FR')` qui retomberait
 * silencieusement sur le format anglais donnerait « 1,842 lignes » à un gérant
 * français, c'est-à-dire un nombre à virgule. Vingt lignes de code valent mieux
 * que ce risque-là.
 *
 * L'espace est insécable : un montant coupé en fin de ligne se lit mal, et un
 * client de messagerie coupe où il veut.
 */
export function formaterEntier(n: number): string {
	const signe = n < 0 ? '-' : '';
	const chiffres = Math.abs(Math.round(n)).toString();
	let sortie = '';
	for (let i = 0; i < chiffres.length; i++) {
		if (i > 0 && (chiffres.length - i) % 3 === 0) sortie += ' ';
		sortie += chiffres[i];
	}
	return signe + sortie;
}

export function formaterEuros(n: number): string {
	return `${formaterEntier(n)} €`;
}

function ligneChiffre(c: ChiffreEmail): string {
	return `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${FILET};font-family:${PILE_POLICES};font-size:15px;color:${TEXTE}">${echapper(c.libelle)}${
		c.precision
			? `<br><span style="font-size:13px;color:${TRES_DOUX}">${echapper(c.precision)}</span>`
			: ''
	}</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${FILET};font-family:${PILE_POLICES};font-size:22px;font-weight:700;color:${SEUIL[c.etat]};white-space:nowrap">${echapper(c.valeur)}</td>
</tr>`;
}

export function coquilleHtml(bloc: BlocEmail): string {
	const chiffres = bloc.chiffres?.length
		? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:8px 0 20px">
<tbody>${bloc.chiffres.map(ligneChiffre).join('')}</tbody>
</table>`
		: '';

	const corps = (bloc.corps ?? [])
		.map(
			(p) =>
				`<p style="margin:0 0 14px;font-family:${PILE_POLICES};font-size:15px;line-height:1.65;color:${DOUX}">${echapper(p)}</p>`
		)
		.join('');

	// Le bouton est une cellule de tableau colorée, pas un <a> stylé : c'est la
	// seule forme qu'Outlook rend avec sa hauteur et son fond.
	const bouton = bloc.bouton
		? `<table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:6px 0 4px">
<tbody><tr><td align="center" bgcolor="${ENCRE}" style="border-radius:10px">
<a href="${echapper(bloc.bouton.url)}" style="display:inline-block;padding:14px 26px;font-family:${PILE_POLICES};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${echapper(bloc.bouton.libelle)}</a>
</td></tr></tbody></table>`
		: '';

	const note = bloc.note
		? `<p style="margin:22px 0 0;font-family:${PILE_POLICES};font-size:12px;line-height:1.6;color:${TRES_DOUX}">${echapper(bloc.note)}</p>`
		: '';

	return `<!DOCTYPE html>
<html lang="fr"><head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${echapper(bloc.titre)}</title>
</head>
<body style="margin:0;padding:0;background-color:${FOND}">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;background-color:${FOND}">
<tbody><tr><td align="center" style="padding:28px 12px">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;max-width:600px;width:100%">
<tbody>
<tr><td style="padding:0 0 18px;font-family:${PILE_POLICES};font-size:19px;font-weight:700;letter-spacing:1px;color:${ENCRE}">LETIKETTE</td></tr>
<tr><td bgcolor="${CARTE}" style="border:1px solid ${FILET};border-radius:16px;padding:28px">
<h1 style="margin:0 0 12px;font-family:${PILE_POLICES};font-size:22px;line-height:1.3;font-weight:800;color:${TEXTE}">${echapper(bloc.titre)}</h1>
<p style="margin:0 0 16px;font-family:${PILE_POLICES};font-size:16px;line-height:1.65;color:${TEXTE}">${echapper(bloc.intro)}</p>
${chiffres}${corps}${bouton}${note}
</td></tr>
<tr><td style="padding:18px 4px 0;font-family:${PILE_POLICES};font-size:12px;line-height:1.6;color:${TRES_DOUX}">
Letikette mesure vos cr&eacute;ances impay&eacute;es &agrave; partir de vos factures, en surveille les &eacute;ch&eacute;ances et en produit le d&eacute;compte. Les relances, les proc&eacute;dures et les encaissements restent conduits par votre entreprise ou par le professionnel qu&rsquo;elle mandate.
</td></tr>
</tbody></table>
</td></tr></tbody></table>
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
	const morceaux: string[] = ['LETIKETTE', '', bloc.titre, '', bloc.intro];

	if (bloc.chiffres?.length) {
		morceaux.push('');
		for (const c of bloc.chiffres) {
			morceaux.push(`  ${c.libelle} : ${c.valeur}${c.precision ? ` (${c.precision})` : ''}`);
		}
	}
	if (bloc.corps?.length) {
		morceaux.push('', ...bloc.corps.flatMap((p) => [p, '']));
	}
	if (bloc.bouton) {
		morceaux.push('', `${bloc.bouton.libelle} : ${bloc.bouton.url}`);
	}
	if (bloc.note) {
		morceaux.push('', bloc.note);
	}
	morceaux.push(
		'',
		"Letikette mesure vos creances impayees a partir de vos factures, en surveille les echeances et en produit le decompte. Les relances, les procedures et les encaissements restent conduits par votre entreprise ou par le professionnel qu'elle mandate."
	);

	return morceaux.join('\n');
}
