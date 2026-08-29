import { Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { LogoLetikette, MotLetikette } from '../ui';

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
 * ELLE COLLE, ET ELLE EST TRANSLUCIDE. Le lavis du héros continue de se voir
 * dessous, ce qui évite le bandeau opaque qui coupe la page en deux. Le flou
 * d'arrière-plan n'est pas un effet : sans lui, les dessins du fond passent
 * derrière le texte de la barre et le rendent illisible dès qu'on défile.
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
	{ ancre: '#abonnement', label: 'L’abonnement' }
] as const;

export function Navbar() {
	return (
		<div className="sticky top-0 z-50 w-full border-b border-trait bg-papier/80 backdrop-blur-md">
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
							className="rounded-full px-cladd-3xs py-2 text-cladd-xs font-medium text-plume-douce transition-colors hover:bg-papier-chaud hover:text-plume"
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
