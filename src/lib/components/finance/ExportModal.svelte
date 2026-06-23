<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import { CATEGORY_LABELS } from './category-config.js';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import DownloadIcon from '@lucide/svelte/icons/download';

	interface Vehicle {
		_id: string;
		registration: string;
		brand: string;
		model: string;
	}

	interface Props {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
		vehicles: Vehicle[] | null | undefined;
		fromDate: number;
		toDate: number;
		initialFormat?: Format;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		vehicles,
		fromDate,
		toDate,
		initialFormat = 'excel'
	}: Props = $props();

	const client = useConvexClient();

	type Format = 'excel' | 'csv' | 'pdf';
	type DetailLevel = 'summary' | 'detailed';

	const ALL_CATEGORIES = [
		'LEASING',
		'CARBURANT',
		'ENTRETIEN',
		'ASSURANCE',
		'TAXES',
		'SINISTRE',
		'PARKING',
		'TELEPEAGE',
		'AUTRE'
	] as const;

	let format = $state<Format>('excel');

	// Sync format when modal opens with a new initialFormat
	$effect(() => {
		if (open) format = initialFormat;
	});
	let detailLevel = $state<DetailLevel>('summary');
	let selectedVehicleIds = $state<string[]>([]);
	let selectedCategories = $state<string[]>([]);
	let isGenerating = $state(false);

	const showDetailLevel = $derived(format !== 'csv');
	const showIncludeAll = $derived(selectedVehicleIds.length === 0 && selectedCategories.length === 0);

	function toggleVehicle(id: string) {
		if (selectedVehicleIds.includes(id)) {
			selectedVehicleIds = selectedVehicleIds.filter((v) => v !== id);
		} else {
			selectedVehicleIds = [...selectedVehicleIds, id];
		}
	}

	function toggleCategory(cat: string) {
		if (selectedCategories.includes(cat)) {
			selectedCategories = selectedCategories.filter((c) => c !== cat);
		} else {
			selectedCategories = [...selectedCategories, cat];
		}
	}

	function reset() {
		format = initialFormat;
		detailLevel = 'summary';
		selectedVehicleIds = [];
		selectedCategories = [];
		isGenerating = false;
	}

	function handleOpenChange(v: boolean) {
		if (!v) reset();
		onOpenChange?.(v);
	}

	async function handleGenerate() {
		if (isGenerating) return;
		isGenerating = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const url = await client.action((api as any).exports.financial.generateFinancialExport, {
				format,
				fromDate,
				toDate,
				vehicleIds: selectedVehicleIds.length > 0 ? selectedVehicleIds : undefined,
				categories: selectedCategories.length > 0 ? selectedCategories : undefined,
				detailLevel
			});

			// Trigger download via hidden anchor
			const a = document.createElement('a');
			a.href = url as string;
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			toast.success('Export généré — téléchargement en cours');
			handleOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de la génération de l'export");
		} finally {
			isGenerating = false;
		}
	}

	const formatOptions: { value: Format; label: string; desc: string; icon: typeof FileSpreadsheetIcon }[] = [
		{
			value: 'excel',
			label: 'Excel (.xlsx)',
			desc: 'Multi-onglets, styles, Pennylane',
			icon: FileSpreadsheetIcon
		},
		{
			value: 'csv',
			label: 'CSV',
			desc: '1 ligne par coût, UTF-8',
			icon: FileTextIcon
		},
		{
			value: 'pdf',
			label: 'PDF',
			desc: 'Rapport mis en page, imprimable',
			icon: FileTextIcon
		}
	];
</script>

<Dialog.Root
	{open}
	onOpenChange={handleOpenChange}
