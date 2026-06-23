<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import { resolve } from '$app/paths';

	const lang = $derived(page.params.lang as string | undefined);
	const year = $derived(Number(page.url.searchParams.get('year') ?? new Date().getFullYear() - 1));

	const reportQ = $derived(useQuery(api.carbon.calculateCsrdReport, { year }));
	const r = $derived(reportQ.data);

	function fmt(n: number | null | undefined, dec = 3) {
		if (n == null) return '—';
		return n.toLocaleString('en-GB', { minimumFractionDigits: dec, maximumFractionDigits: dec });
	}
	function fmtNum(n: number | null | undefined) {
		if (n == null) return '—';
		return n.toLocaleString('en-GB');
	}

	const GHG_CAT_LABELS: Record<number, string> = {
		1: 'Cat. 1 — Purchased goods & services',
		3: 'Cat. 3 — Fuel & energy-related activities (WTT)',
		4: 'Cat. 4 — Upstream leased assets',
		12: 'Cat. 12 — End-of-life treatment'
	};
</script>

<svelte:head>
	<title>ESRS E1 — GHG Report {year}</title>
	<style>
		@media print {
			.no-print { display: none !important; }
			body { background: white !important; color: black !important; }
			.print-page { padding: 0 !important; }
		}
	</style>
</svelte:head>

<!-- Toolbar (hidden in print) -->
<div class="no-print flex items-center gap-3 border-b px-6 py-3">
	<a href={resolve(`/${lang}/admin/sustainability`)} class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm">
		<ArrowLeftIcon class="size-4" /> Back
	</a>
	<span class="text-muted-foreground text-sm">ESRS E1 Report — {year}</span>
	<Button class="ml-auto" size="sm" onclick={() => window.print()}>
		<PrinterIcon class="mr-2 size-4" /> Export PDF
	</Button>
</div>

