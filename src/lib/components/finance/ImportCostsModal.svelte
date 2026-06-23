<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import Papa from 'papaparse';
	import { CATEGORY_LABELS } from './category-config.js';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
	import XIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';

	type Category =
		| 'LEASING' | 'CARBURANT' | 'ENTRETIEN' | 'ASSURANCE'
		| 'TAXES' | 'SINISTRE' | 'PARKING' | 'TELEPEAGE' | 'AUTRE';

	interface Vehicle {
		_id: string;
		registration: string;
	}

	interface Props {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
		vehicles: Vehicle[] | null | undefined;
		onSuccess?: () => void;
	}

	let { open = $bindable(false), onOpenChange, vehicles, onSuccess }: Props = $props();

	const client = useConvexClient();

	type Step = 1 | 2;
	let step = $state<Step>(1);
	let isDragging = $state(false);
	let fileError = $state<string | null>(null);
	let isParsing = $state(false);
	let isImporting = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	interface ParsedRow {
		vehicleId?: string;
		vehicleReg?: string;
		category: Category | null;
		categoryRaw: string;
		amount: number | null;
		amountRaw: string;
		vatAmount?: number;
		date: number | null;
		dateRaw: string;
		description: string;
		invoiceRef: string;
		valid: boolean;
		errors: string[];
	}

	let parsedRows = $state<ParsedRow[]>([]);
	let fileName = $state('');

	// Category normalization map
	const CATEGORY_MAP: Record<string, Category> = {
		leasing: 'LEASING', loyer: 'LEASING',
		carburant: 'CARBURANT', essence: 'CARBURANT', gazole: 'CARBURANT', diesel: 'CARBURANT', gasoil: 'CARBURANT',
		entretien: 'ENTRETIEN', maintenance: 'ENTRETIEN', revision: 'ENTRETIEN', reparation: 'ENTRETIEN',
		assurance: 'ASSURANCE',
		taxes: 'TAXES', taxe: 'TAXES', tvs: 'TAXES', vignette: 'TAXES', fiscalite: 'TAXES',
		sinistre: 'SINISTRE', accident: 'SINISTRE', franchise: 'SINISTRE',
		parking: 'PARKING', stationnement: 'PARKING',
		telepeage: 'TELEPEAGE', peage: 'TELEPEAGE', autoroute: 'TELEPEAGE',
		autre: 'AUTRE', divers: 'AUTRE', misc: 'AUTRE'
	};

	function normalizeKey(s: string): string {
		return s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_|_$/g, '');
	}

	function detectColumn(headers: string[], candidates: string[]): string | null {
		for (const h of headers) {
			const nk = normalizeKey(h);
			if (candidates.some((c) => nk === c || nk.includes(c))) return h;
		}
		return null;
	}

	function parseDate(raw: string): number | null {
		if (!raw?.trim()) return null;
		const s = raw.trim();
		// ISO: YYYY-MM-DD
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
			const d = new Date(s);
			return isNaN(d.getTime()) ? null : d.getTime();
		}
		// French: DD/MM/YYYY or DD-MM-YYYY
		const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
		if (m) {
			const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
			return isNaN(d.getTime()) ? null : d.getTime();
		}
		return null;
	}

	function parseAmount(raw: string): number | null {
		if (!raw?.trim()) return null;
		const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.');
		const n = parseFloat(cleaned);
		return isNaN(n) ? null : n;
	}

	function normalizeCategory(raw: string): Category | null {
		const k = normalizeKey(raw);
		if (CATEGORY_MAP[k]) return CATEGORY_MAP[k];
		// Check if it's already a valid enum value
		const upper = raw.trim().toUpperCase() as Category;
		if (Object.keys(CATEGORY_LABELS).includes(upper)) return upper;
		return null;
	}

	function parseCSV(file: File) {
		const error = file.name.toLowerCase().endsWith('.csv') ? null : 'Le fichier doit être au format .csv';
		if (error || file.size > 5 * 1024 * 1024) {
			fileError = error ?? 'Le fichier ne doit pas dépasser 5 Mo';
			return;
		}
		fileError = null;
		isParsing = true;
		fileName = file.name;

		Papa.parse<Record<string, string>>(file, {
			header: true,
			skipEmptyLines: true,
			dynamicTyping: false,
			delimitersToGuess: [',', ';', '\t', '|'],
			beforeFirstChunk: (chunk) => chunk.replace(/^﻿/, ''),
			complete(results) {
				isParsing = false;
				if (results.errors.length > 0 && results.data.length === 0) {
					fileError = 'Impossible de lire le fichier CSV.';
					return;
				}
				const headers = results.meta.fields ?? [];
				const vehicleReg = detectColumn(headers, ['vehicule', 'immatriculation', 'immat', 'vehicle', 'plaque']);
				const categoryCol = detectColumn(headers, ['categorie', 'category', 'type']);
				const amountCol = detectColumn(headers, ['montant_ttc', 'montant', 'amount', 'prix', 'cout', 'ttc']);
				const vatCol = detectColumn(headers, ['tva', 'vat', 'taxe']);
				const dateCol = detectColumn(headers, ['date', 'date_facture', 'date_depense']);
				const descCol = detectColumn(headers, ['description', 'libelle', 'objet', 'motif', 'note']);
				const refCol = detectColumn(headers, ['reference', 'ref_facture', 'ref', 'numero_facture', 'facture']);

				const vehicleMap = new Map((vehicles ?? []).map((v) => [v.registration.toUpperCase(), v._id]));

				parsedRows = results.data.map((row) => {
					const errors: string[] = [];
					const vehicleRegRaw = vehicleReg ? row[vehicleReg]?.trim() ?? '' : '';
					const vehicleIdResolved = vehicleRegRaw
						? vehicleMap.get(vehicleRegRaw.toUpperCase())
						: undefined;
					if (vehicleRegRaw && !vehicleIdResolved) {
						errors.push(`Véhicule "${vehicleRegRaw}" introuvable`);
					}

					const categoryRaw = categoryCol ? row[categoryCol]?.trim() ?? '' : '';
					const category = categoryRaw ? normalizeCategory(categoryRaw) : null;
					if (!category) errors.push(`Catégorie "${categoryRaw}" invalide`);

					const amountRaw = amountCol ? row[amountCol]?.trim() ?? '' : '';
					const amount = parseAmount(amountRaw);
					if (!amount || amount <= 0) errors.push('Montant invalide ou manquant');

					const vatRaw = vatCol ? row[vatCol]?.trim() ?? '' : '';
					const vatAmount = vatRaw ? parseAmount(vatRaw) ?? undefined : undefined;

					const dateRaw = dateCol ? row[dateCol]?.trim() ?? '' : '';
					const date = parseDate(dateRaw);
					if (!date) errors.push('Date invalide ou manquante');

					const description = (descCol ? row[descCol]?.trim() : '') || '—';
					const invoiceRef = refCol ? row[refCol]?.trim() ?? '' : '';

					return {
						vehicleId: vehicleIdResolved,
						vehicleReg: vehicleRegRaw || undefined,
						category,
						categoryRaw,
						amount,
						amountRaw,
						vatAmount,
						date,
						dateRaw,
						description,
						invoiceRef,
						valid: errors.length === 0,
						errors
					};
				});

				step = 2;
			},
			error(err) {
				isParsing = false;
				fileError = (err as Error).message ?? 'Erreur de parsing';
			}
		});
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) parseCSV(file);
	}

	function handleFileInput(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) parseCSV(file);
		(e.currentTarget as HTMLInputElement).value = '';
	}

	async function handleImport() {
		const validRows = parsedRows.filter((r) => r.valid);
		if (validRows.length === 0) return;

		isImporting = true;
		try {
			const costs = validRows.map((r) => ({
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				vehicleId: r.vehicleId as any,
				category: r.category!,
				amount: r.amount!,
				vatAmount: r.vatAmount,
				date: r.date!,
				description: r.description,
				invoiceUrl: r.invoiceRef ? undefined : undefined
			}));

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = await client.mutation((api as any).costs.bulkImportCosts, { costs });
			toast.success(`${result.inserted} coût${result.inserted > 1 ? 's' : ''} importé${result.inserted > 1 ? 's' : ''} !`);
			if (result.errors.length > 0) {
				toast.warning(`${result.errors.length} ligne${result.errors.length > 1 ? 's' : ''} ignorée${result.errors.length > 1 ? 's' : ''}`);
			}
			handleOpenChange(false);
			onSuccess?.();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Erreur inconnue';
			toast.error(msg);
		} finally {
			isImporting = false;
		}
	}

	function resetState() {
		step = 1;
		parsedRows = [];
		fileError = null;
		isParsing = false;
		isImporting = false;
		isDragging = false;
		fileName = '';
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isImporting) resetState();
		open = isOpen;
		onOpenChange?.(isOpen);
	}

	const validCount = $derived(parsedRows.filter((r) => r.valid).length);
	const invalidCount = $derived(parsedRows.filter((r) => !r.valid).length);
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl">
			<!-- Header -->
			<Dialog.Header class="shrink-0 border-b border-border px-6 py-4">
				<div class="flex items-center justify-between pr-10">
					<div>
						<Dialog.Title class="text-base">Importer des coûts CSV</Dialog.Title>
						<Dialog.Description class="text-xs text-muted-foreground">
							Étape {step}/2 — {step === 1 ? 'Upload' : 'Prévisualisation'}
						</Dialog.Description>
					</div>
					<div class="flex items-center gap-2" aria-hidden="true">
						{#each [1, 2] as s}
							<div class="flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors {s < step ? 'bg-primary text-primary-foreground' : s === step ? 'ring-primary bg-primary/15 text-primary ring-2 ring-offset-1' : 'bg-muted text-muted-foreground'}">
								{#if s < step}<CheckIcon class="size-3" />{:else}{s}{/if}
							</div>
							{#if s < 2}<div class="h-px w-4 bg-border"></div>{/if}
						{/each}
					</div>
				</div>
			</Dialog.Header>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto px-6 py-5">
				{#if step === 1}
					<div class="flex flex-col gap-4">
						<!-- Drop zone -->
						<div
							role="button"
							tabindex={0}
							class="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-8 py-10 text-center transition-colors
								{isDragging ? 'border-primary bg-primary/5' : fileName ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-foreground/20 hover:bg-muted/20'}"
							ondragover={(e) => { e.preventDefault(); isDragging = true; }}
							ondragleave={() => (isDragging = false)}
							ondrop={handleDrop}
							onclick={() => fileInputRef?.click()}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef?.click(); } }}
						>
							<input type="file" accept=".csv" class="hidden" bind:this={fileInputRef} onchange={handleFileInput} />
							{#if isParsing}
								<LoaderCircleIcon class="size-10 animate-spin text-muted-foreground" />
								<p class="text-sm text-muted-foreground">Lecture du fichier...</p>
							{:else if fileName}
								<FileTextIcon class="size-10 text-green-600 dark:text-green-400" />
								<p class="text-sm font-medium">{fileName}</p>
								<p class="text-xs text-muted-foreground/60">Cliquez pour changer</p>
							{:else}
								<UploadCloudIcon class="size-10 text-muted-foreground/50" />
								<p class="text-sm font-medium">{isDragging ? 'Déposez ici' : 'Glissez-déposez votre fichier CSV'}</p>
								<p class="text-xs text-muted-foreground">ou cliquez pour parcourir · Max 5 Mo</p>
							{/if}
						</div>

						{#if fileError}
							<p class="flex items-center gap-1.5 text-sm text-destructive">
								<XIcon class="size-4 shrink-0" />{fileError}
							</p>
						{/if}

						<!-- Format hint -->
						<div class="rounded-md border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
							<p class="mb-2 font-medium">Format attendu (colonnes auto-détectées)</p>
							<div class="grid grid-cols-2 gap-x-6 gap-y-0.5">
								<span><span class="font-medium text-foreground">Véhicule</span> — immatriculation (optionnel)</span>
								<span><span class="font-medium text-foreground">Catégorie</span> — LEASING, CARBURANT, ENTRETIEN…</span>
								<span><span class="font-medium text-foreground">Montant TTC</span> — nombre décimal</span>
								<span><span class="font-medium text-foreground">TVA</span> — nombre décimal (optionnel)</span>
								<span><span class="font-medium text-foreground">Date</span> — YYYY-MM-DD ou DD/MM/YYYY</span>
								<span><span class="font-medium text-foreground">Description</span> — libellé de la dépense</span>
							</div>
						</div>
					</div>

				{:else}
					<!-- Preview table -->
					<div class="flex flex-col gap-3">
						<div class="flex items-center gap-3 text-sm">
							{#if validCount > 0}
								<span class="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
									<CheckIcon class="size-4" />
									{validCount} ligne{validCount > 1 ? 's' : ''} valide{validCount > 1 ? 's' : ''}
								</span>
							{/if}
							{#if invalidCount > 0}
								<span class="flex items-center gap-1 text-amber-600 dark:text-amber-500">
									<AlertTriangleIcon class="size-4" />
									{invalidCount} ligne{invalidCount > 1 ? 's' : ''} ignorée{invalidCount > 1 ? 's' : ''}
								</span>
							{/if}
						</div>

						<div class="overflow-hidden rounded-md border border-border">
							<div class="max-h-[50vh] overflow-y-auto">
								<table class="w-full min-w-[600px] text-xs">
									<thead class="sticky top-0 bg-muted/60">
										<tr class="border-b border-border text-left text-muted-foreground">
											<th class="px-3 py-2 font-medium">Statut</th>
											<th class="px-3 py-2 font-medium">Date</th>
											<th class="px-3 py-2 font-medium">Véhicule</th>
											<th class="px-3 py-2 font-medium">Catégorie</th>
											<th class="px-3 py-2 font-medium">Description</th>
											<th class="px-3 py-2 text-right font-medium">Montant TTC</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-border/60">
										{#each parsedRows as row, i (i)}
											<tr class="transition-colors {row.valid ? 'hover:bg-muted/20' : 'bg-amber-500/5'}">
												<td class="px-3 py-2">
													{#if row.valid}
														<CheckIcon class="size-3.5 text-emerald-600" />
													{:else}
														<span title={row.errors.join(', ')}>
															<AlertTriangleIcon class="size-3.5 text-amber-500" />
														</span>
													{/if}
												</td>
												<td class="px-3 py-2 tabular-nums text-muted-foreground">
													{row.dateRaw || '—'}
												</td>
												<td class="px-3 py-2">
													{#if row.vehicleReg}
														<span class="font-mono">{row.vehicleReg}</span>
													{:else}
														<span class="text-muted-foreground/50">Global</span>
													{/if}
												</td>
												<td class="px-3 py-2">
													{#if row.category}
														{CATEGORY_LABELS[row.category] ?? row.category}
													{:else}
														<span class="text-amber-500">{row.categoryRaw}</span>
													{/if}
												</td>
												<td class="max-w-[180px] truncate px-3 py-2 text-muted-foreground">
													{row.description}
												</td>
												<td class="px-3 py-2 text-right tabular-nums">
													{#if row.amount != null}
														{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(row.amount)}
													{:else}
														<span class="text-amber-500">{row.amountRaw}</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>

						{#if invalidCount > 0}
							<p class="text-xs text-muted-foreground">
								Les lignes en orange ne seront pas importées. Corrigez le CSV et réessayez pour les inclure.
							</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="shrink-0 border-t border-border px-6 py-4">
				<div class="flex w-full items-center justify-between">
					<Button variant="ghost" size="sm" onclick={() => handleOpenChange(false)} disabled={isImporting}>
						Annuler
					</Button>
					<div class="flex items-center gap-2">
						{#if step === 2 && !isImporting}
							<Button variant="outline" size="sm" onclick={() => (step = 1)}>
								Précédent
							</Button>
						{/if}
						{#if step === 1}
							<Button size="sm" disabled={!fileName || isParsing} onclick={() => { if (parsedRows.length > 0) step = 2; }}>
								Suivant
							</Button>
						{:else}
							<Button
								size="sm"
								disabled={validCount === 0 || isImporting}
								onclick={handleImport}
							>
								{#if isImporting}<LoaderCircleIcon class="size-4 animate-spin" />{/if}
								Importer {validCount} coût{validCount > 1 ? 's' : ''}
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
