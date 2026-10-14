import type { CSSProperties, ReactNode } from 'react';
import { PenLineIcon, SendIcon } from 'lucide-react';
import { BoutonTexte } from './bouton';
import { cn } from './cn';

/**
 * LA CAPSULE EN DIRECT — ce que Plume fait en ce moment, au-dessus de la barre
 * (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE MINI-LECTEUR D'APPLE MUSIC, POUR UN COLLABORATEUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « qu'on sente le côté fiable du compagnon […] qu'il accompagne
 * l'utilisateur tout le temps, en automatique ». Relevé sur Mobbin : Apple Music
 * pose ce qui joue dans une capsule de verre au-dessus de sa barre d'onglets, sur
 * tous les écrans ; Flighty dit « départ dans 2 h 58 » sans qu'on le demande ;
 * Monzo laisse « Annuler ce paiement » le temps qu'un anneau se vide. Ici :
 *
 *   · la capsule a le VERRE de la barre : elle en fait partie, elle ne flotte pas
 *     sur le contenu comme une publicité ;
 *   · à gauche, un ANNEAU : il se remplit quand Plume travaille, il se vide quand
 *     une relance approche de son départ ;
 *   · deux lignes, jamais plus : ce qui se passe, puis quand ou où il en est ;
 *   · à droite, UN geste au plus, en texte : « Retenir ». C'est le geste sûr (il
 *     empêche un envoi, il n'en provoque aucun), il peut donc vivre sous le pouce.
 *
 * Toucher la capsule ouvre la page de Plume, où tout ce qui part est listé.
 *
 * ⚠️ CE COMPOSANT NE DÉCIDE RIEN : `compagnon/en-direct.ts` dit quoi montrer, et
 * `app/compagnon.tsx` quand.
 */
export function CapsulePlume({
	genre,
	titre,
	ligne,
	part,
	libelleDuGeste,
	onGeste,
	onOuvrir
}: {
	readonly genre: 'TRAVAIL' | 'DEPART';
	readonly titre: string;
	readonly ligne: string;
	/** De 0 à 1 : l'anneau. Rempli à mesure qu'il travaille, vidé à mesure que le départ approche. */
	readonly part: number;
	readonly libelleDuGeste?: string;
	readonly onGeste?: () => void;
	/** Toucher la capsule : la page de Plume. */
	readonly onOuvrir: () => void;
}) {
	const Icone = genre === 'TRAVAIL' ? PenLineIcon : SendIcon;
	return (
		<div
			role="group"
			aria-label={`${titre}. ${ligne}`}
			className="capsule-plume verre-barre flex w-full items-center gap-1 rounded-full py-1.5 pr-2 pl-1.5 md:w-auto md:max-w-md md:min-w-80"
		>
			<button
				type="button"
				onClick={onOuvrir}
				className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full text-left"
			>
				<Anneau part={part} genre={genre}>
					<Icone
						size={15}
						strokeWidth={2.2}
						aria-hidden
						className={cn(genre === 'TRAVAIL' && 'capsule-plume-plume')}
					/>
				</Anneau>
				<span className="flex min-w-0 flex-col">
					<span className="truncate text-cladd-2xs leading-tight font-semibold text-cladd-fg">
						{titre}
					</span>
					<span className="truncate text-cladd-3xs leading-tight text-cladd-fg-soft tabular-nums">
						{ligne}
					</span>
				</span>
			</button>
			{libelleDuGeste === undefined || onGeste === undefined ? null : (
				<BoutonTexte className="shrink-0" onClick={onGeste}>
					{libelleDuGeste}
				</BoutonTexte>
			)}
		</div>
	);
}

/**
 * L'ANNEAU — un disque de verre, l'icône au milieu, et le trait d'encre qui fait le
 * tour. Le trait part de midi, dans le sens des aiguilles.
 */
function Anneau({
	part,
	genre,
	children
}: {
	readonly part: number;
	readonly genre: 'TRAVAIL' | 'DEPART';
	readonly children: ReactNode;
}) {
	const borne = Math.min(1, Math.max(0, part));
	return (
		<span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-cladd-fg/5 text-[var(--color-veille)]">
			<svg viewBox="0 0 40 40" aria-hidden className="absolute inset-0 size-10 -rotate-90">
				<circle
					cx="20"
					cy="20"
					r="17.5"
					className="fill-none stroke-cladd-fg/10"
					strokeWidth={2.5}
				/>
				<circle
					cx="20"
					cy="20"
					r="17.5"
					pathLength={1}
					strokeDasharray="1"
					strokeLinecap="round"
					className={cn(
						'capsule-plume-trait fill-none stroke-[var(--color-veille)]',
						genre === 'DEPART' && 'capsule-plume-trait-depart'
					)}
					strokeWidth={2.5}
					style={{ '--part-de-l-anneau': borne } as CSSProperties}
				/>
			</svg>
			{children}
		</span>
	);
}
