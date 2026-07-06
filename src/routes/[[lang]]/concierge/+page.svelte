<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import ClientHealthTable from '$lib/components/concierge/client-health-table.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Input } from '$lib/components/ui/input';
	import SearchIcon from '@lucide/svelte/icons/search';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import UsersIcon from '@lucide/svelte/icons/users';
	import InboxIcon from '@lucide/svelte/icons/inbox';

	const healthGrid = useQuery(api['concierge/queries'].getClientHealthGrid, {});

	let search = $state('');

	const filtered = $derived.by(() => {
		const orgs = healthGrid.data ?? [];
		const q = search.trim().toLowerCase();
		if (!q) return orgs;
		return orgs.filter((o) => o.name.toLowerCase().includes(q));
	});

	const totalCritical = $derived((healthGrid.data ?? []).reduce((s, o) => s + o.criticalCount, 0));
	const totalUrgent   = $derived((healthGrid.data ?? []).reduce((s, o) => s + o.urgentCount, 0));
	const totalOpen     = $derived((healthGrid.data ?? []).reduce((s, o) => s + o.openTaskCount, 0));
	const clientCount   = $derived(healthGrid.data?.length ?? 0);

	function onSelectOrg(id: string) {
		goto(resolve(localizedHref(`/concierge/${id}`)));
	}
</script>

<svelte:head>
	<title>Concierge Fleet Care — Mycelium</title>
</svelte:head>

<div class="flex h-full flex-col px-4 pt-5 md:pt-7 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div class="mb-5 flex shrink-0 items-center justify-between gap-4">
		<div>
			<h1 class="text-base font-semibold tracking-tight">Santé clients</h1>
			{#if !healthGrid.isLoading}
				<div class="mt-1 flex items-center gap-3 text-[13px]">
					<span class="flex items-center gap-1 text-muted-foreground">
						<UsersIcon class="size-3.5" />
						{clientCount} client{clientCount > 1 ? 's' : ''}
					</span>
					{#if totalCritical > 0}
						<span class="flex items-center gap-1 font-semibold text-destructive">
							<AlertTriangleIcon class="size-3.5" />
							{totalCritical} critique{totalCritical > 1 ? 's' : ''}
						</span>
					{/if}
					{#if totalUrgent > 0}
						<span class="font-medium text-amber-500 dark:text-amber-400">
							{totalUrgent} urgent{totalUrgent > 1 ? 's' : ''}
						</span>
					{/if}
					{#if totalOpen === 0 && !healthGrid.isLoading}
						<span class="font-medium text-emerald-600 dark:text-emerald-400">Tout est traité</span>
					{:else}
						<span class="text-muted-foreground">{totalOpen} tâche{totalOpen > 1 ? 's' : ''} ouvertes</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- Search -->
			<div class="relative w-56">
				<SearchIcon class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Rechercher un client…"
					bind:value={search}
					class="h-8 pl-8 text-sm"
				/>
			</div>

			{#if healthGrid.isLoading}
				<RefreshCwIcon class="size-3.5 text-muted-foreground motion-safe:animate-spin" />
			{/if}
		</div>
	</div>

	<!-- Tableau clients -->
	<div class="min-h-0 flex-1 pb-8">
		{#if healthGrid.isLoading}
			<div class="overflow-hidden rounded-2xl border border-border">
				<div class="border-b border-border bg-muted/40 px-4 py-2.5">
					<div class="flex gap-6">
						<Skeleton class="h-3 w-20" />
						<Skeleton class="h-3 w-12" />
						<Skeleton class="h-3 w-24" />
						<Skeleton class="ml-auto h-3 w-12" />
						<Skeleton class="h-3 w-12" />
						<Skeleton class="h-3 w-12" />
					</div>
				</div>
				{#each { length: 5 } as _, i (i)}
					<div class="flex items-center gap-4 border-b border-border/40 px-4 py-3 last:border-0">
						<Skeleton class="size-7 rounded-md" />
						<Skeleton class="h-3.5 w-36" />
						<Skeleton class="h-4 w-14 rounded-full" />
						<div class="ml-auto flex items-center gap-2">
							<Skeleton class="h-1.5 w-20 rounded-full" />
							<Skeleton class="h-3 w-6" />
						</div>
						<Skeleton class="h-3 w-4" />
						<Skeleton class="h-3 w-4" />
						<Skeleton class="h-3 w-4" />
					</div>
				{/each}
			</div>
		{:else if filtered.length === 0 && search}
			<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
				<InboxIcon class="mb-2 size-7 text-muted-foreground/30" />
				<p class="text-sm font-medium text-muted-foreground">Aucun client ne correspond à "{search}"</p>
			</div>
		{:else if healthGrid.data && healthGrid.data.length > 0}
			<ClientHealthTable orgs={filtered} {onSelectOrg} />
		{/if}
	</div>
</div>
