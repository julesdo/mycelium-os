import { useState, type ComponentType, type ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
	type Announcements,
	type DragEndEvent,
	type DragStartEvent
} from '@dnd-kit/core';
import { Checkbox, Segmented, SegmentedButton } from '@cladd-ui/react';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { cn } from './cn';
import { Lien } from './lien';

/**
 * LES VUES DU CRM (16/10/2026, second relevé Mobbin) : le kanban qu'on glisse
 * (Pipedrive, HubSpot, Attio), le tableau triable (Lightfield, folk), l'entonnoir
 * (Pipedrive, Squarespace, Zoho) et le sélecteur qui passe de l'une à l'autre
 * (folk, Salesforce).
 *
 * ⚠️ LE GLISSER-DÉPOSER PASSE PAR DND-KIT, PAS PAR LE GLISSER NATIF DU NAVIGATEUR :
 * le natif ne marche pas au doigt, dessine une image fantôme grise et ne défile pas
 * au bord. dnd-kit donne trois capteurs (souris dès 6 px, doigt après un appui de
 * 220 ms pour ne pas voler le défilement, clavier), une copie de la carte qui suit
 * le pointeur, le défilement automatique et une animation à la pose.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL : les barres de l'entonnoir sont à l'encre.
 */

// ─────────────────────────────────────────────────────────────────────────
// LE SÉLECTEUR DE VUE
// ─────────────────────────────────────────────────────────────────────────

export interface OptionDAffichage<C extends string> {
	readonly cle: C;
	readonly libelle: string;
	readonly Icone: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
	/** Le tableau ne se propose qu'au bureau. */
	readonly seulementBureau?: boolean;
}

/** Tableau, Kanban, Liste, Entonnoir : une icône et son nom (le nom seul tombe au téléphone). */
export function SelecteurDAffichage<C extends string>({
	options,
	actif,
	onChoisir
}: {
	readonly options: readonly OptionDAffichage<C>[];
	readonly actif: C;
	readonly onChoisir: (cle: C) => void;
}) {
	return (
		<Segmented activeColor="brand" activeVariant="solid-fill" aria-label="Type de vue">
			{options.map(({ cle, libelle, Icone, seulementBureau }) => (
				<SegmentedButton
					key={cle}
					active={actif === cle}
					onClick={() => onChoisir(cle)}
					aria-label={libelle}
					title={libelle}
					className={seulementBureau === true ? 'hidden lg:inline-flex' : undefined}
				>
					<Icone aria-hidden className="size-4" />
					<span className="hidden xl:inline">{libelle}</span>
				</SegmentedButton>
			))}
		</Segmented>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LE KANBAN
// ─────────────────────────────────────────────────────────────────────────

export interface CarteKanban {
	readonly id: string;
	readonly titre: string;
	readonly ligne?: string;
	/** Ce qui vient : « Relancer · dans 4 j », « Aucune prochaine action », un score. */
	readonly action?: string;
	/** Le signal qui manque le plus : aucune prochaine action (Pipedrive, HubSpot). */
	readonly alerte?: boolean;
	readonly vers: NonNullable<LinkProps['to']>;
	readonly parametres: LinkProps['params'];
}

export interface ColonneKanban<C extends string> {
	readonly cle: C;
	readonly libelle: string;
	readonly cartes: readonly CarteKanban[];
	/** Une précision sous le titre de la colonne : « 3 sans prochaine action ». */
	readonly precision?: string;
}

function ContenuDeCarte({ carte }: { readonly carte: CarteKanban }) {
	return (
		<>
			<span className="truncate text-cladd-2xs font-semibold">{carte.titre}</span>
			{carte.ligne === undefined ? null : (
				<span className="truncate text-cladd-3xs text-cladd-fg-soft">{carte.ligne}</span>
			)}
			{carte.action === undefined ? null : (
				<span
					className={cn(
						'truncate text-cladd-3xs',
						carte.alerte === true ? 'font-semibold text-cladd-fg' : 'text-cladd-fg-soft'
					)}
				>
					{carte.action}
				</span>
			)}
		</>
	);
}

const CLASSE_CARTE =
	'verre-carte flex flex-col gap-1 rounded-cladd-lg px-3 py-2.5 text-left [touch-action:manipulation]';

function CarteGlissable({
	carte,
	glissable
}: {
	readonly carte: CarteKanban;
	readonly glissable: boolean;
}) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: carte.id,
		disabled: !glissable
	});
	return (
		<Lien
			ref={setNodeRef}
			to={carte.vers}
			params={carte.parametres as never}
			// Le lien natif se glisserait lui-même (son adresse) : dnd-kit le remplace.
			draggable={false}
			{...(glissable ? { ...attributes, ...listeners } : {})}
			className={cn(
				CLASSE_CARTE,
				'verre-bouton transition-opacity',
				glissable && 'cursor-grab active:cursor-grabbing',
				isDragging && 'opacity-30'
			)}
		>
			<ContenuDeCarte carte={carte} />
		</Lien>
	);
}

