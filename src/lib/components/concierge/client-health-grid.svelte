<script lang="ts">
	import ClientHealthCard from './client-health-card.svelte';
	import type { Id } from '$lib/convex/_generated/dataModel';

	interface OrgHealth {
		organizationId: Id<'organizations'>;
		name: string;
		logoUrl?: string | null;
		tier: string;
		openTaskCount: number;
		criticalCount: number;
		urgentCount: number;
		healthScore: number;
	}

	interface Props {
		orgs: OrgHealth[];
		selectedOrgId?: Id<'organizations'> | null;
		onSelectOrg: (id: Id<'organizations'> | null) => void;
	}

	let { orgs, selectedOrgId = null, onSelectOrg }: Props = $props();

	// Trier par score croissant (les plus à risque d'abord)
	const sorted = $derived([...orgs].sort((a, b) => a.healthScore - b.healthScore));

	const totalCritical = $derived(orgs.reduce((s, o) => s + o.criticalCount, 0));
	const totalOpen = $derived(orgs.reduce((s, o) => s + o.openTaskCount, 0));
</script>

<div class="space-y-4">
	<div class="flex items-baseline justify-between">
		<h2 class="text-sm font-bold tracking-[0.08em] text-muted-foreground uppercase">
			Vue d'ensemble — {orgs.length} client{orgs.length > 1 ? 's' : ''}
		</h2>
		<div class="flex items-center gap-3 text-[11px]">
			{#if totalCritical > 0}
				<span class="font-semibold text-destructive"
					>{totalCritical} critique{totalCritical > 1 ? 's' : ''}</span
				>
			{/if}
			<span class="text-muted-foreground">{totalOpen} tâche{totalOpen > 1 ? 's' : ''} ouvertes</span
			>
			{#if selectedOrgId}
				<button
					type="button"
					class="font-medium text-[var(--brand)] hover:underline"
					onclick={() => onSelectOrg(null)}
				>
					Effacer filtre
				</button>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
		{#each sorted as org (org.organizationId)}
			<ClientHealthCard
				organizationId={org.organizationId}
				name={org.name}
				logoUrl={org.logoUrl}
				tier={org.tier}
				openTaskCount={org.openTaskCount}
				criticalCount={org.criticalCount}
				urgentCount={org.urgentCount}
				healthScore={org.healthScore}
				isSelected={selectedOrgId === org.organizationId}
				onclick={() => {
					onSelectOrg(selectedOrgId === org.organizationId ? null : org.organizationId);
				}}
			/>
		{/each}
	</div>
</div>
