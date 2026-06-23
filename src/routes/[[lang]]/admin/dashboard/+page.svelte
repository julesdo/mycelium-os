<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import KPICard from '$lib/components/dashboard/KPICard.svelte';
	import UsageChart from '$lib/components/dashboard/UsageChart.svelte';
	import StatusDonut from '$lib/components/dashboard/StatusDonut.svelte';
	import AttentionList from '$lib/components/dashboard/AttentionList.svelte';
	import ActivityFeed from '$lib/components/dashboard/ActivityFeed.svelte';
	import DashboardFilters, { type Period } from '$lib/components/dashboard/DashboardFilters.svelte';
	import FleetSiteCard from '$lib/components/dashboard/FleetSiteCard.svelte';
	import CarIcon from '@lucide/svelte/icons/car';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import ZapIcon from '@lucide/svelte/icons/zap';

	function readPeriod(): Period {
		const p = page.url.searchParams.get('period');
		if (p === '7d' || p === '30d' || p === '90d' || p === '12m' || p === 'custom') return p;
		return '30d';
	}

	function readSites(): string[] {
		const s = page.url.searchParams.get('sites');
		return s ? s.split(',').filter(Boolean) : [];
	}

	function periodToDays(p: Period, from: string, to: string): number {
		if (p === '7d') return 7;
		if (p === '30d') return 30;
		if (p === '90d') return 90;
		if (p === '12m') return 365;
		if (p === 'custom' && from && to)
			return Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
		return 30;
	}

	function updateURL(p: Period, sites: string[], from: string, to: string) {
		const url = new URL(page.url);
		url.searchParams.set('period', p);
		sites.length > 0 ? url.searchParams.set('sites', sites.join(',')) : url.searchParams.delete('sites');
		p === 'custom' && from ? url.searchParams.set('from', from) : url.searchParams.delete('from');
		p === 'custom' && to ? url.searchParams.set('to', to) : url.searchParams.delete('to');
		goto(resolve(url.pathname + url.search), { noScroll: true, replaceState: true });
	}

	let period = $state<Period>(readPeriod());
	let selectedSites = $state<string[]>(readSites());
	let customFrom = $state(page.url.searchParams.get('from') ?? '');
	let customTo = $state(page.url.searchParams.get('to') ?? '');

	$effect(() => {
		period = readPeriod();
		selectedSites = readSites();
		customFrom = page.url.searchParams.get('from') ?? '';
		customTo = page.url.searchParams.get('to') ?? '';
	});

	const statsArgs = $state<{ sites?: string[] }>({});
	const usageArgs = $state<{ days?: number; sites?: string[] }>({ days: 30 });
	const attentionArgs = $state<{ sites?: string[] }>({});

	$effect(() => {
		const sites = selectedSites.length > 0 ? selectedSites : undefined;
		const d = periodToDays(period, customFrom, customTo);
		statsArgs.sites = sites;
		usageArgs.days = d;
		usageArgs.sites = sites;
		attentionArgs.sites = sites;
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fleetStats      = useQuery((api as any).dashboard.getFleetStats,       statsArgs);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const usageData       = useQuery((api as any).dashboard.getUsageOverTime,    usageArgs);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const attentionData   = useQuery((api as any).dashboard.getAttentionNeeded,  attentionArgs);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const availableSitesQ = useQuery((api as any).dashboard.getAvailableSites,   {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const orgData         = useQuery((api as any).organizations.getMyOrg,        {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const activityData    = useQuery((api as any).dashboard.getRecentActivity,   {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const siteDistData    = useQuery((api as any).dashboard.getSiteDistribution, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehicleLocData  = useQuery((api as any).dashboard.getVehicleLocations, {});

	const stats          = $derived(fleetStats.data ?? { total: 0, available: 0, inUse: 0, maintenance: 0, retired: 0 });
	const isLoading      = $derived(fleetStats.isLoading);
	const availableSites = $derived(availableSitesQ.data ?? []);
	const usageRate      = $derived(stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0);

	function handlePeriodChange(p: Period) { period = p; updateURL(p, selectedSites, customFrom, customTo); }
	function handleCustomRangeChange(from: string, to: string) { customFrom = from; customTo = to; updateURL(period, selectedSites, from, to); }
	function handleSitesChange(sites: string[]) { selectedSites = sites; updateURL(period, sites, customFrom, customTo); }

	const chartLabel = $derived(() => {
		if (period === '7d') return 'Réservations · 7 jours';
		if (period === '30d') return 'Réservations · 30 jours';
		if (period === '90d') return 'Réservations · 90 jours';
		if (period === '12m') return 'Réservations · 12 mois';
		if (period === 'custom' && customFrom && customTo) {
			const f = new Date(customFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
			const t = new Date(customTo).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
			return `Réservations · ${f} → ${t}`;
		}
		return 'Réservations';
	});
</script>

<SEOHead title="Dashboard — Mycelium Fleet" description="Vue d'ensemble de votre flotte" />

<div class="flex flex-col gap-4 px-4 pb-8 pt-1 lg:px-6">

	<!-- Compact header: org + dispo badge + filters -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			{#if orgData.data?.name}
				<span class="text-sm font-semibold text-foreground">{orgData.data.name}</span>
				<span class="text-border">·</span>
			{/if}
			{#if !isLoading && stats.total > 0}
				<Badge variant="default" class="bg-[var(--brand)] text-[var(--brand-foreground)] shadow-glass-brand">
					<span class="size-1.5 rounded-full bg-[var(--brand-foreground)]/70"></span>
					{usageRate}% disponible
				</Badge>
			{/if}
		</div>
		<DashboardFilters
			{period} {customFrom} {customTo} {selectedSites} {availableSites}
			onPeriodChange={handlePeriodChange}
			onCustomRangeChange={handleCustomRangeChange}
			onSitesChange={handleSitesChange}
		/>
	</div>

	<!-- KPI cards — 4 égales -->
	<div class="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
		<div style="--enter-delay: 0ms" class="animate-enter-blur-up">
			<KPICard
				label="Disponibles"
				value={stats.available}
				loading={isLoading}
				variant="accent"
				description="{usageRate}% de la flotte"
				href="./fleet"
				class="h-full"
			/>
		</div>
		<div style="--enter-delay: 50ms" class="animate-enter-blur-up">
			<KPICard label="Total flotte" value={stats.total} loading={isLoading} href="./fleet" class="h-full" />
		</div>
		<div style="--enter-delay: 90ms" class="animate-enter-blur-up">
			<KPICard label="En utilisation" value={stats.inUse} loading={isLoading} href="./fleet" class="h-full" />
		</div>
		<div style="--enter-delay: 130ms" class="animate-enter-blur-up">
			<KPICard label="Maintenance" value={stats.maintenance} loading={isLoading} href="./fleet" class="h-full" />
		</div>
	</div>

	<!-- Charts row -->
	<div class="grid grid-cols-1 gap-3 @4xl/main:grid-cols-12">

		<!-- Usage chart — fond normal -->
		<div class="relative overflow-hidden rounded-2xl bg-card px-5 py-4 @4xl/main:col-span-8" data-slot="card">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/8"></div>
			<div class="mb-4 flex items-center justify-between gap-3">
				<div>
					<h2 class="text-sm font-semibold text-foreground">{chartLabel()}</h2>
					<p class="text-xs text-muted-foreground">Réservations confirmées</p>
				</div>
				{#if usageData.data}
					{@const total = usageData.data.reduce((s, d) => s + d.count, 0)}
					<div class="flex items-baseline gap-1">
						<span class="text-2xl font-bold tabular-nums text-foreground">{total}</span>
						<span class="text-xs text-muted-foreground">total</span>
					</div>
				{/if}
			</div>
			{#if usageData.data}
				<UsageChart data={usageData.data} />
			{:else}
				<div class="h-[180px] animate-pulse rounded-xl bg-muted"></div>
			{/if}
		</div>

		<!-- Status gauge -->
		<div class="relative overflow-hidden rounded-2xl bg-card px-5 py-4 @4xl/main:col-span-4" data-slot="card">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/8"></div>
			<h2 class="mb-0.5 text-sm font-semibold text-foreground">Répartition flotte</h2>
			<p class="mb-4 text-xs text-muted-foreground">Statut actuel</p>
			{#if !isLoading}
				<StatusDonut
					available={stats.available}
					inUse={stats.inUse}
					maintenance={stats.maintenance}
					retired={stats.retired}
				/>
			{:else}
				<div class="flex flex-col gap-3">
					<div class="mx-auto h-24 w-48 animate-pulse rounded-full bg-muted"></div>
					{#each Array(4) as _, i (i)}
						<div class="h-5 animate-pulse rounded-md bg-muted"></div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Site map card — full width -->
	<div class="animate-enter-blur-up" style="--enter-delay: 170ms">
		<FleetSiteCard
			vehicles={vehicleLocData.data ?? []}
			sites={siteDistData.data ?? []}
			loading={siteDistData.isLoading || vehicleLocData.isLoading}
			href="./fleet"
		/>
	</div>

	<!-- Bottom row -->
	<div class="grid grid-cols-1 gap-3 @4xl/main:grid-cols-2">

		<!-- Attention -->
		<div class="relative overflow-hidden rounded-2xl bg-card px-5 py-4" data-slot="card">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/8"></div>
			<div class="mb-3 flex items-center justify-between">
				<div>
					<h2 class="text-sm font-semibold text-foreground">Attention requise</h2>
					<p class="text-xs text-muted-foreground">Véhicules à traiter</p>
				</div>
				{#if attentionData.data}
					{@const n = attentionData.data.leaseEndingSoon.length + attentionData.data.maintenanceDue.length}
					{#if n > 0}
						<Badge variant="destructive" class="px-1.5 py-0">{n}</Badge>
					{/if}
				{/if}
			</div>
			{#if attentionData.data}
				<AttentionList leaseEndingSoon={attentionData.data.leaseEndingSoon} maintenanceDue={attentionData.data.maintenanceDue} />
			{:else}
				<div class="flex flex-col gap-2">
					{#each Array(3) as _, i (i)}
						<div class="h-9 animate-pulse rounded-lg bg-muted"></div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Activité -->
		<div class="relative overflow-hidden rounded-2xl bg-card px-5 py-4" data-slot="card">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/8"></div>
			<h2 class="mb-0.5 text-sm font-semibold text-foreground">Activité récente</h2>
			<p class="mb-3 text-xs text-muted-foreground">Dernières actions sur la flotte</p>
			{#if activityData.data}
				<ActivityFeed activities={activityData.data} />
			{:else}
				<div class="flex flex-col gap-2">
					{#each Array(4) as _, i (i)}
						<div class="h-9 animate-pulse rounded-lg bg-muted"></div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
