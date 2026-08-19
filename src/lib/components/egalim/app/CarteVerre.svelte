<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type Ton = 'neutre' | 'accent' | 'succes' | 'alerte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/**
		 * `accent` pour ce qui fait avancer le dossier, `succes` et `alerte` pour
		 * un seuil atteint ou manqué. Le reste est neutre.
		 */
		ton?: Ton;
		class?: string;
		children: Snippet;
	}

	// Les attributs non reconnus sont relayes au div : sans ca, un data-testid
	// pose sur la carte disparaissait silencieusement du DOM.
	let { ton = 'neutre', class: className, children, ...restProps }: Props = $props();

	const FONDS: Record<Ton, string> = {
		neutre: 'border-border bg-card',
		accent: 'border-[var(--brand)]/30 bg-[var(--brand)]/5',
		succes: 'border-emerald-500/40 bg-emerald-500/5',
		alerte: 'border-amber-500/40 bg-amber-500/5'
	};

	// Le reflet blanc en haut de carte : c'est lui qui donne le rendu métal.
	const REFLETS: Record<Ton, string> = {
		neutre: 'via-white/90 dark:via-white/20',
		accent: 'via-[var(--brand)]/40',
		succes: 'via-white/90 dark:via-white/20',
		alerte: 'via-white/90 dark:via-white/20'
	};
</script>

<div
	class={cn('relative overflow-hidden rounded-xl border p-4', FONDS[ton], className)}
	style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
	{...restProps}
>
	<div
		class={cn(
			'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
			REFLETS[ton]
		)}
	></div>
	{@render children()}
</div>
