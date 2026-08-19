<script lang="ts">
	import CarteVerre from './CarteVerre.svelte';

	interface Props {
		titre: string;
		/** Le taux mesuré, en fraction de 0 à 1. */
		mesure: number;
		/** Le seuil légal, en fraction de 0 à 1. */
		seuil: number;
		/** Le montant d'achats HT qu'il reste à basculer pour atteindre le seuil. */
		ecartEuros: number;
	}

	let { titre, mesure, seuil, ecartEuros }: Props = $props();

	const atteint = $derived(mesure >= seuil);

	/**
	 * L'indicateur n'a rien à mesurer : ni tenu, ni manqué.
	 *
	 * `ecartVersSeuil` ne rend zéro que lorsque le seuil est déjà franchi, donc
	 * un écart nul sur un objectif non atteint ne peut venir que d'une assiette
	 * vide. Le cas se produit vraiment : une cantine végétarienne n'a aucun achat
	 * de viande ni de poisson, et un cadran ambre annonçant « il reste 0 € à
	 * basculer » lui désignerait un effort qui n'existe pas.
	 */
	const sansObjet = $derived(!atteint && ecartEuros <= 0);

	/**
	 * Rapport à l'objectif, borné entre 0 et 1.
	 *
	 * Au-delà de l'objectif l'arc ne veut plus rien dire, et en dessous de zéro
	 * non plus : un exercice où les avoirs dépassent les achats d'une famille
	 * rendrait un ratio négatif, qui tracerait l'anneau à l'envers.
	 */
	const remplissage = $derived(seuil > 0 ? Math.min(1, Math.max(0, mesure / seuil)) : 0);

	const RAYON = 52;
	const CIRCONFERENCE = 2 * Math.PI * RAYON;

	function pourcent(f: number): string {
		return `${(f * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
	}

	function euros(m: number): string {
		return `${Math.round(m).toLocaleString('fr-FR')} €`;
	}
</script>

<!--
	Vert quand le seuil est tenu, ambre quand il manque des euros, neutre quand
	il n'y a rien à mesurer. Jamais rouge : l'écran constate un écart, il
	n'accuse pas le gérant qui vient précisément le combler.
-->
<CarteVerre
	ton={sansObjet ? 'neutre' : atteint ? 'succes' : 'alerte'}
	class="flex flex-col items-center rounded-3xl p-5"
>
	<p class="text-center text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
		{titre}
	</p>

	<!--
		Le chiffre est posé au centre de l'anneau en position absolue. Le caler
		par marges négatives le décalerait au premier changement de graisse ou
		de taille de police.
	-->
	<div class="relative mt-3 size-32 shrink-0">
		<svg viewBox="0 0 128 128" class="size-full -rotate-90" aria-hidden="true">
			<circle
				cx="64"
				cy="64"
				r={RAYON}
				fill="none"
				stroke="currentColor"
				stroke-width="10"
				class="text-muted/40"
			/>
			<!--
				À zéro, l'arc n'est pas tracé du tout : un `stroke-linecap` rond sur
				un segment de longueur nulle laisse un point sur le cercle, qui se
				lit comme un début de progression alors qu'il n'y en a aucune.
			-->
			{#if remplissage > 0}
				<circle
					cx="64"
					cy="64"
					r={RAYON}
					fill="none"
					stroke="currentColor"
					stroke-width="10"
					stroke-linecap="round"
					stroke-dasharray={CIRCONFERENCE}
					stroke-dashoffset={CIRCONFERENCE * (1 - remplissage)}
					class={atteint ? 'text-emerald-500' : 'text-amber-500'}
					style="transition: stroke-dashoffset 600ms ease-out"
				/>
			{/if}
		</svg>

		<!--
			1,375 rem et non 1,5 : le diamètre intérieur de l'anneau fait 94 px, et
			« 100,0 % » à 24 px viendrait mordre le tracé.
		-->
		<p
			class="absolute inset-0 flex items-center justify-center font-mono text-[1.375rem] leading-none font-bold tabular-nums"
		>
			{pourcent(mesure)}
		</p>
	</div>

	<p class="mt-2 font-mono text-[11px] text-muted-foreground tabular-nums">
		objectif {pourcent(seuil)}
	</p>

	<!--
		L'écart s'annonce en EUROS et jamais en points : « il reste 41 000 €
		d'achats à basculer » se comprend et s'actionne, « il manque 13,45 points »
		ne se comprend pas.
	-->
	<p class="mt-2 text-center text-[13px] leading-snug text-balance">
		{#if sansObjet}
			<span class="text-muted-foreground">Aucun achat mesuré sur ce périmètre</span>
		{:else if atteint}
			<span class="font-medium text-emerald-600 dark:text-emerald-400">Objectif atteint</span>
		{:else}
			Il reste <span class="font-mono font-semibold tabular-nums">{euros(ecartEuros)}</span>
			d'achats à basculer
		{/if}
	</p>
</CarteVerre>
