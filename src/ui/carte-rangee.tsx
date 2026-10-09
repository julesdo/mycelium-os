import type { ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import { Button, Surface } from '@cladd-ui/react';
import { ChevronRightIcon } from 'lucide-react';
import { Avatar } from './avatar';
import { cn } from './cn';
import { PastilleFamille, type FamilleRangee } from './familles';
import { Lien } from './lien';

/**
 * LA CARTE D'UNE LISTE — un client, un dossier, une rangée du matin.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLE REMPLACE, ET LE VERDICT QUI L'A FAIT NAÎTRE (07/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les clients, les dossiers et la file du matin étaient des rangées de
 * `ListButton` serrées dans une carte commune : un disque d'initiales de 36 px
 * cerclé d'un filet, le nom, une phrase coupée à deux lignes, et le montant
 * empilé sur sa date dans une colonne droite qui mangeait le tiers de la
 * largeur. Relevé à 375 px : la sous-ligne recevait 127 px, donc chaque phrase
 * finissait en « … » — « Date limite pour agir en justice dans 41… ». Verdict
 * du fondateur : « horribles, ça ne donne pas envie, on n'a même pas
 * l'impression qu'elles sont cliquables, le contenu paraît entassé et lourd à
 * lire. On est sur mobile. »
 *
 * Relevé sur Mobbin le même jour (Revolut Business, Zip, Linktree, Wise) :
 *
 * 1. UNE CARTE PAR ÉLÉMENT. Une liste groupée façon Réglages se LIT ; des
 *    cartes qui flottent, chacune avec son ombre et son enfoncement au doigt,
 *    se TOUCHENT. C'est la différence entre un relevé et une liste de choses
 *    à ouvrir.
 * 2. LE MONTANT SUR LA LIGNE DU NOM, la date sur la ligne d'en dessous. La
 *    colonne droite ne prend plus que la largeur de ses chiffres, et la ligne
 *    courte reçoit tout le reste.
 * 3. UNE LIGNE COURTE, JAMAIS UNE PHRASE COUPÉE. « Date limite pour agir »,
 *    « 4 échues · Rythme rompu ». La phrase entière vit là où l'on décide.
 * 4. UN AVATAR DE 40 PX AVEC SON BADGE. Chez Revolut Business, la pastille
 *    posée sur l'avatar dit ce qui arrive à cette ligne ; ici, c'est la
 *    FAMILLE (`familles.tsx`) : une horloge violette pour une date, une
 *    question rose pour ce qu'on vous demande. La teinte dit DE QUOI il
 *    s'agit, jamais si c'est grave — la règle ne change pas parce que la
 *    pastille est petite.
 * 5. UN CHEVRON. La règle « une rangée de contenu ne porte pas de chevron »
 *    venait de Shop, où la liste se lit ; elle a coûté l'impression qu'on
 *    pouvait toucher. Une carte qui MÈNE quelque part le dit.
 *
 * ⚠️ BÂTIE SUR LE `Button` DU KIT, comme `RangeeLien` : le focus au clavier, la
 * cible, le rendu en `<a>` pour un lien du routeur. `ListButton` ne convenait
 * plus — sa fente `after` occupe toute la hauteur, et c'est précisément la
 * colonne qui écrasait la sous-ligne.
 */

interface ContenuCarte {
	/** Le nom du client : il donne aussi ses initiales à l'avatar. */
	readonly titre: string;
	/**
	 * Ce qui se passe, en cinq mots au plus. JAMAIS une phrase : elle serait
	 * coupée, et une phrase coupée est exactement ce qu'on retire ici.
	 */
	readonly ligne?: string;
	/** Le montant, déjà écrit : il se lit sur la ligne du nom. */
	readonly montant?: string;
	/** La date ou le délai, au bout de la ligne courte. */
	readonly date?: string;
	/** La famille de ce qui arrive : la pastille posée sur l'avatar. */
	readonly famille?: FamilleRangee;
	/**
	 * À la place de l'avatar : la case d'une sélection. Mail fait pareil — la
	 * carte entière reste la cible.
	 */
	readonly icone?: ReactNode;
	/**
	 * La carte attend une réponse du gérant. Sa ligne passe à l'encre pleine,
	 * et le lecteur d'écran l'entend. Aucune couleur de seuil.
	 */
	readonly attention?: boolean;
	/**
	 * La ligne courte REVIENT À LA LIGNE au lieu de se couper.
	 *
	 * ⚠️ POUR UNE LIGNE QUI PORTE DES MONTANTS, ET SEULEMENT POUR ELLE. Un nom
	 * coupé se devine ; « frais 40,00 … » ne se devine pas, et un montant tronqué
	 * est un chiffre faux. La décomposition facture par facture de « Ce qui est
	 * dû » tient sur une ligne presque toujours — la plus grosse facture passe sur
	 * deux, et c'est le prix d'un chiffre entier.
	 */
	readonly retour?: boolean;
	/**
	 * Une notification qu'on n'a pas encore ouverte : un point d'encre au bout de
	 * la carte, avant le chevron — la place du point « à faire » des rangées.
	 */
	readonly nonLue?: boolean;
}

/**
 * LES DEUX LIGNES D'UNE CARTE OU D'UN RELEVÉ — le nom et le montant, puis ce qui
 * se passe et sa date. Écrites une fois : une copie divergerait au premier
 * ajustement de largeur, et c'est la largeur qui fait tout ici.
 */
function DeuxLignes({
	titre,
	ligne,
	montant,
	date,
	attention = false,
	retour = false
}: Pick<ContenuCarte, 'titre' | 'ligne' | 'montant' | 'date' | 'attention' | 'retour'>) {
	/*
	  ⚠️ UNE LIGNE QUI REVIENT À LA LIGNE LAISSE SA DATE MONTER, quand la première
	  ligne a la place. Restée à sa droite, la date réservait sa colonne sur toute
	  la hauteur : la raison d'un dépôt en échec s'enroulait sur quatre lignes de
	  190 px à 375 px. En haut, elle laisse la raison prendre toute la largeur.
	*/
	const dateEnHaut = retour && montant === undefined && date !== undefined;
	return (
		<span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
			<span className="flex items-baseline justify-between gap-2">
				<span className="min-w-0 truncate text-cladd-xs font-semibold">{titre}</span>
				{montant === undefined ? null : (
					<span className="shrink-0 text-cladd-xs font-semibold tabular-nums">{montant}</span>
				)}
				{dateEnHaut ? (
					<span className="shrink-0 text-cladd-2xs text-cladd-fg-soft tabular-nums">{date}</span>
				) : null}
			</span>
			{ligne === undefined && (date === undefined || dateEnHaut) ? null : (
				<span
					className={cn(
						'flex items-baseline justify-between gap-2 text-cladd-2xs',
						attention ? 'text-cladd-fg' : 'text-cladd-fg-soft'
					)}
				>
					<span className={retour ? 'min-w-0' : 'min-w-0 truncate'}>
						{ligne}
						{attention ? <span className="sr-only">, demande une réponse</span> : null}
					</span>
					{date === undefined || dateEnHaut ? null : (
						<span className="shrink-0 tabular-nums">{date}</span>
					)}
				</span>
			)}
		</span>
	);
}

function Interieur({
	icone,
	famille,
	sansChevron,
	nonLue = false,
	...lignes
}: ContenuCarte & { readonly sansChevron?: 'toujours' | 'large' }) {
	return (
		<>
			<span className="relative flex shrink-0">
				{icone ?? <Avatar nom={lignes.titre} surCarte />}
				{icone === undefined && famille !== undefined ? (
					<PastilleFamille famille={famille} />
				) : null}
			</span>
			<DeuxLignes {...lignes} />
			{nonLue ? (
				<span className="flex shrink-0 items-center">
					<span aria-hidden className="size-2 rounded-full bg-cladd-fg" />
					<span className="sr-only">Non lue</span>
				</span>
			) : null}
			{sansChevron === 'toujours' ? null : (
				<ChevronRightIcon
					aria-hidden
					// `-ml-1` : le glyphe a son propre blanc, et dix pixels de plus
					// devant lui étaient pris au nom du client.
					className={cn(
						'-ml-1 size-4 shrink-0 text-cladd-fg-softest',
						sansChevron === 'large' && 'lg:hidden'
					)}
				/>
			)}
		</>
	);
}

/*
  ⚠️ `min-h-17` (68 px) ET NON LA HAUTEUR DE `size="md"`. Le `h-auto` qu'il faut
  pour laisser deux lignes respirer annule le plancher du kit ; 68 px, c'est la
  rangée de Revolut Business, mesurée sur ses captures, et largement au-dessus
  des 44 pt d'Apple.
*/
const CARTE = {
	variant: 'transparent',
	outline: false,
	hoverable: false,
	size: 'md'
} as const;
const CLASSES_CARTE = 'verre-carte verre-bouton h-auto min-h-17 w-full rounded-cladd-xl';
/*
  ⚠️ 14 PX DE CÔTÉ ET 10 ENTRE LES COLONNES, ET C'EST UNE MESURE. À 375 px, la
  carte fait 343 px ; avec les 16 et 12 de l'échelle courante, « Imprimerie
  Delorme » recevait 139 px pour 153 de texte, à côté de « 12 878,50 € ». Huit
  pixels rendus au nom valent mieux qu'une gouttière intérieure que personne ne
  mesure à l'œil.
*/
const CONTENU_CARTE = 'w-full items-center gap-2.5 px-3.5 py-cladd-3xs';

/** La carte qui MÈNE à une page : un client, un dossier. */
export function CarteLien({
	vers,
	parametres,
	recherche,
	onClick,
	selectionnee,
	...contenu
}: ContenuCarte & {
	readonly vers: NonNullable<LinkProps['to']>;
	readonly parametres?: LinkProps['params'];
	/** La recherche d'URL, quand la destination en dépend (`?p=`, `?d=`). */
	readonly recherche?: LinkProps['search'];
	/** Ce qui se passe en plus de la navigation : marquer un travail comme lu. */
	readonly onClick?: () => void;
	/**
	 * La carte dont le détail est ouvert dans le volet voisin, au-delà de
	 * 1024 px. DÉFINIE, la liste sert de maître et le chevron s'efface à cette
	 * largeur : un chevron et un contour diraient « ouvre une page » et « est
	 * déjà ouverte ».
	 */
	readonly selectionnee?: boolean;
}) {
	return (
		<Button
			as={Lien}
			to={vers}
			// ⚠️ UNE ASSERTION : `as` efface le générique du routeur. La destination
			// reste vérifiée par le type de `vers`.
			params={parametres as never}
			search={recherche as never}
			{...(onClick === undefined ? {} : { onClick })}
			{...CARTE}
			// Le contour et non l'anneau : `.verre-carte` porte déjà son ombre en
			// `box-shadow`, qu'un `ring-` remplacerait au lieu de s'y ajouter.
			className={cn(CLASSES_CARTE, selectionnee === true && 'outline-2 outline-cladd-primary')}
			contentClassName={CONTENU_CARTE}
		>
			<Interieur {...contenu} {...(selectionnee === undefined ? {} : { sansChevron: 'large' })} />
		</Button>
	);
}

/**
 * La carte qui OUVRE une feuille, ou qui coche une sélection.
 *
 * ⚠️ `chevron` : une carte qui ouvre une feuille garde son chevron, puisqu'elle
 * MÈNE au détail ; une carte qu'on coche n'en a pas, elle ne mène nulle part.
 */
export function CarteBouton({
	onClick,
	chevron = true,
	...contenu
}: ContenuCarte & { readonly onClick: () => void; readonly chevron?: boolean }) {
	return (
		<Button {...CARTE} onClick={onClick} className={CLASSES_CARTE} contentClassName={CONTENU_CARTE}>
			<Interieur {...contenu} {...(chevron ? {} : { sansChevron: 'toujours' })} />
		</Button>
	);
}

/**
 * LA CARTE QUI NE MÈNE NULLE PART — ENCORE. Un fichier en route vers le serveur :
 * il n'y a rien à ouvrir tant que le serveur ne le connaît pas.
 *
 * ⚠️ LA MÊME SILHOUETTE QUE SES VOISINES, sans chevron ni enfoncement. Un fichier
 * passe de l'envoi à la lecture sous les yeux, dans le même groupe « En cours » :
 * s'il changeait de forme en route, on croirait à une ligne de plus.
 */
export function CarteFixe(contenu: ContenuCarte) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte min-h-17 rounded-cladd-xl"
			contentClassName={cn('flex h-full', CONTENU_CARTE)}
		>
			<Interieur {...contenu} sansChevron="toujours" />
		</Surface>
	);
}

