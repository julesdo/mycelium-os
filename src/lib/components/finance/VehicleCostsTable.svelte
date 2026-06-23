<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { CATEGORY_COLORS, CATEGORY_LABELS } from './category-config.js';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CarIcon from '@lucide/svelte/icons/car';

	interface VehicleCostRow {
		vehicleId: string | null;
		total: number;
		byCategory: Record<string, number>;
	}

	interface Vehicle {
		_id: string;
		registration: string;
		brand: string;
		model: string;
		kilometers?: number;
	}

	interface Props {
		rows: VehicleCostRow[] | null | undefined;
		vehicles: Vehicle[] | null | undefined;
		loading?: boolean;
	}

	let { rows, vehicles, loading = false }: Props = $props();

	type SortKey = 'vehicle' | 'total';
	type SortDir = 'asc' | 'desc';

	let sortKey = $state<SortKey>('total');
	let sortDir = $state<SortDir>('desc');

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'desc' ? 'asc' : 'desc';
		} else {
			sortKey = key;
			sortDir = 'desc';
		}
	}

	const vehicleMap = $derived(
		new Map((vehicles ?? []).map((v) => [v._id, v]))
	);

	function fmt(n: number) {
		return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
	}

	const sorted = $derived.by(() => {
		const data = (rows ?? []).filter((r) => r.vehicleId !== null);
		return [...data].sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'total') {
				cmp = a.total - b.total;
			} else {
				const va = vehicleMap.get(a.vehicleId!)?.registration ?? '';
				const vb = vehicleMap.get(b.vehicleId!)?.registration ?? '';
				cmp = va.localeCompare(vb);
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});
	});

	const maxTotal = $derived(Math.max(...(sorted.map((r) => r.total)), 1));

	const topCategories = $derived.by(() => {
		const totals: Record<string, number> = {};
		for (const row of sorted) {
			for (const [cat, amt] of Object.entries(row.byCategory)) {
				totals[cat] = (totals[cat] ?? 0) + amt;
			}
		}
		return Object.entries(totals)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 4)
			.map(([cat]) => cat);
	});

	const lang = $derived(page.params.lang as string | undefined);

	function goToVehicle(vehicleId: string) {
		const path = lang ? `/${lang}/admin/fleet/${vehicleId}` : `/admin/fleet/${vehicleId}`;
		goto(resolve(path));
	}
</script>

{#if loading}
	<div class="flex flex-col gap-2">
		{#each Array(5) as _, i (i)}
			<div class="h-10 animate-pulse rounded-md bg-muted"></div>
		{/each}
	</div>
{:else if !sorted.length}
	<div class="flex flex-col items-center gap-2 py-8 text-muted-foreground">
		<CarIcon class="size-10 opacity-40" />
		<p class="text-sm">Aucun coût par véhicule sur cette période.</p>
	</div>
{:else}
	<div class="overflow-x-auto rounded-md border border-border">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-border bg-muted/30 text-xs text-muted-foreground">
					<!-- Vehicle column -->
					<th class="px-3 py-2.5 text-left font-medium">
						<button
							type="button"
							onclick={() => toggleSort('vehicle')}
							class="flex items-center gap-1 hover:text-foreground transition-colors"
						>
							Véhicule
							{#if sortKey === 'vehicle'}
								{#if sortDir === 'asc'}
									<ChevronUpIcon class="size-3.5" />
								{:else}
									<ChevronDownIcon class="size-3.5" />
								{/if}
							{:else}
								<ChevronsUpDownIcon class="size-3.5 opacity-40" />
							{/if}
						</button>
					</th>

					<!-- Mini bar categories -->
					{#each topCategories as cat}
						<th class="hidden px-3 py-2.5 text-right font-medium @xl:table-cell">
							<span
								class="inline-flex items-center gap-1"
								style="color: {CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.AUTRE}"
							>
								{CATEGORY_LABELS[cat] ?? cat}
							</span>
						</th>
					{/each}

					<!-- Total column -->
					<th class="px-3 py-2.5 text-right font-medium">
						<button
							type="button"
							onclick={() => toggleSort('total')}
							class="ml-auto flex items-center gap-1 hover:text-foreground transition-colors"
						>
							Total
							{#if sortKey === 'total'}
								{#if sortDir === 'asc'}
									<ChevronUpIcon class="size-3.5" />
								{:else}
									<ChevronDownIcon class="size-3.5" />
								{/if}
							{:else}
								<ChevronsUpDownIcon class="size-3.5 opacity-40" />
							{/if}
						</button>
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border/60">
				{#each sorted as row (row.vehicleId)}
					{@const vehicle = vehicleMap.get(row.vehicleId!)}
					<tr
						class="group cursor-pointer transition-colors hover:bg-muted/30"
						onclick={() => row.vehicleId && goToVehicle(row.vehicleId)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && row.vehicleId && goToVehicle(row.vehicleId)}
					>
						<!-- Vehicle info -->
						<td class="px-3 py-2.5">
							{#if vehicle}
								<div class="flex flex-col">
									<span class="font-medium">{vehicle.registration}</span>
									<span class="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model}</span>
								</div>
							{:else}
								<span class="text-muted-foreground">Véhicule inconnu</span>
							{/if}
						</td>

						<!-- Per-category amounts -->
						{#each topCategories as cat}
							<td class="hidden px-3 py-2.5 text-right @xl:table-cell">
								{#if row.byCategory[cat]}
									<div class="flex flex-col items-end gap-0.5">
										<span class="tabular-nums text-xs">{fmt(row.byCategory[cat])}</span>
										<!-- Mini bar -->
										<div class="h-1 w-16 overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full"
												style="width: {((row.byCategory[cat] / row.total) * 100).toFixed(0)}%; background-color: {CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.AUTRE}; opacity: 0.8"
											></div>
										</div>
									</div>
								{:else}
									<span class="text-muted-foreground/40">—</span>
								{/if}
							</td>
						{/each}

						<!-- Total -->
						<td class="px-3 py-2.5 text-right">
							<div class="flex flex-col items-end gap-0.5">
								<span class="font-medium tabular-nums">{fmt(row.total)}</span>
								<!-- Overall bar -->
								<div class="h-1 w-20 overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full bg-primary/60"
										style="width: {((row.total / maxTotal) * 100).toFixed(0)}%"
									></div>
								</div>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
