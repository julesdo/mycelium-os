<script lang="ts">
	import type { CalendarReservation } from './ReservationBlock.svelte';

	const SLOT_MINUTES = 15;

	type Props = {
		res: CalendarReservation;
		dayStartMs: number;
		slotWidth: number;
		slotsPer: number;
		isDragging: boolean;
		previewStartSlot?: number;
		previewEndSlot?: number;
		onclick: (res: CalendarReservation) => void;
		onblockpointerdown: (e: PointerEvent, res: CalendarReservation) => void;
		onresizestartpointerdown: (e: PointerEvent, res: CalendarReservation) => void;
		onresizeendpointerdown: (e: PointerEvent, res: CalendarReservation) => void;
	};

	let {
		res,
		dayStartMs,
		slotWidth,
		slotsPer,
		isDragging,
		previewStartSlot,
		previewEndSlot,
		onclick,
		onblockpointerdown,
		onresizestartpointerdown,
		onresizeendpointerdown
	}: Props = $props();

	const STATUS_STYLES: Record<string, string> = {
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

	function fmtSlot(slot: number): string {
		const totalMins = slot * SLOT_MINUTES;
		const h = Math.floor(totalMins / 60);
		const m = totalMins % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	}

	const resStartSlot = $derived(Math.round((res.startDate - dayStartMs) / (SLOT_MINUTES * 60_000)));
	const resEndSlot = $derived(Math.round((res.endDate - dayStartMs) / (SLOT_MINUTES * 60_000)));
	const effectiveStart = $derived(previewStartSlot !== undefined ? previewStartSlot : resStartSlot);
	const effectiveEnd = $derived(previewEndSlot !== undefined ? previewEndSlot : resEndSlot);
	const clampedStart = $derived(Math.max(0, effectiveStart));
	const clampedEnd = $derived(Math.min(slotsPer, effectiveEnd));
	const isVisible = $derived(clampedEnd > clampedStart && resEndSlot > 0 && resStartSlot < slotsPer);
	const widthPx = $derived((clampedEnd - clampedStart) * slotWidth - 2);
	// Show time label when block is wide enough (≥ 2 slots = 30 min) or when resizing/preview active
	const showTime = $derived(
		widthPx >= slotWidth * 2 || previewStartSlot !== undefined || previewEndSlot !== undefined
	);
	const timeLabel = $derived(showTime ? `${fmtSlot(clampedStart)} – ${fmtSlot(clampedEnd)}` : null);
</script>

{#if isVisible}
	<div
		data-reservation-id={res._id}
		class="absolute inset-y-1 z-10 {isDragging ? 'opacity-25' : ''}"
		style="left: {clampedStart * slotWidth}px; width: {widthPx}px;"
	>
		<!-- Left resize handle -->
		<div
			role="separator"
			aria-label="Modifier l'heure de début"
			class="absolute left-0 top-0 z-20 flex h-full w-2.5 cursor-ew-resize items-center justify-center rounded-l opacity-0 hover:opacity-100"
			onpointerdown={(e) => {
				e.stopPropagation();
				onresizestartpointerdown(e, res);
			}}
		>
			<div class="h-3/4 w-0.5 rounded-full bg-current opacity-60"></div>
		</div>

		<button
			class="absolute inset-0 flex min-w-0 cursor-grab flex-col items-start justify-center overflow-hidden rounded border pl-2 pr-2 text-left select-none transition-opacity active:cursor-grabbing hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring {STATUS_STYLES[
				res.status
			] ?? ''}"
			onpointerdown={(e) => {
				e.stopPropagation();
				onblockpointerdown(e, res);
			}}
			onclick={(e) => {
				e.stopPropagation();
				onclick(res);
			}}
		>
			<span class="truncate text-xs font-medium">{res.purpose}</span>
			{#if timeLabel}
				<span class="font-mono text-[10px] opacity-60">{timeLabel}</span>
			{/if}
		</button>

		<!-- Right resize handle -->
		<div
			role="separator"
			aria-label="Modifier l'heure de fin"
			class="absolute right-0 top-0 z-20 flex h-full w-2.5 cursor-ew-resize items-center justify-center rounded-r opacity-0 hover:opacity-100"
			onpointerdown={(e) => {
				e.stopPropagation();
				onresizeendpointerdown(e, res);
			}}
		>
			<div class="h-3/4 w-0.5 rounded-full bg-current opacity-60"></div>
		</div>
	</div>
{/if}
