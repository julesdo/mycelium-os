<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { localizedHref } from '$lib/utils/i18n';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
	import TableIcon from '@lucide/svelte/icons/table-2';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	const lots = useQuery(api.egalim.batches.listerLots, {});

	const creerLot = useMutation(api.egalim.batches.creerLot);
	const genererUrl = useMutation(api.egalim.batches.genererUrlDepot);
	const enregistrer = useMutation(api.egalim.batches.enregistrerDocument);

	const lotOuvert = $derived((lots.data ?? []).find((l) => l.ouvert) ?? null);
	const lotsTermines = $derived((lots.data ?? []).filter((l) => !l.ouvert));

	// `'skip'` et non `undefined` : sans lot ouvert il n'y a rien à suivre, et
	// une souscription à vide déclencherait une requête par frappe au clavier.
	const suivi = useQuery(api.egalim.batches.suivreLot, () =>
		lotOuvert ? { batchId: lotOuvert.batchId } : ('skip' as const)
	);

	// Formulaire d'ouverture de dépôt
	const anneeDerniere = new Date().getFullYear() - 1;
	let libelle = $state(`Factures ${anneeDerniere}`);
	let debut = $state(`${anneeDerniere}-01-01`);
	let fin = $state(`${anneeDerniere}-12-31`);
	let creation = $state(false);

	let survol = $state(false);
	let envoiEnCours = $state(0);
	let inputFichiers = $state<HTMLInputElement | null>(null);

	const EXTENSIONS_ACCEPTEES = '.csv,.tsv,.txt,.pdf,.jpg,.jpeg,.png,.webp';

	const SOURCES_LISIBLES: Record<string, string> = {
		CSV: 'Export tableur',
		EXCEL: 'Tableur',
		PDF_TEXT: 'PDF',
		PDF_SCAN: 'PDF scanné',
		IMAGE: 'Photo',
		TEXTE: 'Texte'
	};

	const STATUTS_LOT: Record<string, string> = {
		DRAFT: 'En attente de fichiers',
		EXTRACTING: 'Lecture des factures',
		CLASSIFYING: 'Classement des produits',
		REVIEW: 'Vérification par un opérateur',
		READY: 'Prêt',
		FAILED: 'Échec'
	};

	async function ouvrirDepot() {
		if (creation) return;
		creation = true;
		try {
			await creerLot({ label: libelle.trim(), periodStart: debut, periodEnd: fin });
			toast.success('C’est ouvert. Vous pouvez déposer vos factures.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Impossible d’ouvrir le dépôt.');
		} finally {
			creation = false;
		}
	}

	async function deposer(fichiers: FileList | File[]) {
		const batchId = lotOuvert?.batchId;
		if (!batchId) return;

		const liste = [...fichiers];
		envoiEnCours += liste.length;

		// Un fichier par un fichier, en séquence : un dépôt de quarante PDF
		// ouvert d'un coup sature la connexion et fait échouer des envois pour
		// une raison qui n'a rien à voir avec leur contenu.
		for (const fichier of liste) {
			try {
				const url = await genererUrl({});
				const reponse = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': fichier.type || 'application/octet-stream' },
					body: fichier
				});
				if (!reponse.ok) throw new Error('L’envoi du fichier a échoué.');
				const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };

				await enregistrer({
					batchId,
					storageId,
					filename: fichier.name,
					mimeType: fichier.type || 'application/octet-stream'
				});
			} catch (err: unknown) {
				toast.error(
					err instanceof Error ? err.message : `Impossible de déposer ${fichier.name}.`
				);
			} finally {
				envoiEnCours -= 1;
			}
		}
	}

	function auDepot(e: DragEvent) {
		e.preventDefault();
		survol = false;
		if (e.dataTransfer?.files.length) void deposer(e.dataTransfer.files);
	}

	function auChoix(e: Event) {
		const cible = e.currentTarget as HTMLInputElement;
		if (cible.files?.length) void deposer(cible.files);
		cible.value = '';
	}
</script>

<svelte:head>
	<title>Factures · Mycelium</title>
</svelte:head>

