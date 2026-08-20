import { useCallback, useSyncExternalStore } from 'react';

/**
 * Une préférence d'interface persistée dans le navigateur.
 *
 * Écrit avec `useSyncExternalStore` et non avec `useState` + `useEffect`.
 * La raison n'est pas cosmétique : `localStorage` est un magasin externe et
 * mutable, et le lire dans un effet pour appeler `setState` déclenche un second
 * rendu en cascade à chaque montage. React 19 le signale comme une erreur, et
 * l'utilisateur le voit sous forme de scintillement — le thème clair qui vire
 * au sombre une fraction de seconde après l'affichage.
 *
 * `getServerSnapshot` renvoie la valeur par défaut : au rendu serveur il n'y a
 * pas de navigateur, donc pas de préférence connue.
 */

const abonnes = new Set<() => void>();

function prevenir() {
	for (const f of abonnes) f();
}

function souscrire(f: () => void) {
	abonnes.add(f);
	// `storage` ne se déclenche que dans les AUTRES onglets. On veut aussi que
	// deux onglets ouverts sur Mycelium restent d'accord sur le thème.
	window.addEventListener('storage', f);
	return () => {
		abonnes.delete(f);
		window.removeEventListener('storage', f);
	};
}

export function usePreference<T extends string>(
	cle: string,
	defaut: T,
	valides: readonly T[]
): [T, (valeur: T) => void] {
	const valeur = useSyncExternalStore(
		souscrire,
		() => {
			const brut = localStorage.getItem(cle);
			return brut !== null && (valides as readonly string[]).includes(brut) ? (brut as T) : defaut;
		},
		() => defaut
	);

	const definir = useCallback(
		(v: T) => {
			localStorage.setItem(cle, v);
			prevenir();
		},
		[cle]
	);

	return [valeur, definir];
}
