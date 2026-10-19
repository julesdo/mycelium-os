import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, ChevronDownIcon, MenuIcon, XIcon } from 'lucide-react';
import { BoutonAffiche, FAMILLES, LogoLetikette, MotLetikette, Plume, cn } from '../ui';
import { articlesPublies } from './blog';
import { FONCTIONNALITES, TEINTE_DE_LA_FAMILLE, type Fonctionnalite } from './fonctionnalites';
import { SCENES_DES_METIERS } from './scenes-metiers';
import {
	NOMS_DES_SECTEURS,
	PUBLICS_DES_SECTEURS,
	SECTEURS_PUBLICS,
	type SecteurPublic
} from './secteurs';
import { Photo, fondDeTeinte } from './section';

/**
 * LA BARRE PUBLIQUE : pleine largeur, collée en haut, un filet dessous
 * (06/10/2026, au soir). La barre de Mailchimp, Mercury, Ramp.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE MENU « LOGICIEL » LIT LE REGISTRE (14/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La barre portait quatre ancres, et le site ne disait rien de la moitié du
 * produit. Au-delà de 1024 px, « Logiciel » ouvre un panneau à la manière
 * d'Intercom : chaque fonction du registre (`FONCTIONNALITES`), sa vignette de
 * famille, son nom et une demi-ligne. Une fonction ajoutée au registre entre
 * au menu sans toucher ce fichier.
 *
 * ⚠️ SOUS 1024 PX, LA BARRE N'AVAIT AUCUN LIEN : on n'allait aux tarifs ou au
 * blog qu'en descendant. Un bouton rond « Menu » ouvre désormais une page
 * pleine, comme toute modale du produit : les fonctions en cartes, les pages,
 * la connexion, et le seul bouton plein en pied.
 *
 * ⚠️ ET « MÉTIERS » MÈNE AUX PAGES MÉTIER (19/10/2026) : elles n'étaient jointes que
 * par le pied de page. Le même panneau, une photo et un public par métier.
 *
 * ⚠️ LES ANCRES PASSENT PAR « / » : la barre sert aussi le blog et les pages
 * légales, où `#tarifs` seul ne mènerait nulle part.
 */
const PAGES = [
	{ vers: '/securite', label: 'Sécurité' },
	{ vers: '/tarifs', label: 'Tarifs' },
	{ vers: '/#faq', label: 'Questions' }
] as const;

const LIEN =
	'rounded-full px-cladd-3xs py-2 text-cladd-sm font-medium text-encre-site-douce transition-colors hover:text-encre-site';

/** La vignette d'une fonction : Plume en personne, ou le pictogramme de sa famille. */
function Vignette({ fonctionnalite }: { fonctionnalite: Fonctionnalite }) {
	if (fonctionnalite.cle === 'plume') {
		return (
			<span className="light flex size-10 shrink-0 items-center justify-center rounded-cladd-sm bg-teinte-abricot">
				<Plume humeur="repos" taille={30} decoratif />
			</span>
		);
	}
	const { Picto } = FAMILLES[fonctionnalite.famille];
	return (
		<span
			className={cn(
				'flex size-10 shrink-0 items-center justify-center rounded-cladd-sm',
				fondDeTeinte(TEINTE_DE_LA_FAMILLE[fonctionnalite.famille])
			)}
		>
			<Picto className="size-5 text-encre-site" />
		</span>
	);
}

function EntreeDuMenu({
	fonctionnalite,
	onChoisir,
	carte = false
}: {
	fonctionnalite: Fonctionnalite;
	onChoisir: () => void;
	carte?: boolean;
}) {
	return (
		<a
			href={fonctionnalite.ancre}
			onClick={onChoisir}
			className={cn(
				'flex min-h-14 items-center gap-cladd-3xs rounded-cladd-xl p-cladd-3xs transition-colors',
				carte ? 'bg-papier shadow-carte-chaude' : 'hover:bg-creme-profonde'
			)}
		>
			<Vignette fonctionnalite={fonctionnalite} />
			<span className="flex min-w-0 flex-col">
				<span className="text-cladd-sm leading-snug font-semibold text-encre-site">
					{fonctionnalite.nom}
				</span>
				<span className="text-cladd-2xs leading-snug text-encre-site-douce">
					{fonctionnalite.resume}
				</span>
			</span>
		</a>
	);
}

