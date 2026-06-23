<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import FinancialKPIs from '$lib/components/finance/FinancialKPIs.svelte';
	import CategoryBreakdown from '$lib/components/finance/CategoryBreakdown.svelte';
	import VehicleCostsTable from '$lib/components/finance/VehicleCostsTable.svelte';
	import PeriodSelector from '$lib/components/finance/PeriodSelector.svelte';
	import {
		periodToRange,
		prevPeriodRange,
		type FinancePeriod
	} from '$lib/components/finance/period-utils.js';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import ExportModal from '$lib/components/finance/ExportModal.svelte';
	import FuelIcon from '@lucide/svelte/icons/fuel';
	import ReceiptIcon from '@lucide/svelte/icons/landmark';

	// ── URL param helpers ────────────────────────────────────────────────────────

	function readPeriod(): FinancePeriod {
		const p = page.url.searchParams.get('period');
		if (p === 'month' || p === 'quarter' || p === 'year' || p === 'custom') return p;
		return 'month';
	}

	function updateURL(p: FinancePeriod, from: string, to: string) {
		const url = new URL(page.url);
		url.searchParams.set('period', p);
		if (p === 'custom' && from) url.searchParams.set('from', from);
		else url.searchParams.delete('from');
		if (p === 'custom' && to) url.searchParams.set('to', to);
		else url.searchParams.delete('to');
		goto(resolve(url.pathname + url.search), { noScroll: true, replaceState: true });
	}

	// ── Reactive filter state ────────────────────────────────────────────────────

	let period = $state<FinancePeriod>(readPeriod());
	let customFrom = $state(page.url.searchParams.get('from') ?? '');
	let customTo = $state(page.url.searchParams.get('to') ?? '');

	$effect(() => {
		period = readPeriod();
		customFrom = page.url.searchParams.get('from') ?? '';
		customTo = page.url.searchParams.get('to') ?? '';
	});

	// ── Computed date ranges ─────────────────────────────────────────────────────

	const kpiArgs = $state<{
		fromDate: number;
		toDate: number;
		prevFromDate: number;
		prevToDate: number;
	}>({
		fromDate: 0,
		toDate: 0,
		prevFromDate: 0,
		prevToDate: 0
	});

	const rangeArgs = $state<{ fromDate?: number; toDate?: number }>({});

	$effect(() => {
		const curr = periodToRange(period, customFrom, customTo);
		const prev = prevPeriodRange(period, customFrom, customTo);
		kpiArgs.fromDate = curr.from;
		kpiArgs.toDate = curr.to;
		kpiArgs.prevFromDate = prev.from;
		kpiArgs.prevToDate = prev.to;
		rangeArgs.fromDate = curr.from;
		rangeArgs.toDate = curr.to;
	});

	// ── Convex queries ───────────────────────────────────────────────────────────

	const kpisQ = useQuery((api as any).costs.getFinancialKPIs, kpiArgs);

	const byCategoryQ = useQuery((api as any).costs.getCostsByCategory, rangeArgs);

	const byVehicleQ = useQuery((api as any).costs.getCostsByVehicle, rangeArgs);

	const vehiclesQ = useQuery((api as any).vehicles.listVehicles, {});

	// ── Derived ──────────────────────────────────────────────────────────────────

	const isLoading = $derived(kpisQ.isLoading || byCategoryQ.isLoading || byVehicleQ.isLoading);

	// ── Handlers ─────────────────────────────────────────────────────────────────

	function handlePeriodChange(p: FinancePeriod) {
		period = p;
		updateURL(p, customFrom, customTo);
	}

	function handleCustomRangeChange(from: string, to: string) {
		customFrom = from;
		customTo = to;
		updateURL(period, from, to);
	}

	let showExportModal = $state(false);
	let exportFormat = $state<'excel' | 'csv' | 'pdf'>('excel');

	function openExport(fmt: 'excel' | 'csv' | 'pdf') {
		exportFormat = fmt;
		showExportModal = true;
	}

	const lang = $derived(page.params.lang as string | undefined);

	function goToDetail() {
		const path = lang ? `/${lang}/admin/finance/costs` : '/admin/finance/costs';
		goto(resolve(path));
	}

	function goToFuelImport() {
		const path = lang ? `/${lang}/admin/finance/fuel-import` : '/admin/finance/fuel-import';
		goto(resolve(path));
	}

	function goToFiscal() {
		const path = lang ? `/${lang}/admin/finance/fiscal` : '/admin/finance/fiscal';
		goto(resolve(path));
	}
