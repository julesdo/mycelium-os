import type { ReactNode } from 'react';
import { Button, Input } from '@cladd-ui/react';
import { CheckIcon, PencilIcon } from 'lucide-react';
import { cn } from './cn';
import { dateCourte, eurosCentimes } from './format';

/**
 * LES PIÈCES DU DÉMARRAGE GUIDÉ — une conversation et un stepper à la fois
 * (08/10/2026, sur Lemonade, relevé sur Mobbin).
 *
 * ⚠️ UNE QUESTION À LA FOIS, ET SES RÉPONSES EN GROS BOUTONS. Chez Lemonade, Maya
 * pose une question, et la zone du bas propose les réponses : on touche, on ne tape
 * presque jamais. La réponse revient dans le fil, en bulle, avec un crayon pour la
 * changer. Ce que l'assistant a DÉJÀ trouvé s'affiche en carte, à confirmer. En
 * haut, une barre d'étapes dit où l'on en est et combien il en reste.
 */

/** La barre d'étapes, sous l'en-tête : « Étape 2 sur 5 · À qui j'écris ». */
export function BarreDEtapes({
	etapes,
	courante
}: {
	readonly etapes: readonly string[];
	/** Le rang de l'étape en cours, à partir de 0. Au-delà de la dernière : tout est fait. */
	readonly courante: number;
}) {
	const rang = Math.min(courante, etapes.length - 1);
	return (
		<div className="flex flex-col gap-1.5 pb-cladd-3xs">
			<div
				className="flex gap-1"
				role="progressbar"
				aria-valuemin={1}
				aria-valuemax={etapes.length}
				aria-valuenow={rang + 1}
				aria-label={`Étape ${rang + 1} sur ${etapes.length}`}
			>
				{etapes.map((etape, i) => (
					<span
						key={etape}
						className={cn(
							'h-1 flex-1 rounded-full transition-colors duration-500',
							i < courante
								? 'bg-cladd-fg'
								: i === courante
									? 'bg-cladd-fg-soft'
									: 'bg-cladd-outline'
						)}
					/>
				))}
			</div>
			<p className="text-cladd-3xs text-cladd-fg-soft">
				{courante >= etapes.length
					? 'Tout est prêt'
					: `Étape ${rang + 1} sur ${etapes.length} · ${etapes[rang]}`}
			</p>
		</div>
	);
}

/** La réponse du gérant, dans sa bulle, avec le crayon qui la rouvre. */
export function BulleDeReponse({
	texte,
	onModifier
}: {
	readonly texte: string;
	readonly onModifier?: () => void;
}) {
	return (
		<div className="flex items-center justify-end gap-1.5">
			{onModifier === undefined ? null : (
				<Button
					size="md"
					rounded
					square
					variant="transparent"
					outline={false}
					hoverable={false}
					className="shrink-0 text-cladd-fg-softer"
					onClick={onModifier}
					aria-label={`Changer : ${texte}`}
				>
					<PencilIcon className="size-3.5" />
				</Button>
			)}
			<p className="verre-dense max-w-[80%] rounded-[1.25rem] rounded-br-md px-3.5 py-2 text-cladd-xs leading-relaxed text-cladd-fg">
				{texte}
			</p>
		</div>
	);
}

/**
 * LA ZONE DES RÉPONSES, en bas, à la place du compositeur.
 *
 * ⚠️ ELLE PORTE UN BOUTON PLEIN AU PLUS : la réponse attendue. Les autres sont de
 * verre. Une question à trois réponses de même poids (« Non », « Oui », « Je ne
 * sais pas ») n'en porte aucun.
 */
export function ZoneDeReponse({ children }: { readonly children: ReactNode }) {
	return (
		<div className="mb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-cladd-3xs pb-cladd-3xs">
			<div className="verre-dense pointer-events-auto mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-[1.6rem] p-2">
				{children}
			</div>
		</div>
	);
}

