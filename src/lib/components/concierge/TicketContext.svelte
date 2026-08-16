<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import BuildingIcon from '@lucide/svelte/icons/building-2';
	import UserIcon from '@lucide/svelte/icons/user';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	const TIER_LABEL: Record<string, string> = {
		essential: 'Essential',
		professional: 'Professional',
		business: 'Business',
		enterprise: 'Enterprise'
	};

	const TIER_COLOR: Record<string, string> = {
		essential: 'text-muted-foreground border-border/50',
		professional: 'text-blue-600 border-blue-500/30 bg-blue-500/5 dark:text-blue-400',
		business: 'text-purple-600 border-purple-500/30 bg-purple-500/5 dark:text-purple-400',
		enterprise: 'text-amber-600 border-amber-500/30 bg-amber-500/10 dark:text-amber-400'
	};

	let { organizationId }: { organizationId: Id<'organizations'> } = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const context = useQuery((api as any)['concierge/tickets'].getTicketContext, { organizationId });
</script>

<div class="space-y-4">
	<h3 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
		Contexte client
	</h3>

	{#if context.isLoading}
		<div class="space-y-2">
			<div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
			<div class="h-3 w-1/2 animate-pulse rounded bg-muted"></div>
		</div>
	{:else if context.data}
		<!-- Org -->
		<div class="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
			<div class="flex items-center gap-2">
				<div class="flex size-7 items-center justify-center rounded-lg bg-muted text-[10px] font-bold uppercase shrink-0">
					{context.data.name.slice(0, 2)}
				</div>
				<div class="min-w-0">
					<p class="truncate text-[13px] font-medium">{context.data.name}</p>
					{#if context.data.country}
						<p class="text-[11px] text-muted-foreground">{context.data.country}</p>
					{/if}
				</div>
			</div>
			<span class="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium {TIER_COLOR[context.data.tier] ?? TIER_COLOR.essential}">
				{TIER_LABEL[context.data.tier] ?? context.data.tier}
			</span>
			{#if context.data.openTicketCount > 0}
				<p class="text-[11px] text-muted-foreground">
					{context.data.openTicketCount} ticket{context.data.openTicketCount > 1 ? 's' : ''} ouvert{context.data.openTicketCount > 1 ? 's' : ''}
				</p>
			{/if}
		</div>

		<!-- Concierges assignés -->
		{#if context.data.assignedConcierges.length > 0}
			<div class="space-y-1.5">
				<p class="text-[11px] font-medium text-muted-foreground">Concierges assignés</p>
				{#each context.data.assignedConcierges as c (c?.name)}
					{#if c}
						<div class="flex items-center gap-2">
							<UserIcon class="size-3.5 text-muted-foreground/60" />
							<span class="text-[12px]">{c.name}</span>
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Liens rapides -->
		<div class="space-y-1.5">
			<p class="text-[11px] font-medium text-muted-foreground">Liens rapides</p>
			<a
				href="/ops/{organizationId}"
				class="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
			>
				<BuildingIcon class="size-3.5" />
				Fiche client
			</a>
			<!-- Fleet Observer (P33 — placeholder) -->
			<span class="flex items-center gap-1.5 text-[12px] text-muted-foreground/40 cursor-not-allowed select-none">
				<ExternalLinkIcon class="size-3.5" />
				Fleet Observer
				<span class="rounded bg-muted px-1 py-0.5 text-[9px]">P33</span>
			</span>
		</div>
	{/if}
</div>
