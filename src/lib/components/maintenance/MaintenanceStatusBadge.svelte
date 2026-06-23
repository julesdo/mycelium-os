<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { BadgeVariant } from '$lib/components/ui/badge/index.js';
	import type { MaintenanceStatus } from './types.js';

	interface Props {
		status: MaintenanceStatus;
		class?: string;
	}

	let { status, class: className = '' }: Props = $props();

	const config: Record<MaintenanceStatus, { label: string; variant: BadgeVariant; class: string }> =
		{
			SCHEDULED: {
				label: 'Planifié',
				variant: 'secondary',
				class: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
			},
			IN_PROGRESS: {
				label: 'En cours',
				variant: 'secondary',
				class: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
			},
			COMPLETED: {
				label: 'Terminé',
				variant: 'secondary',
				class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
			},
			CANCELLED: {
				label: 'Annulé',
				variant: 'outline',
				class: ''
			}
		};

	const { label, variant, class: statusClass } = $derived(config[status]);
</script>

<Badge {variant} class="{statusClass} {className}" aria-label="Statut : {label}">
	{label}
</Badge>
