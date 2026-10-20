import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Input, Segmented, SegmentedButton, Switch, Textarea } from '@cladd-ui/react';
import {
	CheckIcon,
	CircleAlertIcon,
	CircleCheckIcon,
	CodeIcon,
	EyeIcon,
	ImageIcon,
	ListTreeIcon,
	PenLineIcon,
	PlusIcon,
	SearchIcon,
	SlidersHorizontalIcon,
	SquareStackIcon,
	TriangleAlertIcon,
	XIcon
} from 'lucide-react';
import { cn } from './cn';
import { ChoixDEntete, PastilleDArticle, type StatutArticle } from './cms';
import { IconeDeGabarit } from './icones-blocs';
import {
	GROUPES_DE_GABARITS,
	TYPE_GLISSE,
	type GabaritDeBloc
} from '../lib/blog/gabarits';
import {
	avecChamp,
	ecrireComposant,
	valeurDuChamp,
	type ComposantLu,
	type IllustrationDuCatalogue,
	type ValeurDuCatalogue
} from '../lib/blog/catalogue';

/**
 * LE CMS DU BLOG, L'ÉDITEUR (20/10/2026). Le fondateur : « un éditeur visuel avec des blocs
 * en glisser-déposer, hyper intuitif, à la Notion ». Relevé sur Mobbin, chez Notion (la page :
 * couverture, titre, propriétés, puis le texte), Ghost et beehiiv (la barre : l'état, les
 * mots, l'aperçu, un seul bouton plein ; les réglages dans un panneau à droite), Craft (le
 * panneau « Insérer » qu'on glisse dans le document) et GitBook (le plan à côté du texte).
 *
 * Ce fichier porte le cadre : la barre, la page, le panneau et ses onglets. L'éditeur à
 * blocs lui-même (`editeur-blocs.tsx`) se charge à part.
 */

// ─── La barre d'édition ──────────────────────────────────────────────────────

export type ModeDEdition = 'ecrire' | 'apercu' | 'mdx';

const MODES: readonly { cle: ModeDEdition; libelle: string; Icone: typeof PenLineIcon }[] = [
	{ cle: 'ecrire', libelle: 'Écrire', Icone: PenLineIcon },
	{ cle: 'apercu', libelle: 'Aperçu', Icone: EyeIcon },
	{ cle: 'mdx', libelle: 'MDX', Icone: CodeIcon }
];

/** Ce que la relecture a trouvé, en une pastille : rouge s'il bloque, sinon le compte à relire. */
function PastilleDeRelecture({
	bloquants,
	avertissements
}: {
	readonly bloquants: number;
	readonly avertissements: number;
}) {
	if (bloquants > 0) {
		return (
			<span className="flex items-center gap-1 font-semibold">
				<CircleAlertIcon aria-hidden className="text-cladd-red size-4" />
				{bloquants} à corriger
			</span>
		);
	}
	if (avertissements > 0) {
		return (
			<span className="flex items-center gap-1">
				<TriangleAlertIcon aria-hidden className="text-cladd-yellow size-4" />
				{avertissements} à relire
			</span>
		);
	}
	return (
		<span className="flex items-center gap-1">
			<CircleCheckIcon aria-hidden className="text-cladd-green size-4" />
			Relu
		</span>
	);
}

