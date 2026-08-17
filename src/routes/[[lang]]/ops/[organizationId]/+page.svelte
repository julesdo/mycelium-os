<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { page } from '$app/state';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import OrgOverview from '$lib/components/concierge/OrgOverview.svelte';
	import ClientInboxTab from '$lib/components/concierge/ClientInboxTab.svelte';
	import ClientTimeline from '$lib/components/concierge/ClientTimeline.svelte';
	import ClientSignals from '$lib/components/concierge/ClientSignals.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import BuildingIcon from '@lucide/svelte/icons/building';

	const organizationId = $derived(page.params.organizationId as Id<'organizations'>);

	const accessibleOrgs = useQuery(api.concierge.staff.getMyAccessibleOrgs, {});
	const org = $derived(accessibleOrgs.data?.find((o) => o._id === organizationId) ?? null);

	let activeTab = $state('inbox');

	const TIER_LABEL: Record<string, string> = {
		diagnostic: 'Diagnostic',
		conformite: 'Conformité',
		operateur: 'Opérateur'
	};

	const TABS = [
		{ value: 'inbox', label: 'Inbox' },
		{ value: 'timeline', label: 'Timeline' },
		{ value: 'assistance', label: 'Assistance' },
		{ value: 'signals', label: 'Signaux' }
	];
</script>

<svelte:head>
	<title>{org?.name ?? 'Client'} — Mycelium</title>
</svelte:head>

<div class="flex h-full flex-col">
	<!-- Header client -->
	<div class="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="flex items-center gap-3 px-6 py-3">
			<Button variant="ghost" size="icon" href={resolve(localizedHref('/ops'))}>
				<ArrowLeftIcon class="size-4" />
			</Button>

			{#if org}
				<div class="flex items-center gap-3">
					<div class="flex size-8 items-center justify-center rounded-lg bg-muted">
						<BuildingIcon class="size-4 text-muted-foreground" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h1 class="text-sm font-bold">{org.name}</h1>
							{#if org.tier}
								<Badge variant="outline" class="text-[10px]">{TIER_LABEL[org.tier] ?? org.tier}</Badge>
							{/if}
						</div>
						{#if org.country}
							<p class="text-[10px] text-muted-foreground">{org.country}</p>
						{/if}
					</div>
				</div>
			{:else if accessibleOrgs.isLoading}
				<Skeleton class="h-8 w-48 rounded-lg" />
			{:else}
				<span class="text-sm text-muted-foreground">Client introuvable ou accès refusé</span>
			{/if}
		</div>

		<!-- Onglets navigation -->
		<div class="px-6">
			<Tabs.Root bind:value={activeTab}>
				<Tabs.List variant="line" class="w-full justify-start gap-1">
					{#each TABS as tab (tab.value)}
						<Tabs.Trigger value={tab.value} class="text-sm">
							{tab.label}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</Tabs.Root>
		</div>
	</div>

	<!-- Contenu onglet actif -->
	<div class="flex-1 overflow-y-auto">
		{#if activeTab === 'inbox'}
			<ClientInboxTab {organizationId} />
		{:else if activeTab === 'timeline'}
			<ClientTimeline {organizationId} />
		{:else if activeTab === 'assistance'}
			<OrgOverview {organizationId} />
		{:else if activeTab === 'signals'}
			<ClientSignals {organizationId} />
		{/if}
	</div>
</div>
