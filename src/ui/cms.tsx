import { useRef, type ReactNode } from 'react';
import { Input, Select } from '@cladd-ui/react';
import { CircleAlertIcon, CircleCheckIcon, PlusIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LE CMS DU BLOG, SES PIÈCES D'ÉCRAN (19/10/2026). L'éditeur suit ceux de Ghost et de
 * Sanity : le formulaire de l'en-tête et le corps à gauche, l'aperçu fidèle à droite, la
 * relecture entre les deux. Au téléphone, une colonne.
 */

export type StatutArticle = 'publie' | 'programme' | 'brouillon' | 'casse';

const LIBELLES_STATUT: Readonly<Record<StatutArticle, string>> = {
	publie: 'Publié',
	programme: 'Programmé',
	brouillon: 'Brouillon',
	casse: 'En-tête invalide'
};

/** L'état d'un article : en ligne, à paraître, en brouillon, ou cassé. */
export function PastilleDArticle({ statut }: { readonly statut: StatutArticle }) {
	return (
		<span
			className={cn(
				'inline-flex h-6 items-center rounded-full px-2.5 text-cladd-3xs font-semibold whitespace-nowrap',
				statut === 'publie' && 'bg-cladd-primary/10 text-cladd-fg',
				statut === 'programme' && 'bg-cladd-fg/10 text-cladd-fg',
				statut === 'brouillon' && 'bg-cladd-surface-minus text-cladd-fg-soft',
				statut === 'casse' && 'bg-cladd-red/15 text-cladd-fg'
			)}
		>
			{LIBELLES_STATUT[statut]}
		</span>
	);
}

/** Un champ de l'en-tête, avec ce que la construction exige de sa longueur. */
export function ChampAvecCompteur({
	libelle,
	valeur,
	onChange,
	min,
	max,
	aide,
	placeholder
}: {
	readonly libelle: string;
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	readonly min?: number;
	readonly max?: number;
	readonly aide?: string;
	readonly placeholder?: string;
}) {
	const longueur = valeur.length;
	const horsBornes = (min !== undefined && longueur < min) || (max !== undefined && longueur > max);
	return (
		<label className="flex flex-col gap-1.5">
			<span className="flex items-baseline justify-between gap-2 px-1 text-cladd-2xs text-cladd-fg-soft">
				<span>{libelle}</span>
				{max === undefined ? null : (
					<span className={cn('tabular-nums', horsBornes && 'text-cladd-red font-semibold')}>
						{longueur} / {max}
					</span>
				)}
			</span>
			<Input
				size="lg"
				value={valeur}
				onChange={onChange}
				{...(placeholder === undefined ? {} : { placeholder })}
			/>
			{aide === undefined ? null : (
				<span className="px-1 text-cladd-3xs text-cladd-fg-soft">{aide}</span>
			)}
		</label>
	);
}

/** Un choix fermé de l'en-tête : catégorie, pilier, illustration. */
export function ChoixDEntete({
	libelle,
	valeur,
	options,
	onChange,
	vide
}: {
	readonly libelle: string;
	readonly valeur: string;
	readonly options: readonly string[];
	readonly onChange: (valeur: string) => void;
	/** Le libellé de l'option vide, quand le champ est facultatif. */
	readonly vide?: string;
}) {
	const toutes = vide === undefined ? [...options] : ['', ...options];
	return (
		<div className="flex flex-col gap-1.5">
			<span className="px-1 text-cladd-2xs text-cladd-fg-soft">{libelle}</span>
			<Select
				size="lg"
				rounded
				title={libelle}
				options={toutes}
				value={valeur}
				keyboardHints={false}
				renderOption={({ value }) => (value === '' ? (vide ?? '') : String(value))}
				onChange={(v) => onChange(String(v))}
			>
				{valeur === '' ? (vide ?? '') : valeur}
			</Select>
		</div>
	);
}

/** Les phrases « En bref » : deux à cinq, chacune avec sa longueur. */
export function PhrasesEnBref({
	phrases,
	onChange
}: {
	readonly phrases: readonly string[];
	readonly onChange: (phrases: string[]) => void;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="px-1 text-cladd-2xs text-cladd-fg-soft">En bref (deux à cinq phrases)</span>
			{phrases.map((phrase, rang) => (
				<div key={rang} className="flex items-center gap-2">
					<div className="min-w-0 flex-1">
						<Input
							size="md"
							value={phrase}
							onChange={(v) => onChange(phrases.map((p, i) => (i === rang ? v : p)))}
							aria-label={`Phrase ${rang + 1}`}
						/>
					</div>
					<span
						className={cn(
							'w-14 text-right text-cladd-3xs text-cladd-fg-soft tabular-nums',
							(phrase.length < 10 || phrase.length > 220) && 'text-cladd-red font-semibold'
						)}
					>
						{phrase.length}/220
					</span>
					<button
						type="button"
						aria-label={`Retirer la phrase ${rang + 1}`}
						onClick={() => onChange(phrases.filter((_, i) => i !== rang))}
						className="flex size-9 shrink-0 items-center justify-center rounded-full text-cladd-fg-soft hover:bg-cladd-surface-minus"
					>
						<XIcon aria-hidden className="size-4" />
					</button>
				</div>
			))}
			{phrases.length >= 5 ? null : (
				<button
					type="button"
					onClick={() => onChange([...phrases, ''])}
					className="flex h-9 items-center gap-1.5 self-start rounded-full px-3 text-cladd-2xs font-medium text-cladd-fg-soft hover:bg-cladd-surface-minus"
				>
					<PlusIcon aria-hidden className="size-4" />
					Ajouter une phrase
				</button>
			)}
		</div>
	);
}

/** Un morceau de MDX qu'on insère au curseur : une valeur du registre, un schéma, une section. */
export interface Extrait {
	readonly libelle: string;
	readonly code: string;
}

/**
 * LE CORPS DE L'ARTICLE, en MDX : une zone de texte à chasse fixe, et la liste des composants
 * qui lisent le registre, insérés au curseur. Une valeur de la loi ne se tape pas : elle
 * s'insère.
 */
export function ZoneDeCorps({
	valeur,
	onChange,
	extraits
}: {
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	readonly extraits: readonly Extrait[];
}) {
	const zone = useRef<HTMLTextAreaElement | null>(null);

	function inserer(code: string) {
		const element = zone.current;
		const debut = element?.selectionStart ?? valeur.length;
		const fin = element?.selectionEnd ?? valeur.length;
		const suivant = `${valeur.slice(0, debut)}${code}${valeur.slice(fin)}`;
		onChange(suivant);
		requestAnimationFrame(() => {
			if (element === null) return;
			element.focus();
			element.selectionStart = element.selectionEnd = debut + code.length;
		});
	}

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex flex-wrap items-center justify-between gap-2 px-1">
				<span className="text-cladd-2xs text-cladd-fg-soft">Le corps, en MDX</span>
				<Select
					size="md"
					rounded
					title="Insérer"
					options={extraits.map((e) => e.libelle)}
					value=""
					keyboardHints={false}
					onChange={(v) => {
						const extrait = extraits.find((e) => e.libelle === v);
						if (extrait !== undefined) inserer(extrait.code);
					}}
				>
					<PlusIcon aria-hidden />
					Insérer
				</Select>
			</div>
			<textarea
				ref={zone}
				value={valeur}
				onChange={(e) => onChange(e.target.value)}
				spellCheck
				lang="fr"
				aria-label="Le corps de l'article, en MDX"
				className="verre-carte focus-visible:ring-cladd-brand min-h-[32rem] w-full resize-y rounded-cladd-xl p-3.5 font-mono text-cladd-2xs leading-relaxed text-cladd-fg outline-none focus-visible:ring-2"
			/>
		</div>
	);
}

