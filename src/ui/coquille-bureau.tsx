import { createContext, useContext, type ComponentType, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import type { LinkProps } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import { BellIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SearchIcon } from 'lucide-react';
import { cn } from './cn';
import { Lien } from './lien';
import { PastilleDeRappel } from './barre-du-bas';

/**
 * LA COQUILLE DU BUREAU : UNE BARRE LATÉRALE ET UNE BARRE DU HAUT, AU-DELÀ DE 1024 PX.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TÉLÉPHONE NE CHANGE PAS D'UN PIXEL (14/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « l'expérience desktop n'est pas du tout adaptée à la souris […]
 * sous forme de dashboard layout avec une sidebar et une top bar ça serait bien
 * mieux », et « rien toucher à la partie mobile ». Sur un bureau, le produit
 * gardait la coquille du téléphone : une pilule d'onglets en bas d'un écran de
 * 1 440 px, une colonne de 672 px au milieu, et l'établissement, la recherche et
 * la cloche serrés dans la barre d'« Aujourd'hui » seulement.
 *
 * Relevé sur Mobbin chez ceux qui ont le même problème — un produit d'argent
 * qu'on ouvre aussi bien au téléphone qu'au bureau : Mercury, Revolut Business,
 * Midday, Square, QuickBooks, Acctual. Partout la même charpente :
 *
 *   · À GAUCHE, la barre latérale : l'établissement en tête, les destinations
 *     groupées, le compte en pied. Une rangée de 36 px, le survol qui éclaire,
 *     l'entrée active posée sur une pastille claire.
 *   · EN HAUT, une barre de 56 px : le nom de la page (ou son fil d'Ariane), la
 *     recherche qu'on ouvre aussi au clavier, la cloche et le geste du jour.
 *   · L'ASSISTANT dans le coin bas droit, comme chez Quicken et Mercury : Plume y
 *     garde sa bulle et sa capsule (`barre-du-bas.tsx`, au-delà de 1024 px).
 *
 * ⚠️ TOUT CE QUI EST ICI EST `hidden lg:flex`. Sous 1024 px, ces éléments ne
 * s'affichent pas, ne se lisent pas et ne prennent aucune place : la coquille du
 * téléphone reste la seule. Ce fichier ne connaît ni le routeur ni Convex, comme
 * la barre du bas ; `app/coquille-bureau.tsx` le branche.
 */

// ─────────────────────────────────────────────────────────────────────────
// LE TITRE DE LA PAGE, DANS LA BARRE DU HAUT
// ─────────────────────────────────────────────────────────────────────────

/**
 * L'EMPLACEMENT DU TITRE, DANS LA BARRE DU HAUT.
 *
 * ⚠️ LA BARRE EST MONTÉE UNE FOIS, PAR LA COQUILLE ; LE TITRE APPARTIENT À LA PAGE.
 * Chaque écran pose le sien par un portail (`TitreBureau`), depuis son propre
 * en-tête (`PageEcran`, `EnteteDetail`) : la barre ne se remonte pas à chaque
 * navigation, et elle n'a pas à deviner le nom de ce qu'elle surmonte.
 *
 * Nul au premier affichage, rendu serveur compris : l'emplacement n'existe qu'une
 * fois la barre posée dans la page. Le titre arrive au rendu qui suit.
 */
const EmplacementDuTitre = createContext<HTMLElement | null>(null);

export const FournisseurDuTitreBureau = EmplacementDuTitre.Provider;

/** Pose ses enfants dans la barre du haut du bureau ; rien ailleurs. */
export function TitreBureau({ children }: { readonly children: ReactNode }) {
	const emplacement = useContext(EmplacementDuTitre);
	return emplacement === null ? null : createPortal(children, emplacement);
}

/** Le nom d'un onglet, dans la barre du haut. */
export function TitreDeBarre({ titre, sousTitre }: { titre: string; sousTitre?: string }) {
	return (
		<div className="flex min-w-0 items-baseline gap-2.5">
			<h1 className="truncate text-cladd-sm leading-tight font-semibold">{titre}</h1>
			{sousTitre ? <p className="truncate text-cladd-2xs text-cladd-fg-soft">{sousTitre}</p> : null}
		</div>
	);
}

/**
 * LE FIL D'ARIANE D'UNE PAGE POUSSÉE : d'où l'on vient, puis où l'on est.
 *
 * Le retour rond du téléphone devient ici un LIEN qui se lit — « Aujourd'hui ›
 * Fournitures Durand » —, comme chez Mercury et Stripe : à la souris, on vise un
 * mot, pas un disque de 36 px sans libellé.
 */
export function FilDAriane({
	retour,
	titre,
	sousTitre,
	dansUnVolet = false
}: {
	/** Le lien vers la page d'où l'on vient, déjà construit ; nul quand il n'a pas lieu d'être. */
	readonly retour: ReactNode | null;
	readonly titre: string;
	readonly sousTitre?: string;
	/**
	 * La page s'ouvre dans le volet droit d'une liste (la fiche d'un client à côté
	 * de « Vos clients ») : la liste a déjà posé son nom dans la barre, juste avant.
	 * Le fil continue le sien — « Vos clients / Imprimerie Delorme » —, et le nom de
	 * la page n'est pas un second `h1`.
	 */
	readonly dansUnVolet?: boolean;
}) {
	if (dansUnVolet) {
		return (
			<div className="flex min-w-0 items-center gap-1.5 pl-1.5">
				<span aria-hidden className="shrink-0 text-cladd-fg-softest">
					/
				</span>
				<p className="min-w-0 truncate text-cladd-xs leading-tight font-semibold">{titre}</p>
			</div>
		);
	}
	return (
		<div className="flex min-w-0 items-center gap-1.5">
			{retour === null ? null : (
				<>
					<span className="flex min-w-0 shrink-[2]">{retour}</span>
					<span aria-hidden className="shrink-0 text-cladd-fg-softest">
						/
					</span>
				</>
			)}
			<h1 className="min-w-0 shrink truncate text-cladd-xs leading-tight font-semibold">{titre}</h1>
			{sousTitre ? (
				<p className="hidden min-w-0 truncate text-cladd-2xs text-cladd-fg-soft xl:block">
					{sousTitre}
				</p>
			) : null}
		</div>
	);
}

/** La classe du lien de retour d'un fil d'Ariane : un mot qui s'éclaire au survol. */
export const CLASSE_RETOUR_FIL =
	'retour-fil inline-flex min-w-0 items-center truncate rounded-md px-1.5 py-1 text-cladd-xs text-cladd-fg-soft transition-colors hover:text-cladd-fg';

// ─────────────────────────────────────────────────────────────────────────
// LA BARRE DU HAUT
// ─────────────────────────────────────────────────────────────────────────

export function BarreHauteBureau({
	refTitre,
	outils
}: {
	/** L'emplacement du titre, que la coquille publie (`FournisseurDuTitreBureau`). */
	readonly refTitre: Ref<HTMLDivElement>;
	/** À droite : la recherche, la cloche, le geste du jour. */
	readonly outils?: ReactNode;
}) {
	return (
		<header className="chrome-haute hidden h-14 shrink-0 items-center gap-cladd-2xs px-cladd-sm lg:flex">
			<div ref={refTitre} className="flex min-w-0 flex-1 items-center" />
			<div className="flex shrink-0 items-center gap-2">{outils}</div>
		</header>
	);
}

/**
 * LA RECHERCHE DE LA BARRE DU HAUT — un déclencheur qui dit son raccourci.
 *
 * ⚠️ UN DÉCLENCHEUR, PAS UN CHAMP, comme au téléphone (`DeclencheurRecherche`) :
 * la palette porte le seul champ, et les premières lettres ne se perdent pas
 * pendant qu'elle s'ouvre. Il est large ici, parce qu'au bureau on le vise à la
 * souris, et il affiche le raccourci que la coquille écoute.
 */
export function DeclencheurRechercheBureau({
	onOuvrir,
	raccourci
}: {
	readonly onOuvrir: () => void;
	/** « Ctrl K » ou « ⌘ K », selon le clavier. */
	readonly raccourci: string;
}) {
	return (
		<button
			type="button"
			aria-haspopup="dialog"
			aria-keyshortcuts="Control+K Meta+K"
			onClick={onOuvrir}
			className="champ-bureau flex h-9 w-56 items-center gap-2 rounded-full pr-1.5 pl-3 text-left xl:w-72 2xl:w-80"
		>
			<SearchIcon aria-hidden className="size-4 shrink-0 text-cladd-fg-softer" />
			<span className="min-w-0 flex-1 truncate text-cladd-2xs text-cladd-fg-softer">
				Rechercher un client, une facture
			</span>
			<kbd className="touche-clavier shrink-0 rounded-md px-1.5 py-0.5 font-sans text-cladd-4xs text-cladd-fg-softer">
				{raccourci}
			</kbd>
		</button>
	);
}

/** La cloche : la boîte de réception, et ce qu'elle compte. */
export function ClocheBureau({
	vers,
	nonLues
}: {
	readonly vers: NonNullable<LinkProps['to']>;
	readonly nonLues: number;
}) {
	return (
		<Button
			as={Lien}
			to={vers}
			size="md"
			square
			rounded
			variant="transparent"
			outline={false}
			hoverable={false}
			aria-label={
				nonLues === 0
					? 'Notifications'
					: `Notifications, ${nonLues} non lue${nonLues > 1 ? 's' : ''}`
			}
			title="Notifications"
			className="verre-bouton relative shrink-0"
		>
			<BellIcon aria-hidden />
			<span aria-hidden className="absolute -top-0.5 -right-0.5">
				<PastilleDeRappel compte={nonLues} />
			</span>
		</Button>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA BARRE LATÉRALE
// ─────────────────────────────────────────────────────────────────────────

export interface DestinationLaterale {
	readonly cle: string;
	readonly libelle: string;
	readonly Icone: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
	/** Typée par le routeur, comme celles de la barre du bas. */
	readonly vers: NonNullable<LinkProps['to']>;
	/** Donné par l'appelant, jamais dérivé ici. */
	readonly actif: boolean;
	/** La pastille d'un compte, déjà isolée par l'appelant. */
	readonly rappel?: ReactNode;
}

export interface GroupeLateral {
	readonly cle: string;
	/** Absent pour le premier groupe : les destinations de tous les jours n'ont pas besoin d'en-tête. */
	readonly titre?: string;
	readonly destinations: readonly DestinationLaterale[];
}

/**
 * CE QUE LA BARRE LATÉRALE PREND À GAUCHE, pour ce qui est fixé sur l'écran.
 *
 * ⚠️ UN ÉLÉMENT FIXÉ SE CENTRE SUR LA FENÊTRE, PAS SUR LE CONTENU. Le compositeur de
 * Plume et le pied du démarrage se centraient à 128 px de la conversation qu'ils
 * servent, au bureau. Ils partent donc de la barre latérale, dont c'est la largeur.
 */
export const DEGAGEMENT_LATERAL = 'lg:left-[var(--largeur-laterale,16rem)]';

/**
 * LA LARGEUR DE LA BARRE, OUVERTE OU EN RAIL D'ICÔNES, posée par la coquille en
 * variable (`--largeur-laterale`) : la barre et ce qui est fixé la lisent ensemble.
 */
export const LARGEUR_LATERALE = { ouverte: '16rem', reduite: '4.5rem' } as const;

export function BarreLaterale({
	tete,
	groupes,
	pied,
	reduite = false,
	onBasculer
}: {
	/** L'établissement, en tête. */
	readonly tete?: ReactNode;
	readonly groupes: readonly GroupeLateral[];
	/** Le compte, en pied. */
	readonly pied?: ReactNode;
	/**
	 * EN RAIL D'ICÔNES (14/10/2026), comme chez Midday ou Quicken : entre 1024 et
	 * 1280 px, la barre ouverte prenait un quart de l'écran. Repliée, elle ne garde
	 * que les icônes, et chaque nom passe en bulle au survol. Le choix se garde.
	 */
	readonly reduite?: boolean;
	readonly onBasculer?: () => void;
}) {
	// La largeur vient de `--largeur-laterale`, celle que `DEGAGEMENT_LATERAL` rend
	// aux éléments fixés.
	return (
		<aside
			data-reduite={reduite}
			className="group/laterale chrome-laterale hidden h-full w-[var(--largeur-laterale,16rem)] shrink-0 flex-col transition-[width] duration-200 ease-out lg:flex"
		>
			<div className="flex h-14 shrink-0 items-center px-3">{tete}</div>
			<nav
				aria-label="Navigation principale"
				className="defilement-sans-barre flex min-h-0 flex-1 flex-col gap-cladd-xs overflow-y-auto px-3 pt-1.5 pb-3"
			>
				{groupes.map((groupe) => (
					<div key={groupe.cle} className="flex flex-col gap-0.5">
						{groupe.titre === undefined ? null : (
							<p className="truncate px-2.5 pb-1 text-cladd-3xs font-medium text-cladd-fg-softer group-data-[reduite=true]/laterale:sr-only">
								{groupe.titre}
							</p>
						)}
						{groupe.destinations.map((destination) => (
							<EntreeLaterale key={destination.cle} destination={destination} reduite={reduite} />
						))}
					</div>
				))}
				{onBasculer === undefined ? null : (
					<button
						type="button"
						onClick={onBasculer}
						aria-label={reduite ? 'Déplier la barre' : 'Replier la barre'}
						title={reduite ? 'Déplier la barre' : 'Replier la barre'}
						className="entree-laterale mt-auto flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-cladd-2xs font-medium text-cladd-fg-softer transition-colors duration-150 group-data-[reduite=true]/laterale:justify-center group-data-[reduite=true]/laterale:px-0 hover:text-cladd-fg"
					>
						{reduite ? (
							<PanelLeftOpenIcon aria-hidden className="size-4.5 shrink-0" />
						) : (
							<PanelLeftCloseIcon aria-hidden className="size-4.5 shrink-0" />
						)}
						<span className="min-w-0 truncate group-data-[reduite=true]/laterale:sr-only">
							Replier la barre
						</span>
					</button>
				)}
			</nav>
			{pied === undefined ? null : <div className="shrink-0 px-3 pt-1.5 pb-3">{pied}</div>}
		</aside>
	);
}

function EntreeLaterale({
	destination,
	reduite
}: {
	readonly destination: DestinationLaterale;
	readonly reduite: boolean;
}) {
	const { libelle, Icone, vers, actif, rappel } = destination;
	return (
		<Lien
			to={vers}
			aria-current={actif ? 'page' : undefined}
			// En rail, le nom ne se lit plus : il passe en bulle au survol.
			{...(reduite ? { title: libelle } : {})}
			className={cn(
				'entree-laterale flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-cladd-2xs font-medium transition-colors duration-150 group-data-[reduite=true]/laterale:justify-center group-data-[reduite=true]/laterale:px-0',
				actif ? 'entree-laterale-active text-cladd-fg' : 'text-cladd-fg-soft hover:text-cladd-fg'
			)}
		>
			<span className="relative inline-flex shrink-0">
				<Icone size={18} aria-hidden />
				{rappel === undefined ? null : <span className="absolute -top-1.5 -right-2">{rappel}</span>}
			</span>
			<span className="min-w-0 truncate group-data-[reduite=true]/laterale:sr-only">{libelle}</span>
		</Lien>
	);
}

/**
 * UNE IDENTITÉ EN RANGÉE — l'établissement en tête de la barre, le compte en pied :
 * une vignette, un nom, une ligne dessous.
 */
export function IdentiteLaterale({
	vignette,
	nom,
	ligne,
	apres
}: {
	readonly vignette: ReactNode;
	readonly nom: string;
	readonly ligne?: string;
	readonly apres?: ReactNode;
}) {
	return (
		<span className="flex w-full min-w-0 items-center gap-2.5 text-left group-data-[reduite=true]/laterale:justify-center">
			<span className="flex shrink-0">{vignette}</span>
			<span className="flex min-w-0 flex-1 flex-col group-data-[reduite=true]/laterale:hidden">
				<span className="truncate text-cladd-2xs leading-tight font-semibold text-cladd-fg">
					{nom}
				</span>
				{ligne === undefined ? null : (
					<span className="truncate text-cladd-3xs leading-tight text-cladd-fg-soft">{ligne}</span>
				)}
			</span>
			{apres === undefined ? null : (
				<span className="flex shrink-0 text-cladd-fg-softer group-data-[reduite=true]/laterale:hidden">
					{apres}
				</span>
			)}
		</span>
	);
}

/** Une identité qui ne se touche pas (un seul établissement) : centrée en rail. */
export const CLASSE_IDENTITE_FIXE = 'flex w-full px-2 group-data-[reduite=true]/laterale:px-0';

/** La classe d'une rangée d'identité qui se touche : celle d'une entrée de la barre. */
export const CLASSE_IDENTITE_LATERALE =
	'entree-laterale flex w-full min-h-11 items-center rounded-lg px-2 py-1.5 transition-colors duration-150 group-data-[reduite=true]/laterale:justify-center group-data-[reduite=true]/laterale:px-0';
