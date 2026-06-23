<script lang="ts">
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	type Energy = 'THERMAL' | 'HYBRID' | 'ELECTRIC';
	type Category = 'PASSENGER' | 'UTILITY' | 'TRUCK';

	interface VehicleInput {
		registration: string;
		brand: string;
		model: string;
		year: number;
		energy: Energy;
		category: Category;
		kilometers?: number;
		purchaseDate?: string;
		leaseEndDate?: string;
		location?: string;
		notes?: string;
	}

	interface ImportResult {
		inserted: number;
		skipped: number;
		skippedRegistrations: string[];
	}

	interface Props {
		rows: Record<string, string>[];
		mapping: Record<string, string>;
		isImporting?: boolean;
		isDone?: boolean;
		onImportComplete: (result: ImportResult) => void;
		onImportingChange?: (v: boolean) => void;
		onDoneChange?: (v: boolean) => void;
	}

	let {
		rows,
		mapping,
		isImporting = $bindable(false),
		isDone = $bindable(false),
		onImportComplete,
		onImportingChange,
		onDoneChange
	}: Props = $props();

	const client = useConvexClient();

	let progress = $state(0);
	let importResult = $state<ImportResult | null>(null);
	let importError = $state<string | null>(null);

	const PREVIEW_FIELDS: { key: string; label: string }[] = [
		{ key: 'registration', label: 'Immat.' },
		{ key: 'brand', label: 'Marque' },
		{ key: 'model', label: 'Modele' },
		{ key: 'year', label: 'Annee' },
		{ key: 'energy', label: 'Energie' },
		{ key: 'category', label: 'Categorie' }
	];

	function normalizeEnergy(raw: string): Energy | null {
		const v = raw.trim().toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
		if (v.includes('thermique') || v.includes('thermal')) return 'THERMAL';
		if (v.includes('hybride') || v.includes('hybrid')) return 'HYBRID';
		if (v.includes('electrique') || v.includes('electric')) return 'ELECTRIC';
		return null;
	}

	function normalizeCategory(raw: string): Category | null {
		const v = raw.trim().toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
		if (
			v.includes('tourisme') ||
			v.includes('passenger') ||
			v.includes('berline') ||
			v.includes('suv') ||
			v === 'vp'
		)
			return 'PASSENGER';
		if (
			v.includes('utilitaire') ||
			v.includes('utility') ||
			v.includes('vul') ||
			v.includes('fourgon') ||
			v.includes('camionnette')
		)
			return 'UTILITY';
		if (
			v.includes('camion') ||
			v.includes('truck') ||
			v.includes('poids lourd') ||
			v.includes('semi')
		)
			return 'TRUCK';
		return null;
	}

	function parseOptionalNumber(raw: string | undefined): number | undefined {
		if (!raw?.trim()) return undefined;
		const n = parseFloat(raw.replace(',', '.').replace(/\s/g, ''));
		return isNaN(n) ? undefined : n;
	}

	function col(row: Record<string, string>, field: string): string {
		return row[mapping[field] ?? ''] ?? '';
	}

	function convertRow(row: Record<string, string>): VehicleInput | null {
		const registration = col(row, 'registration').trim();
		const brand = col(row, 'brand').trim();
		const model = col(row, 'model').trim();
		const yearRaw = col(row, 'year').trim();
		const year = parseInt(yearRaw, 10);
		const energy = normalizeEnergy(col(row, 'energy'));
		const category = normalizeCategory(col(row, 'category'));

		if (!registration || !brand || !model || isNaN(year) || !energy || !category) return null;

		return {
			registration,
			brand,
			model,
			year,
			energy,
			category,
			kilometers: parseOptionalNumber(col(row, 'kilometers') || undefined),
			purchaseDate: col(row, 'purchaseDate').trim() || undefined,
			leaseEndDate: col(row, 'leaseEndDate').trim() || undefined,
			location: col(row, 'location').trim() || undefined,
			notes: col(row, 'notes').trim() || undefined
		};
	}

	const converted = $derived.by(() => {
		const validList: VehicleInput[] = [];
		let invalidCount = 0;
		for (const row of rows) {
			const v = convertRow(row);
			if (v) validList.push(v);
			else invalidCount++;
		}
		return { valid: validList, invalidCount };
	});

	const previewValid = $derived(converted.valid.slice(0, 5));

	async function startImport() {
		if (converted.valid.length === 0) return;
		isImporting = true;
		onImportingChange?.(true);
		importError = null;
		progress = 0;

		const CHUNK_SIZE = 20;
		const chunks: VehicleInput[][] = [];
		for (let i = 0; i < converted.valid.length; i += CHUNK_SIZE) {
			chunks.push(converted.valid.slice(i, i + CHUNK_SIZE));
		}

		let totalInserted = 0;
		let totalSkipped = 0;
		const allSkipped: string[] = [];

		try {
			for (let i = 0; i < chunks.length; i++) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const result = (await client.mutation((api as any).vehicles.bulkCreateVehicles, {
					vehicles: chunks[i]
				})) as ImportResult;
				totalInserted += result.inserted;
				totalSkipped += result.skipped;
				allSkipped.push(...result.skippedRegistrations);
				progress = (i + 1) / chunks.length;
			}

			const finalResult: ImportResult = {
				inserted: totalInserted,
				skipped: totalSkipped,
				skippedRegistrations: allSkipped
			};
			importResult = finalResult;
			isImporting = false;
			isDone = true;
			onImportingChange?.(false);
			onDoneChange?.(true);
			onImportComplete(finalResult);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Une erreur est survenue';
			isImporting = false;
			onImportingChange?.(false);
		}
	}
