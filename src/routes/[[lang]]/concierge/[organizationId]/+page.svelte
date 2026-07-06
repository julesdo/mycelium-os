<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { page } from '$app/state';
	import ConciergeTaskRow from '$lib/components/concierge/concierge-task-row.svelte';
	import { healthScoreToColor } from '$lib/convex/concierge/health';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import InboxIcon from '@lucide/svelte/icons/inbox';

	const organizationId = $derived(page.params.organizationId as Id<'organizations'>);

	const detail = useQuery(api['concierge/queries'].getClientDetail, { organizationId });

	const scoreColor = $derived(detail.data ? healthScoreToColor(detail.data.healthScore) : 'green');

	const barColorClass = {
		green: 'bg-emerald-500',
		yellow: 'bg-amber-500',
		red: 'bg-destructive'
	};

	const scoreTextClass = {
		green: 'text-emerald-600 dark:text-emerald-400',
		yellow: 'text-amber-500 dark:text-amber-400',
		red: 'text-destructive'
	};
</script>

<svelte:head>
	<title>{detail.data?.organization.name ?? 'Client'} — Concierge Fleet Care</title>
</svelte:head>

<div>
	<!-- Sous-header client -->
	<div class="border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-screen-xl items-center gap-4 px-6 py-3">
			<Button variant="ghost" size="icon" href={resolve(localizedHref('/concierge'))}>
				<ArrowLeftIcon class="size-4" />
			</Button>

			{#if detail.data}
				{@const org = detail.data.organization}
				<div class="flex items-center gap-3">
					{#if org.logoUrl}
						<img src={org.logoUrl} alt={org.name} class="size-8 rounded-lg object-cover" />
					{:else}
						<div class="flex size-8 items-center justify-center rounded-lg bg-muted">
							<BuildingIcon class="size-4 text-muted-foreground" />
						</div>
					{/if}
					<div>
						<h1 class="text-sm font-bold text-foreground">{org.name}</h1>
						<p class="text-[10px] text-muted-foreground capitalize">
							{org.paddlePlanTier ?? 'essential'}
						</p>
					</div>
				</div>

				<!-- Score santé -->
				<div class="ml-4 flex items-center gap-3">
					<div class="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
						<div
							class={cn('h-full rounded-full transition-all duration-500', barColorClass[scoreColor])}
							style="width: {detail.data.healthScore}%"
						></div>
					</div>
					<span class={cn('text-sm font-bold tabular-nums font-mono', scoreTextClass[scoreColor])}>
						{detail.data.healthScore}/100
					</span>
				</div>

				<div class="ml-auto flex items-center gap-2">
					<Button variant="outline" size="sm" href={resolve(localizedHref('/admin/dashboard'))} target="_blank" rel="noopener">
						<ExternalLinkIcon class="size-3.5" />
						Dashboard admin
					</Button>
					<Button variant="outline" size="sm" href={resolve(localizedHref('/admin/fleet'))} target="_blank" rel="noopener">
						<ExternalLinkIcon class="size-3.5" />
						Flotte
					</Button>
				</div>
			{/if}
		</div>
	</div>

	<main class="mx-auto max-w-screen-xl px-6 py-6">
		{#if detail.isLoading}
			<div class="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
				{#each { length: 4 } as _, i (i)}
					<Skeleton class="h-24 rounded-3xl" />
				{/each}
			</div>
			<div class="space-y-3">
				{#each { length: 5 } as _, i (i)}
					<Skeleton class="h-16 rounded-xl" />
				{/each}
			</div>
		{:else if detail.data}
			{@const { openTasks, totalTaskCount, doneTaskCount } = detail.data}

			<!-- KPIs -->
			<div class="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
				<MetricCard
					variant="accent"
					label="Tâches ouvertes"
					value={openTasks.length}
				/>
				<MetricCard
					label="Critiques"
					value={openTasks.filter((t) => t.priority === 'CRITICAL').length}
					description="à traiter en priorité"
				/>
				<MetricCard
					label="Traitées"
					value={doneTaskCount}
					description="sur {totalTaskCount} au total"
				/>
				<MetricCard
					label="Total"
					value={totalTaskCount}
				/>
			</div>

			<!-- Liste tâches -->
			{#if openTasks.length === 0}
				<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
					<InboxIcon class="mb-3 size-8 text-muted-foreground/40" />
					<p class="text-sm font-medium text-muted-foreground">Aucune tâche ouverte pour ce client</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each openTasks as task (task._id)}
						<ConciergeTaskRow
							id={task._id}
							title={task.title}
							description={task.description}
							priority={task.priority}
							status={task.status}
							sourceType={task.sourceType}
							organizationId={task.organizationId}
							organizationName={detail.data.organization.name}
							organizationTier={detail.data.organization.paddlePlanTier ?? 'essential'}
							dueDate={task.dueDate}
							createdAt={task.createdAt}
						/>
					{/each}
				</div>
			{/if}
		{/if}
	</main>
</div>
