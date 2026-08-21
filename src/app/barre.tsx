import { useState, type ReactNode } from 'react';
import { Link, useRouterState, useNavigate, CatchBoundary } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import {
	Surface,
	SurfaceCut,
	Segmented,
	SegmentedButton,
	SearchField,
	Button,
	Chip
} from '@cladd-ui/react';
import {
	CameraIcon,
	GaugeIcon,
	CheckCheckIcon,
	FileTextIcon,
	FileCheck2Icon,
	SettingsIcon
} from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import { cn } from '../ui/cn';
import { LogoMycelium } from '../ui/logo';
import { SelecteurEtablissement } from './selecteur-etablissement';

/**
 * La barre de navigation.
 *
 * POURQUOI EN HAUT, ET PLUS SUR LE CÔTÉ. Le rail vertical coûtait de la
 * largeur en permanence, sur un produit dont l'écran principal est une grille
 * de cartes : chaque pixel pris à gauche est une colonne de moins à 1024 px, et
 * la tablette en paysage est le format de référence.
 *
 * SA COMPOSITION, ET POURQUOI ELLE TIENT. Une première version posait les
 * quatre onglets à plat, étiquetés, dans une capsule blanche flottante. Deux
 * défauts qui se cumulent : quatre libellés côte à côte occupent la moitié de
 * la barre sans qu'aucun ne ressorte, et une capsule posée sur le fond donne un
 * bandeau qui flotte au-dessus du contenu au lieu de le coiffer.
 *
 * Ici : la barre est un BANDEAU, sur le fond de page, refermé par un filet.
 * Elle ne dispute rien au contenu. Les onglets vivent dans un groupe CREUSÉ —
 * `SurfaceCut`, la surface enfoncée du kit — et un seul porte son étiquette :
 * celui où l'on est. Les autres sont des icônes. On lit donc « je suis ici »
 * d'un coup d'œil, au lieu de comparer quatre mots.
 *
 * `Segmented` fait exactement ça et le fait mieux qu'un assemblage à la main :
 * l'onglet actif remonte de deux niveaux de surface, ce qui le pose en relief
 * dans le creux, et il devient non cliquable — appuyer sur la page où l'on est
 * déjà ne recharge rien.
 */

const ENTREES = [
	{ to: '/app', label: 'Mes taux', Icone: GaugeIcon },
	{ to: '/app/confirmer', label: 'À confirmer', Icone: CheckCheckIcon },
	{ to: '/app/produits', label: 'Produits', Icone: FileTextIcon },
	{ to: '/app/declaration', label: 'Déclaration', Icone: FileCheck2Icon }
] as const;

function useActif() {
	const chemin = useRouterState({ select: (s) => s.location.pathname });
	return (to: string) => (to === '/app' ? chemin === '/app' : chemin.startsWith(to));
}

/**
 * Ce qui, en échouant, ne doit RIEN emporter.
 *
 * Tout ce qui interroge Convex depuis la barre — le compteur, le sélecteur
 * d'établissement — lève quand la session manque : au chargement, après une
 * expiration, ou dans la salle d'exposition qui rend la coquille sans
 * authentification. Sans isolation, un ornement facultatif emporte la
 * NAVIGATION ENTIÈRE et renvoie le gérant sur un écran d'erreur, alors qu'il
 * lui suffisait de ne pas voir une pastille.
 */
function Facultatif({ children }: { children: ReactNode }) {
	return (
		<CatchBoundary getResetKey={() => 'barre'} errorComponent={() => null}>
			{children}
		</CatchBoundary>
	);
}

/**
 * Le nombre de produits qui attendent le gérant.
 *
 * La requête est délibérément la plus légère du produit : elle est abonnée
 * depuis tous les écrans, et elle rend deux nombres, jamais la file.
 */
function useEnAttente(): number {
	const attente = useQuery(api.egalim.confirmation.compterAConfirmer, {});
	return attente?.produits ?? 0;
}

function PastilleChip() {
	const enAttente = useEnAttente();
	if (enAttente === 0) return null;
	// `size="sm"` : la rampe imbriquée de Cladd retire 8px, un chip `sm` dans un
	// bouton `md` tombe donc à la bonne proportion sans qu'on écrive une seule
	// hauteur.
	return (
		<Chip size="sm" color="brand">
			{enAttente}
		</Chip>
	);
}

function PastilleRonde() {
	const enAttente = useEnAttente();
	if (enAttente === 0) return null;
	return (
		<span className="absolute top-0.5 right-1/4 flex min-w-4 items-center justify-center rounded-full bg-cladd-primary px-1 text-cladd-4xs font-bold text-cladd-on-primary tabular-nums">
			{enAttente}
		</span>
	);
}

/**
 * La recherche de produit.
 *
 * Elle n'est pas un ornement de barre : c'est la seule porte d'entrée vers
 * « je veux revoir ce que vous avez décidé sur les carottes ». Sans elle, un
 * produit mal classé n'est plus atteignable une fois sorti de la file de
 * confirmation — et il pèse pourtant sur le taux toute l'année.
 */
function Recherche() {
	const navigate = useNavigate();
	const [terme, setTerme] = useState('');

	return (
		<SearchField
			value={terme}
			onChange={setTerme}
			placeholder="Rechercher un produit"
			className="hidden w-64 lg:block"
			onKeyDown={(e) => {
				if (e.key !== 'Enter') return;
				void navigate({ to: '/app/produits', search: { q: terme } });
			}}
		/>
	);
}