{#if reportQ.isLoading}
	<div class="flex flex-col gap-4 p-8">
		{#each { length: 6 } as _}<Skeleton class="h-8 w-full" />{/each}
	</div>
{:else if r}
<!-- ══ ESRS E1 REPORT — print-optimised ══════════════════════════════════════ -->
<div class="print-page mx-auto max-w-4xl px-8 py-10 font-sans text-[13px] text-gray-900">

	<!-- Cover -->
	<div class="mb-10 border-b border-gray-200 pb-8">
		<div class="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
			CSRD · ESRS E1 — Climate Change
		</div>
		<h1 class="text-3xl font-bold tracking-tight text-gray-900">
			GHG Emissions Report
		</h1>
		<p class="mt-1 text-base text-gray-500">{r.orgName} · Reporting period {r.reportingPeriod}</p>

		<div class="mt-6 grid grid-cols-3 gap-4 text-xs">
			<div><span class="font-semibold">Standard</span><br />{r.methodology}</div>
			<div><span class="font-semibold">Country</span><br />{r.country}</div>
			<div><span class="font-semibold">Emission factors</span><br />{r.emissionFactorSources}</div>
			<div><span class="font-semibold">Data quality</span><br />
				<span class={r.dataQuality === 'MEASURED' ? 'text-emerald-700' : 'text-amber-600'}>
					{r.dataQuality === 'MEASURED' ? 'Measured (fuel import)' : 'Estimated (from spend)'}
				</span>
			</div>
			<div><span class="font-semibold">Generated</span><br />{new Date(r.generatedAt).toLocaleDateString('en-GB')}</div>
		</div>
	</div>

	<!-- E1-5: Energy consumption -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">ESRS E1-5 — Energy Consumption</h2>
		<table class="w-full border-collapse text-xs">
			<thead>
				<tr class="border-b border-gray-300 bg-gray-50">
					<th class="py-2 pr-4 text-left font-semibold">Metric</th>
					<th class="py-2 text-right font-semibold">Value</th>
					<th class="py-2 pl-4 text-right font-semibold">Unit</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b border-gray-100">
					<td class="py-1.5 pr-4">Total fuel consumed (ICE/PHEV fleet)</td>
					<td class="py-1.5 text-right font-mono">{fmtNum(r.energy.totalFuelLitres)}</td>
					<td class="py-1.5 pl-4 text-right text-gray-500">litres</td>
				</tr>
				<tr class="border-b border-gray-100">
					<td class="py-1.5 pr-4">Total electricity consumed (EV fleet)</td>
					<td class="py-1.5 text-right font-mono">{fmtNum(r.energy.totalEnergyKwh)}</td>
					<td class="py-1.5 pl-4 text-right text-gray-500">kWh</td>
				</tr>
				<tr class="border-b border-gray-100">
					<td class="py-1.5 pr-4">Renewable / zero-emission vehicles (share)</td>
					<td class="py-1.5 text-right font-mono">{r.energy.renewableEnergyPct}</td>
					<td class="py-1.5 pl-4 text-right text-gray-500">%</td>
				</tr>
				<tr class="border-b border-gray-100">
					<td class="py-1.5 pr-4">Total energy spend</td>
					<td class="py-1.5 text-right font-mono">{fmtNum(r.energy.totalFuelSpend)}</td>
					<td class="py-1.5 pl-4 text-right text-gray-500">{r.currency}</td>
				</tr>
			</tbody>
		</table>
	</section>

	<!-- E1-6: GHG emissions summary -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">ESRS E1-6 — GHG Emissions (tCO₂e)</h2>
		<table class="w-full border-collapse text-xs">
			<thead>
				<tr class="border-b border-gray-300 bg-gray-50">
					<th class="py-2 pr-4 text-left font-semibold">Scope</th>
					<th class="py-2 text-left font-semibold">Description</th>
					<th class="py-2 text-right font-semibold">tCO₂e</th>
					<th class="py-2 pl-4 text-right font-semibold">%</th>
				</tr>
			</thead>
			<tbody>
				{#each [
					{ label: 'Scope 1', desc: 'Direct — combustion in company vehicles', val: r.emissions.scope1.total },
					{ label: 'Scope 2', desc: 'Indirect — electricity (location-based)', val: r.emissions.scope2.total },
					{ label: 'Scope 3', desc: 'Value chain (spend-based + WTT)', val: r.emissions.scope3.total }
				] as row}
					<tr class="border-b border-gray-100">
						<td class="py-1.5 pr-4 font-semibold">{row.label}</td>
						<td class="py-1.5 text-gray-600">{row.desc}</td>
						<td class="py-1.5 text-right font-mono font-semibold">{fmt(row.val)}</td>
						<td class="py-1.5 pl-4 text-right text-gray-500">
							{r.emissions.total > 0 ? Math.round((row.val / r.emissions.total) * 100) : 0}%
						</td>
					</tr>
				{/each}
				<tr class="border-t-2 border-gray-300 bg-gray-50 font-bold">
					<td class="py-2 pr-4">Total</td>
					<td class="py-2 text-gray-600">Gross GHG emissions</td>
					<td class="py-2 text-right font-mono">{fmt(r.emissions.total)}</td>
					<td class="py-2 pl-4 text-right">100%</td>
				</tr>
				<tr class="border-b border-gray-100">
					<td class="py-1.5 pr-4 text-gray-500">Intensity</td>
					<td class="py-1.5 text-gray-500">tCO₂e per vehicle in fleet</td>
					<td class="py-1.5 text-right font-mono">{fmt(r.emissions.intensityPerVehicle)}</td>
					<td class="py-1.5 pl-4"></td>
				</tr>
			</tbody>
		</table>
	</section>

	<!-- Scope 1 — per vehicle -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Scope 1 Detail — Per Vehicle</h2>
		<table class="w-full border-collapse text-xs">
			<thead>
				<tr class="border-b border-gray-300 bg-gray-50">
					<th class="py-2 pr-3 text-left font-semibold">Reg.</th>
					<th class="py-2 pr-3 text-left font-semibold">Vehicle</th>
					<th class="py-2 pr-3 text-left font-semibold">Fuel</th>
					<th class="py-2 text-right font-semibold">Litres</th>
					<th class="py-2 pl-3 text-right font-semibold">tCO₂e</th>
				</tr>
			</thead>
			<tbody>
				{#each r.emissions.scope1.vehicles as v}
					<tr class="border-b border-gray-100">
						<td class="py-1 pr-3 font-mono">{v.registration}</td>
						<td class="py-1 pr-3 text-gray-600">{v.brand} {v.model}</td>
						<td class="py-1 pr-3">{v.fuelType}</td>
						<td class="py-1 text-right font-mono">{fmtNum(v.litersConsumed)}</td>
						<td class="py-1 pl-3 text-right font-mono font-semibold">{fmt(v.tco2e)}</td>
					</tr>
				{/each}
				{#if r.emissions.scope1.vehicles.length === 0}
					<tr><td colspan="5" class="py-2 text-center text-gray-400">No Scope 1 emissions recorded</td></tr>
				{/if}
			</tbody>
		</table>
	</section>

	<!-- Scope 2 — EV vehicles -->
	{#if r.emissions.scope2.vehicles.length > 0}
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Scope 2 Detail — Electric Vehicles</h2>
		<table class="w-full border-collapse text-xs">
			<thead>
				<tr class="border-b border-gray-300 bg-gray-50">
					<th class="py-2 pr-3 text-left font-semibold">Reg.</th>
					<th class="py-2 pr-3 text-left font-semibold">Vehicle</th>
					<th class="py-2 text-right font-semibold">kWh</th>
					<th class="py-2 pl-3 text-right font-semibold">tCO₂e (location)</th>
				</tr>
			</thead>
			<tbody>
				{#each r.emissions.scope2.vehicles as v}
					<tr class="border-b border-gray-100">
						<td class="py-1 pr-3 font-mono">{v.registration}</td>
						<td class="py-1 pr-3 text-gray-600">{v.brand} {v.model}</td>
						<td class="py-1 text-right font-mono">{fmtNum(v.kwh)}</td>
						<td class="py-1 pl-3 text-right font-mono font-semibold">{fmt(v.tco2e)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="mt-1 text-[10px] text-gray-400">
			Market-based Scope 2 not reported — no energy attribute certificates (EACs) on file.
		</p>
	</section>
	{/if}

	<!-- Scope 3 — breakdown -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Scope 3 Detail — Value Chain</h2>
		<table class="w-full border-collapse text-xs">
			<thead>
				<tr class="border-b border-gray-300 bg-gray-50">
					<th class="py-2 pr-4 text-left font-semibold">GHG Category</th>
					<th class="py-2 pr-4 text-left font-semibold">Description</th>
					<th class="py-2 text-right font-semibold">Spend ({r.currency})</th>
					<th class="py-2 pl-3 text-right font-semibold">tCO₂e</th>
				</tr>
			</thead>
			<tbody>
				{#each r.emissions.scope3.breakdown as entry}
					<tr class="border-b border-gray-100">
						<td class="py-1 pr-4 text-gray-500">{GHG_CAT_LABELS[entry.ghgCategory] ?? `Cat. ${entry.ghgCategory}`}</td>
						<td class="py-1 pr-4">{entry.description}</td>
						<td class="py-1 text-right font-mono">{entry.amountSpent > 0 ? fmtNum(Math.round(entry.amountSpent)) : '—'}</td>
						<td class="py-1 pl-3 text-right font-mono font-semibold">{fmt(entry.tco2e)}</td>
					</tr>
				{/each}
				{#if r.emissions.scope3.breakdown.length === 0}
					<tr><td colspan="4" class="py-2 text-center text-gray-400">No Scope 3 cost data available for this year</td></tr>
				{/if}
			</tbody>
		</table>
		<p class="mt-1 text-[10px] text-gray-400">
			Scope 3 calculated using spend-based emission factors (DEFRA EE Factors 2024). Methodology: GHG Protocol Corporate Value Chain Standard.
		</p>
	</section>

	<!-- Fleet composition -->
	<section class="mb-8">
		<h2 class="mb-3 text-sm font-bold uppercase tracking-widest text-gray-400">Fleet Composition</h2>
		<div class="grid grid-cols-4 gap-4 text-xs">
			<div class="rounded border border-gray-200 p-3">
				<div class="text-2xl font-bold">{r.fleet.total}</div>
				<div class="text-gray-500">Total vehicles</div>
			</div>
			<div class="rounded border border-gray-200 p-3">
				<div class="text-2xl font-bold text-emerald-700">{r.fleet.electric}</div>
				<div class="text-gray-500">Electric (BEV)</div>
			</div>
			<div class="rounded border border-gray-200 p-3">
				<div class="text-2xl font-bold text-sky-700">{r.fleet.hybrid}</div>
				<div class="text-gray-500">Hybrid (PHEV)</div>
			</div>
			<div class="rounded border border-gray-200 p-3">
				<div class="text-2xl font-bold">{r.fleet.thermal}</div>
				<div class="text-gray-500">ICE</div>
			</div>
		</div>
	</section>

	<!-- Disclaimers -->
	<section class="border-t border-gray-200 pt-4 text-[10px] text-gray-400">
		<p class="mb-1 font-semibold">Limitations & disclosures</p>
		<ul class="list-disc pl-4 space-y-0.5">
			<li>Scope 3 figures are spend-based estimates and carry higher uncertainty than Scope 1/2 data.</li>
			<li>Scope 2 market-based emissions not calculated — company does not hold Guarantee of Origin certificates.</li>
			<li>Biogenic CO₂ emissions excluded from totals as per GHG Protocol guidance.</li>
			{#if r.dataQuality === 'ESTIMATED'}
				<li>Fuel consumption estimated from financial spend using average {r.country} pump prices. Upload fuel card data for higher accuracy.</li>
			{/if}
			<li>This report was generated by Mycelium Fleet OS and does not constitute a third-party verified sustainability statement.</li>
		</ul>
	</section>

</div>
{:else}
	<div class="text-muted-foreground p-8 text-center text-sm">No data available for {year}.</div>
{/if}
