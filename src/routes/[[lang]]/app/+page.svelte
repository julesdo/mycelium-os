<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CarteVerre from '$lib/components/egalim/app/CarteVerre.svelte';
	import JaugeTaux from '$lib/components/egalim/app/JaugeTaux.svelte';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import CheckCheckIcon from '@lucide/svelte/icons/check-check';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import LoaderIcon from '@lucide/svelte/icons/loader-circle';
	import type { Famille } from '$lib/egalim/types';

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

	const annees = useQuery(api.egalim.pilotage.listerAnnees, {});
	let anneeChoisie = $state<string | null>(null);

	/**
	 * L'exercice affiché. À défaut de choix, le plus récent où la cantine a des
	 * achats ; à défaut d'achats, l'année civile écoulée, celle qui se déclare
	 * avant le 31 mars.
	 */
	const annee = $derived(anneeChoisie ?? annees.data?.[0] ?? String(new Date().getFullYear() - 1));

	const bord = useQuery(api.egalim.pilotage.tableauDeBord, () => ({ annee }));

	function euros(m: number): string {
		return `${Math.round(m).toLocaleString('fr-FR')} €`;
	}

	function pourcent(f: number): string {
		return `${(f * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;
	}

	function pluriel(n: number): string {
		return n > 1 ? 's' : '';
	}
</script>

<svelte:head><title>Pilotage · Mycelium</title></svelte:head>

<div class="flex flex-col gap-5 px-4 pt-3 pb-4 lg:px-6 lg:pb-6 xl:px-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Tableau de bord</h1>
			<p class="text-sm text-muted-foreground">Vos trois taux EGalim sur l'année civile.</p>
		</div>
		{#if (annees.data ?? []).length > 1}
			<!--
				`flex-wrap` et non une rangée unique : le sélecteur peut compter une
				trentaine d'exercices, et à 375 px une rangée non repliable pousserait
				la page entière en défilement horizontal.
			-->
			<div class="flex flex-wrap gap-2">
				{#each annees.data ?? [] as a (a)}
					<button
						type="button"
						onclick={() => (anneeChoisie = a)}
						aria-pressed={a === annee}
						class="flex h-12 min-w-16 items-center justify-center rounded-lg border px-4 font-mono text-sm tabular-nums transition-all active:scale-95
							{a === annee
							? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
							: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
					>
						{a}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if bord.isLoading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each { length: 3 } as _, i (i)}<Skeleton class="h-64 rounded-3xl" />{/each}
		</div>
	{:else if bord.error}
		<CarteVerre ton="alerte" class="p-6 text-center">
			<p class="text-sm font-medium">Vos taux n'ont pas pu être chargés.</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Rien n'est perdu, rechargez la page pour les retrouver.
			</p>
		</CarteVerre>
	{:else if bord.data}
		{@const d = bord.data}

		<!--
			L'état du dépôt est TRANSVERSE aux exercices : il décrit le pipeline de
			lecture, pas la mesure d'une année. Il se formule donc sans jamais se
			rattacher à l'onglet ouvert, sinon le gérant croirait qu'un fichier
			illisible ne concerne que l'exercice affiché.
		-->
		{#if d.documentsEnEchec > 0}
			<CarteVerre ton="alerte" class="p-3">
				<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
					<AlertTriangleIcon class="size-4 shrink-0 text-amber-500" />
					<span>
						{d.documentsEnEchec} fichier{pluriel(d.documentsEnEchec)} n'a pas pu être lu, tous exercices
						confondus.
					</span>
					<a
						href={resolve(localizedHref('/app/factures'))}
						class="font-medium text-[var(--brand)] underline underline-offset-2"
					>
						Voir lesquels
					</a>
				</p>
			</CarteVerre>
		{/if}

		{#if d.documentsEnCours > 0}
			<CarteVerre class="p-3">
				<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
					<LoaderIcon class="size-4 shrink-0 animate-spin" />
					<span>
						{d.documentsEnCours} fichier{pluriel(d.documentsEnCours)} en cours de lecture, tous exercices
						confondus. Vos taux se mettront à jour d'eux-mêmes.
					</span>
				</p>
			</CarteVerre>
		{/if}

		{#if !d.aDesDonnees}
			<!--
				Pas de jauges à zéro : trois cadrans vides sur un écran de conformité
				donnent l'impression d'un produit cassé. On montre le chemin.
			-->
			<CarteVerre ton="accent">
				<p class="text-lg font-semibold">Commençons par vos factures.</p>
				<p class="mt-1 text-[13px] leading-relaxed text-muted-foreground">
					Douze mois d'achats suffisent à calculer vos trois taux. Vous n'avez rien d'autre à
					préparer.
				</p>
				<ol class="mt-4 flex flex-col gap-3">
					<li class="flex items-start gap-3">
						<span
							class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] font-mono text-xs font-bold text-[var(--brand-foreground)]"
						>
							1
						</span>
						<span class="text-[13px] leading-relaxed">
							<strong>Déposez vos factures.</strong> Un export comptable en CSV va le plus vite ; à défaut,
							les PDF et les photos conviennent.
						</span>
					</li>
					<li class="flex items-start gap-3">
						<span
							class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground"
						>
							2
						</span>
						<span class="text-[13px] leading-relaxed text-muted-foreground">
							Nous lisons et classons chaque ligne contre le barème EGalim.
						</span>
					</li>
					<li class="flex items-start gap-3">
						<span
							class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground"
						>
							3
						</span>
						<span class="text-[13px] leading-relaxed text-muted-foreground">
							Vous confirmez la viande, le poisson et ce dont nous doutons. Vos taux s'affichent.
						</span>
					</li>
				</ol>
				<Button href={resolve(localizedHref('/app/factures'))} class="mt-5 h-12 w-full sm:w-auto">
					<CameraIcon class="size-4" />
					Déposer mes factures
				</Button>
			</CarteVerre>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<JaugeTaux
					titre="Durable et de qualité"
					mesure={d.ratios.durable}
					seuil={d.seuils.durable}
					ecartEuros={d.gapEuros.toDurable50}
				/>
				<JaugeTaux
					titre="Biologique"
					mesure={d.ratios.bio}
					seuil={d.seuils.bio}
					ecartEuros={d.gapEuros.toBio20}
				/>
				<JaugeTaux
					titre="Viande et poisson"
					mesure={d.ratios.meatFishDurable}
					seuil={d.seuils.viandePoissonDurable}
					ecartEuros={d.gapEuros.toMeatFish60}
				/>
			</div>

			<p class="text-xs text-muted-foreground">
				Calculés en valeur d'achat HT sur
				<span class="font-mono tabular-nums">{euros(d.ratios.totalFoodHT)}</span>
				d'achats alimentaires en {annee}.
			</p>

			<!--
				Le ratio affiché plus haut compte les classifications automatiques.
				C'est ce qui rend le chiffre utile tout de suite, et c'est exactement
				pour ça qu'on dit ici ce qu'il pèse : en part du MONTANT, parce que
				« 37 libellés » ne dirait pas s'il s'agit de 200 € ou de 40 000 €.
			-->
			{#if d.partNonConfirmee > 0}
				<CarteVerre ton="accent">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-semibold text-balance">
								<span class="font-mono tabular-nums">{pourcent(d.partNonConfirmee)}</span>
								de vos achats reposent sur une classification non confirmée
							</p>
							<p class="mt-1 text-[13px] text-muted-foreground">
								{d.libellesAConfirmer} produit{pluriel(d.libellesAConfirmer)} à confirmer,
								<span class="font-mono tabular-nums">{euros(d.montantAConfirmer)}</span> en jeu.
							</p>
						</div>
						<Button
							href={resolve(localizedHref('/app/confirmer'))}
							class="h-12 w-full shrink-0 sm:w-auto"
						>
							<CheckCheckIcon class="size-4" />
							Confirmer
						</Button>
					</div>
				</CarteVerre>
			{/if}

			{#if d.parFamille.length > 0}
				<div class="flex flex-col gap-2">
					<h2 class="text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
						D'où viennent vos achats
					</h2>
					{#each d.parFamille as f (f.family)}
						<!--
							Borné entre 0 et 1 : une famille dont les avoirs dépassent les
							achats rendrait une part négative, et la barre partirait à
							l'envers hors de son rail.
						-->
						{@const part = f.totalHT > 0 ? Math.min(1, Math.max(0, f.durableHT / f.totalHT)) : 0}
						<CarteVerre class="p-3">
							<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
								<p class="text-[13px] font-medium">{FAMILLES_LISIBLES[f.family]}</p>
								<p class="font-mono text-[13px] tabular-nums">
									{euros(f.totalHT)} · {pourcent(part)} durable
								</p>
							</div>
							<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full bg-[var(--brand)]"
									style="width: {part * 100}%"
								></div>
							</div>
						</CarteVerre>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}
</div>
