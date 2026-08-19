<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { localizedHref } from '$lib/utils/i18n';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import ScaleIcon from '@lucide/svelte/icons/scale';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';

	const lots = useQuery(api.egalim.revue.listerLotsAArbitrer, {});

	const STATUTS: Record<string, { texte: string; variante: 'default' | 'secondary' | 'outline' }> =
		{
			EXTRACTING: { texte: 'Extraction', variante: 'outline' },
			CLASSIFYING: { texte: 'Classification', variante: 'outline' },
			REVIEW: { texte: 'À arbitrer', variante: 'default' }
		};
</script>

<svelte:head>
	<title>Lots à arbitrer · Mycelium</title>
</svelte:head>

<div class="flex flex-col gap-6 px-4 pt-5 pb-6 md:pt-7 lg:px-6 xl:px-8 2xl:px-16">
	<div class="flex items-center gap-3">
		<div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/10">
			<ScaleIcon class="size-4 text-[var(--brand-foreground)] dark:text-[var(--brand)]" />
		</div>
		<div class="min-w-0">
			<h1 class="text-base font-semibold tracking-tight">Lots à arbitrer</h1>
			<p class="text-[12px] leading-snug text-muted-foreground">
				Les plus chargés d'abord. Un libellé arbitré vaut pour tous les clients.
			</p>
		</div>
	</div>

	{#if lots.isLoading}
		<div class="flex flex-col gap-2">
			{#each { length: 4 } as _, i (i)}
				<Skeleton class="h-24 rounded-xl sm:h-16" />
			{/each}
		</div>
	{:else if (lots.data ?? []).length === 0}
		<div
			class="relative overflow-hidden rounded-xl border border-border bg-card p-10 text-center"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
			></div>
			<CheckCircleIcon class="mx-auto size-8 text-[var(--brand)]" />
			<p class="mt-3 text-sm font-medium">Aucun lot en attente.</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each lots.data ?? [] as lot (lot.batchId)}
				{@const statut = STATUTS[lot.status] ?? { texte: lot.status, variante: 'outline' as const }}
				<!-- Sous sm, la fiche passe sur deux lignes : à 375 px, nom d'org et
					 compteur côte à côte ne laissent plus rien de lisible ni de
					 cliquable. -->
				<a
					href={localizedHref(`/ops/revue/${lot.batchId}`)}
					class="relative flex min-h-11 flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>

					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{lot.organizationName}</p>
						<p class="mt-0.5 text-[11px] leading-snug text-muted-foreground">
							{lot.label} ·
							<span class="font-mono tabular-nums">
								{lot.periodStart} au {lot.periodEnd}
							</span>
						</p>
					</div>

					<div class="flex shrink-0 items-center gap-3 sm:justify-end">
						<div class="flex items-baseline gap-1.5 sm:flex-col sm:items-end sm:gap-0">
							<p class="font-mono text-sm font-semibold tabular-nums">
								{lot.labelsPendingReview}
							</p>
							<p class="text-[10px] tracking-wider text-muted-foreground uppercase">libellés</p>
						</div>
						<Badge variant={statut.variante}>{statut.texte}</Badge>
						<ChevronRightIcon class="ml-auto size-4 shrink-0 text-muted-foreground sm:ml-0" />
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
