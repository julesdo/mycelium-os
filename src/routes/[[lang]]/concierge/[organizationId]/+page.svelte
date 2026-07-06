<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { page } from '$app/state';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import { healthScoreToColor } from '$lib/convex/concierge/health';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import PlayIcon from '@lucide/svelte/icons/play';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CheckIcon from '@lucide/svelte/icons/check';

	const organizationId = $derived(page.params.organizationId as Id<'organizations'>);
	const detail = useQuery(api['concierge/queries'].getClientDetail, { organizationId });

	const updateStatus = useMutation(api['concierge/mutations'].updateTaskStatus);
	const snoozeTask = useMutation(api['concierge/mutations'].snoozeTask);

	type StatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'SNOOZED';
	let statusFilter = $state<StatusFilter>('ALL');
	let loadingId = $state<string | null>(null);

	const scoreColor = $derived(detail.data ? healthScoreToColor(detail.data.healthScore) : 'green');

	const barColorClass = { green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-destructive' };
	const scoreTextClass = {
		green: 'text-emerald-600 dark:text-emerald-400',
		yellow: 'text-amber-500 dark:text-amber-400',
		red: 'text-destructive'
	};

	const priorityConfig = {
		CRITICAL: {
			label: 'Critique',
			bar: 'bg-destructive',
			text: 'text-destructive',
			row: 'border-l-2 border-l-destructive/60 bg-destructive/[0.03]'
		},
		URGENT: {
			label: 'Urgent',
			bar: 'bg-amber-500',
			text: 'text-amber-500 dark:text-amber-400',
			row: 'border-l-2 border-l-amber-400/60'
		},
		NORMAL: { label: 'Normal', bar: 'bg-muted-foreground/30', text: 'text-muted-foreground', row: '' },
		INFO: { label: 'Info', bar: 'bg-blue-500/60', text: 'text-blue-600 dark:text-blue-400', row: '' }
	};

	const sourceLabels: Record<string, string> = {
		COMPLIANCE_ALERT: 'Conformité',
		INCIDENT: 'Sinistre',
		VIOLATION: 'Contravention',
		MAINTENANCE: 'Maintenance',
		OPTIMIZER_RECOMMENDATION: 'Optimisation',
		MANUAL: 'Manuel'
	};

	const statusTabConfig: { value: StatusFilter; label: string }[] = [
		{ value: 'ALL', label: 'Toutes' },
		{ value: 'OPEN', label: 'Ouvertes' },
		{ value: 'IN_PROGRESS', label: 'En cours' },
		{ value: 'SNOOZED', label: 'Snoozées' }
	];

	const tasks = $derived(detail.data?.openTasks ?? []);

	const tabCounts = $derived({
		ALL: tasks.length,
		OPEN: tasks.filter((t) => t.status === 'OPEN').length,
		IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
		SNOOZED: tasks.filter((t) => t.status === 'SNOOZED').length
	});

	const filteredTasks = $derived(
		statusFilter === 'ALL' ? tasks : tasks.filter((t) => t.status === statusFilter)
	);

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const h = Math.floor(diff / 3_600_000);
		const d = Math.floor(h / 24);
		if (d > 0) return `${d}j`;
		if (h > 0) return `${h}h`;
		return 'maintenant';
	}

	async function markDone(id: Id<'concierge_tasks'>) {
		loadingId = id;
		try {
			await updateStatus({ taskId: id, status: 'DONE' });
			toast.success('Tâche marquée traitée.');
		} finally {
			loadingId = null;
		}
	}

	async function markInProgress(id: Id<'concierge_tasks'>) {
		loadingId = id;
		try {
			await updateStatus({ taskId: id, status: 'IN_PROGRESS' });
		} finally {
			loadingId = null;
		}
	}

	async function doSnooze(id: Id<'concierge_tasks'>) {
		loadingId = id;
		try {
			await snoozeTask({ taskId: id, snoozedUntil: Date.now() + 3_600_000 });
		} finally {
			loadingId = null;
		}
	}
</script>

<svelte:head>
	<title>{detail.data?.organization.name ?? 'Client'} — Concierge Fleet Care</title>
</svelte:head>

