<script lang="ts">
	import { tick } from 'svelte';
	import { addDays, format, isToday, startOfDay, differenceInCalendarDays } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ReservationBlock from './ReservationBlock.svelte';
	import type { CalendarReservation } from './ReservationBlock.svelte';
	import MaintenanceBlock from './MaintenanceBlock.svelte';
	import type { CalendarMaintenance } from './MaintenanceBlock.svelte';

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
		windowStart: Date;
		columnCount: number;
		onBlockClick: (reservation: CalendarReservation) => void;
		onBlockContextMenu: (x: number, y: number, reservation: CalendarReservation) => void;
		onCreateSelection: (vehicleId: string, startDate: Date, endDate: Date) => void;
		onMoveCommit: (reservationId: string, newVehicleId: string, newStart: Date, newEnd: Date) => void;
		onResizeEndCommit: (reservationId: string, newEnd: Date) => void;
		onResizeStartCommit: (reservationId: string, newStart: Date) => void;
		onDayClick?: (day: Date) => void;
	};

	let {
		vehicleRows,
		windowStart,
		columnCount,
		onBlockClick,
		onBlockContextMenu,
		onCreateSelection,
		onMoveCommit,
		onResizeEndCommit,
		onResizeStartCommit,
		onDayClick
	}: Props = $props();

	const ROW_HEIGHT = 48;
	const LABEL_WIDTH = 192; // w-48 = 12rem at 16px base
	const VIRTUALIZE_THRESHOLD = 50;

	let gridEl: HTMLDivElement | undefined = $state();
	let headerEl: HTMLDivElement | undefined = $state();
	let scrollTop = $state(0);
	let containerHeight = $state(600);

	$effect(() => {
		if (!gridEl) return;
		containerHeight = gridEl.clientHeight;
		const onScroll = () => {
			scrollTop = gridEl!.scrollTop;
		};
		gridEl.addEventListener('scroll', onScroll, { passive: true });
		return () => gridEl!.removeEventListener('scroll', onScroll);
	});

	const shouldVirtualize = $derived(vehicleRows.length > VIRTUALIZE_THRESHOLD);
	const OVERSCAN = 3;
	const visibleStart = $derived(
		shouldVirtualize ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0
	);
	const visibleEnd = $derived(
		shouldVirtualize
			? Math.min(
					vehicleRows.length,
					Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
				)
			: vehicleRows.length
	);
	const visibleRows = $derived(vehicleRows.slice(visibleStart, visibleEnd));
	const days = $derived(Array.from({ length: columnCount }, (_, i) => addDays(windowStart, i)));

	// ─── Interaction state machine ─────────────────────────────────────────────
	// 'resizing-start' = left handle drag (changes startDate)
	// 'resizing-end'   = right handle drag (changes endDate)
	type Interaction =
		| { type: 'idle' }
		| { type: 'creating'; vehicleIdx: number; startDayIdx: number; currentDayIdx: number }
		| {
				type: 'moving';
				res: CalendarReservation;
				vehicleIdx: number;
				clickDayOffset: number;
				currentVehicleIdx: number;
				currentDayIdx: number;
				hasDragged: boolean;
				startClientX: number;
				startClientY: number;
		  }
		| { type: 'resizing-end'; res: CalendarReservation; vehicleIdx: number; currentEndDayIdx: number }
		| { type: 'resizing-start'; res: CalendarReservation; vehicleIdx: number; currentStartDayIdx: number };

	let interaction = $state<Interaction>({ type: 'idle' });
	let activePointerId = $state<number | null>(null);

	// ─── Geometry hit-testing ──────────────────────────────────────────────────
	// Maps viewport pointer coords → cell {vehicleIdx, dayIdx}.
	// Pure geometry — no elementFromPoint, robust through overlays.
	function getCellAt(clientX: number, clientY: number): { vehicleIdx: number; dayIdx: number } | null {
		if (!gridEl || !headerEl) return null;

		const headerBottom = headerEl.getBoundingClientRect().bottom;
		const gridRect = gridEl.getBoundingClientRect();

		const y = clientY - headerBottom + gridEl.scrollTop;
		const x = clientX - gridRect.left + gridEl.scrollLeft - LABEL_WIDTH;

		if (x < 0 || y < 0) return null;

		const contentWidth = gridEl.scrollWidth - LABEL_WIDTH;
		if (contentWidth <= 0) return null;
		const dayWidth = contentWidth / columnCount;

		const dayIdx = Math.floor(x / dayWidth);
		const vehicleIdx = Math.floor(y / ROW_HEIGHT);

		if (dayIdx < 0 || dayIdx >= columnCount) return null;
		if (vehicleIdx < 0 || vehicleIdx >= vehicleRows.length) return null;

		return { dayIdx, vehicleIdx };
	}

	// ─── Derived overlay state ─────────────────────────────────────────────────
	const selectionRange = $derived.by(() => {
		if (interaction.type !== 'creating') return null;
		return {
			vehicleIdx: interaction.vehicleIdx,
			startDayIdx: Math.min(interaction.startDayIdx, interaction.currentDayIdx),
			endDayIdx: Math.max(interaction.startDayIdx, interaction.currentDayIdx)
		};
	});

	const ghostBlock = $derived.by(() => {
		if (interaction.type !== 'moving' || !interaction.hasDragged) return null;
		const { res, currentVehicleIdx, currentDayIdx, clickDayOffset } = interaction;
		const duration = differenceInCalendarDays(
			startOfDay(new Date(res.endDate)),
			startOfDay(new Date(res.startDate))
		);
		const startDayIdx = currentDayIdx - clickDayOffset;
		return { res, vehicleIdx: currentVehicleIdx, startDayIdx, endDayIdx: startDayIdx + duration };
	});

	// ID of the block being moved (rendered at 25% opacity as "source ghost")
	const movingResId = $derived(
		interaction.type === 'moving' && interaction.hasDragged ? interaction.res._id : null
	);

	const anyInteractionActive = $derived(interaction.type !== 'idle');

	// ─── Pointer: grid-level handlers ──────────────────────────────────────────
	function onGridPointerDown(e: PointerEvent) {
		if (e.button !== 0 || activePointerId !== null) return;
		if ((e.target as HTMLElement).closest('[data-reservation-id]')) return;

		const cell = getCellAt(e.clientX, e.clientY);
		if (!cell) return;

		e.preventDefault();
		gridEl!.setPointerCapture(e.pointerId);
		activePointerId = e.pointerId;
		interaction = {
			type: 'creating',
			vehicleIdx: cell.vehicleIdx,
			startDayIdx: cell.dayIdx,
			currentDayIdx: cell.dayIdx
		};
	}

	// Called from block's main button onpointerdown
	function onBlockPointerDown(e: PointerEvent, res: CalendarReservation) {
		if (e.button !== 0 || activePointerId !== null) return;
		e.stopPropagation();
		e.preventDefault();

		const vehicleIdx = vehicleRows.findIndex((r) => r.vehicle._id === res.vehicleId);
		if (vehicleIdx === -1) return;

		const cell = getCellAt(e.clientX, e.clientY);
		const resDayStart = differenceInCalendarDays(
			startOfDay(new Date(res.startDate)),
			startOfDay(windowStart)
		);
		const clickedDay = cell?.dayIdx ?? resDayStart;
		const clickDayOffset = Math.max(0, clickedDay - resDayStart);

		gridEl!.setPointerCapture(e.pointerId);
		activePointerId = e.pointerId;
		interaction = {
			type: 'moving',
			res,
			vehicleIdx,
			clickDayOffset,
			currentVehicleIdx: vehicleIdx,
			currentDayIdx: clickedDay,
			hasDragged: false,
			startClientX: e.clientX,
			startClientY: e.clientY
		};
	}

	// Called from block's right resize handle onpointerdown
	function onResizeEndHandlePointerDown(e: PointerEvent, res: CalendarReservation) {
		if (e.button !== 0 || activePointerId !== null) return;
		e.stopPropagation();
		e.preventDefault();

		const vehicleIdx = vehicleRows.findIndex((r) => r.vehicle._id === res.vehicleId);
		const endDayIdx = differenceInCalendarDays(
			startOfDay(new Date(res.endDate)),
			startOfDay(windowStart)
		);

		gridEl!.setPointerCapture(e.pointerId);
		activePointerId = e.pointerId;
		interaction = { type: 'resizing-end', res, vehicleIdx, currentEndDayIdx: endDayIdx };
	}

	// Called from block's left resize handle onpointerdown
	function onResizeStartHandlePointerDown(e: PointerEvent, res: CalendarReservation) {
		if (e.button !== 0 || activePointerId !== null) return;
		e.stopPropagation();
		e.preventDefault();

		const vehicleIdx = vehicleRows.findIndex((r) => r.vehicle._id === res.vehicleId);
		const startDayIdx = differenceInCalendarDays(
			startOfDay(new Date(res.startDate)),
			startOfDay(windowStart)
		);

		gridEl!.setPointerCapture(e.pointerId);
		activePointerId = e.pointerId;
		interaction = { type: 'resizing-start', res, vehicleIdx, currentStartDayIdx: startDayIdx };
	}

	function onGridPointerMove(e: PointerEvent) {
		if (activePointerId === null || e.pointerId !== activePointerId) return;

		const cell = getCellAt(e.clientX, e.clientY);
		if (!cell) return;

		if (interaction.type === 'creating') {
			if (cell.dayIdx === interaction.currentDayIdx) return;
			interaction = { ...interaction, currentDayIdx: cell.dayIdx };
		} else if (interaction.type === 'moving') {
			const sameCell =
				cell.vehicleIdx === interaction.currentVehicleIdx &&
				cell.dayIdx === interaction.currentDayIdx;
			if (sameCell && interaction.hasDragged) return;
			let next = { ...interaction, currentVehicleIdx: cell.vehicleIdx, currentDayIdx: cell.dayIdx };
			if (!interaction.hasDragged) {
				const dx = e.clientX - interaction.startClientX;
				const dy = e.clientY - interaction.startClientY;
				if (dx * dx + dy * dy > 25) next = { ...next, hasDragged: true };
				else if (sameCell) return;
			}
			interaction = next;
		} else if (interaction.type === 'resizing-end') {
			const startDayIdx = differenceInCalendarDays(
				startOfDay(new Date(interaction.res.startDate)),
				startOfDay(windowStart)
			);
			const newEnd = Math.max(cell.dayIdx, startDayIdx);
			if (newEnd === interaction.currentEndDayIdx) return;
			interaction = { ...interaction, currentEndDayIdx: newEnd };
		} else if (interaction.type === 'resizing-start') {
			const endDayIdx = differenceInCalendarDays(
				startOfDay(new Date(interaction.res.endDate)),
				startOfDay(windowStart)
			);
			const newStart = Math.min(cell.dayIdx, endDayIdx);
			if (newStart === interaction.currentStartDayIdx) return;
			interaction = { ...interaction, currentStartDayIdx: newStart };
		}
	}

	async function onGridPointerUp(e: PointerEvent) {
		if (activePointerId === null || e.pointerId !== activePointerId) return;
		activePointerId = null;
		gridEl!.releasePointerCapture(e.pointerId);

		const curr = interaction;

		if (curr.type === 'creating') {
			interaction = { type: 'idle' };
			const vehicle = vehicleRows[curr.vehicleIdx]?.vehicle;
			if (!vehicle) return;
			const s = Math.min(curr.startDayIdx, curr.currentDayIdx);
			const e2 = Math.max(curr.startDayIdx, curr.currentDayIdx);
			const startDate = addDays(windowStart, s);
			startDate.setHours(8, 0, 0, 0);
			const endDate = addDays(windowStart, e2);
			endDate.setHours(18, 0, 0, 0);
			onCreateSelection(vehicle._id, startDate, endDate);
		} else if (curr.type === 'moving') {
			if (!curr.hasDragged) {
				interaction = { type: 'idle' };
				onBlockClick(curr.res);
				return;
			}
			const newVehicle = vehicleRows[curr.currentVehicleIdx]?.vehicle;
			if (!newVehicle) {
				interaction = { type: 'idle' };
				return;
			}
			const duration = differenceInCalendarDays(
				startOfDay(new Date(curr.res.endDate)),
				startOfDay(new Date(curr.res.startDate))
			);
			const newStartDayIdx = curr.currentDayIdx - curr.clickDayOffset;
			const newStart = startOfDay(addDays(windowStart, newStartDayIdx));
			const newEnd = addDays(newStart, duration);
			newEnd.setHours(23, 59, 59, 999);
			onMoveCommit(curr.res._id, newVehicle._id, newStart, newEnd);
			await tick();
			interaction = { type: 'idle' };
		} else if (curr.type === 'resizing-end') {
			const origEndDayIdx = differenceInCalendarDays(
				startOfDay(new Date(curr.res.endDate)),
				startOfDay(windowStart)
			);
			if (curr.currentEndDayIdx === origEndDayIdx) {
				interaction = { type: 'idle' };
				return;
			}
			const newEnd = startOfDay(addDays(windowStart, curr.currentEndDayIdx));
			newEnd.setHours(23, 59, 59, 999);
			onResizeEndCommit(curr.res._id, newEnd);
			await tick();
			interaction = { type: 'idle' };
		} else if (curr.type === 'resizing-start') {
			const origStartDayIdx = differenceInCalendarDays(
				startOfDay(new Date(curr.res.startDate)),
				startOfDay(windowStart)
			);
			if (curr.currentStartDayIdx === origStartDayIdx) {
				interaction = { type: 'idle' };
				return;
			}
			const newStart = startOfDay(addDays(windowStart, curr.currentStartDayIdx));
			onResizeStartCommit(curr.res._id, newStart);
			await tick();
			interaction = { type: 'idle' };
		} else {
			interaction = { type: 'idle' };
		}
	}

	function onGridPointerCancel(e: PointerEvent) {
		if (activePointerId !== null && e.pointerId === activePointerId) {
			activePointerId = null;
			interaction = { type: 'idle' };
		}
	}

	// Right-click on a reservation block → delegate to FleetCalendar for context menu
	function onGridContextMenu(e: MouseEvent) {
		const blockEl = (e.target as HTMLElement).closest('[data-reservation-id]') as HTMLElement | null;
		if (!blockEl) return;
		e.preventDefault();
		const resId = blockEl.dataset.reservationId;
		if (!resId) return;
		for (const { reservations } of vehicleRows) {
			const res = reservations.find((r) => r._id === resId);
			if (res) {
				onBlockContextMenu(e.clientX, e.clientY, res);
				return;
			}
		}
	}