>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
		<Dialog.Content
			class="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-border bg-background shadow-xl flex flex-col focus:outline-none"
		>
			<!-- Header -->
			<Dialog.Header class="shrink-0 border-b border-border px-6 py-4">
				<div class="flex items-center gap-2">
					<DownloadIcon class="size-4 text-muted-foreground" />
					<Dialog.Title class="text-base font-semibold">Exporter le rapport financier</Dialog.Title>
				</div>
				<Dialog.Description class="text-xs text-muted-foreground mt-0.5">
					Fichier généré côté serveur — lien valide 10 minutes
				</Dialog.Description>
			</Dialog.Header>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

				<!-- Format -->
				<div class="space-y-2">
					<p class="text-sm font-medium">Format</p>
					<div class="grid grid-cols-3 gap-2">
						{#each formatOptions as opt (opt.value)}
							{@const isActive = format === opt.value}
							<button
								type="button"
								class="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors {isActive
									? 'border-primary bg-primary/5'
									: 'border-border hover:border-primary/40 hover:bg-muted/50'}"
								onclick={() => (format = opt.value)}
							>
								<div class="flex items-center gap-1.5">
									<opt.icon
										class="size-3.5 {opt.value === 'excel'
											? 'text-emerald-600'
											: opt.value === 'pdf'
												? 'text-red-500'
												: 'text-blue-500'}"
									/>
									<span class="text-xs font-medium">{opt.label}</span>
								</div>
								<span class="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Detail level (not for CSV) -->
				{#if showDetailLevel}
					<div class="space-y-2">
						<p class="text-sm font-medium">Niveau de détail</p>
						<div class="flex gap-2">
							{#each [{ value: 'summary' as DetailLevel, label: 'Synthèse', desc: format === 'excel' ? '3 onglets' : 'KPIs + catégories + véhicules' }, { value: 'detailed' as DetailLevel, label: 'Détaillé', desc: format === 'excel' ? '5 onglets + Pennylane' : 'Toutes les lignes de coût' }] as opt (opt.value)}
								{@const isActive = detailLevel === opt.value}
								<button
									type="button"
									class="flex flex-1 flex-col items-start rounded-lg border p-3 text-left transition-colors {isActive
										? 'border-primary bg-primary/5'
										: 'border-border hover:border-primary/40 hover:bg-muted/50'}"
									onclick={() => (detailLevel = opt.value)}
								>
									<span class="text-xs font-medium">{opt.label}</span>
									<span class="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Vehicle filter -->
				{#if vehicles && vehicles.length > 0}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<p class="text-sm font-medium">Véhicules</p>
							{#if selectedVehicleIds.length > 0}
								<button
									type="button"
									class="text-[11px] text-muted-foreground hover:text-foreground underline"
									onclick={() => (selectedVehicleIds = [])}
								>
									Tous ({vehicles.length})
								</button>
							{:else}
								<span class="text-[11px] text-muted-foreground">Tous ({vehicles.length})</span>
							{/if}
						</div>
						<div
							class="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border"
						>
							{#each vehicles as v (v._id)}
								{@const checked = selectedVehicleIds.includes(v._id)}
								<label
									class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
								>
									<input
										type="checkbox"
										{checked}
										onchange={() => toggleVehicle(v._id)}
										class="size-3.5 rounded border-border accent-primary"
									/>
									<span class="text-xs font-mono font-medium">{v.registration}</span>
									<span class="text-xs text-muted-foreground truncate">{v.brand} {v.model}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Category filter -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<p class="text-sm font-medium">Catégories</p>
						{#if selectedCategories.length > 0}
							<button
								type="button"
								class="text-[11px] text-muted-foreground hover:text-foreground underline"
								onclick={() => (selectedCategories = [])}
							>
								Toutes (9)
							</button>
						{:else}
							<span class="text-[11px] text-muted-foreground">Toutes (9)</span>
						{/if}
					</div>
					<div class="grid grid-cols-3 gap-1.5">
						{#each ALL_CATEGORIES as cat (cat)}
							{@const checked = selectedCategories.includes(cat)}
							<label
								class="flex items-center gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer transition-colors {checked
									? 'border-primary bg-primary/5'
									: 'border-border hover:border-primary/30'}"
							>
								<input
									type="checkbox"
									{checked}
									onchange={() => toggleCategory(cat)}
									class="size-3 rounded border-border accent-primary"
								/>
								<span class="text-[11px] font-medium truncate"
									>{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}</span
								>
							</label>
						{/each}
					</div>
				</div>

				<!-- Scope summary -->
				{#if showIncludeAll}
					<p class="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
						Tous les véhicules et catégories de la période seront inclus.
					</p>
				{/if}
			</div>

			<!-- Footer -->
			<Dialog.Footer class="shrink-0 border-t border-border px-6 py-4">
				<Button variant="outline" onclick={() => handleOpenChange(false)} disabled={isGenerating}>
					Annuler
				</Button>
				<Button onclick={handleGenerate} disabled={isGenerating} class="gap-2">
					{#if isGenerating}
						<LoaderCircleIcon class="size-4 animate-spin" />
						Génération…
					{:else}
						<DownloadIcon class="size-4" />
						Générer l'export
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
