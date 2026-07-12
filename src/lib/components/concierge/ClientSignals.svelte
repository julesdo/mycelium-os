<script lang="ts">
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';

	let { organizationId }: { organizationId: Id<'organizations'> } = $props();

	// Signals calculés dynamiquement en P37 — placeholder statique pour ce sprint
	const signals = $state<Array<{
		id: string;
		type: 'upsell' | 'churn_risk' | 'expansion';
		title: string;
		body: string;
		priority: 'high' | 'normal';
	}>>([]);
</script>

<div class="p-5 space-y-3">
	{#if signals.length === 0}
		<div class="flex flex-col items-center gap-3 py-16">
			<ZapIcon class="size-10 text-muted-foreground/25" />
			<p class="text-sm text-muted-foreground">Aucun signal détecté</p>
			<p class="text-center text-xs text-muted-foreground/60 max-w-52">
				Les signaux upsell et risques de churn apparaîtront ici automatiquement (P37)
			</p>
		</div>
	{:else}
		{#each signals as signal (signal.id)}
			<div class="relative overflow-hidden rounded-xl border border-border bg-card p-4 space-y-2.5"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.06)">
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				<div class="flex items-start gap-2.5">
					{#if signal.type === 'upsell' || signal.type === 'expansion'}
						<ZapIcon class="size-4 text-amber-500 mt-0.5 shrink-0" />
					{:else}
						<TrendingDownIcon class="size-4 text-red-500 mt-0.5 shrink-0" />
					{/if}
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium">{signal.title}</p>
						<p class="text-xs text-muted-foreground mt-0.5">{signal.body}</p>
					</div>
					<Badge class="{signal.priority === 'high'
						? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
						: 'bg-muted text-muted-foreground border-border/50'} text-[10px] shrink-0">
						{signal.priority === 'high' ? 'Haute' : 'Normale'}
					</Badge>
				</div>
				<div class="flex justify-end">
					<Button size="sm" variant="outline" class="h-7 gap-1.5 text-xs">
						<TrendingUpIcon class="size-3" />
						Alerter le commercial
					</Button>
				</div>
			</div>
		{/each}
	{/if}
</div>
