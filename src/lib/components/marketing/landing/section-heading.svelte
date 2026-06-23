<script lang="ts">
	import { cn } from '$lib/utils';
	import { reveal } from './reveal';

	let {
		eyebrow,
		title,
		lede,
		align = 'left',
		class: className
	}: {
		eyebrow?: string;
		title: string;
		lede?: string;
		align?: 'left' | 'center';
		class?: string;
	} = $props();
</script>

<div class={cn(align === 'center' && 'mx-auto max-w-2xl text-center', className)} use:reveal>
	{#if eyebrow}
		<div class={cn('mb-4 flex items-center gap-2.5', align === 'center' && 'justify-center')}>
			<span class="h-px w-6 bg-[var(--brand)]"></span>
			<span class="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
				{eyebrow}
			</span>
		</div>
	{/if}
	<h2
		class="text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-4xl xl:text-[2.75rem]"
	>
		{title}
	</h2>
	{#if lede}
		<p
			class={cn(
				'mt-4 text-base leading-relaxed text-pretty text-muted-foreground sm:text-[1.0625rem]',
				align === 'center' ? 'mx-auto max-w-xl' : 'max-w-xl'
			)}
		>
			{lede}
		</p>
	{/if}
</div>
