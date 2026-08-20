/**
 * La marque Mycelium.
 *
 * Trois traits obliques qui se rejoignent : un réseau qui se ramifie, comme le
 * mycélium dont le produit tire son nom.
 *
 * Reprise de `static/logo.svg`, qui obtenait le même dessin par un détour :
 * trois chemins servaient de masque à un rectangle noir, le tout dans un
 * `clipPath` sans effet visible. Les couleurs déclarées dans ce masque
 * (`#0092B8`, le cyan de l'ancienne marque) ne s'affichaient jamais — seule leur
 * opacité comptait. Le dessin sortait donc en noir, quoi qu'on écrive dedans.
 *
 * Ici les trois chemins sont dessinés directement, en `currentColor` : la
 * couleur se décide à l'endroit où le logo est posé, suit le thème clair ou
 * sombre, et ne peut pas se désaccorder de l'accent. C'est aussi la seule forme
 * compatible avec la règle qui interdit les couleurs littérales hors des tokens.
 *
 * Le `viewBox` est resserré sur les bornes réelles du dessin (x 16, y 28,
 * 47 × 25), déclarées par le masque d'origine. Le fichier d'origine réservait
 * un carré de 80 × 80 dont le dessin n'occupait qu'une bande centrale : à la
 * taille du rail, il aurait paru minuscule et flottant.
 */
export function LogoMycelium({ className }: { className?: string }) {
	return (
		<svg
			viewBox="16 28 47 25"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Mycelium"
			className={className}
		>
			<path d="M35.3725 30.541C33.6234 28.0769 30.2538 27.5307 27.8464 29.3209C25.4389 31.1112 24.9052 34.56 26.6544 37.0241L36.1539 50.4068C37.903 52.8709 41.2726 53.4171 43.68 51.6268C46.0875 49.8366 46.6211 46.3877 44.872 43.9236L35.3725 30.541Z" />
			<path d="M51.5629 30.541C49.8138 28.0769 46.4443 27.5307 44.0368 29.3209C41.6294 31.1112 41.0957 34.56 42.8448 37.0241L52.3443 50.4068C54.0934 52.8709 57.463 53.4171 59.8704 51.6268C62.2779 49.8366 62.8116 46.3877 61.0625 43.9236L51.5629 30.541Z" />
			<path d="M35.2085 36.9433C36.9574 34.4795 36.4238 31.0312 34.0167 29.2411C31.6096 27.4511 28.2405 27.9973 26.4916 30.461L17.1664 43.5981C15.4175 46.0618 15.9511 49.5102 18.3582 51.3002C20.7654 53.0903 24.1345 52.5441 25.8834 50.0803L35.2085 36.9433Z" />
		</svg>
	);
}
