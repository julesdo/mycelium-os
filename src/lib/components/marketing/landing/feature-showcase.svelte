<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Check } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { reveal } from './reveal';

	let {
		title,
		desc,
		bullets,
		reverse = false,
		mockup
	}: {
		title: string;
		desc: string;
		bullets: string[];
		reverse?: boolean;
		mockup: Snippet;
	} = $props();
</script>

<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-20" use:reveal>
	<!-- Texte -->
	<div class={cn('flex flex-col', reverse ? 'lg:order-2' : 'lg:order-1')}>
		<h3 class="text-2xl font-bold tracking-[-0.02em] text-foreground lg:text-3xl">{title}</h3>
		<p class="mt-4 text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">{desc}</p>
		<ul class="mt-6 space-y-3">
			{#each bullets as bullet (bullet)}
				<li class="flex items-center gap-3 text-sm text-foreground/80">
					<span class="flex size-4 shrink-0 items-center justify-center text-[oklch(0.52_0.15_103)] dark:text-[var(--brand)]">
						<Check class="size-4" />
					</span>
					{bullet}
				</li>
			{/each}
		</ul>
	</div>

	<!-- Mockup -->
	<div class={cn('flex items-center justify-center', reverse ? 'lg:order-1' : 'lg:order-2')}>
		{@render mockup()}
	</div>
</div>
