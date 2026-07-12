<script lang="ts">
	import ProspectCard from './ProspectCard.svelte';

	let {
		stage,
		prospects
	}: {
		stage: { id: string; label: string; color: string };
		prospects: any[];
	} = $props();
</script>

<div class="flex w-56 shrink-0 flex-col">
	<div class="mb-3 flex items-center gap-2">
		<span class="text-xs font-semibold uppercase tracking-wide {stage.color}">{stage.label}</span>
		<span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
			{prospects.length}
		</span>
	</div>
	<div class="flex-1 space-y-2 overflow-y-auto">
		{#each prospects as prospect (prospect._id)}
			<ProspectCard {prospect} compact={true} />
		{/each}
		{#if prospects.length === 0}
			<div
				class="flex h-16 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground/50"
			>
				Aucun prospect
			</div>
		{/if}
	</div>
</div>