export function BarreDEdition({
	statut,
	enregistre,
	mots,
	mode,
	onMode,
	bloquants,
	avertissements,
	onRelecture,
	onReglages,
	action
}: {
	readonly statut: StatutArticle;
	/** Le brouillon local est à jour. */
	readonly enregistre: boolean;
	readonly mots: number;
	readonly mode: ModeDEdition;
	readonly onMode: (mode: ModeDEdition) => void;
	readonly bloquants: number;
	readonly avertissements: number;
	readonly onRelecture: () => void;
	/** Sous 1280 px, le panneau s'ouvre en page pleine. */
	readonly onReglages: () => void;
	readonly action: ReactNode;
}) {
	const minutes = Math.max(1, Math.round(mots / 230));
	return (
		<div className="verre-carte sticky top-2 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-cladd-xl px-3 py-2">
			<span className="flex min-w-0 items-center gap-2">
				<PastilleDArticle statut={statut} />
				<span
					className="hidden items-center gap-1 text-cladd-3xs text-cladd-fg-soft sm:flex"
					aria-live="polite"
				>
					{enregistre ? <CheckIcon aria-hidden className="size-3.5" /> : null}
					{enregistre ? 'Enregistré dans ce navigateur' : 'Enregistrement…'}
				</span>
			</span>
			<span className="hidden text-cladd-3xs text-cladd-fg-soft tabular-nums md:inline">
				{mots.toLocaleString('fr-FR')} mots · {minutes} min de lecture
			</span>
			<span className="ml-auto flex items-center gap-2">
				<Segmented activeColor="brand" activeVariant="solid-fill" aria-label="Mode d’édition">
					{MODES.map(({ cle, libelle, Icone }) => (
						<SegmentedButton
							key={cle}
							active={mode === cle}
							onClick={() => onMode(cle)}
							aria-label={libelle}
							title={libelle}
						>
							<Icone aria-hidden className="size-4" />
							<span className="hidden xl:inline">{libelle}</span>
						</SegmentedButton>
					))}
				</Segmented>
				<button
					type="button"
					onClick={onRelecture}
					className="hidden h-9 items-center rounded-full px-3 text-cladd-2xs hover:bg-cladd-surface-minus sm:flex"
				>
					<PastilleDeRelecture bloquants={bloquants} avertissements={avertissements} />
				</button>
				<button
					type="button"
					onClick={onReglages}
					aria-label="Réglages et blocs"
					className="flex size-9 items-center justify-center rounded-full hover:bg-cladd-surface-minus xl:hidden"
				>
					<SlidersHorizontalIcon aria-hidden className="size-4" />
				</button>
				{action}
			</span>
		</div>
	);
}

// ─── La page : couverture, titre, chapeau, « En bref » ───────────────────────

/** Une zone de texte qui prend la hauteur de ce qu'elle contient. */
function ZoneQuiGrandit({
	valeur,
	onChange,
	className,
	placeholder,
	libelle,
	lectureSeule,
	onEntree
}: {
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	readonly className?: string;
	readonly placeholder: string;
	readonly libelle: string;
	readonly lectureSeule: boolean;
	/** Entrée valide au lieu d'aller à la ligne : un titre tient sur une phrase. */
	readonly onEntree?: () => void;
}) {
	const zone = useRef<HTMLTextAreaElement | null>(null);
	useEffect(() => {
		const element = zone.current;
		if (element === null) return;
		element.style.height = 'auto';
		element.style.height = `${element.scrollHeight}px`;
	}, [valeur]);
	return (
		<textarea
			ref={zone}
			rows={1}
			value={valeur}
			placeholder={placeholder}
			aria-label={libelle}
			readOnly={lectureSeule}
			spellCheck
			lang="fr"
			onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					onEntree?.();
				}
			}}
			className={cn(
				'w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-encre-site-claire/60',
				className
			)}
		/>
	);
}

/** La longueur d'un champ quand elle compte : au focus, ou hors des bornes du build. */
function Compteur({
	longueur,
	min,
	max,
	visible
}: {
	readonly longueur: number;
	readonly min: number;
	readonly max: number;
	readonly visible: boolean;
}) {
	const horsBornes = longueur < min || longueur > max;
	if (!visible && !horsBornes) return null;
	return (
		<span
			className={cn(
				'text-cladd-3xs text-encre-site-claire tabular-nums',
				horsBornes && 'font-semibold text-encre-site'
			)}
		>
			{longueur} / {max}
			{longueur < min ? ` (${min} au moins)` : ''}
		</span>
	);
}

