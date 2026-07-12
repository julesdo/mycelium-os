<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import TicketRow from '$lib/components/concierge/TicketRow.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import InboxIcon from '@lucide/svelte/icons/inbox';

	type Filter = 'all' | 'unassigned' | 'mine';
	let activeFilter = $state<Filter>('all');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const tickets = useQuery((api as any)['concierge/tickets'].listInboxTickets, {
		filter: activeFilter
	});

	const urgentCount = $derived(
		(tickets.data ?? []).filter((t: any) => t.priority === 'URGENT' && t.status === 'NEW').length
	);

	const FILTERS: [Filter, string][] = [
		['all', 'Toutes'],
		['unassigned', 'Non assignées'],
		['mine', 'Les miennes']
	];
</script>

<svelte:head>
	<title>Inbox — Concierge Mycelium</title>
</svelte:head>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
		<div class="flex items-center gap-3">
			<InboxIcon class="size-5 text-muted-foreground" />
			<h1 class="text-lg font-semibold">Inbox</h1>
			{#if urgentCount > 0}
				<Badge class="border-red-500/20 bg-red-500/10 text-red-500">
					{urgentCount} urgent{urgentCount > 1 ? 's' : ''}
				</Badge>
			{/if}
		</div>
	</div>

	<!-- Filtres -->
	<div class="flex shrink-0 gap-0.5 border-b border-border px-6 py-2">
		{#each FILTERS as [filter, label] (filter)}
			<button
				type="button"
				onclick={() => (activeFilter = filter)}
				class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {activeFilter === filter
					? 'bg-muted text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{label}
				{#if filter === 'all' && tickets.data}
					<span
						class="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
					>
						{tickets.data.length}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Liste tickets -->
	<div class="flex-1 divide-y divide-border/60 overflow-y-auto">
		{#if tickets.isLoading}
			{#each { length: 5 } as _, i (i)}
				<div class="flex animate-pulse gap-3 p-4">
					<div class="mt-2 size-2 shrink-0 rounded-full bg-muted"></div>
					<div class="flex-1 space-y-2">
						<div class="h-4 w-3/4 rounded bg-muted"></div>
						<div class="h-3 w-1/2 rounded bg-muted"></div>
					</div>
				</div>
			{/each}
		{:else if (tickets.data ?? []).length === 0}
			<div class="flex flex-col items-center justify-center gap-3 py-24">
				<InboxIcon class="size-10 text-muted-foreground/40" />
				<p class="text-sm text-muted-foreground">
					{activeFilter === 'mine' ? 'Aucun ticket assigné' : 'Aucun ticket ouvert'}
				</p>
			</div>
		{:else}
			{#each tickets.data ?? [] as ticket (ticket._id)}
				<TicketRow {ticket} />
			{/each}
		{/if}
	</div>
</div>