function Colonne<C extends string>({
	colonne,
	glissable,
	enCours
}: {
	readonly colonne: ColonneKanban<C>;
	readonly glissable: boolean;
	/** Une carte est en route : chaque colonne montre qu'elle peut la recevoir. */
	readonly enCours: boolean;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: colonne.cle, disabled: !glissable });
	return (
		<section
			ref={setNodeRef}
			aria-label={`${colonne.libelle}, ${colonne.cartes.length}`}
			className={cn(
				'flex w-72 shrink-0 snap-start flex-col gap-2 rounded-cladd-xl bg-cladd-fg/[0.035] p-2 transition-colors duration-150',
				enCours && 'outline-1 -outline-offset-1 outline-cladd-outline outline-dashed',
				isOver && 'bg-cladd-fg/[0.09] outline-2 outline-cladd-primary outline-solid'
			)}
		>
			<header className="flex items-baseline justify-between gap-2 px-1.5 pt-1">
				<h2 className="truncate text-cladd-2xs font-semibold">{colonne.libelle}</h2>
				<span className="shrink-0 text-cladd-2xs text-cladd-fg-soft tabular-nums">
					{colonne.cartes.length}
				</span>
			</header>
			{colonne.precision === undefined ? null : (
				<p className="-mt-1.5 px-1.5 text-cladd-3xs text-cladd-fg-soft">{colonne.precision}</p>
			)}
			<div className="flex min-h-24 flex-col gap-2">
				{colonne.cartes.map((carte) => (
					<CarteGlissable key={carte.id} carte={carte} glissable={glissable} />
				))}
				{colonne.cartes.length === 0 ? (
					<p className="rounded-cladd-lg border border-dashed border-cladd-outline px-3 py-5 text-center text-cladd-3xs text-cladd-fg-softer">
						{glissable ? 'Glissez une carte ici' : 'Personne à cette étape'}
					</p>
				) : null}
			</div>
		</section>
	);
}

/**
 * LE KANBAN : une colonne par étape, avec son compte. Avec `onDeposer`, on glisse une
 * carte d'une colonne à l'autre ; sans, il se lit (les étapes d'un compte se
 * déduisent, elles ne se choisissent pas).
 */
