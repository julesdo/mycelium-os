<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import PlayIcon from '@lucide/svelte/icons/play';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CheckIcon from '@lucide/svelte/icons/check';
	import UserHeartIcon from '@lucide/svelte/icons/heart-handshake';
	import SendIcon from '@lucide/svelte/icons/send';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import HumanAssistThread from './HumanAssistThread.svelte';

	let { organizationId }: { organizationId: Id<'organizations'> } = $props();

	const detail = useQuery(api['concierge/queries'].getClientDetail, { organizationId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const assistRequests = useQuery((api as any)['concierge/humanAssist'].listRequestsForOrg, { organizationId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const replyAsConcierge = useMutation((api as any)['concierge/humanAssist'].replyAsConciege);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const closeByConcierge = useMutation((api as any)['concierge/humanAssist'].closeByConcierge);
	const updateStatus = useMutation(api['concierge/mutations'].updateTaskStatus);
	const snoozeTask = useMutation(api['concierge/mutations'].snoozeTask);

	let expandedRequestId = $state<Id<'humanAssistRequests'> | null>(null);
	let replyInputs = $state<Record<string, string>>({});
	let replySending = $state<Record<string, boolean>>({});
	let loadingId = $state<string | null>(null);

	type StatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'SNOOZED';
	let statusFilter = $state<StatusFilter>('ALL');

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

	const priorityConfig = {
		CRITICAL: {
			label: 'Critique', bar: 'bg-destructive', text: 'text-destructive',
			row: 'border-l-2 border-l-destructive/60 bg-destructive/[0.03]'
		},
		URGENT: {
			label: 'Urgent', bar: 'bg-amber-500', text: 'text-amber-500 dark:text-amber-400',
			row: 'border-l-2 border-l-amber-400/60'
		},
		NORMAL: { label: 'Normal', bar: 'bg-muted-foreground/30', text: 'text-muted-foreground', row: '' },
		INFO: { label: 'Info', bar: 'bg-blue-500/60', text: 'text-blue-600 dark:text-blue-400', row: '' }
	};

	const sourceLabels: Record<string, string> = {
		COMPLIANCE_ALERT: 'Conformité', INCIDENT: 'Sinistre', VIOLATION: 'Contravention',
		MAINTENANCE: 'Maintenance', OPTIMIZER_RECOMMENDATION: 'Optimisation', MANUAL: 'Manuel'
	};

	const statusTabConfig = [
		{ value: 'ALL' as StatusFilter, label: 'Toutes' },
		{ value: 'OPEN' as StatusFilter, label: 'Ouvertes' },
		{ value: 'IN_PROGRESS' as StatusFilter, label: 'En cours' },
		{ value: 'SNOOZED' as StatusFilter, label: 'Snoozées' }
	];

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const h = Math.floor(diff / 3_600_000);
		const d = Math.floor(h / 24);
		if (d > 0) return `${d}j`;
		if (h > 0) return `${h}h`;
		return 'maintenant';
	}

	function getInitials(name: string): string {
		return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	}

	function toggleExpand(requestId: Id<'humanAssistRequests'>) {
		expandedRequestId = expandedRequestId === requestId ? null : requestId;
	}

	async function sendReply(requestId: Id<'humanAssistRequests'>) {
		const content = (replyInputs[requestId] ?? '').trim();
		if (!content || replySending[requestId]) return;
		replySending = { ...replySending, [requestId]: true };
		try {
			await replyAsConcierge({ requestId, content });
			replyInputs = { ...replyInputs, [requestId]: '' };
			toast.success('Réponse envoyée.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		} finally {
			replySending = { ...replySending, [requestId]: false };
		}
	}

	async function closeRequest(requestId: Id<'humanAssistRequests'>) {
		try {
			await closeByConcierge({ requestId });
			if (expandedRequestId === requestId) expandedRequestId = null;
			toast.success('Conversation clôturée.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		}
	}

	async function markDone(id: Id<'concierge_tasks'>) {
		loadingId = id;
		try { await updateStatus({ taskId: id, status: 'DONE' }); toast.success('Tâche traitée.'); }
		finally { loadingId = null; }
	}

	async function markInProgress(id: Id<'concierge_tasks'>) {
		loadingId = id;
		try { await updateStatus({ taskId: id, status: 'IN_PROGRESS' }); }
		finally { loadingId = null; }
	}

	async function doSnooze(id: Id<'concierge_tasks'>) {
		loadingId = id;
		try { await snoozeTask({ taskId: id, snoozedUntil: Date.now() + 3_600_000 }); }
		finally { loadingId = null; }
	}
</script>

<div class="px-6 py-5 space-y-5">
	{#if detail.isLoading}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each { length: 4 } as _, i (i)}<Skeleton class="h-20 rounded-2xl" />{/each}
		</div>
		<div class="space-y-1.5">
			{#each { length: 4 } as _, i (i)}<Skeleton class="h-14 rounded-xl" />{/each}
		</div>
	{:else if detail.data}
		{@const { openTasks, totalTaskCount, doneTaskCount } = detail.data}

		<!-- Human Assist actifs -->
		{#if assistRequests.data && assistRequests.data.length > 0}
			<div>
				<div class="mb-2 flex items-center gap-2">
					<UserHeartIcon class="size-4 text-violet-500" />
					<h2 class="text-sm font-semibold">Demandes clients en attente</h2>
					<span class="rounded-full bg-violet-100 px-1.5 text-[10px] font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
						{assistRequests.data.length}
					</span>
				</div>
				<div class="flex flex-col gap-0 overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-900/30">
					{#each assistRequests.data as req, i (req._id)}
						{@const isExpanded = expandedRequestId === req._id}
						{@const isLast = i === assistRequests.data.length - 1}
						<div class={cn(!isLast && 'border-b border-border/40')}>
							<button
								type="button"
								onclick={() => toggleExpand(req._id)}
								class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
							>
								<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-[11px] font-bold text-white">
									{getInitials(req.requesterName)}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="text-sm font-semibold">{req.requesterName}</span>
										{#if req.status === 'pending'}
											<span class="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
												<span class="inline-block size-1.5 animate-pulse rounded-full bg-amber-500"></span>En attente
											</span>
										{:else if req.status === 'in_progress'}
											<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">En cours</span>
										{/if}
									</div>
									{#if req.lastMessage}
										<p class="mt-0.5 truncate text-xs text-muted-foreground">
											{req.lastMessage.senderType === 'client' ? '🧑 ' : '🤝 '}{req.lastMessage.content}
										</p>
									{:else if req.summary}
										<p class="mt-0.5 truncate text-xs text-muted-foreground italic">{req.summary}</p>
									{/if}
								</div>
								<div class="flex shrink-0 items-center gap-2">
									<span class="text-[10px] text-muted-foreground">{timeAgo(req.createdAt)}</span>
									<ChevronDownIcon class={cn('size-3.5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
								</div>
							</button>
							{#if isExpanded}
								<div class="border-t border-border/40 bg-muted/20 px-4 py-3 space-y-3">
									{#if req.summary}
										<div class="rounded-xl border border-border/50 bg-background px-3 py-2">
											<p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Contexte</p>
											<p class="whitespace-pre-wrap text-[11px] text-muted-foreground line-clamp-4">{req.summary}</p>
										</div>
									{/if}
									<HumanAssistThread requestId={req._id} summary={req.summary} />
									{#if req.status !== 'closed'}
										<div class="flex gap-2">
											<input
												type="text"
												bind:value={replyInputs[req._id]}
												onkeydown={(e) => e.key === 'Enter' && sendReply(req._id)}
												placeholder="Répondre à {req.requesterName}…"
												class="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
											/>
											<Button
												size="icon"
												onclick={() => sendReply(req._id)}
												disabled={!replyInputs[req._id]?.trim() || replySending[req._id]}
												class="size-9 shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
											>
												{#if replySending[req._id]}
													<LoaderCircleIcon class="size-3.5 motion-safe:animate-spin" />
												{:else}
													<SendIcon class="size-3.5" />
												{/if}
											</Button>
											<Button variant="outline" size="sm" onclick={() => closeRequest(req._id)} class="shrink-0 text-[11px]">
												Clôturer
											</Button>
										</div>
									{:else}
										<p class="text-center text-[11px] text-muted-foreground/50">Conversation clôturée.</p>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- KPIs -->
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<MetricCard variant="accent" label="Tâches ouvertes" value={openTasks.length} />
			<MetricCard label="Critiques" value={openTasks.filter((t) => t.priority === 'CRITICAL').length} description="à traiter en priorité" />
			<MetricCard label="Traitées" value={doneTaskCount} description="sur {totalTaskCount} au total" />
			<MetricCard label="En cours" value={openTasks.filter((t) => t.status === 'IN_PROGRESS').length} />
		</div>

		<!-- Filtres statut -->
		<div class="flex items-center gap-0.5 rounded-xl bg-muted/60 p-1 w-fit">
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
						<span class="tabular-nums rounded-full px-1.5 text-[10px] font-semibold text-muted-foreground/60">{count}</span>
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
					<div class={cn(
						'flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30',
						i < filteredTasks.length - 1 && 'border-b border-border/40',
						pCfg.row
					)}>
						<div class="flex shrink-0 flex-col items-center">
							<div class={cn('size-1.5 rounded-full', pCfg.bar)}></div>
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
								<span class="text-sm font-semibold">{task.title}</span>
								<span class={cn('text-[10px] font-semibold uppercase tracking-wider', pCfg.text)}>{pCfg.label}</span>
								<span class="text-[10px] text-muted-foreground">{sourceLabels[task.sourceType] ?? task.sourceType}</span>
								{#if task.dueDate}
									<span class="text-[10px] font-medium text-amber-600 dark:text-amber-400">
										Éch. {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
									</span>
								{/if}
							</div>
							<p class="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
						</div>
						<span class="shrink-0 text-[10px] text-muted-foreground">{timeAgo(task.createdAt)}</span>
						<div class="flex shrink-0 items-center gap-1">
							{#if task.status === 'OPEN'}
								<Button variant="ghost" size="icon-xs" onclick={() => markInProgress(task._id)} disabled={isLoading} title="Prendre en charge">
									<PlayIcon class="size-3" />
								</Button>
							{:else if task.status === 'IN_PROGRESS'}
								<span class="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">En cours</span>
							{/if}
							<Button variant="ghost" size="icon-xs" onclick={() => doSnooze(task._id)} disabled={isLoading} title="Snoozer 1h">
								<ClockIcon class="size-3" />
							</Button>
							<Button variant="outline" size="xs" onclick={() => markDone(task._id)} disabled={isLoading} class="h-6 gap-1 px-2 text-[11px]">
								<CheckIcon class="size-3" />Traité
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
