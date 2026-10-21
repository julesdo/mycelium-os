/**
 * L'ENREGISTREMENT DU SERVICE WORKER (21/10/2026, le parcours de l'habitude).
 *
 * Au repos, une fois, depuis la coquille de `/app`. Le service worker ne fait que le push
 * (`public/sw.js`), aucune mise en cache. ⚠️ CE MODULE N'IMPORTE RIEN : la coquille fait
 * partie du paquet d'entrée, qui ne porte que le socle.
 */
export function enregistrerLeServiceWorker(): void {
	if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
	const enregistrer = () => {
		navigator.serviceWorker.register('/sw.js').catch(() => undefined);
	};
	if ('requestIdleCallback' in window) window.requestIdleCallback(enregistrer);
	else setTimeout(enregistrer, 2000);
}
