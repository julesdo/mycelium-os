<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { CATEGORY_COLORS, CATEGORY_LABELS } from './category-config.js';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import DotsHorizontalIcon from '@lucide/svelte/icons/ellipsis';
	import PaperclipIcon from '@lucide/svelte/icons/paperclip';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	type Category =
		| 'LEASING' | 'CARBURANT' | 'ENTRETIEN' | 'ASSURANCE'
		| 'TAXES' | 'SINISTRE' | 'PARKING' | 'TELEPEAGE' | 'AUTRE';
	type Source = 'MANUAL' | 'IMPORT' | 'API';

	interface Cost {
		_id: string;
		vehicleId?: string;
		category: Category;
		amount: number;
		vatAmount?: number;
		date: number;
		description: string;
		invoiceUrl?: string;
		invoiceStorageId?: string;
		source: Source;
		createdAt: number;
	}

	interface Vehicle {
		_id: string;
		registration: string;
		brand: string;
		model: string;
	}

	interface Props {
		costs: Cost[];
		vehicles: Vehicle[] | null | undefined;
		loading?: boolean;
		onEdit: (cost: Cost) => void;
		onDelete: (costId: string) => void;
		onBulkDelete: (costIds: string[]) => void;
	}

	let { costs, vehicles, loading = false, onEdit, onDelete, onBulkDelete }: Props = $props();

	type SortKey = 'date' | 'amount' | 'category';
	type SortDir = 'asc' | 'desc';

	let sortKey = $state<SortKey>('date');
	let sortDir = $state<SortDir>('desc');
	let selected = $state<Set<string>>(new Set());

	function toggleSort(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else { sortKey = key; sortDir = 'desc'; }
	}

	const vehicleMap = $derived(new Map((vehicles ?? []).map((v) => [v._id, v])));

	const sorted = $derived.by(() => {
		return [...costs].sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'date') cmp = a.date - b.date;
			else if (sortKey === 'amount') cmp = a.amount - b.amount;
			else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
			return sortDir === 'asc' ? cmp : -cmp;
		});
	});

	const allSelected = $derived(sorted.length > 0 && sorted.every((c) => selected.has(c._id)));
	const someSelected = $derived(selected.size > 0);

	function toggleAll() {
		if (allSelected) selected = new Set();
		else selected = new Set(sorted.map((c) => c._id));
	}

	function toggleOne(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	function fmt(n: number) {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
			maximumFractionDigits: 2
		}).format(n);
	}

	function fmtDate(ts: number) {
		return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}

	const sourceLabel: Record<Source, string> = { MANUAL: 'Manuel', IMPORT: 'Import', API: 'API' };
	const sourceClass: Record<Source, string> = {
		MANUAL: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
		IMPORT: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
		API: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
	};
</script>

