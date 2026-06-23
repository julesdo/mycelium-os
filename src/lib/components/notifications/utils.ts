export type NotificationType =
	| 'RESERVATION_CONFIRMED'
	| 'RESERVATION_CANCELLED'
	| 'RESERVATION_REMINDER'
	| 'CONFLICT_DETECTED'
	| 'VEHICLE_RETURNED'
	| 'MAINTENANCE_DUE'
	| 'UNDERUTILIZED_VEHICLE'
	| 'LEASE_EXPIRING';

export function buildNotificationContent(
	type: NotificationType,
	params: Record<string, string>
): { title: string; message: string } {
	switch (type) {
		case 'RESERVATION_CONFIRMED':
			return {
				title: 'Réservation confirmée',
				message: `${params.vehicleLabel} réservé du ${params.start} au ${params.end}`
			};
		case 'RESERVATION_CANCELLED':
			return {
				title: 'Réservation annulée',
				message: `Votre réservation du ${params.start} a été annulée`
			};
		case 'RESERVATION_REMINDER':
			return {
				title: 'Rappel — Demain',
				message: `N'oubliez pas votre ${params.vehicleLabel} demain à ${params.time}`
			};
		case 'CONFLICT_DETECTED':
			return {
				title: 'Conflit détecté',
				message: `${params.vehicleLabel} est déjà réservé sur cette période`
			};
		case 'VEHICLE_RETURNED':
			return {
				title: 'Véhicule rendu',
				message: `${params.vehicleLabel} a été restitué`
			};
		case 'MAINTENANCE_DUE':
			return {
				title: 'Entretien planifié',
				message: `${params.vehicleLabel} est dû pour entretien dans ${params.daysLeft} jours`
			};
		case 'UNDERUTILIZED_VEHICLE':
			return {
				title: 'Véhicule sous-utilisé',
				message: `${params.vehicleLabel} n'a pas été utilisé depuis ${params.daysSince} jours`
			};
		case 'LEASE_EXPIRING':
			return {
				title: 'Leasing expirant',
				message: `Le contrat de ${params.vehicleLabel} expire dans ${params.daysLeft} jours`
			};
		default:
			return { title: 'Notification', message: '' };
	}
}

export function deriveUnreadCount(notifications: { isRead: boolean }[]): number {
	return notifications.filter((n) => !n.isRead).length;
}
