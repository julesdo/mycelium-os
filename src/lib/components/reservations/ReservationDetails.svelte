<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CarIcon from '@lucide/svelte/icons/car';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import TruckIcon from '@lucide/svelte/icons/truck';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import type { ReservationWithDetails } from './ReservationCard.svelte';
	import { RESERVATION_STATUS_CONFIG } from './status.js';
	import { cn } from '$lib/utils.js';

	type Props = {
		reservation: ReservationWithDetails | null;
		onClose: () => void;
		onCancel: (id: string) => void;
	};

	let { reservation, onClose, onCancel }: Props = $props();

	const ENERGY_LABELS: Record<string, string> = {
		THERMAL: 'Thermique',
		HYBRID: 'Hybride',
		ELECTRIC: 'Électrique'
	};
	const CATEGORY_LABELS: Record<string, string> = {
		PASSENGER: 'Tourisme',
		UTILITY: 'Utilitaire',
		TRUCK: 'Camion'
	};

	let confirming = $state(false);

	const isCancellable = $derived(
		reservation?.status === 'PENDING' || reservation?.status === 'CONFIRMED'
	);

	function formatDateTime(ts: number): string {
		const d = new Date(ts);
		const hasTime = !(d.getHours() === 0 && d.getMinutes() === 0);
		const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
		return hasTime ? dateStr + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : dateStr;
	}

	function durationLabel(start: number, end: number): string {
		const mins = Math.round((end - start) / 60_000);
		if (mins < 60) return `${mins} min`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		if (h < 24) return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
		const d = Math.floor(h / 24);
		const rh = h % 24;
		return rh > 0 ? `${d}j ${rh}h` : `${d} jour${d > 1 ? 's' : ''}`;
	}

	function handleCancel() {
		if (!reservation) return;
		onCancel(reservation._id);
		confirming = false;
		onClose();
	}

	const open = $derived(reservation !== null);

	$effect(() => {
		if (!open) confirming = false;
	});
</script>

<Dialog.Root {open} onOpenChange={(o) => { if (!o) onClose(); }}>
	<Dialog.Content class="max-w-sm gap-0 p-0">
		{#if reservation}
			{@const r = reservation}
			{@const statusCfg = RESERVATION_STATUS_CONFIG[r.status]}

			<!-- Vehicle header -->
			<div class="flex items-start gap-3 border-b px-5 py-4">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
					<CarIcon class="size-5 text-muted-foreground" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="font-semibold leading-tight">{r.brand} {r.model}</p>
					<p class="mt-0.5 font-mono text-xs text-muted-foreground">{r.registration}</p>
					<div class="mt-1.5 flex flex-wrap gap-1.5">
						<span class="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
							<TruckIcon class="size-2.5" />
							{CATEGORY_LABELS[r.category] ?? r.category}
						</span>
						<span class="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
							<ZapIcon class="size-2.5" />
							{ENERGY_LABELS[r.energy] ?? r.energy}
						</span>
					</div>
				</div>
				<span class={cn('shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', statusCfg.class)}>
					{statusCfg.label}
				</span>
			</div>

			<!-- Content -->
			<div class="flex flex-col gap-4 px-5 py-4">
				<!-- Dates -->
				<div class="flex gap-3">
					<CalendarIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1 text-[13px]">
						<p class="font-medium">{formatDateTime(r.startDate)}</p>
						<p class="text-muted-foreground">→ {formatDateTime(r.endDate)}</p>
						<div class="mt-1.5 flex items-center gap-1.5">
							<ClockIcon class="size-3 text-muted-foreground" />
							<span class="text-[11px] text-muted-foreground">{durationLabel(r.startDate, r.endDate)}</span>
						</div>
					</div>
				</div>

				<!-- Location -->
				{#if r.location}
					<div class="flex items-center gap-3">
						<MapPinIcon class="size-4 shrink-0 text-muted-foreground" />
						<span class="text-[13px] text-muted-foreground">{r.location}</span>
					</div>
				{/if}

				<!-- Motif + Notes -->
				<div class="rounded-xl bg-muted/50 px-3.5 py-3 flex flex-col gap-2.5">
					<div class="flex flex-col gap-0.5">
						<span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motif</span>
						<p class="text-[13px]">{r.purpose}</p>
					</div>
					{#if r.notes}
						<div class="flex flex-col gap-0.5 border-t border-border/60 pt-2.5">
							<span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</span>
							<p class="text-[13px] text-muted-foreground">{r.notes}</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Actions -->
			<div class="border-t px-5 py-3">
				{#if confirming}
					<div class="flex items-center gap-2">
						<span class="flex-1 text-[13px] font-medium text-destructive">Confirmer l'annulation ?</span>
						<Button variant="ghost" size="sm" onclick={() => (confirming = false)}>Garder</Button>
						<Button
							size="sm"
							class="border-0 bg-destructive/10 text-destructive hover:bg-destructive/20"
							onclick={handleCancel}
						>
							Oui, annuler
						</Button>
					</div>
				{:else}
					<div class="flex items-center justify-end gap-2">
						<Button variant="outline" size="sm" onclick={onClose}>Fermer</Button>
						{#if isCancellable}
							<Button
								size="sm"
								class="border-destructive/30 bg-destructive/8 text-destructive hover:bg-destructive/15"
								onclick={() => (confirming = true)}
							>
								Annuler la réservation
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
