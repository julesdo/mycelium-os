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