export function Barre() {
	const actif = useActif();

	return (
		<header className="shrink-0 border-b border-cladd-bg-outline">
			{/* Le rembourrage vertical est délibérément plus serré que l'horizontal :
			    le groupe de navigation porte déjà son propre logement de 8px, et le
			    cumuler avec 16px de bandeau donnait une barre de 89px. Sur une
			    tablette en paysage, chaque dizaine de pixels pris en haut est une
			    rangée de cartes en moins. */}
			<div className="flex items-center gap-cladd-2xs px-cladd-3xs py-2">
				<Link
					to="/app"
					aria-label="Mycelium, retour à vos taux"
					className="flex shrink-0 items-center gap-cladd-3xs"
				>
					{/*
					  La marque en pastille pleine plutôt qu'en glyphe posé sur le fond.
					  `cladd-color-brand` fait résoudre `--cladd-primary` au bleu
					  d'encre ; sans cette classe, le logo hériterait du gris des
					  surfaces neutres et la barre n'aurait aucune signature.
					*/}
					<span className="cladd-color-brand flex size-cladd-md items-center justify-center rounded-full bg-cladd-primary text-cladd-on-primary">
						<LogoMycelium className="h-4 w-auto" />
					</span>
					<span className="hidden text-cladd-sm font-bold tracking-tight xl:block">Mycelium</span>
				</Link>

				{/*
				  Le groupe creusé. `SurfaceCut` est la surface ENFONCÉE du kit : elle
				  dit « un logement », et l'onglet actif s'y pose en relief. Un
				  `Surface` ordinaire dirait l'inverse — un bloc posé sur la barre,
				  dans lequel plus rien ne peut ressortir.
				*/}
				<SurfaceCut
					as="nav"
					aria-label="Navigation principale"
					outline
					className="mx-auto hidden rounded-full md:block"
					contentClassName="p-1"
				>
					{/* `activeColor="neutral"` : mesuré au navigateur, la surface d'accent
						    du mode clair rend un bleu pâle à 0,93 de clarté — posé sur un
						    creux à 0,934, le segment actif était invisible. En neutre, il
						    remonte au blanc de la rampe inversée et se lit comme un contrôle
						    soulevé. L'accent reste dans le texte et les aplats pleins, jamais
						    dans les surfaces. */}
					<Segmented activeColor="neutral" activeVariant="solid">
						{ENTREES.map(({ to, label, Icone }) => {
							const ici = actif(to);
							return (
								<SegmentedButton
									key={to}
									as={Link}
									to={to}
									active={ici}
									aria-label={label}
									aria-current={ici ? 'page' : undefined}
									// Seul l'onglet où l'on est porte son étiquette. Les autres
									// se referment sur leur icône, et `min-w` les tient au
									// plancher tactile de 48px — sans quoi ils tombaient à 36.
									className="min-w-cladd-md"
								>
									<Icone />
									{ici ? <span className="hidden lg:inline">{label}</span> : null}
									{to === '/app/confirmer' ? (
										<Facultatif>
											<PastilleChip />
										</Facultatif>
									) : null}
								</SegmentedButton>
							);
						})}
					</Segmented>
				</SurfaceCut>

				<div className="ml-auto flex shrink-0 items-center gap-cladd-3xs">
					<Recherche />

					<Button
						as={Link}
						to="/app/factures"
						color="brand"
						variant="solid-fill"
						rounded
						className="min-w-cladd-md"
						aria-label="Déposer des factures"
					>
						<CameraIcon />
						<span className="hidden sm:inline">Déposer</span>
					</Button>

					<Facultatif>
						<SelecteurEtablissement />
					</Facultatif>

					<Button
						as={Link}
						to="/app/parametres"
						rounded
						square
						variant={actif('/app/parametres') ? 'gradient' : 'transparent'}
						outline={actif('/app/parametres')}
						aria-label="Réglages"
					>
						<SettingsIcon />
					</Button>
				</div>
			</div>
		</header>
	);
}

/**
 * La barre basse du téléphone.
 *
 * Elle flotte, au-dessus du contenu et au-dessus de la zone de geste système :
 * une barre collée au bord bas se fait manger par le trait d'accueil d'iOS, et
 * le dernier onglet devient inatteignable.
 *
 * Les libellés sont écrits sous les icônes plutôt que supprimés. « Diagnostics »
 * et « À confirmer » ne se devinent pas depuis un pictogramme, et un gérant qui
 * hésite ouvre les deux — deux gestes au lieu d'un, à chaque fois.
 */
export function BarreBasse() {
	const actif = useActif();

	return (
		/* `mb-safe` vient de Cladd : il reporte `env(safe-area-inset-bottom)`,
		   c'est-à-dire la hauteur du trait d'accueil d'iOS. Sans lui, la barre se
		   cale dessous et le dernier onglet ne se touche plus. */
		<nav
			aria-label="Navigation principale"
			className="fixed inset-x-0 bottom-0 z-40 mb-safe p-cladd-3xs md:hidden"
		>
			<Surface
				outline
				className="rounded-cladd-2xl shadow-carte-levee"
				contentClassName="flex items-stretch justify-around gap-1 p-1"
			>
				{ENTREES.map(({ to, label, Icone }) => {
					const ici = actif(to);
					return (
						<Link
							key={to}
							to={to}
							aria-current={ici ? 'page' : undefined}
							className={cn(
								'relative flex min-h-cladd-md flex-1 flex-col items-center justify-center gap-0.5 rounded-cladd-lg px-1 py-1 transition-colors',
								ici ? 'bg-cladd-primary/10 text-cladd-primary' : 'text-cladd-fg-softer'
							)}
						>
							<Icone size={20} />
							<span className="text-cladd-4xs leading-none font-medium">{label}</span>
							{to === '/app/confirmer' ? (
								<Facultatif>
									<PastilleRonde />
								</Facultatif>
							) : null}
						</Link>
					);
				})}
			</Surface>
		</nav>
	);
}
