<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import SubscriptionGate from '$lib/components/billing/SubscriptionGate.svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import LeafIcon from '@lucide/svelte/icons/leaf';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import InfoIcon from '@lucide/svelte/icons/info';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import { resolve } from '$app/paths';

	const currentYear = new Date().getFullYear();
	let selectedYear = $state(currentYear);
	const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

	const carbonArgs = $derived({ year: selectedYear });
	const client = useConvexClient();
	const lang = $derived(page.params.lang as string | undefined);
	const carbonQ = useQuery((api as any).carbon.calculateCarbonFootprint, carbonArgs);
	const csrdQ = $derived(useQuery(api.carbon.calculateCsrdReport, { year: selectedYear }));
	const reportsQ = useQuery((api as any).carbon.listReports, {});

	const csrdData = $derived(csrdQ.data);

	const data = $derived(carbonQ.data);
	const reports = $derived(reportsQ.data ?? []);

	// ── Sort ──────────────────────────────────────────────────────────────────
	type SortKey = 'registration' | 'energy' | 'scope' | 'consumption' | 'tco2e';
	let sortKey = $state<SortKey>('tco2e');
	let sortDir = $state<'asc' | 'desc'>('desc');

	function toggleSort(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortKey = key;
			sortDir = 'desc';
		}
	}

	const sortedVehicles = $derived.by(() => {
		if (!data?.perVehicle) return [];
		return [...data.perVehicle].sort((a, b) => {
			let av: string | number, bv: string | number;
			if (sortKey === 'tco2e') {
				av = a.tco2e;
				bv = b.tco2e;
			} else if (sortKey === 'consumption') {
				av = a.litersConsumed ?? a.kwh ?? 0;
				bv = b.litersConsumed ?? b.kwh ?? 0;
			} else if (sortKey === 'registration') {
				av = a.registration;
				bv = b.registration;
			} else if (sortKey === 'energy') {
				av = a.energy;
				bv = b.energy;
			} else {
				av = a.scope;
				bv = b.scope;
			}
			if (typeof av === 'string')
				return sortDir === 'asc'
					? av.localeCompare(bv as string)
					: (bv as string).localeCompare(av);
			return sortDir === 'asc' ? av - (bv as number) : (bv as number) - av;
		});
	});

	const ENERGY_LABELS: Record<string, string> = {
		THERMAL: 'Thermique',
		HYBRID: 'Hybride',
		ELECTRIC: 'Électrique'
	};

	// ── PDF generation ────────────────────────────────────────────────────────
	let generating = $state(false);

	async function handleGeneratePDF() {
		if (!data) return;
		generating = true;
		try {
			const { generateCarbonPDF } =
				await import('$lib/components/sustainability/carbon-pdf-generator');
			const blob = generateCarbonPDF(data, 'Mon Entreprise');
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `bilan-carbone-${data.year}.pdf`;
			a.click();
			URL.revokeObjectURL(url);

			// Archive le rapport
			await client.mutation((api as any).carbon.saveReport, {
				year: data.year,
				scope1TotalTCO2e: data.scope1TotalTCO2e,
				scope2TotalTCO2e: data.scope2TotalTCO2e,
				totalTCO2e: data.totalTCO2e,
				perVehicle: data.perVehicle,
				dataSource: data.dataSource
			});
			toast.success('Rapport PDF généré et archivé');
		} catch (e) {
			toast.error('Erreur lors de la génération du PDF');
			console.error(e);
		} finally {
			generating = false;
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────────
	const hasReport = $derived(reports.some((r: any) => r.year === selectedYear));
</script>

<SEOHead
	title="Bilan Carbone — Mycelium Fleet"
	description="Rapport d'émissions CO2 Scope 1 & 2 de la flotte"
/>

<SubscriptionGate feature="csrd" requiredPlan="professional">
	<div class="flex h-full flex-col gap-4 px-4 pb-6 lg:px-6 xl:px-8">
		<!-- Header -->
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex items-center gap-3">
				<LeafIcon class="size-5 text-emerald-600 dark:text-emerald-400" />
				<div>
					<h1 class="text-base font-semibold tracking-tight">Bilan Carbone Flotte</h1>
					<p class="text-xs text-muted-foreground">Scope 1 · Scope 2 · Conformité CSRD / ESRS E1</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<!-- Year selector -->
				<div class="relative">
					<select
						class="h-8 appearance-none rounded-lg border border-border bg-card pr-7 pl-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:outline-none"
						bind:value={selectedYear}
					>
						{#each years as y (y)}<option value={y}>{y}</option>{/each}
					</select>
					<ChevronDownIcon
						class="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
					/>
				</div>

				<a href={resolve(`/${lang}/admin/sustainability/esrs-e1?year=${selectedYear}`)}>
					<Button variant="outline" size="sm" class="gap-1.5">
						<FileTextIcon class="size-3.5" />
						ESRS E1 Report
					</Button>
				</a>
				<Button
					size="sm"
					class="gap-1.5"
					onclick={handleGeneratePDF}
					disabled={!data || generating || data.totalTCO2e === 0}
				>
					{#if generating}
						<span
							class="size-3.5 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
						></span>
						Génération…
					{:else}
						<DownloadIcon class="size-3.5" />
						Générer rapport PDF
					{/if}
				</Button>
			</div>
		</div>

		<!-- KPI cards -->
		{#if carbonQ.isLoading}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				{#each Array(3) as _, i (i)}<Skeleton class="h-24 rounded-3xl" />{/each}
			</div>
		{:else if data}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<MetricCard
					label="Total Scope 1 + 2"
					value="{data.totalTCO2e} tCO₂e"
					description="Bilan flotte {selectedYear}"
					variant="accent"
				/>
				<MetricCard
					label="Scope 1 — Combustion"
					value="{data.scope1TotalTCO2e} tCO₂e"
					description="{data.perVehicle.filter((v: { scope: string }) => v.scope === 'SCOPE1')
						.length} véhicule(s) thermique(s)"
				/>
				<MetricCard
					label="Scope 2 — Électricité VE"
					value="{data.scope2TotalTCO2e} tCO₂e"
					description="{data.perVehicle.filter((v: { scope: string }) => v.scope === 'SCOPE2')
						.length} véhicule(s) électrique(s)"
				/>
			</div>

			<!-- Scope 3 summary (CSRD) -->
			{#if csrdData && csrdData.emissions.scope3.total > 0}
				<div class="rounded-2xl border bg-card p-4">
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>
					<div class="mb-3 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<LeafIcon class="size-4 text-emerald-500" />
							<span class="text-sm font-medium">Scope 3 — Chaîne de valeur (CSRD)</span>
							<span
								class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
							>
								{csrdData.emissions.scope3.total.toFixed(3)} tCO₂e
							</span>
						</div>
						<a
							href={resolve(`/${lang}/admin/sustainability/esrs-e1?year=${selectedYear}`)}
							class="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
						>
							Rapport ESRS E1 complet →
						</a>
					</div>
					<div class="flex flex-col gap-1.5">
						{#each csrdData.emissions.scope3.breakdown as entry, i (i)}
							<div
								class="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-1.5 text-xs"
							>
								<span class="text-muted-foreground">{entry.description}</span>
								<span class="font-mono font-semibold">{entry.tco2e.toFixed(3)} tCO₂e</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Data quality notice -->
			{#if data.dataSource === 'COST_ESTIMATE'}
				<div
					class="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3"
				>
					<AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-amber-500" />
					<div class="text-xs">
						<span class="font-semibold text-amber-700 dark:text-amber-400">Données estimées</span>
						<span class="ml-1 text-muted-foreground"
							>— volumes calculés depuis les coûts carburant (prix moyen ADEME). Importez vos
							relevés carte carburant pour une précision optimale.</span
						>
					</div>
				</div>
			{:else}
				<div
					class="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3"
				>
					<CheckCircleIcon class="mt-0.5 size-4 shrink-0 text-emerald-500" />
					<p class="text-xs">
						<span class="font-semibold text-emerald-700 dark:text-emerald-400">Données exactes</span
						>
						<span class="ml-1 text-muted-foreground"
							>— volumes issus de vos imports de relevés carte carburant. Facteurs ADEME Base
							Carbone {data.ademeYear}.</span
						>
					</p>
				</div>
			{/if}

			<!-- Zero data state -->
			{#if data.totalTCO2e === 0}
				<div
					class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center"
				>
					<LeafIcon class="size-10 text-muted-foreground/40" />
					<p class="text-sm font-medium">Aucune donnée carburant pour {selectedYear}</p>
					<p class="max-w-xs text-xs text-muted-foreground">
						Renseignez des coûts carburant ou importez vos relevés carte carburant pour calculer les
						émissions.
					</p>
				</div>
			{:else}
				<!-- ADEME info -->
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<InfoIcon class="size-3.5 shrink-0" />
					<span
						>Facteurs d'émission ADEME Base Carbone {data.ademeYear} — Diesel : 2,640 kg CO₂e/L · Essence
						: 2,289 kg CO₂e/L · Électricité (mix FR) : 0,051 kg CO₂e/kWh</span
					>
				</div>

				<!-- Table -->
				<div class="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>

					<!-- Table header -->
					<div class="border-b border-border px-4 py-3">
						<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
							Détail par véhicule — {sortedVehicles.length} véhicule(s)
						</h2>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b border-border bg-muted/30">
									{#each [{ key: 'registration', label: 'Véhicule' }, { key: 'energy', label: 'Énergie' }, { key: 'scope', label: 'Scope' }, { key: 'consumption', label: 'Consommation' }, { key: 'tco2e', label: 'tCO₂e' }] as col (col.key)}
										<th
											class="cursor-pointer px-4 py-2.5 text-left font-semibold tracking-wider text-muted-foreground uppercase select-none hover:text-foreground"
											onclick={() => toggleSort(col.key as SortKey)}
										>
											<span class="flex items-center gap-1">
												{col.label}
												{#if sortKey === col.key}
													{#if sortDir === 'asc'}<ArrowUpIcon class="size-3" />{:else}<ArrowDownIcon
															class="size-3"
														/>{/if}
												{:else}
													<ArrowUpDownIcon class="size-3 opacity-30" />
												{/if}
											</span>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each sortedVehicles as v, i (v.vehicleId)}
									<tr
										class="border-b border-border/60 transition-colors hover:bg-muted/30 {i % 2 ===
										0
											? ''
											: 'bg-muted/10'}"
									>
										<td class="px-4 py-3">
											<span class="font-medium">{v.brand} {v.model}</span>
											<span class="ml-2 font-mono text-[10px] text-muted-foreground"
												>{v.registration}</span
											>
										</td>
										<td class="px-4 py-3 text-muted-foreground"
											>{ENERGY_LABELS[v.energy] ?? v.energy}</td
										>
										<td class="px-4 py-3">
											<span
												class="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold {v.scope ===
												'SCOPE2'
													? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
													: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}"
											>
												{v.scope === 'SCOPE2' ? 'Scope 2' : 'Scope 1'}
											</span>
										</td>
										<td class="px-4 py-3 font-mono text-muted-foreground">
											{#if v.litersConsumed != null}
												{v.litersConsumed.toLocaleString('fr-FR')} L
											{:else}
												{(v.kwh ?? 0).toLocaleString('fr-FR')} kWh
											{/if}
										</td>
										<td class="px-4 py-3 text-right font-mono font-semibold">
											{v.tco2e.toFixed(3)}
										</td>
									</tr>
								{/each}
							</tbody>
							<!-- Total row -->
							<tfoot>
								<tr class="border-t-2 border-border bg-muted/20">
									<td colspan="4" class="px-4 py-3 text-xs font-semibold"
										>Total flotte {selectedYear}</td
									>
									<td class="px-4 py-3 text-right font-mono text-sm font-bold"
										>{data.totalTCO2e.toFixed(2)}</td
									>
								</tr>
							</tfoot>
						</table>
					</div>
				</div>
			{/if}

			<!-- Rapports archivés -->
			{#if reports.length > 0}
				<div class="rounded-2xl border border-border bg-card px-4 py-4">
					<h2 class="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
						Rapports générés
					</h2>
					<div class="flex flex-wrap gap-2">
						{#each reports as r (r._id)}
							<div
								class="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs"
							>
								<CheckCircleIcon class="size-3.5 text-emerald-500" />
								<span class="font-medium">Rapport {r.year}</span>
								<span class="text-muted-foreground">· {r.totalTCO2e} tCO₂e ·</span>
								<span class="text-muted-foreground"
									>{new Date(r.generatedAt).toLocaleDateString('fr-FR')}</span
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<div
				class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center"
			>
				<LeafIcon class="size-10 text-muted-foreground/40" />
				<p class="text-sm font-medium text-muted-foreground">Impossible de charger les données</p>
			</div>
		{/if}
	</div>
</SubscriptionGate>