/**
 * LES CARTES D'UN GROUPE, à huit pixels l'une de l'autre.
 *
 * ⚠️ HUIT ET NON DOUZE. L'en-tête du groupe est à douze de sa première carte :
 * des cartes plus proches entre elles que de leur en-tête se lisent comme UN
 * ensemble sous un titre, et c'est ce qu'elles sont.
 */
export function ListeDeCartes({ children }: { readonly children: ReactNode }) {
	return <div className="flex flex-col gap-2">{children}</div>;
}

/**
 * LE RELEVÉ — ce qui se LIT et ne s'ouvre pas : les factures d'un client.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DEUX NATURES, DEUX FORMES, ET C'EST TOUT L'INTÉRÊT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce qui se touche FLOTTE : une carte par élément, qui s'enfonce et porte un
 * chevron. Ce qui se lit est POSÉ : un seul bloc de verre, un filet entre les
 * lignes, aucun chevron, aucun enfoncement — un relevé de banque. Les deux
 * côte à côte sur la fiche d'un client (ses dossiers au-dessus, ses factures
 * dessous) disent sans un mot lesquels s'ouvrent. Une facture rendue en carte
 * promettrait un appui qui ne fait rien ; un dossier rendu en relevé cacherait
 * qu'il mène quelque part — c'était le reproche du 07/10/2026.
 *
 * ⚠️ LES MÊMES DEUX LIGNES QUE LES CARTES (`DeuxLignes`), sans avatar : toutes
 * les factures d'un relevé sont du même client, et un disque d'initiales
 * répété dix fois ne distinguerait rien. La place rendue va à la ligne courte.
 */