<div class="flex flex-col gap-5 px-4 pb-24 pt-3 lg:px-6 lg:pb-8 xl:px-8 2xl:px-16">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Vos factures</h1>
		<p class="text-sm text-muted-foreground">
			Douze mois de factures fournisseurs, et nous en tirons vos trois taux EGalim.
		</p>
	</div>

	{#if lots.isLoading}
		<Skeleton class="h-40 rounded-xl" />
	{:else if !lotOuvert}
		<!-- 1. La consigne, avant la zone de dépôt -->
		<div
			class="relative overflow-hidden rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4"
		>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/40 to-transparent"
			></div>
			<div class="flex items-start gap-3">
				<div
					class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/15"
				>
					<TableIcon class="size-4 text-[var(--brand)]" />
				</div>
				<div>
					<p class="text-sm font-semibold">Ce qui accélère tout : l’export comptable.</p>
					<p class="mt-1 text-[13px] leading-relaxed text-muted-foreground">
						Si votre logiciel de comptabilité ou le portail de votre grossiste permet d’exporter
						les factures en CSV, déposez ce fichier plutôt que les PDF. C’est plus rapide et plus
						fiable, parce que les montants y sont déjà en colonnes.
					</p>
					<p class="mt-2 text-[13px] leading-relaxed text-muted-foreground">
						À défaut, les PDF conviennent, y compris scannés, et les photos de factures aussi.
						Simplement, chaque page se lit une par une : comptez plus de temps.
					</p>
				</div>
			</div>
		</div>

		<!-- Ouverture du dépôt -->
		<div
			class="relative overflow-hidden rounded-xl border border-border bg-card p-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
			></div>
			<p class="text-sm font-semibold">Ouvrir un dépôt</p>
			<p class="mt-1 text-xs text-muted-foreground">
				La déclaration porte sur une année civile complète.
			</p>

			<div class="mt-4 flex flex-col gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="libelle">Nom du dépôt</Label>
					<Input id="libelle" bind:value={libelle} class="h-11" />
				</div>
				<div class="flex flex-col gap-3 sm:flex-row">
					<div class="flex flex-1 flex-col gap-1.5">
						<Label for="debut">Du</Label>
						<Input id="debut" type="date" bind:value={debut} class="h-11" />
					</div>
					<div class="flex flex-1 flex-col gap-1.5">
						<Label for="fin">Au</Label>
						<Input id="fin" type="date" bind:value={fin} class="h-11" />
					</div>
				</div>
				<Button
					class="h-11"
					onclick={ouvrirDepot}
					disabled={creation || libelle.trim().length === 0}
				>
					{creation ? 'Ouverture…' : 'Ouvrir le dépôt'}
				</Button>
			</div>
		</div>
	{:else}
		<!-- 2. Zone de dépôt -->
		<div
			class="relative overflow-hidden rounded-xl border border-border bg-card p-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
			></div>

			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p class="text-sm font-semibold">{lotOuvert.label}</p>
					<p class="text-xs text-muted-foreground">
						{lotOuvert.periodStart} au {lotOuvert.periodEnd}
					</p>
				</div>
				<Badge variant="outline">{STATUTS_LOT[lotOuvert.status] ?? lotOuvert.status}</Badge>
			</div>

			<div
				role="button"
				tabindex="0"
				class="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors
					{survol ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-border bg-muted/30'}"
				ondragover={(e) => {
					e.preventDefault();
					survol = true;
				}}
				ondragleave={() => (survol = false)}
				ondrop={auDepot}
				onclick={() => inputFichiers?.click()}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						inputFichiers?.click();
					}
				}}
			>
				<UploadCloudIcon class="size-7 text-muted-foreground/60" />
				<p class="text-sm font-medium">Glissez vos factures ici</p>
				<p class="text-xs text-muted-foreground">
					CSV, PDF, photos. Plusieurs fichiers à la fois.
				</p>
				<input
					bind:this={inputFichiers}
					type="file"
					multiple
					accept={EXTENSIONS_ACCEPTEES}
					class="hidden"
					onchange={auChoix}
				/>
			</div>

			{#if envoiEnCours > 0}
				<p class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
					<LoaderCircleIcon class="size-3.5 motion-safe:animate-spin" />
					Envoi de {envoiEnCours} fichier{envoiEnCours > 1 ? 's' : ''}…
				</p>
			{/if}
		</div>

		<!-- 3. Traitement, un fichier par ligne -->
		{#if suivi.data && suivi.data.documents.length > 0}
			{@const d = suivi.data}
			<div class="flex flex-col gap-2">
				<div class="flex items-baseline justify-between">
					<p class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
						Traitement
					</p>
					<p class="font-mono text-xs tabular-nums text-muted-foreground">
						{d.linesTotal} ligne{d.linesTotal > 1 ? 's' : ''}
					</p>
				</div>

				{#each d.documents as doc (doc.documentId)}
					<div
						class="relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-card p-3"
						style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
					>
						<div
							class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
						></div>

						<div class="mt-0.5 shrink-0">
							{#if doc.extractionStatus === 'PENDING'}
								<LoaderCircleIcon
									class="size-4 text-muted-foreground motion-safe:animate-spin"
								/>
							{:else if doc.extractionStatus === 'DONE'}
								<CheckCircleIcon class="size-4 text-emerald-500" />
							{:else}
								<AlertTriangleIcon class="size-4 text-amber-500" />
							{/if}
						</div>

						<div class="min-w-0 flex-1">
							<p class="truncate text-[13px] font-medium">{doc.filename}</p>
							{#if doc.extractionStatus === 'PENDING'}
								<p class="text-xs text-muted-foreground">Lecture en cours…</p>
							{:else if doc.extractionStatus === 'DONE'}
								<p class="text-xs text-muted-foreground">
									{doc.linesCount} ligne{doc.linesCount > 1 ? 's' : ''} extraite{doc.linesCount >
									1
										? 's'
										: ''}
									· {SOURCES_LISIBLES[doc.sourceType] ?? doc.sourceType}
								</p>
								{#if doc.extractionError}
									<p class="mt-1 text-xs text-amber-600 dark:text-amber-400">
										{doc.extractionError}
									</p>
								{/if}
							{:else}
								<p class="mt-0.5 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
									{doc.extractionError ?? 'Ce fichier n’a pas pu être lu.'}
								</p>
								<p class="mt-1 text-xs text-muted-foreground">
									Les autres fichiers continuent d’être traités. Vous pouvez déposer une autre
									version de celui-ci.
								</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- 4. Terminé -->
			{#if d.diagnosticId}
				<a
					href={localizedHref(`/app/diagnostic/${d.diagnosticId}`)}
					class="relative flex items-center gap-3 overflow-hidden rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4 transition-colors hover:bg-[var(--brand)]/10"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/40 to-transparent"
					></div>
					<CheckCircleIcon class="size-5 shrink-0 text-[var(--brand)]" />
					<div class="min-w-0 flex-1">
						<p class="text-sm font-semibold">Votre diagnostic est prêt.</p>
						<p class="text-xs text-muted-foreground">
							Il est figé à sa date. Une nouvelle mesure produira un nouveau diagnostic.
						</p>
					</div>
					<ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
				</a>
			{:else if d.status === 'REVIEW'}
				<div
					class="relative overflow-hidden rounded-xl border border-border bg-card p-4"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>
					<p class="text-sm font-medium">Un opérateur vérifie les produits sensibles.</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{d.labelsPendingReview} libellé{d.labelsPendingReview > 1 ? 's' : ''} en cours de
						vérification. La viande et le poisson passent systématiquement devant un humain :
						c’est là qu’une erreur coûterait le plus cher.
					</p>
				</div>
			{/if}
		{/if}
	{/if}

	<!-- Dépôts passés -->
	{#if lotsTermines.length > 0}
		<div class="flex flex-col gap-2">
			<p class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
				Dépôts passés
			</p>
			{#each lotsTermines as lot (lot.batchId)}
				<div
					class="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>
					<FileTextIcon class="size-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<p class="truncate text-[13px] font-medium">{lot.label}</p>
						<p class="text-xs text-muted-foreground">
							{lot.documentsTotal} fichier{lot.documentsTotal > 1 ? 's' : ''} · {lot.linesTotal}
							ligne{lot.linesTotal > 1 ? 's' : ''}
						</p>
					</div>
					<Badge variant={lot.status === 'READY' ? 'default' : 'outline'}>
						{STATUTS_LOT[lot.status] ?? lot.status}
					</Badge>
				</div>
			{/each}
		</div>
	{/if}
</div>