</script>

<div class="flex flex-col gap-4">
	{#if !isImporting && !isDone && !importError}
		<!-- Summary + Preview -->
		<div class="flex items-center justify-between rounded-md border border-border bg-muted/20 px-4 py-3">
			<div class="flex flex-col gap-0.5">
				<p class="text-sm font-medium">
					{converted.valid.length} vehicule{converted.valid.length > 1 ? 's' : ''} a importer
				</p>
				{#if converted.invalidCount > 0}
					<p class="text-xs text-muted-foreground">
						{converted.invalidCount} ligne{converted.invalidCount > 1 ? 's' : ''} ignoree{converted.invalidCount > 1 ? 's' : ''} (donnees invalides)
					</p>
				{/if}
			</div>
			<Button
				size="sm"
				onclick={startImport}
				disabled={converted.valid.length === 0}
				data-testid="btn-import-confirm"
			>
				Importer {converted.valid.length} vehicule{converted.valid.length > 1 ? 's' : ''}
			</Button>
		</div>

		{#if previewValid.length > 0}
			<div class="flex flex-col gap-1.5">
				<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Apercu (5 premiers)
				</p>
				<div class="overflow-x-auto rounded-md border border-border">
					<Table.Root>
						<Table.Header>
							<Table.Row class="bg-muted/40 hover:bg-muted/40">
								{#each PREVIEW_FIELDS as f (f.key)}
									<Table.Head class="text-xs">{f.label}</Table.Head>
								{/each}
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each previewValid as vehicle, i (i)}
								<Table.Row>
									<Table.Cell class="font-mono text-xs">{vehicle.registration}</Table.Cell>
									<Table.Cell class="text-xs">{vehicle.brand}</Table.Cell>
									<Table.Cell class="text-xs">{vehicle.model}</Table.Cell>
									<Table.Cell class="text-xs">{vehicle.year}</Table.Cell>
									<Table.Cell class="text-xs text-muted-foreground">{vehicle.energy}</Table.Cell>
									<Table.Cell class="text-xs text-muted-foreground">{vehicle.category}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		{/if}

		{#if converted.valid.length === 0}
			<p class="text-sm text-destructive">
				Aucune ligne valide a importer. Verifiez votre fichier et le mapping des colonnes.
			</p>
		{/if}

	{:else if isImporting}
		<!-- Progress -->
		<div class="flex flex-col items-center gap-4 py-6" data-testid="import-progress">
			<LoaderCircleIcon class="size-8 animate-spin text-muted-foreground" />
			<div class="flex w-full flex-col items-center gap-2">
				<p class="text-sm text-muted-foreground">
					Import en cours... {Math.round(progress * 100)}%
				</p>
				<Progress value={Math.round(progress * 100)} max={100} class="h-2 w-full max-w-xs" />
			</div>
			<p class="text-xs text-muted-foreground">Ne fermez pas cette fenetre.</p>
		</div>

	{:else if isDone && importResult}
		<!-- Done -->
		<div class="flex flex-col gap-3" data-testid="import-success">
			<div class="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
				<CheckCircleIcon class="size-4 shrink-0" />
				{importResult.inserted} vehicule{importResult.inserted > 1 ? 's' : ''} importe{importResult.inserted > 1 ? 's' : ''} avec succes
			</div>

			{#if importResult.skipped > 0}
				<div
					class="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3"
					data-testid="import-skipped-list"
				>
					<p class="text-xs font-medium text-muted-foreground">
						{importResult.skipped} immatriculation{importResult.skipped > 1 ? 's' : ''} ignoree{importResult.skipped > 1 ? 's' : ''} (deja existante{importResult.skipped > 1 ? 's' : ''}) :
					</p>
					<ul class="flex flex-wrap gap-1.5">
						{#each importResult.skippedRegistrations as reg (reg)}
							<li class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{reg}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

	{:else if importError}
		<!-- Error -->
		<div class="flex flex-col gap-3">
			<div class="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
				<AlertCircleIcon class="mt-0.5 size-4 shrink-0 text-destructive" />
				<div class="flex flex-col gap-1">
					<p class="text-sm font-medium text-destructive">Erreur lors de l'import</p>
					<p class="text-xs text-muted-foreground">{importError}</p>
				</div>
			</div>
			<Button variant="outline" size="sm" onclick={() => (importError = null)}>
				Reessayer
			</Button>
		</div>
	{/if}
</div>
