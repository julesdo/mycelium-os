<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { format, differenceInCalendarDays, startOfDay } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import type { ReservationStatus } from '$lib/components/reservations/status.js';

	export type CalendarReservation = {
		_id: string;
		organizationId: string;
		vehicleId: string;
		userId: string;
		startDate: number;
		endDate: number;
		purpose: string;
		status: ReservationStatus;
		notes?: string;
		createdAt: number;
		updatedAt: number;
		brand: string;
		model: string;
		registration: string;
		vehicleStatus: string;
		location: string | null;
		category: string;
		energy: string;
	};

	type Props = {
		reservation: CalendarReservation;
		windowStart: Date;
		columnCount: number;
		isDragging?: boolean;
		isInteracting?: boolean;
		previewStartDayIdx?: number;
		previewEndDayIdx?: number;
		onclick: (reservation: CalendarReservation) => void;
		onblockpointerdown: (e: PointerEvent, reservation: CalendarReservation) => void;
		onresizestartpointerdown: (e: PointerEvent, reservation: CalendarReservation) => void;
		onresizeendpointerdown: (e: PointerEvent, reservation: CalendarReservation) => void;
	};

	let {
		reservation,
		windowStart,
		columnCount,
		isDragging = false,
		isInteracting = false,
		previewStartDayIdx,
		previewEndDayIdx,
		onclick,
		onblockpointerdown,
		onresizestartpointerdown,
		onresizeendpointerdown
	}: Props = $props();

	const STATUS_STYLES: Record<ReservationStatus, string> = {
		PENDING:
			'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-200',
		CONFIRMED:
			'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-500/15 dark:border-blue-500/40 dark:text-blue-200',
		IN_PROGRESS:
			'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-500/15 dark:border-violet-500/40 dark:text-violet-200',
		COMPLETED:
			'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200',
		CANCELLED: 'bg-muted border-border text-muted-foreground'
	};

	const colStart = $derived(
		differenceInCalendarDays(
			startOfDay(new Date(reservation.startDate)),
			startOfDay(windowStart)
		)
	);

	const colEnd = $derived(
		differenceInCalendarDays(
			startOfDay(new Date(reservation.endDate)),
			startOfDay(windowStart)
		) + 1
	);

	// Clamped base values without any resize preview applied
	const baseColStart = $derived(Math.max(0, Math.min(colStart, columnCount - 1)));
	const baseColEnd = $derived(Math.max(baseColStart + 1, Math.min(colEnd, columnCount)));

	// resizing-start and resizing-end are mutually exclusive, so we clamp each against the base opposite
	const effectiveColStart = $derived(
		previewStartDayIdx !== undefined
			? Math.max(0, Math.min(previewStartDayIdx, baseColEnd - 1))
			: baseColStart
	);

	const effectiveColEnd = $derived(
		previewEndDayIdx !== undefined
			? Math.max(baseColStart + 1, Math.min(previewEndDayIdx + 1, columnCount))
			: baseColEnd
	);

	const isVisible = $derived(
		differenceInCalendarDays(startOfDay(new Date(reservation.endDate)), startOfDay(windowStart)) >= 0 &&
			differenceInCalendarDays(
				startOfDay(new Date(reservation.startDate)),
				startOfDay(windowStart)
			) < columnCount
	);

	function formatDate(ts: number) {
		return format(new Date(ts), 'd MMM', { locale: fr });
	}
</script>

{#if isVisible}
	<div
		data-reservation-id={reservation._id}
		class="absolute inset-y-1 z-10 {isInteracting ? 'pointer-events-none' : ''} {isDragging
			? 'opacity-25'
			: ''}"
		style="left: calc({(effectiveColStart / columnCount) * 100}%); width: calc({((effectiveColEnd - effectiveColStart) / columnCount) * 100}% - 2px);"
	>
		<!-- Left resize handle (start date) -->
		<div
			role="separator"
			aria-label="Modifier la date de début"
			class="absolute left-0 top-0 z-20 flex h-full w-2.5 cursor-ew-resize items-center justify-center rounded-l opacity-0 hover:opacity-100"
			onpointerdown={(e) => {
				e.stopPropagation();
				onresizestartpointerdown(e, reservation);
			}}
		>
			<div class="h-3/4 w-0.5 rounded-full bg-current opacity-60"></div>
		</div>

		<Tooltip.Provider>
			<Tooltip.Root delayDuration={500}>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="absolute inset-0 flex min-w-0 cursor-grab items-center overflow-hidden rounded border pl-3 pr-3 text-left text-xs font-medium select-none transition-opacity active:cursor-grabbing hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring {STATUS_STYLES[
								reservation.status
							]}"
							onpointerdown={(e) => {
								e.stopPropagation();
								onblockpointerdown(e, reservation);
							}}
							onclick={(e) => {
								e.stopPropagation();
								onclick(reservation);
							}}
						>
							<span class="truncate">{reservation.purpose}</span>
						</button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="top" class="max-w-xs">
					<div class="flex flex-col gap-1 text-xs">
						<p class="font-medium">{reservation.brand} {reservation.model}</p>
						<p class="font-mono text-muted-foreground">{reservation.registration}</p>
						<p>{reservation.purpose}</p>
						<p class="text-muted-foreground">
							{formatDate(reservation.startDate)} → {formatDate(reservation.endDate)}
						</p>
						{#if reservation.location}
							<p class="text-muted-foreground">{reservation.location}</p>
						{/if}
					</div>
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>

		<!-- Right resize handle (end date) -->
		<div
			role="separator"
			aria-label="Modifier la date de fin"
			class="absolute right-0 top-0 z-20 flex h-full w-2.5 cursor-ew-resize items-center justify-center rounded-r opacity-0 hover:opacity-100"
			onpointerdown={(e) => {
				e.stopPropagation();
				onresizeendpointerdown(e, reservation);
			}}
		>
			<div class="h-3/4 w-0.5 rounded-full bg-current opacity-60"></div>
		</div>
	</div>
{/if}
