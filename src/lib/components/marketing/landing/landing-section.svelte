<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import { reveal } from './reveal';

	let {
		id,
		class: className,
		padded = false,
		children
	}: {
		id?: string;
		class?: string;
		/** Applique l'échelle de padding interne standard. */
		padded?: boolean;
		children: Snippet;
	} = $props();
</script>

<section {id} class="scroll-mt-24 px-3 pb-4 sm:px-4 sm:pb-5">
	<div
		class={cn(
			'landing-panel relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border',
			padded && 'p-6 sm:p-10 lg:p-14 xl:p-16',
			className
		)}
		use:reveal
	>
		<!-- Reflet glass-metal (DA Mycelium) -->
		<div
			class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/14"
		></div>
		{@render children()}
	</div>
</section>
