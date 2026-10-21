import { useEffect, useSyncExternalStore } from 'react';

/**
 * LES PAGES PLEINES OUVERTES (21/10/2026, le parcours de l'habitude) : combien il y en a
 * à l'écran. Une célébration ne se pose jamais par-dessus une feuille ouverte ; elle
 * attend qu'elle se ferme. Chaque `PleinEcran` se compte tant qu'il est ouvert.
 */

let ouvertes = 0;
const abonnes = new Set<() => void>();

function prevenir() {
	for (const abonne of abonnes) abonne();
}

function sAbonner(abonne: () => void): () => void {
	abonnes.add(abonne);
	return () => {
		abonnes.delete(abonne);
	};
}

export function useCompterLaFeuille(ouverte: boolean): void {
	useEffect(() => {
		if (!ouverte) return;
		ouvertes += 1;
		prevenir();
		return () => {
			ouvertes -= 1;
			prevenir();
		};
	}, [ouverte]);
}

export function useUneFeuilleOuverte(): boolean {
	return useSyncExternalStore(
		sAbonner,
		() => ouvertes > 0,
		() => false
	);
}
