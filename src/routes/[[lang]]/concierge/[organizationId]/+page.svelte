<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { page } from '$app/state';
	import { cn } from '$lib/utils.js';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import OrgOverview from '$lib/components/concierge/OrgOverview.svelte';
	import ClientInboxTab from '$lib/components/concierge/ClientInboxTab.svelte';
	import FleetObserver from '$lib/components/concierge/FleetObserver.svelte';
	import ClientTimeline from '$lib/components/concierge/ClientTimeline.svelte';
	import ClientSignals from '$lib/components/concierge/ClientSignals.svelte';
	import { healthScoreToColor } from '$lib/convex/concierge/health';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import BuildingIcon from '@lucide/svelte/icons/building';

	const organizationId = $derived(page.params.organizationId as Id<'organizations'>);
	const detail = useQuery(api['concierge/queries'].getClientDetail, { organizationId });

	let activeTab = $state('overview');

	const TIER_LABEL: Record<string, string> = {
		essential: 'Essential',
		professional: 'Professional',
		business: 'Business',
		enterprise: 'Enterprise'
	};

	const scoreColor = $derived(detail.data ? healthScoreToColor(detail.data.healthScore) : 'green');
	const barColorClass = { green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-destructive' };
	const scoreTextClass = {
		green: 'text-emerald-600 dark:text-emerald-400',
		yellow: 'text-amber-500 dark:text-amber-400',
		red: 'text-destructive'
	};

	const TABS = [
		{ value: 'overview', label: "Vue d'ensemble" },
		{ value: 'inbox', label: 'Inbox' },
		{ value: 'observer', label: 'Fleet Observer' },
		{ value: 'timeline', label: 'Timeline' },
		{ value: 'signals', label: 'Signaux' }
	];
</script>

<svelte:head>
	<title>{detail.data?.organization.name ?? 'Client'} — Concierge Fleet Care</title>
</svelte:head>

<div class="flex h-full flex-col">
	<!-- Header client -->
	<div class="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="flex items-center gap-3 px-6 py-3">
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
						<div class="flex items-center gap-2">
							<h1 class="text-sm font-bold">{org.name}</h1>
							{#if org.paddlePlanTier}
								<Badge variant="outline" class="text-[10px]">{TIER_LABEL[org.paddlePlanTier] ?? org.paddlePlanTier}</Badge>
							{/if}
						</div>
						{#if org.country}
							<p class="text-[10px] text-muted-foreground">{org.country}{org.sector ? ` · ${org.sector}` : ''}</p>
						{/if}
					</div>
				</div>

				<!-- Score santé -->
				<div class="flex items-center gap-2">
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
			{:else if detail.isLoading}
				<Skeleton class="h-8 w-48 rounded-lg" />
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
		{#if activeTab === 'overview'}
			<OrgOverview {organizationId} />
		{:else if activeTab === 'inbox'}
			<ClientInboxTab {organizationId} />
		{:else if activeTab === 'observer'}
			<FleetObserver {organizationId} />
		{:else if activeTab === 'timeline'}
			<ClientTimeline {organizationId} />
		{:else if activeTab === 'signals'}
			<ClientSignals {organizationId} />
		{/if}
	</div>
</div>
