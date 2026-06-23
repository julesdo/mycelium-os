<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import ExpenseTable from '$lib/components/expenses/expense-table.svelte';
	import { toast } from 'svelte-sonner';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RouteIcon from '@lucide/svelte/icons/route';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import type { Id } from '$lib/convex/_generated/dataModel.js';
	import TrashIcon from '@lucide/svelte/icons/trash';

	const client = useConvexClient();
	const currentYear = new Date().getFullYear();

	let activeTab = $state<'all' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED'>('all');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const statsQ = useQuery((api as any).expenses.getMyExpenseStats, { year: currentYear });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const expensesQ = useQuery((api as any).expenses.listMyExpenses, {});

	const stats = $derived(statsQ.data);
	const allExpenses = $derived(expensesQ.data ?? []);
	const isLoading = $derived(expensesQ.isLoading);

	const filtered = $derived(
		activeTab === 'all' ? allExpenses : allExpenses.filter((e: { status: string }) => e.status === activeTab)
	);

	const pendingCount = $derived(allExpenses.filter((e: { status: string }) => e.status === 'SUBMITTED').length);

	async function handleDelete(id: string) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).expenses.deleteExpense, { expenseId: id as Id<'mileageExpenses'> });
			toast.success('Note supprimée');
		} catch {
			toast.error('Erreur lors de la suppression');
		}
	}

	const tabs = [
		{ key: 'all' as const,       label: 'Toutes' },
		{ key: 'SUBMITTED' as const, label: 'En attente' },
		{ key: 'APPROVED' as const,  label: 'Approuvées' },
		{ key: 'PAID' as const,      label: 'Payées' },
		{ key: 'REJECTED' as const,  label: 'Rejetées' }
	];
</script>

<div class="flex flex-col gap-5 px-4 pb-24 pt-3 lg:pb-8 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-black tracking-tight">Mes notes de frais IK</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">Indemnités kilométriques — Barème URSSAF {currentYear}</p>
		</div>
		<Button href={resolve(localizedHref('/app/expenses/new'))} class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 shadow-glass-brand">
			<PlusIcon class="size-3.5" />
			<span class="hidden sm:inline">Nouvelle note</span>
			<span class="sm:hidden">+</span>
		</Button>
	</div>

	<!-- KPI cards -->
	{#if statsQ.isLoading}
		<div class="grid gap-3 sm:grid-cols-3">
			{#each Array(3) as _}
				<Skeleton class="h-24 rounded-xl" />
			{/each}
		</div>
	{:else if stats}
		<div class="grid gap-3 sm:grid-cols-3">
			<MetricCard
				label="Total {currentYear}"
				value="{stats.totalAmount.toFixed(2)} €"
				sub="{stats.totalKm} km parcourus"
				icon={RouteIcon}
				accent
			/>
			<MetricCard
				label="En attente"
				value="{stats.pendingAmount.toFixed(2)} €"
				sub="{pendingCount} note{pendingCount > 1 ? 's' : ''} à valider"
				icon={ClockIcon}
			/>
			<MetricCard
				label="Approuvé / Payé"
				value="{stats.approvedAmount.toFixed(2)} €"
				sub="Remboursement acquis"
				icon={CheckCircleIcon}
			/>
		</div>
	{/if}

	<!-- Tabs -->
	<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v as typeof activeTab)}>
		<Tabs.List class="self-start">
			{#each tabs as tab}
				{@const count = tab.key === 'all' ? allExpenses.length : allExpenses.filter((e: { status: string }) => e.status === tab.key).length}
				<Tabs.Trigger value={tab.key} class="gap-1.5">
					{tab.label}
					{#if count > 0}
						<Badge variant="secondary" class="h-4 min-w-4 rounded-full px-1 text-[10px]">{count}</Badge>
					{/if}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>

		{#each tabs as tab}
			<Tabs.Content value={tab.key} class="mt-4">
				{#if isLoading}
					<div class="space-y-2">
						{#each Array(4) as _}
							<Skeleton class="h-14 rounded-xl" />
						{/each}
					</div>
				{:else}
					<ExpenseTable expenses={filtered} isAdmin={false} />
				{/if}
			</Tabs.Content>
		{/each}
	</Tabs.Root>
</div>
