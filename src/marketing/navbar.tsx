import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche, LogoLetikette, MotLetikette } from '../ui';

/**
 * LA BARRE PUBLIQUE — une pilule de verre crème qui flotte sur la page.
 *
 * Quatre ancres courtes au centre, et rien d'autre : la page se lit d'un seul
 * défilement, et une barre chargée de liens ferait croire à un site de dix
 * pages. L'action principale à droite, la connexion en simple texte.
 *
 * ⚠️ LES ANCRES SONT DANS LE FLUX, PAS CENTRÉES EN ABSOLU : centrées sur la
 * pilule, elles chevauchaient « Se connecter » à 1280 px (mesuré le 06/10/2026).
 *
 * ⚠️ LES ANCRES DISPARAISSENT SOUS 1024 PX. Sur téléphone, la pilule garde la
 * marque et le bouton : trois liens de plus feraient passer le bouton à la
 * ligne, et c'est le seul geste que la barre doit offrir partout.
 */
const SECTIONS = [
	{ ancre: '#comment', label: 'Logiciel' },
	{ ancre: '#securite', label: 'Sécurité' },
	{ ancre: '#tarifs', label: 'Tarifs' },
	{ ancre: '#faq', label: 'FAQ' }
] as const;

export function Navbar() {
	return (
		<div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-cladd-3xs md:px-cladd-sm">
			<div className="barre-creme pointer-events-auto relative flex items-center gap-cladd-3xs px-cladd-3xs py-2 text-encre-site sm:gap-cladd-2xs sm:px-cladd-2xs">
				<Link
					to="/"
					aria-label="Letikette, accueil"
					className="flex shrink-0 items-center gap-cladd-3xs"
				>
					<LogoLetikette className="size-9 shrink-0" />
					<MotLetikette className="hidden sm:inline" />
				</Link>

				<nav aria-label="Sections de la page" className="mx-auto hidden items-center gap-1 lg:flex">
					{SECTIONS.map(({ ancre, label }) => (
						<a
							key={ancre}
							href={ancre}
							className="rounded-full px-cladd-3xs py-2 text-cladd-xs font-medium text-encre-site-douce transition-colors hover:bg-teinte-abricot hover:text-encre-site"
						>
							{label}
						</a>
					))}
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-cladd-3xs">
					<Link
						to="/connexion"
						className="hidden rounded-full px-cladd-3xs py-2 text-cladd-xs font-medium text-encre-site-douce transition-colors hover:text-encre-site sm:block"
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
