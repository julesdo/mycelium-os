<script lang="ts">
	import type { CostBreakdownWidget } from './types.js';
	import EuroIcon from '@lucide/svelte/icons/euro';

	let { data }: { data: CostBreakdownWidget } = $props();

	const PERIOD_LABELS: Record<string, string> = {
		this_month: 'ce mois',
		last_month: 'mois dernier',
		this_quarter: 'ce trimestre',
		this_year: 'cette année'
	};

	const CATEGORY_LABELS: Record<string, string> = {
		FUEL: 'Carburant',
		MAINTENANCE: 'Entretien',
		INSURANCE: 'Assurance',
		LEASING: 'Leasing',
		TOLLS: 'Péages',
		PARKING: 'Parking',
		FINES: 'Amendes',
		OTHER: 'Autres'
	};

	const CATEGORY_COLORS = [
		'bg-[var(--brand)]',
		'bg-blue-500',
		'bg-emerald-500',
		'bg-purple-500',
		'bg-orange-500',
		'bg-pink-500'
	];

	function fmt(n: number) {
		return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Total header -->
	<div class="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-glass-card">
		<div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/15">
			<EuroIcon class="size-4 text-[var(--brand)]" />
		</div>
		<div>
			<p class="text-[11px] text-muted-foreground">Total · {PERIOD_LABELS[data.period] ?? data.period}</p>
			<p class="text-xl font-black tabular-nums">{fmt(data.total)}</p>
		</div>
	</div>

	<!-- Category breakdown -->
	{#if data.byCategory && data.byCategory.length > 0}
		<div class="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-glass-card">
			{#each data.byCategory as cat, i}
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between">
						<p class="text-xs font-medium">{CATEGORY_LABELS[cat.category] ?? cat.category}</p>
						<div class="flex items-center gap-2">
							<span class="text-[11px] text-muted-foreground">{cat.percentage}%</span>
							<span class="min-w-[56px] text-right text-xs font-bold tabular-nums">{fmt(cat.amount)}</span>
						</div>
					</div>
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
						<div
							class="h-full rounded-full {CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"
							style="width: {Math.min(cat.percentage, 100)}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Vehicle breakdown -->
	{#if data.byVehicle && data.byVehicle.length > 0}
		<div class="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2.5 shadow-glass-card">
			{#each data.byVehicle.slice(0, 6) as v, i}
				<div class="flex items-center justify-between gap-2 py-0.5">
					<p class="min-w-0 truncate text-xs">{v.vehicleLabel}</p>
					<span class="shrink-0 text-xs font-bold tabular-nums">{fmt(v.total)}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
