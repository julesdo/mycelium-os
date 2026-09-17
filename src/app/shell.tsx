import type { ReactNode } from 'react';
import { Fond } from '../ui/fond';
import { BarreBranchee } from './barre';
import { CompagnonBranche } from './compagnon';

/**
 * Le cadre de l'application authentifiée.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LA BARRE DU BAS EST REVENUE, ET SA SUPPRESSION ÉTAIT L'ERREUR
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La coquille portait une barre haute flottante et une barre basse de quatre
 * onglets. `ceaf8ce` a retiré les deux, au motif que le produit n'avait plus
 * qu'un écran de travail. L'argument tenait pour la barre HAUTE — huit cibles de
 * même poids, dont aucune ne disait quoi faire — et pas une seconde pour la
 * BASSE : `/app/debiteurs`, `/app/procedures` et `/app/compte` existent
 * toujours, et il ne restait AUCUN chemin vers eux au pouce. Le terrain l'a
 * nommé le jour même.
 *
 * La barre basse est donc de retour, dans son dessin d'origine — le bloc de
 * verre qui glisse, le faisceau lent sur l'onglet actif, le report du
 * `safe-area` — et le compagnon flotte au-dessus d'elle.
 *
 * Ce que la barre HAUTE portait et qui restait utile — l'avatar, le veilleur, la
 * palette de recherche et le sélecteur d'établissement — reste dans la `Toolbar`
 * de la file : ce ne sont pas des destinations, et une navigation dit où l'on
 * est, pas ce qu'on peut faire.
 *
 * ⚠️ LES DEUX SONT MONTÉS ICI, UNE SEULE FOIS. Montés par écran, ils se
 * dupliqueraient à chaque page poussée et se remonteraient à chaque navigation :
 * le bloc de verre repartirait de zéro au lieu de glisser, et le halo
 * recommencerait son cycle à chaque changement d'onglet.
 *
 * ⚠️ ET LE DÉGAGEMENT DU BAS LEUR APPARTIENT, MAIS IL N'EST PAS POSÉ ICI. Un
 * élément hors du flux ne réserve aucune place ; le dégagement vit dans les
 * conteneurs qui DÉFILENT — `PageBody` et les deux volets de `TwoPane` —, pas
 * dans leur cadre. Posé sur `main`, il serait HORS du conteneur qui défile : la
 * zone visible s'arrêterait au-dessus de la barre, plus rien ne passerait
 * derrière, le flou n'aurait plus rien à flouter et il ne resterait qu'une bande
 * noire morte. Le défaut a existé, et il ne se voyait qu'à l'écran.
 *
 * `h-dvh` et non `h-screen` : sur téléphone, la barre d'adresse mobile fait
 * varier la hauteur visible, et `100vh` fait dépasser le contenu sous la barre.
 */
export function Shell({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex h-dvh w-full flex-col overflow-hidden">
			{/* Le drapé, une fois, derrière tous les écrans. C'est lui qui donne au
			    verre des cartes et des barres quelque chose à réfracter — sans lui,
			    chaque translucidité retombe sur un aplat un peu plus clair. */}
			<Fond />

			<main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>

			<BarreBranchee />
			<CompagnonBranche />
		</div>
	);
}