export function ListeDeReleve({ children }: { readonly children: ReactNode }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			// Le filet est posé par le conteneur : une ligne ne sait pas si elle est
			// la première.
			contentClassName="flex flex-col [&>*+*]:border-t [&>*+*]:border-cladd-outline"
		>
			{children}
		</Surface>
	);
}

export function LigneDeReleve(
	contenu: Pick<ContenuCarte, 'titre' | 'ligne' | 'montant' | 'date' | 'attention' | 'retour'>
) {
	return (
		<div className="flex min-h-14 items-center px-3.5 py-2.5">
			<DeuxLignes {...contenu} />
		</div>
	);
}

/**
 * UNE CARTE EN ATTENTE DE SES DONNÉES — la silhouette exacte de ses voisines.
 *
 * ⚠️ LA MÊME FORME QUE LA CARTE QUI ARRIVE (09/10/2026, sur Mercury et Wise) :
 * un disque de 40 px, le nom et le montant sur une ligne, ce qui se passe et sa
 * date sur l'autre. L'attente dessinait des rangées serrées d'un disque de 20 px
 * et d'une barre, la forme des listes d'avant les cartes : à l'arrivée des
 * données, tout l'écran changeait de forme d'un coup.
 */
export function CarteFantome() {
	return (
		<div className="verre-carte flex min-h-17 items-center gap-2.5 rounded-cladd-xl px-3.5 py-cladd-3xs">
			<span className="size-10 shrink-0 animate-pouls rounded-full bg-cladd-fg/10" />
			<span className="flex min-w-0 flex-1 flex-col gap-2">
				<span className="flex items-center justify-between gap-2">
					<span className="h-3 w-2/5 animate-pouls rounded-full bg-cladd-fg/10" />
					<span className="h-3 w-1/5 animate-pouls rounded-full bg-cladd-fg/10" />
				</span>
				<span className="flex items-center justify-between gap-2">
					<span className="h-2.5 w-1/3 animate-pouls rounded-full bg-cladd-fg/[0.07]" />
					<span className="h-2.5 w-1/6 animate-pouls rounded-full bg-cladd-fg/[0.07]" />
				</span>
			</span>
		</div>
	);
}
