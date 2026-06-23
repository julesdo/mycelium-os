<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import MaintenanceStatusBadge from './MaintenanceStatusBadge.svelte';
	import type { MaintenanceRecord } from './types.js';
	import { TYPE_LABELS } from './types.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	interface Props {
		records: MaintenanceRecord[];
		onViewDetails?: (id: string) => void;
	}

	let { records, onViewDetails }: Props = $props();

	const today = new Date();
	let year = $state(today.getFullYear());
	let month = $state(today.getMonth()); // 0-indexed

	const MONTH_NAMES = [
		'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
		'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
	];
	const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

	function prevMonth() {
		if (month === 0) { month = 11; year -= 1; }
		else month -= 1;
	}

	function nextMonth() {
		if (month === 11) { month = 0; year += 1; }
		else month += 1;
	}

	const calendarDays = $derived.by(() => {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		// Monday-first: 0=Mon…6=Sun
		const startDow = (firstDay.getDay() + 6) % 7;
		const totalDays = lastDay.getDate();

		const days: { date: number | null; iso: string | null }[] = [];

		for (let i = 0; i < startDow; i++) days.push({ date: null, iso: null });

		for (let d = 1; d <= totalDays; d++) {
			const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
			days.push({ date: d, iso });
		}

		// Pad end to complete last row
		while (days.length % 7 !== 0) days.push({ date: null, iso: null });

		return days;
	});

	const recordsByDate = $derived.by(() => {
		const map = new Map<string, MaintenanceRecord[]>();
		for (const r of records) {
			const key = r.scheduledDate.slice(0, 10);
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(r);
		}
		return map;
	});

	const todayIso = today.toISOString().slice(0, 10);

	let hoveredRecord = $state<MaintenanceRecord | null>(null);
	let tooltipPos = $state({ x: 0, y: 0 });

	function statusColor(status: MaintenanceRecord['status']): string {
		if (status === 'SCHEDULED') return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300';
		if (status === 'IN_PROGRESS') return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300';
		if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
		return 'bg-muted text-muted-foreground';
	}

	function formatCost(n: number): string {
		return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex flex-col gap-4">
	<!-- Navigation -->
	<div class="flex items-center justify-between">
		<h2 class="text-base font-semibold">
			{MONTH_NAMES[month]} {year}
		</h2>
		<div class="flex items-center gap-1">
			<Button variant="outline" size="icon-sm" onclick={prevMonth} aria-label="Mois précédent">
				<ChevronLeftIcon class="size-4" />
			</Button>
			<Button variant="outline" size="icon-sm" onclick={nextMonth} aria-label="Mois suivant">
				<ChevronRightIcon class="size-4" />
			</Button>
		</div>
	</div>

	<!-- Grid -->
	<div class="overflow-hidden rounded-lg border border-border">
		<!-- Day headers -->
		<div class="grid grid-cols-7 border-b border-border bg-muted/50">
			{#each DAY_NAMES as day (day)}
				<div class="py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
			{/each}
		</div>

		<!-- Weeks -->
		<div class="grid grid-cols-7 divide-x divide-y divide-border">
			{#each calendarDays as cell, i (i)}
				{@const dayRecords = cell.iso ? (recordsByDate.get(cell.iso) ?? []) : []}
				{@const isToday = cell.iso === todayIso}
				<div
					class="min-h-[90px] p-1.5 {cell.date ? 'bg-card hover:bg-muted/20' : 'bg-muted/30'}"
				>
					{#if cell.date}
						<div class="mb-1 flex items-center justify-between">
							<span
								class="flex size-6 items-center justify-center rounded-full text-xs font-medium
								{isToday ? 'bg-primary text-primary-foreground' : 'text-foreground/70'}"
							>
								{cell.date}
							</span>
						</div>

						<!-- Records for this day -->
						<div class="flex flex-col gap-0.5">
							{#each dayRecords.slice(0, 3) as record (record.id)}
								<button
									class="w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80 {statusColor(record.status)}"
									onclick={() => onViewDetails?.(record.id)}
									onmouseenter={(e) => {
										hoveredRecord = record;
										tooltipPos = { x: e.clientX, y: e.clientY };
									}}
									onmouseleave={() => (hoveredRecord = null)}
									title="{record.vehicleRegistration} — {TYPE_LABELS[record.type]}"
								>
									{record.vehicleRegistration} · {TYPE_LABELS[record.type]}
								</button>
							{/each}
							{#if dayRecords.length > 3}
								<span class="px-1 text-[11px] text-muted-foreground">
									+{dayRecords.length - 3} autre{dayRecords.length - 3 > 1 ? 's' : ''}
								</span>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Tooltip -->
	{#if hoveredRecord}
		<div
			class="pointer-events-none fixed z-50 max-w-[240px] rounded-lg border border-border bg-popover p-3 shadow-lg"
			style="left: {Math.min(tooltipPos.x + 12, typeof window !== 'undefined' ? window.innerWidth - 260 : 0)}px; top: {tooltipPos.y - 80}px"
		>
			<div class="mb-1.5 flex items-center gap-2">
				<span class="font-mono text-sm font-semibold">{hoveredRecord.vehicleRegistration}</span>
				<MaintenanceStatusBadge status={hoveredRecord.status} />
			</div>
			<p class="text-xs text-muted-foreground">{hoveredRecord.vehicleBrand} {hoveredRecord.vehicleModel}</p>
			<p class="mt-1 text-xs font-medium">{TYPE_LABELS[hoveredRecord.type]}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{hoveredRecord.garage}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{formatCost(hoveredRecord.costEstimate)} estimé</p>
		</div>
	{/if}
</div>
