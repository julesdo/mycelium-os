<script lang="ts">
	import { browser } from '$app/environment';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { getVehicleImageUrl } from '$lib/utils/vehicle-image';
	import { RESERVATION_STATUS_CONFIG, type ReservationStatus } from './status.js';
	import type { ReservationWithDetails } from './ReservationCard.svelte';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import TruckIcon from '@lucide/svelte/icons/truck';

	type Props = {
		reservation: ReservationWithDetails | null;
		onClose: () => void;
		onCancel: (id: string) => void;
	};

	let { reservation, onClose, onCancel }: Props = $props();

	// Detect mobile viewport for bottom drawer vs side sheet
	let isMobile = $state(browser ? window.matchMedia('(max-width: 767px)').matches : false);
	$effect(() => {
		if (!browser) return;
		const mq = window.matchMedia('(max-width: 767px)');
		isMobile = mq.matches;
		const fn = (e: MediaQueryListEvent) => { isMobile = e.matches; };
		mq.addEventListener('change', fn);
		return () => mq.removeEventListener('change', fn);
	});

	let panelOpen = $state(false);
	let confirming = $state(false);

	$effect(() => {
		panelOpen = reservation !== null;
		if (!panelOpen) confirming = false;
	});

	const ENERGY_LABELS: Record<string, string> = {
		THERMAL: 'Thermique', HYBRID: 'Hybride', ELECTRIC: 'Électrique'
	};
	const CATEGORY_LABELS: Record<string, string> = {
		PASSENGER: 'Tourisme', UTILITY: 'Utilitaire', TRUCK: 'Camion'
	};
	const DOT_COLORS: Record<ReservationStatus, string> = {
		PENDING: 'bg-amber-400',
		CONFIRMED: 'bg-blue-500',
		IN_PROGRESS: 'bg-emerald-500',
		COMPLETED: 'bg-muted-foreground/40',
		CANCELLED: 'bg-muted-foreground/30'
	};

	const isCancellable = $derived(
		reservation?.status === 'PENDING' || reservation?.status === 'CONFIRMED'
	);

	function timeFmt(ts: number) {
		return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}
	function dateFmt(ts: number) {
		return new Date(ts).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
	}
	function duration(start: number, end: number): string {
		const mins = Math.round((end - start) / 60_000);
		if (mins < 60) return `${mins} min`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		if (h < 24) return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
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
	function closePanel() {
		panelOpen = false;
		onClose();
	}
</script>

{#snippet inner()}
	{#if reservation}
		{@const r = reservation}
		{@const statusCfg = RESERVATION_STATUS_CONFIG[r.status]}
		{@const imgSrc = getVehicleImageUrl(r.brand, r.model)}
		{@const isActive = r.status === 'IN_PROGRESS'}

		<div class="flex min-h-0 flex-1 flex-col overflow-hidden">

			<!-- ── Vehicle photo header ───────────────────────────────────── -->
			<div class="relative h-52 shrink-0 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 sm:h-56">
				<img
					src={imgSrc}
					alt="{r.brand} {r.model}"
					class="absolute inset-0 h-full w-full object-cover object-center opacity-55 transition-transform duration-700"
					onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
				/>
				<!-- Dark gradient -->
				<div class="absolute inset-0 bg-gradient-to-t from-black/92 via-black/20 to-black/10"></div>
				<!-- Status-tinted gradient at bottom -->
				{#if isActive}
					<div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-900/30 to-transparent"></div>
					<!-- Glow ring for active state -->
					<div class="absolute inset-0 rounded-none ring-2 ring-inset ring-emerald-500/20"></div>
				{:else if r.status === 'CONFIRMED'}
					<div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--brand)]/8 to-transparent"></div>
				{/if}

				<!-- Status badge top-left -->
				<div class="absolute left-4 top-4">
					{#if isActive}
						<Badge variant="success" class="backdrop-blur-md bg-emerald-500/20 text-emerald-300 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300">
							<span class="relative flex size-2">
								<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
								<span class="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
							</span>
							EN COURS
						</Badge>
					{:else}
						<Badge variant="ghost" class="backdrop-blur-md bg-black/45 text-white/90 ring-white/10 dark:bg-black/45 dark:text-white/90">
							<span class="size-1.5 rounded-full {DOT_COLORS[r.status]}"></span>
							{statusCfg.label}
						</Badge>
					{/if}
				</div>

				<!-- Vehicle name at bottom -->
				<div class="absolute inset-x-0 bottom-0 p-5">
					<p class="text-2xl font-black text-white drop-shadow-sm">{r.brand} {r.model}</p>
					<p class="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">{r.registration}</p>
				</div>
			</div>

			<!-- ── Scrollable body ────────────────────────────────────────── -->
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">

				<!-- Chips row -->
				<div class="flex flex-wrap items-center gap-2 px-5 pt-4">
					<Badge variant="secondary"><TruckIcon class="size-3 shrink-0" />{CATEGORY_LABELS[r.category] ?? r.category}</Badge>
					<Badge variant="secondary"><ZapIcon class="size-3 shrink-0" />{ENERGY_LABELS[r.energy] ?? r.energy}</Badge>
				</div>

				<!-- Timeline dates -->
				<div class="mt-5 px-5">
					<div class="flex flex-col">
						<!-- Departure -->
						<div class="flex items-start gap-4">
							<div class="relative flex shrink-0 flex-col items-center">
								<div class="flex size-8 items-center justify-center rounded-full bg-[var(--brand)]/15 ring-2 ring-[var(--brand)]/30">
									<div class="size-2.5 rounded-full bg-[var(--brand)]"></div>
								</div>
								<div class="mt-1 h-10 w-px bg-gradient-to-b from-[var(--brand)]/35 to-border/30"></div>
							</div>
							<div class="pb-1 pt-0.5">
								<p class="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Départ</p>
								<p class="mt-0.5 text-sm text-muted-foreground">{dateFmt(r.startDate)}</p>
								<p class="text-3xl font-black tabular-nums leading-tight tracking-tight">{timeFmt(r.startDate)}</p>
							</div>
						</div>

						<!-- Return -->
						<div class="flex items-start gap-4">
							<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
								<div class="size-2.5 rounded-full bg-muted-foreground/35"></div>
							</div>
							<div class="pt-0.5">
								<p class="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Retour</p>
								<p class="mt-0.5 text-sm text-muted-foreground">{dateFmt(r.endDate)}</p>
								<p class="text-3xl font-black tabular-nums leading-tight tracking-tight">{timeFmt(r.endDate)}</p>
							</div>
						</div>
					</div>

					<!-- Duration chip -->
					<div class="mt-3">
						<Badge variant="ghost"><ClockIcon class="size-3.5 shrink-0" />{duration(r.startDate, r.endDate)}</Badge>
					</div>
				</div>

				<!-- Location -->
				{#if r.location}
					<div class="mt-4 flex items-center gap-3.5 px-5">
						<div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted">
							<MapPinIcon class="size-3.5 text-muted-foreground" />
						</div>
						<div>
							<p class="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Lieu</p>
							<p class="text-sm">{r.location}</p>
						</div>
					</div>
				{/if}

				<!-- Purpose + notes -->
				<div class="mx-5 mt-4 overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/30">
					<div class="px-4 py-3.5">
						<p class="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Motif</p>
						<p class="mt-1 text-sm">{r.purpose}</p>
					</div>
					{#if r.notes}
						<div class="border-t border-border/40 px-4 py-3.5">
							<p class="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Notes</p>
							<p class="mt-1 text-sm text-muted-foreground">{r.notes}</p>
						</div>
					{/if}
				</div>

				<div class="h-8"></div>
			</div>

			<!-- ── Footer actions ─────────────────────────────────────────── -->
			<div class="shrink-0 border-t bg-background/95 px-5 py-4 backdrop-blur-sm">
				{#if confirming}
					<div class="flex items-center gap-2">
						<p class="flex-1 text-sm font-medium text-destructive">Confirmer l'annulation ?</p>
						<Button variant="ghost" size="sm" onclick={() => (confirming = false)}>Garder</Button>
						<Button variant="destructive" size="sm" onclick={handleCancel}>Annuler</Button>
					</div>
				{:else}
					<div class="flex gap-3">
						{#if isCancellable}
							<Button variant="destructive" size="lg" class="flex-1" onclick={() => (confirming = true)}>
								Annuler la réservation
							</Button>
						{/if}
						<Button size="lg" class="flex-1" onclick={closePanel}>
							{isCancellable ? 'Fermer' : 'OK'}
						</Button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
{/snippet}

<!-- Mobile: bottom drawer (iOS style) -->
{#if isMobile}
	<Drawer.Root
		open={panelOpen}
		onOpenChange={(o) => { panelOpen = o; if (!o) onClose(); }}
		shouldScaleBackground={false}
	>
		<Drawer.Content
			class="overflow-hidden p-0 data-[vaul-drawer-direction=bottom]:max-h-[92vh] data-[vaul-drawer-direction=bottom]:rounded-t-[28px]"
		>
			{@render inner()}
		</Drawer.Content>
	</Drawer.Root>

<!-- Desktop: side sheet from right -->
{:else}
	<Sheet.Root
		open={panelOpen}
		onOpenChange={(o) => { panelOpen = o; if (!o) onClose(); }}
	>
		<Sheet.Content side="right" class="gap-0 overflow-hidden p-0" showCloseButton={true}>
			{@render inner()}
		</Sheet.Content>
	</Sheet.Root>
{/if}
