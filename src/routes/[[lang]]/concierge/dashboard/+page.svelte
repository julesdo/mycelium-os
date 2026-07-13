<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';

	const dash = useQuery(api['concierge/queries'].getServiceDashboard, {});

	function formatMinutes(min: number | null): string {
		if (min === null) return '—';
		if (min < 60) return `${min} min`;
		const h = Math.floor(min / 60);
		const m = min % 60;
		return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
	}

	const slaColor = $derived.by(() => {
		const r = dash.data?.slaRateThisMonth;
		if (r === null || r === undefined) return 'text-muted-foreground';
		if (r >= 90) return 'text-emerald-600 dark:text-emerald-400';
		if (r >= 70) return 'text-amber-500 dark:text-amber-400';
		return 'text-destructive';
	});
</script>

<svelte:head>
	<title>Dashboard service — Concierge Mycelium</title>
</svelte:head>

<div class="flex h-full flex-col px-4 pt-5 md:pt-7 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div class="mb-6 flex shrink-0 items-center gap-3">
		<div class="flex size-8 items-center justify-center rounded-xl bg-[var(--brand)]/10">
			<LayoutDashboardIcon class="size-4 text-[var(--brand-foreground)] dark:text-[var(--brand)]" />
		</div>
		<div>
			<h1 class="text-base font-semibold tracking-tight">Dashboard opérationnel</h1>
			<p class="text-[12px] text-muted-foreground">Vue super admin — qualité de service en temps réel</p>
		</div>
	</div>

	{#if dash.isLoading}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each { length: 8 } as _, i (i)}
				<Skeleton class="h-24 rounded-2xl" />
			{/each}
		</div>
	{:else if dash.data}
		{@const d = dash.data}

		<!-- KPIs ligne 1 : état courant -->
		<p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">État courant</p>
		<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<MetricCard
				variant="accent"
				label="Tickets actifs"
				value={d.activeCount}
				description="{d.newToday} nouveau{d.newToday > 1 ? 'x' : ''} aujourd'hui"
			/>
			<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				<p class="text-2xl font-bold {d.urgentOrCritical > 0 ? 'text-destructive' : 'text-muted-foreground/40'}">{d.urgentOrCritical}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">Urgents / Critiques</p>
				{#if d.urgentOrCritical > 0}
					<p class="mt-1 flex items-center gap-1 text-[10px] font-medium text-destructive">
						<AlertTriangleIcon class="size-3" />À traiter en priorité
					</p>
				{/if}
			</div>
			<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				<p class="text-2xl font-bold {d.breachedSlaCount > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}">{d.breachedSlaCount}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">SLA dépassés actifs</p>
				{#if d.breachedSlaCount === 0}
					<p class="mt-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Tout à jour</p>
				{/if}
			</div>
			<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				<p class="text-2xl font-bold {d.unassignedCount > 0 ? 'text-amber-500' : 'text-muted-foreground/40'}">{d.unassignedCount}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">Non assignés</p>
			</div>
		</div>

		<!-- KPIs ligne 2 : qualité de service ce mois -->
		<p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ce mois-ci</p>
		<div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
			<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				<p class="text-2xl font-bold {slaColor}">
					{d.slaRateThisMonth !== null ? `${d.slaRateThisMonth}%` : '—'}
				</p>
				<p class="mt-0.5 text-xs text-muted-foreground">Taux SLA respecté</p>
				<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full transition-all {d.slaRateThisMonth !== null && d.slaRateThisMonth >= 90 ? 'bg-emerald-500' : d.slaRateThisMonth !== null && d.slaRateThisMonth >= 70 ? 'bg-amber-500' : 'bg-destructive'}"
						style="width: {d.slaRateThisMonth ?? 0}%"
					></div>
				</div>
			</div>
			<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				<p class="text-2xl font-bold text-foreground font-mono tabular-nums">{formatMinutes(d.medianResponseMin)}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">Temps de réponse médian</p>
				<p class="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
					<ClockIcon class="size-3" />Première réponse
				</p>
			</div>
			<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				<p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{d.resolvedThisMonth}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">Tickets résolus</p>
				<p class="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
					<CheckCircleIcon class="size-3" />Depuis le 1er du mois
				</p>
			</div>
		</div>

		<!-- Charge par concierge -->
		{#if d.chargeParConcierge.length > 0}
			<p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Charge par concierge</p>
			<div class="relative overflow-hidden rounded-2xl border border-border bg-card"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

				{@const maxCount = Math.max(...d.chargeParConcierge.map(c => c.count), 1)}
				<div class="divide-y divide-border/50">
					{#each d.chargeParConcierge.sort((a, b) => b.count - a.count) as item (item.name)}
						<div class="flex items-center gap-4 px-5 py-3">
							<span class="w-28 shrink-0 truncate text-sm font-medium {item.isUnassigned ? 'text-amber-500' : 'text-foreground'}">
								{item.name}
							</span>
							<div class="flex flex-1 items-center gap-3">
								<div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full transition-all {item.isUnassigned ? 'bg-amber-400' : 'bg-[var(--brand)]'}"
										style="width: {Math.round((item.count / maxCount) * 100)}%"
									></div>
								</div>
								<span class="w-6 shrink-0 text-right text-sm font-bold tabular-nums {item.isUnassigned ? 'text-amber-500' : 'text-foreground'}">
									{item.count}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
