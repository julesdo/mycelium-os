<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import CSVMappingStep from './CSVMappingStep.svelte';
	import CSVPreviewStep from './CSVPreviewStep.svelte';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
	import XIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { toast } from 'svelte-sonner';
	import Papa from 'papaparse';

	interface Props {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
		onSuccess?: () => void;
	}

	let { open = $bindable(false), onOpenChange, onSuccess }: Props = $props();

	type Step = 1 | 2 | 3 | 4;
	let currentStep = $state<Step>(1);

	// Step 1 state
	let isDragging = $state(false);
	let fileError = $state<string | null>(null);
	let isParsing = $state(false);
	let parsedFile = $state<{
		name: string;
		rowCount: number;
		headers: string[];
		rows: Record<string, string>[];
	} | null>(null);

	// Step 2 state
	let mapping = $state<Record<string, string>>({});
	let mappingValid = $state(false);

	// Step 3 state (communicated up from CSVPreviewStep)
	let isImporting = $state(false);
	let isDone = $state(false);
	let importResult = $state<{ inserted: number; skipped: number } | null>(null);

	let fileInputRef = $state<HTMLInputElement | null>(null);

	function resetState() {
		currentStep = 1;
		isDragging = false;
		fileError = null;
		isParsing = false;
		parsedFile = null;
		mapping = {};
		mappingValid = false;
		isImporting = false;
		isDone = false;
		importResult = null;
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen && !isImporting) resetState();
		open = isOpen;
		onOpenChange?.(isOpen);
	}

	// --- Step 1: File handling ---

	function validateFile(file: File): string | null {
		if (!file.name.toLowerCase().endsWith('.csv')) {
			return 'Le fichier doit etre au format .csv';
		}
		if (file.size > 5 * 1024 * 1024) {
			return 'Le fichier ne doit pas depasser 5 Mo';
		}
		return null;
	}

	function parseFile(file: File) {
		const error = validateFile(file);
		if (error) {
			fileError = error;
			parsedFile = null;
			return;
		}

		fileError = null;
		isParsing = true;
		parsedFile = null;

		Papa.parse<Record<string, string>>(file, {
			header: true,
			skipEmptyLines: true,
			dynamicTyping: false,
			// Detect French (;) and other delimiters in addition to the default comma
			delimitersToGuess: [',', ';', '\t', '|'],
			// Strip UTF-8 BOM (﻿) that Excel adds to CSV exports
			beforeFirstChunk: (chunk) => chunk.replace(/^﻿/, ''),
			complete(results) {
				isParsing = false;
				if (results.errors.length > 0 && results.data.length === 0) {
					fileError = 'Impossible de lire le fichier CSV. Verifiez son format.';
					return;
				}
				parsedFile = {
					name: file.name,
					rowCount: results.data.length,
					headers: results.meta.fields ?? [],
					rows: results.data
				};
			},
			error(err) {
				isParsing = false;
				fileError = (err as Error).message ?? 'Erreur de parsing CSV';
			}
		});
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) parseFile(file);
	}

	function handleFileInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (file) parseFile(file);
		target.value = '';
	}

	function goBack() {
		if (currentStep > 1) currentStep = (currentStep - 1) as Step;
	}

	function goNext() {
		if (currentStep === 1 && parsedFile) currentStep = 2;
		else if (currentStep === 2 && mappingValid) currentStep = 3;
	}

	function handleImportComplete(result: { inserted: number; skipped: number }) {
		importResult = result;
		if (result.inserted > 0) {
			toast.success(
				`${result.inserted} vehicule${result.inserted > 1 ? 's' : ''} importe${result.inserted > 1 ? 's' : ''} !`
			);
		}
	}

	const stepLabel: Record<Step, string> = { 1: 'Upload', 2: 'Mapping', 3: 'Import', 4: 'Télématique' };
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
			<!-- Header -->
			<Dialog.Header class="shrink-0 border-b border-border px-6 py-4">
				<!-- pr-10 leaves room for the Dialog close button (absolute top-2 right-2) -->
				<div class="flex items-center justify-between pr-10">
					<div class="flex flex-col gap-0.5">
						<Dialog.Title class="text-base">Importer une flotte CSV</Dialog.Title>
						<Dialog.Description class="text-xs text-muted-foreground">
							{currentStep < 4 ? `Etape ${currentStep}/3 — ${stepLabel[currentStep]}` : 'Import terminé'}
						</Dialog.Description>
					</div>
					<!-- Step indicators (3 steps, step 4 is completion) -->
					{#if currentStep < 4}
						<div class="flex items-center gap-2" aria-hidden="true">
							{#each ([1, 2, 3] as Step[]) as step (step)}
								<div
									class="flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors {step < currentStep
										? 'bg-primary text-primary-foreground'
										: step === currentStep
											? 'ring-primary bg-primary/15 text-primary ring-2 ring-offset-1'
											: 'bg-muted text-muted-foreground'}"
								>
									{#if step < currentStep}
										<CheckIcon class="size-3" />
									{:else}
										{step}
									{/if}
								</div>
								{#if step < 3}
									<div class="h-px w-4 bg-border"></div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</Dialog.Header>

			<!-- Body (scrollable) -->
			<div class="flex-1 overflow-y-auto px-6 py-5">
				{#if currentStep === 1}
					<div class="flex flex-col gap-4">
						<!-- Drop zone -->
						<div
							role="button"
							tabindex={0}
							class="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-8 py-12 text-center transition-colors
								{isDragging
								? 'border-primary bg-primary/5'
								: parsedFile
									? 'border-primary/40 bg-primary/5'
									: 'border-border hover:border-foreground/20 hover:bg-muted/20'}"
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
							onclick={() => fileInputRef?.click()}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									fileInputRef?.click();
								}
							}}
						>
							<input
								type="file"
								accept=".csv"
								class="hidden"
								bind:this={fileInputRef}
								onchange={handleFileInput}
								data-testid="csv-file-input"
							/>

							{#if isParsing}
								<LoaderCircleIcon class="size-10 animate-spin text-muted-foreground" />
								<p class="text-sm text-muted-foreground">Lecture du fichier...</p>
							{:else if parsedFile}
								<FileTextIcon class="size-10 text-green-600 dark:text-green-400" />
								<div class="flex flex-col gap-1">
									<p class="text-sm font-medium">{parsedFile.name}</p>
									<p class="text-xs text-muted-foreground">
										{parsedFile.rowCount} ligne{parsedFile.rowCount > 1 ? 's' : ''} ·
										{parsedFile.headers.length} colonne{parsedFile.headers.length > 1 ? 's' : ''} detectee{parsedFile.headers.length > 1 ? 's' : ''}
									</p>
								</div>
								<p class="text-xs text-muted-foreground/60">Cliquez pour changer de fichier</p>
							{:else}
								<UploadCloudIcon class="size-10 text-muted-foreground/50" />
								<div class="flex flex-col gap-1">
									<p class="text-sm font-medium">
										{isDragging ? 'Deposez votre fichier ici' : 'Glissez-deposez votre fichier CSV'}
									</p>
									<p class="text-xs text-muted-foreground">ou cliquez pour parcourir</p>
								</div>
								<p class="text-xs text-muted-foreground/50">CSV uniquement · Max 5 Mo</p>
							{/if}
						</div>

						{#if fileError}
							<p class="flex items-center gap-1.5 text-sm text-destructive">
								<XIcon class="size-4 shrink-0" />
								{fileError}
							</p>
						{/if}

						<!-- Hint -->
						<div class="rounded-md border border-border bg-muted/20 px-4 py-3">
							<p class="mb-1 text-xs font-medium text-muted-foreground">Colonnes attendues</p>
							<p class="text-xs text-muted-foreground leading-relaxed">
								<span class="font-medium">Obligatoires :</span> Immatriculation, Marque, Modele, Annee, Energie (Thermique / Hybride / Electrique), Categorie (Tourisme / VP / SUV / Berline / Utilitaire / VUL / Fourgon / Camion / Poids lourd)
							</p>
							<p class="mt-0.5 text-xs text-muted-foreground leading-relaxed">
								<span class="font-medium">Optionnels :</span> Kilometrage, Date d'achat, Fin de leasing, Site, Notes
							</p>
						</div>
					</div>

				{:else if currentStep === 2 && parsedFile}
					<CSVMappingStep
						headers={parsedFile.headers}
						rows={parsedFile.rows}
						{mapping}
						onMappingChange={(m) => (mapping = m)}
						onValidChange={(v) => (mappingValid = v)}
					/>

				{:else if currentStep === 3 && parsedFile}
					<CSVPreviewStep
						rows={parsedFile.rows}
						{mapping}
						bind:isImporting
						bind:isDone
						onImportComplete={handleImportComplete}
					/>

				{:else if currentStep === 4}
					<!-- Import success + Smartcar onboarding -->
					<div class="flex flex-col gap-5">
						<!-- Summary -->
						{#if importResult}
							<div class="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
									<CheckIcon class="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
								</div>
								<div>
									<p class="text-sm font-semibold">
										{importResult.inserted} véhicule{importResult.inserted > 1 ? 's' : ''} importé{importResult.inserted > 1 ? 's' : ''}
									</p>
									{#if importResult.skipped > 0}
										<p class="text-xs text-muted-foreground">
											{importResult.skipped} ligne{importResult.skipped > 1 ? 's' : ''} ignorée{importResult.skipped > 1 ? 's' : ''} (erreurs de format)
										</p>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Smartcar CTA -->
						<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
							<div class="flex items-start gap-4">
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10">
									<WifiIcon class="h-4 w-4 text-blue-500" />
								</div>
								<div class="flex-1">
									<p class="text-sm font-semibold">Connectez Smartcar pour aller plus loin</p>
									<p class="mt-1 text-xs text-muted-foreground leading-relaxed">
										Synchronisez automatiquement l'odomètre, le niveau de batterie (VE/PHEV) et la localisation de chaque véhicule. Aucun hardware requis — le conducteur autorise l'accès depuis son application constructeur.
									</p>
									<ul class="mt-3 space-y-1.5">
										<li class="flex items-center gap-2 text-xs text-muted-foreground">
											<span class="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></span>
											Alertes maintenance kilométriques automatiques
										</li>
										<li class="flex items-center gap-2 text-xs text-muted-foreground">
											<span class="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></span>
											Niveau de batterie visible sur chaque fiche véhicule
										</li>
										<li class="flex items-center gap-2 text-xs text-muted-foreground">
											<span class="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></span>
											36+ constructeurs supportés (BMW, Tesla, Renault, Volvo…)
										</li>
									</ul>
									<div class="mt-4">
										<a href="/admin/fleet">
											<button
												type="button"
												onclick={() => { open = false; onSuccess?.(); resetState(); }}
												class="inline-flex h-8 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
											>
												Voir la flotte
												<ArrowRightIcon class="h-3.5 w-3.5" />
											</button>
										</a>
									</div>
								</div>
							</div>
						</div>

						<p class="text-xs text-muted-foreground">
							Vous pouvez aussi lier chaque véhicule à Smartcar individuellement depuis sa fiche dans la liste de flotte.
						</p>
					</div>
				{/if}
			</div>

			<!-- Footer — plain div to avoid Dialog.Footer's -mx-4 -mb-4 negative margins
			     that overflow when the dialog has p-0 -->
			<div class="shrink-0 border-t border-border px-6 py-4">
				<div class="flex w-full items-center justify-between">
					<Button
						variant="ghost"
						size="sm"
						onclick={() => { open = false; onSuccess?.(); resetState(); }}
						disabled={isImporting}
					>
						{currentStep === 4 ? 'Passer' : isDone ? 'Fermer' : 'Annuler'}
					</Button>

					<div class="flex items-center gap-2">
						{#if currentStep > 1 && !isImporting && !isDone && currentStep < 4}
							<Button variant="outline" size="sm" onclick={goBack}>
								Precedent
							</Button>
						{/if}

						{#if currentStep === 1}
							<Button
								size="sm"
								onclick={goNext}
								disabled={!parsedFile || isParsing}
								data-testid="btn-next"
							>
								Suivant
							</Button>
						{:else if currentStep === 2}
							<Button
								size="sm"
								onclick={goNext}
								disabled={!mappingValid}
								data-testid="btn-next"
							>
								Suivant
							</Button>
						{:else if currentStep === 3 && isDone}
							<Button
								size="sm"
								onclick={() => { currentStep = 4; }}
							>
								Suivant
								<ArrowRightIcon class="ml-1.5 h-3.5 w-3.5" />
							</Button>
						{:else if currentStep === 4}
							<Button
								size="sm"
								variant="outline"
								onclick={() => { open = false; onSuccess?.(); resetState(); }}
							>
								Terminer
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