/** Une page métier : sa photo, son nom, son public. */
function EntreeMetier({
	secteur,
	onChoisir,
	carte = false
}: {
	secteur: SecteurPublic;
	onChoisir: () => void;
	carte?: boolean;
}) {
	const scene = SCENES_DES_METIERS[secteur];
	return (
		<Link
			to="/secteurs/$secteur"
			params={{ secteur }}
			onClick={onChoisir}
			className={cn(
				'flex min-h-14 items-center gap-cladd-3xs rounded-cladd-xl p-cladd-3xs transition-colors',
				carte ? 'bg-papier shadow-carte-chaude' : 'hover:bg-creme-profonde'
			)}
		>
			<span className="size-10 shrink-0 overflow-hidden rounded-cladd-sm">
				<Photo
					photo={scene.photo}
					description=""
					sizes="40px"
					className={cn('size-10', scene.cadrage)}
				/>
			</span>
			<span className="flex min-w-0 flex-col">
				<span className="text-cladd-sm leading-snug font-semibold text-encre-site">
					{NOMS_DES_SECTEURS[secteur]}
				</span>
				<span className="text-cladd-2xs leading-snug text-encre-site-douce">
					{PUBLICS_DES_SECTEURS[secteur]}
				</span>
			</span>
		</Link>
	);
}

/** Un panneau qui pend sous la barre, au-delà de 1024 px : « Logiciel », « Métiers ». */
function MenuDeroulant({
	libelle,
	id,
	children
}: {
	libelle: string;
	id: string;
	children: (fermer: () => void) => ReactNode;
}) {
	const [ouvert, setOuvert] = useState(false);
	const zone = useRef<HTMLDivElement | null>(null);

	// Échap et un clic ailleurs le referment.
	useEffect(() => {
		if (!ouvert) return;
		const auClavier = (evenement: KeyboardEvent) => {
			if (evenement.key === 'Escape') setOuvert(false);
		};
		const auClic = (evenement: MouseEvent) => {
			if (zone.current !== null && !zone.current.contains(evenement.target as Node))
				setOuvert(false);
		};
		document.addEventListener('keydown', auClavier);
		document.addEventListener('mousedown', auClic);
		return () => {
			document.removeEventListener('keydown', auClavier);
			document.removeEventListener('mousedown', auClic);
		};
	}, [ouvert]);

	return (
		<div
			ref={zone}
			className="relative"
			onMouseEnter={() => setOuvert(true)}
			onMouseLeave={() => setOuvert(false)}
		>
			<button
				type="button"
				aria-expanded={ouvert}
				aria-controls={id}
				onClick={() => setOuvert((o) => !o)}
				className={cn(LIEN, 'flex items-center gap-1', ouvert && 'text-encre-site')}
			>
				{libelle}
				<ChevronDownIcon
					aria-hidden
					size={16}
					className={cn('transition-transform', ouvert && 'rotate-180')}
				/>
			</button>
			{/* Le panneau pend sous la barre ; la marge transparente au-dessus garde le
			    survol quand le pointeur descend du bouton vers lui. */}
			<div id={id} hidden={!ouvert} className="absolute top-full left-0 pt-cladd-3xs">
				<div className="grid w-max grid-cols-2 gap-1 rounded-carte-site border border-filet-creme bg-papier p-cladd-3xs shadow-carte-chaude">
					{children(() => setOuvert(false))}
				</div>
			</div>
		</div>
	);
}

/** Le panneau « Logiciel » : chaque fonction du registre. */
function MenuLogiciel() {
	return (
		<MenuDeroulant libelle="Logiciel" id="menu-logiciel">
			{(fermer) =>
				FONCTIONNALITES.map((fonctionnalite) => (
					<EntreeDuMenu
						key={fonctionnalite.cle}
						fonctionnalite={fonctionnalite}
						onChoisir={fermer}
					/>
				))
			}
		</MenuDeroulant>
	);
}

/** Le panneau « Métiers » : une page par métier. */
function MenuMetiers() {
	return (
		<MenuDeroulant libelle="Métiers" id="menu-metiers">
			{(fermer) =>
				SECTEURS_PUBLICS.map((secteur) => (
					<EntreeMetier key={secteur} secteur={secteur} onChoisir={fermer} />
				))
			}
		</MenuDeroulant>
	);
}

