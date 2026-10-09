import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { precharger } from '../../app/prechargement';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { aujourdHuiISO } from '../../ui';
import {
	EcranNotifications,
	destinationDeNotification,
	type NotificationAffichee
} from '../../screens/notifications';

export const Route = createFileRoute('/app/notifications')({
	// La boîte part au toucher de la cloche (`app/prechargement.ts`).
	loader: () => {
		precharger(api.notifications.listMyNotifications, {});
		precharger(api.recouvrement.lecture.listerCreances, {});
		precharger(api.recouvrement.lecture.listerDebiteurs, {});
	},
	component: PageNotifications,
	errorComponent: NotificationsEnErreur
});

function NotificationsEnErreur() {
	return <EcranNotifications donnees={{ etat: 'erreur' }} />;
}

/**
 * `/app/notifications` — LA BOÎTE DE RÉCEPTION, ouverte par la cloche d'« Aujourd'hui ».
 *
 * ⚠️ LES CRÉANCES ET LES CLIENTS SONT LUS POUR UNE SEULE RAISON : relire les liens
 * `?ligne=<id>` des notifications écrites entre le 17 septembre et le 8 octobre
 * 2026, qui ne disaient pas si l'identifiant était un dossier ou un client.
 * Voir `destinationDeNotification`.
 */
function PageNotifications() {
	const aujourdHui = aujourdHuiISO();
	const notifications = useQuery(api.notifications.listMyNotifications, {});
	const creances = useQuery(api.recouvrement.lecture.listerCreances, {});
	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	/*
	  ⚠️ LUE AU TOUCHER, SANS ATTENDRE LE SERVEUR (09/10/2026). La pastille de la
	  cloche et le point de la rangée tombent tout de suite (mise à jour
	  optimiste de Convex) ; le serveur confirme derrière, ou défait si la marque
	  échoue.
	*/
	const marquerLue = useMutation(api.notifications.markAsRead).withOptimisticUpdate(
		(local, { notificationId }) => {
			const liste = local.getQuery(api.notifications.listMyNotifications, {});
			if (liste === undefined) return;
			const etaitNonLue = liste.some((n) => n._id === notificationId && !n.isRead);
			local.setQuery(
				api.notifications.listMyNotifications,
				{},
				liste.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
			);
			const compte = local.getQuery(api.notifications.getUnreadCount, {});
			if (etaitNonLue && compte !== undefined) {
				local.setQuery(api.notifications.getUnreadCount, {}, Math.max(0, compte - 1));
			}
		}
	);
	const toutMarquerLu = useMutation(api.notifications.markAllAsRead).withOptimisticUpdate(
		(local) => {
			const liste = local.getQuery(api.notifications.listMyNotifications, {});
			if (liste !== undefined) {
				local.setQuery(
					api.notifications.listMyNotifications,
					{},
					liste.map((n) => ({ ...n, isRead: true }))
				);
			}
			local.setQuery(api.notifications.getUnreadCount, {}, 0);
		}
	);

	if (notifications === undefined || creances === undefined || debiteurs === undefined) {
		return <EcranNotifications donnees={{ etat: 'attente' }} />;
	}

	const lesCreances = new Set(creances.map((c) => c._id as string));
	const lesClients = new Set(debiteurs.map((d) => d._id as string));
	const sait = {
		estUneCreance: (id: string) => lesCreances.has(id),
		estUnClient: (id: string) => lesClients.has(id)
	};

	return (
		<EcranNotifications
			donnees={{
				etat: 'pret',
				valeur: {
					aujourdHui,
					notifications: notifications.map((n): NotificationAffichee => {
						const destination =
							n.link === undefined ? undefined : destinationDeNotification(n.link, sait);
						return {
							id: n._id,
							genre: n.type,
							message: n.message,
							// Le jour en UTC, comme `aujourdHuiISO` : les deux se comparent.
							jour: new Date(n.createdAt).toISOString().slice(0, 10),
							lue: n.isRead,
							...(destination === undefined ? {} : { destination })
						};
					}),
					onLire: (id) => void marquerLue({ notificationId: id as Id<'notifications'> }),
					onToutLire: () => void toutMarquerLu({})
				}
			}}
		/>
	);
}
