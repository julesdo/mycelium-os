import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche, LogoLetikette, MotLetikette } from '../ui';
import { articlesPublies } from './blog';

/**
 * LA BARRE PUBLIQUE : pleine largeur, collée en haut, un filet dessous
 * (06/10/2026, au soir). Elle remplace la pilule de verre qui flottait au-dessus
 * de la page, un des tics relevés ; c'est la barre de Mailchimp, Mercury, Ramp.
 *
 * Quatre ancres courtes au centre, et rien d'autre : la page se lit d'un seul
 * défilement, et une barre chargée de liens ferait croire à un site de dix
 * pages. L'action principale à droite, la connexion en simple texte.
 *
 * ⚠️ LES ANCRES PASSENT PAR « / » : la barre sert aussi le blog et les pages
 * légales, où `#tarifs` seul ne mènerait nulle part.
 *
 * ⚠️ LES ANCRES DISPARAISSENT SOUS 1024 PX. Sur téléphone, la barre garde la
 * marque et le bouton : trois liens de plus feraient passer le bouton à la
 * ligne, et c'est le seul geste que la barre doit offrir partout.
 */
const SECTIONS = [
	{ ancre: '/#comment', label: 'Logiciel' },
	{ ancre: '/#securite', label: 'Sécurité' },
	{ ancre: '/#tarifs', label: 'Tarifs' },
	{ ancre: '/#faq', label: 'FAQ' }
] as const;

export function Navbar() {
	return (
		<div className="barre-publique fixed inset-x-0 top-0 z-50 text-encre-site">
			<div className="mx-auto flex h-barre-publique w-full max-w-6xl items-center gap-cladd-2xs px-cladd-2xs md:px-cladd-sm">
				<Link
					to="/"
					aria-label="Letikette, accueil"
					className="flex shrink-0 items-center gap-cladd-3xs"
				>
					<LogoLetikette className="size-8 shrink-0" />
					<MotLetikette className="hidden sm:inline" />
				</Link>

				<nav
					aria-label="Sections de la page"
					className="ml-cladd-sm hidden items-center gap-1 lg:flex"
				>
					{SECTIONS.map(({ ancre, label }) => (
						<a
							key={ancre}
							href={ancre}
							className="rounded-full px-cladd-3xs py-2 text-cladd-sm font-medium text-encre-site-douce transition-colors hover:text-encre-site"
						>
							{label}
						</a>
					))}
					{/* Le blog n'apparaît qu'une fois un article publié : un lien vers une
					    page vide ferait plus de tort que pas de lien. */}
					{articlesPublies().length > 0 ? (
						<Link
							to="/blog"
							className="rounded-full px-cladd-3xs py-2 text-cladd-sm font-medium text-encre-site-douce transition-colors hover:text-encre-site"
						>
							Blog
						</Link>
					) : null}
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-cladd-3xs">
					<Link
						to="/connexion"
						className="hidden rounded-full px-cladd-3xs py-2 text-cladd-sm font-medium text-encre-site-douce transition-colors hover:text-encre-site sm:block"
					>
						Se connecter
					</Link>
					<BoutonAffiche as={Link} to="/inscription" size="sm" fond="jour">
						Essayer gratuitement
						<ArrowRightIcon />
					</BoutonAffiche>
				</div>
			</div>
		</div>
	);
}
