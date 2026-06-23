<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import BadgeIcon from '@lucide/svelte/icons/badge-pound-sterling';
	import CarIcon from '@lucide/svelte/icons/car';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import InfoIcon from '@lucide/svelte/icons/info';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	import type { BikTaxYear } from '$lib/convex/bikRates.js';

	const TAX_YEARS: { value: BikTaxYear; label: string }[] = [
		{ value: '2024-25', label: '2024/25' },
		{ value: '2025-26', label: '2025/26' },
		{ value: '2026-27', label: '2026/27' },
		{ value: '2027-28', label: '2027/28' }
	];

	const client = useConvexClient();
	const lang = $derived(page.params.lang as string | undefined);

	// ── Tax year from URL ─────────────────────────────────────────────────────────
	let taxYear = $state<BikTaxYear>(
		(page.url.searchParams.get('year') as BikTaxYear | null) ?? '2025-26'
	);

	$effect(() => {
		taxYear = (page.url.searchParams.get('year') as BikTaxYear | null) ?? '2025-26';
	});

	function setYear(y: BikTaxYear) {
		taxYear = y;
		const url = new URL(page.url);
		url.searchParams.set('year', y);
		goto(resolve(url.pathname + url.search), { noScroll: true, replaceState: true });
	}

	// ── Data ──────────────────────────────────────────────────────────────────────
	const reportQuery = $derived(useQuery(api.bik.getFleetBikReport, { taxYear }));
	const report = $derived(reportQuery.data);
	const loading = $derived(reportQuery.isLoading);

	// ── P11D edit dialog ──────────────────────────────────────────────────────────
	let editTarget = $state<{
		_id: string;
		registration: string;
		model: string;
		p11dValue: number | null;
		electricRangeMiles: number | null;
		energy: string;
	} | null>(null);
	let editP11d = $state('');
	let editRange = $state('');
	let saving = $state(false);

	function openEdit(row: typeof editTarget) {
		editTarget = row;
		editP11d = row?.p11dValue != null ? String(row.p11dValue) : '';
		editRange = row?.electricRangeMiles != null ? String(row.electricRangeMiles) : '';
	}

	async function saveEdit() {
		if (!editTarget) return;
		saving = true;
		try {
			const p11dNum = editP11d ? Number(editP11d) : undefined;
			const rangeNum = editRange ? Number(editRange) : undefined;
			await client.mutation(api.bik.setVehicleP11d, {
				vehicleId: editTarget._id as any,
				p11dValue: p11dNum,
				electricRangeMiles: rangeNum
			});
			toast.success(`P11D updated for ${editTarget.registration}`);
			editTarget = null;
		} catch {
			toast.error('Failed to save');
		} finally {
			saving = false;
		}
	}

	// ── Format helpers ────────────────────────────────────────────────────────────
	function fmt(n: number | null | undefined, decimals = 0) {
		if (n == null) return '—';
		return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
	}

	function fmtPct(n: number | null | undefined) {
		if (n == null) return '—';
		return n + '%';
	}

	const energyLabel: Record<string, string> = {
		ELECTRIC: 'Electric',
		HYBRID: 'PHEV',
		THERMAL: 'Petrol/Diesel'
	};

	const energyColor: Record<string, string> = {
		ELECTRIC: 'text-emerald-600 dark:text-emerald-400',
		HYBRID: 'text-sky-600 dark:text-sky-400',
		THERMAL: 'text-muted-foreground'
	};
</script>

<SEOHead title="BiK UK — Fleet OS" description="Benefit in Kind calculations for your UK fleet" />

