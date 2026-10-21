/*
 * LE SERVICE WORKER DE LETIKETTE : LE PUSH, ET RIEN D'AUTRE (21/10/2026).
 *
 * Il affiche une notification push et ramène l'onglet où elle mène. ⚠️ AUCUN
 * gestionnaire `fetch`, AUCUNE mise en cache : l'application servie reste celle du
 * déploiement Vercel, jamais une copie ancienne qu'un service worker aurait gardée.
 * Le serveur envoie `{ titre, texte, lien, tag }` (`src/lib/convex/push/envoi.ts`).
 */

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (evenement) => {
	evenement.waitUntil(self.clients.claim());
});

self.addEventListener('push', (evenement) => {
	let donnees;
	try {
		donnees = evenement.data ? evenement.data.json() : {};
	} catch {
		donnees = { texte: evenement.data ? evenement.data.text() : '' };
	}
	evenement.waitUntil(
		self.registration.showNotification(donnees.titre || 'Letikette', {
			body: donnees.texte || '',
			icon: '/apple-touch-icon.png',
			badge: '/favicon.png',
			tag: donnees.tag,
			lang: 'fr',
			data: { lien: donnees.lien || '/app' }
		})
	);
});

self.addEventListener('notificationclick', (evenement) => {
	evenement.notification.close();
	const lien = new URL(
		(evenement.notification.data && evenement.notification.data.lien) || '/app',
		self.location.origin
	).href;
	evenement.waitUntil(
		(async () => {
			const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const fenetre of fenetres) {
				if (new URL(fenetre.url).origin !== self.location.origin) continue;
				await fenetre.focus();
				if ('navigate' in fenetre) await fenetre.navigate(lien);
				return;
			}
			await self.clients.openWindow(lien);
		})()
	);
});