<div class="flex h-full flex-col">
	<!-- Sous-header client -->
	<div class="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="flex items-center gap-4 px-6 py-3">
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
						<p class="text-[10px] capitalize text-muted-foreground">
							{org.paddlePlanTier ?? 'essential'}
						</p>
					</div>
				</div>

				<!-- Score santé inline -->
				<div class="flex items-center gap-2.5">
					<div class="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
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
					<Button
						variant="outline"
						size="sm"
						href={resolve(localizedHref('/admin/dashboard'))}
						target="_blank"
						rel="noopener"
					>
						<ExternalLinkIcon class="size-3.5" />
						Dashboard
					</Button>
					<Button
						variant="outline"
						size="sm"
						href={resolve(localizedHref('/admin/fleet'))}
						target="_blank"
						rel="noopener"
					>
						<ExternalLinkIcon class="size-3.5" />
						Flotte
					</Button>
				</div>
			{:else if detail.isLoading}
				<Skeleton class="h-8 w-48 rounded-lg" />
			{/if}
		</div>
	</div>

	<!-- Contenu principal -->
	<div class="flex-1 overflow-auto px-6 py-5">
		{#if detail.isLoading}
			<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each { length: 4 } as _, i (i)}
					<Skeleton class="h-20 rounded-2xl" />
				{/each}
			</div>
			<div class="space-y-1.5">
				{#each { length: 5 } as _, i (i)}
					<Skeleton class="h-14 rounded-xl" />
				{/each}
			</div>

		{:else if detail.data}
			{@const { openTasks, totalTaskCount, doneTaskCount } = detail.data}

			<!-- KPIs -->
			<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
					label="En cours"
					value={openTasks.filter((t) => t.status === 'IN_PROGRESS').length}
				/>
			</div>

			<!-- Tabs statut -->
			<div class="mb-3 flex items-center gap-0.5 rounded-xl bg-muted/60 p-1 self-start w-fit">
				{#each statusTabConfig as tab (tab.value)}
					{@const count = tabCounts[tab.value]}
					<button
						type="button"
						class={cn(
							'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
							statusFilter === tab.value
								? 'bg-card text-foreground shadow-sm ring-1 ring-black/5 dark:bg-muted dark:ring-white/8'
								: 'text-muted-foreground hover:text-foreground'
						)}
						onclick={() => (statusFilter = tab.value)}
					>
						{tab.label}
						{#if count > 0}
							<span class={cn(
								'tabular-nums rounded-full px-1.5 text-[10px] font-semibold',
								statusFilter === tab.value ? 'text-muted-foreground' : 'text-muted-foreground/50'
							)}>{count}</span>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Liste tâches -->
			{#if filteredTasks.length === 0}
				<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
					<InboxIcon class="mb-2 size-7 text-muted-foreground/30" />
					<p class="text-sm font-medium text-muted-foreground">
						{statusFilter === 'ALL' ? 'Aucune tâche ouverte' : 'Aucune tâche dans cette catégorie'}
					</p>
				</div>
			{:else}
				<div class="overflow-hidden rounded-2xl border border-border">
					{#each filteredTasks as task, i (task._id)}
						{@const pCfg = priorityConfig[task.priority] ?? priorityConfig.NORMAL}
						{@const isLoading = loadingId === task._id}
						<div
							class={cn(
								'flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30',
								i < filteredTasks.length - 1 && 'border-b border-border/40',
								pCfg.row
							)}
						>
							<!-- Indicateur priorité -->
							<div class="flex shrink-0 flex-col items-center gap-1">
								<div class={cn('size-1.5 rounded-full', pCfg.bar)}></div>
							</div>

							<!-- Contenu -->
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<span class="text-sm font-semibold text-foreground">{task.title}</span>
									<span class={cn('text-[10px] font-semibold uppercase tracking-wider', pCfg.text)}>
										{pCfg.label}
									</span>
									<span class="text-[10px] text-muted-foreground">
										{sourceLabels[task.sourceType] ?? task.sourceType}
									</span>
									{#if task.dueDate}
										<span class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
											Éch. {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
										</span>
									{/if}
								</div>
								<p class="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
							</div>

							<!-- Timestamp -->
							<span class="shrink-0 text-[10px] text-muted-foreground">{timeAgo(task.createdAt)}</span>

							<!-- Actions — toujours visibles -->
							<div class="flex shrink-0 items-center gap-1">
								{#if task.status === 'OPEN'}
									<Button
										variant="ghost"
										size="icon-xs"
										onclick={() => markInProgress(task._id)}
										disabled={isLoading}
										title="Prendre en charge"
									>
										<PlayIcon class="size-3" />
									</Button>
								{:else if task.status === 'IN_PROGRESS'}
									<span class="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
										En cours
									</span>
								{/if}
								<Button
									variant="ghost"
									size="icon-xs"
									onclick={() => doSnooze(task._id)}
									disabled={isLoading}
									title="Snoozer 1h"
								>
									<ClockIcon class="size-3" />
								</Button>
								<Button
									variant="outline"
									size="xs"
									onclick={() => markDone(task._id)}
									disabled={isLoading}
									class="h-6 gap-1 px-2 text-[11px]"
								>
									<CheckIcon class="size-3" />
									Traité
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
