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
	import BarreAction from '$lib/components/egalim/app/BarreAction.svelte';
	import BoutonVoirPlus from '$lib/components/egalim/app/BoutonVoirPlus.svelte';
	import CarteVerre from '$lib/components/egalim/app/CarteVerre.svelte';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
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
	let inputPhoto = $state<HTMLInputElement | null>(null);

	/** Le détail des fichiers déjà lus reste replié : il n'appelle aucune action. */
	let lusOuverts = $state(false);
	let lusTousOuverts = $state(false);
	let passesOuverts = $state(false);

	/** Au-delà, sur téléphone, une liste devient un mur. */
	const SEUIL_MOBILE = 5;

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
		REVIEW: 'À confirmer',
		READY: 'Prêt',
		FAILED: 'Échec'
	};

	// Le gestionnaire n'a rien à faire des fichiers qui ont marché : on montre
	// d'abord ce qui bloque, le reste se résume à un compteur.
	const documents = $derived(suivi.data?.documents ?? []);
	const docsEnEchec = $derived(documents.filter((d) => d.extractionStatus === 'FAILED'));
	const docsEnCours = $derived(documents.filter((d) => d.extractionStatus === 'PENDING'));
	const docsLus = $derived(documents.filter((d) => d.extractionStatus === 'DONE'));

	/** L'unique action de l'écran, celle qui reste sous le pouce sur téléphone. */
	const actionCollante = $derived.by(() => {
		if (!lotOuvert) return 'ouvrir' as const;
		if (suivi.data?.diagnosticId) return 'diagnostic' as const;
		return 'photo' as const;
	});

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

	// Masquage en CSS et non en JS : la liste entière reste dans le DOM, donc
	// elle sort entière à l'impression et à la recherche dans la page. Les
	// classes sont écrites en toutes lettres, sinon Tailwind ne les génère pas.
	function replieFlex(index: number, ouvert: boolean): string {
		return !ouvert && index >= SEUIL_MOBILE ? 'hidden md:flex' : 'flex';
	}

	function replieBloc(index: number, ouvert: boolean): string {
		return !ouvert && index >= SEUIL_MOBILE ? 'hidden md:block' : 'block';
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
		<CarteVerre ton="accent">
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
		</CarteVerre>

		<!-- Ouverture du dépôt -->
		<CarteVerre>
			<p class="text-sm font-semibold">Ouvrir un dépôt</p>
			<p class="mt-1 text-xs text-muted-foreground">
				La déclaration porte sur une année civile complète.
			</p>

			<div class="mt-4 flex flex-col gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="libelle">Nom du dépôt</Label>
					<Input id="libelle" data-testid="depot-libelle" bind:value={libelle} class="h-11" />
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
				<!-- Sur téléphone, ce bouton vit dans la barre collante du bas. -->
				<Button
					data-testid="depot-ouvrir"
					class="hidden h-11 md:inline-flex"
					onclick={ouvrirDepot}
					disabled={creation || libelle.trim().length === 0}
				>
					{creation ? 'Ouverture…' : 'Ouvrir le dépôt'}
				</Button>
			</div>
		</CarteVerre>
	{:else}
		<!-- 2. Zone de dépôt -->
		<CarteVerre>
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p class="text-sm font-semibold">{lotOuvert.label}</p>
					<p class="font-mono text-xs tabular-nums text-muted-foreground">
						{lotOuvert.periodStart} au {lotOuvert.periodEnd}
					</p>
				</div>
				<Badge variant="outline" data-testid="depot-statut-lot">{STATUTS_LOT[lotOuvert.status] ?? lotOuvert.status}</Badge>
			</div>

			<!--
				Sur téléphone, le geste réel c'est de photographier la facture posée
				sur le plan de travail. Le glisser-déposer n'existe pas là-bas.
			-->
			<div class="mt-4 flex flex-col gap-2 md:hidden">
				{#if actionCollante !== 'photo'}
					<Button class="h-11 w-full" onclick={() => inputPhoto?.click()}>
						<CameraIcon class="size-4" />
						Prendre en photo
					</Button>
				{/if}
				<Button variant="outline" class="h-11 w-full" onclick={() => inputFichiers?.click()}>
					<FolderOpenIcon class="size-4" />
					Choisir des fichiers
				</Button>
				<p class="text-center text-xs leading-relaxed text-muted-foreground">
					Une facture par photo, bien à plat et entièrement dans le cadre.
				</p>
			</div>

			<!-- Tablette et ordinateur : le glisser-déposer reprend la main. -->
			<div
				role="button"
				tabindex="0"
				class="mt-4 hidden flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors md:flex
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
				<p class="text-xs text-muted-foreground">CSV, PDF, photos. Plusieurs fichiers à la fois.</p>
			</div>

			<input
				bind:this={inputFichiers}
				data-testid="depot-fichiers"
				type="file"
				multiple
				accept={EXTENSIONS_ACCEPTEES}
				class="hidden"
				onchange={auChoix}
			/>
			<input
				bind:this={inputPhoto}
				type="file"
				accept="image/*"
				capture="environment"
				class="hidden"
				onchange={auChoix}
			/>

			{#if envoiEnCours > 0}
				<p class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
					<LoaderCircleIcon class="size-3.5 shrink-0 motion-safe:animate-spin" />
					Envoi de <span class="font-mono tabular-nums">{envoiEnCours}</span>
					fichier{envoiEnCours > 1 ? 's' : ''}…
				</p>
			{/if}
		</CarteVerre>

		<!-- 3. Traitement : ce qui bloque d'abord, ce qui a marché ensuite -->
		{#if suivi.data && documents.length > 0}
			{@const d = suivi.data}
			<section class="flex flex-col gap-2">
				<div class="flex items-baseline justify-between gap-3">
					<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
						Traitement
					</h2>
					<p class="text-xs text-muted-foreground" data-testid="depot-lignes-total">
						<span class="font-mono tabular-nums">{d.linesTotal}</span>
						ligne{d.linesTotal > 1 ? 's' : ''}
					</p>
				</div>

				<!-- Les échecs : les seuls qui appellent un geste de sa part. -->
				{#each docsEnEchec as doc (doc.documentId)}
					<CarteVerre class="p-3" data-testid="depot-echec">
						<div class="flex items-start gap-3">
							<AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-amber-500" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-[13px] font-medium">{doc.filename}</p>
								<p class="mt-0.5 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
									{doc.extractionError ?? 'Ce fichier n’a pas pu être lu.'}
								</p>
								<p class="mt-1 text-xs leading-relaxed text-muted-foreground">
									Les autres fichiers continuent d’être traités. Vous pouvez déposer une autre
									version de celui-ci.
								</p>
							</div>
						</div>
					</CarteVerre>
				{/each}

				<!-- Ce qui se fait tout seul tient sur une ligne, pas sur une liste. -->
				{#if docsEnCours.length > 0}
					<CarteVerre class="p-3">
						<p class="flex items-center gap-3 text-[13px]">
							<LoaderCircleIcon
								class="size-4 shrink-0 text-muted-foreground motion-safe:animate-spin"
							/>
							<span>
								Lecture de <span class="font-mono tabular-nums">{docsEnCours.length}</span>
								fichier{docsEnCours.length > 1 ? 's' : ''} en cours
							</span>
						</p>
					</CarteVerre>
				{/if}

				<!-- Les réussites : un compteur, et le détail seulement s'il le demande. -->
				{#if docsLus.length > 0}
					<CarteVerre class="p-3" data-testid="depot-lus">
						<div class="flex items-center gap-3">
							<CheckCircleIcon class="size-4 shrink-0 text-emerald-500" />
							<p class="min-w-0 flex-1 text-[13px]">
								<span class="font-mono tabular-nums">{docsLus.length}</span>
								fichier{docsLus.length > 1 ? 's' : ''} lu{docsLus.length > 1 ? 's' : ''}
							</p>
							<Button
								variant="ghost"
								class="h-11 shrink-0 px-3 text-[13px] text-muted-foreground lg:h-9"
								data-testid="depot-lus-detail"
								aria-expanded={lusOuverts}
								onclick={() => (lusOuverts = !lusOuverts)}
							>
								{lusOuverts ? 'Masquer' : 'Voir le détail'}
							</Button>
						</div>

						{#if lusOuverts}
							<ul class="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
								{#each docsLus as doc, i (doc.documentId)}
									<li class="{replieFlex(i, lusTousOuverts)} flex-col gap-0.5">
										<span class="truncate text-[13px]">{doc.filename}</span>
										<span class="text-xs text-muted-foreground">
											<span class="font-mono tabular-nums">{doc.linesCount}</span>
											ligne{doc.linesCount > 1 ? 's' : ''} · {SOURCES_LISIBLES[doc.sourceType] ??
												doc.sourceType}
										</span>
									</li>
								{/each}
							</ul>
							{#if docsLus.length > SEUIL_MOBILE}
								<BoutonVoirPlus
									class="mt-1 md:hidden"
									restants={docsLus.length - SEUIL_MOBILE}
									ouvert={lusTousOuverts}
									onbasculer={() => (lusTousOuverts = !lusTousOuverts)}
								/>
							{/if}
						{/if}
					</CarteVerre>
				{/if}
			</section>

			<!-- 4. Terminé -->
			{#if d.diagnosticId}
				<a
					href={localizedHref(`/app/diagnostic/${d.diagnosticId}`)}
					class="relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4 transition-colors hover:bg-[var(--brand)]/10"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/40 to-transparent"
					></div>
					<CheckCircleIcon class="size-5 shrink-0 text-[var(--brand)]" />
					<div class="min-w-0 flex-1">
						<p class="text-sm font-semibold">Votre diagnostic est prêt.</p>
						<p class="text-xs leading-relaxed text-muted-foreground">
							Il est figé à sa date. Une nouvelle mesure produira un nouveau diagnostic.
						</p>
					</div>
					<ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
				</a>
			{:else if d.status === 'REVIEW'}
				<CarteVerre>
					<p class="text-sm font-medium">Quelques produits attendent votre confirmation.</p>
					<p class="mt-1 text-xs leading-relaxed text-muted-foreground">
						<span class="font-mono tabular-nums">{d.labelsPendingReview}</span>
						libellé{d.labelsPendingReview > 1 ? 's' : ''} en cours de vérification. La viande et le
						poisson passent systématiquement devant un humain : c’est là qu’une erreur coûterait le
						plus cher.
					</p>
				</CarteVerre>
			{/if}
		{/if}
	{/if}

	<!-- Dépôts passés -->
	{#if lotsTermines.length > 0}
		<section class="flex flex-col gap-2">
			<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
				Dépôts passés
			</h2>
			{#each lotsTermines as lot, i (lot.batchId)}
				<CarteVerre class="{replieBloc(i, passesOuverts)} p-3">
					<div class="flex items-center gap-3">
						<FileTextIcon class="size-4 shrink-0 text-muted-foreground" />
						<div class="min-w-0 flex-1">
							<p class="truncate text-[13px] font-medium">{lot.label}</p>
							<p class="text-xs text-muted-foreground">
								<span class="font-mono tabular-nums">{lot.documentsTotal}</span>
								fichier{lot.documentsTotal > 1 ? 's' : ''} ·
								<span class="font-mono tabular-nums">{lot.linesTotal}</span>
								ligne{lot.linesTotal > 1 ? 's' : ''}
							</p>
						</div>
						<Badge variant={lot.status === 'READY' ? 'default' : 'outline'}>
							{STATUTS_LOT[lot.status] ?? lot.status}
						</Badge>
					</div>
				</CarteVerre>
			{/each}
			{#if lotsTermines.length > SEUIL_MOBILE}
				<BoutonVoirPlus
					class="md:hidden"
					restants={lotsTermines.length - SEUIL_MOBILE}
					ouvert={passesOuverts}
					onbasculer={() => (passesOuverts = !passesOuverts)}
				/>
			{/if}
		</section>
	{/if}

	<!-- L'action de l'écran, sous le pouce, tant qu'on est sur téléphone. -->
	{#if !lots.isLoading}
		<BarreAction>
			{#if actionCollante === 'ouvrir'}
				<Button
					class="h-11 w-full"
					onclick={ouvrirDepot}
					disabled={creation || libelle.trim().length === 0}
				>
					{creation ? 'Ouverture…' : 'Ouvrir le dépôt'}
				</Button>
			{:else if actionCollante === 'diagnostic'}
				<Button class="h-11 w-full" href={localizedHref(`/app/diagnostic/${suivi.data?.diagnosticId}`)}>
					Voir mon diagnostic
					<ChevronRightIcon class="size-4" />
				</Button>
			{:else}
				<Button class="h-11 w-full" onclick={() => inputPhoto?.click()}>
					<CameraIcon class="size-4" />
					Prendre en photo
				</Button>
			{/if}
		</BarreAction>
	{/if}
</div>
