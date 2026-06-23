<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import VehicleStatusBadge from './VehicleStatusBadge.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import DotsHorizontalIcon from '@lucide/svelte/icons/ellipsis';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	type Energy = 'THERMAL' | 'HYBRID' | 'ELECTRIC';
	type Status = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
	type Category = 'PASSENGER' | 'UTILITY' | 'TRUCK';

	interface Vehicle {
		_id: string;
		registration: string;
		brand: string;
		model: string;
		year: number;
		energy: Energy;
		category: Category;
		kilometers?: number;
		status: Status;
		location?: string;
		notes?: string;
	}

	type SortKey = 'registration' | 'brand' | 'energy' | 'kilometers' | 'status' | 'location';
	type SortDir = 'asc' | 'desc';

	interface Props {
		vehicles: Vehicle[];
		lang?: string;
	}

	let { vehicles, lang }: Props = $props();

	const client = useConvexClient();
	let changingStatusId = $state<string | null>(null);

	// --- Sort state ---
	let sortKey = $state<SortKey>('registration');
	let sortDir = $state<SortDir>('asc');

	// --- Virtual scroll state ---
	const ROW_HEIGHT = 48;
	const BUFFER = 10;

	let containerEl = $state<HTMLElement | null>(null);
	let containerHeight = $state(500);
	let scrollTop = $state(0);

	$effect(() => {
		if (!containerEl) return;
		containerHeight = containerEl.clientHeight;
		const ro = new ResizeObserver(([entry]) => {
			containerHeight = entry?.contentRect.height ?? containerEl!.clientHeight;
		});
		ro.observe(containerEl);
		return () => ro.disconnect();
	});

	const energyLabel: Record<Energy, string> = {
		THERMAL: 'Thermique',
		HYBRID: 'Hybride',
		ELECTRIC: 'Électrique'
	};

	const categoryLabel: Record<Category, string> = {
		PASSENGER: 'Tourisme',
		UTILITY: 'Utilitaire',
		TRUCK: 'Camion'
	};

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
		scrollTop = 0;
		if (containerEl) containerEl.scrollTop = 0;
	}

	const sorted = $derived.by(() => {
		return [...vehicles].sort((a, b) => {
			let av: string | number = '';
			let bv: string | number = '';
			if (sortKey === 'registration') {
				av = a.registration;
				bv = b.registration;
			} else if (sortKey === 'brand') {
				av = `${a.brand} ${a.model}`;
				bv = `${b.brand} ${b.model}`;
			} else if (sortKey === 'energy') {
				av = a.energy;
				bv = b.energy;
			} else if (sortKey === 'kilometers') {
				av = a.kilometers ?? -1;
				bv = b.kilometers ?? -1;
			} else if (sortKey === 'status') {
				av = a.status;
				bv = b.status;
			} else if (sortKey === 'location') {
				av = a.location ?? '';
				bv = b.location ?? '';
			}

			if (typeof av === 'string' && typeof bv === 'string') {
				return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
			}
			return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
		});
	});

	const startIdx = $derived(Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER));
	const endIdx = $derived(
		Math.min(sorted.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER)
	);
	const visibleRows = $derived(sorted.slice(startIdx, endIdx));
	const paddingTop = $derived(startIdx * ROW_HEIGHT);
	const paddingBottom = $derived(Math.max(0, (sorted.length - endIdx) * ROW_HEIGHT));

	function navigate(id: string) {
		const path = lang ? `/${lang}/admin/fleet/${id}` : `/admin/fleet/${id}`;
		goto(resolve(path));
	}

	function onRowKeydown(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			navigate(id);
		}
	}

	function handleScroll(e: Event) {
		scrollTop = (e.currentTarget as HTMLElement).scrollTop;
	}

	function availableStatuses(current: Status): { value: Status; label: string }[] {
		const all: { value: Status; label: string }[] = [
			{ value: 'AVAILABLE', label: 'Marquer disponible' },
			{ value: 'MAINTENANCE', label: 'Mettre en maintenance' },
			{ value: 'RETIRED', label: 'Retirer de la flotte' }
		];
		return all.filter((s) => s.value !== current);
	}

	async function changeStatus(vehicleId: string, status: Status, e: Event) {
		e.stopPropagation();
		changingStatusId = vehicleId;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).vehicles.updateVehicle, { vehicleId, status });
			toast.success('Statut mis à jour');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
		} finally {
			changingStatusId = null;
		}
	}
</script>

