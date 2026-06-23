<script lang="ts">
	import { Pencil, Copy, Ban } from '@lucide/svelte';
	import type { CalendarReservation } from './ReservationBlock.svelte';

	type Props = {
		reservation: CalendarReservation | null;
		x: number;
		y: number;
		onEdit: (res: CalendarReservation) => void;
		onDuplicate: (res: CalendarReservation) => void;
		onCancel: (res: CalendarReservation) => void;
		onClose: () => void;
	};

	let { reservation, x, y, onEdit, onDuplicate, onCancel, onClose }: Props = $props();

	const open = $derived(reservation !== null);

	const isCancellable = $derived(
		reservation?.status === 'PENDING' || reservation?.status === 'CONFIRMED'
	);

	// Keep menu inside viewport
	const clampedX = $derived(Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 180));
	const clampedY = $derived(Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 150));
</script>

{#if open && reservation}
	<!-- Transparent backdrop catches outside clicks -->
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		onpointerdown={onClose}
	></div>

	<!-- Floating menu -->
	<div
		class="fixed z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
		style="left: {clampedX}px; top: {clampedY}px;"
		role="menu"
		aria-label="Actions sur la réservation"
	>
		<button
			role="menuitem"
			class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
			onclick={() => { onEdit(reservation!); onClose(); }}
		>
			<Pencil size={14} class="shrink-0 text-muted-foreground" />
			<span>Modifier</span>
		</button>

		<button
			role="menuitem"
			class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
			onclick={() => { onDuplicate(reservation!); onClose(); }}
		>
			<Copy size={14} class="shrink-0 text-muted-foreground" />
			<span>Dupliquer</span>
		</button>

		{#if isCancellable}
			<div class="my-1 h-px bg-border"></div>
			<button
				role="menuitem"
				class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
				onclick={() => { onCancel(reservation!); onClose(); }}
			>
				<Ban size={14} class="shrink-0" />
				<span>Annuler la réservation</span>
			</button>
		{/if}
	</div>
{/if}
