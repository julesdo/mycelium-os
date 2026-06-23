<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	let {
		tier,
		price,
		perMonth,
		sub,
		agents,
		features,
		cta,
		href,
		featured = false
	}: {
		tier: string;
		price: string;
		perMonth: string;
		sub: string;
		agents: string;
		features: string[];
		cta: string;
		href: string;
		featured?: boolean;
	} = $props();
</script>

<a
	{href}
	class={cn(
		'group flex h-full flex-col rounded-2xl border p-7 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5',
		featured
			? 'border-foreground bg-foreground text-background hover:shadow-[0_20px_48px_-24px_oklch(0_0_0/0.5)]'
			: 'border-border bg-background hover:shadow-[0_12px_32px_-16px_oklch(0_0_0/0.12)]'
	)}
>
	<span class={cn('text-xs font-semibold tracking-[0.08em] uppercase', featured ? 'text-background/50' : 'text-muted-foreground/60')}>
		{tier}
	</span>

	<div class="mt-4 flex items-baseline gap-1">
		<span class={cn('font-mono text-4xl font-bold tracking-tight', featured ? 'text-background' : 'text-foreground')}>
			{price}€
		</span>
		<span class={cn('text-sm', featured ? 'text-background/50' : 'text-muted-foreground')}>
			{perMonth}
		</span>
	</div>

	<p class={cn('mt-1 text-sm', featured ? 'text-background/60' : 'text-muted-foreground')}>
		{sub}
	</p>

	<!-- Badge agents -->
	<div class={cn(
		'mt-5 w-fit rounded-full px-3 py-1 text-xs font-medium',
		featured ? 'bg-background/15 text-background' : 'bg-foreground/8 text-foreground'
	)}>
		{agents}
	</div>

	<!-- Features -->
	<ul class="mt-5 flex flex-1 flex-col gap-2">
		{#each features as feature (feature)}
			<li class={cn('flex items-start gap-2 text-sm', featured ? 'text-background/70' : 'text-muted-foreground')}>
				<Check class={cn('mt-0.5 size-3.5 shrink-0', featured ? 'text-background/50' : 'text-foreground/40')} />
				{feature}
			</li>
		{/each}
	</ul>

	<div class={cn(
		'mt-8 flex h-10 w-full items-center justify-center rounded-full text-sm font-semibold transition-opacity group-hover:opacity-80',
		featured ? 'bg-background text-foreground' : 'border border-border text-foreground'
	)}>
		{cta}
	</div>
</a>
