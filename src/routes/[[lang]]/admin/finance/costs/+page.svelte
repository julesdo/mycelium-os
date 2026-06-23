<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { confirmDelete } from '$lib/components/ui/confirm-delete-dialog/confirm-delete-dialog.svelte';
	import CostsTable from '$lib/components/finance/CostsTable.svelte';
	import CostFormModal from '$lib/components/finance/CostFormModal.svelte';
	import ImportCostsModal from '$lib/components/finance/ImportCostsModal.svelte';
	import { CATEGORY_LABELS } from '$lib/components/finance/category-config.js';
	import EuroIcon from '@lucide/svelte/icons/euro';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

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

	const client = useConvexClient();
	const lang = $derived(page.params.lang as string | undefined);

	function goToFinance() {
		const path = lang ? `/${lang}/admin/finance` : '/admin/finance';
		goto(resolve(path));
	}

	// ── Filters ──────────────────────────────────────────────────────────────────

	let search = $state('');
	let debouncedSearch = $state('');
	let filterCategory = $state<Category | ''>('');
	let filterSource = $state<Source | ''>('');
	let filterVehicleId = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	function handleSearchChange(v: string) {
		search = v;
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => { debouncedSearch = v.trim().toLowerCase(); }, 300);
	}

	function clearFilters() {
		search = '';
		debouncedSearch = '';
		filterCategory = '';
		filterSource = '';
		filterVehicleId = '';
	}

	const hasFilters = $derived(
		!!debouncedSearch || !!filterCategory || !!filterSource || !!filterVehicleId
	);

	// ── Convex queries ────────────────────────────────────────────────────────────

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const costsQ = useQuery((api as any).costs.listCosts, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehiclesQ = useQuery((api as any).vehicles.listVehicles, {});

	// ── Filtered data ─────────────────────────────────────────────────────────────

	const filtered = $derived.by(() => {
		let costs: Cost[] = costsQ.data ?? [];
		if (filterCategory) costs = costs.filter((c) => c.category === filterCategory);
		if (filterSource) costs = costs.filter((c) => c.source === filterSource);
		if (filterVehicleId) costs = costs.filter((c) => c.vehicleId === filterVehicleId);
		if (debouncedSearch) {
			const q = debouncedSearch;
			costs = costs.filter((c) => c.description.toLowerCase().includes(q));
		}
		return costs;
	});

	const isLoading = $derived(costsQ.isLoading || vehiclesQ.isLoading);

	// ── Modals ────────────────────────────────────────────────────────────────────

	let showAddModal = $state(false);
	let showImportModal = $state(false);
	let editingCost = $state<Cost | null>(null);

	function openAdd() {
		editingCost = null;
		showAddModal = true;
	}

	function openEdit(cost: Cost) {
		editingCost = cost;
		showAddModal = true;
	}

	function handleModalOpenChange(isOpen: boolean) {
		showAddModal = isOpen;
		if (!isOpen) editingCost = null;
	}

	// ── Delete ────────────────────────────────────────────────────────────────────

	function handleDelete(costId: string) {
		confirmDelete({
			title: 'Supprimer ce coût ?',
			description: 'Cette action est irréversible.',
			skipConfirmation: true,
			onConfirm: async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await client.mutation((api as any).costs.deleteCost, { costId });
				toast.success('Coût supprimé');
			}
		});
	}

	async function handleBulkDelete(costIds: string[]) {
		confirmDelete({
			title: `Supprimer ${costIds.length} coût${costIds.length > 1 ? 's' : ''} ?`,
			description: 'Cette action est irréversible.',
			skipConfirmation: true,
			onConfirm: async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await client.mutation((api as any).costs.bulkDeleteCosts, { costIds });
				toast.success(`${costIds.length} coût${costIds.length > 1 ? 's' : ''} supprimé${costIds.length > 1 ? 's' : ''}`);
			}
		});
	}

	const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
</script>

