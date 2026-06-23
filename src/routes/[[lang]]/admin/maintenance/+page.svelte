<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import MaintenanceFilters from '$lib/components/maintenance/MaintenanceFilters.svelte';
	import MaintenanceCard from '$lib/components/maintenance/MaintenanceCard.svelte';
	import MaintenanceCalendar from '$lib/components/maintenance/MaintenanceCalendar.svelte';
	import ScheduleMaintenanceModal from '$lib/components/maintenance/ScheduleMaintenanceModal.svelte';
	import type { MaintenanceType } from '$lib/components/maintenance/types.js';
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import LayoutListIcon from '@lucide/svelte/icons/layout-list';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';

	type ViewMode = 'list' | 'calendar';
	type TabValue = 'scheduled' | 'in_progress' | 'history';

	const lang = $derived(page.params.lang as string | undefined);

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	let activeTab = $state<TabValue>('scheduled');
	let viewMode = $state<ViewMode>('list');
	let showScheduleModal = $state(false);

	// ── Convex queries ─────────────────────────────────────────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const allQuery = useQuery((api as any).maintenance.listMaintenanceWithDetails, {});
	const allRecords = $derived(allQuery.data ?? []);
	const isLoading = $derived(allQuery.isLoading);

	// ── Filters ────────────────────────────────────────────────────────────────
	let search = $state('');
	let debouncedSearch = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let selectedTypes = $state<Set<MaintenanceType>>(new Set());
	let garageFilter = $state('');
	let vehicleFilter = $state('');

	function handleSearchChange(v: string) {
		search = v;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			debouncedSearch = v.trim().toLowerCase();
		}, 300);
	}

	function toggleType(t: MaintenanceType) {
		const next = new Set(selectedTypes);
		if (next.has(t)) next.delete(t);
		else next.add(t);
		selectedTypes = next;
	}

	function clearFilters() {
		selectedTypes = new Set();
		garageFilter = '';
		vehicleFilter = '';
		search = '';
		debouncedSearch = '';
	}

	// ── Derived slices ─────────────────────────────────────────────────────────
	const scheduled = $derived(allRecords.filter((r: { status: string }) => r.status === 'SCHEDULED'));
	const inProgress = $derived(allRecords.filter((r: { status: string }) => r.status === 'IN_PROGRESS'));
	const history = $derived(
		allRecords.filter((r: { status: string }) => r.status === 'COMPLETED' || r.status === 'CANCELLED')
	);

	function applyFilters(records: typeof allRecords): typeof allRecords {
		return records.filter((r: { maintenanceType: string; garageName: string | null; vehicleRegistration: string; vehicleBrand: string; vehicleModel: string }) => {
			if (selectedTypes.size > 0 && !selectedTypes.has(r.maintenanceType as MaintenanceType)) return false;
			if (garageFilter && !(r.garageName ?? '').toLowerCase().includes(garageFilter.toLowerCase())) return false;
			if (vehicleFilter && !r.vehicleRegistration.toLowerCase().includes(vehicleFilter.toLowerCase())) return false;
			if (debouncedSearch) {
				const q = debouncedSearch;
				const match =
					r.vehicleRegistration.toLowerCase().includes(q) ||
					r.vehicleBrand.toLowerCase().includes(q) ||
					r.vehicleModel.toLowerCase().includes(q) ||
					(r.garageName ?? '').toLowerCase().includes(q);
				if (!match) return false;
			}
			return true;
		});
	}

	const filteredScheduled = $derived(applyFilters(scheduled));
	const filteredInProgress = $derived(applyFilters(inProgress));
	const filteredHistory = $derived(applyFilters(history));

	const activeRecords = $derived(
		activeTab === 'scheduled'
			? filteredScheduled
			: activeTab === 'in_progress'
				? filteredInProgress
				: filteredHistory
	);

	// ── Calendar adapter ───────────────────────────────────────────────────────
	const calendarRecords = $derived(
		applyFilters(allRecords).map((r: { _id: string; vehicleRegistration: string; vehicleBrand: string; vehicleModel: string; maintenanceType: string; scheduledDate: number; garageName: string | null; costEstimate: number | null; status: string; notes?: string }) => ({
			id: r._id,
			vehicleRegistration: r.vehicleRegistration,
			vehicleBrand: r.vehicleBrand,
			vehicleModel: r.vehicleModel,
			type: r.maintenanceType as MaintenanceType,
			scheduledDate: new Date(r.scheduledDate).toISOString().slice(0, 10),
			garage: r.garageName ?? 'Non assigné',
			costEstimate: r.costEstimate ?? 0,
			status: r.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
			notes: r.notes
		}))
	);

	// ── Card adapter ───────────────────────────────────────────────────────────
	function toCardRecord(r: typeof allRecords[number]) {
		return {
			id: r._id,
			vehicleRegistration: r.vehicleRegistration,
			vehicleBrand: r.vehicleBrand,
			vehicleModel: r.vehicleModel,
			type: r.maintenanceType as MaintenanceType,
			scheduledDate: new Date(r.scheduledDate).toISOString().slice(0, 10),
			garage: r.garageName ?? 'Non assigné',
			costEstimate: r.costEstimate ?? 0,
			status: r.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
			notes: r.notes
		};
	}

	function handleViewDetails(id: string) {
		goto(resolve(localHref(`/admin/maintenance/${id}`)));
	}

	function handleMarkCompleted(_id: string) {
		goto(resolve(localHref(`/admin/maintenance/${_id}`)));
	}

	function handleCancel(_id: string) {
		goto(resolve(localHref(`/admin/maintenance/${_id}`)));
	}
