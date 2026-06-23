<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import type { Id } from '$lib/convex/_generated/dataModel.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { toast } from 'svelte-sonner';
	import { fly, fade } from 'svelte/transition';
	import { localizedHref } from '$lib/utils/i18n.js';
	import VehicleThumb from '$lib/components/reservations/VehicleThumb.svelte';
	import { format, addDays, setHours, setMinutes, startOfDay } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import CarIcon from '@lucide/svelte/icons/car';
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import XIcon from '@lucide/svelte/icons/x';

	// ─── Types ─────────────────────────────────────────────────────────────────
	type Vehicle = {
		_id: string;
		brand: string;
		model: string;
		registration: string;
		energy: 'THERMAL' | 'HYBRID' | 'ELECTRIC';
		category: 'PASSENGER' | 'UTILITY' | 'TRUCK';
		location: string | null;
	};

	// ─── Stepper ───────────────────────────────────────────────────────────────
	let step = $state(1);
	const TOTAL = 4;
	let slideDir = $state(1);

	const STEPS: { label: string; sublabel: string }[] = [
		{ label: 'Dates & lieu', sublabel: "Quand et d'où ?" },
		{ label: 'Véhicule',     sublabel: 'Choisir le véhicule' },
		{ label: 'Motif',        sublabel: 'Objet du déplacement' },
		{ label: 'Confirmation', sublabel: 'Vérifier et confirmer' }
	];

	// ─── Step 1 — Dates ────────────────────────────────────────────────────────
	let startStr = $state('');
	let endStr   = $state('');

	const startTs = $derived(startStr ? new Date(startStr).getTime() : null);
	const endTs   = $derived(endStr   ? new Date(endStr).getTime()   : null);
	const datesOk = $derived(
		startTs !== null && endTs !== null &&
		!isNaN(startTs) && !isNaN(endTs) && endTs > startTs
	);

	function toLocal(d: Date) { return format(d, "yyyy-MM-dd'T'HH:mm"); }

	function preset(sh: number, eh: number, dOffset = 0) {
		const b = addDays(new Date(), dOffset);
		startStr = toLocal(setMinutes(setHours(startOfDay(b), sh), 0));
		endStr   = toLocal(setMinutes(setHours(startOfDay(b), eh), 0));
	}
	function presetRange(sh: number, sd: number, eh: number, ed: number) {
		startStr = toLocal(setMinutes(setHours(startOfDay(addDays(new Date(), sd)), sh), 0));
		endStr   = toLocal(setMinutes(setHours(startOfDay(addDays(new Date(), ed)), eh), 0));
	}

	function durationLabel(s: number, e: number) {
		const mins = Math.round((e - s) / 60_000);
		if (mins < 60) return `${mins} min`;
		const h = Math.floor(mins / 60), m = mins % 60;
		if (h < 24) return m > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${h}h`;
		const d = Math.floor(h / 24), rh = h % 24;
		return rh > 0 ? `${d}j ${rh}h` : `${d} jour${d > 1 ? 's' : ''}`;
	}

	function dateShort(ts: number) {
		const d = new Date(ts);
		if (d.getHours() === 0 && d.getMinutes() === 0) return format(d, 'd MMM', { locale: fr });
		return format(d, "d MMM 'à' HH:mm", { locale: fr });
	}

	// ─── Vehicle query (pre-loads as soon as dates are valid) ──────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehiclesQ = useQuery((api as any).reservations.searchAvailableVehicles, () =>
		datesOk ? { startDate: startTs!, endDate: endTs! } : 'skip'
	);
	const allVehicles = $derived((vehiclesQ.data as Vehicle[] | undefined) ?? []);

	// Locations derived from available vehicles
	const availableLocations = $derived(
		[...new Set(allVehicles.map(v => v.location).filter(Boolean) as string[])].sort()
	);

	// ─── Location pre-selection (step 1) ───────────────────────────────────────
	let preselectedLocation = $state<string | 'all'>('all');

	// ─── Step 2 — Filters ──────────────────────────────────────────────────────
	let searchQ    = $state('');
	let fEnergy    = $state<'all'|'THERMAL'|'HYBRID'|'ELECTRIC'>('all');
	let fCategory  = $state<'all'|'PASSENGER'|'UTILITY'|'TRUCK'>('all');
	let fLocation  = $state<string>('all');
	let showFilters = $state(false); // mobile filter panel

	$effect(() => {
		// Sync preselected location from step 1 into step 2 filter
		if (step === 2) fLocation = preselectedLocation;
	});

	const filteredVehicles = $derived(allVehicles.filter(v => {
		if (fEnergy   !== 'all' && v.energy   !== fEnergy)   return false;
		if (fCategory !== 'all' && v.category !== fCategory) return false;
		if (fLocation !== 'all' && v.location !== fLocation) return false;
		if (searchQ && !`${v.brand} ${v.model}`.toLowerCase().includes(searchQ.toLowerCase())) return false;
		return true;
	}));

	const activeFilterCount = $derived(
		(fEnergy !== 'all' ? 1 : 0) +
		(fCategory !== 'all' ? 1 : 0) +
		(fLocation !== 'all' ? 1 : 0)
	);

	function clearFilters() {
		fEnergy = 'all'; fCategory = 'all'; fLocation = 'all'; searchQ = '';
	}

	// ─── Vehicle selection ─────────────────────────────────────────────────────
	let pickedId      = $state('');
	let pickedVehicle = $state<Vehicle | null>(null);

	$effect(() => {
		if (pickedId) pickedVehicle = allVehicles.find(v => v._id === pickedId) ?? pickedVehicle;
	});

	// ─── Step 3 — Purpose ──────────────────────────────────────────────────────
	let purpose = $state('');
	let notes   = $state('');

	const SUGGESTIONS = [
		'Visite client', 'Déplacement professionnel', 'Formation',
		'Réunion fournisseur', 'Intervention terrain', 'Séminaire'
	];

	// ─── Configs ───────────────────────────────────────────────────────────────
	const ENERGY_CFG: Record<string, { label: string; cls: string; activeCls: string }> = {
		THERMAL:  { label: 'Thermique',  cls: 'bg-muted text-muted-foreground', activeCls: 'bg-slate-700 text-white' },
		HYBRID:   { label: 'Hybride',    cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', activeCls: 'bg-blue-600 text-white' },
		ELECTRIC: { label: 'Électrique', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', activeCls: 'bg-emerald-600 text-white' }
	};

	const CATEGORY_CFG: Record<string, { label: string }> = {
		PASSENGER: { label: 'Tourisme' },
		UTILITY:   { label: 'Utilitaire' },
		TRUCK:     { label: 'Camion' }
	};

	// ─── Navigation ────────────────────────────────────────────────────────────
	function next() { slideDir = 1;  step = Math.min(step + 1, TOTAL); }
	function back() {
		if (step === 1) goto(resolve(localizedHref('/app/reservations')));
		else { slideDir = -1; step--; }
	}

	// ─── Submit ────────────────────────────────────────────────────────────────
	const client = useConvexClient();
	let submitting = $state(false);

	async function submit() {
		if (!datesOk || !pickedId || !purpose.trim()) return;
		submitting = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.createReservation, {
				vehicleId: pickedId as Id<'vehicles'>,
				startDate: startTs!,
				endDate: endTs!,
				purpose: purpose.trim(),
				notes: notes.trim() || undefined
			});
			toast.success('Réservation confirmée !');
			goto(resolve(localizedHref('/app/reservations')));
		} catch (err) {
			const code = (err as { data?: { code?: string } }).data?.code;
			toast.error(
				code === 'VEHICLE_NOT_AVAILABLE'
					? "Ce véhicule vient d'être pris. Choisissez-en un autre."
					: 'Erreur inattendue. Veuillez réessayer.'
			);
			if (code === 'VEHICLE_NOT_AVAILABLE') {
				slideDir = -1; step = 2; pickedId = ''; pickedVehicle = null;
			}
		} finally {
			submitting = false;
		}
	}
</script>

<!-- ░░ Page wrapper — fullControl gives us h-full overflow-hidden ░░░░░░░░░░░░ -->
<div class="flex h-full flex-col overflow-hidden bg-background">

	<!-- ══ HEADER ══════════════════════════════════════════════════════════════ -->
	<header class="z-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-md">
		<div class="px-4 sm:px-6 lg:px-8">

			<!-- Row 1: back + title + count -->
			<div class="flex items-center gap-3 py-3.5">
				<button
					onclick={back}
					class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Retour"
				>
					<ArrowLeftIcon class="size-4" />
				</button>
				<div class="flex min-w-0 flex-1 items-baseline justify-between gap-4">
					<span class="truncate text-sm font-semibold">Nouvelle réservation</span>
					<span class="shrink-0 text-xs text-muted-foreground">{step} / {TOTAL}</span>
				</div>
			</div>

			<!-- Row 2: step circles + connecting lines -->
			<div class="relative flex items-center pb-4">
				{#each STEPS as s, i}
					{@const n = i + 1}
					{@const done = n < step}
					{@const active = n === step}

					<!-- Step node -->
					<div class="relative flex shrink-0 flex-col items-center">
						<div class="flex size-7 items-center justify-center rounded-full border-2 transition-all duration-300
							{done   ? 'border-primary bg-primary text-primary-foreground' : ''}
							{active ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/15' : ''}
							{!done && !active ? 'border-border bg-background text-muted-foreground' : ''}
						">
							{#if done}
								<CheckIcon class="size-3.5" strokeWidth={3} />
							{:else}
								<span class="text-[11px] font-bold">{n}</span>
							{/if}
						</div>
						<!-- Label -->
						<span class="absolute top-9 hidden whitespace-nowrap text-[10px] font-semibold sm:block
							{active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/40'}
						">
							{s.label}
						</span>
					</div>

					<!-- Connector line (between nodes) -->
					{#if i < STEPS.length - 1}
						<div class="mx-1 h-0.5 flex-1 rounded-full transition-all duration-500
							{n < step ? 'bg-primary' : 'bg-border'}
						"></div>
					{/if}
				{/each}
			</div>
			<!-- Space for labels on desktop -->
			<div class="hidden h-5 sm:block"></div>
		</div>
	</header>

	<!-- ══ BODY ════════════════════════════════════════════════════════════════ -->

	<!-- Step 1 — Dates & Lieu ───────────────────────────────────────────────── -->
	{#if step === 1}
		<div class="flex-1 overflow-y-auto" in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}>
			<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-8">

					<div>
						<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Quand partez-vous ?</h1>
						<p class="mt-1.5 text-muted-foreground">Sélectionnez vos dates de départ et de retour.</p>
					</div>

					<!-- Date grid -->
					<div class="grid gap-4 sm:grid-cols-2">
						<label class="flex flex-col gap-2">
							<span class="flex items-center gap-2 text-sm font-semibold">
								<CalendarIcon class="size-4 text-primary" />Départ
							</span>
							<Input type="datetime-local" bind:value={startStr} class="h-12 px-4" />
						</label>
						<label class="flex flex-col gap-2">
							<span class="flex items-center gap-2 text-sm font-semibold">
								<CalendarIcon class="size-4 text-muted-foreground" />Retour
							</span>
							<Input type="datetime-local" bind:value={endStr} min={startStr} class="h-12 px-4" />
						</label>
					</div>

					{#if startStr && endStr && !datesOk}
						<p class="rounded-lg bg-destructive/8 px-4 py-2.5 text-sm text-destructive">
							La date de retour doit être après le départ.
						</p>
					{/if}

					<!-- Quick presets -->
					<div class="flex flex-col gap-2.5">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Raccourcis</span>
						<div class="flex flex-wrap gap-2">
							{#each [
								{ label: "Aujourd'hui (8h–18h)", fn: () => preset(8, 18, 0) },
								{ label: 'Demain (8h–18h)',      fn: () => preset(8, 18, 1) },
								{ label: 'Semaine prochaine',    fn: () => presetRange(8, 1, 18, 5) }
							] as p}
								<button type="button" onclick={p.fn}
									class="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
									{p.label}
								</button>
							{/each}
						</div>
					</div>

					<!-- Duration badge -->
					{#if datesOk}
						<div class="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3" in:fade={{ duration: 200 }}>
							<ClockIcon class="size-4 shrink-0 text-primary" />
							<span class="text-sm font-medium text-primary">
								Durée : <strong>{durationLabel(startTs!, endTs!)}</strong>
							</span>
							<span class="ml-auto text-xs text-muted-foreground">
								{dateShort(startTs!)} → {dateShort(endTs!)}
							</span>
						</div>
					{/if}

					<!-- Location pre-selection (appears as vehicles load) -->
					{#if datesOk}
						<div class="flex flex-col gap-3" in:fade={{ duration: 200 }}>
							<div class="flex items-center gap-2">
								<MapPinIcon class="size-4 text-primary" />
								<span class="text-sm font-semibold">Lieu de prise en charge</span>
								{#if vehiclesQ.isLoading}
									<span class="text-xs text-muted-foreground">Chargement…</span>
								{/if}
							</div>

							{#if vehiclesQ.isLoading}
								<div class="flex gap-2">
									{#each [1,2,3] as i (i)}
										<div class="h-9 w-24 animate-pulse rounded-full bg-muted"></div>
									{/each}
								</div>
							{:else if availableLocations.length === 0 && !vehiclesQ.isLoading}
								<p class="text-sm text-muted-foreground">Aucun véhicule disponible sur ces dates.</p>
							{:else}
								<div class="flex flex-wrap gap-2">
									<button type="button"
										onclick={() => (preselectedLocation = 'all')}
										class="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition {preselectedLocation === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:text-primary'}">
										Tous les lieux
										<span class="rounded-full px-1.5 py-0.5 text-[10px] font-bold {preselectedLocation === 'all' ? 'bg-white/20' : 'bg-muted text-muted-foreground'}">
											{allVehicles.length}
										</span>
									</button>
									{#each availableLocations as loc}
										{@const count = allVehicles.filter(v => v.location === loc).length}
										<button type="button"
											onclick={() => (preselectedLocation = loc)}
											class="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition {preselectedLocation === loc ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:text-primary'}">
											<MapPinIcon class="size-3" />
											{loc}
											<span class="rounded-full px-1.5 py-0.5 text-[10px] font-bold {preselectedLocation === loc ? 'bg-white/20' : 'bg-muted text-muted-foreground'}">
												{count}
											</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<Button size="lg" class="w-full text-base" disabled={!datesOk || vehiclesQ.isLoading} onclick={next}>
						{#if vehiclesQ.isLoading}
							Chargement des véhicules…
						{:else}
							Voir les véhicules disponibles
							<ArrowRightIcon class="size-4" />
						{/if}
					</Button>
				</div>
			</div>
		</div>

	<!-- Step 2 — Véhicule ──────────────────────────────────────────────────── -->
	{:else if step === 2}
		<div class="min-h-0 flex-1 flex overflow-hidden" in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}>

			<!-- ── Sidebar filters (desktop) / collapsible panel (mobile) ── -->
			<aside class="hidden shrink-0 flex-col gap-0 overflow-y-auto border-r border-border/50 bg-muted/20 lg:flex lg:w-72 xl:w-80">
				<div class="flex flex-col gap-6 p-5">
					<div>
						<p class="text-sm font-bold">Affiner les résultats</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							{filteredVehicles.length} / {allVehicles.length} véhicule{allVehicles.length > 1 ? 's' : ''}
						</p>
					</div>

					<!-- Search -->
					<div class="relative">
						<SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input type="text" bind:value={searchQ} placeholder="Marque, modèle…" class="pl-9" />
					</div>

					<!-- Energy filter -->
					<div class="flex flex-col gap-2.5">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Énergie</span>
						<div class="flex flex-col gap-1.5">
							{#each [
								{ k: 'all',      label: 'Tous' },
								{ k: 'ELECTRIC', label: '⚡ Électrique' },
								{ k: 'HYBRID',   label: '🔋 Hybride' },
								{ k: 'THERMAL',  label: '⛽ Thermique' }
							] as f}
								<button type="button"
									onclick={() => (fEnergy = f.k as typeof fEnergy)}
									class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition
										{fEnergy === f.k ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted text-foreground/70 hover:text-foreground'}">
									<span>{f.label}</span>
									{#if fEnergy === f.k}
										<CheckIcon class="size-3.5 text-primary" strokeWidth={3} />
									{/if}
								</button>
							{/each}
						</div>
					</div>

					<!-- Category filter -->
					<div class="flex flex-col gap-2.5">
						<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catégorie</span>
						<div class="flex flex-col gap-1.5">
							{#each [
								{ k: 'all',       label: 'Toutes' },
								{ k: 'PASSENGER', label: '🚗 Tourisme' },
								{ k: 'UTILITY',   label: '🚐 Utilitaire' },
								{ k: 'TRUCK',     label: '🚛 Camion' }
							] as f}
								<button type="button"
									onclick={() => (fCategory = f.k as typeof fCategory)}
									class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition
										{fCategory === f.k ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted text-foreground/70 hover:text-foreground'}">
									<span>{f.label}</span>
									{#if fCategory === f.k}
										<CheckIcon class="size-3.5 text-primary" strokeWidth={3} />
									{/if}
								</button>
							{/each}
						</div>
					</div>

					<!-- Location filter -->
					{#if availableLocations.length > 0}
						<div class="flex flex-col gap-2.5">
							<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lieu</span>
							<div class="flex flex-col gap-1.5">
								<button type="button"
									onclick={() => (fLocation = 'all')}
									class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition
										{fLocation === 'all' ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted text-foreground/70 hover:text-foreground'}">
									<span>Tous les lieux</span>
									{#if fLocation === 'all'}
										<CheckIcon class="size-3.5 text-primary" strokeWidth={3} />
									{/if}
								</button>
								{#each availableLocations as loc}
									<button type="button"
										onclick={() => (fLocation = loc)}
										class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition
											{fLocation === loc ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted text-foreground/70 hover:text-foreground'}">
										<span class="flex items-center gap-1.5"><MapPinIcon class="size-3.5 shrink-0" />{loc}</span>
										{#if fLocation === loc}
											<CheckIcon class="size-3.5 text-primary" strokeWidth={3} />
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if activeFilterCount > 0 || searchQ}
						<Button variant="ghost" size="sm" class="w-full gap-2 text-muted-foreground" onclick={clearFilters}>
							<XIcon class="size-3.5" />
							Effacer les filtres
						</Button>
					{/if}
				</div>
			</aside>

			<!-- ── Main: search bar + vehicle grid + sticky CTA ── -->
			<div class="flex min-w-0 flex-1 flex-col overflow-hidden">

				<!-- Top bar: search + mobile filter toggle -->
				<div class="shrink-0 border-b border-border/50 bg-background/95 px-4 py-3 sm:px-6">
					<div class="flex items-center gap-3">
						<div class="relative flex-1">
							<SearchIcon class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input type="text" bind:value={searchQ} placeholder="Rechercher par marque ou modèle…" class="pl-9" />
						</div>
						<!-- Mobile filter toggle -->
						<button type="button"
							onclick={() => (showFilters = !showFilters)}
							class="relative flex lg:hidden size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-muted">
							<SlidersHorizontalIcon class="size-4" />
							{#if activeFilterCount > 0}
								<span class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
									{activeFilterCount}
								</span>
							{/if}
						</button>
					</div>

					<!-- Mobile filter panel (collapsible) -->
					{#if showFilters}
						<div class="mt-3 flex flex-wrap gap-2 lg:hidden" transition:fly={{ y: -8, duration: 200 }}>
							<!-- Energy pills -->
							{#each [
								{ k: 'all', label: 'Toutes énergies' },
								{ k: 'ELECTRIC', label: '⚡ Électrique' },
								{ k: 'HYBRID',   label: '🔋 Hybride' },
								{ k: 'THERMAL',  label: '⛽ Thermique' }
							] as f}
								<button type="button"
									onclick={() => (fEnergy = f.k as typeof fEnergy)}
									class="rounded-full border px-3 py-1.5 text-xs font-medium transition
										{fEnergy === f.k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}">
									{f.label}
								</button>
							{/each}
							<!-- Category pills -->
							{#each [
								{ k: 'all', label: 'Toutes catégories' },
								{ k: 'PASSENGER', label: '🚗 Tourisme' },
								{ k: 'UTILITY',   label: '🚐 Utilitaire' }
							] as f}
								<button type="button"
									onclick={() => (fCategory = f.k as typeof fCategory)}
									class="rounded-full border px-3 py-1.5 text-xs font-medium transition
										{fCategory === f.k ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}">
									{f.label}
								</button>
							{/each}
							<!-- Location pills -->
							{#each availableLocations as loc}
								<button type="button"
									onclick={() => (fLocation = fLocation === loc ? 'all' : loc)}
									class="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition
										{fLocation === loc ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}">
									<MapPinIcon class="size-2.5" />{loc}
								</button>
							{/each}
							{#if activeFilterCount > 0}
								<button type="button" onclick={clearFilters}
									class="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10">
									<XIcon class="size-2.5" />Effacer
								</button>
							{/if}
						</div>
					{/if}

					<!-- Result count + active filters summary -->
					<div class="mt-2 flex items-center gap-2">
						<p class="text-xs text-muted-foreground">
							<span class="font-semibold text-foreground">{filteredVehicles.length}</span>
							véhicule{filteredVehicles.length !== 1 ? 's' : ''} disponible{filteredVehicles.length !== 1 ? 's' : ''}
							{#if filteredVehicles.length !== allVehicles.length}
								<span>sur {allVehicles.length} au total</span>
							{/if}
						</p>
						{#if fLocation !== 'all'}
							<span class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
								<MapPinIcon class="size-2.5" />{fLocation}
								<button type="button" onclick={() => (fLocation = 'all')} class="ml-0.5 hover:opacity-70">
									<XIcon class="size-2.5" />
								</button>
							</span>
						{/if}
					</div>
				</div>

				<!-- Vehicle grid (scrollable zone) -->
				<div class="flex-1 overflow-y-auto p-4 sm:p-6">
					{#if vehiclesQ.isLoading}
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{#each [1,2,3,4,5,6,7,8] as i (i)}
								<div class="overflow-hidden rounded-2xl border border-border">
									<div class="aspect-video animate-pulse bg-muted"></div>
									<div class="space-y-2 p-3">
										<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
										<div class="h-3 w-14 animate-pulse rounded bg-muted"></div>
										<div class="h-5 w-16 animate-pulse rounded-full bg-muted"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else if filteredVehicles.length === 0}
						<div class="flex h-full flex-col items-center justify-center gap-4 text-center">
							<div class="flex size-16 items-center justify-center rounded-full bg-muted">
								<CarIcon class="size-7 text-muted-foreground/40" />
							</div>
							<div>
								<p class="font-semibold">Aucun véhicule trouvé</p>
								<p class="mt-1 text-sm text-muted-foreground">
									{allVehicles.length === 0 ? 'Aucun véhicule disponible sur ces dates.' : 'Essayez de modifier vos filtres.'}
								</p>
							</div>
							{#if activeFilterCount > 0 || searchQ}
								<Button variant="outline" size="sm" onclick={clearFilters}>Effacer les filtres</Button>
							{:else}
								<Button variant="outline" size="sm" onclick={() => { slideDir = -1; step = 1; }}>Modifier les dates</Button>
							{/if}
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
							{#each filteredVehicles as v (v._id)}
								{@const isSelected = pickedId === v._id}
								{@const energyCfg = ENERGY_CFG[v.energy] ?? { label: v.energy, cls: 'bg-muted text-muted-foreground', activeCls: 'bg-muted-foreground text-white' }}
								<button
									type="button"
									onclick={() => { pickedId = v._id; pickedVehicle = v; }}
									class="group relative overflow-hidden rounded-2xl border text-left transition-all duration-200 focus:outline-none
										{isSelected
											? 'border-primary shadow-glass-btn ring-2 ring-primary/25 scale-[1.02]'
											: 'border-border shadow-glass-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5'}">

									<!-- Vehicle image — full width, taller on desktop -->
									<div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
										<VehicleThumb brand={v.brand} model={v.model} />
										<!-- Gradient overlay for text legibility -->
										<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
										<!-- Energy badge — top left -->
										<span class="absolute left-2.5 top-2.5 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
											{energyCfg.label}
										</span>
										<!-- Location — bottom left on image -->
										{#if v.location}
											<div class="absolute inset-x-0 bottom-0 p-2.5">
												<p class="flex items-center gap-1 text-[10px] text-white/70">
													<MapPinIcon class="size-2.5 shrink-0" />{v.location}
												</p>
											</div>
										{/if}
										<!-- Selected checkmark -->
										{#if isSelected}
											<div class="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-primary shadow-glass-btn ring-1 ring-white/20">
												<CheckIcon class="size-3.5 text-primary-foreground" strokeWidth={3} />
											</div>
										{/if}
									</div>

									<!-- Card body -->
									<div class="p-3">
										<p class="truncate font-bold leading-tight">{v.brand} {v.model}</p>
										<p class="mt-0.5 font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wider">{v.registration}</p>
									</div>

									<!-- Selected accent bar -->
									{#if isSelected}
										<div class="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-b-2xl"></div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Sticky CTA (always visible below the grid) -->
				<div class="shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-sm p-4 sm:px-6">
					{#if pickedVehicle}
						<div class="flex items-center gap-3">
							<div class="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
								<VehicleThumb brand={pickedVehicle.brand} model={pickedVehicle.model} />
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold">{pickedVehicle.brand} {pickedVehicle.model}</p>
								<p class="flex items-center gap-1 text-xs text-muted-foreground">
									<span class="font-mono">{pickedVehicle.registration}</span>
									{#if pickedVehicle.location}
										<span>·</span><MapPinIcon class="size-3" />{pickedVehicle.location}
									{/if}
								</p>
							</div>
							<Button size="lg" onclick={next} class="shrink-0 gap-2">
								Continuer
								<ArrowRightIcon class="size-4" />
							</Button>
						</div>
					{:else}
						<Button size="lg" class="w-full" disabled>
							Sélectionnez un véhicule pour continuer
						</Button>
					{/if}
				</div>
			</div>
		</div>

	<!-- Step 3 — Motif ─────────────────────────────────────────────────────── -->
	{:else if step === 3}
		<div class="flex-1 overflow-y-auto" in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}>
			<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-8">

					<div>
						<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Objet du déplacement</h1>
						<p class="mt-1.5 text-muted-foreground">Donnez un motif pour faciliter la validation de votre réservation.</p>
					</div>

					<!-- Vehicle recap pill -->
					{#if pickedVehicle}
						<div class="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
							<div class="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
								<VehicleThumb brand={pickedVehicle.brand} model={pickedVehicle.model} />
							</div>
							<div>
								<p class="text-sm font-semibold">{pickedVehicle.brand} {pickedVehicle.model}</p>
								<p class="text-xs text-muted-foreground">{dateShort(startTs!)} → {dateShort(endTs!)} · {durationLabel(startTs!, endTs!)}</p>
							</div>
						</div>
					{/if}

					<div class="flex flex-col gap-3">
						<label for="purpose" class="text-sm font-semibold">Motif *</label>
						<Input id="purpose" type="text" bind:value={purpose} placeholder="Ex : Visite client Lyon" maxlength={120} class="h-12 px-4" />
						<div class="flex flex-wrap gap-2">
							{#each SUGGESTIONS as s}
								<button type="button" onclick={() => (purpose = s)}
									class="rounded-full border px-3 py-1.5 text-xs font-medium transition
										{purpose === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5 hover:text-primary'}">
									{s}
								</button>
							{/each}
						</div>
					</div>

					<div class="flex flex-col gap-2">
						<label for="notes" class="text-sm font-medium text-muted-foreground">Notes <span class="text-xs">(facultatif)</span></label>
						<Textarea id="notes" bind:value={notes}
							placeholder="Informations complémentaires, instruction de retour…"
							rows={3} class="rounded-xl" />
					</div>

					<Button size="lg" class="w-full text-base" disabled={!purpose.trim()} onclick={next}>
						Passer en revue <ArrowRightIcon class="size-4" />
					</Button>
				</div>
			</div>
		</div>

	<!-- Step 4 — Confirmation ──────────────────────────────────────────────── -->
	{:else if step === 4}
		<div class="flex-1 overflow-y-auto" in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}>
			<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-6">

					<div>
						<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Tout est bon ?</h1>
						<p class="mt-1.5 text-muted-foreground">Vérifiez et confirmez votre réservation.</p>
					</div>

					<!-- Vehicle hero image -->
					{#if pickedVehicle}
						<div class="overflow-hidden rounded-2xl border border-border shadow-sm">
							<div class="relative aspect-video">
								<VehicleThumb brand={pickedVehicle.brand} model={pickedVehicle.model} />
								<div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent"></div>
								<div class="absolute bottom-0 left-0 p-4 text-white">
									<p class="text-xl font-bold">{pickedVehicle.brand} {pickedVehicle.model}</p>
									<div class="mt-0.5 flex items-center gap-2">
										<span class="font-mono text-sm opacity-80">{pickedVehicle.registration}</span>
										{#if pickedVehicle.location}
											<span class="flex items-center gap-1 text-sm opacity-80">
												<MapPinIcon class="size-3.5" />{pickedVehicle.location}
											</span>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Summary card -->
					<div class="divide-y divide-border overflow-hidden rounded-2xl border border-border">
						<!-- Dates -->
						<div class="flex items-start justify-between gap-4 px-5 py-4">
							<div class="flex items-start gap-3">
								<div class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
									<CalendarIcon class="size-4 text-muted-foreground" />
								</div>
								<div>
									<p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dates</p>
									{#if datesOk}
										<p class="mt-0.5 text-sm font-semibold">{dateShort(startTs!)} → {dateShort(endTs!)}</p>
										<p class="text-xs text-muted-foreground">{durationLabel(startTs!, endTs!)}</p>
									{/if}
								</div>
							</div>
							<button type="button" onclick={() => { slideDir = -1; step = 1; }} class="shrink-0 text-xs font-medium text-primary hover:underline">Modifier</button>
						</div>

						<!-- Vehicle -->
						<div class="flex items-start justify-between gap-4 px-5 py-4">
							<div class="flex items-start gap-3">
								<div class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
									<CarIcon class="size-4 text-muted-foreground" />
								</div>
								<div>
									<p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Véhicule</p>
									{#if pickedVehicle}
										<p class="mt-0.5 text-sm font-semibold">{pickedVehicle.brand} {pickedVehicle.model}</p>
										<p class="font-mono text-xs text-muted-foreground">{pickedVehicle.registration}</p>
									{/if}
								</div>
							</div>
							<button type="button" onclick={() => { slideDir = -1; step = 2; }} class="shrink-0 text-xs font-medium text-primary hover:underline">Modifier</button>
						</div>

						<!-- Purpose -->
						<div class="flex items-start justify-between gap-4 px-5 py-4">
							<div class="flex items-start gap-3">
								<div class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
									<SparklesIcon class="size-4 text-muted-foreground" />
								</div>
								<div>
									<p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Motif</p>
									<p class="mt-0.5 text-sm font-semibold">{purpose}</p>
									{#if notes}
										<p class="mt-0.5 text-xs text-muted-foreground">{notes}</p>
									{/if}
								</div>
							</div>
							<button type="button" onclick={() => { slideDir = -1; step = 3; }} class="shrink-0 text-xs font-medium text-primary hover:underline">Modifier</button>
						</div>
					</div>

					<Button size="lg" class="w-full gap-2 text-base"
						disabled={submitting || !datesOk || !pickedId || !purpose.trim()}
						loading={submitting}
						onclick={submit}>
						{#if !submitting}<CheckIcon class="size-4" />{/if}
						{submitting ? 'Confirmation en cours…' : 'Confirmer ma réservation'}
					</Button>

					<p class="text-center text-xs text-muted-foreground">
						Vous pouvez modifier ou annuler depuis votre espace réservations.
					</p>
				</div>
			</div>
		</div>
	{/if}

</div>