export function Kanban<C extends string>({
	colonnes,
	onDeposer,
	libelleDeLaCarte = 'la carte'
}: {
	readonly colonnes: readonly ColonneKanban<C>[];
	readonly onDeposer?: (id: string, colonne: C) => void;
	/** « le prospect » : ce que disent les annonces au lecteur d'écran. */
	readonly libelleDeLaCarte?: string;
}) {
	const [enMain, setEnMain] = useState<CarteKanban | null>(null);
	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
		useSensor(KeyboardSensor)
	);
	const glissable = onDeposer !== undefined;
	const nomDe = (id: string | number) =>
		colonnes.flatMap((c) => c.cartes).find((c) => c.id === String(id))?.titre ?? libelleDeLaCarte;
	const colonneDe = (id: string | number | undefined) =>
		colonnes.find((c) => c.cle === id)?.libelle ?? '';

	const annonces: Announcements = {
		onDragStart: ({ active }) => `${nomDe(active.id)} est en main.`,
		onDragOver: ({ active, over }) =>
			over
				? `${nomDe(active.id)} au-dessus de « ${colonneDe(over.id)} ».`
				: `${nomDe(active.id)} n’est au-dessus d’aucune colonne.`,
		onDragEnd: ({ active, over }) =>
			over
				? `${nomDe(active.id)} posé dans « ${colonneDe(over.id)} ».`
				: `${nomDe(active.id)} reposé à sa place.`,
		onDragCancel: ({ active }) => `Déplacement de ${nomDe(active.id)} annulé.`
	};

	function debut({ active }: DragStartEvent) {
		setEnMain(colonnes.flatMap((c) => c.cartes).find((c) => c.id === String(active.id)) ?? null);
	}

	function fin({ active, over }: DragEndEvent) {
		setEnMain(null);
		if (onDeposer === undefined || over === null) return;
		const depart = colonnes.find((c) => c.cartes.some((carte) => carte.id === String(active.id)));
		const arrivee = colonnes.find((c) => c.cle === over.id);
		if (arrivee !== undefined && depart?.cle !== arrivee.cle)
			onDeposer(String(active.id), arrivee.cle);
	}

	return (
		<DndContext
			sensors={sensors}
			onDragStart={debut}
			onDragEnd={fin}
			onDragCancel={() => setEnMain(null)}
			accessibility={{
				announcements: annonces,
				screenReaderInstructions: {
					draggable:
						'Pour déplacer une carte, appuyez sur Espace, puis sur les flèches pour changer de colonne. Espace pour poser, Échap pour annuler.'
				}
			}}
		>
			<div
				className={cn(
					'defilement-sans-barre -mx-cladd-2xs flex min-h-[55svh] items-start gap-3 overflow-x-auto px-cladd-2xs pb-3',
					// Au téléphone, une colonne à la fois sous le doigt (Attio iOS) ; jamais pendant un glisser.
					enMain === null && 'max-lg:snap-x max-lg:snap-mandatory max-lg:scroll-px-cladd-2xs'
				)}
			>
				{colonnes.map((colonne) => (
					<Colonne
						key={colonne.cle}
						colonne={colonne}
						glissable={glissable}
						enCours={enMain !== null}
					/>
				))}
			</div>
			<DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
				{enMain === null ? null : (
					<div className={cn(CLASSE_CARTE, 'w-68 rotate-2 cursor-grabbing shadow-xl')}>
						<ContenuDeCarte carte={enMain} />
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LE TABLEAU
// ─────────────────────────────────────────────────────────────────────────

export interface ColonneTableau<T> {
	readonly cle: string;
	readonly libelle: string;
	readonly rendu: (ligne: T) => ReactNode;
	/** Présente : l'en-tête trie la colonne. */
	readonly tri?: (a: T, b: T) => number;
	/** Une largeur Tailwind (`w-40`) ; sans, la colonne prend le reste. */
	readonly largeur?: string;
	readonly aDroite?: boolean;
	/** La cellule porte un contrôle (un menu) : elle passe au-dessus du lien de la ligne. */
	readonly interactive?: boolean;
}

type Sens = 'asc' | 'desc';

/**
 * LE TABLEAU DU BUREAU (Lightfield, folk, HubSpot) : des colonnes triables d'un
 * toucher sur l'en-tête, une ligne entière qui mène à sa fiche, une case pour la
 * sélection. Au téléphone, la liste en cartes en tient lieu.
 */
export function TableauCrm<T extends { readonly id: string }>({
	colonnes,
	lignes,
	lien,
	triInitial,
	selection,
	libelle
}: {
	readonly colonnes: readonly ColonneTableau<T>[];
	readonly lignes: readonly T[];
	readonly lien: (ligne: T) => {
		readonly vers: NonNullable<LinkProps['to']>;
		readonly parametres: LinkProps['params'];
	};
	readonly triInitial?: { readonly cle: string; readonly sens: Sens };
	readonly selection?: {
		readonly choisis: ReadonlySet<string>;
		readonly onChoisir: (choisis: ReadonlySet<string>) => void;
	};
	/** Ce que le tableau montre, pour un lecteur d'écran. */
	readonly libelle: string;
}) {
	const [tri, setTri] = useState<{ cle: string; sens: Sens } | null>(triInitial ?? null);
	const colonneTriee = colonnes.find((c) => c.cle === tri?.cle);
	const triees =
		colonneTriee?.tri === undefined || tri === null
			? [...lignes]
			: [...lignes].sort((a, b) => (tri.sens === 'asc' ? 1 : -1) * (colonneTriee.tri?.(a, b) ?? 0));
	const toutes =
		selection !== undefined &&
		lignes.length > 0 &&
		lignes.every((l) => selection.choisis.has(l.id));

	function trier(cle: string) {
		setTri((t) =>
			t?.cle !== cle ? { cle, sens: 'asc' } : t.sens === 'asc' ? { cle, sens: 'desc' } : null
		);
	}

	return (
		<div className="verre-carte overflow-x-auto rounded-cladd-xl">
			<table className="w-full min-w-[44rem] border-collapse text-left" aria-label={libelle}>
				<thead>
					<tr className="border-b border-cladd-outline">
						{selection === undefined ? null : (
							<th scope="col" className="w-11 py-2 pl-2">
								<button
									type="button"
									aria-label={toutes ? 'Tout désélectionner' : 'Tout sélectionner'}
									aria-pressed={toutes}
									onClick={() =>
										selection.onChoisir(toutes ? new Set() : new Set(lignes.map((l) => l.id)))
									}
									className="flex size-9 items-center justify-center"
								>
									<Checkbox as="span" size="md" checked={toutes} />
								</button>
							</th>
						)}
						{colonnes.map((c) => {
							const actif = tri?.cle === c.cle;
							return (
								<th
									key={c.cle}
									scope="col"
									aria-sort={actif ? (tri.sens === 'asc' ? 'ascending' : 'descending') : 'none'}
									className={cn(
										'px-3 py-2 text-cladd-3xs font-medium whitespace-nowrap text-cladd-fg-soft',
										c.largeur,
										c.aDroite && 'text-right'
									)}
								>
									{c.tri === undefined ? (
										c.libelle
									) : (
										<button
											type="button"
											onClick={() => trier(c.cle)}
											className={cn(
												'inline-flex items-center gap-1 rounded-md py-1 hover:text-cladd-fg',
												actif && 'text-cladd-fg',
												c.aDroite && 'flex-row-reverse'
											)}
										>
											{c.libelle}
											{actif ? (
												tri.sens === 'asc' ? (
													<ArrowUpIcon aria-hidden className="size-3.5" />
												) : (
													<ArrowDownIcon aria-hidden className="size-3.5" />
												)
											) : (
												<ChevronsUpDownIcon aria-hidden className="size-3.5 opacity-40" />
											)}
										</button>
									)}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{triees.map((ligne) => {
						const destination = lien(ligne);
						const choisie = selection?.choisis.has(ligne.id) === true;
						return (
							<tr
								key={ligne.id}
								className={cn(
									'relative border-b border-cladd-outline transition-colors last:border-b-0 hover:bg-cladd-fg/[0.03]',
									choisie && 'bg-cladd-fg/[0.05]'
								)}
							>
								{selection === undefined ? null : (
									<td className="relative z-10 w-11 py-1.5 pl-2">
										<button
											type="button"
											aria-pressed={choisie}
											aria-label={choisie ? 'Désélectionner la ligne' : 'Sélectionner la ligne'}
											onClick={() => {
												const suivante = new Set(selection.choisis);
												if (choisie) suivante.delete(ligne.id);
												else suivante.add(ligne.id);
												selection.onChoisir(suivante);
											}}
											className="flex size-9 items-center justify-center"
										>
											<Checkbox as="span" size="md" checked={choisie} />
										</button>
									</td>
								)}
								{colonnes.map((c, i) => (
									<td
										key={c.cle}
										className={cn(
											'h-13 px-3 py-1.5 text-cladd-2xs',
											c.largeur,
											c.aDroite && 'text-right tabular-nums',
											c.interactive && 'relative z-10',
											// Le nom ne s'écrase jamais sur deux lignes : la colonne qui cède, c'est l'action.
											i === 0 && 'min-w-52 font-semibold'
										)}
									>
										{i === 0 ? (
											<Lien
												to={destination.vers}
												params={destination.parametres as never}
												className="after:absolute after:inset-0 hover:underline"
											>
												{c.rendu(ligne)}
											</Lien>
										) : (
											c.rendu(ligne)
										)}
									</td>
								))}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// L'ENTONNOIR
// ─────────────────────────────────────────────────────────────────────────

export interface EtapeAffichee {
	readonly cle: string;
	readonly libelle: string;
	readonly nombre: number;
	readonly partDuDepart: number;
	readonly passage: number | null;
	readonly perdus: number;
}

/**
 * L'ENTONNOIR (Pipedrive, Squarespace, Zoho) : une barre par étape, haute de sa part
 * du départ, et entre deux barres le taux de passage. Une barre se touche : la liste
 * de l'étape s'affiche dessous. Au téléphone, les barres se couchent.
 */
export function Entonnoir({
	etapes,
	choisie,
	onChoisir
}: {
	readonly etapes: readonly EtapeAffichee[];
	readonly choisie: string | null;
	readonly onChoisir: (cle: string | null) => void;
}) {
	const premiere = etapes[0];
	const derniere = etapes.at(-1);
	const globale =
		premiere === undefined || derniere === undefined || premiere.nombre === 0
			? 0
			: Math.round((derniere.nombre * 100) / premiere.nombre);
	const basculer = (cle: string) => onChoisir(choisie === cle ? null : cle);

	return (
		<section className="verre-carte cladd-color-brand flex flex-col gap-cladd-xs rounded-cladd-xl p-cladd-2xs lg:p-cladd-xs">
			<div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
				<p className="text-cladd-2xs text-cladd-fg-soft">
					De « {premiere?.libelle} » à « {derniere?.libelle} »
				</p>
				<p className="text-cladd-2xs text-cladd-fg-soft">
					Conversion{' '}
					<span className="text-cladd-sm font-semibold text-cladd-fg tabular-nums">
						{globale} %
					</span>
				</p>
			</div>

			{/*
			  Au bureau : des barres debout, toutes de la même largeur, et le passage posé
			  PAR-DESSUS, entre deux barres. Dans le flux, il élargissait la première barre
			  (la seule sans pastille devant elle) : relevé à 1280 px le 16/10/2026.
			*/}
			<ol className="hidden lg:flex">
				{etapes.map((e, i) => {
					const hauteur = Math.max(e.partDuDepart, e.nombre > 0 ? 3 : 1);
					return (
						<li key={e.cle} className="relative min-w-0 flex-1">
							<button
								type="button"
								aria-pressed={choisie === e.cle}
								onClick={() => basculer(e.cle)}
								className="group flex w-full flex-col gap-2 px-2.5"
							>
								<span className="relative block h-48 w-full">
									<span
										className="absolute inset-x-0 text-center text-cladd-2xs font-semibold tabular-nums"
										style={{ bottom: `calc(${hauteur}% + 0.25rem)` }}
									>
										{e.nombre}
									</span>
									<span
										className={cn(
											'absolute inset-x-0 bottom-0 rounded-t-cladd-md transition-all duration-300 group-hover:opacity-85',
											choisie === null || choisie === e.cle
												? 'bg-cladd-primary'
												: 'bg-cladd-primary/25'
										)}
										style={{ height: `${hauteur}%` }}
									/>
								</span>
								<span className="line-clamp-2 min-h-8 text-center text-cladd-3xs leading-tight text-cladd-fg-soft">
									{e.libelle}
								</span>
							</button>
							{i === 0 ? null : (
								<span className="pointer-events-none absolute top-24 left-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cladd-bg px-1.5 py-0.5 text-cladd-3xs font-semibold tabular-nums shadow-sm">
									{e.passage} %
								</span>
							)}
						</li>
					);
				})}
			</ol>

			{/* Au téléphone : des barres couchées, le passage à droite. */}
			<ol className="flex flex-col gap-2 lg:hidden">
				{etapes.map((e) => (
					<li key={e.cle}>
						<button
							type="button"
							aria-pressed={choisie === e.cle}
							onClick={() => basculer(e.cle)}
							className="flex w-full flex-col gap-1 rounded-cladd-lg px-1 py-1 text-left"
						>
							<span className="flex items-baseline justify-between gap-2 text-cladd-2xs">
								<span className="min-w-0 truncate font-medium">{e.libelle}</span>
								<span className="shrink-0 text-cladd-fg-soft tabular-nums">
									<span className="font-semibold text-cladd-fg">{e.nombre}</span>
									{e.passage === null ? null : ` · ${e.passage} %`}
								</span>
							</span>
							<span className="h-2.5 w-full overflow-hidden rounded-full bg-cladd-fg/[0.07]">
								<span
									className={cn(
										'block h-full rounded-full transition-all duration-300',
										choisie === null || choisie === e.cle
											? 'bg-cladd-primary'
											: 'bg-cladd-primary/25'
									)}
									style={{ width: `${Math.max(e.partDuDepart, e.nombre > 0 ? 2 : 0)}%` }}
								/>
							</span>
						</button>
					</li>
				))}
			</ol>

			{/* Le détail, comme sous le graphique de Zoho : de quoi refaire chaque taux. */}
			<div className="hidden overflow-x-auto lg:block">
				<table className="w-full text-left text-cladd-2xs">
					<thead>
						<tr className="border-b border-cladd-outline text-cladd-3xs text-cladd-fg-soft">
							<th scope="col" className="py-1.5 pr-3 font-medium">
								Étape
							</th>
							<th scope="col" className="px-3 py-1.5 text-right font-medium">
								Nombre
							</th>
							<th scope="col" className="px-3 py-1.5 text-right font-medium">
								Part du départ
							</th>
							<th scope="col" className="px-3 py-1.5 text-right font-medium">
								Passage
							</th>
							<th scope="col" className="py-1.5 pl-3 text-right font-medium">
								Arrêtés là
							</th>
						</tr>
					</thead>
					<tbody>
						{etapes.map((e, i) => (
							<tr key={e.cle} className="border-b border-cladd-outline last:border-b-0">
								<td className="py-1.5 pr-3 font-medium">{e.libelle}</td>
								<td className="px-3 py-1.5 text-right tabular-nums">{e.nombre}</td>
								<td className="px-3 py-1.5 text-right tabular-nums">{e.partDuDepart} %</td>
								<td className="px-3 py-1.5 text-right tabular-nums">
									{e.passage === null ? '' : `${e.passage} %`}
								</td>
								<td className="py-1.5 pl-3 text-right text-cladd-fg-soft tabular-nums">
									{etapes[i + 1] === undefined ? '' : (etapes[i + 1]?.perdus ?? 0)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
