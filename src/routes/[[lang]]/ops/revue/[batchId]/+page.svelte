<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
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

	const batchId = $derived(page.params.batchId as Id<'invoiceBatches'>);

	const entete = useQuery(api.egalim.revue.obtenirEnteteRevue, () => ({ batchId }));
	const file = useQuery(api.egalim.revue.listerLibellesEnRevue, () => ({ batchId }));

	const confirmer = useMutation(api.egalim.revue.confirmerLibelle);
	const corriger = useMutation(api.egalim.revue.corrigerLibelle);

	/** Index de la ligne sous le curseur clavier. */
	let curseur = $state(0);
	/** Libellé dont le formulaire de correction est ouvert. */
	let enCorrection = $state<string | null>(null);
	let enCours = $state<string | null>(null);

	const libelles = $derived(file.data?.libelles ?? []);
	const montantEnJeu = $derived(file.data?.montantTotalEnJeu ?? 0);

	type Motif = NonNullable<typeof file.data>['libelles'][number]['motif'];

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
		if (dansUnChamp || enCorrection !== null) return;

		if (e.key === 'ArrowDown' || e.key === 'j') {
			e.preventDefault();
			curseur = Math.min(curseur + 1, libelles.length - 1);
		} else if (e.key === 'ArrowUp' || e.key === 'k') {
			e.preventDefault();
			curseur = Math.max(curseur - 1, 0);
		} else if (e.key === 'a' || e.key === 'A') {
			e.preventDefault();
			void confirmerLigne(curseur);
		} else if (e.key === 'c' || e.key === 'C') {
			e.preventDefault();
			const l = libelles[curseur];
			if (l) enCorrection = l.normalizedLabel;
		}
	}
</script>

<svelte:window onkeydown={auClavier} />

<svelte:head>
	<title>Arbitrage des libellés · Mycelium</title>
</svelte:head>

<div class="flex flex-col gap-6 px-4 pt-5 md:pt-7 lg:px-6 xl:px-8 2xl:px-16">
	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/10">
				<ScaleIcon class="size-4 text-[var(--brand-foreground)] dark:text-[var(--brand)]" />
			</div>
			<div>
				<h1 class="text-base font-semibold tracking-tight">Arbitrage des libellés</h1>
				{#if entete.data}
					<p class="text-[12px] text-muted-foreground">
						{entete.data.organizationName} · {entete.data.label} ({entete.data.periodStart}
						au {entete.data.periodEnd})
					</p>
				{/if}
			</div>
		</div>
		<div
			class="hidden shrink-0 items-center gap-2 text-[11px] text-muted-foreground lg:flex"
			aria-label="Raccourcis clavier"
		>
			{#each [['A', 'confirmer'], ['C', 'corriger'], ['↑ ↓', 'naviguer'], ['Échap', 'fermer']] as [touche, action] (touche)}
				<span class="flex items-center gap-1">
					<kbd class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">{touche}</kbd>
					{action}
				</span>
			{/each}
		</div>
	</div>

	<!-- Avancement -->
	<div class="grid gap-3 sm:grid-cols-3">
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
		<div class="flex flex-col gap-2">
			{#each libelles as l, i (l.normalizedLabel)}
				{@const motif = MOTIFS[l.motif]}
				{@const actif = i === curseur}
				<div
					class="relative overflow-hidden rounded-xl border bg-card transition-colors
						{actif ? 'border-[var(--brand)]/60' : 'border-border'}"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>

					<button
						type="button"
						class="flex w-full flex-col gap-3 p-4 text-left"
						onclick={() => (curseur = i)}
					>
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{l.rawLabelExemple}</p>
								<p class="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
									{l.occurrences} ligne{l.occurrences > 1 ? 's' : ''} · {euros(l.montantCumuleHT)}
								</p>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<span
									class="rounded-full border px-2 py-0.5 text-[11px] font-medium {motif.classe}"
								>
									{motif.texte}
								</span>
								{#if l.proposition}
									<span class="font-mono text-[11px] tabular-nums text-muted-foreground">
										{Math.round(l.proposition.confidence * 100)} %
									</span>
								{/if}
							</div>
						</div>

						{#if l.proposition}
							<div class="flex flex-wrap items-center gap-2">
								<Badge variant={l.proposition.isFood ? 'secondary' : 'outline'}>
									{l.proposition.isFood
										? FAMILLES_LISIBLES[l.proposition.family]
										: 'Hors alimentaire'}
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
								Le classifieur n'a rien rendu pour ce libellé. Il n'entre dans aucun ratio tant
								qu'il n'est pas classé à la main.
							</p>
						{/if}
					</button>

					<div class="flex items-center justify-end gap-2 border-t border-border/60 px-4 py-2.5">
						<Button
							variant="ghost"
							size="sm"
							onclick={() => (enCorrection = l.normalizedLabel)}
							disabled={enCours !== null}
						>
							<PencilIcon class="size-3.5" />
							Corriger
						</Button>
						<Button
							size="sm"
							onclick={() => confirmerLigne(i)}
							disabled={enCours !== null || !l.proposition}
						>
							<CheckIcon class="size-3.5" />
							Confirmer
						</Button>
					</div>

					{#if enCorrection === l.normalizedLabel}
						<div class="border-t border-border/60 p-4">
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
				</div>
			{/each}
		</div>
	{/if}
</div>
