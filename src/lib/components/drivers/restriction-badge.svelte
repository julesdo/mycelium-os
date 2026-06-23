<script lang="ts">
	type RestrictionType = 'NO_LONG_DISTANCE' | 'NO_UTILITY' | 'NO_TRUCK' | 'MAX_KM_PER_MONTH' | 'SITE_ONLY';

	const LABELS: Record<RestrictionType, string> = {
		NO_LONG_DISTANCE: 'Pas de long trajet',
		NO_UTILITY: 'Pas d\'utilitaire',
		NO_TRUCK: 'Pas de camion',
		MAX_KM_PER_MONTH: 'Km max/mois',
		SITE_ONLY: 'Site limité'
	};

	const COLORS: Record<RestrictionType, string> = {
		NO_LONG_DISTANCE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
		NO_UTILITY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
		NO_TRUCK: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
		MAX_KM_PER_MONTH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
		SITE_ONLY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
	};

	interface Props {
		type: RestrictionType;
		value?: string;
	}

	const { type, value }: Props = $props();
</script>

<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {COLORS[type]}">
	{LABELS[type]}{value ? ` (${value})` : ''}
</span>
