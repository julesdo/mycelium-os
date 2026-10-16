import type { KeyboardEvent, ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import { Button, Checkbox, Chip, Segmented, SegmentedButton, Textarea } from '@cladd-ui/react';
import { ArrowUpIcon, CheckIcon, XIcon } from 'lucide-react';
import { Avatar } from './avatar';
import { cn } from './cn';
import { EnTeteDeGroupe } from './en-tete-groupe';
import { Lien } from './lien';

/**
 * LES BRIQUES DE L'ADMIN (16/10/2026, `docs/superpowers/specs/2026-10-16-admin-socle-crm.md`).
 *
 * Relevées sur Mobbin, chez les meilleurs CRM et outils d'équipe : les vues en
 * pastilles de Calendly et HubSpot, la fiche en deux colonnes de Twenty et Attio,
 * « Focus » épinglé de Pipedrive, l'historique groupé par jour de Toggl, le
 * pipeline en colonnes d'Attio, la barre d'actions groupées d'Attio et ClickUp.
 *
 * ⚠️ RIEN DE NEUF DANS LE GESTE : la carte en verre, l'avatar, l'en-tête de groupe
 * et le bouton du kit sont ceux de l'application. L'équipe passe de l'une à
 * l'autre ; deux langages lui feraient réapprendre à toucher.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL : une tâche en retard le dit à l'encre (« en retard de
 * 2 j »), un score se lit en chiffres. Le vert, l'ambre et le rouge restent au seul
 * sens qu'ils ont dans le produit.
 */

// ─────────────────────────────────────────────────────────────────────────
// LES VUES EN PASTILLES
// ─────────────────────────────────────────────────────────────────────────

export interface VueEnPastille<C extends string> {
	readonly cle: C;
	readonly libelle: string;
	readonly nombre?: number;
}

/**
 * Les vues prédéfinies d'une liste, au-dessus d'elle (Calendly, HubSpot). Une seule
 * active ; au téléphone la rangée défile sous le doigt, au bureau elle passe à la
 * ligne.
 */
export function PastillesDeVue<C extends string>({
	vues,
	active,
	onChoisir,
	libelle
}: {
	readonly vues: readonly VueEnPastille<C>[];
	readonly active: C;
	readonly onChoisir: (cle: C) => void;
	/** Ce que les pastilles choisissent, pour un lecteur d'écran. */
	readonly libelle: string;
}) {
	return (
		<div
			role="group"
			aria-label={libelle}
			className="defilement-sans-barre -mx-cladd-2xs flex gap-2 overflow-x-auto px-cladd-2xs py-0.5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
		>
			{vues.map((vue) => {
				const choisie = vue.cle === active;
				return (
					<Chip
						key={vue.cle}
						as="button"
						type="button"
						size="lg"
						rounded
						aria-pressed={choisie}
						color={choisie ? 'brand' : 'neutral'}
						variant={choisie ? 'solid-fill' : 'gradient'}
						outline={!choisie}
						className="shrink-0"
						contentClassName="gap-1.5"
						onClick={() => onChoisir(vue.cle)}
					>
						{vue.libelle}
						{vue.nombre === undefined ? null : (
							<span className="tabular-nums opacity-70">{vue.nombre}</span>
						)}
					</Chip>
				);
			})}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA FICHE : L'IDENTITÉ, LES DÉTAILS À GAUCHE, L'HISTORIQUE À DROITE
// ─────────────────────────────────────────────────────────────────────────

/** L'identité d'une fiche : l'avatar, le nom, une ligne. Centrée au téléphone. */
export function IdentiteDeFiche({
	nom,
	ligne,
	apres
}: {
	readonly nom: string;
	readonly ligne?: string;
	/** Sous la ligne : un statut, un score. */
	readonly apres?: ReactNode;
}) {
	return (
		<div className="flex flex-col items-center gap-2 pt-cladd-3xs text-center lg:flex-row lg:items-center lg:gap-3 lg:pt-0 lg:text-left">
			<Avatar nom={nom} grand />
			<div className="flex min-w-0 flex-col items-center gap-1 lg:items-start">
				<h1 className="text-cladd-lg leading-tight font-semibold break-words">{nom}</h1>
				{ligne === undefined ? null : <p className="text-cladd-2xs text-cladd-fg-soft">{ligne}</p>}
				{apres}
			</div>
		</div>
	);
}

type Segment = 'historique' | 'details';

/**
 * LA FICHE D'UN COMPTE OU D'UN PROSPECT (Twenty, Attio ; au téléphone, Attio iOS
 * et Linktree).
 *
 * Au bureau, deux colonnes : l'identité, les gestes et les détails à gauche ;
 * ce qu'il y a à faire, le composeur et l'historique à droite. Au téléphone, une
 * page : l'identité et les gestes, puis deux segments, « Historique » et
 * « Détails ». Le même arbre sert les deux : seules les classes changent.
 */
export function FicheEnDeuxColonnes({
	segment,
	onSegment: setSegment,
	identite,
	gestes,
	details,
	historique
}: {
	/** Le segment montré au téléphone ; tenu par l'appelant, que le geste « Note » ramène à l'historique. */
	readonly segment: Segment;
	readonly onSegment: (segment: Segment) => void;
	readonly identite: ReactNode;
	readonly gestes: ReactNode;
	readonly details: ReactNode;
	readonly historique: ReactNode;
}) {
	return (
		<div className="grid grid-cols-1 gap-cladd-xs lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-cladd-sm">
			<div className="flex min-w-0 flex-col gap-cladd-xs">
				{identite}
				{gestes}
				<div className="flex justify-center lg:hidden">
					<Segmented activeColor="brand" activeVariant="solid-fill" className="w-full">
						<SegmentedButton
							active={segment === 'historique'}
							onClick={() => setSegment('historique')}
						>
							Historique
						</SegmentedButton>
						<SegmentedButton active={segment === 'details'} onClick={() => setSegment('details')}>
							Détails
						</SegmentedButton>
					</Segmented>
				</div>
				<div
					className={cn(
						'min-w-0 flex-col gap-cladd-xs lg:flex',
						segment === 'details' ? 'flex' : 'hidden'
					)}
				>
					{details}
				</div>
			</div>
			<div
				className={cn(
					'min-w-0 flex-col gap-cladd-xs lg:flex',
					segment === 'historique' ? 'flex' : 'hidden'
				)}
			>
				{historique}
			</div>
		</div>
	);
}

/** Un bloc de la fiche : son titre, puis ses lignes dans un relevé. */
export function BlocDeFiche({
	titre,
	droite,
	children
}: {
	readonly titre: string;
	readonly droite?: ReactNode;
	readonly children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-cladd-3xs">
			<div className="flex items-center justify-between gap-2 px-1">
				<h2 className="text-cladd-sm font-semibold">{titre}</h2>
				{droite}
			</div>
			{children}
		</section>
	);
}

/** Les champs d'un bloc, en relevé : le nom à gauche, la valeur à droite. */
export function ChampsDeFiche({
	champs
}: {
	readonly champs: readonly { readonly libelle: string; readonly valeur: ReactNode }[];
}) {
	return (
		<dl className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
			{champs.map((champ) => (
				<div
					key={champ.libelle}
					className="flex min-h-11 items-baseline justify-between gap-3 px-3.5 py-2.5"
				>
					<dt className="shrink-0 text-cladd-2xs text-cladd-fg-soft">{champ.libelle}</dt>
					<dd className="min-w-0 text-right text-cladd-2xs font-medium break-words">
						{champ.valeur}
					</dd>
				</div>
			))}
		</dl>
	);
}

/** Les étapes d'un parcours, sur une frise : atteinte, la coche et sa date ; sinon un cercle vide. */
export function FriseDesEtapes({
	etapes
}: {
	readonly etapes: readonly {
		readonly cle: string;
		readonly libelle: string;
		readonly le?: string;
	}[];
}) {
	return (
		<ol className="verre-carte flex flex-col rounded-cladd-xl px-3.5 py-2">
			{etapes.map((etape, i) => {
				const atteinte = etape.le !== undefined;
				const derniere = i === etapes.length - 1;
				return (
					<li key={etape.cle} className="relative flex items-start gap-3 py-1.5">
						{derniere ? null : (
							<span
								aria-hidden
								className="absolute top-7 bottom-[-0.375rem] left-[0.6875rem] w-px bg-cladd-outline"
							/>
						)}
						<span
							aria-hidden
							className={cn(
								'relative flex size-6 shrink-0 items-center justify-center rounded-full',
								atteinte ? 'bg-cladd-fg text-cladd-bg' : 'border border-cladd-outline bg-cladd-bg'
							)}
						>
							{atteinte ? <CheckIcon className="size-3.5" strokeWidth={3} /> : null}
						</span>
						<span className="flex min-w-0 flex-1 items-baseline justify-between gap-2 pt-0.5">
							<span
								className={cn('text-cladd-2xs', atteinte ? 'font-medium' : 'text-cladd-fg-soft')}
							>
								{etape.libelle}
								<span className="sr-only">{atteinte ? ', atteinte' : ', pas encore'}</span>
							</span>
							{etape.le === undefined ? null : (
								<span className="shrink-0 text-cladd-3xs text-cladd-fg-soft tabular-nums">
									{etape.le}
								</span>
							)}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LE COMPOSEUR ET L'HISTORIQUE
// ─────────────────────────────────────────────────────────────────────────

/**
 * LE COMPOSEUR DE NOTE. Au téléphone, collé en bas à la place de la barre
 * d'onglets (Attio iOS) ; au bureau, en tête de l'historique, sous ce qu'il y a à
 * faire (Pipedrive). Entrée envoie, Maj + Entrée passe à la ligne.
 */
export function ComposeurDeNote({
	valeur,
	onChange,
	onEnvoyer,
	enCours = false,
	placeholder = 'Écrire une note'
}: {
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	readonly onEnvoyer: () => void;
	readonly enCours?: boolean;
	readonly placeholder?: string;
}) {
	const vide = valeur.trim() === '';
	function touche(evenement: KeyboardEvent<HTMLElement>) {
		if (evenement.key === 'Enter' && !evenement.shiftKey && !evenement.nativeEvent.isComposing) {
			evenement.preventDefault();
			if (!vide && !enCours) onEnvoyer();
		}
	}
	return (
		<div className="fixed inset-x-0 bottom-0 z-30 px-cladd-2xs pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:static lg:z-auto lg:p-0">
			<div className="verre-carte flex items-end gap-2 rounded-cladd-xl py-1.5 pr-1.5 pl-3">
				<Textarea
					size="md"
					value={valeur}
					onChange={(v) => onChange(v)}
					onKeyDown={touche}
					placeholder={placeholder}
					aria-label={placeholder}
					className="min-w-0 flex-1 bg-transparent"
				/>
				<Button
					size="md"
					square
					rounded
					variant={vide ? 'transparent' : 'solid-fill'}
					color={vide ? 'neutral' : 'brand'}
					outline={false}
					disabled={vide || enCours}
					aria-label="Ajouter la note"
					onClick={onEnvoyer}
					className="shrink-0"
				>
					<ArrowUpIcon aria-hidden />
				</Button>
			</div>
		</div>
	);
}

export interface EvenementAffiche {
	readonly id: string;
	readonly icone: ReactNode;
	/** Ce qui s'est passé, en quelques mots : « Appel noté », « Inscrit ». */
	readonly titre: string;
	readonly texte?: string;
	readonly heure: string;
	readonly auteur?: string;
}

/** L'historique d'une fiche, groupé par jour, du plus récent au plus ancien (Toggl, Attio). */
export function HistoriqueParJour({
	jours
}: {
	readonly jours: readonly {
		readonly jour: string;
		readonly evenements: readonly EvenementAffiche[];
	}[];
}) {
	return (
		<div className="flex flex-col gap-cladd-xs">
			{jours.map(({ jour, evenements }) => (
				<section key={jour} className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe libelle={jour} />
					<ol className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
						{evenements.map((evenement) => (
							<li key={evenement.id} className="flex gap-3 px-3.5 py-2.5">
								<span
									aria-hidden
									className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cladd-fg/[0.06] text-cladd-fg-soft [&>svg]:size-4"
								>
									{evenement.icone}
								</span>
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="flex items-baseline justify-between gap-2">
										<span className="min-w-0 truncate text-cladd-2xs font-semibold">
											{evenement.titre}
										</span>
										<span className="shrink-0 text-cladd-3xs text-cladd-fg-soft tabular-nums">
											{evenement.heure}
										</span>
									</span>
									{evenement.texte === undefined ? null : (
										<span className="text-cladd-2xs break-words whitespace-pre-line">
											{evenement.texte}
										</span>
									)}
									{evenement.auteur === undefined ? null : (
										<span className="text-cladd-3xs text-cladd-fg-soft">{evenement.auteur}</span>
									)}
								</span>
							</li>
						))}
					</ol>
				</section>
			))}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LES TÂCHES
// ─────────────────────────────────────────────────────────────────────────

/**
 * UNE TÂCHE : la case, le titre, la fiche liée, la date relative, le responsable.
 * La case se coche d'un toucher ; la fiche se touche à part.
 */
export function LigneDeTache({
	titre,
	faite,
	onCocher,
	date,
	enRetard = false,
	fiche,
	responsable
}: {
	readonly titre: string;
	readonly faite: boolean;
	readonly onCocher: () => void;
	/** « aujourd'hui », « en retard de 2 j », « dans 3 j ». */
	readonly date: string;
	readonly enRetard?: boolean;
	readonly fiche?: {
		readonly libelle: string;
		readonly vers: NonNullable<LinkProps['to']>;
		readonly parametres: LinkProps['params'];
	};
	readonly responsable?: string;
}) {
	return (
		<div className="verre-carte flex min-h-14 items-center gap-1.5 rounded-cladd-xl py-1.5 pr-3.5 pl-1.5">
			<Button
				size="md"
				square
				rounded
				variant="transparent"
				outline={false}
				hoverable={false}
				aria-pressed={faite}
				aria-label={faite ? `Rouvrir « ${titre} »` : `Cocher « ${titre} »`}
				onClick={onCocher}
				className="shrink-0"
			>
				<Checkbox as="span" size="md" checked={faite} />
			</Button>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="flex items-baseline justify-between gap-2">
					<span
						className={cn(
							'min-w-0 truncate text-cladd-xs font-semibold',
							faite && 'text-cladd-fg-soft line-through'
						)}
					>
						{titre}
					</span>
					<span
						className={cn(
							'shrink-0 text-cladd-2xs tabular-nums',
							enRetard && !faite ? 'font-semibold text-cladd-fg' : 'text-cladd-fg-soft'
						)}
					>
						{date}
					</span>
				</span>
				{fiche === undefined && responsable === undefined ? null : (
					<span className="flex min-w-0 items-baseline gap-1.5 text-cladd-2xs text-cladd-fg-soft">
						{fiche === undefined ? null : (
							<Lien
								to={fiche.vers}
								params={fiche.parametres as never}
								className="min-w-0 truncate font-medium text-cladd-fg underline-offset-2 hover:underline"
							>
								{fiche.libelle}
							</Lien>
						)}
						{fiche !== undefined && responsable !== undefined ? <span aria-hidden>·</span> : null}
						{responsable === undefined ? null : (
							<span className="shrink-0 truncate">{responsable}</span>
						)}
					</span>
				)}
			</span>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LES PROSPECTS : LA LIGNE ET LA BARRE D'ACTIONS GROUPÉES (le kanban vit dans `admin-vues.tsx`)
// ─────────────────────────────────────────────────────────────────────────

/**
 * LA LIGNE D'UN PROSPECT : la case qui le sélectionne, la carte qui mène à sa
 * fiche, et son statut, changeable dans la ligne (Juicebox, HubSpot). Au bureau,
 * sur une ligne en colonnes ; au téléphone, sur deux.
 */
export function LigneDeProspect({
	titre,
	ligne,
	action,
	sansAction = false,
	vers,
	parametres,
	selectionnee,
	onSelectionner,
	statut
}: {
	readonly titre: string;
	/** La ville et l'activité. */
	readonly ligne?: string;
	/** La prochaine action et sa date, ou « Aucune prochaine action ». */
	readonly action: string;
	readonly sansAction?: boolean;
	readonly vers: NonNullable<LinkProps['to']>;
	readonly parametres: LinkProps['params'];
	readonly selectionnee: boolean;
	readonly onSelectionner: () => void;
	/** Le sélecteur de statut, posé par l'écran. */
	readonly statut: ReactNode;
}) {
	return (
		<div
			className={cn(
				'verre-carte flex min-h-17 items-center gap-1 rounded-cladd-xl py-1.5 pr-2 pl-1 lg:min-h-14',
				selectionnee && 'outline-2 outline-cladd-primary'
			)}
		>
			<Button
				size="md"
				square
				rounded
				variant="transparent"
				outline={false}
				hoverable={false}
				aria-pressed={selectionnee}
				aria-label={selectionnee ? `Désélectionner ${titre}` : `Sélectionner ${titre}`}
				onClick={onSelectionner}
				className="shrink-0"
			>
				<Checkbox as="span" size="md" checked={selectionnee} />
			</Button>
			<Lien
				to={vers}
				params={parametres as never}
				className="flex min-w-0 flex-1 flex-col gap-0.5 py-1 lg:flex-row lg:items-center lg:gap-cladd-2xs"
			>
				<span className="min-w-0 truncate text-cladd-xs font-semibold lg:w-1/4">{titre}</span>
				<span className="min-w-0 truncate text-cladd-2xs text-cladd-fg-soft lg:w-1/4">
					{ligne ?? ' '}
				</span>
				<span
					className={cn(
						'min-w-0 truncate text-cladd-2xs lg:flex-1',
						sansAction ? 'font-medium text-cladd-fg' : 'text-cladd-fg-soft'
					)}
				>
					{action}
				</span>
			</Lien>
			<span className="shrink-0">{statut}</span>
		</div>
	);
}

/**
 * LA BARRE D'ACTIONS GROUPÉES (Attio, ClickUp) : elle paraît en bas quand des lignes
 * sont cochées, dit combien, porte les gestes, et se ferme d'une croix.
 */
export function BarreDeSelection({
	nombre,
	libelle,
	onEffacer,
	children
}: {
	readonly nombre: number;
	/** « prospect », mis au pluriel par l'appelant. */
	readonly libelle: string;
	readonly onEffacer: () => void;
	readonly children: ReactNode;
}) {
	if (nombre === 0) return null;
	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-40 flex justify-center px-cladd-2xs lg:bottom-6 lg:left-[var(--largeur-laterale,16rem)]">
			<div
				role="toolbar"
				aria-label={`${nombre} ${libelle} sélectionné${nombre > 1 ? 's' : ''}`}
				className="verre-carte pointer-events-auto flex max-w-full items-center gap-1 rounded-full py-1.5 pr-1 pl-3.5 shadow-lg sm:gap-1.5 sm:pl-4"
			>
				{/* Au téléphone, le nombre seul : les deux menus et la croix tiennent sur la ligne. */}
				<span className="shrink-0 text-cladd-2xs font-semibold tabular-nums">
					{nombre}
					<span className="hidden sm:inline"> {libelle}</span>
				</span>
				<span className="flex min-w-0 items-center gap-1.5">{children}</span>
				<Button
					size="md"
					square
					rounded
					variant="transparent"
					outline={false}
					aria-label="Tout désélectionner"
					onClick={onEffacer}
					className="shrink-0"
				>
					<XIcon aria-hidden />
				</Button>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA PORTE
// ─────────────────────────────────────────────────────────────────────────

/** La page sobre d'un refus : hors de l'équipe, ou la double authentification à activer. */
export function PageDeRefus({
	icone,
	titre,
	texte,
	action
}: {
	readonly icone: ReactNode;
	readonly titre: string;
	readonly texte: string;
	readonly action: ReactNode;
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-cladd-2xs px-cladd-xs text-center">
			<span
				aria-hidden
				className="mb-1 flex size-14 items-center justify-center rounded-full bg-cladd-fg/[0.06] text-cladd-fg-soft [&>svg]:size-6"
			>
				{icone}
			</span>
			<h1 className="text-cladd-md font-semibold">{titre}</h1>
			<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">{texte}</p>
			<div className="pt-cladd-3xs">{action}</div>
		</div>
	);
}
