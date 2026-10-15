/**
 * Ce que rend un modèle d'e-mail : sa version HTML et sa version texte, toujours
 * les deux (une partie texte manquante fait plus souvent classer en indésirable).
 */
export type RenderedEmail = {
	html: string;
	text: string;
};
