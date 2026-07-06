<script lang="ts">
	import ConciergeTaskRow from './concierge-task-row.svelte';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import { Skeleton } from '$lib/components/ui/skeleton';

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

	const criticalTasks = $derived(tasks.filter((t) => t.priority === 'CRITICAL'));
	const urgentTasks = $derived(tasks.filter((t) => t.priority === 'URGENT'));
	const normalTasks = $derived(
		tasks.filter((t) => t.priority === 'NORMAL' || t.priority === 'INFO')
	);
</script>

<div class="space-y-6">
	<div class="flex items-baseline justify-between">
		<h2 class="text-sm font-bold tracking-[0.08em] text-muted-foreground uppercase">
			File de tâches — {tasks.length} en attente
		</h2>
	</div>

	{#if loading}
		<div class="space-y-2">
			{#each { length: 4 } as _, i (i)}
				<Skeleton class="h-16 rounded-xl" />
			{/each}
		</div>
	{:else if tasks.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center"
		>
			<InboxIcon class="mb-3 size-8 text-muted-foreground/40" />
			<p class="text-sm font-medium text-muted-foreground">Aucune tâche en attente</p>
			<p class="mt-1 text-xs text-muted-foreground/60">Tous les clients sont à jour.</p>
		</div>
	{:else}
		{#if criticalTasks.length > 0}
			<div class="space-y-2">
				<p class="text-[11px] font-bold tracking-wider text-destructive uppercase">
					Critique — {criticalTasks.length}
				</p>
				{#each criticalTasks as task (task._id)}
					<ConciergeTaskRow
						id={task._id}
						title={task.title}
						description={task.description}
						priority={task.priority}
						status={task.status}
						sourceType={task.sourceType}
						organizationId={task.organizationId}
						organizationName={task.organizationName}
						organizationTier={task.organizationTier}
						dueDate={task.dueDate}
						createdAt={task.createdAt}
					/>
				{/each}
			</div>
		{/if}

		{#if urgentTasks.length > 0}
			<div class="space-y-2">
				<p
					class="text-[11px] font-bold tracking-wider text-amber-500 uppercase dark:text-amber-400"
				>
					Urgent — {urgentTasks.length}
				</p>
				{#each urgentTasks as task (task._id)}
					<ConciergeTaskRow
						id={task._id}
						title={task.title}
						description={task.description}
						priority={task.priority}
						status={task.status}
						sourceType={task.sourceType}
						organizationId={task.organizationId}
						organizationName={task.organizationName}
						organizationTier={task.organizationTier}
						dueDate={task.dueDate}
						createdAt={task.createdAt}
					/>
				{/each}
			</div>
		{/if}

		{#if normalTasks.length > 0}
			<div class="space-y-2">
				<p class="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
					Normal — {normalTasks.length}
				</p>
				{#each normalTasks as task (task._id)}
					<ConciergeTaskRow
						id={task._id}
						title={task.title}
						description={task.description}
						priority={task.priority}
						status={task.status}
						sourceType={task.sourceType}
						organizationId={task.organizationId}
						organizationName={task.organizationName}
						organizationTier={task.organizationTier}
						dueDate={task.dueDate}
						createdAt={task.createdAt}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</div>
