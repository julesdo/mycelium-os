/**
 * La palette de l'application, convertie en sRGB pour l'impression.
 *
 * POURQUOI ELLE VIT ICI. Un PDF n'a pas de variables CSS : il veut des
 * couleurs littérales. La règle de lint qui les interdit ailleurs a raison —
 * c'est elle qui empêche chaque écran d'inventer son gris — et `src/ui` est la
 * zone où elle ne s'applique pas. Les poser à côté des tokens qu'elles
 * reflètent est aussi le seul moyen que quelqu'un qui retouche `tokens.css`
 * pense à les retoucher : dans le module PDF, personne ne les aurait trouvées.
 *
 * ELLES SONT CALCULÉES, PAS CHOISIES. Chaque valeur est la conversion OKLCH →
 * sRGB du token correspondant de `tokens.css`. Un diagnostic dont le vert n'est
 * pas le vert de l'écran fait douter le lecteur des deux.
 *
 * La règle des couleurs réservées vaut ici comme ailleurs : `atteint`, `proche`
 * et `manque` ne disent que le franchissement d'un seuil, jamais autre chose.
 */
export const COULEURS_IMPRESSION = {
	/** --color-seuil-atteint · oklch(0.55 0.15 150) */
	atteint: '#05893e',
	/** --color-seuil-proche · oklch(0.72 0.16 75) */
	proche: '#de9300',
	/** --color-seuil-manque · oklch(0.55 0.19 25) */
	manque: '#c92f33',
	/** --color-seuil-atteint-fond · oklch(0.94 0.05 150) */
	atteintFond: '#d5f5da',
	/** --color-seuil-proche-fond · oklch(0.95 0.055 75) */
	procheFond: '#ffeac6',
	/** --color-seuil-manque-fond · oklch(0.95 0.04 25) */
	manqueFond: '#ffe5e1',
	/** L'accent de marque, seed de --cladd-theme. */
	encre: '#1d3fa0',
	/** --cladd-fg · oklch(0.26 0.026 265) */
	texte: '#1e2431',
	/** --cladd-fg-soft · oklch(0.48 0.016 265) */
	doux: '#595e67',
	/** --cladd-fg-softer · oklch(0.575 0.012 265) */
	tresDoux: '#757980',
	/** --cladd-outline · oklch(0.906 0.008 44) */
	filet: '#e5dedc',
	/** --cladd-surface-cut · oklch(0.934 0.011 44) */
	creux: '#f0e7e3'
} as const;
