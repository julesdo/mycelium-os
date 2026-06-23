<script lang="ts">
	import { addDays, getDaysInMonth, startOfMonth, getDay, format, isToday, isSameMonth } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import type { CalendarReservation } from './ReservationBlock.svelte';
	import type { CalendarMaintenance } from './MaintenanceBlock.svelte';
	import WrenchIcon from '@lucide/svelte/icons/wrench';

	const STATUS_DOT: Record<string, string> = {
		PENDING: 'bg-amber-400',
		CONFIRMED: 'bg-blue-500',
		IN_PROGRESS: 'bg-violet-500',
		COMPLETED: 'bg-emerald-500',
		CANCELLED: 'bg-muted-foreground/30'
	};

	const STATUS_PILL: Record<string, string> = {
		PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
		CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-300',
		IN_PROGRESS: 'bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300',
		COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
		CANCELLED: 'bg-muted text-muted-foreground'
	};

	type Vehicle = {
		_id: string;
		brand: string;
		model: string;
		registration: string;
		status: string;
		location: string | null;
		category: string;
	};

	type VehicleRow = { vehicle: Vehicle; reservations: CalendarReservation[]; maintenances: CalendarMaintenance[] };

	type Props = {
		vehicleRows: VehicleRow[];
		monthStart: Date;
		onDayClick: (day: Date) => void;
		onBlockClick: (reservation: CalendarReservation) => void;
	};

	let { vehicleRows, monthStart, onDayClick, onBlockClick }: Props = $props();

	const allReservations = $derived(vehicleRows.flatMap(({ reservations }) => reservations));
	const allMaintenances = $derived(vehicleRows.flatMap(({ maintenances }) => maintenances));

	const calendarDays = $derived.by(() => {
		const firstDay = startOfMonth(monthStart);
		const startOffset = (getDay(firstDay) + 6) % 7;
		const totalDays = getDaysInMonth(monthStart);
		const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;
		return Array.from({ length: totalCells }, (_, i) => addDays(firstDay, i - startOffset));
	});

	const weeks = $derived.by(() => {
		const result: Date[][] = [];
		for (let i = 0; i < calendarDays.length; i += 7) {
			result.push(calendarDays.slice(i, i + 7));
		}
		return result;
	});

	const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
	const MAX_PILLS = 3;

	function getReservationsForDay(day: Date): CalendarReservation[] {
		const dayStart = day.getTime();
		const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
		return allReservations.filter(
			(r) => r.status !== 'CANCELLED' && r.startDate <= dayEnd && r.endDate >= dayStart
		);
	}

	function getMaintenancesForDay(day: Date): CalendarMaintenance[] {
		const dayMs = 24 * 60 * 60 * 1000;
		const dayTs = day.getTime();
		return allMaintenances.filter((m) => {
			const mDayStart = Math.floor(m.scheduledDate / dayMs) * dayMs;
			return mDayStart <= dayTs && mDayStart + dayMs > dayTs;
		});
	}
</script>

<div class="overflow-hidden rounded-md border border-border">
	<!-- Day of week header -->
	<div class="grid grid-cols-7 border-b border-border bg-muted/30">
		{#each DAY_LABELS as label (label)}
			<div class="py-2 text-center text-xs font-medium text-muted-foreground">{label}</div>
		{/each}
	</div>

	<!-- Calendar rows -->
	{#each weeks as week, wIdx (wIdx)}
		<div class="grid grid-cols-7 {wIdx < weeks.length - 1 ? 'border-b border-border' : ''}">
			{#each week as day (day.toISOString())}
				{@const dayReservations = getReservationsForDay(day)}
				{@const dayMaintenances = getMaintenancesForDay(day)}
				{@const isCurrentMonth = isSameMonth(day, monthStart)}
				{@const totalEvents = dayReservations.length + dayMaintenances.length}
				{@const availableSlots = MAX_PILLS - dayMaintenances.length}
				{@const visibleRes = dayReservations.slice(0, Math.max(0, availableSlots))}
				{@const overflow = totalEvents - dayMaintenances.length - visibleRes.length}
				<div
					class="group relative flex min-h-24 flex-col gap-1 border-r border-border/50 p-2 last:border-r-0 {!isCurrentMonth
						? 'opacity-40'
						: ''}"
				>
					<!-- Date number — click to zoom to week view -->
					<button
						class="inline-flex size-6 items-center justify-center self-start rounded-full text-xs font-medium transition-colors hover:bg-muted {isToday(
							day
						)
							? 'bg-primary text-primary-foreground hover:bg-primary/90'
							: 'text-foreground'}"
						onclick={() => onDayClick(day)}
						aria-label={format(day, 'd MMMM yyyy', { locale: fr })}
					>
						{format(day, 'd')}
					</button>

					<!-- Maintenance pills -->
					{#each dayMaintenances as m (m._id)}
						<div
							class="flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300"
							title="{m.vehicleBrand} {m.vehicleModel} — Entretien"
						>
							<WrenchIcon size={10} class="shrink-0" />
							<span class="truncate">{m.vehicleBrand} {m.vehicleModel}</span>
						</div>
					{/each}

					<!-- Reservation pills -->
					{#each visibleRes as res (res._id)}
						<button
							class="w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80 {STATUS_PILL[res.status] ?? STATUS_PILL.PENDING}"
							onclick={() => onBlockClick(res)}
							title="{res.brand} {res.model} — {res.purpose}"
						>
							<span
								class="mr-1 inline-block size-1.5 rounded-full align-middle {STATUS_DOT[res.status] ?? 'bg-muted-foreground'}"
							></span>
							{res.brand} {res.model}
						</button>
					{/each}

					<!-- Overflow badge — click to zoom to day view -->
					{#if overflow > 0}
						<button
							class="px-1 text-left text-[11px] text-muted-foreground hover:text-foreground"
							onclick={() => onDayClick(day)}
						>
							+{overflow} autre{overflow > 1 ? 's' : ''}
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/each}

	<!-- Empty state -->
	{#if vehicleRows.length === 0}
		<div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
			<p class="text-sm font-medium text-muted-foreground">Aucun véhicule dans la flotte</p>
		</div>
	{/if}
</div>
