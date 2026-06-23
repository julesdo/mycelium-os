<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import { addDays, startOfDay } from 'date-fns';
	import { Check, CloudUpload, LoaderCircle } from '@lucide/svelte';
	import CalendarHeader from './CalendarHeader.svelte';
	import WeekGrid from './WeekGrid.svelte';
	import DayGrid from './DayGrid.svelte';
	import MonthGrid from './MonthGrid.svelte';
	import CreateReservationModal from './CreateReservationModal.svelte';
	import ReservationEditSheet from './ReservationEditSheet.svelte';
	import ReservationContextMenu from './ReservationContextMenu.svelte';
	import type { CalendarReservation } from './ReservationBlock.svelte';
	import type { CalendarMaintenance } from './MaintenanceBlock.svelte';
	import type { Id } from '$lib/convex/_generated/dataModel.js';
	import { getWindowStart, getColumnCount } from './utils.js';
	import type { ViewMode } from './utils.js';

	let view = $state<ViewMode>('week');
	let windowStart = $state(getWindowStart('week'));

	const columnCount = $derived(getColumnCount(view, windowStart));

	const windowEnd = $derived(addDays(windowStart, columnCount));

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehiclesQuery = useQuery((api as any).vehicles.listVehicles, {});
	// Pass a getter so convex-svelte tracks windowStart/windowEnd reactively inside its $effect.
	// keepPreviousData: true → data stays non-undefined during navigation (isLoading stays false),
	// so WeekGrid is never unmounted/replaced by the skeleton when changing weeks.
	// isStale flips to true while new data loads, used for the subtle loading indicator.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const reservQuery = useQuery(
		(api as any).reservations.listReservationsForCalendar,
		() => ({ dateFrom: windowStart.getTime(), dateTo: windowEnd.getTime() }),
		{ keepPreviousData: true }
	);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const locationsQuery = useQuery((api as any).vehicles.getFleetLocations, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const maintQuery = useQuery(
		(api as any).maintenance.listMaintenanceForCalendar,
		() => ({ dateFrom: windowStart.getTime(), dateTo: windowEnd.getTime() }),
		{ keepPreviousData: true }
	);

	const client = useConvexClient();

	// Filters
	let filterLocation = $state('');
	let filterCategory = $state('');
	let filterEnergy = $state('');
	let filterStatus = $state('');

	// Modal / sheet / context menu state
	let showCreateModal = $state(false);
	let createInitialVehicleId = $state<string | undefined>();
	let createInitialDate = $state<Date | undefined>();
	let createInitialEndDate = $state<Date | undefined>();
	let createInitialPurpose = $state<string | undefined>();
	let selectedReservation = $state<CalendarReservation | null>(null);
	let contextMenu = $state<{ reservation: CalendarReservation; x: number; y: number } | null>(null);

	// ─── Local-first state ─────────────────────────────────────────────────────
	//
	// localOverrides stores ONLY pending local changes (optimistic mutations + new creates).
	// vehicleRows reads directly from reservQuery.data merged with localOverrides via
	// $derived, so blocks appear the instant Convex responds — no async $effect needed
	// to hydrate an intermediate Map. This eliminates two bugs:
	//   1. Flash of empty grid on initial load (old $effect ran after DOM render)
	//   2. Reverts during drag/resize (old $effect overwrote localReservations when
	//      Convex subscription fired before pendingMutationIds was populated)
	let localOverrides = new SvelteMap<string, CalendarReservation>();
	let pendingMutationIds = new SvelteSet<string>();

	// Merged view: server data is the baseline; localOverrides win for pending mutations.
	const allReservations = $derived.by((): CalendarReservation[] => {
		const serverData = (reservQuery.data as CalendarReservation[] | undefined) ?? [];
		const merged = new Map<string, CalendarReservation>(serverData.map((r) => [r._id, r]));
		for (const [id, override] of localOverrides) {
			merged.set(id, override);
		}
		return Array.from(merged.values());
	});

	// Release pending locks once the server has confirmed our local change.
	$effect(() => {
		const data = reservQuery.data as CalendarReservation[] | undefined;
		if (!data) return;

		untrack(() => {
			for (const serverRes of data) {
				if (!pendingMutationIds.has(serverRes._id)) continue;
				const override = localOverrides.get(serverRes._id);
				if (!override) {
					pendingMutationIds.delete(serverRes._id);
					continue;
				}
				const synced =
					serverRes.startDate === override.startDate &&
					serverRes.endDate === override.endDate &&
					serverRes.vehicleId === override.vehicleId &&
					serverRes.status === override.status &&
					serverRes.purpose === override.purpose &&
					(serverRes.notes ?? '') === (override.notes ?? '');
				if (synced) {
					pendingMutationIds.delete(serverRes._id);
					localOverrides.delete(serverRes._id);
				}
			}
		});
	});

	// ─── Save indicator state ──────────────────────────────────────────────────
	// 'idle'   → nothing shown
	// 'saving' → spinner + "Enregistrement…"
	// 'saved'  → checkmark + "Enregistré", fades out after 2.5s
	const isSaving = $derived(pendingMutationIds.size > 0);
	let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let savedTimeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (isSaving) {
			clearTimeout(savedTimeout);
			saveStatus = 'saving';
		} else if (untrack(() => saveStatus) === 'saving') {
			saveStatus = 'saved';
			savedTimeout = setTimeout(() => {
				saveStatus = 'idle';
			}, 2500);
		}
		return () => clearTimeout(savedTimeout);
	});

	// ─── Local mutation helpers ────────────────────────────────────────────────
	function applyLocal(
		resId: string,
		patch: Partial<CalendarReservation>
	): CalendarReservation | undefined {
		const current =
			localOverrides.get(resId) ??
			(reservQuery.data as CalendarReservation[] | undefined)?.find((r) => r._id === resId);
		if (!current) return undefined;
		localOverrides.set(resId, { ...current, ...patch });
		pendingMutationIds.add(resId);
		return current;
	}

	function revertLocal(resId: string, original: CalendarReservation) {
		localOverrides.set(resId, original);
		pendingMutationIds.delete(resId);
	}

	// ─── vehicleRows: derived from merged Convex + local state ─────────────────
	const vehicleRows = $derived.by(() => {
		const vehicles = (vehiclesQuery.data ?? []).filter(
			(v: { category: string; energy: string; location: string | null }) => {
				if (filterCategory && v.category !== filterCategory) return false;
				if (filterEnergy && v.energy !== filterEnergy) return false;
				if (filterLocation && v.location !== filterLocation) return false;
				return true;
			}
		);

		const windowFrom = windowStart.getTime();
		const windowTo = windowEnd.getTime();

		const reservations = allReservations.filter((r) => {
			if (filterStatus && r.status !== filterStatus) return false;
			return r.endDate >= windowFrom && r.startDate <= windowTo;
		});

		const maintenances = (maintQuery.data as CalendarMaintenance[] | undefined) ?? [];

		return vehicles.map(
			(v: {
				_id: string;
				brand: string;
				model: string;
				registration: string;
				status: string;
				location: string | null;
				category: string;
			}) => ({
				vehicle: v,
				reservations: reservations.filter((r) => r.vehicleId === v._id),
				maintenances: maintenances.filter((m) => m.vehicleId === v._id)
			})
		);
	});

	// ─── Navigation / filter handlers ─────────────────────────────────────────
	function handleViewChange(v: ViewMode) {
		view = v;
		windowStart = getWindowStart(v);
	}

	function handleDayClick(day: Date) {
		if (view === 'month') {
			// From month overview: zoom to the week containing this day
			view = 'week';
			const d = new Date(day);
			d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
			d.setHours(0, 0, 0, 0);
			windowStart = d;
		} else {
			view = 'day';
			windowStart = startOfDay(day);
		}
	}

	function handleWindowStartChange(d: Date) {
		windowStart = d;
	}

	function handleFilterChange(key: 'location' | 'category' | 'energy' | 'status', value: string) {
		if (key === 'location') filterLocation = value;
		if (key === 'category') filterCategory = value;
		if (key === 'energy') filterEnergy = value;
		if (key === 'status') filterStatus = value;
	}

	function handleCreateSelection(vehicleId: string, startDate: Date, endDate: Date) {
		createInitialVehicleId = vehicleId;
		createInitialDate = startDate;
		createInitialEndDate = endDate;
		createInitialPurpose = undefined;
		showCreateModal = true;
	}

	function handleBlockClick(reservation: CalendarReservation) {
		selectedReservation = reservation;
	}

	function handleBlockContextMenu(x: number, y: number, reservation: CalendarReservation) {
		contextMenu = { reservation, x, y };
	}

	function handleDuplicate(res: CalendarReservation) {
		createInitialVehicleId = res.vehicleId;
		createInitialDate = new Date(res.startDate);
		createInitialEndDate = new Date(res.endDate);
		createInitialPurpose = res.purpose;
		showCreateModal = true;
	}

	// ─── Mutations — local-first ───────────────────────────────────────────────

	async function handleCancel(res: CalendarReservation) {
		const original = applyLocal(res._id, { status: 'CANCELLED' });
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.cancelReservation, {
				reservationId: res._id as Id<'reservations'>
			});
			toast.success('Réservation annulée');
		} catch (err) {
			if (original) revertLocal(res._id, original);
			toast.error(err instanceof Error ? err.message : "Erreur lors de l'annulation");
		}
	}

	async function handleMoveCommit(
		reservationId: string,
		newVehicleId: string,
		newStart: Date,
		newEnd: Date
	) {
		const original = applyLocal(reservationId, {
			vehicleId: newVehicleId,
			startDate: newStart.getTime(),
			endDate: newEnd.getTime()
		});
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.updateReservation, {
				reservationId: reservationId as Id<'reservations'>,
				vehicleId: newVehicleId as Id<'vehicles'>,
				startDate: newStart.getTime(),
				endDate: newEnd.getTime()
			});
			// Success: $effect will release pending lock once Convex data matches
		} catch (err) {
			if (original) revertLocal(reservationId, original);
			const cvxData = (err as { data?: { code?: string } }).data;
			toast.error(
				cvxData?.code === 'VEHICLE_NOT_AVAILABLE'
					? 'Conflit : ce véhicule est déjà réservé sur cette période'
					: cvxData?.code === 'MAINTENANCE_CONFLICT'
					? 'Conflit : ce véhicule est en entretien planifié sur cette période'
					: 'Erreur lors du déplacement de la réservation'
			);
		}
	}

	async function handleResizeEndCommit(reservationId: string, newEnd: Date) {
		const original = applyLocal(reservationId, { endDate: newEnd.getTime() });
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.updateReservation, {
				reservationId: reservationId as Id<'reservations'>,
				endDate: newEnd.getTime()
			});
		} catch (err) {
			if (original) revertLocal(reservationId, original);
			const cvxData = (err as { data?: { code?: string } }).data;
			toast.error(
				cvxData?.code === 'VEHICLE_NOT_AVAILABLE'
					? 'Conflit : ce véhicule est déjà réservé sur cette période'
					: cvxData?.code === 'MAINTENANCE_CONFLICT'
					? 'Conflit : ce véhicule est en entretien planifié sur cette période'
					: 'Erreur lors du redimensionnement'
			);
		}
	}

	async function handleResizeStartCommit(reservationId: string, newStart: Date) {
		const original = applyLocal(reservationId, { startDate: newStart.getTime() });
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.updateReservation, {
				reservationId: reservationId as Id<'reservations'>,
				startDate: newStart.getTime()
			});
		} catch (err) {
			if (original) revertLocal(reservationId, original);
			const cvxData = (err as { data?: { code?: string } }).data;
			toast.error(
				cvxData?.code === 'VEHICLE_NOT_AVAILABLE'
					? 'Conflit : ce véhicule est déjà réservé sur cette période'
					: cvxData?.code === 'MAINTENANCE_CONFLICT'
					? 'Conflit : ce véhicule est en entretien planifié sur cette période'
					: 'Erreur lors du redimensionnement'
			);
		}
	}

	async function handleUpdate(
		reservationId: string,
		patch: { startDate?: number; endDate?: number; purpose?: string; notes?: string }
	): Promise<'SUCCESS' | 'CONFLICT' | 'ERROR'> {
		const original = applyLocal(reservationId, patch);
		if (selectedReservation?._id === reservationId) {
			selectedReservation = { ...selectedReservation, ...patch };
		}
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.updateReservation, {
				reservationId: reservationId as Id<'reservations'>,
				...patch
			});
			return 'SUCCESS';
		} catch (err) {
			if (original) revertLocal(reservationId, original);
			if (selectedReservation?._id === reservationId) selectedReservation = original ?? null;
			const code = (err as { data?: { code?: string } }).data?.code;
			return code === 'VEHICLE_NOT_AVAILABLE' || code === 'MAINTENANCE_CONFLICT'
				? 'CONFLICT'
				: 'ERROR';
		}
	}

	async function handleCreate(
		vehicleId: string,
		startDate: number,
		endDate: number,
		purpose: string,
		notes?: string
	): Promise<'SUCCESS' | 'CONFLICT' | 'ERROR'> {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const newId = await client.mutation((api as any).reservations.createReservation, {
				vehicleId: vehicleId as Id<'vehicles'>,
				startDate,
				endDate,
				purpose,
				notes
			});
			// Ajout optimiste : le vrai ID est connu, on n'attend pas la propagation Convex
			const vehicle = (vehiclesQuery.data ?? []).find(
				(v: { _id: string }) => v._id === vehicleId
			) as
				| {
						_id: string;
						brand: string;
						model: string;
						registration: string;
						status: string;
						location: string | null;
						category: string;
						energy: string;
				  }
				| undefined;
			if (vehicle && newId) {
				const id = newId as string;
				localOverrides.set(id, {
					_id: id,
					organizationId: '',
					vehicleId,
					userId: '',
					startDate,
					endDate,
					purpose,
					notes,
					status: 'PENDING',
					createdAt: Date.now(),
					updatedAt: Date.now(),
					brand: vehicle.brand,
					model: vehicle.model,
					registration: vehicle.registration,
					vehicleStatus: vehicle.status,
					location: vehicle.location ?? null,
					category: vehicle.category,
					energy: vehicle.energy
				});
				pendingMutationIds.add(id);
			}
			return 'SUCCESS';
		} catch (err) {
			const code = (err as { data?: { code?: string } }).data?.code;
			return code === 'VEHICLE_NOT_AVAILABLE' || code === 'MAINTENANCE_CONFLICT'
				? 'CONFLICT'
				: 'ERROR';
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-start justify-between gap-2">
		<CalendarHeader
			{view}
			{windowStart}
			locations={locationsQuery.data ?? []}
			onViewChange={handleViewChange}
			onWindowStartChange={handleWindowStartChange}
			{filterLocation}
			{filterCategory}
			{filterEnergy}
			{filterStatus}
			onFilterChange={handleFilterChange}
		/>

		<!-- Discrete status indicator: saving / saved / loading new week -->
		<div class="flex h-9 shrink-0 items-center">
			{#if saveStatus === 'saving'}
				<div
					class="flex items-center gap-1.5 text-xs text-muted-foreground"
					transition:fade={{ duration: 150 }}
				>
					<CloudUpload size={13} class="animate-pulse" />
					<span>Enregistrement…</span>
				</div>
			{:else if saveStatus === 'saved'}
				<div
					class="flex items-center gap-1.5 text-xs text-muted-foreground"
					transition:fade={{ duration: 200 }}
				>
					<Check size={13} />
					<span>Enregistré</span>
				</div>
			{:else if reservQuery.isStale}
				<div
					class="flex items-center gap-1.5 text-xs text-muted-foreground"
					transition:fade={{ duration: 150 }}
				>
					<LoaderCircle size={13} class="animate-spin" />
					<span>Chargement…</span>
				</div>
			{/if}
		</div>
	</div>

	{#if vehiclesQuery.isLoading || reservQuery.isLoading}
		<div class="overflow-hidden rounded-md border border-border">
			{#each Array(5) as _, i (i)}
				<div class="flex h-12 items-center gap-3 border-b border-border px-4 last:border-0">
					<div class="h-3 w-32 animate-pulse rounded bg-muted"></div>
					<div class="h-3 flex-1 animate-pulse rounded bg-muted"></div>
				</div>
			{/each}
		</div>
	{:else if view === 'day'}
		<DayGrid
			{vehicleRows}
			dayStart={windowStart}
			onBlockClick={handleBlockClick}
			onBlockContextMenu={handleBlockContextMenu}
			onCreateSelection={handleCreateSelection}
			onMoveCommit={handleMoveCommit}
			onResizeEndCommit={handleResizeEndCommit}
			onResizeStartCommit={handleResizeStartCommit}
		/>
	{:else if view === 'month'}
		<MonthGrid
			{vehicleRows}
			monthStart={windowStart}
			onDayClick={handleDayClick}
			onBlockClick={handleBlockClick}
		/>
	{:else}
		<WeekGrid
			{vehicleRows}
			{windowStart}
			{columnCount}
			onBlockClick={handleBlockClick}
			onBlockContextMenu={handleBlockContextMenu}
			onCreateSelection={handleCreateSelection}
			onMoveCommit={handleMoveCommit}
			onResizeEndCommit={handleResizeEndCommit}
			onResizeStartCommit={handleResizeStartCommit}
			onDayClick={handleDayClick}
		/>
	{/if}
</div>

<CreateReservationModal
	bind:open={showCreateModal}
	vehicles={vehiclesQuery.data ?? []}
	reservations={allReservations}
	maintenances={(maintQuery.data as CalendarMaintenance[] | undefined) ?? []}
	initialVehicleId={createInitialVehicleId}
	initialDate={createInitialDate}
	initialEndDate={createInitialEndDate}
	initialPurpose={createInitialPurpose}
	onCreated={handleCreate}
	onClose={() => {
		showCreateModal = false;
		createInitialVehicleId = undefined;
		createInitialDate = undefined;
		createInitialEndDate = undefined;
		createInitialPurpose = undefined;
	}}
/>

<ReservationEditSheet
	bind:reservation={selectedReservation}
	reservations={allReservations}
	onUpdate={handleUpdate}
	onCancel={async (res) => {
		await handleCancel(res);
		selectedReservation = null;
	}}
	onClose={() => (selectedReservation = null)}
/>

<ReservationContextMenu
	reservation={contextMenu?.reservation ?? null}
	x={contextMenu?.x ?? 0}
	y={contextMenu?.y ?? 0}
	onEdit={(res) => {
		selectedReservation = res;
	}}
	onDuplicate={handleDuplicate}
	onCancel={handleCancel}
	onClose={() => {
		contextMenu = null;
	}}
/>
