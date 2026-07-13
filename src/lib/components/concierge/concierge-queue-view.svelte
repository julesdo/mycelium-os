<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlayIcon from '@lucide/svelte/icons/play';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import BuildingIcon from '@lucide/svelte/icons/building';

	type Task = {
		_id: Id<'concierge_tasks'>;
		title: string;
		description: string;
		priority: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'INFO';
		status: 'OPEN' | 'IN_PROGRESS' | 'SNOOZED' | 'DONE';
		sourceType: string;
		organizationId: Id<'organizations'>;
		organizationName: string;
		organizationTier: string;
		dueDate?: number | null;
		createdAt: number;
		priorityScore: number;
	};

	interface Props {
		tasks: Task[];
		loading?: boolean;
	}

	let { tasks, loading = false }: Props = $props();

	const updateStatus = useMutation(api['concierge/mutations'].updateTaskStatus);
	const snoozeTask = useMutation(api['concierge/mutations'].snoozeTask);

	let loadingId = $state<string | null>(null);

	async function markDone(id: Id<'concierge_tasks'>) {
		loadingId = id;
		try { await updateStatus({ taskId: id, status: 'DONE' }); }
		finally { loadingId = null; }
	}

	async function markInProgress(id: Id<'concierge_tasks'>) {
		loadingId = id;
		try { await updateStatus({ taskId: id, status: 'IN_PROGRESS' }); }
		finally { loadingId = null; }
	}

	function nextWeekday(hour = 9): number {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		if (d.getDay() === 6) d.setDate(d.getDate() + 2);
		if (d.getDay() === 0) d.setDate(d.getDate() + 1);
		d.setHours(hour, 0, 0, 0);
		return d.getTime();
	}

	function nextMonday(hour = 9): number {
		const d = new Date();
		const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
		d.setDate(d.getDate() + daysUntilMonday);
		d.setHours(hour, 0, 0, 0);
		return d.getTime();
	}

	const SNOOZE_OPTIONS = [
		{ label: '+1 heure', ms: () => Date.now() + 3_600_000 },
		{ label: 'Demain 9h', ms: () => nextWeekday(9) },
		{ label: 'Lundi 9h', ms: () => nextMonday(9) }
	];

	async function doSnooze(id: Id<'concierge_tasks'>, ms: number) {
		loadingId = id;
		try { await snoozeTask({ taskId: id, snoozedUntil: ms }); }
		finally { loadingId = null; }
	}

	const priorityConfig = {
		CRITICAL: { label: 'Critique', dot: 'bg-destructive', row: 'border-l-destructive/60 bg-destructive/[0.03]' },
		URGENT:   { label: 'Urgent',   dot: 'bg-amber-500',   row: 'border-l-amber-500/40' },
		NORMAL:   { label: 'Normal',   dot: 'bg-muted-foreground/40', row: '' },
		INFO:     { label: 'Info',     dot: 'bg-blue-500/60',  row: '' }
	};

	const sourceLabels: Record<string, string> = {
		COMPLIANCE_ALERT: 'Conformité',
		INCIDENT: 'Sinistre',
		VIOLATION: 'Contravention',
		MAINTENANCE: 'Maintenance',
		OPTIMIZER_RECOMMENDATION: 'Optimisation',
		MANUAL: 'Manuel'
	};

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const h = Math.floor(diff / 3_600_000);
		const d = Math.floor(h / 24);
		if (d > 0) return `${d}j`;
		if (h > 0) return `${h}h`;
		return 'maintenant';
	}

	const criticalTasks = $derived(tasks.filter((t) => t.priority === 'CRITICAL'));
	const urgentTasks   = $derived(tasks.filter((t) => t.priority === 'URGENT'));
	const normalTasks   = $derived(tasks.filter((t) => t.priority !== 'CRITICAL' && t.priority !== 'URGENT'));
</script>

