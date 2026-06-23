<script lang="ts">
	import type { ComplianceStatusWidget } from './types.js';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	let { data }: { data: ComplianceStatusWidget } = $props();

	const hasIssues = $derived(
		data.leaseExpired.length > 0 || data.leaseExpiring.length > 0 || data.maintenanceDue.filter((m) => m.isOverdue).length > 0
	);
</script>

<div class="flex flex-col gap-2">
	<!-- Summary header -->
	<div class="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 shadow-glass-card {hasIssues ? 'border-amber-200/60 dark:border-amber-900/30' : 'border-border'}">
		{#if hasIssues}
			<ShieldAlertIcon class="size-5 shrink-0 text-amber-500" />
		{:else}
			<ShieldCheckIcon class="size-5 shrink-0 text-emerald-500" />
		{/if}
		<div>
			<p class="text-sm font-semibold">
				{hasIssues ? 'Points de conformité à traiter' : 'Flotte conforme'}
			</p>
			<p class="text-[11px] text-muted-foreground">Fenêtre : {data.daysAhead} jours</p>
		</div>
	</div>

	<!-- Lease expired -->
	{#if data.leaseExpired.length > 0}
		<div class="flex flex-col gap-1 rounded-xl border border-red-200/50 bg-red-50/50 px-3 py-2.5 dark:border-red-900/30 dark:bg-red-950/20">
			<p class="mb-1 text-[11px] font-semibold text-red-600 dark:text-red-400">Leasing expiré ({data.leaseExpired.length})</p>
			{#each data.leaseExpired.slice(0, 3) as v}
				<div class="flex items-center justify-between gap-2">
					<p class="min-w-0 truncate text-xs">{v.label}</p>
					<span class="shrink-0 text-[11px] font-semibold text-red-500">+{v.daysOverdue}j</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Lease expiring -->
	{#if data.leaseExpiring.length > 0}
		<div class="flex flex-col gap-1 rounded-xl border border-amber-200/50 bg-amber-50/50 px-3 py-2.5 dark:border-amber-900/30 dark:bg-amber-950/20">
			<p class="mb-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">Leasing expirant ({data.leaseExpiring.length})</p>
			{#each data.leaseExpiring.slice(0, 3) as v}
				<div class="flex items-center justify-between gap-2">
					<p class="min-w-0 truncate text-xs">{v.label}</p>
					<span class="shrink-0 text-[11px] text-amber-600 dark:text-amber-400">dans {v.daysLeft}j</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Maintenance overdue -->
	{#if data.maintenanceDue.filter((m) => m.isOverdue).length > 0}
		<div class="flex flex-col gap-1 rounded-xl border border-orange-200/50 bg-orange-50/50 px-3 py-2.5 dark:border-orange-900/30 dark:bg-orange-950/20">
			<p class="mb-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400">Maintenance en retard</p>
			{#each data.maintenanceDue.filter((m) => m.isOverdue).slice(0, 3) as v}
				<div class="flex items-center justify-between gap-2">
					<p class="min-w-0 truncate text-xs">{v.label}</p>
					<span class="shrink-0 text-[11px] text-orange-600 dark:text-orange-400">{v.daysLeft}j</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
