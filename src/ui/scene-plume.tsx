import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { CheckIcon, FeatherIcon, XIcon } from 'lucide-react';
import { BoutonSecondaire, BoutonTexte } from './bouton';
import { cn } from './cn';
import { PointsDeSuspension } from './fil-plume';

/**
 * LA SCÈNE DE PLUME — sa bulle, au-dessus de lui (13/10/2026, au soir).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RELEVÉ CHEZ DUOLINGO : LE PERSONNAGE EST GRAND, À CÔTÉ DE SA BULLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur, sur la première bulle : « les bulles se ferment très vite et sont
 * pas assez utiles […] va voir sur Duolingo ». Chez Duolingo, Duo est grand, posé à
 * côté de sa bulle, il change de tête en parlant, et rien ne part avant le
 * « Continuer » (Mobbin, 13/10). Ici :
 *
 *   · Plume est GRAND DANS LE BOUTON de la barre (le fondateur, le soir même : un
 *     second Plume au-dessus « prend énormément de place ») et y fait la tête de ce
 *     qu'il dit — il salue, s'inquiète, fait la fête ; la pointe de la bulle le
 *     désigne ;
 *   · il RÉFLÉCHIT d'abord — trois points dans la bulle —, puis il parle ;
 *   · RIEN NE SE FERME TOUT SEUL : « Suivant » passe à ce qu'il a encore à dire,
 *     le ✕ le renvoie dans la barre, le défilement aussi ;
 *   · la bulle porte toujours du CONTEXTE : en tête, la journée (ses défis et la
 *     série) ; en pied, ce qu'il fait ensuite.
 *
 * ⚠️ UN SEUL BOUTON À FOND CLAIR, AUCUN PLEIN. L'écran a déjà son bouton plein ; ici,
 * le geste est secondaire et « Suivant » est du texte.
 *
 * ⚠️ CE COMPOSANT NE DÉCIDE RIEN : `app/parole-de-plume.tsx` dit quoi et quand.
 */

/** Ce que la tête de la bulle dit de la journée. */
export interface JourneeDeLaScene {
	/** « 2 sur 5 aujourd'hui », « Journée bouclée ». */
	readonly titre: string;
	readonly faits: number;
	readonly total: number;
	/** « 4 jours d'affilée », ou rien sous deux jours. */
	readonly serie: string | null;
}

/** Un jour de la semaine, pour la rangée de coches d'une journée bouclée. */
export interface JourDeLaScene {
	readonly jour: string;
	readonly lettre: string;
	readonly etat: 'TENUE' | 'MANQUEE' | 'AUJOURDHUI' | 'AVENIR' | 'REPOS';
}

/** Le temps qu'il réfléchit avant de parler : assez pour se voir, pas assez pour attendre. */
const REFLEXION_MS = 700;

/**
 * IL RÉFLÉCHIT À CHAQUE PAROLE NOUVELLE — vrai dès que la clé change, faux une fois le
 * temps passé. Dérivé de la clé : aucun état posé dans un effet, seule la minuterie
 * écrit, quand elle sonne. Partagé : la tête de Plume, dans le bouton, et les trois
 * points de sa bulle réfléchissent ensemble. `null` : il ne dit rien, il ne
 * réfléchit pas.
 */
export function useReflexion(cle: string | null): boolean {
	const [finie, setFinie] = useState<string | null>(null);
	useEffect(() => {
		if (cle === null) return;
		const minuterie = setTimeout(() => setFinie(cle), REFLEXION_MS);
		return () => clearTimeout(minuterie);
	}, [cle]);
	return cle !== null && finie !== cle;
}

