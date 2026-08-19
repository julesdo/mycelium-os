<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<!--
	L'action principale de l'écran, à portée de pouce tant qu'on est sur
	téléphone. À partir de `md:` elle disparaît d'ici et reprend sa place en
	ligne, dans le contenu.

	`-mb-24` neutralise le `pb-24` de la page : sans lui, la barre se décollerait
	du bas en fin de défilement et laisserait six rem de vide. La barre de
	navigation du bas vit hors du conteneur de défilement, donc elle n'est jamais
	recouverte.
-->
<div
	class={cn(
		'sticky bottom-0 z-30 -mx-4 -mb-24 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden',
		className
	)}
>
	{@render children()}
</div>