<SEOHead title="Coûts — Finance — Mycelium Fleet" description="Gestion des coûts de flotte" />

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8">
	<!-- Header -->
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon-sm" onclick={goToFinance} aria-label="Retour au reporting">
				<ArrowLeftIcon class="size-4" />
			</Button>
			<EuroIcon class="size-6 text-muted-foreground" />
			<div>
				<h1 class="text-base font-semibold">Coûts</h1>
				<p class="text-xs text-muted-foreground">Saisie et suivi des dépenses</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" class="gap-1.5" onclick={() => (showImportModal = true)}>
				<UploadIcon class="size-4" />
				Importer CSV
			</Button>
			<Button size="sm" class="gap-1.5" onclick={openAdd}>
				<PlusIcon class="size-4" />
				Ajouter un coût
			</Button>
		</div>
	</div>

	<!-- Filters bar -->
	<div class="flex flex-wrap items-center gap-2">
		<!-- Search -->
		<div class="relative w-56">
			<SearchIcon class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
			<Input
				value={search}
				oninput={(e) => handleSearchChange((e.currentTarget as HTMLInputElement).value)}
				placeholder="Rechercher une description…"
				class="h-8 pl-8 pr-8 text-xs"
			/>
			{#if search}
				<button
					type="button"
					onclick={() => handleSearchChange('')}
					class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
				>
					<XIcon class="size-3.5" />
				</button>
			{/if}
		</div>

		<!-- Category filter -->
		<Select.Root value={filterCategory} onValueChange={(v) => (filterCategory = v as Category | '')}>
			<Select.Trigger class="h-8 w-40 text-xs">
				{filterCategory ? CATEGORY_LABELS[filterCategory] : 'Toutes catégories'}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="">Toutes catégories</Select.Item>
				{#each CATEGORIES as cat}
					<Select.Item value={cat.value}>{cat.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<!-- Source filter -->
		<Select.Root value={filterSource} onValueChange={(v) => (filterSource = v as Source | '')}>
			<Select.Trigger class="h-8 w-36 text-xs">
				{filterSource || 'Toutes sources'}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="">Toutes sources</Select.Item>
				<Select.Item value="MANUAL">Manuel</Select.Item>
				<Select.Item value="IMPORT">Import</Select.Item>
				<Select.Item value="API">API</Select.Item>
			</Select.Content>
		</Select.Root>

		<!-- Vehicle filter -->
		<Select.Root value={filterVehicleId} onValueChange={(v) => (filterVehicleId = v)}>
			<Select.Trigger class="h-8 w-48 text-xs">
				{#if filterVehicleId}
					{@const v = (vehiclesQ.data ?? []).find((v) => v._id === filterVehicleId)}
					{v?.registration ?? filterVehicleId}
				{:else}
					Tous les véhicules
				{/if}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="">Tous les véhicules</Select.Item>
				{#each (vehiclesQ.data ?? []) as v (v._id)}
					<Select.Item value={v._id}>{v.registration} — {v.brand}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		{#if hasFilters}
			<Button variant="ghost" size="sm" onclick={clearFilters} class="h-8 gap-1 px-2 text-xs text-muted-foreground">
				<XIcon class="size-3.5" />
				Effacer
			</Button>
		{/if}
	</div>

	<!-- Table -->
	{#if isLoading}
		<div class="flex flex-col gap-2">
			{#each Array(8) as _, i (i)}
				<Skeleton class="h-10 w-full" />
			{/each}
		</div>
	{:else}
		<CostsTable
			costs={filtered}
			vehicles={vehiclesQ.data}
			onEdit={openEdit}
			onDelete={handleDelete}
			onBulkDelete={handleBulkDelete}
		/>
	{/if}
</div>

<!-- Add/Edit modal -->
<CostFormModal
	bind:open={showAddModal}
	onOpenChange={handleModalOpenChange}
	mode={editingCost ? 'edit' : 'create'}
	initial={editingCost ?? undefined}
	vehicles={vehiclesQ.data}
/>

<!-- Import modal -->
<ImportCostsModal
	bind:open={showImportModal}
	vehicles={vehiclesQ.data}
	onSuccess={() => toast.success('Import terminé')}
/>
