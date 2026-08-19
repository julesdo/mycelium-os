<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import FormulaireCorrection from '$lib/components/egalim/FormulaireCorrection.svelte';
	import type { Famille, Label as LabelEGalim } from '$lib/egalim/types';
	import ScaleIcon from '@lucide/svelte/icons/scale';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import ListFilterIcon from '@lucide/svelte/icons/list-filter';

	const batchId = $derived(page.params.batchId as Id<'invoiceBatches'>);

	const entete = useQuery(api.egalim.revue.obtenirEnteteRevue, () => ({ batchId }));
	const file = useQuery(api.egalim.revue.listerLibellesEnRevue, () => ({ batchId }));

	const confirmer = useMutation(api.egalim.revue.confirmerLibelle);
	const corriger = useMutation(api.egalim.revue.corrigerLibelle);

	/** Index de la ligne sélectionnée, au clavier comme au doigt. */
	let curseur = $state(0);
	/** Libellé dont le formulaire de correction est ouvert. */
	let enCorrection = $state<string | null>(null);
	let enCours = $state<string | null>(null);

	const libelles = $derived(file.data?.libelles ?? []);
	const montantEnJeu = $derived(file.data?.montantTotalEnJeu ?? 0);
	/** La liste arrive triée par montant en jeu décroissant : cet ordre est la logique métier, on ne le retouche pas. */
	const selection = $derived(libelles[curseur] ?? null);
	const enCorrectionSurSelection = $derived(
		selection !== null && enCorrection === selection.normalizedLabel
	);

	type Libelle = (typeof libelles)[number];
	type Motif = Libelle['motif'];

	/**
	 * La bascule un volet / deux volets est décidée en JS et pas seulement en
	 * CSS : le panneau de détail est un seul et même nœud du DOM, le rendre
	 * deux fois pour n'en masquer qu'un dupliquerait aussi le brouillon de
	 * correction en cours de saisie. Repli serveur sur le volet unique, le plus
	 * étroit, et la liste n'a de toute façon rien à afficher avant sa query.
	 */
	const grandEcran = new MediaQuery('min-width: 1024px', false);
	const pointeurPrecis = new MediaQuery('pointer: fine', false);

	const deuxVolets = $derived(grandEcran.current);
	/** Souris ou trackpad présent : les raccourcis clavier ont alors un sens. */
	const pointeurFin = $derived(pointeurPrecis.current);

	/**
	 * Ramène la ligne active dans le champ de vision du volet liste, qui défile
	 * pour lui seul : sans ça, j et k sortent de l'écran au bout de six lignes.
	 */
	function ramenerDansLeChamp(node: Element) {
		node.scrollIntoView({ block: 'nearest' });
	}

	const MOTIFS: Record<Motif, { texte: string; classe: string }> = {
		NON_CLASSE: {
			texte: 'Non classé',
			classe: 'border-destructive/40 bg-destructive/10 text-destructive'
		},
		VIANDE_POISSON: {
			texte: 'Viande / poisson',
			classe: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
		},
		REGULARISATION: {
			texte: 'Régularisation',
			classe: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400'
		},
		CONFIANCE_BASSE: {
			texte: 'Confiance basse',
			classe: 'border-border bg-muted/60 text-muted-foreground'
		}
	};

	const FAMILLES_LISIBLES: Record<Famille, string> = {
		VIANDE: 'Viande',
		POISSON: 'Poisson',
		FRUITS_LEGUMES: 'Fruits et légumes',
		LAITIERS: 'Produits laitiers',
		EPICERIE_SECHE: 'Épicerie sèche',
		EPICERIE_APPERTISEE: 'Épicerie appertisée',
		BOISSONS: 'Boissons',
		AUTRE: 'Autre'
	};

	function euros(montant: number): string {
		return `${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
	}

	/** Sans décimales, pour le bandeau compact des petites largeurs. */
	function eurosCourts(montant: number): string {
		return `${Math.round(montant).toLocaleString('fr-FR')} €`;
	}

	function selectionner(index: number) {
		if (index === curseur) return;
		curseur = index;
		// Changer de libellé referme la correction : laisser le formulaire ouvert
		// sur un autre libellé que celui affiché ferait enregistrer la décision
		// sur le mauvais.
		enCorrection = null;
	}

	function ouvrirCorrection(index: number) {
		const l = libelles[index];
		if (!l || enCours) return;
		selectionner(index);
		enCorrection = l.normalizedLabel;
	}

	async function confirmerLigne(index: number) {
		const l = libelles[index];
		if (!l || !l.proposition || enCours) return;
		enCours = l.normalizedLabel;
		try {
			const lignes = await confirmer({
				batchId,
				normalizedLabel: l.normalizedLabel,
				isFood: l.proposition.isFood,
				family: l.proposition.family,
				qualifyingLabels: l.proposition.qualifyingLabels,
				justification: l.proposition.justification
			});
			toast.success(`Confirmé sur ${lignes} ligne${lignes > 1 ? 's' : ''}.`);
			enCorrection = null;
			// La file se recompose sans la ligne traitée : le curseur reste au
			// même index et pointe donc déjà la suivante.
			curseur = Math.min(index, Math.max(0, libelles.length - 2));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Échec de la confirmation.');
		} finally {
			enCours = null;
		}
	}

	async function corrigerLigne(
		normalizedLabel: string,
		d: {
			isFood: boolean;
			family: Famille;
			qualifyingLabels: LabelEGalim[];
			justification: string;
		}
	) {
		if (enCours) return;
		enCours = normalizedLabel;
		try {
			const lignes = await corriger({ batchId, normalizedLabel, ...d });
			toast.success(`Corrigé sur ${lignes} ligne${lignes > 1 ? 's' : ''}.`);
			enCorrection = null;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Échec de la correction.');
		} finally {
			enCours = null;
		}
	}

	/**
	 * Les raccourcis ne sont pas un confort : c'est le temps passé sur cet
	 * écran qui fait la marge du diagnostic. A confirme et descend, C ouvre la
	 * correction, les flèches naviguent, Échap referme.
	 */
	function auClavier(e: KeyboardEvent) {
		const cible = e.target as HTMLElement | null;
		const dansUnChamp =
			cible instanceof HTMLInputElement ||
			cible instanceof HTMLTextAreaElement ||
			cible?.isContentEditable === true;

		if (e.key === 'Escape') {
			enCorrection = null;
			return;
		}
		// Sans pointeur fin, il n'y a pas de clavier physique derrière ces
		// touches : les laisser actifs ne produirait que des décisions
		// involontaires frappées sur un clavier logiciel.
		if (!pointeurFin) return;
		if (dansUnChamp || enCorrection !== null) return;

		if (e.key === 'ArrowDown' || e.key === 'j') {
			e.preventDefault();
			selectionner(Math.min(curseur + 1, libelles.length - 1));
		} else if (e.key === 'ArrowUp' || e.key === 'k') {
			e.preventDefault();
			selectionner(Math.max(curseur - 1, 0));
		} else if (e.key === 'a' || e.key === 'A') {
			e.preventDefault();
			void confirmerLigne(curseur);
		} else if (e.key === 'c' || e.key === 'C') {
			e.preventDefault();
			ouvrirCorrection(curseur);
		}
	}
</script>

<svelte:window onkeydown={auClavier} />

<svelte:head>
	<title>Arbitrage des libellés · Mycelium</title>
</svelte:head>

<!-- Ce que le classifieur propose pour un libellé, partagé par la ligne de la
	 liste (un volet) et par le panneau de détail (deux volets). -->
{#snippet resume(l: Libelle)}
	{#if l.proposition}
		<div class="flex w-full flex-wrap items-center gap-1.5">
			<Badge variant={l.proposition.isFood ? 'secondary' : 'outline'}>
				{l.proposition.isFood ? FAMILLES_LISIBLES[l.proposition.family] : 'Hors alimentaire'}
			</Badge>
			{#each l.proposition.qualifyingLabels as code (code)}
				<Badge variant="default">{code}</Badge>
			{/each}
			{#if l.proposition.isFood && l.proposition.qualifyingLabels.length === 0}
				<span class="text-[11px] text-muted-foreground">aucun label</span>
			{/if}
		</div>
		<p class="text-xs leading-relaxed text-muted-foreground">
			{l.proposition.justification}
		</p>
	{:else}
		<p class="text-xs leading-relaxed text-destructive">
			Le classifieur n'a rien rendu pour ce libellé. Il n'entre dans aucun ratio tant qu'il n'est
			pas classé à la main.
		</p>
	{/if}
{/snippet}

<div class="flex flex-col lg:h-full lg:overflow-hidden">
	<div
		class="flex flex-col gap-4 px-4 pt-5 pb-4 md:pt-7 lg:min-h-0 lg:flex-1 lg:gap-5 lg:overflow-hidden lg:px-6 lg:pb-6 xl:px-8 2xl:px-16"
	>
		<!-- En-tête -->
		<div class="flex shrink-0 items-start justify-between gap-4">
			<div class="flex min-w-0 items-center gap-3">
				<div
					class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/10"
				>
					<ScaleIcon class="size-4 text-[var(--brand-foreground)] dark:text-[var(--brand)]" />
				</div>
				<div class="min-w-0">
					<h1 class="text-base font-semibold tracking-tight">Arbitrage des libellés</h1>
					{#if entete.data}
						<p class="text-[12px] leading-snug text-muted-foreground">
							{entete.data.organizationName} · {entete.data.label}
							<span class="font-mono tabular-nums">
								({entete.data.periodStart} au {entete.data.periodEnd})
							</span>
						</p>
					{/if}
				</div>
			</div>
			{#if pointeurFin}
				<div
					class="hidden shrink-0 items-center gap-2 text-[11px] text-muted-foreground lg:flex"
					aria-label="Raccourcis clavier"
				>
					{#each [['A', 'confirmer'], ['C', 'corriger'], ['↑ ↓', 'naviguer'], ['Échap', 'fermer']] as [touche, action] (touche)}
						<span class="flex items-center gap-1">
							<kbd class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
								{touche}
							</kbd>
							{action}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!--
			Avancement. Sous md, une réglette compacte : trois MetricCard empilées
			pousseraient le premier libellé à arbitrer sous la ligne de flottaison,
			et c'est lui le travail.
		-->
		<div
			class="relative shrink-0 overflow-hidden rounded-xl border border-border bg-card md:hidden"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
			></div>
			<div class="grid grid-cols-3 divide-x divide-border/60">
				{#each [{ l: 'Restants', v: String(libelles.length) }, { l: 'En jeu', v: eurosCourts(montantEnJeu) }, { l: 'Lignes', v: String(entete.data?.linesTotal ?? 0) }] as stat (stat.l)}
					<div class="min-w-0 px-3 py-2.5">
						<p class="text-[10px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
							{stat.l}
						</p>
						<p class="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums">{stat.v}</p>
					</div>
				{/each}
			</div>
		</div>

		<div class="hidden shrink-0 gap-3 md:grid md:grid-cols-3">
			<MetricCard
				variant="accent"
				label="Libellés restants"
				value={libelles.length}
				description="une décision vaut pour toutes ses occurrences"
			/>
			<MetricCard label="Montant en jeu" value={euros(montantEnJeu)} />
			<MetricCard label="Lignes du lot" value={entete.data?.linesTotal ?? 0} />
		</div>

		{#if file.isLoading}
			<div class="flex flex-col gap-2">
				{#each { length: 6 } as _, i (i)}
					<Skeleton class="h-20 rounded-xl" />
				{/each}
			</div>
		{:else if libelles.length === 0}
			<div
				class="relative overflow-hidden rounded-xl border border-border bg-card p-10 text-center"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
			>
				<div
					class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
				></div>
				<CheckCircleIcon class="mx-auto size-8 text-[var(--brand)]" />
				<p class="mt-3 text-sm font-medium">Plus rien à arbitrer sur ce lot.</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Chaque décision prise ici vaut pour tous les lots à venir, chez tous les clients.
				</p>
			</div>
		{:else}
			<div class="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
				<!-- Volet liste. Largeur fixe et défilement propre à partir de lg. -->
				<div
					aria-label="Libellés à arbitrer, du plus lourd au plus léger"
					class="flex flex-col gap-2 lg:w-[21rem] lg:shrink-0 lg:overflow-y-auto lg:pr-2 xl:w-[25rem]"
				>
					{#each libelles as l, i (l.normalizedLabel)}
						{@const motif = MOTIFS[l.motif]}
						{@const actif = i === curseur}
						<div
							{@attach actif && ramenerDansLeChamp}
							class="relative shrink-0 overflow-hidden rounded-xl border bg-card transition-colors
								{actif ? 'border-[var(--brand)]/60 bg-[var(--brand)]/[0.04]' : 'border-border'}"
							style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
						>
							<div
								class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
							></div>

							<button
								type="button"
								class="flex w-full flex-col gap-3 p-4 text-left lg:gap-2 lg:p-3"
								aria-current={actif ? 'true' : undefined}
								onclick={() => selectionner(i)}
							>
								<div class="flex w-full flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">{l.rawLabelExemple}</p>
										<p class="mt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
											{l.occurrences} ligne{l.occurrences > 1 ? 's' : ''} · {euros(
												l.montantCumuleHT
											)}
										</p>
									</div>
									<div class="flex shrink-0 items-center gap-2">
										<span
											class="rounded-full border px-2 py-0.5 text-[11px] font-medium {motif.classe}"
										>
											{motif.texte}
										</span>
										{#if l.proposition}
											<span class="font-mono text-[11px] text-muted-foreground tabular-nums">
												{Math.round(l.proposition.confidence * 100)} %
											</span>
										{/if}
									</div>
								</div>

								{#if !deuxVolets}
									{@render resume(l)}
								{/if}
							</button>

							{#if !deuxVolets}
								<!-- Cibles tactiles pleine largeur : c'est ici que la décision se prend au doigt. -->
								<div class="grid grid-cols-2 gap-2 border-t border-border/60 p-3">
									<Button
										variant="outline"
										class="h-11 w-full"
										onclick={() => ouvrirCorrection(i)}
										disabled={enCours !== null}
									>
										<PencilIcon class="size-4" />
										Corriger
									</Button>
									<Button
										class="h-11 w-full"
										onclick={() => confirmerLigne(i)}
										disabled={enCours !== null || !l.proposition}
									>
										<CheckIcon class="size-4" />
										Confirmer
									</Button>
								</div>

								{#if enCorrection === l.normalizedLabel}
									<div class="border-t border-border/60 p-3">
										<FormulaireCorrection
											isFood={l.proposition?.isFood ?? true}
											family={l.proposition?.family ?? 'AUTRE'}
											qualifyingLabels={l.proposition?.qualifyingLabels ?? []}
											justification={l.proposition?.justification ?? ''}
											enCours={enCours === l.normalizedLabel}
											onvalider={(d) => corrigerLigne(l.normalizedLabel, d)}
											onannuler={() => (enCorrection = null)}
										/>
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>

				<!-- Volet détail, à partir de lg seulement. -->
				{#if deuxVolets}
					<div class="hidden min-w-0 flex-1 lg:block lg:overflow-y-auto">
						{#if selection}
							{@const motif = MOTIFS[selection.motif]}
							<div
								class="relative overflow-hidden rounded-xl border border-border bg-card"
								style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
							>
								<div
									class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
								></div>

								<div class="flex flex-col gap-4 p-5">
									<div class="flex flex-wrap items-start justify-between gap-3">
										<div class="min-w-0">
											<p class="text-base leading-snug font-semibold break-words">
												{selection.rawLabelExemple}
											</p>
											<p class="mt-1 font-mono text-[11px] break-all text-muted-foreground">
												{selection.normalizedLabel}
											</p>
										</div>
										<div class="flex shrink-0 items-center gap-2">
											<span
												class="rounded-full border px-2 py-0.5 text-[11px] font-medium {motif.classe}"
											>
												{motif.texte}
											</span>
											{#if selection.proposition}
												<span class="font-mono text-[11px] text-muted-foreground tabular-nums">
													{Math.round(selection.proposition.confidence * 100)} % de confiance
												</span>
											{/if}
										</div>
									</div>

									<!-- Ce que la décision engage, en clair. -->
									<div
										class="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
									>
										<div>
											<p
												class="text-[10px] font-bold tracking-[0.09em] text-muted-foreground uppercase"
											>
												Occurrences
											</p>
											<p class="mt-0.5 font-mono text-sm font-semibold tabular-nums">
												{selection.occurrences}
											</p>
										</div>
										<div>
											<p
												class="text-[10px] font-bold tracking-[0.09em] text-muted-foreground uppercase"
											>
												Montant cumulé HT
											</p>
											<p class="mt-0.5 font-mono text-sm font-semibold tabular-nums">
												{euros(selection.montantCumuleHT)}
											</p>
										</div>
									</div>

									{@render resume(selection)}

									{#if !enCorrectionSurSelection}
										<div class="flex items-center justify-end gap-2">
											<Button
												variant="outline"
												size="sm"
												onclick={() => ouvrirCorrection(curseur)}
												disabled={enCours !== null}
											>
												<PencilIcon class="size-3.5" />
												Corriger
											</Button>
											<Button
												size="sm"
												onclick={() => confirmerLigne(curseur)}
												disabled={enCours !== null || !selection.proposition}
											>
												<CheckIcon class="size-3.5" />
												Confirmer
											</Button>
										</div>
									{/if}
								</div>

								{#if enCorrectionSurSelection}
									<div class="border-t border-border/60 p-5">
										<FormulaireCorrection
											isFood={selection.proposition?.isFood ?? true}
											family={selection.proposition?.family ?? 'AUTRE'}
											qualifyingLabels={selection.proposition?.qualifyingLabels ?? []}
											justification={selection.proposition?.justification ?? ''}
											enCours={enCours === selection.normalizedLabel}
											onvalider={(d) => corrigerLigne(selection.normalizedLabel, d)}
											onannuler={() => (enCorrection = null)}
										/>
									</div>
								{/if}
							</div>
						{:else}
							<div
								class="relative overflow-hidden rounded-xl border border-border bg-card p-10 text-center"
								style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
							>
								<div
									class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
								></div>
								<ListFilterIcon class="mx-auto size-8 text-muted-foreground" />
								<p class="mt-3 text-sm font-medium">Sélectionnez un libellé dans la liste.</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!--
		Barre d'action collante sous lg : la décision reste atteignable sans
		remonter la fiche. Elle s'efface pendant la correction, où ce sont les
		boutons du formulaire qui font foi.
	-->
	{#if !deuxVolets && selection && !enCorrectionSurSelection}
		<div
			class="sticky bottom-0 z-20 border-t border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden"
		>
			<p class="mb-2 truncate text-[11px] text-muted-foreground">
				Décision sur <span class="font-medium text-foreground">{selection.rawLabelExemple}</span>
			</p>
			<div class="grid grid-cols-2 gap-2">
				<Button
					variant="outline"
					class="h-11 w-full"
					onclick={() => ouvrirCorrection(curseur)}
					disabled={enCours !== null}
				>
					<PencilIcon class="size-4" />
					Corriger
				</Button>
				<Button
					class="h-11 w-full"
					onclick={() => confirmerLigne(curseur)}
					disabled={enCours !== null || !selection.proposition}
				>
					<CheckIcon class="size-4" />
					Confirmer
				</Button>
			</div>
		</div>
	{/if}
</div>
