<script lang="ts">
	import { differenceInCalendarDays, startOfDay, format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import WrenchIcon from '@lucide/svelte/icons/wrench';

	export type CalendarMaintenance = {
		_id: string;
		vehicleId: string;
		maintenanceType: string;
		scheduledDate: number;
		status: 'SCHEDULED' | 'IN_PROGRESS';
		vehicleRegistration: string;
		vehicleBrand: string;
		vehicleModel: string;
	};

	const TYPE_LABELS: Record<string, string> = {
		REVISION: 'Révision',
		VIDANGE: 'Vidange',
		PNEUS: 'Pneumatiques',
		FREINS: 'Freins',
		AUTRE: 'Entretien'
	};

	type Props = {
		maintenance: CalendarMaintenance;
		windowStart: Date;
		columnCount: number;
	};

	let { maintenance, windowStart, columnCount }: Props = $props();

	// Block covers the full local day of scheduledDate
	const blockDayStart = $derived(startOfDay(new Date(maintenance.scheduledDate)));
	const blockDayEnd = $derived(startOfDay(new Date(maintenance.scheduledDate + 24 * 60 * 60 * 1000)));

	const startDayIdx = $derived(differenceInCalendarDays(blockDayStart, startOfDay(windowStart)));
	const endDayIdx = $derived(differenceInCalendarDays(blockDayEnd, startOfDay(windowStart)));

	const clampedStart = $derived(Math.max(0, startDayIdx));
	const clampedEnd = $derived(Math.min(columnCount, endDayIdx));
	const visible = $derived(clampedEnd > clampedStart);

	const label = $derived(TYPE_LABELS[maintenance.maintenanceType] ?? maintenance.maintenanceType);
	const dateLabel = $derived(format(new Date(maintenance.scheduledDate), 'd MMM', { locale: fr }));
	const statusClass = $derived(
		maintenance.status === 'IN_PROGRESS'
			? 'border-orange-400 bg-orange-200/80 text-orange-900 dark:border-orange-500/50 dark:bg-orange-500/20 dark:text-orange-200'
			: 'border-orange-300 bg-orange-100/80 text-orange-800 dark:border-orange-600/40 dark:bg-orange-500/15 dark:text-orange-300'
	);
</script>

{#if visible}
	<div
		class="pointer-events-none absolute bottom-1 top-1 z-10 flex items-center gap-1 overflow-hidden rounded border px-2 text-xs font-medium {statusClass}"
		style="left: calc({(clampedStart / columnCount) * 100}%); width: calc({((clampedEnd - clampedStart) / columnCount) * 100}% - 2px);"
		title="Entretien {label} — {dateLabel}"
	>
		<WrenchIcon size={11} class="shrink-0 opacity-70" />
		<span class="truncate">{label}</span>
	</div>
{/if}
