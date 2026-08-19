<script lang="ts">
	import CarteVerre from './CarteVerre.svelte';
	import { cn } from '$lib/utils.js';

	interface Valeur {
		cle: string;
		valeur: string;
	}

	interface Props {
		/** Le libellé de la ligne, qui devient le titre de la carte. */
		titre: string;
		valeurs: Valeur[];
		class?: string;
	}

	let { titre, valeurs, class: className }: Props = $props();
</script>

<!--
	Une ligne de tableau, telle qu'elle se lit sur un téléphone : le libellé en
	titre, les colonnes en paires clé/valeur empilées. Le tableau reprend la main
	à partir de `md:` et à l'impression.
-->
<CarteVerre class={cn('p-3', className)}>
	<p class="text-[13px] font-semibold">{titre}</p>
	<dl class="mt-2 flex flex-col gap-1">
		{#each valeurs as v (v.cle)}
			<div class="flex items-baseline justify-between gap-3">
				<dt class="text-xs text-muted-foreground">{v.cle}</dt>
				<dd class="font-mono text-[13px] tabular-nums">{v.valeur}</dd>
			</div>
		{/each}
	</dl>
</CarteVerre>
