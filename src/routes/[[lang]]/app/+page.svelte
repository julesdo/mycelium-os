<script lang="ts">
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { getVehicleImageUrl } from '$lib/utils/vehicle-image';
	import { RESERVATION_STATUS_CONFIG, type ReservationStatus } from '$lib/components/reservations/status';
	import ReservationDetailSheet from '$lib/components/reservations/ReservationDetailSheet.svelte';
	import type { ReservationWithDetails } from '$lib/components/reservations/ReservationCard.svelte';
	import type { Id } from '$lib/convex/_generated/dataModel';

	import PlusIcon from '@lucide/svelte/icons/plus';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CarIcon from '@lucide/svelte/icons/car';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { copilot } from '$lib/components/copilot/copilot-store.svelte.js';

	// ── Data ────────────────────────────────────────────────────────────────────
	const client = useConvexClient();
	const upcomingQuery = useQuery(api.reservations.listMyReservationsWithDetails, { tab: 'upcoming' });
	const historyQuery  = useQuery(api.reservations.listMyReservationsWithDetails, { tab: 'history' });

	const viewer = $derived(page.data?.viewer as { name?: string } | null);
	const firstName = $derived(viewer?.name?.split(' ')[0] ?? '');

	// ── Live clock ──────────────────────────────────────────────────────────────
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => { now = Date.now(); }, 30_000);
		return () => clearInterval(id);
	});

	const greeting = $derived(new Date(now).getHours() < 18 ? 'Bonjour' : 'Bonsoir');
	const dateLabel = $derived(
		new Date(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
	);

	// ── Reservation slices ───────────────────────────────────────────────────────
	const activeRes    = $derived(upcomingQuery.data?.find((r) => r.status === 'IN_PROGRESS') ?? null);
	const confirmedRes = $derived(upcomingQuery.data?.find((r) => r.status === 'CONFIRMED') ?? null);
	const pendingRes   = $derived(upcomingQuery.data?.find((r) => r.status === 'PENDING') ?? null);
	const heroRes      = $derived(activeRes ?? confirmedRes ?? pendingRes ?? null);
	const miniCards    = $derived((upcomingQuery.data ?? []).filter((r) => r._id !== heroRes?._id).slice(0, 5));
	const tripsTotal   = $derived((historyQuery.data ?? []).length);

	let selectedReservation = $state<ReservationWithDetails | null>(null);

	async function handleCancel(id: string) {
		await client.mutation(api.reservations.cancelReservation, {
			reservationId: id as Id<'reservations'>
		});
		selectedReservation = null;
	}

	// ── Helpers ─────────────────────────────────────────────────────────────────
	function timeFmt(ts: number) {
		return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}
	function dateFmt(ts: number) {
		return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
	}
	function timeUntil(ts: number): string {
		const diff = ts - now;
		if (diff <= 0) return 'maintenant';
		const mins = Math.floor(diff / 60_000);
		if (mins < 60) return `${mins}min`;
		const hours = Math.floor(mins / 60);
		const rem = mins % 60;
		if (hours < 24) return `${hours}h${rem > 0 ? String(rem).padStart(2, '0') : ''}`;
		return `${Math.floor(hours / 24)}j`;
	}
	function timeUntilEnd(ts: number): string {
		const diff = ts - now;
		if (diff <= 0) return 'terminé';
		const mins = Math.floor(diff / 60_000);
		if (mins < 60) return `${mins}min`;
		const hours = Math.floor(mins / 60);
		const rem = mins % 60;
		return `${hours}h${rem > 0 ? String(rem).padStart(2, '0') : ''}`;
	}

	const dotColor: Record<ReservationStatus, string> = {
		PENDING:     'bg-amber-400',
		CONFIRMED:   'bg-blue-500',
		IN_PROGRESS: 'bg-emerald-500',
		COMPLETED:   'bg-muted-foreground/40',
		CANCELLED:   'bg-muted-foreground/30'
	};
</script>

<SEOHead title="Accueil — Mycelium" description="Votre espace de gestion de véhicules de flotte." />

<div class="flex flex-col gap-5 px-4 pb-24 pt-5 lg:pb-10 lg:px-6 xl:px-8 2xl:px-16">

	<!-- ── Greeting ──────────────────────────────────────────────────────────── -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-black tracking-tight sm:text-3xl">
				{greeting}{firstName ? `, ${firstName}` : ''}&nbsp;<span aria-hidden="true" class="inline-block origin-bottom-right animate-[hand-wave_1s_ease-in-out_1]">👋</span>
			</h1>
			<p class="mt-0.5 text-sm capitalize text-muted-foreground">{dateLabel}</p>
		</div>

		{#if !upcomingQuery.isLoading && (upcomingQuery.data?.length ?? 0) > 0}
			<Badge variant="success" class="mt-1">
				<span class="relative flex size-1.5">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
					<span class="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
				</span>
				{upcomingQuery.data!.length} à venir
			</Badge>
		{/if}
	</div>

	<!-- ══ Desktop: 2-column grid ══════════════════════════════════════════════ -->
	<div class="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px]">

		<!-- ── Left column ────────────────────────────────────────────────── -->
		<div class="flex flex-col gap-4">

			<!-- ── Hero card ────────────────────────────────────────────── -->
			{#if upcomingQuery.isLoading}
				<div class="animate-pulse rounded-3xl bg-muted" style="height: clamp(220px, 42vw, 340px)"></div>

			{:else if heroRes}
				{@const isActive = heroRes.status === 'IN_PROGRESS'}
				{@const imgSrc = getVehicleImageUrl(heroRes.brand, heroRes.model)}

				<button
					type="button"
					class="group relative w-full overflow-hidden text-left transition-transform duration-300 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					style="border-radius: 28px; height: clamp(220px, 42vw, 340px); {isActive ? 'box-shadow: 0 0 0 2px oklch(0.723 0.191 149.579 / 0.35), 0 8px 32px oklch(0 0 0 / 0.45)' : 'box-shadow: 0 8px 32px oklch(0 0 0 / 0.35), 0 1px 0 oklch(1 0 0 / 0.04)'}"
					onclick={() => (selectedReservation = heroRes)}
				>
					<!-- Background image -->
					<div class="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950">
						<img
							src={imgSrc}
							alt="{heroRes.brand} {heroRes.model}"
							class="absolute inset-0 h-full w-full object-cover object-center opacity-55 transition-transform duration-700 group-hover:scale-105"
							onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
							loading="eager"
						/>
					</div>

					<!-- Base gradient -->
					<div class="absolute inset-0 bg-gradient-to-t from-black/94 via-black/25 to-transparent"></div>
					<div class="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>

					<!-- Active state: emerald glow + brand accent at bottom -->
					{#if isActive}
						<div class="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-emerald-900/35 to-transparent"></div>
					{:else if heroRes.status === 'CONFIRMED'}
						<!-- Brand yellow gradient accent for confirmed -->
						<div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--brand)]/12 to-transparent"></div>
					{/if}

					<!-- Status badge top-left -->
					<div class="absolute left-5 top-5">
						{#if isActive}
							<div class="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1.5 backdrop-blur-md ring-1 ring-emerald-500/25">
								<span class="relative flex size-2">
									<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
									<span class="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
								</span>
								<span class="text-xs font-black tracking-wider text-emerald-300">EN COURS</span>
							</div>
						{:else}
							<div class="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 backdrop-blur-md ring-1 ring-white/10">
								<span class="size-1.5 rounded-full {dotColor[heroRes.status]}"></span>
								<span class="text-xs font-semibold text-white/90">{RESERVATION_STATUS_CONFIG[heroRes.status].label}</span>
							</div>
						{/if}
					</div>

					<!-- Countdown top-right -->
					{#if heroRes.status !== 'COMPLETED' && heroRes.status !== 'CANCELLED'}
						<div class="absolute right-5 top-5">
							<div class="rounded-full bg-[var(--brand)]/95 px-3.5 py-1.5 backdrop-blur-md shadow-sm">
								<span class="text-xs font-black text-[var(--brand-foreground)]">
									{isActive ? `encore ${timeUntilEnd(heroRes.endDate)}` : `dans ${timeUntil(heroRes.startDate)}`}
								</span>
							</div>
						</div>
					{/if}

					<!-- Bottom info -->
					<div class="absolute inset-x-0 bottom-0 p-5 sm:p-6">
						<div class="flex items-end justify-between gap-4">
							<div class="min-w-0 flex-1">
								<p class="truncate text-2xl font-black leading-tight text-white md:text-3xl">
									{heroRes.brand} {heroRes.model}
								</p>
								<p class="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">{heroRes.registration}</p>
								<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
									<span class="flex items-center gap-1.5 text-sm text-white/75">
										<CalendarIcon class="size-3.5 shrink-0 text-white/40" />
										{dateFmt(heroRes.startDate)} · {timeFmt(heroRes.startDate)} → {timeFmt(heroRes.endDate)}
									</span>
									{#if heroRes.location}
										<span class="flex items-center gap-1.5 text-sm text-white/75">
											<MapPinIcon class="size-3.5 shrink-0 text-white/40" />{heroRes.location}
										</span>
									{/if}
								</div>
							</div>
							<div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15 backdrop-blur-sm transition-all group-hover:bg-white/22 group-hover:ring-white/25">
								<ChevronRightIcon class="size-5 text-white" />
							</div>
						</div>
					</div>
				</button>

			{:else}
				<!-- Empty state — no upcoming reservations -->
				<div class="flex flex-col items-center gap-5 border border-dashed border-border bg-muted/15 px-6 py-14 text-center" style="border-radius: 28px;">
					<div class="flex size-16 items-center justify-center rounded-2xl bg-muted shadow-glass-card">
						<CarIcon class="size-7 text-muted-foreground/40" />
					</div>
					<div>
						<p class="text-base font-bold">Aucun trajet à venir</p>
						<p class="mt-1 text-sm text-muted-foreground">Réservez un véhicule pour démarrer.</p>
					</div>
					<a
						href={resolve(localizedHref('/app/reservations/new'))}
						class="inline-flex h-11 items-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-bold text-background transition-opacity hover:opacity-90"
					>
						<PlusIcon class="size-4" />Réserver
					</a>
				</div>
			{/if}

			<!-- ── Upcoming mini cards ─────────────────────────────────── -->
			{#if miniCards.length > 0}
				<div class="-mx-4 flex gap-3 overflow-x-auto pb-1 pl-4 pr-4 snap-scroll-x lg:mx-0 lg:flex-wrap lg:pl-0 lg:pr-0 lg:pb-0">
					{#each miniCards as res (res._id)}
						{@const imgSrc = getVehicleImageUrl(res.brand, res.model)}
						<button
							type="button"
							class="group relative flex w-[188px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-glass-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] lg:w-auto lg:min-w-[170px] lg:max-w-[200px]"
							onclick={() => (selectedReservation = res)}
						>
							<!-- Glass reflection line -->
							<div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/14"></div>
							<div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
								<img src={imgSrc} alt="{res.brand} {res.model}"
									class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
									onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
									loading="lazy" />
								<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
								<div class="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 backdrop-blur-sm">
									<span class="size-1.5 rounded-full {dotColor[res.status]}"></span>
									<span class="text-[9px] font-bold text-white/90">{RESERVATION_STATUS_CONFIG[res.status].label}</span>
								</div>
								<div class="absolute inset-x-0 bottom-0 p-2.5">
									<p class="truncate text-xs font-bold text-white">{res.brand} {res.model}</p>
								</div>
							</div>
							<div class="flex flex-col gap-1 p-2.5">
								<div class="flex items-center gap-1 text-xs text-muted-foreground">
									<ClockIcon class="size-3 shrink-0" />
									<span class="truncate">{dateFmt(res.startDate)} · {timeFmt(res.startDate)}</span>
								</div>
								{#if res.location}
									<div class="flex items-center gap-1 text-xs text-muted-foreground">
										<MapPinIcon class="size-3 shrink-0" />
										<span class="truncate">{res.location}</span>
									</div>
								{/if}
								<p class="mt-0.5 text-[11px] font-black text-[var(--brand-foreground)] dark:text-[var(--brand)]">
									dans {timeUntil(res.startDate)}
								</p>
							</div>
						</button>
					{/each}
				</div>
			{/if}

		</div><!-- /left column -->

		<!-- ── Right column ───────────────────────────────────────────────── -->
		<div class="flex flex-col gap-4">

			<!-- Primary CTA — brand yellow (glass-metal effect) -->
			<a
				href={resolve(localizedHref('/app/reservations/new'))}
				class="group relative flex h-14 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-[var(--brand)] px-5 text-base font-black text-[var(--brand-foreground)] transition-all hover:opacity-95 active:scale-[0.98] lg:h-12"
				style="box-shadow: 0 4px 20px oklch(0.92 0.23 103 / 0.30), 0 1px 2px oklch(0 0 0 / 0.12), inset 0 1px 0 oklch(1 0 0 / 0.35)"
			>
				<!-- Glass reflection line -->
				<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
				<PlusIcon class="size-5 shrink-0 transition-transform group-hover:rotate-90 duration-200" />
				Réserver un véhicule
			</a>

			<!-- Secondary CTA — glass surface -->
			<a
				href={resolve(localizedHref('/app/reservations'))}
				class="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border bg-card px-5 text-sm font-semibold shadow-glass-outline transition-all hover:bg-muted/30 active:scale-[0.98]"
			>
				<!-- Glass reflection line -->
				<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/15"></div>
				<CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
				Mes trajets
				<ArrowRightIcon class="ml-auto size-4 text-muted-foreground/50" />
			</a>

			<!-- Stats -->
			{#if !upcomingQuery.isLoading}
				<div class="grid grid-cols-2 gap-3 lg:grid-cols-1">
					<!-- À venir — glass card with brand accent -->
					<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-glass-card">
						<!-- White glass reflection -->
						<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>
						<!-- Brand accent glow at top -->
						<div class="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[var(--brand)]/10 to-transparent"></div>
						<p class="relative text-xs font-semibold text-muted-foreground">À venir</p>
						<p class="relative mt-1 text-3xl font-black tabular-nums tracking-tight text-[var(--brand-foreground)] dark:text-[var(--brand)]">
							{upcomingQuery.data?.length ?? 0}
						</p>
						<p class="relative mt-0.5 text-xs text-muted-foreground">
							réservation{(upcomingQuery.data?.length ?? 0) !== 1 ? 's' : ''}
						</p>
					</div>
					<!-- Effectués — glass card -->
					<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-glass-card">
						<!-- White glass reflection -->
						<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>
						<p class="relative text-xs font-semibold text-muted-foreground">Effectués</p>
						<p class="relative mt-1 text-3xl font-black tabular-nums tracking-tight">{tripsTotal}</p>
						<p class="relative mt-0.5 text-xs text-muted-foreground">trajet{tripsTotal !== 1 ? 's' : ''} au total</p>
					</div>
				</div>
			{/if}

			<!-- Copilote IA -->
			<button
				type="button"
				onclick={() => copilot.open('concierge')}
				class="group relative w-full overflow-hidden rounded-2xl border border-[var(--brand)]/20 bg-gradient-to-br from-[var(--brand)]/8 via-muted/20 to-muted/10 px-4 py-4 shadow-glass-card transition-all hover:border-[var(--brand)]/40 hover:from-[var(--brand)]/12 active:scale-[0.99]"
			>
				<!-- Glass reflection line -->
				<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>
				<div class="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-20" style="background: radial-gradient(circle, var(--brand) 0%, transparent 70%)"></div>
				<div class="relative flex items-center gap-3">
					<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/15 ring-1 ring-[var(--brand)]/25 transition-colors group-hover:bg-[var(--brand)]/25">
						<SparklesIcon class="size-5 text-[var(--brand-foreground)] dark:text-[var(--brand)]" />
					</div>
					<div class="flex-1 min-w-0 text-left">
						<p class="text-sm font-bold">Concierge IA</p>
						<p class="truncate text-xs text-muted-foreground">Réservez en langage naturel · Cmd+K</p>
					</div>
					<ArrowRightIcon class="size-4 shrink-0 text-[var(--brand-foreground)]/50 dark:text-[var(--brand)]/50 transition-transform group-hover:translate-x-0.5 dark:text-[var(--brand)]" />
				</div>
			</button>

		</div><!-- /right column -->
	</div><!-- /grid -->

</div>

<ReservationDetailSheet
	reservation={selectedReservation}
	onClose={() => (selectedReservation = null)}
	onCancel={handleCancel}
/>