export function ScenePlume({
	reflechit,
	texte,
	journee,
	semaine,
	libelleDuGeste,
	onGeste,
	rang,
	onSuivant,
	onParler,
	onFermer,
	onTaire,
	suite
}: {
	/** Il réfléchit encore (`useReflexion`) : trois points, et pas encore de geste. */
	readonly reflechit: boolean;
	readonly texte: ReactNode;
	readonly journee?: JourneeDeLaScene;
	readonly semaine?: readonly JourDeLaScene[];
	readonly libelleDuGeste?: string;
	readonly onGeste?: () => void;
	/** « 2 sur 4 » : ce qu'il a encore à dire. */
	readonly rang?: { readonly position: number; readonly total: number };
	readonly onSuivant?: () => void;
	/** Ouvrir sa conversation, quand il n'a plus rien à dire. */
	readonly onParler?: () => void;
	readonly onFermer: () => void;
	/** « Ne plus me le dire » : seulement pour ce qui peut se taire pour de bon. */
	readonly onTaire?: () => void;
	/** La ligne du bas : ce qu'il fait ensuite, ou ce qu'il fait en ce moment. */
	readonly suite?: string;
}) {
	return (
		<>
			<div
				className="bulle-plume absolute right-0 bottom-full mb-3.5 w-[min(20.5rem,calc(100vw-2rem))] rounded-3xl py-3 pr-2 pl-3.5 text-left"
				role="dialog"
				aria-label="Plume vous parle"
			>
				{/* La pointe, vers Plume : sous la bulle, au-dessus de lui. */}
				<span
					aria-hidden
					className="bulle-plume-queue absolute right-6 -bottom-1.5 -z-10 size-4 rotate-45 rounded-xs"
				/>
				<div className="flex items-start gap-1">
					<div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
						{journee === undefined ? null : <TeteDeJournee journee={journee} />}
						{/* La clé remonte la parole : il réfléchit avant chaque nouvelle chose. */}
						<Parole reflechit={reflechit} texte={texte} semaine={semaine} />
					</div>
					<Button
						size="sm"
						rounded
						square
						variant="transparent"
						outline={false}
						className="-mt-0.5 shrink-0 text-cladd-fg-softer"
						aria-label="Renvoyer Plume dans la barre"
						onClick={onFermer}
					>
						<XIcon size={16} aria-hidden />
					</Button>
				</div>
				{/* Les gestes viennent APRÈS la phrase, comme le « Continuer » de Duolingo :
				    on ne touche pas ce qu'on n'a pas lu. */}
				<div className={cn('mt-2.5 flex items-center gap-2 pr-1.5', reflechit && 'invisible')}>
					{libelleDuGeste === undefined || onGeste === undefined ? null : (
						<BoutonSecondaire onClick={onGeste}>{libelleDuGeste}</BoutonSecondaire>
					)}
					<span className="flex-1" />
					{rang === undefined || rang.total <= 1 ? null : (
						<span className="text-cladd-3xs text-cladd-fg-softer tabular-nums">
							{rang.position} sur {rang.total}
						</span>
					)}
					{onSuivant !== undefined ? (
						<BoutonTexte onClick={onSuivant}>Suivant</BoutonTexte>
					) : onParler !== undefined ? (
						<BoutonTexte onClick={onParler}>Lui parler</BoutonTexte>
					) : null}
				</div>
				{onTaire === undefined ? null : (
					<button
						type="button"
						onClick={onTaire}
						className="mt-0.5 min-h-8 text-cladd-3xs text-cladd-fg-softer underline underline-offset-2"
					>
						Ne plus me le dire
					</button>
				)}
				{suite === undefined ? null : (
					<p className="mt-2 mr-1.5 border-t border-cladd-outline pt-2 text-cladd-3xs leading-snug text-cladd-fg-soft">
						{suite}
					</p>
				)}
			</div>
		</>
	);
}

/** CE QU'IL DIT — après avoir réfléchi : trois points, puis la phrase. */
function Parole({
	reflechit,
	texte,
	semaine
}: {
	readonly reflechit: boolean;
	readonly texte: ReactNode;
	readonly semaine: readonly JourDeLaScene[] | undefined;
}) {
	if (reflechit) return <PointsDeSuspension className="text-cladd-fg-soft" />;
	return (
		<div className="scene-plume-texte flex flex-col gap-2.5" aria-live="polite">
			<p className="text-cladd-xs leading-snug text-cladd-fg">{texte}</p>
			{semaine === undefined ? null : <RangeeDeLaSemaine semaine={semaine} />}
		</div>
	);
}

/** LA TÊTE DE LA BULLE : la journée en une ligne, sa barre, et la série. */
function TeteDeJournee({ journee }: { readonly journee: JourneeDeLaScene }) {
	const part = journee.total === 0 ? 1 : journee.faits / journee.total;
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-cladd-3xs">
				<span className="font-semibold whitespace-nowrap text-cladd-fg">{journee.titre}</span>
				{journee.serie === null ? null : (
					<span className="flex items-center gap-1 whitespace-nowrap text-cladd-fg-soft">
						<FeatherIcon size={12} aria-hidden className="text-[var(--color-veille)]" />
						{journee.serie}
					</span>
				)}
			</div>
			{journee.total === 0 ? null : (
				<span
					aria-hidden
					className="relative h-1.5 w-full overflow-hidden rounded-full bg-cladd-fg/10"
				>
					<span
						className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-veille)] transition-[width] duration-700 ease-out"
						style={{ width: `${Math.round(part * 100)}%` }}
					/>
				</span>
			)}
		</div>
	);
}

/**
 * LA SEMAINE, EN COCHES — la rangée de Duolingo sous la série. À l'encre : une
 * journée tenue se coche, aujourd'hui s'entoure, le reste s'estompe.
 */
function RangeeDeLaSemaine({ semaine }: { readonly semaine: readonly JourDeLaScene[] }) {
	return (
		<ol className="flex justify-between gap-1" aria-label="Votre semaine">
			{semaine.map((jour) => (
				<li key={jour.jour} className="flex flex-col items-center gap-1">
					<span className="text-cladd-4xs text-cladd-fg-softer">{jour.lettre}</span>
					<span
						className={cn(
							'flex size-6 items-center justify-center rounded-full',
							jour.etat === 'TENUE' && 'bg-[var(--color-veille)] text-white',
							jour.etat === 'AUJOURDHUI' && 'ring-2 ring-[var(--color-veille)] ring-inset',
							(jour.etat === 'MANQUEE' || jour.etat === 'AVENIR') && 'bg-cladd-fg/10',
							jour.etat === 'REPOS' && 'bg-cladd-fg/5'
						)}
					>
						{jour.etat === 'TENUE' ? (
							<CheckIcon size={14} strokeWidth={3} aria-label="tenu" />
						) : null}
					</span>
				</li>
			))}
		</ol>
	);
}