</script>

<SEOHead title="Finance — Mycelium Fleet" description="Reporting financier de votre flotte" />

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8">
	<!-- Header -->
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-base font-semibold">Finance</h1>
			<p class="text-xs text-muted-foreground">Suivi des coûts de votre flotte</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<PeriodSelector
				{period}
				{customFrom}
				{customTo}
				onPeriodChange={handlePeriodChange}
				onCustomRangeChange={handleCustomRangeChange}
			/>

			<!-- Export dropdown -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="gap-1.5">
							<DownloadIcon class="size-4" />
							Exporter
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-44">
					<DropdownMenu.Item class="cursor-pointer gap-2" onclick={() => openExport('excel')}>
						<FileSpreadsheetIcon class="size-4 text-emerald-600" />
						Excel (.xlsx)
					</DropdownMenu.Item>
					<DropdownMenu.Item class="cursor-pointer gap-2" onclick={() => openExport('csv')}>
						<FileTextIcon class="size-4 text-blue-500" />
						CSV
					</DropdownMenu.Item>
					<DropdownMenu.Item class="cursor-pointer gap-2" onclick={() => openExport('pdf')}>
						<FileTextIcon class="size-4 text-red-500" />
						PDF
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Button variant="outline" size="sm" onclick={goToFuelImport} class="gap-1.5">
				<FuelIcon class="size-4" />
				Import Carburant
			</Button>
			<Button variant="outline" size="sm" onclick={goToFiscal} class="gap-1.5">
				<ReceiptIcon class="size-4" />
				Bilan fiscal
			</Button>
			<Button variant="ghost" size="sm" onclick={goToDetail} class="gap-1.5 text-muted-foreground">
				Voir tous les coûts →
			</Button>
		</div>
	</div>

	<!-- KPI cards -->
	<FinancialKPIs kpis={kpisQ.data} loading={kpisQ.isLoading} />

	<!-- Charts row -->
	<div class="grid grid-cols-1 gap-4 @4xl/main:grid-cols-12">
		<!-- Category breakdown — 5/12 -->
		<div class="@container rounded-lg border border-border bg-card p-4 @4xl/main:col-span-5">
			<h2 class="mb-4 text-sm font-medium text-muted-foreground">Répartition par catégorie</h2>
			<CategoryBreakdown data={byCategoryQ.data} loading={byCategoryQ.isLoading} />
		</div>

		<!-- Vehicle costs table — 7/12 -->
		<div class="@container rounded-lg border border-border bg-card p-4 @4xl/main:col-span-7">
			<h2 class="mb-4 text-sm font-medium text-muted-foreground">Coûts par véhicule</h2>
			<VehicleCostsTable
				rows={byVehicleQ.data}
				vehicles={vehiclesQ.data}
				loading={byVehicleQ.isLoading || vehiclesQ.isLoading}
			/>
		</div>
	</div>

	{#if !isLoading && (kpisQ.data?.totalCurrent === 0 || kpisQ.data === undefined)}
		<!-- Empty state hint -->
		<div
			class="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
		>
			Aucun coût enregistré sur cette période.
			<br />
			<button
				type="button"
				onclick={goToDetail}
				class="mt-1 underline underline-offset-2 transition-colors hover:text-foreground"
			>
				Ajouter des coûts →
			</button>
		</div>
	{/if}
</div>

<ExportModal
	bind:open={showExportModal}
	onOpenChange={(v) => (showExportModal = v)}
	vehicles={vehiclesQ.data}
	fromDate={kpiArgs.fromDate}
	toDate={kpiArgs.toDate}
	initialFormat={exportFormat}
/>
