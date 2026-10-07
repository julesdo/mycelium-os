import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { aujourdHuiISO } from '../../ui';
import {
	EcranNotifications,
	destinationDeNotification,
	type NotificationAffichee
} from '../../screens/notifications';

export const Route = createFileRoute('/app/notifications')({
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
	const marquerLue = useMutation(api.notifications.markAsRead);
	const toutMarquerLu = useMutation(api.notifications.markAllAsRead);

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