function PhrasesEnBrefEnPlace({
	phrases,
	onChange,
	lectureSeule
}: {
	readonly phrases: readonly string[];
	readonly onChange: (phrases: string[]) => void;
	readonly lectureSeule: boolean;
}) {
	const champs = useRef<(HTMLInputElement | null)[]>([]);
	const [focus, setFocus] = useState<number | null>(null);

	function surTouche(evenement: KeyboardEvent<HTMLInputElement>, rang: number) {
		if (evenement.key === 'Enter' && phrases.length < 5) {
			evenement.preventDefault();
			onChange([...phrases.slice(0, rang + 1), '', ...phrases.slice(rang + 1)]);
			requestAnimationFrame(() => champs.current[rang + 1]?.focus());
		}
		if (evenement.key === 'Backspace' && phrases[rang] === '' && phrases.length > 0) {
			evenement.preventDefault();
			onChange(phrases.filter((_, i) => i !== rang));
			requestAnimationFrame(() => champs.current[Math.max(0, rang - 1)]?.focus());
		}
	}

	return (
		<aside className="flex flex-col gap-1.5 rounded-carte-site border border-filet-creme bg-papier p-cladd-xs">
			<span className="flex items-baseline justify-between gap-2">
				<span className="text-intertitre font-semibold">En bref</span>
				<span className="text-cladd-3xs text-encre-site-claire">
					{phrases.length === 0 ? 'Facultatif, deux à cinq phrases' : `${phrases.length} sur 5`}
				</span>
			</span>
			<ul className="flex flex-col gap-1">
				{phrases.map((phrase, rang) => (
					<li key={rang} className="flex items-baseline gap-2">
						<span aria-hidden className="text-encre-site-claire">
							•
						</span>
						<input
							ref={(el) => {
								champs.current[rang] = el;
							}}
							value={phrase}
							readOnly={lectureSeule}
							aria-label={`Phrase ${rang + 1} de « En bref »`}
							placeholder="Une phrase que le lecteur pressé retient"
							onFocus={() => setFocus(rang)}
							onBlur={() => setFocus(null)}
							onKeyDown={(e) => surTouche(e, rang)}
							onChange={(e) => onChange(phrases.map((p, i) => (i === rang ? e.target.value : p)))}
							className="min-w-0 flex-1 bg-transparent text-cladd-md leading-relaxed outline-none placeholder:text-encre-site-claire/60"
						/>
						<Compteur longueur={phrase.length} min={10} max={220} visible={focus === rang} />
					</li>
				))}
			</ul>
			{lectureSeule || phrases.length >= 5 ? null : (
				<button
					type="button"
					onClick={() => {
						onChange([...phrases, '']);
						requestAnimationFrame(() => champs.current[phrases.length]?.focus());
					}}
					className="flex items-center gap-1.5 self-start rounded-full px-2 py-1 text-cladd-2xs text-encre-site-douce hover:bg-creme-profonde"
				>
					<PlusIcon aria-hidden className="size-3.5" />
					Ajouter une phrase
				</button>
			)}
		</aside>
	);
}

export function TeteDArticle({
	couverture,
	onCouverture,
	titre,
	onTitre,
	description,
	onDescription,
	enBref,
	onEnBref,
	lectureSeule,
	onFinDuTitre
}: {
	readonly couverture: ReactNode;
	readonly onCouverture: () => void;
	readonly titre: string;
	readonly onTitre: (titre: string) => void;
	readonly description: string;
	readonly onDescription: (description: string) => void;
	readonly enBref: readonly string[];
	readonly onEnBref: (phrases: string[]) => void;
	readonly lectureSeule: boolean;
	/** Entrée dans le titre ou le chapeau : on passe au champ suivant. */
	readonly onFinDuTitre?: () => void;
}) {
	const [focus, setFocus] = useState<'titre' | 'description' | null>(null);
	const chapeau = useRef<HTMLDivElement | null>(null);
	return (
		<header className="flex flex-col gap-cladd-2xs">
			<button
				type="button"
				onClick={onCouverture}
				disabled={lectureSeule}
				className="group relative block aspect-[3/1] overflow-hidden rounded-carte-site"
				aria-label="Changer l’illustration de couverture"
			>
				<span className="absolute inset-0 [&>svg]:h-full [&>svg]:rounded-none">{couverture}</span>
				{lectureSeule ? null : (
					<span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-papier/90 px-3 py-1.5 text-cladd-2xs font-medium text-encre-site opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
						<ImageIcon aria-hidden className="size-3.5" />
						Changer l’illustration
					</span>
				)}
			</button>
			<div onFocus={() => setFocus('titre')} onBlur={() => setFocus(null)} className="flex flex-col">
				<ZoneQuiGrandit
					valeur={titre}
					onChange={onTitre}
					placeholder="Le titre de l’article"
					libelle="Titre de l’article"
					lectureSeule={lectureSeule}
					onEntree={() => chapeau.current?.querySelector('textarea')?.focus()}
					className="font-serif text-[clamp(32px,4vw,52px)] leading-tight font-medium tracking-titre-section text-balance"
				/>
				<Compteur longueur={titre.length} min={10} max={90} visible={focus === 'titre'} />
			</div>
			<div
				ref={chapeau}
				onFocus={() => setFocus('description')}
				onBlur={() => setFocus(null)}
				className="flex flex-col"
			>
				<ZoneQuiGrandit
					valeur={description}
					onChange={onDescription}
					placeholder="Le chapeau : ce que Google affiche sous le titre"
					libelle="Description de l’article"
					lectureSeule={lectureSeule}
					{...(onFinDuTitre === undefined ? {} : { onEntree: onFinDuTitre })}
					className="text-chapeau leading-relaxed text-encre-site-douce"
				/>
				<Compteur longueur={description.length} min={50} max={170} visible={focus === 'description'} />
			</div>
			<PhrasesEnBrefEnPlace phrases={enBref} onChange={onEnBref} lectureSeule={lectureSeule} />
		</header>
	);
}