{#if loading}
	<div class="flex flex-col gap-2">
		{#each Array(6) as _, i (i)}
			<div class="h-10 animate-pulse rounded-md bg-muted"></div>
		{/each}
	</div>
{:else if sorted.length === 0}
	<p class="py-8 text-center text-sm text-muted-foreground">Aucun coût sur cette période.</p>
{:else}
	<!-- Bulk action bar -->
	{#if someSelected}
		<div class="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm animate-enter-blur-up">
			<span class="text-muted-foreground">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
			<Button
				variant="destructive"
				size="sm"
				class="gap-1.5 h-7 text-xs"
				onclick={() => {
					onBulkDelete([...selected]);
					selected = new Set();
				}}
			>
				<TrashIcon class="size-3.5" />
				Supprimer
			</Button>
		</div>
	{/if}

	<div class="overflow-hidden rounded-md border border-border">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[700px] text-sm">
				<thead>
					<tr class="border-b border-border bg-muted/30 text-xs text-muted-foreground">
						<th class="w-10 px-3 py-2.5">
							<Checkbox
								checked={allSelected}
								indeterminate={someSelected && !allSelected}
								onCheckedChange={toggleAll}
								aria-label="Tout sélectionner"
							/>
						</th>
						<th class="px-3 py-2.5 text-left font-medium">
							<button type="button" onclick={() => toggleSort('date')} class="flex items-center gap-1 hover:text-foreground transition-colors">
								Date
								{#if sortKey === 'date'}{#if sortDir === 'asc'}<ChevronUpIcon class="size-3.5" />{:else}<ChevronDownIcon class="size-3.5" />{/if}{:else}<ChevronsUpDownIcon class="size-3.5 opacity-40" />{/if}
							</button>
						</th>
						<th class="px-3 py-2.5 text-left font-medium">Véhicule</th>
						<th class="px-3 py-2.5 text-left font-medium">
							<button type="button" onclick={() => toggleSort('category')} class="flex items-center gap-1 hover:text-foreground transition-colors">
								Catégorie
								{#if sortKey === 'category'}{#if sortDir === 'asc'}<ChevronUpIcon class="size-3.5" />{:else}<ChevronDownIcon class="size-3.5" />{/if}{:else}<ChevronsUpDownIcon class="size-3.5 opacity-40" />{/if}
							</button>
						</th>
						<th class="px-3 py-2.5 text-left font-medium">Description</th>
						<th class="px-3 py-2.5 text-right font-medium">
							<button type="button" onclick={() => toggleSort('amount')} class="ml-auto flex items-center gap-1 hover:text-foreground transition-colors">
								Montant TTC
								{#if sortKey === 'amount'}{#if sortDir === 'asc'}<ChevronUpIcon class="size-3.5" />{:else}<ChevronDownIcon class="size-3.5" />{/if}{:else}<ChevronsUpDownIcon class="size-3.5 opacity-40" />{/if}
							</button>
						</th>
						<th class="px-3 py-2.5 text-left font-medium">Source</th>
						<th class="w-10 px-3 py-2.5"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/60">
					{#each sorted as cost (cost._id)}
						{@const vehicle = cost.vehicleId ? vehicleMap.get(cost.vehicleId) : undefined}
						<tr
							class="transition-colors hover:bg-muted/30 {selected.has(cost._id) ? 'bg-primary/5' : ''}"
						>
							<td class="px-3 py-2.5">
								<Checkbox
									checked={selected.has(cost._id)}
									onCheckedChange={() => toggleOne(cost._id)}
									aria-label="Sélectionner"
								/>
							</td>
							<td class="px-3 py-2.5 tabular-nums text-muted-foreground">
								{fmtDate(cost.date)}
							</td>
							<td class="px-3 py-2.5">
								{#if vehicle}
									<span class="font-mono text-xs font-medium">{vehicle.registration}</span>
									<span class="ml-1 text-xs text-muted-foreground">{vehicle.brand}</span>
								{:else}
									<span class="text-xs text-muted-foreground/60">Global</span>
								{/if}
							</td>
							<td class="px-3 py-2.5">
								<span class="inline-flex items-center gap-1.5 text-xs font-medium">
									<span
										class="inline-block size-2 shrink-0 rounded-sm"
										style="background-color: {CATEGORY_COLORS[cost.category] ?? CATEGORY_COLORS.AUTRE}"
									></span>
									{CATEGORY_LABELS[cost.category] ?? cost.category}
								</span>
							</td>
							<td class="max-w-[200px] px-3 py-2.5">
								<span class="flex items-center gap-1.5 truncate text-muted-foreground">
									{cost.description}
									{#if cost.invoiceStorageId || cost.invoiceUrl}
										<a
											href={cost.invoiceUrl ?? '#'}
											target="_blank"
											rel="noopener noreferrer"
											onclick={(e) => e.stopPropagation()}
											class="shrink-0 text-blue-500 hover:text-blue-600"
											title="Voir la facture"
										>
											<PaperclipIcon class="size-3.5" />
										</a>
									{/if}
								</span>
							</td>
							<td class="px-3 py-2.5 text-right font-medium tabular-nums">
								{fmt(cost.amount)}
								{#if cost.vatAmount}
									<div class="text-xs text-muted-foreground">TVA {fmt(cost.vatAmount)}</div>
								{/if}
							</td>
							<td class="px-3 py-2.5">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {sourceClass[cost.source]}">
									{sourceLabel[cost.source]}
								</span>
							</td>
							<td class="px-3 py-2.5">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button variant="ghost" size="icon-sm" class="size-7" {...props}>
												<DotsHorizontalIcon class="size-4" />
												<span class="sr-only">Actions</span>
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" class="w-36">
										<DropdownMenu.Item onclick={() => onEdit(cost)} class="cursor-pointer">
											Modifier
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											onclick={() => onDelete(cost._id)}
											class="cursor-pointer text-destructive focus:text-destructive"
										>
											Supprimer
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<p class="text-xs text-muted-foreground">
		{sorted.length} entrée{sorted.length > 1 ? 's' : ''}
	</p>
{/if}
