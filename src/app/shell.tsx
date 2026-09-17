import type { ReactNode } from 'react';
import { Fond } from '../ui/fond';

/**
 * Le cadre de l'application authentifiée.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ IL N'Y A PLUS DE BARRE, ET C'EST LA BASCULE QUI L'A RETIRÉE (T15)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La coquille portait une barre haute flottante et une barre basse de quatre
 * onglets. Elles n'ont plus d'objet : le produit n'a plus qu'un écran de
 * travail, `/app`, et une navigation qui dit « où l'on est » n'a rien à dire
 * quand il n'y a qu'un endroit. Ce que la barre portait et qui restait utile —
 * l'avatar, le veilleur, la palette de recherche et le sélecteur
 * d'établissement — s'est réhébergé dans la `Toolbar` de la file.
 *
 * ⚠️ ET LE DÉGAGEMENT DE LA BARRE EST PARTI AVEC ELLE. `PageHero`, `PageHeader`
 * et la file décalaient leur contenu de `--spacing-barre-app` pour ne pas
 * passer dessous ; la file ne le fait plus. Un dégagement qui survit à ce qu'il
 * dégageait est une bande vide en tête d'écran, et seul le regard l'attrape.
 *
 * `h-dvh` et non `h-screen` : sur téléphone, la barre d'adresse mobile fait
 * varier la hauteur visible, et `100vh` fait dépasser le contenu.
 *
 * ⚠️ `main` NE POSE AUCUN REMBOURRAGE. Le dégagement appartient au conteneur
 * qui DÉFILE — `PageBody` — et pas à son cadre : posé ici, il serait HORS du
 * conteneur qui défile, et la zone visible s'arrêterait avant le bord.
 */
export function Shell({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex h-dvh w-full flex-col overflow-hidden">
			{/* Le drapé, une fois, derrière tous les écrans. C'est lui qui donne au
			    verre des cartes et des barres quelque chose à réfracter — sans lui,
			    chaque translucidité retombe sur un aplat un peu plus clair. */}
			<Fond />

			<main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
		</div>
	);
}