{#if loading}
	<div class="space-y-1.5">
		{#each { length: 5 } as _, i (i)}
			<Skeleton class="h-12 rounded-xl" />
		{/each}
	</div>
{:else if tasks.length === 0}
	<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center">
		<InboxIcon class="mb-2 size-7 text-muted-foreground/30" />
		<p class="text-sm font-medium text-muted-foreground">Aucune tâche en attente</p>
		<p class="mt-0.5 text-xs text-muted-foreground/50">Tous les clients sont à jour.</p>
	</div>
{:else}
	<div class="overflow-hidden rounded-2xl border border-border">
		<!-- En-tête tableau -->
		<div class="grid grid-cols-[1fr_auto] items-center border-b border-border bg-muted/40 px-4 py-2">
			<div class="flex items-center gap-6">
				<span class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Tâche</span>
				<span class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Client</span>
			</div>
			<span class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Actions</span>
		</div>

		<!-- Section Critique -->
		{#if criticalTasks.length > 0}
			<div class="border-b border-border/60 bg-destructive/[0.02]">
				<div class="flex items-center gap-2 border-b border-destructive/10 px-4 py-1.5">
					<span class="size-1.5 rounded-full bg-destructive"></span>
					<span class="text-[10px] font-bold tracking-widest text-destructive uppercase">
						Critique — {criticalTasks.length}
					</span>
				</div>
				{#each criticalTasks as task (task._id)}
					{@const pCfg = priorityConfig.CRITICAL}
					{@const isLoading = loadingId === task._id}
					<div class="group flex items-center gap-3 border-b border-border/30 px-4 py-2.5 last:border-0 hover:bg-muted/30">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
								<span class="text-sm font-semibold text-foreground">{task.title}</span>
								<span class="text-[10px] text-muted-foreground">{sourceLabels[task.sourceType] ?? task.sourceType}</span>
								{#if task.dueDate}
									<span class="text-[10px] font-medium text-destructive">
										Éch. {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-1.5 mt-0.5">
								<BuildingIcon class="size-2.5 text-muted-foreground/60" />
								<span class="text-[11px] text-muted-foreground">{task.organizationName}</span>
								<span class="text-[10px] text-muted-foreground/40">·</span>
								<span class="text-[10px] text-muted-foreground/60">{timeAgo(task.createdAt)}</span>
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							{#if task.status === 'OPEN'}
								<Button variant="ghost" size="icon-xs" onclick={() => markInProgress(task._id)} disabled={isLoading} title="Prendre en charge">
									<PlayIcon class="size-3" />
								</Button>
							{/if}
							<Popover.Root>
								<Popover.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon-xs" disabled={isLoading} title="Snoozer">
											<ClockIcon class="size-3" />
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-40 p-1" align="end">
									{#each SNOOZE_OPTIONS as opt (opt.label)}
										<button
											type="button"
											onclick={() => doSnooze(task._id, opt.ms())}
											class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										>
											<ClockIcon class="size-3 shrink-0" />
											{opt.label}
										</button>
									{/each}
								</Popover.Content>
							</Popover.Root>
							<Button variant="ghost" size="icon-xs" onclick={() => markDone(task._id)} disabled={isLoading} title="Marquer traité">
								<CheckIcon class="size-3" />
							</Button>
							<a
								href={resolve(localizedHref(`/concierge/${task.organizationId}`))}
								class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
								title="Détail client"
							>
								<ExternalLinkIcon class="size-3" />
							</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Section Urgent -->
		{#if urgentTasks.length > 0}
			<div class={cn('border-b border-border/60', criticalTasks.length > 0 ? '' : '')}>
				<div class="flex items-center gap-2 border-b border-amber-500/10 px-4 py-1.5">
					<span class="size-1.5 rounded-full bg-amber-500"></span>
					<span class="text-[10px] font-bold tracking-widest text-amber-500 uppercase dark:text-amber-400">
						Urgent — {urgentTasks.length}
					</span>
				</div>
				{#each urgentTasks as task (task._id)}
					{@const isLoading = loadingId === task._id}
					<div class="group flex items-center gap-3 border-b border-border/30 px-4 py-2.5 last:border-0 hover:bg-muted/30">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
								<span class="text-sm font-semibold text-foreground">{task.title}</span>
								<span class="text-[10px] text-muted-foreground">{sourceLabels[task.sourceType] ?? task.sourceType}</span>
								{#if task.dueDate}
									<span class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
										Éch. {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-1.5 mt-0.5">
								<BuildingIcon class="size-2.5 text-muted-foreground/60" />
								<span class="text-[11px] text-muted-foreground">{task.organizationName}</span>
								<span class="text-[10px] text-muted-foreground/40">·</span>
								<span class="text-[10px] text-muted-foreground/60">{timeAgo(task.createdAt)}</span>
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							{#if task.status === 'OPEN'}
								<Button variant="ghost" size="icon-xs" onclick={() => markInProgress(task._id)} disabled={isLoading} title="Prendre en charge">
									<PlayIcon class="size-3" />
								</Button>
							{/if}
							<Popover.Root>
								<Popover.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon-xs" disabled={isLoading} title="Snoozer">
											<ClockIcon class="size-3" />
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-40 p-1" align="end">
									{#each SNOOZE_OPTIONS as opt (opt.label)}
										<button
											type="button"
											onclick={() => doSnooze(task._id, opt.ms())}
											class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										>
											<ClockIcon class="size-3 shrink-0" />
											{opt.label}
										</button>
									{/each}
								</Popover.Content>
							</Popover.Root>
							<Button variant="ghost" size="icon-xs" onclick={() => markDone(task._id)} disabled={isLoading} title="Marquer traité">
								<CheckIcon class="size-3" />
							</Button>
							<a
								href={resolve(localizedHref(`/concierge/${task.organizationId}`))}
								class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
								title="Détail client"
							>
								<ExternalLinkIcon class="size-3" />
							</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Section Normal/Info -->
		{#if normalTasks.length > 0}
			<div>
				<div class="flex items-center gap-2 border-b border-border/30 px-4 py-1.5">
					<span class="size-1.5 rounded-full bg-muted-foreground/30"></span>
					<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
						Normal — {normalTasks.length}
					</span>
				</div>
				{#each normalTasks as task (task._id)}
					{@const isLoading = loadingId === task._id}
					<div class="group flex items-center gap-3 border-b border-border/30 px-4 py-2.5 last:border-0 hover:bg-muted/30">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
								<span class="text-sm font-medium text-foreground">{task.title}</span>
								<span class="text-[10px] text-muted-foreground">{sourceLabels[task.sourceType] ?? task.sourceType}</span>
							</div>
							<div class="flex items-center gap-1.5 mt-0.5">
								<BuildingIcon class="size-2.5 text-muted-foreground/60" />
								<span class="text-[11px] text-muted-foreground">{task.organizationName}</span>
								<span class="text-[10px] text-muted-foreground/40">·</span>
								<span class="text-[10px] text-muted-foreground/60">{timeAgo(task.createdAt)}</span>
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
							{#if task.status === 'OPEN'}
								<Button variant="ghost" size="icon-xs" onclick={() => markInProgress(task._id)} disabled={isLoading} title="Prendre en charge">
									<PlayIcon class="size-3" />
								</Button>
							{/if}
							<Popover.Root>
								<Popover.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon-xs" disabled={isLoading} title="Snoozer">
											<ClockIcon class="size-3" />
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-40 p-1" align="end">
									{#each SNOOZE_OPTIONS as opt (opt.label)}
										<button
											type="button"
											onclick={() => doSnooze(task._id, opt.ms())}
											class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										>
											<ClockIcon class="size-3 shrink-0" />
											{opt.label}
										</button>
									{/each}
								</Popover.Content>
							</Popover.Root>
							<Button variant="ghost" size="icon-xs" onclick={() => markDone(task._id)} disabled={isLoading} title="Marquer traité">
								<CheckIcon class="size-3" />
							</Button>
							<a
								href={resolve(localizedHref(`/concierge/${task.organizationId}`))}
								class="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
								title="Détail client"
							>
								<ExternalLinkIcon class="size-3" />
							</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
