import type { ReactNode } from 'react';
import { Link, useRouterState, CatchBoundary } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Surface, Toolbar, ToolbarButton, Button, Chip } from '@cladd-ui/react';
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
 * la tablette en paysage est le format de référence. Une barre haute coûte de
 * la hauteur une fois, rend toute la largeur au contenu, et se replie
 * naturellement en barre basse sur téléphone.
 *
 * ELLE FLOTTE. Elle n'est pas collée aux bords derrière un filet : c'est une
 * surface arrondie posée sur le fond chaud, avec une ombre basse. La
 * différence n'est pas décorative — un bandeau bordé lit « chrome
 * d'application de gestion », une surface posée lit « objet ». C'est la même
 * grammaire que les cartes du contenu, et c'est ce qui fait tenir l'ensemble.
 *
 * LA PASTILLE. « À confirmer » porte le nombre de produits en attente, sur
 * tous les écrans. C'est la seule chose que le gérant doit faire lui-même : ne
 * pas l'afficher en permanence, c'est lui demander d'aller vérifier s'il a du
 * travail — exactement ce qu'un logiciel est censé lui éviter.
 */

const ENTREES = [
	{ to: '/app', label: 'Mes taux', Icone: GaugeIcon },
	{ to: '/app/confirmer', label: 'À confirmer', Icone: CheckCheckIcon },
	{ to: '/app/factures', label: 'Factures', Icone: FileTextIcon },
	{ to: '/app/diagnostics', label: 'Diagnostics', Icone: FileCheck2Icon }
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
 *
 * La règle, ici, est absolue : rien de facultatif ne s'affiche dans la barre
 * sans passer par cette frontière.
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

export function Barre() {
	const actif = useActif();

	return (
		<header className="shrink-0 p-cladd-3xs pb-0">
			<Surface
				outline
				className="rounded-full shadow-carte"
				contentClassName="flex items-center gap-cladd-3xs p-2"
			>
				<Link
					to="/app"
					aria-label="Mycelium, retour à vos taux"
					className="flex shrink-0 items-center gap-cladd-3xs pl-1"
				>
					{/*
					  La marque en pastille pleine plutôt qu'en glyphe posé sur le fond.
					  `cladd-color-brand` fait résoudre `--cladd-primary` au bleu
					  d'encre ; sans cette classe, le logo hériterait du gris des
					  surfaces neutres et la barre n'aurait aucune signature.
					*/}
					<span className="cladd-color-brand flex size-11 items-center justify-center rounded-full bg-cladd-primary text-cladd-on-primary">
						<LogoMycelium className="h-4 w-auto" />
					</span>
					<span className="hidden text-cladd-sm font-semibold tracking-tight lg:block">
						Mycelium
					</span>
				</Link>

				{/*
				  La navigation centrale, dans un `Toolbar` transparent : le groupe
				  n'a pas besoin de son propre logement, il est déjà DANS la barre.
				  L'entrée active est la seule à porter une surface — c'est elle, et
				  elle seule, qui doit se lire comme un contrôle réel.
				*/}
				<Toolbar
					variant="transparent"
					outline={false}
					className="mx-auto hidden md:block"
					contentClassName="gap-1"
				>
					{ENTREES.map(({ to, label, Icone }) => {
						const ici = actif(to);
						return (
							<ToolbarButton
								key={to}
								as={Link}
								to={to}
								rounded
								variant={ici ? 'gradient' : 'transparent'}
								outline={ici}
								color={ici ? 'brand' : undefined}
								aria-current={ici ? 'page' : undefined}
								// En dessous de 1024px le libellé disparaît et le bouton se
								// referme sur son icône : mesuré à 36px de large, sous le
								// plancher tactile de 48. La hauteur, elle, restait bonne —
								// c'est le genre de manque qu'on ne voit jamais sans mesurer,
								// et qui fait rater une cible sur deux au doigt.
								className="min-w-cladd-md"
							>
								<Icone />
								<span className="hidden lg:inline">{label}</span>
								{to === '/app/confirmer' ? (
									<Facultatif>
										<PastilleChip />
									</Facultatif>
								) : null}
							</ToolbarButton>
						);
					})}
				</Toolbar>

				<div className="ml-auto flex shrink-0 items-center gap-cladd-3xs">
					<Facultatif>
						<SelecteurEtablissement />
					</Facultatif>

					{/* Même piège que la navigation : sous 640px le libellé disparaît et
					    le bouton se referme sous le plancher tactile. `min-w` le tient
					    à 48px, et `rounded` en fait alors un cercle franc plutôt qu'un
					    rectangle presque carré. */}
					<Button
						as={Link}
						to="/app/factures"
						color="brand"
						variant="solid-fill"
						rounded
						className="min-w-cladd-md"
					>
						<CameraIcon />
						<span className="hidden sm:inline">Déposer</span>
					</Button>

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
			</Surface>
		</header>
	);
}

/**
 * La barre basse du téléphone.
 *
 * Elle flotte elle aussi, au-dessus du contenu et au-dessus de la zone de
 * geste système : une barre collée au bord bas se fait manger par le trait
 * d'accueil d'iOS, et le dernier onglet devient inatteignable.
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
