import type { ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { XIcon } from 'lucide-react';
import { BoutonSecondaire } from './bouton';

/**
 * LA BULLE DE PLUME — il parle depuis la barre du bas (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RELEVÉ CHEZ ALAN : MO PARLE D'OÙ IL EST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur l'accueil d'Alan, Mo est posé à droite de la barre d'onglets, et c'est de
 * là qu'il dit bonjour, dans une bulle blanche dont la pointe le désigne (Mobbin,
 * 13/10/2026). Plume fait de même : la bulle sort de lui, au-dessus de la barre,
 * et sa pointe le désigne. On sait qui parle sans lire de nom.
 *
 * ⚠️ OPAQUE, PAS EN VERRE. Une phrase se lit ; sous du verre, elle se devine sur
 * ce qui défile derrière. Celle de Mo est blanche et pleine.
 *
 * ⚠️ UN SEUL BOUTON, ET IL N'EST PAS PLEIN. L'écran a déjà le sien ; celui de la
 * bulle est secondaire, comme « Plus tard » et « Commencer » chez Rocket Money.
 * La phrase elle-même ouvre la conversation de Plume, quand c'est une remarque.
 *
 * ⚠️ RIEN DE CE COMPOSANT NE DÉCIDE QUOI DIRE NI QUAND : voir `app/parole-de-plume.tsx`
 * et `verticales/recouvrement/compagnon/presence.ts`. Il dessine.
 */
export function BullePlume({
	texte,
	libelleDuGeste,
	onGeste,
	onOuvrir,
	onFermer,
	fermerPourDeBon = false
}: {
	readonly texte: ReactNode;
	/** Le bouton de la bulle : « Les voir », « Annuler », « La relire ». */
	readonly libelleDuGeste?: string;
	readonly onGeste?: () => void;
	/** Toucher la phrase ouvre la conversation. Absent quand la phrase porte ses propres liens. */
	readonly onOuvrir?: () => void;
	readonly onFermer: () => void;
	/** Le ✕ fait taire Plume sur ce point, pour de bon : le lecteur d'écran le dit. */
	readonly fermerPourDeBon?: boolean;
}) {
	return (
		<div
			role="status"
			className="bulle-plume absolute right-0 bottom-full mb-3 w-[min(20rem,calc(100vw-2rem))] rounded-3xl py-3 pr-2 pl-4 text-left"
		>
			{/* La pointe, sous Plume. Derrière la bulle : seule sa moitié basse dépasse. */}
			<span
				aria-hidden
				className="bulle-plume-queue absolute right-6 -bottom-1.5 -z-10 size-4 rotate-45 rounded-xs md:right-[59px]"
			/>
			<div className="flex items-start gap-1">
				{onOuvrir === undefined ? (
					<p className="min-w-0 flex-1 py-1 text-cladd-xs leading-snug text-cladd-fg">{texte}</p>
				) : (
					<button
						type="button"
						onClick={onOuvrir}
						className="min-w-0 flex-1 py-1 text-left text-cladd-xs leading-snug text-cladd-fg"
					>
						{texte}
					</button>
				)}
				<Button
					size="sm"
					rounded
					square
					variant="transparent"
					outline={false}
					className="shrink-0 text-cladd-fg-softer"
					aria-label={fermerPourDeBon ? 'Ne plus me le dire' : 'Fermer'}
					onClick={onFermer}
				>
					<XIcon size={16} aria-hidden />
				</Button>
			</div>
			{libelleDuGeste === undefined || onGeste === undefined ? null : (
				<BoutonSecondaire className="mt-2" onClick={onGeste}>
					{libelleDuGeste}
				</BoutonSecondaire>
			)}
		</div>
	);
}
