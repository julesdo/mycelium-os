<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { healthScoreToColor } from '$lib/convex/concierge/health';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { Badge } from '$lib/components/ui/badge';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

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
		onSelectOrg: (id: string) => void;
	}

	let { orgs, onSelectOrg }: Props = $props();

	type SortKey = 'name' | 'healthScore' | 'criticalCount' | 'urgentCount' | 'openTaskCount';
	type SortDir = 'asc' | 'desc';

	let sortKey = $state<SortKey>('healthScore');
	let sortDir = $state<SortDir>('asc');

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	const sorted = $derived.by(() => {
		return [...orgs].sort((a, b) => {
			const av = a[sortKey];
			const bv = b[sortKey];
			const cmp =
				typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
			return sortDir === 'asc' ? cmp : -cmp;
		});
	});

	const tierLabel: Record<string, string> = {
		essential: 'Essential',
		professional: 'Pro',
		business: 'Business',
		enterprise: 'Enterprise'
	};

	const scoreBarColor = {
		green: 'bg-emerald-500',
		yellow: 'bg-amber-500',
		red: 'bg-destructive'
	};

	const scoreTextColor = {
		green: 'text-emerald-600 dark:text-emerald-400',
		yellow: 'text-amber-500 dark:text-amber-400',
		red: 'text-destructive'
	};

	function sortIcon(key: SortKey) {
		if (sortKey !== key) return ChevronsUpDownIcon;
		return sortDir === 'asc' ? ChevronUpIcon : ChevronDownIcon;
	}
</script>

<div class="overflow-hidden rounded-2xl border border-border">
	<table class="w-full">
		<thead>
			<tr class="border-b border-border bg-muted/40">
				<th class="px-4 py-2.5 text-left">
					<button
						type="button"
						class="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground"
						onclick={() => toggleSort('name')}
					>
						Client
						<svelte:component this={sortIcon('name')} class="size-3" />
					</button>
				</th>
				<th class="px-4 py-2.5 text-left">
					<span class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
						>Tier</span
					>
				</th>
				<th class="px-4 py-2.5 text-left">
					<button
						type="button"
						class="flex items-center gap-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground"
						onclick={() => toggleSort('healthScore')}
					>
						Santé flotte
						<svelte:component this={sortIcon('healthScore')} class="size-3" />
					</button>
				</th>
				<th class="px-4 py-2.5 text-right">
					<button
						type="button"
						class="flex w-full items-center justify-end gap-1 text-[11px] font-semibold tracking-wider text-destructive uppercase hover:text-destructive/80"
						onclick={() => toggleSort('criticalCount')}
					>
						Critique
						<svelte:component this={sortIcon('criticalCount')} class="size-3" />
					</button>
				</th>
				<th class="px-4 py-2.5 text-right">
					<button
						type="button"
						class="flex w-full items-center justify-end gap-1 text-[11px] font-semibold tracking-wider text-amber-500 uppercase hover:text-amber-400"
						onclick={() => toggleSort('urgentCount')}
					>
						Urgent
						<svelte:component this={sortIcon('urgentCount')} class="size-3" />
					</button>
				</th>
				<th class="px-4 py-2.5 text-right">
					<button
						type="button"
						class="flex w-full items-center justify-end gap-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase hover:text-foreground"
						onclick={() => toggleSort('openTaskCount')}
					>
						Tâches
						<svelte:component this={sortIcon('openTaskCount')} class="size-3" />
					</button>
				</th>
				<th class="w-10 px-2 py-2.5"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-border/50">
			{#each sorted as org (org.organizationId)}
				{@const color = healthScoreToColor(org.healthScore)}
				<tr
					class="group cursor-pointer transition-colors hover:bg-muted/40"
					onclick={() => onSelectOrg(org.organizationId)}
				>
					<!-- Client -->
					<td class="px-4 py-3">
						<div class="flex items-center gap-3">
							{#if org.logoUrl}
								<img
									src={org.logoUrl}
									alt={org.name}
									class="size-7 shrink-0 rounded-md object-cover"
								/>
							{:else}
								<div
									class="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted"
								>
									<BuildingIcon class="size-3.5 text-muted-foreground" />
								</div>
							{/if}
							<span class="text-sm font-semibold text-foreground">{org.name}</span>
						</div>
					</td>

					<!-- Tier -->
					<td class="px-4 py-3">
						<Badge variant="secondary" class="text-[10px] font-medium tracking-wide uppercase">
							{tierLabel[org.tier] ?? org.tier}
						</Badge>
					</td>

					<!-- Score santé -->
					<td class="px-4 py-3">
						<div class="flex items-center gap-2.5">
							<div class="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
								<div
									class={cn('h-full rounded-full transition-all duration-500', scoreBarColor[color])}
									style="width: {org.healthScore}%"
								></div>
							</div>
							<span
								class={cn('w-8 text-right text-xs font-bold tabular-nums', scoreTextColor[color])}
							>
								{org.healthScore}
							</span>
						</div>
					</td>

					<!-- Critique -->
					<td class="px-4 py-3 text-right">
						{#if org.criticalCount > 0}
							<span class="text-sm font-bold text-destructive tabular-nums"
								>{org.criticalCount}</span
							>
						{:else}
							<span class="text-xs text-muted-foreground/40">—</span>
						{/if}
					</td>

					<!-- Urgent -->
					<td class="px-4 py-3 text-right">
						{#if org.urgentCount > 0}
							<span
								class="text-sm font-semibold text-amber-500 tabular-nums dark:text-amber-400"
								>{org.urgentCount}</span
							>
						{:else}
							<span class="text-xs text-muted-foreground/40">—</span>
						{/if}
					</td>

					<!-- Total tâches -->
					<td class="px-4 py-3 text-right">
						{#if org.openTaskCount > 0}
							<span class="text-sm tabular-nums text-foreground">{org.openTaskCount}</span>
						{:else}
							<span class="text-xs text-emerald-600 dark:text-emerald-400">✓</span>
						{/if}
					</td>

					<!-- Flèche -->
					<td class="px-2 py-3">
						<div
							class="flex size-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
						>
							<ArrowRightIcon class="size-3.5" />
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