export function BoutonDeReponse({
	libelle,
	principal = false,
	desactive = false,
	enCours = false,
	onClick
}: {
	readonly libelle: string;
	readonly principal?: boolean;
	readonly desactive?: boolean;
	readonly enCours?: boolean;
	readonly onClick: () => void;
}) {
	return (
		<Button
			size="lg"
			rounded
			variant="transparent"
			outline={false}
			hoverable={false}
			className={cn('w-full font-semibold', principal ? 'pilule-principale' : 'pilule-secondaire')}
			disabled={desactive}
			loading={enCours}
			onClick={onClick}
		>
			{libelle}
		</Button>
	);
}

/** Des réponses côte à côte (« Non », « Oui »), qui partagent la largeur. */
export function RangeeDeReponses({ children }: { readonly children: ReactNode }) {
	return <div className="grid auto-cols-fr grid-flow-col gap-2">{children}</div>;
}

/** Un champ de réponse : une adresse, un montant. */
export function ChampDeReponse({
	valeur,
	onChange,
	placeholder,
	clavier = 'text'
}: {
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	readonly placeholder: string;
	readonly clavier?: 'text' | 'email' | 'decimal';
}) {
	return (
		<Input
			size="lg"
			value={valeur}
			onChange={onChange}
			placeholder={placeholder}
			inputMode={clavier}
		/>
	);
}

export interface FactureProposee {
	readonly id: string;
	readonly reference: string;
	readonly resteDu: bigint;
	readonly echeance: string | null;
}

/**
 * LES FACTURES QUE PLUME PROPOSE DE RÉCLAMER — toutes cochées, comme les doublons
 * de Copilot Money : on décoche ce qu'on garde de côté.
 */
export function CarteDeFactures({
	factures,
	cochees,
	onBasculer
}: {
	readonly factures: readonly FactureProposee[];
	readonly cochees: ReadonlySet<string>;
	/** Absent : la carte se lit, elle ne se change plus (l'étape est passée). */
	readonly onBasculer?: (id: string) => void;
}) {
	return (
		<ul className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
			{factures.map((facture) => {
				const cochee = cochees.has(facture.id);
				const contenu = (
					<>
						<span
							aria-hidden
							className={cn(
								'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
								cochee
									? 'border-transparent bg-cladd-fg text-cladd-bg'
									: 'border-cladd-fg-softer text-transparent'
							)}
						>
							<CheckIcon className="size-3" strokeWidth={3} />
						</span>
						<span className="flex min-w-0 flex-1 flex-col text-left">
							<span className="truncate text-cladd-xs font-medium">{facture.reference}</span>
							<span className="text-cladd-2xs text-cladd-fg-soft">
								{facture.echeance === null
									? 'Échéance inconnue'
									: `Échue le ${dateCourte(facture.echeance)}`}
							</span>
						</span>
						<span
							className={cn(
								'shrink-0 text-cladd-xs font-medium tabular-nums',
								!cochee && 'text-cladd-fg-softer line-through'
							)}
						>
							{eurosCentimes(facture.resteDu)}
						</span>
					</>
				);
				return (
					<li key={facture.id}>
						{onBasculer === undefined ? (
							<div className="flex min-h-14 items-center gap-3 px-3.5 py-2.5">{contenu}</div>
						) : (
							<button
								type="button"
								role="checkbox"
								aria-checked={cochee}
								onClick={() => onBasculer(facture.id)}
								className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 transition active:scale-[0.99]"
							>
								{contenu}
							</button>
						)}
					</li>
				);
			})}
		</ul>
	);
}

export interface EtapeDuPlanAffichee {
	readonly nom: string;
	/** « jeu. 10 oct. » */
	readonly quand: string;
	/** Faux pour la remise au conseil : c'est le gérant qui la décide. */
	readonly automatique: boolean;
}