{#snippet sortIcon(key: SortKey)}
	{#if sortKey === key}
		{#if sortDir === 'asc'}
			<ChevronUpIcon class="size-3 text-foreground" />
		{:else}
			<ChevronDownIcon class="size-3 text-foreground" />
		{/if}
	{:else}
		<ChevronsUpDownIcon class="size-3 text-muted-foreground/40" />
	{/if}
{/snippet}

<!--
	Constrained-height container: the table fills available vertical space
	without causing page scroll. calc(100vh - 22rem) accounts for app topbar
	+ page header + KPI cards + filters + gaps.
-->
<div
	class="h-full overflow-hidden rounded-2xl border-0"
	data-slot="card"
>
	<div
		bind:this={containerEl}
		class="h-full overflow-x-auto overflow-y-auto scrollbar-thin"
		onscroll={handleScroll}
	>
		<table class="w-full min-w-[740px] border-collapse text-sm">
			<!-- Sticky header -->
			<thead class="sticky top-0 z-10">
				<tr class="border-b border-border/60 bg-card dark:bg-card">
					<!-- Immat -->
					<th class="px-3 py-2.5 text-left font-medium">
						<button
							type="button"
							class="flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
							onclick={() => toggleSort('registration')}
						>
							Immat. {@render sortIcon('registration')}
						</button>
					</th>
					<!-- Marque / Modele -->
					<th class="px-3 py-2.5 text-left font-medium">
						<button
							type="button"
							class="flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
							onclick={() => toggleSort('brand')}
						>
							Véhicule {@render sortIcon('brand')}
						</button>
					</th>
					<!-- Energie -->
					<th class="px-3 py-2.5 text-left font-medium">
						<button
							type="button"
							class="flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
							onclick={() => toggleSort('energy')}
						>
							Énergie {@render sortIcon('energy')}
						</button>
					</th>
					<!-- Kilométrage (right-aligned) -->
					<th class="px-3 py-2.5 text-right font-medium">
						<button
							type="button"
							class="flex w-full items-center justify-end gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
							onclick={() => toggleSort('kilometers')}
						>
							Kilométrage {@render sortIcon('kilometers')}
						</button>
					</th>
					<!-- Statut -->
					<th class="px-3 py-2.5 text-left font-medium">
						<button
							type="button"
							class="flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
							onclick={() => toggleSort('status')}
						>
							Statut {@render sortIcon('status')}
						</button>
					</th>
					<!-- Site -->
					<th class="px-3 py-2.5 text-left font-medium">
						<button
							type="button"
							class="flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
							onclick={() => toggleSort('location')}
						>
							Site {@render sortIcon('location')}
						</button>
					</th>
					<!-- Actions -->
					<th class="w-10 px-3 py-2.5"></th>
				</tr>
			</thead>

			<tbody>
				<!-- Top virtual spacer -->
				{#if paddingTop > 0}
					<tr aria-hidden="true" style="height: {paddingTop}px;">
						<td colspan="7"></td>
					</tr>
				{/if}

				<!-- Visible rows -->
				{#each visibleRows as vehicle (vehicle._id)}
					<tr
						class="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/40 focus-within:bg-muted/40"
						style="height: {ROW_HEIGHT}px;"
						onclick={() => navigate(vehicle._id)}
						onkeydown={(e) => onRowKeydown(e, vehicle._id)}
						tabindex={0}
						role="button"
						aria-label="Voir {vehicle.registration}"
					>
						<!-- Immatriculation -->
						<td class="px-3 font-mono text-sm font-semibold tracking-wider">
							{vehicle.registration}
						</td>
						<!-- Marque / Modèle / Catégorie — tout sur une ligne pour ne pas casser le scroll virtuel -->
						<td class="px-3">
							<span class="font-medium">{vehicle.brand}</span>
							<span class="text-muted-foreground"> {vehicle.model}</span>
							<span class="ml-1.5 text-xs text-muted-foreground/50">{vehicle.year}</span>
							<span class="ml-1.5 text-[11px] text-muted-foreground/40">· {categoryLabel[vehicle.category] ?? vehicle.category}</span>
						</td>
						<!-- Énergie -->
						<td class="px-3 text-sm text-muted-foreground">
							{energyLabel[vehicle.energy]}
						</td>
						<!-- Kilométrage -->
						<td class="px-3 text-right text-sm tabular-nums text-muted-foreground">
							{vehicle.kilometers != null
								? vehicle.kilometers.toLocaleString('fr-FR') + ' km'
								: '—'}
						</td>
						<!-- Statut -->
						<td class="px-3">
							<VehicleStatusBadge status={vehicle.status} />
						</td>
						<!-- Site -->
						<td class="px-3 text-sm text-muted-foreground">
							{vehicle.location ?? '—'}
						</td>
						<!-- Actions -->
						<td class="px-3">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button
											variant="ghost"
											size="icon-sm"
											class="size-7"
											{...props}
											onclick={(e: Event) => e.stopPropagation()}
											disabled={changingStatusId === vehicle._id}
										>
											{#if changingStatusId === vehicle._id}
												<LoaderCircleIcon class="size-3.5 animate-spin" />
											{:else}
												<DotsHorizontalIcon class="size-4" />
											{/if}
											<span class="sr-only">Actions</span>
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end" class="w-48">
									<DropdownMenu.Item
										onclick={(e: Event) => {
											e.stopPropagation();
											navigate(vehicle._id);
										}}
									>
										Voir le détail
									</DropdownMenu.Item>
									{#if vehicle.status !== 'IN_USE'}
										<DropdownMenu.Separator />
										{#each availableStatuses(vehicle.status) as s (s.value)}
											<DropdownMenu.Item
												onclick={(e: Event) => changeStatus(vehicle._id, s.value, e)}
												class={s.value === 'RETIRED'
													? 'text-destructive focus:text-destructive'
													: ''}
											>
												{s.label}
											</DropdownMenu.Item>
										{/each}
									{/if}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</td>
					</tr>
				{/each}

				<!-- Bottom virtual spacer -->
				{#if paddingBottom > 0}
					<tr aria-hidden="true" style="height: {paddingBottom}px;">
						<td colspan="7"></td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
