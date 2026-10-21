import type { ReactNode } from 'react';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { ChiffreHero } from './chiffre';
import { ColonneDePleinEcran, PiedDePleinEcran, PleinEcran } from './plein-ecran';

/**
 * LA FEUILLE DE RÉUSSITE — ce qui marque la fin d'un geste qui compte.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI MANQUAIT (relevé du 07/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Après un paiement, PayPal, Coinbase, Cash App ou Zopa posent un écran : une
 * coche, le montant, le destinataire, « Terminé » et « Voir le détail ». Notre
 * produit enchaînait sans un mot. Elle marquait l'arrêt d'un décompte, jusqu'à ce
 * que l'arrêt disparaisse (09/10/2026) ; elle marque désormais le virement noté
 * sur la fiche d'un client, le moment que tout le produit attend.
 *
 * ⚠️ UNE COCHE À L'ENCRE, JAMAIS VERTE. Le vert ne dit qu'une chose dans ce
 * produit : au-dessus du seuil. Un virement noté n'est pas un verdict sur la
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
	secondaire,
	refus,
	compteeOuverte
}: {
	readonly ouverte: boolean;
	/** Ce qui vient d'être fait, au passé : « Virement noté ». */
	readonly titre: string;
	readonly montant?: bigint;
	/** Le client concerné : la preuve qu'on a agi sur le bon. */
	readonly pour?: string;
	/** Une phrase, au plus : ce que c'est devenu. */
	readonly detail?: ReactNode;
	readonly principale: { readonly libelle: string; readonly onClick: () => void };
	readonly secondaire?: { readonly libelle: string; readonly onClick: () => void };
	/** « Ne plus me le proposer », en plus petit sous la ligne qu'il fait taire. */
	readonly refus?: { readonly libelle: string; readonly onClick: () => void };
	/** `false` pour une célébration, qui attend les autres feuilles (`PleinEcran`). */
	readonly compteeOuverte?: boolean;
}) {
	return (
		// EN PAGE PLEINE, comme après un paiement chez Cash App ou PayPal : la coche
		// et le montant au milieu de l'écran, le geste suivant sous le pouce.
		<PleinEcran
			ouvert={ouverte}
			onFermer={principale.onClick}
			libelle={titre}
			compteeOuverte={compteeOuverte}
		>
			<ColonneDePleinEcran>
				<div className="flex flex-1 flex-col items-center justify-center gap-cladd-2xs pt-barre-app pb-cladd-sm text-center">
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
						<p className="max-w-sm text-cladd-2xs leading-snug text-cladd-fg-soft">{detail}</p>
					)}
				</div>
				<PiedDePleinEcran>
					<BoutonPrincipal pleineLargeur onClick={principale.onClick}>
						{principale.libelle}
					</BoutonPrincipal>
					{secondaire === undefined ? null : (
						<BoutonTexte className="self-center" onClick={secondaire.onClick}>
							{secondaire.libelle}
						</BoutonTexte>
					)}
					{refus === undefined ? null : (
						<BoutonTexte
							className="self-center text-cladd-2xs text-cladd-fg-soft"
							onClick={refus.onClick}
						>
							{refus.libelle}
						</BoutonTexte>
					)}
				</PiedDePleinEcran>
			</ColonneDePleinEcran>
		</PleinEcran>
	);
}
