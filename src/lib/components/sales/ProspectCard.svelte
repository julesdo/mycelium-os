<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { Badge } from '$lib/components/ui/badge';

	let { prospect, compact = false }: { prospect: any; compact?: boolean } = $props();

	const STAGE_BADGE: Record<string, string> = {
		discovery: 'bg-muted text-muted-foreground border-border',
		demo: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
		negotiation: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
		won: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
		lost: 'bg-red-500/10 text-red-500 border-red-500/20'
	};

	const STAGE_LABEL: Record<string, string> = {
		discovery: 'Découverte',
		demo: 'Démo',
		negotiation: 'Négociation',
		won: 'Gagné',
		lost: 'Perdu'
	};

	const daysAgo = $derived(Math.floor((Date.now() - prospect.lastActivityAt) / 86400000));
</script>

<a
	href={resolve(localizedHref(`/sales/pipeline/${prospect._id}`))}
	class="relative block min-h-[44px] overflow-hidden rounded-xl border border-border bg-card p-3.5 transition-all hover:border-border/80 hover:shadow-sm"
	style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
>
	<div
		class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
	></div>

	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold">{prospect.companyName}</p>
			{#if !compact}
				<p class="mt-0.5 truncate text-xs text-muted-foreground">{prospect.contactName}</p>
				<p class="mt-1 text-[11px] capitalize text-muted-foreground">
					{prospect.sector} · {prospect.estimatedFleetSize} veh. estimés
				</p>
			{/if}
		</div>
		<Badge class="{STAGE_BADGE[prospect.stage] ?? ''} shrink-0 text-[10px]">
			{STAGE_LABEL[prospect.stage] ?? prospect.stage}
		</Badge>
	</div>

	{#if !compact}
		<div class="mt-2">
			<span class="text-[10px] text-muted-foreground/60">
				{daysAgo === 0 ? "Aujourd'hui" : `Il y a ${daysAgo}j`}
			</span>
		</div>
	{/if}
</a>
