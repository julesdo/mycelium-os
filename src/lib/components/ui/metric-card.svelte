<script lang="ts">
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import { cn } from '$lib/utils.js';

	interface Props {
		label: string;
		value: string | number;
		trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
		description?: string;
		href?: string;
		variant?: 'default' | 'accent' | 'destructive';
		loading?: boolean;
		class?: string;
	}

	let {
		label,
		value,
		trend,
		description,
		href,
		variant = 'default',
		loading = false,
		class: className
	}: Props = $props();
</script>

<div
	data-slot="card"
	class={cn(
		'group/card relative overflow-hidden rounded-3xl transition-all duration-200',
		variant === 'accent'
			? 'brand-glow bg-[var(--brand)]'
			: 'bg-card hover:shadow-md',
		className
	)}
>
	{#if variant !== 'accent'}
		<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"></div>
	{/if}

	<div class="flex flex-col px-4 py-4">
		<!-- Label row + arrow -->
		<div class="mb-2.5 flex items-center justify-between gap-2">
			<span class={cn(
				'text-[11px] font-bold tracking-[0.09em] uppercase',
				variant === 'accent' ? 'text-[var(--brand-foreground)]/55' : 'text-muted-foreground'
			)}>
				{label}
			</span>
			{#if href}
				<a
					{href}
					class={cn(
						'flex size-6 shrink-0 items-center justify-center rounded-full transition-colors',
						variant === 'accent'
							? 'bg-[var(--brand-foreground)]/10 text-[var(--brand-foreground)]/50 hover:bg-[var(--brand-foreground)]/18'
							: 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
					)}
					aria-label="Voir détails"
				>
					<ArrowUpRightIcon class="size-3" />
				</a>
			{/if}
		</div>

		<!-- Value -->
		<div class={cn(
			'font-mono text-4xl font-bold tabular-nums leading-none tracking-tight',
			variant === 'accent' ? 'text-[var(--brand-foreground)]' : 'text-foreground',
			loading && 'invisible'
		)}>
			{#if !loading}
				<span class="animate-enter-blur-up inline-block" style="--enter-delay: 40ms">{value}</span>
			{:else}
				{value}
			{/if}
		</div>

		<!-- Trend / description -->
		{#if trend || description}
			<div class="mt-2 flex items-center gap-1.5">
				{#if trend}
					<span class={cn(
						'inline-flex items-center gap-0.5 text-[11px] font-semibold',
						variant === 'accent'
							? 'text-[var(--brand-foreground)]/50'
							: trend.direction === 'down'
								? 'text-destructive'
								: 'text-emerald-600 dark:text-emerald-400'
					)}>
						{#if trend.direction === 'up'}<TrendingUpIcon class="size-3" />{/if}
						{#if trend.direction === 'down'}<TrendingDownIcon class="size-3" />{/if}
						{trend.value}
					</span>
				{/if}
				{#if description}
					<span class={cn(
						'text-[11px]',
						variant === 'accent' ? 'text-[var(--brand-foreground)]/45' : 'text-muted-foreground'
					)}>{description}</span>
				{/if}
			</div>
		{/if}
	</div>
</div>
