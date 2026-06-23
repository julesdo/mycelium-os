<script lang="ts">
	import type { MaintenanceOverviewWidget } from './types.js';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import ClockIcon from '@lucide/svelte/icons/clock';

	let { data }: { data: MaintenanceOverviewWidget } = $props();

	const MAINTENANCE_LABELS: Record<string, string> = {
		OIL_CHANGE: 'Vidange',
		TIRES: 'Pneumatiques',
		BRAKES: 'Freins',
		TECHNICAL_INSPECTION: 'CT',
		GENERAL: 'Entretien général',
		OTHER: 'Autre'
	};
</script>

<div class="flex flex-col gap-2">
	<!-- Summary -->
	<div class="grid grid-cols-2 gap-2">
		<div class="relative overflow-hidden rounded-xl border border-border bg-card p-3 shadow-glass-card">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"></div>
			<div class="flex items-center gap-2">
				<WrenchIcon class="size-4 text-muted-foreground" />
				<div>
					<p class="text-[11px] text-muted-foreground">Planifiés</p>
					<p class="text-xl font-black">{data.summary.totalScheduled}</p>
				</div>
			</div>
		</div>
		<div class="relative overflow-hidden rounded-xl border border-red-200/50 bg-card p-3 shadow-glass-card dark:border-red-900/30">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"></div>
			<div class="flex items-center gap-2">
				<AlertTriangleIcon class="size-4 text-red-500" />
				<div>
					<p class="text-[11px] text-muted-foreground">En retard</p>
					<p class="text-xl font-black text-red-500">{data.overdue.length}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Overdue items -->
	{#if data.overdue.length > 0}
		<div class="flex flex-col gap-1 rounded-xl border border-red-200/50 bg-red-50/50 px-3 py-2.5 dark:border-red-900/30 dark:bg-red-950/20">
			<p class="mb-1 text-[11px] font-semibold text-red-600 dark:text-red-400">En retard</p>
			{#each data.overdue.slice(0, 4) as item}
				<div class="flex items-center justify-between gap-2">
					<p class="min-w-0 truncate text-xs">{item.vehicle}</p>
					<span class="shrink-0 text-[11px] font-semibold text-red-500">+{item.daysOverdue}j</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Upcoming items -->
	{#if data.upcoming.length > 0}
		<div class="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2.5 shadow-glass-card">
			<p class="mb-1 text-[11px] font-semibold text-muted-foreground">Prochains entretiens</p>
			{#each data.upcoming.slice(0, 4) as item}
				<div class="flex items-center justify-between gap-2">
					<div class="flex min-w-0 items-center gap-1.5">
						<ClockIcon class="size-3 shrink-0 text-muted-foreground" />
						<p class="min-w-0 truncate text-xs">{item.vehicle}</p>
					</div>
					<span class="shrink-0 text-[11px] text-muted-foreground">{item.scheduledDate}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
