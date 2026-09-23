import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche, LogoLetikette, MotLetikette } from '../ui';

/**
 * La barre de la page publique.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE SE CONTRACTE EN PILULE, ET C'EST DU CSS — PLUS UNE LIGNE DE SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La version précédente lisait `window.scrollY` par `useSyncExternalStore`
 * pour basculer une classe. C'était propre, et c'était quand même un abonnement
 * au défilement, un instantané, une divergence d'hydratation à éviter et un
 * rendu React à chaque franchissement du seuil — pour une transition de
 * couleur.
 *
 * `animation-timeline: scroll()` fait tout le travail dans la feuille de style,
 * sur le compositeur : voir `.barre-pilule` dans `app.css`. Le composant n'a
 * plus d'état, plus d'effet, plus de crochet. Ce qu'on y gagne n'est pas la
 * performance — c'est qu'il n'y a plus rien à casser.
 *
 * ⚠️ ET ELLE FAIT MAINTENANT DAVANTAGE QUE CHANGER DE FOND. En haut de page
 * elle tient toute la largeur, sans cadre : le premier écran commence vraiment
 * au premier pixel. Dès qu'on défile, elle se RESSERRE et DESCEND d'un cran —
 * elle cesse d'être le bord de la page pour devenir un objet posé dessus.
 * C'est le geste des barres qu'on reconnaît (Superpower, Frontify, Coda), et
 * il n'est pas gratuit : une barre qui se détache dit qu'on a quitté le haut,
 * ce qu'une simple apparition de fond dit beaucoup moins bien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE EST SOMBRE SUR TOUTE LA PAGE, Y COMPRIS SUR LES SECTIONS CLAIRES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une barre qui s'accorde à la section qu'elle survole demande de savoir OÙ
 * elle est : un observateur d'intersection, une liste de sections à tenir à
 * jour, et un rendu React par section franchie. Pour rien — une pilule d'encre
 * à texte craie se lit aussi bien sur le noir du héros que sur le crème des
 * sections suivantes. Le problème ne se pose plus, donc le code qui l'aurait
 * résolu n'existe pas.
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

export function Navbar() {
	return (
		// ⚠️ `pointer-events-none` SUR LE RAIL, `auto` SUR LA PILULE. Le rail tient
		// toute la largeur en permanence : sans ça, il intercepterait les clics sur
		// les deux coins hauts du héros, qui sont vides et donc insoupçonnables.
		<div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-cladd-3xs md:px-cladd-sm">
			<div className="barre-pilule pointer-events-auto flex items-center gap-cladd-3xs px-cladd-3xs py-2 text-craie sm:gap-cladd-2xs sm:px-cladd-2xs">
				{/* ⚠️ LE MOT DISPARAÎT SOUS 640 PX, ET C'EST UN DÉBORDEMENT MESURÉ, PAS
				    une préférence. À 375 px, la pilule offre 303 px à son contenu ;
				    le logo (36) plus le mot (96) plus l'action (190) en demandent 322.
				    La pilule blanche — c'est-à-dire l'appel à l'action de toute la
				    page — se faisait couper par le bord droit de l'écran.

				    C'est le logotype qui cède, et pas l'action : une marque se
				    reconnaît à sa marque, et celle-ci reste. */}
				<Link
					to="/"
					aria-label="Letikette, accueil"
					className="flex shrink-0 items-center gap-cladd-3xs"
				>
					<LogoLetikette className="size-9 shrink-0" />
					<MotLetikette className="hidden sm:inline" />
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
							className="rounded-full px-cladd-3xs py-2 text-cladd-xs font-medium text-craie-douce transition-colors hover:bg-craie/10 hover:text-craie"
						>
							{label}
						</a>
					))}
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-cladd-3xs">
					<Link
						to="/connexion"
						className="hidden rounded-full px-cladd-3xs py-2 text-cladd-xs font-medium text-craie-douce transition-colors hover:text-craie sm:block"
					>
						Se connecter
					</Link>
					<BoutonAffiche as={Link} to="/inscription" size="sm">
						Voir mes créances
						<ArrowRightIcon />
					</BoutonAffiche>
				</div>
			</div>
		</div>
	);
}
