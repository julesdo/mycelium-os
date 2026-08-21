import type { ReactNode } from 'react';
import { Barre, BarreBasse } from './barre';

/**
 * Le cadre de l'application authentifiée.
 *
 * Une colonne : la barre en haut, le contenu qui prend tout le reste. C'était
 * un rail vertical et une bordure ; c'est maintenant une surface posée sur un
 * fond chaud, et le contenu récupère toute la largeur — ce qui vaut une colonne
 * de cartes de plus sur une tablette en paysage, le format de référence.
 *
 * `h-dvh` et non `h-screen` : sur téléphone, la barre d'adresse mobile fait
 * varier la hauteur visible, et `100vh` fait dépasser le contenu sous la barre
 * basse de navigation.
 *
 * La marge basse dégage la barre de navigation flottante du téléphone. On la
 * prend franche plutôt qu'ajustée au pixel : un calage exact se casse au
 * premier changement de taille de bouton, et le symptôme — la dernière carte
 * de la file à moitié cachée — ne se voit qu'en faisant défiler jusqu'en bas.
 */
export function Shell({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-dvh w-full flex-col overflow-hidden">
			<Barre />
			<main className="min-h-0 min-w-0 flex-1 overflow-hidden pb-28 md:pb-0">{children}</main>
			<BarreBasse />
		</div>
	);
}
