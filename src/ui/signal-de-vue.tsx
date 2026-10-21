import { useEffect } from 'react';

/**
 * CE QUI EST VU SE DIT QUAND IL EST RENDU (21/10/2026). Posé à côté de ce qu'il signale,
 * il prévient une fois par clé, à l'affichage : la carte du lundi ne s'inscrit « montrée »
 * que si l'écran la pose vraiment (pas quand Aujourd'hui montre son premier jour).
 */
export function SignalDeVue({ cle, onVue }: { readonly cle: string; readonly onVue: () => void }) {
	useEffect(() => {
		onVue();
		// Une fois par clé : `onVue` change d'identité à chaque rendu de l'écran.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cle]);
	return null;
}