/** La page de l'article : le papier du site, quel que soit le thème de l'admin. */
export function PapierDArticle({ children }: { readonly children: ReactNode }) {
	return (
		<div className="light min-w-0 rounded-cladd-xl bg-creme text-encre-site">
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-cladd-sm px-cladd-2xs py-cladd-sm md:px-cladd-sm md:py-cladd-lg">
				{children}
			</div>
		</div>
	);
}

// ─── Le panneau ──────────────────────────────────────────────────────────────

export type OngletDuPanneau = 'blocs' | 'reglages' | 'plan' | 'relecture';

const ONGLETS: readonly { cle: OngletDuPanneau; libelle: string; Icone: typeof PenLineIcon }[] = [
	{ cle: 'blocs', libelle: 'Blocs', Icone: SquareStackIcon },
	{ cle: 'reglages', libelle: 'Réglages', Icone: SlidersHorizontalIcon },
	{ cle: 'plan', libelle: 'Plan', Icone: ListTreeIcon },
	{ cle: 'relecture', libelle: 'Relecture', Icone: CircleCheckIcon }
];

export function PanneauDEdition({
	onglet,
	onOnglet,
	aRelire,
	choix,
	children
}: {
	readonly onglet: OngletDuPanneau;
	readonly onOnglet: (onglet: OngletDuPanneau) => void;
	/** Le nombre de points de relecture, en pastille sur l'onglet. */
	readonly aRelire: number;
	/** Le bloc choisi dans l'article, réglé en tête du panneau. */
	readonly choix?: ReactNode;
	readonly children: ReactNode;
}) {
	return (
		<div className="flex min-h-0 flex-col gap-cladd-2xs">
			<Segmented activeColor="brand" activeVariant="solid-fill" aria-label="Le panneau de l’article">
				{ONGLETS.map(({ cle, libelle, Icone }) => (
					<SegmentedButton
						key={cle}
						active={onglet === cle}
						onClick={() => onOnglet(cle)}
						aria-label={libelle}
						title={libelle}
						className="flex-1"
					>
						<Icone aria-hidden className="size-4" />
						<span className="hidden 2xl:inline">{libelle}</span>
						{cle === 'relecture' && aRelire > 0 ? (
							<span className="rounded-full bg-cladd-fg/10 px-1.5 text-cladd-4xs font-semibold tabular-nums">
								{aRelire}
							</span>
						) : null}
					</SegmentedButton>
				))}
			</Segmented>
			{choix}
			<div className="min-h-0">{children}</div>
		</div>
	);
}

/** Un réglage du bloc choisi, en tête du panneau, avec sa croix. */
export function CarteDuChoix({
	titre,
	onFermer,
	children
}: {
	readonly titre: string;
	readonly onFermer: () => void;
	readonly children: ReactNode;
}) {
	return (
		<section className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-3">
			<span className="flex items-center justify-between gap-2">
				<span className="text-cladd-2xs font-semibold">{titre}</span>
				<button
					type="button"
					onClick={onFermer}
					aria-label="Fermer les réglages du bloc"
					className="flex size-7 items-center justify-center rounded-full text-cladd-fg-soft hover:bg-cladd-surface-minus"
				>
					<XIcon aria-hidden className="size-4" />
				</button>
			</span>
			{children}
		</section>
	);
}

// ─── L'onglet « Blocs » : ce qu'on glisse dans l'article ─────────────────────