/** Le menu du téléphone : une page pleine, comme toute modale du produit. */
function MenuPleinePage({ onFermer }: { onFermer: () => void }) {
	// La page derrière ne défile plus tant que le menu est ouvert.
	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const auClavier = (evenement: KeyboardEvent) => {
			if (evenement.key === 'Escape') onFermer();
		};
		document.addEventListener('keydown', auClavier);
		return () => {
			document.body.style.overflow = avant;
			document.removeEventListener('keydown', auClavier);
		};
	}, [onFermer]);

	const blog = articlesPublies().length > 0;
	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Menu"
			className="fixed inset-0 z-50 flex flex-col bg-creme text-encre-site"
		>
			<div className="flex h-barre-publique shrink-0 items-center gap-cladd-2xs border-b border-filet-creme px-cladd-2xs">
				<Link
					to="/"
					onClick={onFermer}
					aria-label="Letikette, accueil"
					className="flex items-center gap-cladd-3xs"
				>
					<LogoLetikette className="size-8 shrink-0" />
					<MotLetikette />
				</Link>
				<button
					type="button"
					onClick={onFermer}
					aria-label="Fermer le menu"
					className="ml-auto flex size-11 items-center justify-center rounded-full bg-papier shadow-carte-chaude"
				>
					<XIcon size={20} aria-hidden />
				</button>
			</div>

			<div className="flex flex-1 flex-col gap-cladd-xs overflow-y-auto px-cladd-2xs py-cladd-xs">
				<p className="text-cladd-sm font-semibold text-encre-site-douce">Le logiciel</p>
				<div className="flex flex-col gap-cladd-3xs">
					{FONCTIONNALITES.map((fonctionnalite) => (
						<EntreeDuMenu
							key={fonctionnalite.cle}
							fonctionnalite={fonctionnalite}
							onChoisir={onFermer}
							carte
						/>
					))}
				</div>
				<p className="text-cladd-sm font-semibold text-encre-site-douce">Par métier</p>
				<div className="flex flex-col gap-cladd-3xs">
					{SECTEURS_PUBLICS.map((secteur) => (
						<EntreeMetier key={secteur} secteur={secteur} onChoisir={onFermer} carte />
					))}
				</div>
				<nav aria-label="Pages" className="flex flex-col border-t border-filet-creme pt-cladd-3xs">
					{PAGES.map(({ vers, label }) => (
						<a
							key={vers}
							href={vers}
							onClick={onFermer}
							className="py-cladd-3xs text-cladd-md font-semibold"
						>
							{label}
						</a>
					))}
					{blog ? (
						<Link
							to="/blog"
							onClick={onFermer}
							className="py-cladd-3xs text-cladd-md font-semibold"
						>
							Blog
						</Link>
					) : null}
					<Link
						to="/connexion"
						onClick={onFermer}
						className="py-cladd-3xs text-cladd-md font-semibold"
					>
						Se connecter
					</Link>
				</nav>
			</div>

			<div className="shrink-0 border-t border-filet-creme px-cladd-2xs py-cladd-3xs">
				<BoutonAffiche as={Link} to="/inscription" fond="jour" className="w-full justify-center">
					Essayer gratuitement
					<ArrowRightIcon />
				</BoutonAffiche>
			</div>
		</div>
	);
}

export function Navbar() {
	const [menu, setMenu] = useState(false);
	// Une seule fonction pour toute la vie de la barre : l'effet du menu en dépend.
	const fermer = useCallback(() => setMenu(false), []);
	const blog = articlesPublies().length > 0;

	return (
		<>
			<div className="barre-publique fixed inset-x-0 top-0 z-40 text-encre-site">
				<div className="mx-auto flex h-barre-publique w-full max-w-6xl items-center gap-cladd-2xs px-cladd-2xs md:px-cladd-sm">
					<Link
						to="/"
						aria-label="Letikette, accueil"
						className="flex shrink-0 items-center gap-cladd-3xs"
					>
						<LogoLetikette className="size-8 shrink-0" />
						<MotLetikette className="hidden sm:inline" />
					</Link>

					<nav aria-label="Le site" className="ml-cladd-sm hidden items-center gap-1 lg:flex">
						<MenuLogiciel />
						<MenuMetiers />
						{PAGES.map(({ vers, label }) => (
							<a key={vers} href={vers} className={LIEN}>
								{label}
							</a>
						))}
						{/* Le blog n'apparaît qu'une fois un article publié : un lien vers une
						    page vide ferait plus de tort que pas de lien. */}
						{blog ? (
							<Link to="/blog" className={LIEN}>
								Blog
							</Link>
						) : null}
					</nav>

					<div className="ml-auto flex shrink-0 items-center gap-cladd-3xs">
						<Link to="/connexion" className={cn(LIEN, 'hidden lg:block')}>
							Se connecter
						</Link>
						<BoutonAffiche as={Link} to="/inscription" size="sm" fond="jour">
							Essayer gratuitement
							<ArrowRightIcon />
						</BoutonAffiche>
						<button
							type="button"
							onClick={() => setMenu(true)}
							aria-label="Ouvrir le menu"
							aria-expanded={menu}
							className="flex size-10 items-center justify-center rounded-full border border-filet-creme bg-papier lg:hidden"
						>
							<MenuIcon size={18} aria-hidden />
						</button>
					</div>
				</div>
			</div>
			{menu ? <MenuPleinePage onFermer={fermer} /> : null}
		</>
	);
}
