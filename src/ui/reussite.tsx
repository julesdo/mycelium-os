import type { ReactNode } from 'react';
import { Popup, PopupContent } from '@cladd-ui/react';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { ChiffreHero } from './chiffre';

/**
 * LA FEUILLE DE RÉUSSITE — ce qui marque la fin d'un geste qui compte.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI MANQUAIT (relevé du 07/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Après un paiement, PayPal, Coinbase, Cash App ou Zopa posent un écran : une
 * coche, le montant, le destinataire, « Terminé » et « Voir le détail ». Notre
 * produit enchaînait sans un mot : on arrêtait un décompte et l'on se
 * retrouvait sur la pièce, sans que rien n'ait dit que c'était fait — ni ce
 * que c'est, une pièce qui ne changera plus.
 *
 * ⚠️ UNE COCHE À L'ENCRE, JAMAIS VERTE. Le vert ne dit qu'une chose dans ce
 * produit : au-dessus du seuil. Un décompte arrêté n'est pas un verdict sur la
 * créance ; c'est un geste de bureau accompli.
 *
 * ⚠️ ELLE NE PROMET RIEN. Elle dit ce qui vient d'être fait, et ce que c'est —
 * jamais ce qui va rentrer.
 *
 * ⚠️ UNE FEUILLE, PAS UNE PAGE : l'écran d'où l'on vient reste derrière, et
 * refermer la feuille fait l'action principale (le geste naturel est d'avancer,
 * pas de rester sur un formulaire déjà envoyé).
 */
export function FeuilleDeReussite({
	ouverte,
	titre,
	montant,
	pour,
	detail,
	principale,
	secondaire
}: {
	readonly ouverte: boolean;
	/** Ce qui vient d'être fait, au passé : « Décompte arrêté ». */
	readonly titre: string;
	readonly montant?: bigint;
	/** Le client concerné : la preuve qu'on a agi sur le bon. */
	readonly pour?: string;
	/** Une phrase, au plus : ce que c'est devenu. */
	readonly detail?: ReactNode;
	readonly principale: { readonly libelle: string; readonly onClick: () => void };
	readonly secondaire?: { readonly libelle: string; readonly onClick: () => void };
}) {
	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) principale.onClick();
			}}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<div className="flex flex-col items-center gap-cladd-2xs pt-2 pb-1 text-center">
					{/*
					  LA COCHE SE TRACE : le disque monte, puis le trait se dessine, comme
					  après un paiement chez Apple. C'est le dessin de lucide (`CheckIcon`),
					  posé à la main pour que son trait s'anime (`.coche-tracee`, app.css).
					  Rien ne bouge sous `prefers-reduced-motion` : la coche est là, entière.
					*/}
					<span
						aria-hidden
						className="pilule-principale reussite-disque flex size-14 items-center justify-center rounded-full"
					>
						<svg
							viewBox="0 0 24 24"
							className="size-7"
							fill="none"
							stroke="currentColor"
							strokeWidth={2.5}
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M20 6 9 17l-5-5" pathLength={1} className="coche-tracee" />
						</svg>
					</span>
					<div className="flex flex-col items-center gap-1">
						<p className="text-cladd-sm font-semibold">{titre}</p>
						{pour === undefined ? null : (
							<p className="text-cladd-2xs text-cladd-fg-soft">{pour}</p>
						)}
					</div>
					{montant === undefined ? null : <ChiffreHero centimes={montant} defile />}
					{detail === undefined ? null : (
						<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{detail}</p>
					)}
					<div className="flex w-full flex-col items-center gap-1 pt-1">
						<BoutonPrincipal pleineLargeur onClick={principale.onClick}>
							{principale.libelle}
						</BoutonPrincipal>
						{secondaire === undefined ? null : (
							<BoutonTexte onClick={secondaire.onClick}>{secondaire.libelle}</BoutonTexte>
						)}
					</div>
				</div>
			</PopupContent>
		</Popup>
	);
}