</script>

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8 2xl:px-16">
	<!-- Header -->
	<div class="flex items-center justify-between gap-4">
		<div>
			<div class="flex items-center gap-2">
				<h1 class="text-base font-semibold">Maintenance</h1>
				{#if !isLoading && allRecords.length > 0}
					<span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">{allRecords.length}</span>
				{/if}
			</div>
		</div>
		<Button size="sm" onclick={() => (showScheduleModal = true)}>
			<PlusIcon class="size-4" />
			Planifier un entretien
		</Button>
	</div>

	<!-- Tabs + view toggle -->
	<div class="flex flex-wrap items-end justify-between gap-3">
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List variant="line">
				<Tabs.Trigger value="scheduled">
					Planifiés
					{#if scheduled.length > 0}
						<Badge variant="ghost" class="ml-1 px-1.5 py-0">{scheduled.length}</Badge>
					{/if}
				</Tabs.Trigger>
				<Tabs.Trigger value="in_progress">
					En cours
					{#if inProgress.length > 0}
						<Badge variant="warning" class="ml-1 px-1.5 py-0">{inProgress.length}</Badge>
					{/if}
				</Tabs.Trigger>
				<Tabs.Trigger value="history">Historique</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>

		<!-- View toggle -->
		<div class="flex items-center gap-0.5 rounded-xl bg-muted/60 p-1">
			<Button
				variant={viewMode === 'list' ? 'outline' : 'ghost'}
				size="sm"
				onclick={() => (viewMode = 'list')}
				aria-pressed={viewMode === 'list'}
			>
				<LayoutListIcon class="size-4" />
				Liste
			</Button>
			<Button
				variant={viewMode === 'calendar' ? 'outline' : 'ghost'}
				size="sm"
				onclick={() => (viewMode = 'calendar')}
				aria-pressed={viewMode === 'calendar'}
			>
				<CalendarDaysIcon class="size-4" />
				Calendrier
			</Button>
		</div>
	</div>

	<!-- Filters (list mode only) -->
	{#if viewMode === 'list'}
		<MaintenanceFilters
			{search}
			{selectedTypes}
			{garageFilter}
			{vehicleFilter}
			onSearchChange={handleSearchChange}
			onTypeToggle={toggleType}
			onGarageChange={(v) => (garageFilter = v)}
			onVehicleChange={(v) => (vehicleFilter = v)}
			onClear={clearFilters}
		/>
	{/if}

	<!-- Loading skeleton -->
	{#if isLoading}
		<div class="flex flex-col gap-3">
			{#each Array(4) as _, i (i)}
				<div class="flex h-20 items-center gap-4 rounded-lg border border-border px-4">
					<Skeleton class="size-9 rounded-full" />
					<div class="flex flex-1 flex-col gap-2">
						<Skeleton class="h-3.5 w-48" />
						<Skeleton class="h-3 w-64" />
					</div>
					<Skeleton class="h-5 w-16 rounded-full" />
				</div>
			{/each}
		</div>

	<!-- Views -->
	{:else if viewMode === 'calendar'}
		<MaintenanceCalendar records={calendarRecords} onViewDetails={handleViewDetails} />
	{:else}
		{#if activeRecords.length === 0}
			<EmptyState
				title={activeTab === 'scheduled'
					? 'Aucun entretien planifié'
					: activeTab === 'in_progress'
						? 'Aucun entretien en cours'
						: 'Aucun historique'}
				description={activeTab === 'scheduled'
					? 'Planifiez un entretien pour le voir apparaître ici.'
					: activeTab === 'in_progress'
						? 'Les entretiens en cours apparaîtront ici.'
						: 'Les entretiens terminés et annulés apparaîtront ici.'}
			>
				{#snippet icon()}<WrenchIcon class="size-12" />{/snippet}
				{#snippet action()}
					{#if activeTab === 'scheduled'}
						<Button onclick={() => (showScheduleModal = true)} class="gap-1.5">
							<PlusIcon class="size-4" />
							Planifier un entretien
						</Button>
					{/if}
				{/snippet}
			</EmptyState>
		{:else}
			<div class="flex flex-col gap-2">
				{#each activeRecords as record (record._id)}
					<MaintenanceCard
						record={toCardRecord(record)}
						onViewDetails={handleViewDetails}
						onMarkCompleted={handleMarkCompleted}
						onCancel={handleCancel}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<ScheduleMaintenanceModal
	bind:open={showScheduleModal}
	onClose={() => (showScheduleModal = false)}
	onSuccess={() => toast.success('Entretien planifié !')}
/>
