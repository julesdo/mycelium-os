/**
 * LA RÉPONSE SANS LE MESSAGE QU'ELLE CITE (16/10/2026).
 *
 * Un e-mail de réponse porte, sous quelques mots, tout le fil précédent. Le plus fiable est un
 * délimiteur posé en tête de chacun de nos e-mails (comme Zendesk) : on ne garde que ce qui est
 * au-dessus. Pour un message qui n'en porte pas, on coupe aux formules d'en-tête de réponse
 * des messageries (française et anglaise), à la signature mobile, puis aux lignes citées `>`.
 * Le message entier reste conservé et lisible derrière « Voir le message entier » ; si la coupe
 * ne laisse rien, on rend le message entier.
 */

export const DELIMITEUR = '##- Répondez au-dessus de cette ligne -##';

/** Les lignes qui ouvrent une citation : « Le … a écrit : », « On … wrote: », « De : », « -----Original ». */
const OUVERTURES: readonly RegExp[] = [
	/^\s*Le .{4,200}a écrit\s*:\s*$/i,
	/^\s*On .{4,200}wrote\s*:\s*$/i,
	/^\s*-{2,}\s*(?:Message d'origine|Original Message|Message transféré|Forwarded message)\s*-{2,}/i,
	/^\s*(?:De|From)\s*:\s*.+$/i,
	/^\s*(?:Envoyé de mon|Sent from my)\s+\S+/i
];

export function retirerCitation(texte: string): { visible: string; coupe: boolean } {
	const entier = texte.replace(/\r\n/g, '\n');
	let lignes = entier.split('\n');
	let coupe = false;

	const indexDelimiteur = lignes.findIndex((ligne) => ligne.includes(DELIMITEUR));
	if (indexDelimiteur >= 0) {
		lignes = lignes.slice(0, indexDelimiteur);
		coupe = true;
	} else {
		const indexOuverture = lignes.findIndex((ligne) =>
			OUVERTURES.some((motif) => motif.test(ligne))
		);
		if (indexOuverture >= 0) {
			lignes = lignes.slice(0, indexOuverture);
			coupe = true;
		}
	}

	const sansCitees = lignes.filter((ligne) => !/^\s*>/.test(ligne));
	if (sansCitees.length !== lignes.length) coupe = true;

	const visible = sansCitees.join('\n').trim();
	if (visible === '') return { visible: entier.trim(), coupe: false };
	return { visible, coupe };
}

const ENTITES: Readonly<Record<string, string>> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	rsquo: '’',
	lsquo: '‘',
	laquo: '«',
	raquo: '»',
	eacute: 'é',
	egrave: 'è',
	agrave: 'à',
	ccedil: 'ç'
};

/**
 * UN E-MAIL HTML EN TEXTE, SANS DOM (le moteur de Convex n'en a pas). Le HTML n'est
 * JAMAIS stocké : seul ce texte l'est. Les scripts et les styles partent avec leur
 * contenu, les blocs deviennent des paragraphes, les entités se décodent.
 */
export function htmlEnTexte(html: string): string {
	return html
		.replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
		.replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
		.replace(/&([a-z]+);/gi, (entite, nom: string) => ENTITES[nom.toLowerCase()] ?? entite)
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}
