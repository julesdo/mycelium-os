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
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import InboxIcon from '@lucide/svelte/icons/inbox';

	const organizationId = $derived(page.params.organizationId as Id<'organizations'>);

	const detail = useQuery(api['concierge/queries'].getClientDetail, { organizationId });

	const scoreColor = $derived(detail.data ? healthScoreToColor(detail.data.healthScore) : 'green');

	const scoreColorClass = {
		green: 'text-emerald-600 dark:text-emerald-400',
		yellow: 'text-amber-500 dark:text-amber-400',
		red: 'text-destructive'
	};

	const barColorClass = {
		green: 'bg-emerald-500',
		yellow: 'bg-amber-500',
		red: 'bg-destructive'
	};
</script>

<svelte:head>
	<title>{detail.data?.organization.name ?? 'Client'} — Concierge Fleet Care</title>
</svelte:head>

<div>
	<!-- Sous-header client — sous le topbar du layout -->
	<header class="border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-screen-xl items-center gap-4 px-6 py-4">
			<a
				href={resolve(localizedHref('/concierge'))}
				class="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<ArrowLeftIcon class="size-4" />
			</a>

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
							class={cn(
								'h-full rounded-full transition-all duration-500',
								barColorClass[scoreColor]
							)}
							style="width: {detail.data.healthScore}%"
						></div>
					</div>
					<span class={cn('text-sm font-bold tabular-nums', scoreColorClass[scoreColor])}>
						{detail.data.healthScore} / 100
					</span>
				</div>

				<div class="ml-auto flex items-center gap-2">
					<a
						href={resolve(localizedHref('/admin/dashboard'))}
						target="_blank"
						rel="noopener"
						class="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<ExternalLinkIcon class="size-3" />
						Dashboard admin
					</a>
					<a
						href={resolve(localizedHref('/admin/fleet'))}
						target="_blank"
						rel="noopener"
						class="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<ExternalLinkIcon class="size-3" />
						Flotte
					</a>
				</div>
			{/if}
		</div>
	</header>

	<main class="mx-auto max-w-screen-xl px-6 py-6">
		{#if detail.isLoading}
			<div class="space-y-3">
				{#each { length: 5 } as _, i (i)}
					<div class="h-16 animate-pulse rounded-xl bg-muted"></div>
				{/each}
			</div>
		{:else if detail.data}
			{@const { openTasks, totalTaskCount, doneTaskCount } = detail.data}

			<!-- KPIs -->
			<div class="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
				<div class="relative overflow-hidden rounded-2xl bg-card p-4">
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.9),transparent)] dark:bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.2),transparent)]"
					></div>
					<p class="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
						Tâches ouvertes
					</p>
					<p class="mt-1 font-mono text-3xl font-bold text-foreground tabular-nums">
						{openTasks.length}
					</p>
				</div>
				<div class="relative overflow-hidden rounded-2xl bg-card p-4">
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.9),transparent)] dark:bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.2),transparent)]"
					></div>
					<p class="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
						Critiques
					</p>
					<p class="mt-1 font-mono text-3xl font-bold text-destructive tabular-nums">
						{openTasks.filter((t) => t.priority === 'CRITICAL').length}
					</p>
				</div>
				<div class="relative overflow-hidden rounded-2xl bg-card p-4">
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.9),transparent)] dark:bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.2),transparent)]"
					></div>
					<p class="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
						Traitées
					</p>
					<p
						class="mt-1 font-mono text-3xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400"
					>
						{doneTaskCount}
					</p>
				</div>
				<div class="relative overflow-hidden rounded-2xl bg-card p-4">
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.9),transparent)] dark:bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.2),transparent)]"
					></div>
					<p class="text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
						Total
					</p>
					<p class="mt-1 font-mono text-3xl font-bold text-foreground tabular-nums">
						{totalTaskCount}
					</p>
				</div>
			</div>

			<!-- Liste tâches -->
			{#if openTasks.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center"
				>
					<InboxIcon class="mb-3 size-8 text-muted-foreground/40" />
					<p class="text-sm font-medium text-muted-foreground">
						Aucune tâche ouverte pour ce client
					</p>
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
