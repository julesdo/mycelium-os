<script lang="ts">
	import { tick } from 'svelte';
	import type { CalendarReservation } from './ReservationBlock.svelte';
	import DayReservationBlock from './DayReservationBlock.svelte';
	import type { CalendarMaintenance } from './MaintenanceBlock.svelte';
	import WrenchIcon from '@lucide/svelte/icons/wrench';

	const SLOT_MINUTES = 15;
	const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES; // 96
	const SLOT_WIDTH = 44; // px per 15-min slot → 176px/hour
	const ROW_HEIGHT = 48;
	const LABEL_WIDTH = 192;

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
		dayStart: Date;
		onBlockClick: (res: CalendarReservation) => void;
		onBlockContextMenu: (x: number, y: number, res: CalendarReservation) => void;
		onCreateSelection: (vehicleId: string, startDate: Date, endDate: Date) => void;
		onMoveCommit: (
			resId: string,
			newVehicleId: string,
			newStart: Date,
			newEnd: Date
		) => void;
		onResizeEndCommit: (resId: string, newEnd: Date) => void;
		onResizeStartCommit: (resId: string, newStart: Date) => void;
	};

	let {
		vehicleRows,
		dayStart,
		onBlockClick,
		onBlockContextMenu,
		onCreateSelection,
		onMoveCommit,
		onResizeEndCommit,
		onResizeStartCommit
	}: Props = $props();

	let gridEl: HTMLDivElement | undefined = $state();
	let headerEl: HTMLDivElement | undefined = $state();
	let headerHeight = $state(0);

	$effect(() => {
		if (headerEl) headerHeight = headerEl.offsetHeight;
	});

	const totalWidth = SLOTS_PER_DAY * SLOT_WIDTH;
	const hours = Array.from({ length: 24 }, (_, i) => i);

	function tsToSlot(ts: number): number {
		return Math.round((ts - dayStart.getTime()) / (SLOT_MINUTES * 60_000));
	}

	function slotToDate(slot: number): Date {
		return new Date(dayStart.getTime() + slot * SLOT_MINUTES * 60_000);
	}

	function slotToTimeLabel(slot: number): string {
		const totalMins = slot * SLOT_MINUTES;
		const h = Math.floor(totalMins / 60);
		const m = totalMins % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	}

	// Current time indicator
	let now = $state(new Date());
	const nowSlot = $derived((now.getTime() - dayStart.getTime()) / (SLOT_MINUTES * 60_000));
	const isToday = $derived(
		now.getFullYear() === dayStart.getFullYear() &&
		now.getMonth() === dayStart.getMonth() &&
		now.getDate() === dayStart.getDate()
	);

	$effect(() => {
		const id = setInterval(() => {
			now = new Date();
		}, 60_000);
		return () => clearInterval(id);
	});

	// ─── Interaction state machine ─────────────────────────────────────────────
	type Interaction =
		| { type: 'idle' }
		| { type: 'creating'; vehicleIdx: number; startSlot: number; currentSlot: number }
		| {
				type: 'moving';
				res: CalendarReservation;
				vehicleIdx: number;
				clickSlotOffset: number;
				currentVehicleIdx: number;
				currentSlot: number;
				hasDragged: boolean;
				startClientX: number;
				startClientY: number;
		  }
		| {
				type: 'resizing-end';
				res: CalendarReservation;
				vehicleIdx: number;
				currentEndSlot: number;
		  }
		| {
				type: 'resizing-start';
				res: CalendarReservation;
				vehicleIdx: number;
				currentStartSlot: number;
		  };

	let interaction = $state<Interaction>({ type: 'idle' });
	let activePointerId = $state<number | null>(null);

	function getCellAt(
		clientX: number,
		clientY: number
	): { vehicleIdx: number; slotIdx: number } | null {
		if (!gridEl || !headerEl) return null;
		const headerBottom = headerEl.getBoundingClientRect().bottom;
		const gridRect = gridEl.getBoundingClientRect();
		const y = clientY - headerBottom + gridEl.scrollTop;
		const x = clientX - gridRect.left + gridEl.scrollLeft - LABEL_WIDTH;
		if (x < 0 || y < 0) return null;
		const slotIdx = Math.floor(x / SLOT_WIDTH);
		const vehicleIdx = Math.floor(y / ROW_HEIGHT);
		if (slotIdx < 0 || slotIdx >= SLOTS_PER_DAY) return null;
		if (vehicleIdx < 0 || vehicleIdx >= vehicleRows.length) return null;
		return { slotIdx, vehicleIdx };
	}

	// ─── Derived overlay state ─────────────────────────────────────────────────
	const ghostBlock = $derived.by(() => {
		if (interaction.type !== 'moving' || !interaction.hasDragged) return null;
		const { res, currentVehicleIdx, currentSlot, clickSlotOffset } = interaction;
		const durationSlots = Math.round((res.endDate - res.startDate) / (SLOT_MINUTES * 60_000));
		const startSlot = Math.max(0, currentSlot - clickSlotOffset);
		return { res, vehicleIdx: currentVehicleIdx, startSlot, endSlot: startSlot + durationSlots };
	});

	const movingResId = $derived(
		interaction.type === 'moving' && interaction.hasDragged ? interaction.res._id : null
	);

	const selectionRange = $derived.by(() => {
		if (interaction.type !== 'creating') return null;
		return {
			vehicleIdx: interaction.vehicleIdx,
			startSlot: Math.min(interaction.startSlot, interaction.currentSlot),
			endSlot: Math.max(interaction.startSlot, interaction.currentSlot)
		};
	});

	const anyInteractionActive = $derived(interaction.type !== 'idle');

	// Isolated per-resize preview — keyed by resId so only the resizing block re-renders on slot change
	const resizeStartPreview = $derived(
		interaction.type === 'resizing-start'
			? { resId: interaction.res._id, slot: interaction.currentStartSlot }
			: null
	);
	const resizeEndPreview = $derived(
		interaction.type === 'resizing-end'
			? { resId: interaction.res._id, slot: interaction.currentEndSlot }
			: null
	);

	// ─── Pointer handlers ──────────────────────────────────────────────────────
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
			startSlot: cell.slotIdx,
			currentSlot: cell.slotIdx
		};
	}

	function onBlockPointerDown(e: PointerEvent, res: CalendarReservation) {
		if (e.button !== 0 || activePointerId !== null) return;
		e.stopPropagation();
		e.preventDefault();
		const vehicleIdx = vehicleRows.findIndex((r) => r.vehicle._id === res.vehicleId);
		if (vehicleIdx === -1) return;
		const cell = getCellAt(e.clientX, e.clientY);
		const resStartSlot = tsToSlot(res.startDate);
		const clickedSlot = cell?.slotIdx ?? resStartSlot;
		const clickSlotOffset = Math.max(0, clickedSlot - resStartSlot);
		gridEl!.setPointerCapture(e.pointerId);
		activePointerId = e.pointerId;
		interaction = {
			type: 'moving',
			res,
			vehicleIdx,
			clickSlotOffset,
			currentVehicleIdx: vehicleIdx,
			currentSlot: clickedSlot,
			hasDragged: false,
			startClientX: e.clientX,
			startClientY: e.clientY
		};
	}

	function onResizeEndHandlePointerDown(e: PointerEvent, res: CalendarReservation) {
		if (e.button !== 0 || activePointerId !== null) return;
		e.stopPropagation();
		e.preventDefault();
		const vehicleIdx = vehicleRows.findIndex((r) => r.vehicle._id === res.vehicleId);
		gridEl!.setPointerCapture(e.pointerId);
		activePointerId = e.pointerId;
		interaction = {
			type: 'resizing-end',
			res,
			vehicleIdx,
			currentEndSlot: tsToSlot(res.endDate)
		};
	}

	function onResizeStartHandlePointerDown(e: PointerEvent, res: CalendarReservation) {
		if (e.button !== 0 || activePointerId !== null) return;
		e.stopPropagation();
		e.preventDefault();
		const vehicleIdx = vehicleRows.findIndex((r) => r.vehicle._id === res.vehicleId);
		gridEl!.setPointerCapture(e.pointerId);
		activePointerId = e.pointerId;
		interaction = {
			type: 'resizing-start',
			res,
			vehicleIdx,
			currentStartSlot: tsToSlot(res.startDate)
		};
	}

	function onGridPointerMove(e: PointerEvent) {
		if (activePointerId === null || e.pointerId !== activePointerId) return;
		const cell = getCellAt(e.clientX, e.clientY);
		if (!cell) return;

		if (interaction.type === 'creating') {
			// Skip if slot unchanged
			if (cell.slotIdx === interaction.currentSlot) return;
			interaction = { ...interaction, currentSlot: cell.slotIdx };
		} else if (interaction.type === 'moving') {
			const sameCell =
				cell.vehicleIdx === interaction.currentVehicleIdx &&
				cell.slotIdx === interaction.currentSlot;
			if (sameCell && interaction.hasDragged) return;
			let next = { ...interaction, currentVehicleIdx: cell.vehicleIdx, currentSlot: cell.slotIdx };
			if (!interaction.hasDragged) {
				const dx = e.clientX - interaction.startClientX;
				const dy = e.clientY - interaction.startClientY;
				if (dx * dx + dy * dy > 25) next = { ...next, hasDragged: true };
				else if (sameCell) return;
			}
			interaction = next;
		} else if (interaction.type === 'resizing-end') {
			const startSlot = tsToSlot(interaction.res.startDate);
			const newEnd = Math.max(cell.slotIdx, startSlot + 1);
			if (newEnd === interaction.currentEndSlot) return;
			interaction = { ...interaction, currentEndSlot: newEnd };
		} else if (interaction.type === 'resizing-start') {
			const endSlot = tsToSlot(interaction.res.endDate);
			const newStart = Math.min(cell.slotIdx, endSlot - 1);
			if (newStart === interaction.currentStartSlot) return;
			interaction = { ...interaction, currentStartSlot: newStart };
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
			const s = Math.min(curr.startSlot, curr.currentSlot);
			const e2 = Math.max(curr.startSlot, curr.currentSlot) + 1;
			onCreateSelection(vehicle._id, slotToDate(s), slotToDate(e2));
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
			const durationSlots = Math.round(
				(curr.res.endDate - curr.res.startDate) / (SLOT_MINUTES * 60_000)
			);
			const newStartSlot = Math.max(0, curr.currentSlot - curr.clickSlotOffset);
			const newStart = slotToDate(newStartSlot);
			const newEnd = slotToDate(Math.min(SLOTS_PER_DAY, newStartSlot + durationSlots));
			onMoveCommit(curr.res._id, newVehicle._id, newStart, newEnd);
			await tick();
			interaction = { type: 'idle' };
		} else if (curr.type === 'resizing-end') {
			if (curr.currentEndSlot === tsToSlot(curr.res.endDate)) {
				interaction = { type: 'idle' };
				return;
			}
			onResizeEndCommit(curr.res._id, slotToDate(curr.currentEndSlot));
			await tick();
			interaction = { type: 'idle' };
		} else if (curr.type === 'resizing-start') {
			if (curr.currentStartSlot === tsToSlot(curr.res.startDate)) {
				interaction = { type: 'idle' };
				return;
			}
			onResizeStartCommit(curr.res._id, slotToDate(curr.currentStartSlot));
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

	function onGridContextMenu(e: MouseEvent) {
		const blockEl = (e.target as HTMLElement).closest(
			'[data-reservation-id]'
		) as HTMLElement | null;
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
	aria-label="Calendrier jour des réservations"
	class="overflow-auto rounded-md border border-border focus:outline-none"
	style="max-height: calc(100vh - 16rem);"
	onpointerdown={onGridPointerDown}
	onpointermove={onGridPointerMove}
	onpointerup={onGridPointerUp}
	onpointercancel={onGridPointerCancel}
	oncontextmenu={onGridContextMenu}
>
	<div class="relative" style="min-width: {LABEL_WIDTH + totalWidth}px;">
		<!-- Sticky time header -->
		<div
			bind:this={headerEl}
			class="sticky top-0 z-20 flex border-b border-border bg-background"
			style="padding-left: {LABEL_WIDTH}px;"
		>
			{#each hours as h (h)}
				<div
					class="relative shrink-0 border-r border-border/50 pb-1 pl-1 pt-0.5"
					style="width: {SLOT_WIDTH * 4}px;"
				>
					<span class="text-[10px] font-medium text-muted-foreground">
						{h.toString().padStart(2, '0')}:00
					</span>
					<!-- 30-min sub-tick -->
					<div
						class="absolute bottom-0 w-px bg-border/40"
						style="left: {SLOT_WIDTH * 2}px; height: 5px;"
					></div>
					<!-- 15-min sub-ticks -->
					<div
						class="absolute bottom-0 w-px bg-border/25"
						style="left: {SLOT_WIDTH}px; height: 3px;"
					></div>
					<div
						class="absolute bottom-0 w-px bg-border/25"
						style="left: {SLOT_WIDTH * 3}px; height: 3px;"
					></div>
				</div>
			{/each}
		</div>

		<!-- Vehicle rows -->
		{#each vehicleRows as { vehicle, reservations, maintenances }, rowIdx (vehicle._id)}
			{@const dayMaintenance = maintenances.filter((m) => {
				const dayMs = 24 * 60 * 60 * 1000;
				const mDayStart = Math.floor(m.scheduledDate / dayMs) * dayMs;
				const mDayEnd = mDayStart + dayMs;
				return mDayStart <= dayStart.getTime() && mDayEnd > dayStart.getTime();
			})}
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

				<!-- Time area -->
				<div class="relative shrink-0" style="width: {totalWidth}px;">
					<!-- Hour grid lines — 1 CSS element instead of 24 divs, never reads reactive state -->
					<div
						class="absolute inset-0 pointer-events-none"
						style="background-image: linear-gradient(to right, transparent {SLOT_WIDTH * 4 - 1}px, color-mix(in oklch, var(--border) 40%, transparent) {SLOT_WIDTH * 4 - 1}px); background-size: {SLOT_WIDTH * 4}px 100%; background-repeat: repeat-x;"
					></div>

					<!-- Full-day maintenance overlay -->
					{#if dayMaintenance.length > 0}
						{@const mt = dayMaintenance[0]?.maintenanceType}
						<div
							class="pointer-events-none absolute inset-0 z-[5] border-y border-orange-200 bg-orange-50/40 dark:border-orange-500/20 dark:bg-orange-500/8"
						></div>
						<div
							class="pointer-events-none absolute inset-y-1 left-1 z-[6] flex items-center gap-1 rounded border border-orange-300 bg-orange-100/90 px-2 text-xs font-medium text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-300"
						>
							<WrenchIcon size={11} class="shrink-0 opacity-70" />
							<span class="truncate">{mt === 'REVISION' ? 'Révision' : mt === 'VIDANGE' ? 'Vidange' : mt === 'PNEUS' ? 'Pneumatiques' : mt === 'FREINS' ? 'Freins' : 'Entretien'}</span>
						</div>
					{/if}

					<!-- Current time indicator -->
					{#if isToday && nowSlot >= 0 && nowSlot <= SLOTS_PER_DAY}
						<div
							class="pointer-events-none absolute inset-y-0 z-20 w-px bg-red-500/70"
							style="left: {nowSlot * SLOT_WIDTH}px;"
						></div>
					{/if}

					<!-- Reservation blocks — pointer-events handled at wrapper level, not per-block -->
					<div class="absolute inset-0 {anyInteractionActive ? 'pointer-events-none' : ''}">
						{#each reservations as res (res._id)}
							<DayReservationBlock
								{res}
								dayStartMs={dayStart.getTime()}
								slotWidth={SLOT_WIDTH}
								slotsPer={SLOTS_PER_DAY}
								isDragging={movingResId === res._id}
								previewStartSlot={resizeStartPreview?.resId === res._id
									? resizeStartPreview.slot
									: undefined}
								previewEndSlot={resizeEndPreview?.resId === res._id
									? resizeEndPreview.slot
									: undefined}
								onclick={onBlockClick}
								onblockpointerdown={onBlockPointerDown}
								onresizestartpointerdown={onResizeStartHandlePointerDown}
								onresizeendpointerdown={onResizeEndHandlePointerDown}
							/>
						{/each}
					</div>

				</div>
			</div>
		{/each}

		{#if vehicleRows.length === 0}
			<div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
				<p class="text-sm font-medium text-muted-foreground">Aucun véhicule dans la flotte</p>
			</div>
		{/if}

		<!-- Ghost overlay (move) — outside vehicle rows loop so only this element re-renders per slot change -->
		{#if ghostBlock}
			{@const s = Math.max(0, ghostBlock.startSlot)}
			{@const eSlot = Math.min(SLOTS_PER_DAY, ghostBlock.endSlot)}
			{#if eSlot > s}
				<div
					class="pointer-events-none absolute z-30 flex flex-col items-start justify-center overflow-hidden rounded border border-primary/50 bg-primary/20 px-2 shadow-sm"
					style="top: {headerHeight + ghostBlock.vehicleIdx * ROW_HEIGHT + 4}px; left: {LABEL_WIDTH + s * SLOT_WIDTH}px; width: {(eSlot - s) * SLOT_WIDTH - 2}px; height: {ROW_HEIGHT - 8}px;"
				>
					<span class="truncate text-xs font-medium text-primary">{ghostBlock.res.purpose}</span>
					<span class="font-mono text-[10px] text-primary/70">{slotToTimeLabel(s)} – {slotToTimeLabel(eSlot)}</span>
				</div>
			{/if}
		{/if}

		<!-- Selection preview (create) — outside vehicle rows loop -->
		{#if selectionRange}
			{@const s = Math.max(0, selectionRange.startSlot)}
			{@const eSlot = Math.min(SLOTS_PER_DAY, selectionRange.endSlot + 1)}
			{#if eSlot > s}
				<div
					class="pointer-events-none absolute z-30 flex flex-col items-start justify-center overflow-hidden rounded border border-primary/60 bg-primary/15 px-2"
					style="top: {headerHeight + selectionRange.vehicleIdx * ROW_HEIGHT + 4}px; left: {LABEL_WIDTH + s * SLOT_WIDTH}px; width: {(eSlot - s) * SLOT_WIDTH - 2}px; height: {ROW_HEIGHT - 8}px;"
				>
					<span class="truncate text-xs font-medium text-primary/80">Nouvelle réservation</span>
					<span class="font-mono text-[10px] text-primary/60">{slotToTimeLabel(s)} – {slotToTimeLabel(eSlot)}</span>
				</div>
			{/if}
		{/if}
	</div>
</div>
