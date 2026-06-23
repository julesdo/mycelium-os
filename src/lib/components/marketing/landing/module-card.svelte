<script lang="ts">
	import type { Component } from 'svelte';
	import type { IconProps } from '@lucide/svelte';

	let {
		icon: Icon,
		title,
		desc
	}: {
		icon: Component<IconProps>;
		title: string;
		desc: string;
	} = $props();
</script>

<div class="flex h-full flex-col p-6 transition-colors duration-150 hover:bg-foreground/5">
	<Icon class="mb-4 size-5 text-foreground/60" />
	<p class="text-sm font-semibold tracking-[-0.01em] text-foreground">{title}</p>
	<p class="mt-1.5 text-xs leading-relaxed text-pretty text-muted-foreground">{desc}</p>
</div>
