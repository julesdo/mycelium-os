<script lang="ts">
	import type { FleetUtilizationWidget } from './types.js';

	let { data }: { data: FleetUtilizationWidget } = $props();

	const PERIOD_LABELS: Record<string, string> = {
		this_week: 'cette semaine',
		this_month: 'ce mois',
		last_month: 'mois dernier',
		this_quarter: 'ce trimestre',
		this_year: 'cette année',
		last_90_days: '90 derniers jours'
	};

	function barColor(rate: number) {
		if (rate >= 70) return 'bg-emerald-500';
		if (rate >= 40) return 'bg-[var(--brand)]';
		return 'bg-red-400';
	}

	const topVehicles = $derived(data.vehicles.slice(0, 8));
</script>

<div class="flex flex-col gap-2">
	<!-- Summary header -->
	<div class="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 shadow-glass-card">
		<div>
			<p class="text-[11px] text-muted-foreground">Taux moyen · {PERIOD_LABELS[data.period] ?? data.period}</p>
			<p class="text-2xl font-black tabular-nums">{data.avgUtilizationRate}<span class="text-base font-semibold text-muted-foreground">%</span></p>
		</div>
		<div class="text-right">
			<p class="text-[11px] text-muted-foreground">Véhicules analysés</p>
			<p class="text-sm font-bold">{data.totalVehicles}</p>
		</div>
	</div>

	<!-- Vehicle list with bars -->
	<div class="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-glass-card">
		{#each topVehicles as v}
			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-between gap-2">
					<p class="min-w-0 truncate text-xs font-medium">{v.label}</p>
					<span class="shrink-0 text-xs font-bold tabular-nums">{v.utilizationRate}%</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full transition-all {barColor(v.utilizationRate)}"
						style="width: {Math.min(v.utilizationRate, 100)}%"
					></div>
				</div>
			</div>
		{/each}
	</div>
</div>
