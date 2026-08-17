<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import TicketRow from './TicketRow.svelte';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';

	let { organizationId }: { organizationId: Id<'organizations'> } = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const tickets = useQuery((api as any)['concierge/tickets'].listTicketsForOrg, () => ({
		organizationId
	}));
</script>

<div class="flex h-full flex-col">
	{#if tickets.isLoading}
		{#each { length: 3 } as _, i (i)}
			<div class="flex animate-pulse gap-3 border-b border-border/60 p-4">
				<div class="mt-2 size-2 shrink-0 rounded-full bg-muted"></div>
				<div class="flex-1 space-y-2">
					<div class="h-4 w-3/4 rounded bg-muted"></div>
					<div class="h-3 w-1/2 rounded bg-muted"></div>
				</div>
			</div>
		{/each}
	{:else if (tickets.data ?? []).length === 0}
		<div class="flex flex-col items-center justify-center gap-3 py-16">
			<InboxIcon class="size-9 text-muted-foreground/30" />
			<p class="text-sm text-muted-foreground">Aucun ticket ouvert pour ce client</p>
		</div>
	{:else}
		<div class="divide-y divide-border/60">
			{#each tickets.data ?? [] as ticket (ticket._id)}
				<TicketRow
					{ticket}
					href={resolve(localizedHref(`/ops/${organizationId}/tickets/${ticket._id}`))}
				/>
			{/each}
		</div>
	{/if}
</div>
