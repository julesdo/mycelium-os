<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import ExpenseTable from '$lib/components/expenses/expense-table.svelte';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import EuroIcon from '@lucide/svelte/icons/euro';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import UsersIcon from '@lucide/svelte/icons/users';
	import SearchIcon from '@lucide/svelte/icons/search';

	const currentYear = new Date().getFullYear();
	let selectedYear = $state(currentYear);
	let activeTab = $state<'all' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED'>('all');
	let searchQuery = $state('');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const statsQ = useQuery((api as any).expenses.getOrgExpenseStats, { year: selectedYear });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const expensesQ = useQuery((api as any).expenses.listOrgExpenses, { year: selectedYear });

	const stats = $derived(statsQ.data);
	const allExpenses = $derived(expensesQ.data ?? []);
	const isLoading = $derived(expensesQ.isLoading);

	const filtered = $derived(
		allExpenses
			.filter((e: { status: string }) => activeTab === 'all' || e.status === activeTab)
			.filter((e: { user?: { name?: string | null; email?: string | null }; purpose: string; departureLocation: string; arrivalLocation: string }) => {
				if (!searchQuery.trim()) return true;
				const q = searchQuery.toLowerCase();
				return (
					(e.user?.name?.toLowerCase().includes(q) ?? false) ||
					(e.user?.email?.toLowerCase().includes(q) ?? false) ||
					e.purpose.toLowerCase().includes(q) ||
					e.departureLocation.toLowerCase().includes(q) ||
					e.arrivalLocation.toLowerCase().includes(q)
				);
			})
	);

	const tabs = [
		{ key: 'all' as const,       label: 'Toutes' },
		{ key: 'SUBMITTED' as const, label: 'En attente' },
		{ key: 'APPROVED' as const,  label: 'Approuvées' },
		{ key: 'PAID' as const,      label: 'Payées' },
		{ key: 'REJECTED' as const,  label: 'Rejetées' }
	];

	const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

	// ── CSV Export ────────────────────────────────────────────────────────────
	function exportCSV() {
		const rows = [
			['Employee', 'Email', 'Date', 'Purpose', 'From', 'To', 'Distance', 'Unit', 'Category', 'Rate', 'Amount', 'Status']
		];

		for (const e of filtered) {
			rows.push([
				e.user?.name ?? '',
				e.user?.email ?? '',
				e.date,
				e.purpose,
				e.departureLocation,
				e.arrivalLocation,
				String(e.distance),
				e.distanceUnit,
				e.vehicleCategory,
				e.ratePerUnit.toFixed(3),
				e.calculatedAmount.toFixed(2),
				e.status
			]);
		}

		const csv = rows.map((r) => r.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(';')).join('\n');
		const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `notes-frais-ik-${selectedYear}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── Uniquify users ────────────────────────────────────────────────────────
	const uniqueUsers = $derived(
		new Set(allExpenses.map((e: { userId: string }) => e.userId)).size
	);
</script>

<div class="flex flex-col gap-5 px-4 pb-8 pt-3 lg:px-6 xl:px-8">

	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-xl font-black tracking-tight">Notes de frais IK</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">Validation et export des indemnités kilométriques</p>
		</div>
		<div class="flex items-center gap-2">
			<!-- Year selector -->
			<div class="flex overflow-hidden rounded-lg border">
				{#each yearOptions as year}
					<button
						type="button"
						onclick={() => (selectedYear = year)}
						class="px-3 py-1.5 text-sm font-medium transition-colors {selectedYear === year ? 'bg-[var(--brand)] text-[var(--brand-foreground)]' : 'text-muted-foreground hover:bg-muted'}"
					>
						{year}
					</button>
				{/each}
			</div>
			<Button onclick={exportCSV} variant="outline" class="gap-2">
				<DownloadIcon class="size-4" />
				<span class="hidden sm:inline">Exporter CSV</span>
			</Button>
		</div>
	</div>

	<!-- KPI cards -->
	{#if statsQ.isLoading}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<Skeleton class="h-24 rounded-xl" />
			{/each}
		</div>
	{:else if stats}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<MetricCard
				label="Total soumis"
				value="{stats.totalAmount.toFixed(2)} €"
				sub="{stats.total} notes · {selectedYear}"
				icon={EuroIcon}
				accent
			/>
			<MetricCard
				label="En attente"
				value="{stats.pendingAmount.toFixed(2)} €"
				sub="{stats.pending} note{stats.pending > 1 ? 's' : ''} à valider"
				icon={ClockIcon}
			/>
			<MetricCard
				label="Approuvées"
				value="{stats.approved + stats.paid} notes"
				sub="dont {stats.paid} payées"
				icon={CheckCircleIcon}
			/>
			<MetricCard
				label="Salariés actifs"
				value="{uniqueUsers}"
				sub="ayant soumis une note"
				icon={UsersIcon}
			/>
		</div>
	{/if}

	<!-- Alert pending -->
	{#if stats && stats.pending > 0}
		<div class="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
			<ClockIcon class="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
			<p class="text-sm font-medium text-amber-700 dark:text-amber-400">
				{stats.pending} note{stats.pending > 1 ? 's' : ''} en attente d'approbation — {stats.pendingAmount.toFixed(2)} € à valider
			</p>
		</div>
	{/if}

	<!-- Filters + tabs -->
	<div class="flex flex-col gap-3">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v as typeof activeTab)} class="flex-1">
				<Tabs.List class="self-start">
					{#each tabs as tab}
						{@const count = tab.key === 'all'
							? allExpenses.length
							: allExpenses.filter((e: { status: string }) => e.status === tab.key).length}
						<Tabs.Trigger value={tab.key} class="gap-1.5">
							{tab.label}
							{#if count > 0}
								<Badge variant="secondary" class="h-4 min-w-4 rounded-full px-1 text-[10px]">{count}</Badge>
							{/if}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</Tabs.Root>

			<div class="relative max-w-xs">
				<SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					bind:value={searchQuery}
					placeholder="Rechercher un salarié…"
					class="pl-9"
				/>
			</div>
		</div>

		{#if isLoading}
			<div class="space-y-2">
				{#each Array(5) as _}
					<Skeleton class="h-14 rounded-xl" />
				{/each}
			</div>
		{:else}
			<ExpenseTable expenses={filtered} isAdmin={true} />
		{/if}
	</div>

	<!-- CSV format info -->
	<p class="text-xs text-muted-foreground">
		Export CSV compatible Silae / Sage — colonnes : Salarié ; Email ; Date ; Objet ; Départ ; Arrivée ; KM ; CV ; Montant (€) ; Statut
	</p>
</div>
