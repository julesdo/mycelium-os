<script lang="ts">
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import EuroIcon from '@lucide/svelte/icons/euro';
	import CarIcon from '@lucide/svelte/icons/car';
	import GaugeIcon from '@lucide/svelte/icons/gauge';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';

	interface KPIs {
		totalCurrent: number;
		totalPrevious: number;
		evolutionPct: number | null;
		avgCostPerVehicle: number;
		costCount: number;
	}

	interface Props {
		kpis: KPIs | null | undefined;
		loading?: boolean;
	}

	let { kpis, loading = false }: Props = $props();

	function fmt(n: number): string {
		return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
	}

	const totalValue = $derived(kpis ? fmt(kpis.totalCurrent) : '—');
	const avgValue = $derived(kpis ? fmt(kpis.avgCostPerVehicle) : '—');

	const evolutionTrend = $derived(
		kpis?.evolutionPct != null
			? {
					value: `${kpis.evolutionPct > 0 ? '+' : ''}${kpis.evolutionPct.toFixed(1)}%`,
					direction: kpis.evolutionPct > 0 ? ('up' as const) : kpis.evolutionPct < 0 ? ('down' as const) : ('neutral' as const)
				}
			: undefined
	);

	const totalTrend = $derived(
		kpis?.evolutionPct != null
			? {
					value: `${kpis.evolutionPct > 0 ? '+' : ''}${kpis.evolutionPct.toFixed(1)}%`,
					direction: kpis.evolutionPct > 0 ? ('up' as const) : kpis.evolutionPct < 0 ? ('down' as const) : ('neutral' as const)
				}
			: undefined
	);
</script>

<div
	class="grid grid-cols-2 gap-3 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
>
	<div style="--enter-delay: 0ms" class="animate-enter-blur-up">
		<MetricCard
			icon={EuroIcon}
			label="Coût total flotte"
			value={totalValue}
			trend={totalTrend}
			subtitle="période sélectionnée"
			{loading}
			class="h-full"
		/>
	</div>
	<div style="--enter-delay: 50ms" class="animate-enter-blur-up">
		<MetricCard
			icon={CarIcon}
			label="Coût moyen / véhicule"
			value={avgValue}
			subtitle="sur la période"
			{loading}
			class="h-full"
		/>
	</div>
	<div style="--enter-delay: 100ms" class="animate-enter-blur-up">
		<MetricCard
			icon={GaugeIcon}
			label="Coût / km"
			value="—"
			subtitle="Suivi kilométrique requis"
			{loading}
			class="h-full"
		/>
	</div>
	<div style="--enter-delay: 150ms" class="animate-enter-blur-up">
		<MetricCard
			icon={TrendingUpIcon}
			label="Évolution vs période préc."
			value={kpis?.evolutionPct != null ? `${kpis.evolutionPct > 0 ? '+' : ''}${kpis.evolutionPct.toFixed(1)}%` : '—'}
			trend={evolutionTrend}
			subtitle={kpis ? `${kpis.costCount} entrée${kpis.costCount > 1 ? 's' : ''}` : undefined}
			{loading}
			class="h-full"
		/>
	</div>
</div>
