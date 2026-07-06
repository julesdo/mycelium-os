<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import ClientHealthGrid from '$lib/components/concierge/client-health-grid.svelte';
	import ConciergeQueueView from '$lib/components/concierge/concierge-queue-view.svelte';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	let selectedOrgId = $state<Id<'organizations'> | null>(null);
	let statusFilter = $state<string[]>(['OPEN', 'IN_PROGRESS']);

	const healthGrid = useQuery(api['concierge/queries'].getClientHealthGrid, {});
	const queue = useQuery(api['concierge/queries'].getAggregatedQueue, {
		statusFilter,
		organizationId: selectedOrgId ?? undefined
	});

	const isLoading = $derived(healthGrid.isLoading || queue.isLoading);
</script>

<svelte:head>
	<title>Concierge Fleet Care — Mycelium</title>
</svelte:head>

<!-- Filtres statut + spinner — barre sous le layout topbar -->
<div class="border-b border-border bg-background px-6 py-2">
	<div class="mx-auto flex max-w-screen-2xl items-center justify-between">
		<div class="flex items-center gap-1 rounded-lg border border-border bg-muted p-1">
			{#each [{ value: 'OPEN', label: 'Ouvert' }, { value: 'IN_PROGRESS', label: 'En cours' }, { value: 'SNOOZED', label: 'Snoozé' }] as filter (filter.value)}
				<button
					type="button"
					class="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors {statusFilter.includes(
						filter.value
					)
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => {
						if (statusFilter.includes(filter.value)) {
							statusFilter = statusFilter.filter((s) => s !== filter.value);
						} else {
							statusFilter = [...statusFilter, filter.value];
						}
					}}
				>
					{filter.label}
				</button>
			{/each}
		</div>
		{#if isLoading}
			<RefreshCwIcon class="size-3.5 text-muted-foreground motion-safe:animate-spin" />
		{/if}
	</div>
</div>

<main class="mx-auto max-w-screen-2xl space-y-8 px-6 py-6">
	<!-- Grille santé clients -->
	{#if healthGrid.data}
		<ClientHealthGrid
			orgs={healthGrid.data}
			{selectedOrgId}
			onSelectOrg={(id) => {
				selectedOrgId = id;
			}}
		/>
	{:else if healthGrid.isLoading}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each { length: 5 } as _, i (i)}
				<div class="h-32 animate-pulse rounded-2xl bg-muted"></div>
			{/each}
		</div>
	{/if}

	<div class="border-t border-border"></div>

	<ConciergeQueueView tasks={queue.data ?? []} loading={queue.isLoading} />
</main>