</script>

<div
	bind:this={gridEl}
	role="grid"
	tabindex="0"
	aria-label="Calendrier des réservations"
	class="overflow-auto rounded-md border border-border focus:outline-none"
	style="max-height: calc(100vh - 16rem);"
	onpointerdown={onGridPointerDown}
	onpointermove={onGridPointerMove}
	onpointerup={onGridPointerUp}
	onpointercancel={onGridPointerCancel}
	oncontextmenu={onGridContextMenu}
>
	<div style="min-width: {12 + columnCount * 9}rem;">
		<!-- Sticky column headers -->
		<div
			bind:this={headerEl}
			class="sticky top-0 z-20 flex border-b border-border bg-background"
			style="padding-left: 12rem;"
		>
			{#each days as day (day.toISOString())}
				<button
					class="flex flex-1 flex-col items-center justify-center py-1.5 text-xs transition-colors {isToday(day)
						? 'bg-primary/5 font-semibold text-primary'
						: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'} {onDayClick ? 'cursor-pointer' : ''}"
					onclick={() => onDayClick?.(day)}
					tabindex={onDayClick ? 0 : -1}
				>
					<span class="uppercase">{format(day, 'EEE', { locale: fr })}</span>
					<span
						class={isToday(day)
							? 'flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground'
							: ''}
					>
						{format(day, 'd')}
					</span>
				</button>
			{/each}
		</div>

		<!-- Top spacer for virtualisation -->
		{#if shouldVirtualize && visibleStart > 0}
			<div style="height: {visibleStart * ROW_HEIGHT}px;"></div>
		{/if}

		<!-- Vehicle rows -->
		{#each visibleRows as { vehicle, reservations, maintenances }, rowIdx (vehicle._id)}
			{@const absoluteRowIdx = visibleStart + rowIdx}
			<div class="flex border-b border-border last:border-0" style="height: {ROW_HEIGHT}px;">
				<!-- Sticky vehicle label -->
				<div
					class="sticky left-0 z-10 flex w-48 shrink-0 items-center gap-2 border-r border-border bg-background px-3 {vehicle.status ===
					'MAINTENANCE'
						? 'bg-orange-50/50 dark:bg-orange-500/5'
						: ''}"
				>
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium">{vehicle.brand} {vehicle.model}</p>
						<p class="truncate font-mono text-[10px] text-muted-foreground">
							{vehicle.registration}
						</p>
					</div>
					{#if vehicle.status === 'MAINTENANCE'}
						<span
							class="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
						>
							Maint.
						</span>
					{/if}
				</div>

				<!-- Day cells area -->
				<div class="relative flex flex-1">
					<!-- Column dividers — visual only, no pointer events needed -->
					{#each days as _day, _i}
						<div
							class="flex-1 border-r border-border/50 last:border-0 {anyInteractionActive
								? ''
								: 'hover:bg-muted/30'}"
						></div>
					{/each}

					<!-- Maintenance blocks (non-interactive, appear behind reservations) -->
					{#each maintenances as m (m._id)}
						<MaintenanceBlock
							maintenance={m}
							{windowStart}
							{columnCount}
						/>
					{/each}

					<!-- Reservation blocks -->
					{#each reservations as res (res._id)}
						<ReservationBlock
							reservation={res}
							{windowStart}
							{columnCount}
							isDragging={movingResId === res._id}
							isInteracting={anyInteractionActive}
							previewStartDayIdx={interaction.type === 'resizing-start' &&
							interaction.res._id === res._id
								? interaction.currentStartDayIdx
								: undefined}
							previewEndDayIdx={interaction.type === 'resizing-end' &&
							interaction.res._id === res._id
								? interaction.currentEndDayIdx
								: undefined}
							onclick={onBlockClick}
							onblockpointerdown={onBlockPointerDown}
							onresizestartpointerdown={onResizeStartHandlePointerDown}
							onresizeendpointerdown={onResizeEndHandlePointerDown}
						/>
					{/each}

					<!-- Ghost during MOVING — pointer-events-none so hit-testing sees through -->
					{#if ghostBlock && ghostBlock.vehicleIdx === absoluteRowIdx}
						{@const s = Math.max(0, ghostBlock.startDayIdx)}
						{@const eIdx = Math.min(columnCount, ghostBlock.endDayIdx + 1)}
						{#if eIdx > s}
							<div
								class="pointer-events-none absolute inset-y-1 z-30 flex items-center overflow-hidden rounded border border-primary/50 bg-primary/20 px-2 text-xs font-medium text-primary shadow-sm"
								style="left: calc({(s / columnCount) * 100}%); width: calc({((eIdx - s) / columnCount) * 100}% - 2px);"
							>
								<span class="truncate">{ghostBlock.res.purpose}</span>
							</div>
						{/if}
					{/if}

					<!-- Creation preview — styled like a real block for visual continuity -->
					{#if selectionRange && selectionRange.vehicleIdx === absoluteRowIdx}
						{@const s = Math.max(0, selectionRange.startDayIdx)}
						{@const eIdx = Math.min(columnCount, selectionRange.endDayIdx + 1)}
						{#if eIdx > s}
							<div
								class="pointer-events-none absolute inset-y-1 z-30 flex items-center overflow-hidden rounded border border-primary/60 bg-primary/15 px-2 text-xs font-medium text-primary/80"
								style="left: calc({(s / columnCount) * 100}%); width: calc({((eIdx - s) / columnCount) * 100}% - 2px);"
							>
								<span class="truncate">Nouvelle réservation</span>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/each}

		<!-- Bottom spacer for virtualisation -->
		{#if shouldVirtualize && visibleEnd < vehicleRows.length}
			<div style="height: {(vehicleRows.length - visibleEnd) * ROW_HEIGHT}px;"></div>
		{/if}

		<!-- Empty state -->
		{#if vehicleRows.length === 0}
			<div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
				<p class="text-sm font-medium text-muted-foreground">Aucun véhicule dans la flotte</p>
			</div>
		{/if}
	</div>
</div>
