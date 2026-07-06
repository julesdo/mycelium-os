<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { healthScoreToColor } from '$lib/convex/concierge/health';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import BuildingIcon from '@lucide/svelte/icons/building';

	interface Props {
		organizationId: string;
		name: string;
		logoUrl?: string | null;
		tier: string;
		openTaskCount: number;
		criticalCount: number;
		urgentCount: number;
		healthScore: number;
		isSelected?: boolean;
		onclick?: () => void;
	}

	let {
		organizationId,
		name,
		logoUrl,
		tier,
		openTaskCount,
		criticalCount,
		urgentCount,
		healthScore,
		isSelected = false,
		onclick
	}: Props = $props();

	const color = $derived(healthScoreToColor(healthScore));

	const scoreColors = {
		green: 'text-emerald-600 dark:text-emerald-400',
		yellow: 'text-amber-500 dark:text-amber-400',
		red: 'text-destructive'
	};

	const barColors = {
		green: 'bg-emerald-500',
		yellow: 'bg-amber-500',
		red: 'bg-destructive'
	};

	const tierLabel: Record<string, string> = {
		essential: 'Essential',
		professional: 'Pro',
		business: 'Business',
		enterprise: 'Enterprise'
	};
</script>

<button
	type="button"
	{onclick}
	class={cn(
		'group/card relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200',
		isSelected
			? 'border-[var(--brand)] bg-[var(--brand)]/5 shadow-md ring-1 ring-[var(--brand)]/30'
			: 'border-border bg-card hover:border-[var(--brand)]/40 hover:shadow-md'
	)}
>
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.9),transparent)] dark:bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.2),transparent)]"
	></div>

	<div class="p-4">
		<!-- Header : logo + nom + tier -->
		<div class="mb-3 flex items-center gap-2.5">
			{#if logoUrl}
				<img src={logoUrl} alt={name} class="size-8 rounded-lg object-cover" />
			{:else}
				<div class="flex size-8 items-center justify-center rounded-lg bg-muted">
					<BuildingIcon class="size-4 text-muted-foreground" />
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-semibold text-foreground">{name}</p>
				<p class="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
					{tierLabel[tier] ?? tier}
				</p>
			</div>
		</div>

		<!-- Score santé -->
		<div class="mb-2 flex items-end justify-between">
			<span class="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
				Santé
			</span>
			<span class={cn('text-xl leading-none font-bold tabular-nums', scoreColors[color])}>
				{healthScore}
			</span>
		</div>

		<!-- Barre de score -->
		<div class="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
			<div
				class={cn('h-full rounded-full transition-all duration-500', barColors[color])}
				style="width: {healthScore}%"
			></div>
		</div>

		<!-- Compteurs tâches -->
		<div class="flex items-center gap-3">
			{#if criticalCount > 0}
				<span class="flex items-center gap-1 text-[11px] font-semibold text-destructive">
					<AlertTriangleIcon class="size-3" />
					{criticalCount} critique{criticalCount > 1 ? 's' : ''}
				</span>
			{/if}
			{#if urgentCount > 0}
				<span
					class="flex items-center gap-1 text-[11px] font-medium text-amber-500 dark:text-amber-400"
				>
					{urgentCount} urgent{urgentCount > 1 ? 's' : ''}
				</span>
			{/if}
			{#if openTaskCount === 0}
				<span
					class="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
				>
					<CheckCircleIcon class="size-3" />
					Rien à traiter
				</span>
			{:else if criticalCount === 0 && urgentCount === 0}
				<span class="text-[11px] text-muted-foreground">
					{openTaskCount} tâche{openTaskCount > 1 ? 's' : ''}
				</span>
			{/if}
		</div>
	</div>
</button>
