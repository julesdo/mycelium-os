<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CarIcon from '@lucide/svelte/icons/car';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import { RESERVATION_STATUS_CONFIG, type ReservationStatus } from './status.js';
	import { cn } from '$lib/utils.js';
	import { getVehicleImageUrl } from '$lib/utils/vehicle-image.js';

	export type ReservationWithDetails = {
		_id: string;
		vehicleId: string;
		startDate: number;
		endDate: number;
		purpose: string;
		status: ReservationStatus;
		notes?: string;
		brand: string;
		model: string;
		registration: string;
		energy: 'THERMAL' | 'HYBRID' | 'ELECTRIC';
		category: 'PASSENGER' | 'UTILITY' | 'TRUCK';
		location: string | null;
	};

	type Props = {
		reservation: ReservationWithDetails;
		onDetails: (id: string) => void;
		onCancel: (id: string) => void;
		hero?: boolean;
	};

	let { reservation, onDetails, onCancel, hero = false }: Props = $props();

	const statusCfg = $derived(RESERVATION_STATUS_CONFIG[reservation.status]);
	const isCancellable = $derived(
		reservation.status === 'PENDING' || reservation.status === 'CONFIRMED'
	);
	const isActive = $derived(reservation.status === 'IN_PROGRESS');

	let confirming = $state(false);
	let imgError = $state(false);
	const imgSrc = $derived(getVehicleImageUrl(reservation.brand, reservation.model));

	function dur(s: number, e: number) {
		const mins = Math.round((e - s) / 60_000);
		if (mins < 60) return `${mins} min`;
		const h = Math.floor(mins / 60), m = mins % 60;
		if (h < 24) return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
		const d = Math.floor(h / 24), rh = h % 24;
		return rh > 0 ? `${d}j ${rh}h` : `${d} j`;
	}

	function dateFmt(ts: number, opts: Intl.DateTimeFormatOptions) {
		return new Date(ts).toLocaleDateString('fr-FR', opts);
	}

	function timeFmt(ts: number) {
		const d = new Date(ts);
		if (d.getHours() === 0 && d.getMinutes() === 0) return null;
		return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	function timeUntil(ts: number): string {
		const diff = ts - Date.now();
		if (diff <= 0) return 'maintenant';
		const mins = Math.floor(diff / 60_000);
		if (mins < 60) return `dans ${mins} min`;
		const hours = Math.floor(mins / 60);
		const rem = mins % 60;
		if (hours < 24) return `dans ${hours}h${rem > 0 ? String(rem).padStart(2, '0') : ''}`;
		return `dans ${Math.floor(hours / 24)}j`;
	}

	function timeUntilEnd(ts: number): string {
		const diff = ts - Date.now();
		if (diff <= 0) return 'terminé';
		const mins = Math.floor(diff / 60_000);
		if (mins < 60) return `encore ${mins} min`;
		const hours = Math.floor(mins / 60);
		const rem = mins % 60;
		return `encore ${hours}h${rem > 0 ? String(rem).padStart(2, '0') : ''}`;
	}

	const startDay  = $derived(dateFmt(reservation.startDate, { weekday: 'short', day: 'numeric', month: 'short' }));
	const startTime = $derived(timeFmt(reservation.startDate));
	const endTime   = $derived(timeFmt(reservation.endDate));
	const duration  = $derived(dur(reservation.startDate, reservation.endDate));

	// Status left-strip colors for the ticket layout
	const statusStrip: Record<ReservationStatus, string> = {
		PENDING:     'bg-amber-400',
		CONFIRMED:   'bg-blue-500',
		IN_PROGRESS: 'bg-emerald-500',
		COMPLETED:   'bg-muted-foreground/25',
		CANCELLED:   'bg-muted-foreground/15'
	};

	// Status dot colors for image overlays
	const dotColor: Record<ReservationStatus, string> = {
		PENDING:     'bg-amber-400',
		CONFIRMED:   'bg-blue-500',
		IN_PROGRESS: 'bg-emerald-500',
		COMPLETED:   'bg-muted-foreground/40',
		CANCELLED:   'bg-muted-foreground/30'
	};

	const energyLabel: Record<string, string> = {
		ELECTRIC: '⚡', HYBRID: '🔋', THERMAL: '⛽'
	};

	const statusBadgeVariant: Record<ReservationStatus, BadgeVariant> = {
		PENDING:     'warning',
		CONFIRMED:   'secondary',
		IN_PROGRESS: 'success',
		COMPLETED:   'ghost',
		CANCELLED:   'ghost'
	};
</script>

<!-- ═══════════════════════════════════════════════════════════════════════════
     HERO CARD — Cinematic full-bleed, used for the first upcoming reservation
 ═══════════════════════════════════════════════════════════════════════════ -->
{#if hero}
<div
	class="group relative w-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-white/5"
	style="height: clamp(220px, 42vw, 380px)"
>
	<!-- Image -->
	<div class="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950">
		{#if !imgError}
			<img
				src={imgSrc}
				alt="{reservation.brand} {reservation.model}"
				class="absolute inset-0 h-full w-full object-cover object-center opacity-65 transition-transform duration-700 group-hover:scale-105"
				onerror={() => (imgError = true)}
				loading="lazy"
			/>
		{:else}
			<div class="absolute inset-0 flex items-center justify-center">
				<CarIcon class="size-20 text-white/10" />
			</div>
		{/if}
	</div>

	<!-- Gradient overlays -->
	<div class="absolute inset-0 bg-gradient-to-t from-black/92 via-black/20 to-transparent"></div>
	<div class="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>

	<!-- Active ring pulse -->
	{#if isActive}
		<div class="absolute inset-0 rounded-3xl ring-2 ring-inset ring-emerald-500/20"></div>
	{/if}

	<!-- Status chip — top left -->
	<div class="absolute left-4 top-4">
		{#if isActive}
			<div class="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5 backdrop-blur-md ring-1 ring-emerald-500/30">
				<span class="relative flex size-2">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
					<span class="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
				</span>
				<span class="text-xs font-bold tracking-wide text-emerald-300">EN COURS</span>
			</div>
		{:else}
			<div class="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-md ring-1 ring-white/10">
				<span class="size-1.5 rounded-full {dotColor[reservation.status]}"></span>
				<span class="text-xs font-semibold text-white/90">{statusCfg.label}</span>
			</div>
		{/if}
	</div>

	<!-- Countdown pill — top right -->
	{#if reservation.status !== 'COMPLETED' && reservation.status !== 'CANCELLED'}
		<div class="absolute right-4 top-4">
			<div class="rounded-full bg-[var(--brand)]/90 px-3 py-1.5 backdrop-blur-md">
				<span class="text-xs font-bold text-[var(--brand-foreground)]">
					{isActive ? timeUntilEnd(reservation.endDate) : timeUntil(reservation.startDate)}
				</span>
			</div>
		</div>
	{/if}

	<!-- Bottom content -->
	<div class="absolute inset-x-0 bottom-0 p-5 sm:p-6">
		<div class="flex items-end justify-between gap-4">
			<div class="min-w-0 flex-1">
				<p class="truncate text-2xl font-bold leading-tight text-white drop-shadow-sm md:text-3xl">
					{reservation.brand} {reservation.model}
				</p>
				<p class="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/45">
					{reservation.registration} · {energyLabel[reservation.energy] ?? ''} {reservation.energy}
				</p>
				<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
					<span class="flex items-center gap-1.5 text-sm text-white/80">
						<CalendarIcon class="size-3.5 shrink-0 text-white/45" />
						{startDay}{startTime ? ` · ${startTime}` : ''}{endTime ? ` → ${endTime}` : ''}
						<span class="ml-1 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">{duration}</span>
					</span>
					{#if reservation.location}
						<span class="flex items-center gap-1.5 text-sm text-white/80">
							<MapPinIcon class="size-3.5 shrink-0 text-white/45" />{reservation.location}
						</span>
					{/if}
				</div>
			</div>

			<!-- Actions -->
			<div class="flex shrink-0 flex-col items-end gap-2.5">
				{#if confirming}
					<div class="flex flex-col items-end gap-2">
						<span class="text-xs font-medium text-red-300">Confirmer ?</span>
						<div class="flex gap-2">
							<Button size="sm" variant="outline"
								class="border-white/15 bg-white/10 text-white hover:bg-white/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
								onclick={() => (confirming = false)}>
								Garder
							</Button>
							<Button size="sm" variant="danger"
								class="bg-red-500/80 hover:bg-red-500/95"
								onclick={() => { onCancel(reservation._id); confirming = false; }}>
								Annuler
							</Button>
						</div>
					</div>
				{:else}
					<Button size="sm" variant="outline"
						class="border-white/20 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25 dark:border-white/20 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
						onclick={() => onDetails(reservation._id)}>
						Détails <ChevronRightIcon class="size-4" />
					</Button>
					{#if isCancellable}
						<Button size="xs" variant="ghost"
							class="text-white/35 hover:bg-white/10 hover:text-red-300"
							onclick={() => (confirming = true)}>
							Annuler
						</Button>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>

{:else}
<!-- ═══════════════════════════════════════════════════════════════════════════
     TICKET CARD
     Mobile  → horizontal: [image 96px square] [details]
     sm+     → vertical:   [image 16/9] [details]
     The two layouts share the same element tree; CSS handles the switch.
 ═══════════════════════════════════════════════════════════════════════════ -->
<div
	data-slot="card"
	class={cn(
		'group relative flex flex-row overflow-hidden rounded-2xl bg-card transition-all duration-200',
		'sm:flex-col'
	)}
>
	<div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/8"></div>

	<!-- ── Status strip (mobile only, hidden on sm+) ── -->
	<div class={cn('w-[3px] shrink-0 sm:hidden', statusStrip[reservation.status])}></div>

	<!-- ── Image zone ── -->
	<div class={cn(
		'relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950',
		'w-24 sm:w-auto sm:aspect-[16/9]'
	)}>
		{#if !imgError}
			<img
				src={imgSrc}
				alt="{reservation.brand} {reservation.model}"
				class="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
				onerror={() => (imgError = true)}
				loading="lazy"
			/>
		{:else}
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/20">
				<CarIcon class="size-6 sm:size-8" />
			</div>
		{/if}

		<!-- Gradient overlay (stronger on desktop for text legibility) -->
		<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

		<!-- Glass highlights sur fond sombre -->
		<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
		<div class="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"></div>

		<!-- Status badge — desktop only (overlaid on image) -->
		<div class="absolute left-2.5 top-2.5 hidden sm:block">
			{#if isActive}
				<div class="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 backdrop-blur-sm ring-1 ring-emerald-500/30">
					<span class="relative flex size-1.5">
						<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
						<span class="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
					</span>
					<span class="text-[10px] font-bold text-emerald-300">En cours</span>
				</div>
			{:else}
				<div class="flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
					<span class="size-1.5 rounded-full {dotColor[reservation.status]}"></span>
					<span class="text-[10px] font-semibold text-white/90">{statusCfg.label}</span>
				</div>
			{/if}
		</div>

		<!-- Vehicle name + registration — desktop (overlaid at bottom) -->
		<div class="absolute inset-x-0 bottom-0 hidden p-3 sm:block">
			<p class="text-sm font-bold leading-tight text-white drop-shadow">{reservation.brand} {reservation.model}</p>
			<p class="font-mono text-[9px] uppercase tracking-widest text-white/50">{reservation.registration}</p>
		</div>
	</div>

	<!-- ── Content ── -->
	<div class="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-3.5">

		<!-- Mobile header: vehicle name + status -->
		<div class="flex items-start justify-between gap-2 sm:hidden">
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-bold leading-tight">{reservation.brand} {reservation.model}</p>
				<p class="font-mono text-[10px] text-muted-foreground/60">{reservation.registration}</p>
			</div>
			<!-- Mobile status chip -->
			{#if isActive}
				<Badge variant="success" class="shrink-0">
					<span class="size-1.5 rounded-full bg-emerald-500"></span>
					En cours
				</Badge>
			{:else}
				<Badge variant={statusBadgeVariant[reservation.status]} class="shrink-0">{statusCfg.label}</Badge>
			{/if}
		</div>

		<!-- Date + duration -->
		<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
			<CalendarIcon class="size-3 shrink-0" />
			<span class="truncate">
				{startDay}{startTime ? ` · ${startTime}` : ''}{endTime ? ` → ${endTime}` : ''}
			</span>
			<span class="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/60 sm:hidden">{duration}</span>
		</div>

		<!-- Location -->
		{#if reservation.location}
			<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
				<MapPinIcon class="size-3 shrink-0" />
				<span class="truncate">{reservation.location}</span>
			</div>
		{/if}

		<!-- Purpose (desktop only — too verbose on mobile) -->
		<p class="hidden line-clamp-1 text-xs text-foreground/50 sm:block">{reservation.purpose}</p>

		<!-- Countdown (mobile: under location, desktop: footer) -->
		{#if reservation.status === 'CONFIRMED' || reservation.status === 'PENDING' || reservation.status === 'IN_PROGRESS'}
			<p class="text-[11px] font-semibold text-[var(--brand-foreground)] dark:text-[var(--brand)]">
				{isActive ? timeUntilEnd(reservation.endDate) : timeUntil(reservation.startDate)}
			</p>
		{/if}

		<!-- Actions -->
		<div class={cn('mt-auto', 'sm:border-t sm:border-border/50 sm:pt-2.5')}>
			{#if confirming}
				<div class="flex items-center gap-1.5 rounded-xl bg-destructive/8 px-2.5 py-2">
					<span class="flex-1 text-xs font-medium text-destructive">Annuler ?</span>
					<Button variant="ghost" size="xs" onclick={() => (confirming = false)}>Non</Button>
					<Button size="xs" class="border-0 bg-destructive/15 text-destructive hover:bg-destructive/25"
						onclick={() => { onCancel(reservation._id); confirming = false; }}>Oui</Button>
				</div>
			{:else}
				<div class="flex items-center justify-between gap-1">
					{#if isCancellable}
						<Button variant="ghost" size="xs"
							class="text-destructive/60 hover:bg-destructive/8 hover:text-destructive"
							onclick={() => (confirming = true)}>Annuler</Button>
					{:else}
						<span></span>
					{/if}
					<Button variant="ghost" size="xs"
						class="gap-1 font-semibold text-primary hover:bg-primary/8"
						onclick={() => onDetails(reservation._id)}>
						Voir <ChevronRightIcon class="size-3" />
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}
