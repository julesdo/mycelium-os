/**
 * La marque Letikette.
 *
 * Un L, construit avec exactement le vocabulaire de la marque précédente : des
 * capsules à bouts ronds, épaisses de 10,864 unités, rayon 5,432. Seule la
 * disposition change.
 *
 * D'OÙ ÇA VIENT. Le dessin précédent était trois capsules à 54,6°, dont deux
 * formaient un Λ : un réseau qui se ramifie, un mycélium, quand le produit
 * portait ce nom. À l'usage il se lisait surtout comme un M. Sous le nom
 * Letikette, un M ne veut plus rien dire, alors les mêmes formes se réarrangent
 * en L. Rien n'a été redessiné, ni épaissi, ni arrondi autrement.
 *
 * LA GÉOMÉTRIE, pour que la prochaine retouche n'ait pas à la redéduire. Chaque
 * capsule est un axe et un rayon. Le fût descend de (5,432 · 5,432) à
 * (5,432 · 25,432), le pied part de ce même point vers (19,432 · 25,432). Les
 * deux capuchons ronds coïncident dans l'angle, ce qui donne le coin arrondi
 * sans qu'aucun raccord ne soit dessiné. Chaque demi-cercle est approché par
 * deux cubiques dont les points de contrôle sont à 3 unités du bout, soit le
 * kappa habituel appliqué au rayon.
 *
 * LE `viewBox` N'EST PAS CENTRÉ, ET C'EST VOULU. Le dessin occupe 24,864 ×
 * 30,864, mais la boîte déclarée vaut `-1.5 0 26.364 32.364` : une unité et
 * demie de marge à gauche et en bas, aucune à droite ni en haut. Un L a toute
 * sa masse en bas à gauche et son vide en haut à droite, donc centré sur sa
 * boîte il paraît systématiquement tombé. Le centroïde de la forme est à
 * (9,31 · 18,55) quand le centre de la boîte est à (12,43 · 15,43) : la moitié
 * de cet écart, arrondie à 1,5, remet la marque au milieu de la pastille pour
 * l'œil. Corriger l'asymétrie de la boîte décentrerait le logo.
 *
 * Le fichier d'origine `static/logo.svg` faisait l'inverse et réservait un carré
 * de 80 × 80 dont le dessin n'occupait qu'une bande centrale : à la taille du
 * rail, il aurait paru minuscule et flottant.
 *
 * Les chemins sont remplis en `currentColor`, donc la couleur se décide à
 * l'endroit où le logo est posé, suit le thème clair ou sombre, et ne peut pas
 * se désaccorder de l'accent. C'est aussi la seule forme compatible avec la
 * règle qui interdit les couleurs littérales hors des tokens. L'ancien
 * `static/logo.svg` obtenait son dessin par un détour, trois chemins servant de
 * masque à un rectangle noir, avec un cyan (`#0092B8`) déclaré mais jamais
 * affiché.
 */
export function LogoLetikette({ className }: { className?: string }) {
	return (
		<svg
			viewBox="-1.5 0 26.364 32.364"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Letikette"
			className={className}
		>
			{/* Le fût. */}
			<path d="M0 5.432C0 2.432 2.432 0 5.432 0C8.432 0 10.864 2.432 10.864 5.432L10.864 25.432C10.864 28.432 8.432 30.864 5.432 30.864C2.432 30.864 0 28.432 0 25.432L0 5.432Z" />
			{/* Le pied. */}
			<path d="M5.432 30.864C2.432 30.864 0 28.432 0 25.432C0 22.432 2.432 20 5.432 20L19.432 20C22.432 20 24.864 22.432 24.864 25.432C24.864 28.432 22.432 30.864 19.432 30.864L5.432 30.864Z" />
		</svg>
	);
}
