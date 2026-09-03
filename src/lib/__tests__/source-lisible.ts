/**
 * Ce qu'un fichier source dit VRAIMENT, commentaires retirés.
 *
 * Partagé par les deux garde-fous qui balaient le dépôt — le mot « garantie »
 * et les références d'articles — pour la même raison : un commentaire doit
 * pouvoir expliquer un interdit sans le déclencher. Un test qui ne peut pas se
 * documenter finit contourné, et c'est comme ça qu'on perd la règle qu'il
 * gardait.
 *
 * CE QUE ÇA COÛTE, ET C'EST ASSUMÉ. Une règle recopiée DANS un commentaire
 * échappe aux deux balayages. C'est le prix à payer pour qu'ils restent
 * lisibles, et il est plus faible que l'inverse : les deux fautes qu'on cherche
 * — une promesse affichée, un article cité à l'écran — sont dans le code rendu,
 * jamais dans un commentaire.
 *
 * VOLONTAIREMENT NAÏF. Une occurrence de `//` à l'intérieur d'une chaîne — une
 * URL, par exemple — fait perdre la fin de la ligne. Le coût de cette
 * approximation est un faux négatif sur ces lignes-là ; le coût de l'inverse,
 * un analyseur syntaxique complet, serait un garde-fou que plus personne ne
 * relit.
 */
export function sansCommentaires(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}
