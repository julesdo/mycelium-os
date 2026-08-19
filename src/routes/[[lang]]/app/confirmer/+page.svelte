<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CarteVerre from '$lib/components/egalim/app/CarteVerre.svelte';
	import FormulaireCorrection from '$lib/components/egalim/app/FormulaireCorrection.svelte';
	import PanneauPreuve from '$lib/components/egalim/app/PanneauPreuve.svelte';
	import type { Famille, Label as LabelEGalim } from '$lib/egalim/types';
	import { LABELS_QUALIFIANTS } from '$lib/egalim/referentiel';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';

	const file = useQuery(api.egalim.confirmation.listerAConfirmer, {});
	const confirmer = useMutation(api.egalim.confirmation.confirmer);
	const corriger = useMutation(api.egalim.confirmation.corriger);

	let curseur = $state(0);
	let enCorrection = $state(false);
	let enCours = $state(false);

	const libelles = $derived(file.data?.libelles ?? []);
	const selection = $derived(libelles[curseur] ?? null);

	type Motif = 'NON_CLASSE' | 'VIANDE_POISSON' | 'REGULARISATION' | 'CONFIANCE_BASSE';

	// Ambre pour ce qui appelle un regard, jamais rouge : l'écran constate, il
	// n'accuse pas. Le violet isole les régularisations, qui ne sont pas une
	// alerte mais une ligne de signe inverse.
	const MOTIFS: Record<Motif, { texte: string; classe: string }> = {
		NON_CLASSE: {
			texte: 'Non classé',
			classe: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
		},
		VIANDE_POISSON: {
			texte: 'Viande ou poisson',
			classe: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
		},
		REGULARISATION: {
			texte: 'Remise ou avoir',
			classe: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400'
		},
		CONFIANCE_BASSE: {
			texte: 'À vérifier',
			classe: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
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

	/**
	 * Le libellé tranché quitte la file : l'entrée qui prend sa place à l'index
	 * courant devient la sélection, sans un clic de plus. Seul le dernier de la
	 * liste demande un recul d'un cran, sinon le curseur tomberait dans le vide.
	 */
	function avancer() {
		enCorrection = false;
		curseur = Math.min(curseur, Math.max(0, libelles.length - 2));
	}

	async function confirmerSelection() {
		const l = selection;
		if (!l?.proposition || enCours) return;
		enCours = true;
		try {
			const n = await confirmer({
				normalizedLabel: l.normalizedLabel,
				isFood: l.proposition.isFood,
				family: l.proposition.family,
				qualifyingLabels: l.proposition.qualifyingLabels,
				justification: l.proposition.justification
			});
			toast.success(`C'est noté, sur ${n} ligne${n > 1 ? 's' : ''}.`);
			avancer();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Impossible d’enregistrer.');
		} finally {
			enCours = false;
		}
	}

	async function corrigerSelection(d: {
		isFood: boolean;
		family: Famille;
		qualifyingLabels: LabelEGalim[];
		justification: string;
	}) {
		const l = selection;
		if (!l || enCours) return;
		enCours = true;
		try {
			const n = await corriger({ normalizedLabel: l.normalizedLabel, ...d });
			toast.success(`Corrigé sur ${n} ligne${n > 1 ? 's' : ''}.`);
			avancer();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Impossible d’enregistrer.');
		} finally {
			enCours = false;
		}
	}
</script>

<svelte:head><title>À confirmer · Mycelium</title></svelte:head>

<div class="flex flex-col gap-5 px-4 pt-3 pb-4 lg:h-full lg:min-h-0 lg:px-6 lg:pb-6 xl:px-8">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">À confirmer</h1>
		<p class="text-sm text-muted-foreground">
			Les produits les plus lourds d'abord. Une décision vaut pour toutes leurs occurrences.
		</p>
	</div>

	{#if file.isLoading}
		<div class="flex flex-col gap-2">
			{#each { length: 5 } as _, i (i)}<Skeleton class="h-20 rounded-xl" />{/each}
		</div>
	{:else if file.error}
		<CarteVerre ton="alerte" class="p-6 text-center">
			<p class="text-sm font-medium">La file n'a pas pu être chargée.</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Rien n'est perdu, rechargez la page pour la retrouver.
			</p>
		</CarteVerre>
	{:else if libelles.length === 0}
		<CarteVerre class="p-10 text-center">
			<CheckCircleIcon class="mx-auto size-8 text-[var(--brand)]" />
			<p class="mt-3 text-sm font-medium">Tout est confirmé.</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Vos taux reposent entièrement sur des classifications validées.
			</p>
		</CarteVerre>
	{:else}
		<!--
			Deux volets à partir de lg : la file à gauche, la preuve à droite.
			Sous lg, un seul volet ; la file est plafonnée à la moitié de la
			hauteur d'écran pour que le produit choisi reste à portée de pouce, et
			la preuve s'ouvre en dessous.
		-->
		<div class="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6">
			<div
				class="flex max-h-[50vh] min-w-0 flex-col gap-2 overflow-y-auto lg:max-h-none lg:min-h-0 lg:w-[420px] lg:shrink-0"
			>
				{#each libelles as l, i (l.normalizedLabel)}
					{@const motif = MOTIFS[l.motif]}
					<button
						type="button"
						onclick={() => {
							curseur = i;
							enCorrection = false;
						}}
						class="relative flex min-h-12 shrink-0 flex-col gap-2 overflow-hidden rounded-xl border bg-card p-4 text-left transition-all active:scale-[0.99]
							{i === curseur ? 'border-[var(--brand)]/60' : 'border-border hover:bg-muted/40'}"
						style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
					>
						<div
							class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
						></div>
						<p class="truncate text-sm font-medium">{l.rawLabelExemple}</p>
						<div class="flex flex-wrap items-center gap-2">
							<span class="rounded-full border px-2 py-0.5 text-[11px] font-medium {motif.classe}">
								{motif.texte}
							</span>
							<span class="font-mono text-[11px] text-muted-foreground tabular-nums">
								{l.occurrences} ligne{l.occurrences > 1 ? 's' : ''} · {euros(l.montantCumuleHT)}
							</span>
						</div>
					</button>
				{/each}
			</div>

			<div class="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
				{#if selection}
					<CarteVerre>
						<p class="text-sm font-semibold">{selection.rawLabelExemple}</p>
						{#if selection.proposition}
							<div class="mt-3 flex flex-wrap items-center gap-2">
								<Badge variant={selection.proposition.isFood ? 'secondary' : 'outline'}>
									{selection.proposition.isFood
										? FAMILLES_LISIBLES[selection.proposition.family]
										: 'Hors alimentaire'}
								</Badge>
								{#each selection.proposition.qualifyingLabels as code (code)}
									<Badge variant="default" class="max-w-full whitespace-normal">
										{LABELS_QUALIFIANTS[code].libelle}
									</Badge>
								{/each}
							</div>
							<p class="mt-3 text-xs leading-relaxed text-muted-foreground">
								{selection.proposition.justification}
							</p>
						{:else}
							<p class="mt-3 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
								Nous n'avons pas su classer ce produit. Il n'entre dans aucun taux tant qu'il n'est
								pas renseigné : ouvrez « Corriger » pour le trancher.
							</p>
						{/if}

						<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
							<Button
								variant="outline"
								class="h-12"
								onclick={() => (enCorrection = !enCorrection)}
								disabled={enCours}
							>
								<PencilIcon class="size-4" />
								Corriger
							</Button>
							<Button
								class="h-12"
								onclick={confirmerSelection}
								disabled={enCours || !selection.proposition}
							>
								<CheckIcon class="size-4" />
								Confirmer
							</Button>
						</div>
					</CarteVerre>

					{#if enCorrection}
						<FormulaireCorrection
							isFood={selection.proposition?.isFood ?? true}
							family={selection.proposition?.family ?? 'AUTRE'}
							qualifyingLabels={selection.proposition?.qualifyingLabels ?? []}
							justification={selection.proposition?.justification ?? ''}
							{enCours}
							onvalider={corrigerSelection}
							onannuler={() => (enCorrection = false)}
						/>
					{/if}

					<div class="min-h-64 shrink-0 lg:min-h-96 lg:flex-1 lg:shrink">
						<PanneauPreuve documentId={selection.documentId} />
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