<div class="flex flex-col gap-6 p-6">

	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-xl font-semibold tracking-tight">Benefit in Kind (BiK)</h1>
			<p class="text-muted-foreground mt-0.5 text-sm">
				HMRC company car tax liabilities for your fleet
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Select.Root
				type="single"
				value={taxYear}
				onValueChange={(v) => v && setYear(v as BikTaxYear)}
			>
				<Select.Trigger class="w-[110px]">
					{TAX_YEARS.find((y) => y.value === taxYear)?.label ?? 'Tax Year'}
				</Select.Trigger>
				<Select.Content>
					{#each TAX_YEARS as y}
						<Select.Item value={y.value}>{y.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<a
				href="https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026"
				target="_blank"
				rel="noopener"
				class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
			>
				HMRC rates <ExternalLinkIcon class="size-3" />
			</a>
		</div>
	</div>

	<!-- Missing data banner -->
	{#if !loading && (report?.summary.missingP11dCount ?? 0) > 0}
		<div class="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
			<AlertTriangleIcon class="size-4 shrink-0 text-amber-500" />
			<p class="text-sm text-amber-700 dark:text-amber-400">
				<strong>{report!.summary.missingP11dCount} vehicle{report!.summary.missingP11dCount > 1 ? 's' : ''}</strong>
				{report!.summary.missingP11dCount > 1 ? 'are' : 'is'} missing P11D value or CO2 data —
				click <strong>Edit</strong> in the table to add them.
			</p>
		</div>
	{/if}

	<!-- KPI cards -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#if loading}
			{#each { length: 4 } as _}
				<Skeleton class="h-28 rounded-3xl" />
			{/each}
		{:else}
			<MetricCard
				label="Total BiK Value"
				value={fmt(report?.summary.totalBikValue)}
				description="P11D × BiK rate, all vehicles"
			/>
			<MetricCard
				label="Employer NIC (13.8%)"
				value={fmt(report?.summary.totalEmployerNic)}
				variant="destructive"
				description="Class 1A payable July"
			/>
			<MetricCard
				label="Employee Tax (basic)"
				value={fmt(report?.summary.totalEmployeeBasicTax)}
				description="At 20% — individual may differ"
			/>
			<MetricCard
				label="Electric Fleet"
				value="{report?.summary.electricPct ?? 0}%"
				variant={(report?.summary.electricPct ?? 0) >= 50 ? 'accent' : 'default'}
				description="{report?.summary.electricCount ?? 0} of {report?.summary.totalVehicles ?? 0} vehicles"
			/>
		{/if}
	</div>

	<!-- EV opportunities -->
	{#if !loading && (report?.evOpportunities.length ?? 0) > 0}
		<div class="rounded-2xl border bg-card p-4">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"></div>
			<div class="mb-3 flex items-center gap-2">
				<ZapIcon class="size-4 text-emerald-500" />
				<span class="text-sm font-medium">EV Conversion Opportunities</span>
				<span class="text-muted-foreground ml-auto text-xs">Potential NIC savings per year</span>
			</div>
			<div class="flex flex-col gap-2">
				{#each report!.evOpportunities as opp}
					<div class="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
						<div>
							<span class="text-sm font-medium">{opp.registration}</span>
							<span class="text-muted-foreground ml-2 text-xs">{opp.model}</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-muted-foreground text-xs">{opp.currentBikRate}% → {opp.evBikRate}%</span>
							<span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
								save {fmt(opp.nicSavingPerYear)}/yr
							</span>
						</div>
					</div>
				{/each}
				{#if (report?.summary.potentialNicSaving ?? 0) > 0}
					<p class="text-muted-foreground mt-1 text-xs">
						Total fleet-wide NIC saving if all non-EV converted:
						<strong class="text-emerald-600 dark:text-emerald-400">{fmt(report!.summary.potentialNicSaving)}/yr</strong>
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Vehicle table -->
	<div class="rounded-2xl border bg-card overflow-hidden">
		<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"></div>
		<div class="flex items-center justify-between border-b px-4 py-3">
			<span class="text-sm font-medium">Fleet BiK Breakdown — {TAX_YEARS.find(y => y.value === taxYear)?.label}</span>
			<span class="text-muted-foreground text-xs">
				{report?.summary.vehiclesWithP11d ?? 0} / {report?.summary.totalVehicles ?? 0} vehicles with P11D data
			</span>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b">
						<th class="text-muted-foreground px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide">Vehicle</th>
						<th class="text-muted-foreground px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide">Fuel</th>
						<th class="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">CO2</th>
						<th class="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">P11D</th>
						<th class="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">BiK %</th>
						<th class="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">BiK Value</th>
						<th class="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">Employee Tax</th>
						<th class="text-muted-foreground px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">Employer NIC</th>
						<th class="px-3 py-2.5"></th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						{#each { length: 6 } as _}
							<tr class="border-b">
								{#each { length: 9 } as _}
									<td class="px-4 py-3"><Skeleton class="h-4 w-full" /></td>
								{/each}
							</tr>
						{/each}
					{:else if !report?.vehicles.length}
						<tr>
							<td colspan="9" class="text-muted-foreground px-4 py-12 text-center text-sm">
								No vehicles found in your fleet.
							</td>
						</tr>
					{:else}
						{#each report.vehicles as row}
							<tr class="border-b last:border-0 hover:bg-muted/30 transition-colors">
								<td class="px-4 py-3">
									<div class="font-medium">{row.registration}</div>
									<div class="text-muted-foreground text-xs">{row.brand} {row.model}</div>
								</td>
								<td class="px-3 py-3">
									<span class="text-xs font-medium {energyColor[row.energy] ?? ''}">
										{energyLabel[row.energy] ?? row.energy}
									</span>
								</td>
								<td class="px-3 py-3 text-right">
									{#if row.co2Gkm != null}
										<span class="font-mono text-xs">{row.co2Gkm} g/km</span>
									{:else}
										<span class="text-muted-foreground text-xs">—</span>
									{/if}
								</td>
								<td class="px-3 py-3 text-right">
									{#if row.p11dValue != null}
										<span class="font-mono text-xs">{fmt(row.p11dValue)}</span>
									{:else}
										<span class="text-amber-500 text-xs font-medium">Missing</span>
									{/if}
								</td>
								<td class="px-3 py-3 text-right">
									{#if row.bikRate != null}
										<span class="font-mono text-xs font-semibold">{fmtPct(row.bikRate)}</span>
									{:else}
										<span class="text-muted-foreground text-xs">—</span>
									{/if}
								</td>
								<td class="px-3 py-3 text-right font-mono text-xs">{fmt(row.bikValue)}</td>
								<td class="px-3 py-3 text-right font-mono text-xs">{fmt(row.employeeBasicTax)}</td>
								<td class="px-3 py-3 text-right font-mono text-xs">
									{#if row.employerNic != null}
										<span class={row.employerNic > 500 ? 'text-destructive font-semibold' : ''}>
											{fmt(row.employerNic)}
										</span>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</td>
								<td class="px-3 py-3">
									<Button
										variant="ghost"
										size="icon"
										class="size-7"
										onclick={() => openEdit({
											_id: row._id as string,
											registration: row.registration,
											model: `${row.brand} ${row.model}`,
											p11dValue: row.p11dValue,
											electricRangeMiles: row.electricRangeMiles,
											energy: row.energy
										})}
									>
										<PencilIcon class="size-3.5" />
									</Button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
				{#if !loading && report && report.vehicles.length > 0}
					<tfoot>
						<tr class="bg-muted/20 border-t">
							<td colspan="5" class="px-4 py-2.5 text-xs font-medium">Total</td>
							<td class="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmt(report.summary.totalBikValue)}</td>
							<td class="px-3 py-2.5 text-right font-mono text-xs font-semibold">{fmt(report.summary.totalEmployeeBasicTax)}</td>
							<td class="px-3 py-2.5 text-right font-mono text-xs font-semibold text-destructive">{fmt(report.summary.totalEmployerNic)}</td>
							<td></td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>
	</div>

	<!-- HMRC info footer -->
	<div class="flex items-start gap-2 rounded-xl border border-dashed px-4 py-3">
		<InfoIcon class="text-muted-foreground mt-0.5 size-4 shrink-0" />
		<p class="text-muted-foreground text-xs leading-relaxed">
			<strong class="text-foreground">How BiK works:</strong> The P11D value (HMRC list price) × BiK %
			= taxable benefit. Employees pay income tax on this amount; employers pay Class 1A NIC (13.8%)
			by 19 July each year. Electric vehicles attract only {taxYear === '2024-25' ? '2%' : taxYear === '2025-26' ? '3%' : taxYear === '2026-27' ? '4%' : '5%'}
			BiK in {TAX_YEARS.find(y => y.value === taxYear)?.label}.
			Diesel cars incur a +4% surcharge unless RDE2-compliant.
		</p>
	</div>
</div>

<!-- P11D Edit dialog -->
<Dialog.Root open={editTarget !== null} onOpenChange={(o) => { if (!o) editTarget = null; }}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Edit P11D Data</Dialog.Title>
			<Dialog.Description>
				{editTarget?.registration} — {editTarget?.model}
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-4 py-2">
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="p11d-input">P11D Value (£)</label>
				<Input
					id="p11d-input"
					type="number"
					min="0"
					placeholder="e.g. 35000"
					bind:value={editP11d}
				/>
				<p class="text-muted-foreground text-xs">
					HMRC list price including options, VAT — excluding road tax & registration fee.
				</p>
			</div>
			{#if editTarget?.energy === 'HYBRID'}
				<div class="flex flex-col gap-1.5">
					<label class="text-xs font-medium" for="range-input">Electric Range (miles)</label>
					<Input
						id="range-input"
						type="number"
						min="0"
						placeholder="e.g. 45"
						bind:value={editRange}
					/>
					<p class="text-muted-foreground text-xs">
						WLTP electric-only range — determines PHEV BiK band.
					</p>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => { editTarget = null; }}>Cancel</Button>
			<Button onclick={saveEdit} disabled={saving || !editP11d}>
				{#if saving}Saving…{:else}<CheckIcon class="size-4 mr-1.5" />Save{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
