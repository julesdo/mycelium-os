<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Input } from '$lib/components/ui/input';
	import SearchIcon from '@lucide/svelte/icons/search';
	import BuildingIcon from '@lucide/svelte/icons/building-2';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import InboxIcon from '@lucide/svelte/icons/inbox';

	const accessibleOrgs = useQuery(api.concierge.staff.getMyAccessibleOrgs, {});

	let search = $state('');

	const filtered = $derived.by(() => {
		const orgs = accessibleOrgs.data ?? [];
		const q = search.trim().toLowerCase();
		if (!q) return orgs;
		return orgs.filter((o) => o.name.toLowerCase().includes(q));
	});

	const clientCount = $derived(accessibleOrgs.data?.length ?? 0);

	function onSelectOrg(id: string) {
		goto(resolve(localizedHref(`/ops/${id}`)));
	}
</script>

<svelte:head>
	<title>Clients — Mycelium</title>
</svelte:head>

<div class="flex h-full flex-col px-4 pt-5 md:pt-7 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div class="mb-5 flex shrink-0 items-center justify-between gap-4">
		<div>
			<h1 class="text-base font-semibold tracking-tight">Clients</h1>
			{#if !accessibleOrgs.isLoading}
				<p class="mt-1 text-[13px] text-muted-foreground">
					{clientCount} cantine{clientCount > 1 ? 's' : ''} accessible{clientCount > 1 ? 's' : ''}
				</p>
			{/if}
		</div>

		<div class="relative w-56">
			<SearchIcon class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Rechercher un client…"
				bind:value={search}
				class="h-8 pl-8 text-sm"
			/>
		</div>
	</div>

	<!-- Liste clients -->
	<div class="min-h-0 flex-1 pb-8">
		{#if accessibleOrgs.isLoading}
			<div class="space-y-1.5">
				{#each { length: 5 } as _, i (i)}<Skeleton class="h-14 rounded-xl" />{/each}
			</div>
		{:else if filtered.length === 0 && search}
			<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
				<InboxIcon class="mb-2 size-7 text-muted-foreground/30" />
				<p class="text-sm font-medium text-muted-foreground">Aucun client ne correspond à "{search}"</p>
			</div>
		{:else if filtered.length === 0}
			<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
				<BuildingIcon class="mb-2 size-7 text-muted-foreground/30" />
				<p class="text-sm font-medium text-muted-foreground">Aucun client accessible pour le moment</p>
			</div>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-border">
				{#each filtered as org, i (org._id)}
					<button
						type="button"
						onclick={() => onSelectOrg(org._id)}
						class="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 {i < filtered.length - 1 ? 'border-b border-border/40' : ''}"
					>
						<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
							<BuildingIcon class="size-3.5 text-muted-foreground" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-foreground">{org.name}</p>
							{#if org.country}
								<p class="text-[11px] text-muted-foreground">{org.country}</p>
							{/if}
						</div>
						<ArrowRightIcon class="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