/** Comment Plume s'y prend : les étapes du plan, datées, sur une frise. */
export function CarteDuPlan({ etapes }: { readonly etapes: readonly EtapeDuPlanAffichee[] }) {
	return (
		<ol className="verre-carte flex flex-col gap-0 rounded-cladd-xl px-3.5 py-3">
			{etapes.map((etape, i) => (
				<li key={etape.nom} className="flex gap-3">
					<span className="flex flex-col items-center">
						<span
							className={cn(
								'mt-1.5 size-2.5 shrink-0 rounded-full',
								etape.automatique ? 'bg-cladd-fg' : 'border border-cladd-fg-soft'
							)}
						/>
						{i === etapes.length - 1 ? null : <span className="w-px flex-1 bg-cladd-outline" />}
					</span>
					<span className="flex min-w-0 flex-1 items-baseline justify-between gap-2 pb-3">
						<span className="text-cladd-xs font-medium">
							{etape.nom}
							{etape.automatique ? null : (
								<span className="font-normal text-cladd-fg-soft"> · vous décidez</span>
							)}
						</span>
						<span className="shrink-0 text-cladd-2xs text-cladd-fg-soft tabular-nums">
							{etape.quand}
						</span>
					</span>
				</li>
			))}
		</ol>
	);
}

/** Des jours tout prêts (« vendredi », « dans 15 jours », « fin du mois »), puis une date au choix. */
export function ChoixDeDate({
	propositions,
	valeur,
	onChange,
	min
}: {
	readonly propositions: readonly { readonly libelle: string; readonly date: string }[];
	readonly valeur: string;
	readonly onChange: (date: string) => void;
	readonly min: string;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap gap-2">
				{propositions.map((proposition) => (
					<button
						key={proposition.date}
						type="button"
						onClick={() => onChange(proposition.date)}
						className={cn(
							'min-h-9 rounded-full px-3.5 text-cladd-2xs transition active:scale-[0.97]',
							valeur === proposition.date
								? 'bg-cladd-fg font-semibold text-cladd-bg'
								: 'verre-carte verre-bouton text-cladd-fg'
						)}
					>
						{proposition.libelle}
					</button>
				))}
			</div>
			<label className="flex items-center justify-between gap-3 text-cladd-2xs text-cladd-fg-soft">
				Une autre date
				<input
					type="date"
					min={min}
					value={valeur}
					onChange={(e) => onChange(e.target.value)}
					className="verre-carte min-h-9 rounded-full px-3 text-cladd-2xs text-cladd-fg"
				/>
			</label>
		</div>
	);
}

export interface ElementACocher {
	readonly id: string;
	readonly titre: string;
	readonly ligne: string;
	readonly montant: string;
}

/**
 * UNE LISTE À COCHER, TOUT COCHÉ D'AVANCE — les dossiers d'un lot. On décoche le
 * client qu'on garde en main ; le bouton du bas dit combien partiront.
 */
export function ListeACocher({
	elements,
	cochees,
	onBasculer
}: {
	readonly elements: readonly ElementACocher[];
	readonly cochees: ReadonlySet<string>;
	readonly onBasculer: (id: string) => void;
}) {
	return (
		<ul className="verre-carte flex flex-col rounded-cladd-xl [&>*+*]:border-t [&>*+*]:border-cladd-outline">
			{elements.map((element) => {
				const cochee = cochees.has(element.id);
				return (
					<li key={element.id}>
						<button
							type="button"
							role="checkbox"
							aria-checked={cochee}
							onClick={() => onBasculer(element.id)}
							className="flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 transition active:scale-[0.99]"
						>
							<span
								aria-hidden
								className={cn(
									'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
									cochee
										? 'border-transparent bg-cladd-fg text-cladd-bg'
										: 'border-cladd-fg-softer text-transparent'
								)}
							>
								<CheckIcon className="size-3" strokeWidth={3} />
							</span>
							<span className="flex min-w-0 flex-1 flex-col text-left">
								<span className="truncate text-cladd-xs font-medium">{element.titre}</span>
								<span className="truncate text-cladd-2xs text-cladd-fg-soft">{element.ligne}</span>
							</span>
							<span
								className={cn(
									'shrink-0 text-cladd-xs font-medium tabular-nums',
									!cochee && 'text-cladd-fg-softer'
								)}
							>
								{element.montant}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