export function PaletteDeBlocs({
	gabarits,
	onInserer,
	valeurs,
	recherche,
	onRecherche,
	onInsererValeur,
	apercu,
	lectureSeule
}: {
	readonly gabarits: readonly GabaritDeBloc[];
	readonly onInserer: (gabarit: GabaritDeBloc) => void;
	readonly valeurs: readonly ValeurDuCatalogue[];
	readonly recherche: string;
	readonly onRecherche: (recherche: string) => void;
	readonly onInsererValeur: (valeur: ValeurDuCatalogue) => void;
	readonly apercu: (valeur: ValeurDuCatalogue) => ReactNode;
	readonly lectureSeule: boolean;
}) {
	if (lectureSeule) {
		return (
			<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
				Lecture seule : seul un fondateur modifie les articles.
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-cladd-xs">
			<p className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-soft">
				Glissez un bloc dans l’article, ou touchez-le pour l’insérer au curseur. Au clavier : « / »
				pour un bloc, « @ » pour une valeur de la loi.
			</p>
			{GROUPES_DE_GABARITS.map((groupe) => (
				<section key={groupe} className="flex flex-col gap-1">
					<h3 className="px-1 text-cladd-3xs font-semibold text-cladd-fg-soft">{groupe}</h3>
					<ul className="flex flex-col">
						{gabarits
							.filter((g) => g.groupe === groupe)
							.map((g) => (
								<li key={g.id}>
									<button
										type="button"
										draggable
										onDragStart={(e) => {
											e.dataTransfer.setData(TYPE_GLISSE, g.id);
											e.dataTransfer.effectAllowed = 'copy';
										}}
										onClick={() => onInserer(g)}
										className="group flex w-full cursor-grab items-center gap-2.5 rounded-cladd-lg px-1.5 py-1.5 text-left hover:bg-cladd-surface-minus active:cursor-grabbing"
									>
										<span className="light">
											<IconeDeGabarit icone={g.icone} />
										</span>
										<span className="flex min-w-0 flex-col">
											<span className="truncate text-cladd-2xs font-medium">{g.libelle}</span>
											<span className="truncate text-cladd-3xs text-cladd-fg-soft">{g.description}</span>
										</span>
									</button>
								</li>
							))}
					</ul>
				</section>
			))}
			<section className="flex flex-col gap-1.5">
				<h3 className="px-1 text-cladd-3xs font-semibold text-cladd-fg-soft">Valeurs de la loi</h3>
				<label className="flex items-center gap-2">
					<span className="sr-only">Chercher une valeur de la loi</span>
					<div className="min-w-0 flex-1">
						<Input
							size="md"
							value={recherche}
							onChange={onRecherche}
							placeholder="Frais de recouvrement, transport, déclaration…"
						/>
					</div>
					<SearchIcon aria-hidden className="size-4 shrink-0 text-cladd-fg-soft" />
				</label>
				<ul className="flex flex-col">
					{valeurs.slice(0, 8).map((v) => (
						<li key={v.id}>
							<button
								type="button"
								onClick={() => onInsererValeur(v)}
								className="flex w-full items-baseline justify-between gap-2 rounded-cladd-lg px-1.5 py-1.5 text-left hover:bg-cladd-surface-minus"
							>
								<span className="min-w-0 truncate text-cladd-2xs">{v.libelle}</span>
								<span className="shrink-0 text-cladd-3xs text-cladd-fg-soft tabular-nums">
									{apercu(v)}
								</span>
							</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}

// ─── L'onglet « Réglages » ───────────────────────────────────────────────────

export function ReglagesDeLArticle({
	date,
	onDate,
	categorie,
	categories,
	onCategorie,
	pilier,
	piliers,
	onPilier,
	illustration,
	illustrations,
	onIllustration,
	couverturePour,
	adresse,
	onAdresse,
	adresseModifiable,
	brouillon,
	onBrouillon,
	auteur,
	lectureSeule
}: {
	readonly date: string;
	readonly onDate: (date: string) => void;
	readonly categorie: string;
	readonly categories: readonly string[];
	readonly onCategorie: (categorie: string) => void;
	readonly pilier: string;
	readonly piliers: readonly string[];
	readonly onPilier: (pilier: string) => void;
	readonly illustration: string;
	readonly illustrations: readonly string[];
	readonly onIllustration: (illustration: string) => void;
	readonly couverturePour: (illustration: string) => ReactNode;
	readonly adresse: string;
	readonly onAdresse: (adresse: string) => void;
	readonly adresseModifiable: boolean;
	readonly brouillon: boolean;
	readonly onBrouillon: (brouillon: boolean) => void;
	readonly auteur: string;
	readonly lectureSeule: boolean;
}) {
	return (
		<div className="flex flex-col gap-cladd-xs">
			<label className="flex flex-col gap-1.5">
				<span className="px-1 text-cladd-3xs font-semibold text-cladd-fg-soft">Parution</span>
				<Input size="md" type="date" value={date} onChange={onDate} disabled={lectureSeule} />
				<span className="px-1 text-cladd-3xs text-cladd-fg-soft">
					L’article paraît ce jour-là, à Paris. Daté du futur, il attend son jour.
				</span>
			</label>
			<label className="flex items-center justify-between gap-3 px-1">
				<span className="flex flex-col">
					<span className="text-cladd-2xs font-medium">Brouillon</span>
					<span className="text-cladd-3xs text-cladd-fg-soft">Jamais en ligne, même publié.</span>
				</span>
				<Switch checked={brouillon} onChange={onBrouillon} disabled={lectureSeule} />
			</label>
			<ChoixDEntete libelle="Catégorie" valeur={categorie} options={categories} onChange={onCategorie} />
			<ChoixDEntete libelle="Pilier" valeur={pilier} options={piliers} onChange={onPilier} vide="Aucun" />
			<section className="flex flex-col gap-1.5" id="reglage-illustration">
				<span className="px-1 text-cladd-3xs font-semibold text-cladd-fg-soft">Illustration</span>
				<div className="light grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Illustration de couverture">
					{illustrations.map((i) => (
						<button
							key={i}
							type="button"
							role="radio"
							aria-checked={illustration === i}
							aria-label={i}
							title={i}
							disabled={lectureSeule}
							onClick={() => onIllustration(i)}
							className={cn(
								'overflow-hidden rounded-xl ring-offset-2 transition-shadow [&>svg]:rounded-none',
								illustration === i ? 'ring-2 ring-encre-site' : 'hover:ring-1 hover:ring-filet-creme'
							)}
						>
							{couverturePour(i)}
						</button>
					))}
				</div>
			</section>
			<label className="flex flex-col gap-1.5">
				<span className="px-1 text-cladd-3xs font-semibold text-cladd-fg-soft">Adresse</span>
				<Input
					size="md"
					value={adresse}
					onChange={onAdresse}
					disabled={!adresseModifiable || lectureSeule}
				/>
				<span className="px-1 text-cladd-3xs break-all text-cladd-fg-soft">
					letikette.com/blog/{adresse}
					{adresseModifiable ? ' : déduite du titre, modifiable avant la première publication.' : ''}
				</span>
			</label>
			<p className="px-1 text-cladd-3xs text-cladd-fg-soft">Signé {auteur}.</p>
		</div>
	);
}

// ─── L'onglet « Plan » ───────────────────────────────────────────────────────

export interface TitreDuPlan {
	readonly id: string;
	readonly niveau: 2 | 3;
	readonly texte: string;
}

export function PlanDeLArticle({
	titres,
	onAller
}: {
	readonly titres: readonly TitreDuPlan[];
	readonly onAller: (id: string) => void;
}) {
	if (titres.length === 0) {
		return (
			<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
				Les intertitres de l’article apparaîtront ici, pour y aller d’un toucher.
			</p>
		);
	}
	return (
		<ol className="flex flex-col">
			{titres.map((t) => (
				<li key={t.id}>
					<button
						type="button"
						onClick={() => onAller(t.id)}
						className={cn(
							'w-full rounded-cladd-lg py-1.5 pr-1.5 text-left text-cladd-2xs hover:bg-cladd-surface-minus',
							t.niveau === 3 ? 'pl-5 text-cladd-fg-soft' : 'pl-1.5 font-medium'
						)}
					>
						{t.texte === '' ? 'Intertitre vide' : t.texte}
					</button>
				</li>
			))}
		</ol>
	);
}

// ─── Les réglages du bloc choisi ─────────────────────────────────────────────

export function ReglagesDIllustration({
	illustration,
	composant,
	source,
	onSource,
	lectureSeule
}: {
	readonly illustration: IllustrationDuCatalogue | undefined;
	readonly composant: ComposantLu | null;
	readonly source: string;
	readonly onSource: (source: string) => void;
	readonly lectureSeule: boolean;
}) {
	const [sourceOuverte, setSourceOuverte] = useState(
		illustration === undefined || illustration.champs.length === 0
	);
	return (
		<div className="flex flex-col gap-cladd-3xs">
			{illustration === undefined ? null : (
				<p className="text-cladd-3xs text-cladd-fg-soft">{illustration.description}</p>
			)}
			{composant === null || illustration === undefined
				? null
				: illustration.champs.map((champ) => {
						const valeur = valeurDuChamp(composant, champ);
						const changer = (v: string | boolean) => onSource(ecrireComposant(avecChamp(composant, champ, v)));
						if (champ.genre === 'interrupteur') {
							return (
								<label key={champ.nom} className="flex items-center justify-between gap-3 px-1">
									<span className="text-cladd-2xs">{champ.libelle}</span>
									<Switch checked={valeur === true} onChange={changer} disabled={lectureSeule} />
								</label>
							);
						}
						if (champ.genre === 'choix') {
							const options = typeof valeur === 'string' && valeur !== '' && !champ.options.includes(valeur)
								? [valeur, ...champ.options]
								: champ.options;
							return (
								<ChoixDEntete
									key={champ.nom}
									libelle={champ.libelle}
									valeur={typeof valeur === 'string' ? valeur : ''}
									options={options}
									onChange={changer}
								/>
							);
						}
						return (
							<label key={champ.nom} className="flex flex-col gap-1">
								<span className="px-1 text-cladd-3xs text-cladd-fg-soft">{champ.libelle}</span>
								{champ.genre === 'texte' && champ.long === true ? (
									<Textarea
										value={typeof valeur === 'string' ? valeur : ''}
										onChange={changer}
										readOnly={lectureSeule}
									/>
								) : (
									<Input
										size="md"
										type={champ.genre === 'date' ? 'date' : champ.genre === 'nombre' ? 'number' : 'text'}
										value={typeof valeur === 'string' ? valeur : ''}
										onChange={changer}
										disabled={lectureSeule}
									/>
								)}
							</label>
						);
					})}
			<button
				type="button"
				onClick={() => setSourceOuverte((o) => !o)}
				className="flex items-center gap-1.5 self-start rounded-full px-1 py-1 text-cladd-3xs font-medium text-cladd-fg-soft hover:text-cladd-fg"
				aria-expanded={sourceOuverte}
			>
				<CodeIcon aria-hidden className="size-3.5" />
				{sourceOuverte ? 'Masquer la source MDX' : 'La source MDX'}
			</button>
			{sourceOuverte ? (
				<textarea
					value={source}
					readOnly={lectureSeule}
					onChange={(e) => onSource(e.target.value)}
					spellCheck={false}
					aria-label="La source MDX du bloc"
					className="verre-carte min-h-32 w-full resize-y rounded-cladd-lg p-2.5 font-mono text-cladd-3xs leading-relaxed outline-none"
				/>
			) : null}
		</div>
	);
}

export function ReglagesDeValeur({
	actuelle,
	apercuActuel,
	propositions,
	recherche,
	onRecherche,
	onRemplacer,
	apercu
}: {
	readonly actuelle: ValeurDuCatalogue | undefined;
	readonly apercuActuel: ReactNode;
	readonly propositions: readonly ValeurDuCatalogue[];
	readonly recherche: string;
	readonly onRecherche: (recherche: string) => void;
	readonly onRemplacer: (valeur: ValeurDuCatalogue) => void;
	readonly apercu: (valeur: ValeurDuCatalogue) => ReactNode;
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<p className="light rounded-cladd-lg bg-creme px-3 py-2 font-serif text-cladd-md text-encre-site">
				{apercuActuel}
			</p>
			<p className="text-cladd-3xs text-cladd-fg-soft">
				{actuelle === undefined
					? 'Un composant hors du catalogue : il se règle dans le mode MDX.'
					: `${actuelle.libelle}. Lu au registre le jour où l’article s’affiche : le chiffre suit la loi.`}
			</p>
			<Input size="md" value={recherche} onChange={onRecherche} placeholder="Remplacer par…" />
			<ul className="flex max-h-64 flex-col overflow-y-auto">
				{propositions.slice(0, 30).map((v) => (
					<li key={v.id}>
						<button
							type="button"
							onClick={() => onRemplacer(v)}
							className={cn(
								'flex w-full items-baseline justify-between gap-2 rounded-cladd-lg px-1.5 py-1.5 text-left hover:bg-cladd-surface-minus',
								v.id === actuelle?.id && 'bg-cladd-surface-minus font-medium'
							)}
						>
							<span className="min-w-0 truncate text-cladd-2xs">{v.libelle}</span>
							<span className="shrink-0 text-cladd-3xs text-cladd-fg-soft">{apercu(v)}</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

// ─── La mise en page ─────────────────────────────────────────────────────────

/**
 * La barre en haut, la page au milieu, le panneau à droite au-delà de 1280 px ; il reste
 * collé pendant qu'on écrit. En dessous, la page seule : le panneau s'ouvre en page pleine.
 * Entre 1024 et 1280 px, la barre latérale de l'admin et le panneau laissaient 292 px au texte.
 */
export function MiseEnPageDeLEditeur({
	barre,
	page,
	panneau
}: {
	readonly barre: ReactNode;
	readonly page: ReactNode;
	readonly panneau: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-cladd-xs">
			{barre}
			<div className="grid grid-cols-1 gap-cladd-sm xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_21rem]">
				<div className="min-w-0">{page}</div>
				<aside className="hidden xl:sticky xl:top-20 xl:block xl:max-h-[calc(100dvh-6.5rem)] xl:overflow-y-auto xl:pb-cladd-sm">
					{panneau}
				</aside>
			</div>
		</div>
	);
}

/** Sous 1280 px, le bloc choisi se règle depuis une pastille au-dessus de la barre du bas. */
export function PastilleDuChoix({ libelle, onOuvrir }: { readonly libelle: string; readonly onOuvrir: () => void }) {
	return (
		<button
			type="button"
			onClick={onOuvrir}
			className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-cladd-fg px-4 py-2.5 text-cladd-2xs font-semibold text-cladd-bg shadow-lg xl:hidden"
		>
			<SlidersHorizontalIcon aria-hidden className="size-4" />
			{libelle}
		</button>
	);
}

// ─── La publication ──────────────────────────────────────────────────────────

/** Ce que la publication va faire, relu avant de partir (Ghost, beehiiv). */
export function RecapitulatifDePublication({
	titre,
	adresse,
	quand,
	bloquants,
	avertissements,
	lignesChangees
}: {
	readonly titre: string;
	readonly adresse: string;
	/** « Paraît dans quelques minutes », « Paraît le 27/10/2026 », « Reste en brouillon ». */
	readonly quand: string;
	readonly bloquants: readonly string[];
	readonly avertissements: number;
	/** `null` pour un nouvel article. */
	readonly lignesChangees: number | null;
}) {
	return (
		<div className="flex flex-col gap-cladd-xs">
			<div className="light flex flex-col gap-1 rounded-cladd-xl bg-creme p-cladd-xs text-encre-site">
				<span className="font-serif text-intertitre leading-snug font-medium">{titre}</span>
				<span className="text-cladd-2xs break-all text-encre-site-douce">letikette.com/blog/{adresse}</span>
			</div>
			<ul className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
				<li className="flex justify-between gap-3 px-3.5 py-2.5 text-cladd-2xs">
					<span className="text-cladd-fg-soft">Parution</span>
					<span className="text-right font-medium">{quand}</span>
				</li>
				<li className="flex justify-between gap-3 px-3.5 py-2.5 text-cladd-2xs">
					<span className="text-cladd-fg-soft">Ce qui change</span>
					<span className="text-right font-medium">
						{lignesChangees === null
							? 'Un nouvel article'
							: lignesChangees === 0
								? 'Rien dans le texte'
								: `${lignesChangees} ligne${lignesChangees > 1 ? 's' : ''} du fichier`}
					</span>
				</li>
				<li className="flex justify-between gap-3 px-3.5 py-2.5 text-cladd-2xs">
					<span className="text-cladd-fg-soft">Relecture</span>
					<span className="text-right font-medium">
						{bloquants.length > 0
							? `${bloquants.length} point${bloquants.length > 1 ? 's' : ''} à corriger`
							: avertissements > 0
								? `${avertissements} point${avertissements > 1 ? 's' : ''} relu${avertissements > 1 ? 's' : ''} à la main`
								: 'Rien à signaler'}
					</span>
				</li>
			</ul>
			{bloquants.length === 0 ? null : (
				<ul className="flex flex-col gap-1.5 px-1">
					{bloquants.map((b) => (
						<li key={b} className="flex gap-2 text-cladd-2xs">
							<CircleAlertIcon aria-hidden className="text-cladd-red mt-0.5 size-4 shrink-0" />
							<span>{b}</span>
						</li>
					))}
				</ul>
			)}
			<p className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-soft">
				Le fichier part sur GitHub par un commit à votre nom, et le site se reconstruit. Il se
				modifie ensuite ici, ou se retire du blog en le repassant en brouillon.
			</p>
		</div>
	);
}
