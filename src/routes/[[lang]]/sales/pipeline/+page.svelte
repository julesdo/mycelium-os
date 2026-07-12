<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import ProspectCard from '$lib/components/sales/ProspectCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';

	type ViewMode = 'list' | 'kanban';
	let viewMode = $state<ViewMode>('list');

	const STAGES = [
		{ id: 'discovery', label: 'Découverte', color: 'text-muted-foreground' },
		{ id: 'demo', label: 'Démo en cours', color: 'text-amber-500' },
		{ id: 'negotiation', label: 'Négociation', color: 'text-blue-500' },
		{ id: 'won', label: 'Gagné 🏆', color: 'text-emerald-500' },
		{ id: 'lost', label: 'Perdu', color: 'text-red-400' }
	] as const;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const prospects = useQuery((api as any)['sales/prospects'].listMyProspects, {});

	const byStage = $derived.by(() => {
		const data = (prospects.data as any[]) ?? [];
		return Object.fromEntries(STAGES.map((s) => [s.id, data.filter((p: any) => p.stage === s.id)]));
	});
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-border/60 p-4">
		<h1 class="text-base font-semibold">Pipeline</h1>
		<div class="flex items-center gap-2">
			<!-- Toggle vue (desktop) -->
			<div class="hidden rounded-lg border border-border bg-muted/30 p-0.5 md:flex">
				{#each (['list', 'kanban'] as const) as mode}
					<button
						type="button"
						onclick={() => (viewMode = mode)}
						class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors
						{viewMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}"
					>
						{mode === 'list' ? 'Liste' : 'Kanban'}
					</button>
				{/each}
			</div>
			<Button
				size="sm"
				href={resolve(localizedHref('/sales/pipeline/new'))}
				class="min-h-[44px] bg-[var(--brand)] text-[var(--brand-foreground)] md:min-h-[36px]"
				style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
			>
				<PlusIcon class="size-4" />
				<span class="ml-1.5 hidden md:inline">Prospect</span>
			</Button>
		</div>
	</div>

	{#if prospects.isLoading}
		<div class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
			Chargement…
		</div>
	<!-- Vue liste (mobile par défaut, desktop si sélectionné) -->
	{:else if viewMode === 'list'}
		<div class="flex-1 overflow-y-auto divide-y divide-border/40">
			{#each STAGES as stage}
				{@const stageProspects = (byStage[stage.id] ?? []) as any[]}
				{#if stageProspects.length > 0}
					<div>
						<div class="bg-muted/20 px-4 py-2">
							<span class="text-xs font-semibold uppercase tracking-wide {stage.color}">
								{stage.label} · {stageProspects.length}
							</span>
						</div>
						<div class="divide-y divide-border/40">
							{#each stageProspects as prospect (prospect._id)}
								<div class="px-4 py-2">
									<ProspectCard {prospect} />
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			{#if ((prospects.data as any[]) ?? []).length === 0}
				<div class="flex flex-col items-center justify-center gap-4 py-24">
					<p class="text-sm text-muted-foreground">Aucun prospect. Commencez par en ajouter un.</p>
					<Button
						href={resolve(localizedHref('/sales/pipeline/new'))}
						class="min-h-[44px] bg-[var(--brand)] text-[var(--brand-foreground)]"
					>
						Ajouter un prospect
					</Button>
				</div>
			{/if}
		</div>

	<!-- Vue Kanban (desktop) -->
	{:else}
		<div class="flex-1 overflow-x-auto">
			<div class="flex h-full min-w-[900px] gap-3 p-4">
				{#each STAGES as stage}
					{@const stageProspects = (byStage[stage.id] ?? []) as any[]}
					<div class="flex w-56 shrink-0 flex-col">
						<div class="mb-3 flex items-center gap-2">
							<span class="text-xs font-semibold uppercase tracking-wide {stage.color}">
								{stage.label}
							</span>
							<span
								class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
							>
								{stageProspects.length}
							</span>
						</div>
						<div class="flex-1 space-y-2 overflow-y-auto">
							{#each stageProspects as prospect (prospect._id)}
								<ProspectCard {prospect} compact={true} />
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
