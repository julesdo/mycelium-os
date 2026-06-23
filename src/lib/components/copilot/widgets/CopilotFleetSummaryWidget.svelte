<script lang="ts">
	import type { FleetSummaryWidget } from './types.js';
	import CarIcon from '@lucide/svelte/icons/car';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	let { data }: { data: FleetSummaryWidget } = $props();

	const kpis = $derived([
		{
			icon: CarIcon,
			label: 'Total flotte',
			value: data.fleet.total,
			color: 'text-foreground',
			bg: 'bg-muted/50'
		},
		{
			icon: CheckCircleIcon,
			label: 'Disponibles',
			value: data.fleet.available,
			color: 'text-emerald-500',
			bg: 'bg-emerald-500/10'
		},
		{
			icon: ActivityIcon,
			label: 'En cours',
			value: data.fleet.inUse,
			color: 'text-blue-500',
			bg: 'bg-blue-500/10'
		},
		{
			icon: WrenchIcon,
			label: 'Maintenance',
			value: data.fleet.maintenance,
			color: 'text-amber-500',
			bg: 'bg-amber-500/10'
		}
	]);
</script>

<div class="flex flex-col gap-2">
	<!-- KPI grid -->
	<div class="grid grid-cols-2 gap-2">
		{#each kpis as kpi}
			{@const Icon = kpi.icon}
			<div class="relative overflow-hidden rounded-xl border border-border bg-card p-3 shadow-glass-card">
				<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"></div>
				<div class="flex items-center gap-2">
					<div class="flex size-7 shrink-0 items-center justify-center rounded-lg {kpi.bg}">
						<Icon class="size-3.5 {kpi.color}" />
					</div>
					<div>
						<p class="text-[11px] text-muted-foreground">{kpi.label}</p>
						<p class="text-xl font-black tabular-nums {kpi.color}">{kpi.value}</p>
					</div>
				</div>
			</div>
		{/each}
	</div>
	<!-- Reservations row -->
	<div class="flex gap-2">
		<div class="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-glass-card">
			<CalendarIcon class="size-3.5 shrink-0 text-[var(--brand)]" />
			<div>
				<p class="text-[11px] text-muted-foreground">Aujourd'hui</p>
				<p class="text-sm font-bold tabular-nums">{data.reservations.todayActive}</p>
			</div>
		</div>
		<div class="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-glass-card">
			<CalendarIcon class="size-3.5 shrink-0 text-muted-foreground" />
			<div>
				<p class="text-[11px] text-muted-foreground">Cette semaine</p>
				<p class="text-sm font-bold tabular-nums">{data.reservations.thisWeekTotal}</p>
			</div>
		</div>
	</div>
</div>
