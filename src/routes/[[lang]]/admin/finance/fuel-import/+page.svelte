<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import FuelAnomalyCard from '$lib/components/finance/FuelAnomalyCard.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import FuelIcon from '@lucide/svelte/icons/fuel';
	import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CheckIcon from '@lucide/svelte/icons/check';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import XIcon from '@lucide/svelte/icons/x';
	import CircleDotIcon from '@lucide/svelte/icons/circle-dot';

	const client = useConvexClient();
	const lang = $derived(page.params.lang as string | undefined);

	function goToFinance() {
		const path = lang ? `/${lang}/admin/finance` : '/admin/finance';
		goto(resolve(path));
	}

	// ── Wizard state ──────────────────────────────────────────────────────────────

	type WizardStep = 1 | 2 | 3;
	let wizardActive = $state(false);
	let step = $state<WizardStep>(1);
	let currentImportId = $state('');

	// ── Upload state ──────────────────────────────────────────────────────────────

	let isDragging = $state(false);
	let fileName = $state('');
	let fileError = $state<string | null>(null);
	let isUploading = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);
	let selectedFile = $state<File | null>(null);

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) selectFile(file);
	}

	function handleFileInput(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) selectFile(file);
		(e.currentTarget as HTMLInputElement).value = '';
	}

	function selectFile(file: File) {
		fileError = null;
		const lower = file.name.toLowerCase();
		if (!lower.endsWith('.csv') && !lower.endsWith('.tsv') && !lower.endsWith('.txt')) {
			fileError = 'Le fichier doit être au format .csv ou .tsv';
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			fileError = 'Le fichier ne doit pas dépasser 10 Mo';
			return;
		}
		selectedFile = file;
		fileName = file.name;
	}

	async function startImport() {
		if (!selectedFile) return;
		isUploading = true;
		fileError = null;
		try {
			// 1. Obtain upload URL

			const uploadUrl = await client.mutation((api as any).fuelImport.generateFuelUploadUrl, {});

			// 2. Upload file to Convex Storage
			const contentType = selectedFile.name.toLowerCase().endsWith('.tsv')
				? 'text/tab-separated-values'
				: 'text/csv';
			const response = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': contentType },
				body: selectedFile
			});
			if (!response.ok) throw new Error("Erreur lors de l'upload du fichier");
			const { storageId } = await response.json();

			// 3. Start import processing

			const importId = await client.mutation((api as any).fuelImport.startFuelImport, {
				fileStorageId: storageId,
				fileName: selectedFile.name
			});

			currentImportId = importId;
			// Step 1 stays with a loading indicator — $effect will advance when action completes
		} catch (err) {
			fileError = err instanceof Error ? err.message : "Erreur lors du démarrage de l'import";
			isUploading = false;
		}
	}

	// ── Reactive import query ─────────────────────────────────────────────────────

	const importQueryArgs = $state({ importId: '' });
	const anomaliesQueryArgs = $state({ importId: '' });

	$effect(() => {
		importQueryArgs.importId = currentImportId;
		anomaliesQueryArgs.importId = currentImportId;
	});

	const importQ = useQuery((api as any).fuelImport.getFuelImport, importQueryArgs);

	const anomaliesQ = useQuery((api as any).fuelImport.getFuelAnomalies, anomaliesQueryArgs);

	// Auto-advance from step 1 → 2 when action completes
	$effect(() => {
		const status = importQ.data?.status;
		if (currentImportId && step === 1 && (status === 'REVIEW' || status === 'COMPLETED')) {
			isUploading = false;
			step = 2;
		}
		if (currentImportId && step === 1 && status === 'FAILED') {
			isUploading = false;
			fileError = importQ.data?.failureReason ?? 'Échec du traitement du fichier';
			currentImportId = '';
		}
	});

	// ── Import history ────────────────────────────────────────────────────────────

	const historyQ = useQuery((api as any).fuelImport.listFuelImports, {});

	// ── Derived ───────────────────────────────────────────────────────────────────

	const importData = $derived(importQ.data);
	const anomalies = $derived(anomaliesQ.data ?? []);
	const pendingAnomalies = $derived(anomalies.filter((a) => a.resolution === 'PENDING'));
	const resolvedAnomalies = $derived(anomalies.filter((a) => a.resolution !== 'PENDING'));

	const canProceedToStep3 = $derived(
		importData?.status === 'REVIEW' || importData?.status === 'COMPLETED'
	);

	function startNewImport() {
		wizardActive = true;
		step = 1;
		currentImportId = '';
		selectedFile = null;
		fileName = '';
		fileError = null;
		isUploading = false;
	}

	function cancelWizard() {
		if (isUploading) return;
		wizardActive = false;
		step = 1;
		currentImportId = '';
		selectedFile = null;
		fileName = '';
		fileError = null;
		isUploading = false;
	}

	async function finishImport() {
		if (currentImportId && importData?.status === 'REVIEW') {
			try {
				await client.mutation((api as any).fuelImport.completeImport, {
					importId: currentImportId
				});
			} catch {
				// ignore, we still close the wizard
			}
		}
		wizardActive = false;
		step = 1;
		currentImportId = '';
		selectedFile = null;
		fileName = '';
		toast.success('Import terminé');
	}

	// ── Formatting helpers ────────────────────────────────────────────────────────

	const fmtAmount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const fmtDate = new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});

	const PROVIDER_LABELS: Record<string, string> = {
		TOTAL_CARDS: 'Total Cards',
		BP_PLUS: 'BP Plus',
		SHELL_FLEET: 'Shell Fleet',
		GENERIC: 'Format générique'
	};

	const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
		PROCESSING: { label: 'En cours', class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
		REVIEW: { label: 'À valider', class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
		COMPLETED: {
			label: 'Terminé',
			class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
		},
		FAILED: { label: 'Échec', class: 'bg-red-500/10 text-red-600 dark:text-red-400' }
	};

	const STEPS = ['Upload', 'Validation', 'Confirmation'] as const;
</script>

<SEOHead
	title="Import Carburant — Finance — Mycelium Fleet"
	description="Import des relevés cartes carburant"
/>

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8">
	<!-- Header -->
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="flex items-center gap-3">
			<!-- eslint-disable-next-line local/no-hardcoded-aria-label -->
			<Button variant="ghost" size="icon-sm" onclick={goToFinance} aria-label="Retour Finance">
				<ArrowLeftIcon class="size-4" />
			</Button>
			<FuelIcon class="size-6 text-muted-foreground" />
			<div>
				<h1 class="text-base font-semibold">Import Carburant</h1>
				<p class="text-xs text-muted-foreground">Total Cards · BP Plus · Shell Fleet</p>
			</div>
		</div>

		{#if !wizardActive}
			<Button size="sm" class="gap-1.5" onclick={startNewImport}>
				<UploadCloudIcon class="size-4" />
				Nouvel import
			</Button>
		{/if}
	</div>

	<!-- Wizard card -->
	{#if wizardActive}
		<div class="rounded-xl border border-border bg-card">
			<!-- Wizard header with step indicators -->
			<div class="flex items-center justify-between border-b border-border px-6 py-4">
				<div>
					<p class="text-sm font-medium">Nouvel import</p>
					<p class="text-xs text-muted-foreground">
						Étape {step}/3 — {STEPS[step - 1]}
					</p>
				</div>
				<div class="flex items-center gap-2" aria-hidden="true">
					{#each [1, 2, 3] as s (s)}
						<div
							class="flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors
							{s < step
								? 'bg-primary text-primary-foreground'
								: s === step
									? 'bg-primary/15 text-primary ring-2 ring-primary ring-offset-1'
									: 'bg-muted text-muted-foreground'}"
						>
							{#if s < step}<CheckIcon class="size-3" />{:else}{s}{/if}
						</div>
						{#if s < 3}<div class="h-px w-4 bg-border"></div>{/if}
					{/each}
				</div>
			</div>

			<!-- Step content -->
			<div class="px-6 py-5">
				<!-- ── Step 1 : Upload ─────────────────────────────────────────────── -->
				{#if step === 1}
					<div class="flex flex-col gap-4">
						{#if !currentImportId}
							<!-- Drop zone -->
							<div
								role="button"
								tabindex={0}
								class="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-8 py-12 text-center transition-colors
									{isDragging
									? 'border-primary bg-primary/5'
									: fileName
										? 'border-primary/40 bg-primary/5'
										: 'border-border hover:border-foreground/20 hover:bg-muted/20'}"
								ondragover={(e) => {
									e.preventDefault();
									isDragging = true;
								}}
								ondragleave={() => (isDragging = false)}
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
									accept=".csv,.tsv,.txt"
									class="hidden"
									bind:this={fileInputRef}
									onchange={handleFileInput}
								/>
								{#if fileName}
									<FileTextIcon class="size-10 text-primary/70" />
									<p class="text-sm font-medium">{fileName}</p>
									<p class="text-xs text-muted-foreground">Cliquez pour changer de fichier</p>
								{:else}
									<UploadCloudIcon class="size-10 text-muted-foreground/40" />
									<p class="text-sm font-medium">
										{isDragging ? 'Déposez ici' : 'Glissez-déposez votre relevé CSV'}
									</p>
									<p class="text-xs text-muted-foreground">ou cliquez pour parcourir · CSV / TSV · Max 10 Mo</p>
								{/if}
							</div>

							{#if fileError}
								<p class="flex items-center gap-1.5 text-sm text-destructive">
									<XIcon class="size-4 shrink-0" />{fileError}
								</p>
							{/if}

							<!-- Format hint -->
							<div
								class="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground"
							>
								<p class="mb-2 font-medium text-foreground">Formats supportés</p>
								<ul class="space-y-0.5">
									<li>
										<span class="font-medium text-foreground">Total Cards</span> — CSV séparé par ; (colonnes
										: Date;Carte;Immat;Litres;TTC;Station)
									</li>
									<li>
										<span class="font-medium text-foreground">BP Plus</span> — CSV séparé par , (colonnes
										: Date,VehicleReg,Volume,GrossAmount,Site)
									</li>
									<li>
										<span class="font-medium text-foreground">Shell Fleet</span> — TSV séparé par tabulation
										(colonnes : Date\tImmat\tQuantite\tTTC\tStation)
									</li>
								</ul>
								<p class="mt-2">Le format est détecté automatiquement.</p>
							</div>
						{:else}
							<!-- Processing state -->
							<div class="flex flex-col items-center gap-4 py-8">
								<LoaderCircleIcon class="size-10 text-primary/60 motion-safe:animate-spin" />
								<div class="text-center">
									<p class="text-sm font-medium">Analyse en cours...</p>
									<p class="mt-0.5 text-xs text-muted-foreground">
										Matching des immatriculations et détection d'anomalies
									</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- ── Step 2 : Validation ─────────────────────────────────────────── -->
				{:else if step === 2}
					<div class="flex flex-col gap-5">
						<!-- Summary bar -->
						{#if importData}
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
								<div class="rounded-lg border border-border bg-background p-3">
									<p class="text-xs text-muted-foreground">Lignes traitées</p>
									<p class="mt-1 text-lg font-semibold tabular-nums">{importData.totalLines}</p>
								</div>
								<div class="rounded-lg border border-border bg-background p-3">
									<p class="text-xs text-muted-foreground">Matchées</p>
									<p
										class="mt-1 text-lg font-semibold text-emerald-600 tabular-nums dark:text-emerald-400"
									>
										{importData.matchedLines}
									</p>
								</div>
								<div class="rounded-lg border border-border bg-background p-3">
									<p class="text-xs text-muted-foreground">Non identifiées</p>
									<p
										class="mt-1 text-lg font-semibold tabular-nums
										{importData.unmatchedLines > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}"
									>
										{importData.unmatchedLines}
									</p>
								</div>
								<div class="rounded-lg border border-border bg-background p-3">
									<p class="text-xs text-muted-foreground">Anomalies</p>
									<p
										class="mt-1 text-lg font-semibold tabular-nums
										{importData.anomalyCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}"
									>
										{importData.anomalyCount}
									</p>
								</div>
							</div>
						{/if}

						<!-- Unmatched registrations -->
						{#if (importData?.unmatchedRegistrations?.length ?? 0) > 0}
							<div>
								<h3 class="mb-2 flex items-center gap-2 text-sm font-medium">
									<AlertTriangleIcon class="size-4 text-amber-500" />
									Immatriculations non identifiées
									<span
										class="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600"
									>
										{importData!.unmatchedRegistrations!.length}
									</span>
								</h3>
								<div class="rounded-lg border border-border bg-muted/20 p-3">
									<div class="flex flex-wrap gap-2">
										{#each importData?.unmatchedRegistrations ?? [] as reg (reg)}
											<span
												class="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs"
											>
												{reg}
											</span>
										{/each}
									</div>
									<p class="mt-2 text-xs text-muted-foreground">
										Ces immatriculations n'existent pas dans votre flotte. Les transactions
										associées ne seront pas importées.
									</p>
								</div>
							</div>
						{/if}

						<!-- Anomalies -->
						{#if anomalies.length > 0}
							<div>
								<h3 class="mb-3 flex items-center gap-2 text-sm font-medium">
									<CircleDotIcon class="size-4 text-red-500" />
									Anomalies détectées
									{#if pendingAnomalies.length > 0}
										<span
											class="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600"
										>
											{pendingAnomalies.length} en attente
										</span>
									{:else}
										<span
											class="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600"
										>
											Toutes traitées
										</span>
									{/if}
								</h3>

								<div class="flex flex-col gap-2">
									{#each anomalies as anomaly (anomaly._id)}
										<FuelAnomalyCard {anomaly} />
									{/each}
								</div>

								{#if pendingAnomalies.length > 0}
									<p class="mt-3 text-xs text-muted-foreground">
										Vous pouvez passer à la confirmation sans traiter les anomalies — elles
										resteront accessibles dans l'historique.
									</p>
								{/if}
							</div>
						{/if}

						<!-- No anomalies empty state -->
						{#if anomalies.length === 0 && (importData?.unmatchedLines ?? 0) === 0}
							<div
								class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 py-8 text-center"
							>
								<CheckIcon class="size-8 text-emerald-500" />
								<p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">
									Aucune anomalie détectée
								</p>
								<p class="text-xs text-muted-foreground">
									{importData?.matchedLines} coût{(importData?.matchedLines ?? 0) > 1 ? 's' : ''} carburant
									créé{(importData?.matchedLines ?? 0) > 1 ? 's' : ''} automatiquement.
								</p>
							</div>
						{/if}
					</div>

					<!-- ── Step 3 : Confirmation ───────────────────────────────────────── -->
				{:else if step === 3}
					<div class="flex flex-col gap-4">
						<div class="flex flex-col items-center gap-3 py-4 text-center">
							<div class="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
								<CheckIcon class="size-7 text-emerald-600 dark:text-emerald-400" />
							</div>
							<div>
								<p class="text-base font-medium">Import terminé</p>
								<p class="mt-0.5 text-sm text-muted-foreground">
									{PROVIDER_LABELS[importData?.provider ?? 'GENERIC']} ·
									{importData?.periodStart && importData?.periodEnd
										? `${importData.periodStart} → ${importData.periodEnd}`
										: ''}
								</p>
							</div>
						</div>

						<!-- Summary -->
						<div class="rounded-lg border border-border bg-muted/20 p-4">
							<dl class="grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-3">
								<div>
									<dt class="text-xs text-muted-foreground">Montant total</dt>
									<dd class="font-medium tabular-nums">
										{fmtAmount.format(importData?.totalAmount ?? 0)}
									</dd>
								</div>
								<div>
									<dt class="text-xs text-muted-foreground">Coûts créés</dt>
									<dd class="font-medium tabular-nums">
										{(importData?.matchedLines ?? 0) -
											(importData?.anomalyCount ?? 0) +
											resolvedAnomalies.filter((a) => a.resolution === 'ACCEPTED').length}
									</dd>
								</div>
								<div>
									<dt class="text-xs text-muted-foreground">Anomalies en attente</dt>
									<dd
										class="font-medium tabular-nums {pendingAnomalies.length > 0
											? 'text-amber-600'
											: ''}"
									>
										{pendingAnomalies.length}
									</dd>
								</div>
								<div>
									<dt class="text-xs text-muted-foreground">Non identifiées</dt>
									<dd class="font-medium tabular-nums">{importData?.unmatchedLines ?? 0}</dd>
								</div>
								<div>
									<dt class="text-xs text-muted-foreground">Fichier</dt>
									<dd class="truncate text-muted-foreground">{importData?.fileName}</dd>
								</div>
							</dl>
						</div>
					</div>
				{/if}
			</div>

			<!-- Wizard footer -->
			<div class="flex items-center justify-between border-t border-border px-6 py-4">
				<Button variant="ghost" size="sm" onclick={cancelWizard} disabled={isUploading}>
					{step === 3 ? 'Fermer' : 'Annuler'}
				</Button>

				<div class="flex items-center gap-2">
					{#if step === 2}
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								step = 1;
								currentImportId = '';
								selectedFile = null;
								fileName = '';
								isUploading = false;
							}}
						>
							Précédent
						</Button>
					{/if}

					{#if step === 1}
						<Button
							size="sm"
							class="gap-1.5"
							disabled={!selectedFile || isUploading || !!currentImportId}
							onclick={startImport}
						>
							{#if isUploading || currentImportId}
								<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
								Traitement...
							{:else}
								<UploadCloudIcon class="size-4" />
								Analyser
							{/if}
						</Button>
					{:else if step === 2}
						<Button size="sm" disabled={!canProceedToStep3} onclick={() => (step = 3)}>
							Confirmer →
						</Button>
					{:else if step === 3}
						<Button size="sm" class="gap-1.5" onclick={finishImport}>
							<CheckIcon class="size-4" />
							Terminer
						</Button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Import history -->
	<div>
		<h2 class="mb-3 text-sm font-medium text-muted-foreground">Historique des imports</h2>

		{#if historyQ.isLoading}
			<div class="flex flex-col gap-2">
				{#each Array(3) as _, i (i)}
					<Skeleton class="h-14 w-full" />
				{/each}
			</div>
		{:else if !historyQ.data || historyQ.data.length === 0}
			<div
				class="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
			>
				Aucun import réalisé.
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg border border-border">
				<table class="w-full text-sm">
					<thead class="bg-muted/40">
						<tr class="border-b border-border text-left text-xs text-muted-foreground">
							<th class="px-4 py-2.5 font-medium">Date</th>
							<th class="px-4 py-2.5 font-medium">Fichier</th>
							<th class="px-4 py-2.5 font-medium">Fournisseur</th>
							<th class="px-4 py-2.5 text-right font-medium">Lignes</th>
							<th class="px-4 py-2.5 text-right font-medium">Montant</th>
							<th class="px-4 py-2.5 text-right font-medium">Anomalies</th>
							<th class="px-4 py-2.5 text-right font-medium">Statut</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/60">
						{#each historyQ.data as imp (imp._id)}
							{@const sc = STATUS_CONFIG[imp.status] ?? STATUS_CONFIG.PROCESSING}
							<tr class="transition-colors hover:bg-muted/20">
								<td class="px-4 py-3 text-xs text-muted-foreground tabular-nums">
									{fmtDate.format(new Date(imp.createdAt))}
								</td>
								<td class="max-w-[160px] truncate px-4 py-3 text-xs">
									{imp.fileName}
								</td>
								<td class="px-4 py-3 text-xs text-muted-foreground">
									{PROVIDER_LABELS[imp.provider] ?? imp.provider}
								</td>
								<td class="px-4 py-3 text-right text-xs tabular-nums">
									{imp.totalLines}
								</td>
								<td class="px-4 py-3 text-right text-xs font-medium tabular-nums">
									{fmtAmount.format(imp.totalAmount)}
								</td>
								<td
									class="px-4 py-3 text-right text-xs tabular-nums
									{imp.anomalyCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}"
								>
									{imp.anomalyCount}
								</td>
								<td class="px-4 py-3 text-right">
									<span class="rounded-full px-2 py-0.5 text-[10px] font-medium {sc.class}">
										{sc.label}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
