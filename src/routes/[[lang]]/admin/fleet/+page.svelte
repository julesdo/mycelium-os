<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import VehicleTable from '$lib/components/fleet/VehicleTable.svelte';
	import VehicleFilters from '$lib/components/fleet/VehicleFilters.svelte';
	import ImportFleetModal from '$lib/components/fleet/ImportFleetModal.svelte';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import { cn } from '$lib/utils.js';
	import CarIcon from '@lucide/svelte/icons/car';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import PlusIcon from '@lucide/svelte/icons/plus';

	type Status = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
	type Energy = 'THERMAL' | 'HYBRID' | 'ELECTRIC';

	const lang = $derived(page.params.lang as string | undefined);

	function goToNew() {
		const path = lang ? `/${lang}/admin/fleet/new` : '/admin/fleet/new';
		goto(resolve(path));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehiclesQuery = useQuery((api as any).vehicles.listVehicles, {});

	let showImportModal = $state(false);

	// Status tab filter (null = tous)
	let activeStatus = $state<Status | null>(null);

	// Secondary filters
	let search = $state('');
	let debouncedSearch = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let selectedEnergies = $state<Set<Energy>>(new Set());
	let locationFilter = $state('');

	function handleSearchChange(v: string) {
		search = v;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			debouncedSearch = v.trim().toLowerCase();
		}, 300);
	}

	function toggleEnergy(e: Energy) {
		const next = new Set(selectedEnergies);
		if (next.has(e)) next.delete(e);
		else next.add(e);
		selectedEnergies = next;
	}

	function clearFilters() {
		activeStatus = null;
		selectedEnergies = new Set();
		locationFilter = '';
		search = '';
		debouncedSearch = '';
	}

	// KPI stats — calculées localement depuis la liste complète
	const stats = $derived.by(() => {
		const vehicles = vehiclesQuery.data ?? [];
		const total = vehicles.length;
		const available = vehicles.filter((v: { status: Status }) => v.status === 'AVAILABLE').length;
		const inUse = vehicles.filter((v: { status: Status }) => v.status === 'IN_USE').length;
		const maintenance = vehicles.filter(
			(v: { status: Status }) => v.status === 'MAINTENANCE'
		).length;
		const retired = vehicles.filter((v: { status: Status }) => v.status === 'RETIRED').length;
		const availablePct = total > 0 ? Math.round((available / total) * 100) : 0;
		return { total, available, inUse, maintenance, retired, availablePct };
	});

	const statusTabs = $derived([
		{ value: null as Status | null, label: 'Tous', count: stats.total },
		{ value: 'AVAILABLE' as Status, label: 'Disponibles', count: stats.available },
		{ value: 'IN_USE' as Status, label: 'En cours', count: stats.inUse },
		{ value: 'MAINTENANCE' as Status, label: 'Maintenance', count: stats.maintenance },
		{ value: 'RETIRED' as Status, label: 'Retirés', count: stats.retired }
	]);

	const filtered = $derived.by(() => {
		const vehicles = vehiclesQuery.data ?? [];
		return vehicles.filter(
			(v: {
				registration: string;
				brand: string;
				model: string;
				status: Status;
				energy: Energy;
				location?: string;
			}) => {
				if (activeStatus && v.status !== activeStatus) return false;
				if (selectedEnergies.size > 0 && !selectedEnergies.has(v.energy)) return false;
				if (locationFilter) {
					const loc = (v.location ?? '').toLowerCase();
					if (!loc.includes(locationFilter.toLowerCase())) return false;
				}
				if (debouncedSearch) {
					const q = debouncedSearch;
					if (
						!v.registration.toLowerCase().includes(q) &&
						!v.model.toLowerCase().includes(q) &&
						!v.brand.toLowerCase().includes(q)
					)
						return false;
				}
				return true;
			}
		);
	});

	const isEmpty = $derived(!vehiclesQuery.isLoading && (vehiclesQuery.data?.length ?? 0) === 0);
	const isLoading = $derived(vehiclesQuery.isLoading);
</script>

<!--
	fullControl mode: ce composant gère lui-même sa hauteur.
	h-full remplit exactement le conteneur (100svh - topbar 62px).
