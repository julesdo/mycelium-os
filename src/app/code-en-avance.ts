import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';

/**
 * LE CODE DES ÉCRANS LES PLUS OUVERTS, CHARGÉ PENDANT QUE L'APPLICATION SE REPOSE.
 *
 * ⚠️ CE QUE ÇA CHANGE (09/10/2026). Chaque écran a son paquet de code, téléchargé
 * la première fois qu'on l'ouvre : le premier passage d'un onglet à l'autre
 * attendait ce téléchargement, sur un réseau de téléphone. Une fois la session
 * ouverte et le premier écran affiché, le navigateur profite de son repos
 * (`requestIdleCallback`) pour charger les quatre onglets, la page d'un dossier,
 * la fiche d'un client et la conversation avec Plume. Le code seul : aucune
 * requête Convex ne s'ouvre ici, les données partent au toucher
 * (`prechargement.ts`).
 */
const ECRANS_LES_PLUS_OUVERTS = [
	'/app/',
	'/app/dossiers',
	'/app/clients',
	'/app/compte',
	'/app/dossier/$id',
	'/app/clients/$id',
	'/app/pilote/$id',
	'/app/notifications'
] as const;

export function useCodeEnAvance(actif: boolean): void {
	const router = useRouter();
	useEffect(() => {
		if (!actif || typeof window === 'undefined') return;
		const charger = () => {
			for (const id of ECRANS_LES_PLUS_OUVERTS) {
				const route = router.routesById[id as keyof typeof router.routesById];
				if (route !== undefined) void router.loadRouteChunk(route);
			}
		};
		if (typeof window.requestIdleCallback === 'function') {
			const tache = window.requestIdleCallback(charger, { timeout: 4000 });
			return () => window.cancelIdleCallback(tache);
		}
		const minuteur = window.setTimeout(charger, 2000);
		return () => window.clearTimeout(minuteur);
	}, [actif, router]);
}
