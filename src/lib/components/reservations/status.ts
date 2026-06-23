export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const RESERVATION_STATUS_CONFIG: Record<
	ReservationStatus,
	{ label: string; class: string }
> = {
	PENDING: {
		label: 'En attente',
		class: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
	},
	CONFIRMED: {
		label: 'Confirmée',
		class: 'bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-300'
	},
	IN_PROGRESS: {
		label: 'En cours',
		class: 'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300'
	},
	COMPLETED: {
		label: 'Terminée',
		class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300'
	},
	CANCELLED: {
		label: 'Annulée',
		class: 'bg-muted text-muted-foreground'
	}
};