/** Ce que la relecture a trouvé : ce qui bloque, ce qui se relit, ou rien. */
export function PanneauDeRelecture({
	bloquants,
	avertissements
}: {
	readonly bloquants: readonly string[];
	readonly avertissements: readonly string[];
}) {
	if (bloquants.length === 0 && avertissements.length === 0) {
		return (
			<p className="verre-carte flex items-center gap-2 rounded-cladd-xl px-3.5 py-3 text-cladd-2xs">
				<CircleCheckIcon aria-hidden className="text-cladd-green size-4 shrink-0" />
				Relecture : rien à signaler. L’article peut partir.
			</p>
		);
	}
	return (
		<ul className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
			{bloquants.map((b) => (
				<li key={b} className="flex gap-2 px-3.5 py-2.5 text-cladd-2xs">
					<CircleAlertIcon aria-hidden className="text-cladd-red mt-0.5 size-4 shrink-0" />
					<span>{b}</span>
				</li>
			))}
			{avertissements.map((a) => (
				<li key={a} className="flex gap-2 px-3.5 py-2.5 text-cladd-2xs text-cladd-fg-soft">
					<TriangleAlertIcon aria-hidden className="text-cladd-yellow mt-0.5 size-4 shrink-0" />
					<span>{a}</span>
				</li>
			))}
		</ul>
	);
}

/**
 * L'APERÇU, dans le papier du site : crème, encre, serif. Ce qui s'y lit est ce que le blog
 * affichera.
 */
export function CadreDApercu({
	titre,
	description,
	enBref,
	children
}: {
	readonly titre: string;
	readonly description: string;
	readonly enBref: readonly string[];
	readonly children: ReactNode;
}) {
	return (
		<div className="light overflow-hidden rounded-cladd-xl bg-creme text-encre-site">
			<div className="flex flex-col gap-cladd-sm p-cladd-sm md:p-cladd-lg">
				<h1 className="font-serif text-titre-section leading-tight font-medium tracking-titre-section text-balance">
					{titre || 'Le titre de l’article'}
				</h1>
				<p className="text-chapeau leading-relaxed text-encre-site-douce">{description}</p>
				{enBref.length === 0 ? null : (
					<aside className="flex flex-col gap-cladd-3xs rounded-carte-site border border-filet-creme bg-papier p-cladd-xs">
						<span className="text-intertitre font-semibold">En bref</span>
						<ul className="flex list-disc flex-col gap-1.5 pl-cladd-xs text-cladd-md leading-relaxed marker:text-encre-site-claire">
							{enBref.map((phrase, rang) => (
								<li key={rang}>{phrase}</li>
							))}
						</ul>
					</aside>
				)}
				<div className="flex min-w-0 flex-col gap-cladd-sm text-chapeau">{children}</div>
			</div>
		</div>
	);
}

/** L'éditeur en deux volets au-delà de 1024 px ; l'aperçu reste collé pendant qu'on écrit. */
export function EditeurEnDeuxVolets({
	edition,
	apercu
}: {
	readonly edition: ReactNode;
	readonly apercu: ReactNode;
}) {
	return (
		<div className="grid grid-cols-1 gap-cladd-sm lg:grid-cols-2 lg:items-start">
			<div className="flex min-w-0 flex-col gap-cladd-sm">{edition}</div>
			<div className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
				{apercu}
			</div>
		</div>
	);
}