-->
<div class="flex h-full flex-col px-4 pt-5 md:pt-7 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header (toujours visible) -->
	<div class="mb-6 flex shrink-0 items-start justify-between">
		<div>
			<h1 class="text-base font-semibold tracking-tight">Flotte</h1>
			{#if !isLoading && !isEmpty}
				<p class="mt-0.5 text-[13px] text-muted-foreground">
					{stats.total} véhicule{stats.total > 1 ? 's' : ''} enregistrés
				</p>
			{/if}
		</div>
		{#if !isEmpty || isLoading}
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (showImportModal = true)}
					data-testid="btn-import-csv"
				>
					<UploadIcon class="size-4" />
					Importer CSV
				</Button>
				<Button size="sm" onclick={goToNew}>
					<PlusIcon class="size-4" />
					Ajouter
				</Button>
			</div>
		{/if}
	</div>

	{#if isLoading}
		<!-- Skeleton -->
		<div class="flex flex-col gap-6">
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{#each Array(4) as _, i (i)}
					<Skeleton class="h-[88px] w-full rounded-2xl" />
				{/each}
			</div>
			<div class="flex flex-col gap-3">
				<Skeleton class="h-10 w-full rounded-xl" />
				<div class="overflow-hidden rounded-2xl border border-border">
					<div class="divide-y divide-border">
						{#each Array(7) as _, i (i)}
							<div class="flex h-12 items-center gap-4 px-4">
								<Skeleton class="h-3.5 w-24" />
								<Skeleton class="h-3.5 w-40" />
								<Skeleton class="h-3.5 w-16" />
								<Skeleton class="ml-auto h-3.5 w-20" />
								<Skeleton class="h-5 w-16 rounded-full" />
								<Skeleton class="h-3.5 w-20" />
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

	{:else if isEmpty}
		<!-- Empty state centré dans l'espace restant -->
		<div class="flex flex-1 items-center justify-center">
			<EmptyState
				title="Votre flotte est vide"
				description="Importez vos véhicules depuis un fichier CSV ou ajoutez-les manuellement pour commencer."
			>
				{#snippet icon()}<CarIcon class="size-12" />{/snippet}
				{#snippet action()}
					<div class="flex flex-col items-center gap-2 sm:flex-row">
						<Button class="gap-2" onclick={() => (showImportModal = true)} data-testid="btn-import-csv">
							<UploadIcon class="size-4" />
							Importer un CSV
						</Button>
						<Button variant="outline" class="gap-2" onclick={goToNew}>
							<PlusIcon class="size-4" />
							Ajouter manuellement
						</Button>
					</div>
				{/snippet}
			</EmptyState>
		</div>

	{:else}
		<!-- KPI Cards (hauteur fixe) -->
		<div class="mb-6 grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
			<MetricCard label="Total flotte" value={stats.total} variant="accent" />
			<MetricCard
				label="Disponibles"
				value={stats.available}
				description="{stats.availablePct}% de disponibilité"
			/>
			<MetricCard
				label="En cours"
				value={stats.inUse}
				description={stats.inUse > 0
					? `${stats.inUse} réservation${stats.inUse > 1 ? 's' : ''} active${stats.inUse > 1 ? 's' : ''}`
					: 'Aucune réservation'}
			/>
			<MetricCard
				label="Maintenance"
				value={stats.maintenance}
				description={stats.maintenance > 0 ? 'Nécessitent attention' : 'Aucun incident'}
			/>
		</div>

		<!-- Onglets + Filtres (hauteur fixe) -->
		<div class="mb-4 flex shrink-0 flex-wrap items-center gap-2">
			<!-- Status tabs -->
			<div class="flex shrink-0 items-center gap-0.5 rounded-xl bg-muted/60 p-1">
				{#each statusTabs as tab (tab.label)}
					<button
						type="button"
						class={cn(
							'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
							activeStatus === tab.value
								? 'bg-card text-foreground shadow-sm ring-1 ring-black/5 dark:bg-muted dark:ring-white/8'
								: 'text-muted-foreground hover:text-foreground'
						)}
						onclick={() => (activeStatus = tab.value)}
					>
						{tab.label}
						<span
							class={cn(
								'tabular-nums rounded-full px-1.5 text-[10px] font-semibold',
								activeStatus === tab.value ? 'text-muted-foreground' : 'text-muted-foreground/50'
							)}
						>
							{tab.count}
						</span>
					</button>
				{/each}
			</div>

			<div class="h-5 w-px shrink-0 bg-border/60"></div>

			<VehicleFilters
				{search}
				{selectedEnergies}
				location={locationFilter}
				onSearchChange={handleSearchChange}
				onEnergyToggle={toggleEnergy}
				onLocationChange={(v) => (locationFilter = v)}
				onClear={clearFilters}
			/>
		</div>

		<!-- Zone table : flex-1 pour remplir tout l'espace restant jusqu'en bas -->
		{#if filtered.length === 0}
			<div class="flex flex-1 items-center justify-center">
				<EmptyState title="Aucun véhicule ne correspond aux filtres">
					{#snippet action()}
						<Button variant="ghost" size="sm" onclick={clearFilters}>
							Réinitialiser les filtres
						</Button>
					{/snippet}
				</EmptyState>
			</div>
		{:else}
			<div class="min-h-0 flex-1">
				<VehicleTable vehicles={filtered} {lang} />
			</div>
		{/if}
	{/if}
</div>

<ImportFleetModal
	bind:open={showImportModal}
	onSuccess={() => {
		/* Convex re-souscrit automatiquement */
	}}
/>
