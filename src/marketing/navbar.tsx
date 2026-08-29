import { useSyncExternalStore } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { cn, LogoLetikette, MotLetikette } from '../ui';

/**
 * La barre de la page publique.
 *
 * CE QU'ELLE ÉTAIT, ET POURQUOI ÇA NE TENAIT PAS. Une rangée dans le héros :
 * le logo à gauche, « Se connecter » à droite, rien au milieu. Deux défauts qui
 * se cumulent. Elle ne proposait AUCUN chemin — un visiteur qui veut savoir ce
 * que la loi demande, ou combien ça coûte, n'avait que le défilement. Et elle
 * disparaissait au premier écran franchi, donc l'appel à l'action aussi : sur
 * une page de deux mille pixels, c'est la moitié des visiteurs qui arrivent en
 * bas sans jamais avoir eu de bouton sous les yeux.
 *
 * ⚠️ ELLE EST POSÉE SUR LE HÉROS, PAS AU-DESSUS DE LUI. Elle a d'abord été un
 * bandeau collant, opaque, en flux : elle POUSSAIT le héros vers le bas et
 * portait son propre fond crème. Résultat, une bande claire barrait le haut du
 * lavis et le premier écran commençait sous un couvercle.
 *
 * En `fixed`, elle sort du flux et flotte sur le dégradé : on voit l'azur PASSER
 * DERRIÈRE le logo et les boutons, et le héros commence vraiment en haut de la
 * fenêtre. Le prix à payer est un retrait supérieur sur le héros, qu'aucune mise
 * en page ne calcule à sa place — d'où `--spacing-barre-publique`, écrit une
 * fois et lu aux deux endroits.
 *
 * LE FOND N'ARRIVE QU'AU DÉFILEMENT. En haut de page, il n'y a qu'un filet sous
 * la barre ; dès que la page bouge, le crème et son flou montent en un tiers de
 * seconde. C'est la seule façon d'avoir les deux : un premier écran ininterrompu,
 * et une barre lisible quand elle passe sur du texte, des photographies ou
 * l'aplat d'encre.
 *
 * POURQUOI `useSyncExternalStore` ET PAS UN `useState` DANS UN EFFET. La
 * position de défilement est un état qui vit HORS de React, et la convention du
 * projet interdit d'appeler `setState` depuis un effet. Ce crochet est fait
 * exactement pour ça : il s'abonne, il lit, et son troisième argument donne
 * l'instantané du rendu SERVEUR — faux par construction, puisqu'il n'y a pas de
 * fenêtre. On lui répond « pas défilé », qui est vrai au premier rendu et évite
 * la divergence d'hydratation qu'un `window.scrollY` provoquerait.
 *
 * L'instantané rend un BOOLÉEN et jamais la position elle-même : React compare
 * par identité et redemanderait un rendu à chaque pixel parcouru.
 *
 * LE LIEN DE SECTION N'EST PAS UN LIEN DE ROUTEUR. `<a href="#la-loi">` vise
 * une ancre de la MÊME page ; passer par `Link` demanderait au routeur de
 * recharger la route pour ne rien changer. Les identifiants correspondants sont
 * posés sur les sections concernées, et un test de la page les vérifie.
 *
 * SUR TÉLÉPHONE, LES SECTIONS DISPARAISSENT et il reste le logo et l'action.
 * C'est délibéré : quatre libellés compressés dans 375px donnent une rangée
 * illisible, et un menu déplié en tiroir est trois cents lignes de code pour
 * une page dont on fait de toute façon défiler la totalité.
 */

const SECTIONS = [
	{ ancre: '#la-loi', label: 'La loi' },
	{ ancre: '#comment', label: 'Le logiciel' },
	{ ancre: '#preuve', label: 'La preuve' },
	{ ancre: '#tarifs', label: 'Le prix' }
] as const;

/** Huit pixels : assez pour ignorer le rebond élastique d'un trackpad. */
const DECLENCHEMENT = 8;

function sAbonner(prevenir: () => void) {
	window.addEventListener('scroll', prevenir, { passive: true });
	return () => window.removeEventListener('scroll', prevenir);
}

function useDefile(): boolean {
	return useSyncExternalStore(
		sAbonner,
		() => window.scrollY > DECLENCHEMENT,
		() => false
	);
}

export function Navbar() {
	const defile = useDefile();

	return (
		<div
			className={cn(
				'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ease-out',
				// Le filet est là dès le premier pixel, et il est le seul. Sur le lavis
				// comme sur le crème, une plume à dix pour cent donne le trait le plus
				// fin qui se voit encore — `border-trait`, réglé pour le sable, s'y
				// efface complètement.
				defile ? 'border-trait bg-papier/85 backdrop-blur-md' : 'border-plume/10 bg-transparent'
			)}
		>
			<div className="relative mx-auto flex w-full max-w-7xl items-center gap-cladd-2xs px-cladd-2xs py-cladd-3xs">
				<Link
					to="/"
					aria-label="Letikette, accueil"
					className="flex shrink-0 items-center gap-cladd-3xs"
				>
					<LogoLetikette className="size-11 shrink-0" />
					<MotLetikette />
				</Link>

				{/* Centrée sur la BARRE, pas sur l'espace qui reste. Trois marges
				    automatiques — une de chaque côté de la navigation, une devant les
				    actions — se partagent le vide à parts égales, et le groupe du
				    milieu se retrouve décalé de la moitié de l'écart entre le logo et
				    les boutons. Le décalage est petit, constant, et c'est exactement le
				    genre de chose qui fait « à peu près » sans qu'on sache pourquoi. */}
				<nav
					aria-label="Sections de la page"
					className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex"
				>
					{SECTIONS.map(({ ancre, label }) => (
						<a
							key={ancre}
							href={ancre}
							className="rounded-full px-cladd-3xs py-2 text-cladd-xs font-medium text-plume-douce transition-colors hover:bg-plume/5 hover:text-plume"
						>
							{label}
						</a>
					))}
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-cladd-3xs">
					<Button
						as={Link}
						to="/connexion"
						variant="transparent"
						rounded
						className="hidden sm:flex"
					>
						Se connecter
					</Button>
					<Button as={Link} to="/inscription" color="brand" variant="solid-fill" rounded>
						Calculer mes taux
						<ArrowRightIcon />
					</Button>
				</div>
			</div>
		</div>
	);
}
