<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';

	interface Props {
		title: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
		class?: string;
	}

	let { title, description, icon, action, class: className }: Props = $props();
</script>

<div class={cn('flex flex-col items-center justify-center gap-4 py-16 px-6 text-center', className)}>
	<div aria-hidden="true" class="text-muted-foreground/40">
		{#if icon}
			{@render icon()}
		{:else}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="size-12"
			>
				<rect width="18" height="18" x="3" y="3" rx="2" />
				<path d="M9 9h6M9 12h4" />
			</svg>
		{/if}
	</div>

	<div class="flex flex-col gap-1.5 max-w-xs">
		<p class="text-sm font-medium text-foreground">{title}</p>
		{#if description}
			<p class="text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>

	{#if action}
		<div class="mt-2">
			{@render action()}
		</div>
	{/if}
</div>
