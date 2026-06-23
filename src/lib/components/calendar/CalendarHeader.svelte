<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { addWeeks, subWeeks, addDays, subDays, addMonths, subMonths, format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import FilterIcon from '@lucide/svelte/icons/filter';

	import type { ViewMode } from './utils.js';

	type Props = {
		view: ViewMode;
		windowStart: Date;
		locations: string[];
		onViewChange: (v: ViewMode) => void;
		onWindowStartChange: (d: Date) => void;
		filterLocation: string;
		filterCategory: string;
		filterEnergy: string;
		filterStatus: string;
		onFilterChange: (key: 'location' | 'category' | 'energy' | 'status', value: string) => void;
	};

	let {
		view,
		windowStart,
		locations,
		onViewChange,
		onWindowStartChange,
		filterLocation,
		filterCategory,
		filterEnergy,
		filterStatus,
		onFilterChange
	}: Props = $props();

	const VIEW_LABELS: Record<ViewMode, string> = { day: 'Jour', week: 'Semaine', month: 'Mois' };

	const periodLabel = $derived.by(() => {
		if (view === 'day') return format(windowStart, 'd MMMM yyyy', { locale: fr });
		if (view === 'month') return format(windowStart, 'MMMM yyyy', { locale: fr });
		const end = addDays(windowStart, 6);
		return `${format(windowStart, 'd MMM', { locale: fr })} – ${format(end, 'd MMM yyyy', { locale: fr })}`;
	});

	function goToday() {
		const today = new Date();
		if (view === 'week') {
			const d = new Date(today);
			d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
			d.setHours(0, 0, 0, 0);
			onWindowStartChange(d);
		} else if (view === 'month') {
			onWindowStartChange(new Date(today.getFullYear(), today.getMonth(), 1));
		} else {
			const d = new Date(today);
			d.setHours(0, 0, 0, 0);
			onWindowStartChange(d);
		}
	}

	function goPrev() {
		if (view === 'week') onWindowStartChange(subWeeks(windowStart, 1));
		else if (view === 'month') onWindowStartChange(subMonths(windowStart, 1));
		else onWindowStartChange(subDays(windowStart, 1));
	}

	function goNext() {
		if (view === 'week') onWindowStartChange(addWeeks(windowStart, 1));
		else if (view === 'month') onWindowStartChange(addMonths(windowStart, 1));
		else onWindowStartChange(addDays(windowStart, 1));
	}

	const CATEGORIES = [
		{ value: '', label: 'Toutes catégories' },
		{ value: 'PASSENGER', label: 'Tourisme' },
		{ value: 'UTILITY', label: 'Utilitaire' },
		{ value: 'TRUCK', label: 'Camion' }
	];

	const ENERGIES = [
		{ value: '', label: 'Toutes énergies' },
		{ value: 'THERMAL', label: 'Thermique' },
		{ value: 'HYBRID', label: 'Hybride' },
		{ value: 'ELECTRIC', label: 'Électrique' }
	];

	const STATUSES = [
		{ value: '', label: 'Tous statuts' },
		{ value: 'PENDING', label: 'En attente' },
		{ value: 'CONFIRMED', label: 'Confirmée' },
		{ value: 'IN_PROGRESS', label: 'En cours' },
		{ value: 'COMPLETED', label: 'Terminée' },
		{ value: 'CANCELLED', label: 'Annulée' }
	];

	const hasFilters = $derived(
		filterLocation !== '' || filterCategory !== '' || filterEnergy !== '' || filterStatus !== ''
	);
	const filterCount = $derived(
		[filterLocation, filterCategory, filterEnergy, filterStatus].filter(Boolean).length
	);
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<!-- Left: nav -->
	<div class="flex items-center gap-2">
		<Button variant="outline" size="icon" class="size-8 shrink-0" onclick={goPrev}>
			<ChevronLeftIcon class="size-4" />
		</Button>
		<Button variant="outline" size="icon" class="size-8 shrink-0" onclick={goNext}>
			<ChevronRightIcon class="size-4" />
		</Button>
		<Button variant="outline" size="sm" onclick={goToday} class="shrink-0">Aujourd'hui</Button>
		<div class="flex items-center gap-1.5 text-sm font-medium">
			<CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
			<span>{periodLabel}</span>
		</div>
	</div>

	<!-- Right: view toggle + filters -->
	<div class="flex items-center gap-2">
		<!-- Filters dropdown -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="outline"
						size="sm"
						class="gap-1.5 {hasFilters ? 'border-primary text-primary' : ''}"
					>
						<FilterIcon class="size-3.5" />
						Filtres
						{#if hasFilters}
							<span
								class="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
							>
								{filterCount}
							</span>
						{/if}
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-52">
				<!-- Site filter -->
				{#if locations.length > 0}
					<DropdownMenu.Label>Site</DropdownMenu.Label>
					<DropdownMenu.Item onclick={() => onFilterChange('location', '')} class="gap-2">
						{#if filterLocation === ''}
							<span class="size-2 rounded-full bg-primary"></span>
						{:else}
							<span class="size-2"></span>
						{/if}
						Tous les sites
					</DropdownMenu.Item>
					{#each locations as loc (loc)}
						<DropdownMenu.Item onclick={() => onFilterChange('location', loc)} class="gap-2">
							{#if filterLocation === loc}
								<span class="size-2 rounded-full bg-primary"></span>
							{:else}
								<span class="size-2"></span>
							{/if}
							{loc}
						</DropdownMenu.Item>
					{/each}
					<DropdownMenu.Separator />
				{/if}

				<!-- Category filter -->
				<DropdownMenu.Label>Catégorie</DropdownMenu.Label>
				{#each CATEGORIES as cat (cat.value)}
					<DropdownMenu.Item onclick={() => onFilterChange('category', cat.value)} class="gap-2">
						{#if filterCategory === cat.value}
							<span class="size-2 rounded-full bg-primary"></span>
						{:else}
							<span class="size-2"></span>
						{/if}
						{cat.label}
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Separator />

				<!-- Energy filter -->
				<DropdownMenu.Label>Énergie</DropdownMenu.Label>
				{#each ENERGIES as e (e.value)}
					<DropdownMenu.Item onclick={() => onFilterChange('energy', e.value)} class="gap-2">
						{#if filterEnergy === e.value}
							<span class="size-2 rounded-full bg-primary"></span>
						{:else}
							<span class="size-2"></span>
						{/if}
						{e.label}
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Separator />

				<!-- Status filter -->
				<DropdownMenu.Label>Statut</DropdownMenu.Label>
				{#each STATUSES as s (s.value)}
					<DropdownMenu.Item onclick={() => onFilterChange('status', s.value)} class="gap-2">
						{#if filterStatus === s.value}
							<span class="size-2 rounded-full bg-primary"></span>
						{:else}
							<span class="size-2"></span>
						{/if}
						{s.label}
					</DropdownMenu.Item>
				{/each}

				{#if hasFilters}
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						class="text-destructive focus:text-destructive"
						onclick={() => {
							onFilterChange('location', '');
							onFilterChange('category', '');
							onFilterChange('energy', '');
							onFilterChange('status', '');
						}}
					>
						Réinitialiser les filtres
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<!-- View mode pills -->
		<div class="flex rounded-md border border-border">
			{#each (['day', 'week', 'month'] as ViewMode[]) as v (v)}
				<button
					class="px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md {view === v
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					onclick={() => onViewChange(v)}
				>
					{VIEW_LABELS[v]}
				</button>
			{/each}
		</div>
	</div>
</div>
