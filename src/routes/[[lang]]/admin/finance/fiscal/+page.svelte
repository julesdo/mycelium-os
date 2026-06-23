<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import LandmarkIcon from '@lucide/svelte/icons/landmark';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import InfoIcon from '@lucide/svelte/icons/info';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	const client = useConvexClient();
	const lang = $derived(page.params.lang as string | undefined);

	function goToFinance() {
		const path = lang ? `/${lang}/admin/finance` : '/admin/finance';
		goto(resolve(path));
	}

	// ── Year selector ─────────────────────────────────────────────────────────────
	const currentYear = new Date().getFullYear();
	let selectedYear = $state(currentYear);
	const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

	// ── Queries ───────────────────────────────────────────────────────────────────
	const summaryArgs = $derived({ year: selectedYear });
	const summaryQ = useQuery((api as any).fiscal.getFiscalSummary, summaryArgs);
	const membersQ = useQuery((api as any).fiscal.listOrgMembersForAssignment, {});

	const summary = $derived(summaryQ.data);
	const members = $derived(membersQ.data ?? []);

	// ── Tab state ─────────────────────────────────────────────────────────────────
	type Tab = 'tvs' | 'aen' | 'tva';
	let activeTab = $state<Tab>('tvs');

	// ── Virtual scroll helpers ────────────────────────────────────────────────────
	const ROW_HEIGHT = 48;
	const BUFFER = 8;

	// TVS table
	let tvsContainerEl = $state<HTMLElement | null>(null);
	let tvsContainerH = $state(420);
	let tvsScrollTop = $state(0);

	$effect(() => {
		if (!tvsContainerEl) return;
		tvsContainerH = tvsContainerEl.clientHeight;
		const ro = new ResizeObserver(([e]) => {
			tvsContainerH = e?.contentRect.height ?? tvsContainerEl!.clientHeight;
		});
		ro.observe(tvsContainerEl);
		return () => ro.disconnect();
	});

	// AEN table
	let aenContainerEl = $state<HTMLElement | null>(null);
	let aenContainerH = $state(420);
	let aenScrollTop = $state(0);

	$effect(() => {
		if (!aenContainerEl) return;
		aenContainerH = aenContainerEl.clientHeight;
		const ro = new ResizeObserver(([e]) => {
			aenContainerH = e?.contentRect.height ?? aenContainerEl!.clientHeight;
		});
		ro.observe(aenContainerEl);
		return () => ro.disconnect();
	});

	// ── TVS sort & filter ─────────────────────────────────────────────────────────
	type TVSSortKey = 'label' | 'registration' | 'energy' | 'co2Gkm' | 'tvsAnnuel';
	let tvsSortKey = $state<TVSSortKey>('label');
	let tvsSortDir = $state<'asc' | 'desc'>('asc');
	let tvsSearch = $state('');
	let tvsEnergyFilter = $state<string>('all');

	function toggleTvsSort(key: TVSSortKey) {
		if (tvsSortKey === key) tvsSortDir = tvsSortDir === 'asc' ? 'desc' : 'asc';
		else { tvsSortKey = key; tvsSortDir = 'asc'; }
		tvsScrollTop = 0;
		if (tvsContainerEl) tvsContainerEl.scrollTop = 0;
	}

	const tvsFiltered = $derived.by(() => {
		const rows = summary?.tvsLines ?? [];
		const q = tvsSearch.trim().toLowerCase();
		return rows
			.filter((r: any) => {
				if (tvsEnergyFilter !== 'all' && r.energy !== tvsEnergyFilter) return false;
				if (q && !r.label.toLowerCase().includes(q) && !r.registration.toLowerCase().includes(q)) return false;
				return true;
			})
			.sort((a: any, b: any) => {
				let av: any, bv: any;
				if (tvsSortKey === 'co2Gkm') { av = a.co2Gkm ?? -1; bv = b.co2Gkm ?? -1; }
				else if (tvsSortKey === 'tvsAnnuel') { av = a.tvsAnnuel; bv = b.tvsAnnuel; }
				else { av = (a[tvsSortKey] ?? '').toString().toLowerCase(); bv = (b[tvsSortKey] ?? '').toString().toLowerCase(); }
				if (typeof av === 'string') return tvsSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
				return tvsSortDir === 'asc' ? av - bv : bv - av;
			});
	});

	const tvsStart = $derived(Math.max(0, Math.floor(tvsScrollTop / ROW_HEIGHT) - BUFFER));
	const tvsEnd = $derived(Math.min(tvsFiltered.length, Math.ceil((tvsScrollTop + tvsContainerH) / ROW_HEIGHT) + BUFFER));
	const tvsVisible = $derived(tvsFiltered.slice(tvsStart, tvsEnd));
	const tvsPadTop = $derived(tvsStart * ROW_HEIGHT);
	const tvsPadBot = $derived(Math.max(0, (tvsFiltered.length - tvsEnd) * ROW_HEIGHT));

	// ── AEN sort & filter ─────────────────────────────────────────────────────────
	type AENSortKey = 'userName' | 'vehicleLabel' | 'method' | 'aenAnnuel' | 'startDate';
	let aenSortKey = $state<AENSortKey>('userName');
	let aenSortDir = $state<'asc' | 'desc'>('asc');
	let aenSearch = $state('');
	let aenMethodFilter = $state<string>('all');
	let aenStatusFilter = $state<'all' | 'active' | 'ended'>('all');

	function toggleAenSort(key: AENSortKey) {
		if (aenSortKey === key) aenSortDir = aenSortDir === 'asc' ? 'desc' : 'asc';
		else { aenSortKey = key; aenSortDir = 'asc'; }
		aenScrollTop = 0;
		if (aenContainerEl) aenContainerEl.scrollTop = 0;
	}

	const aenFiltered = $derived.by(() => {
		const rows = (summary?.aenLines ?? []) as any[];
		const q = aenSearch.trim().toLowerCase();
		return rows
			.filter((r) => {
				if (aenMethodFilter !== 'all' && r.method !== aenMethodFilter) return false;
				if (aenStatusFilter === 'active' && r.endDate) return false;
				if (aenStatusFilter === 'ended' && !r.endDate) return false;
				if (q && !(r.userName ?? '').toLowerCase().includes(q) && !r.vehicleLabel.toLowerCase().includes(q) && !r.registration.toLowerCase().includes(q)) return false;
				return true;
			})
			.sort((a: any, b: any) => {
				let av: any, bv: any;
				if (aenSortKey === 'aenAnnuel') { av = a.aenAnnuel; bv = b.aenAnnuel; }
				else { av = (a[aenSortKey] ?? '').toString().toLowerCase(); bv = (b[aenSortKey] ?? '').toString().toLowerCase(); }
				if (typeof av === 'string') return aenSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
				return aenSortDir === 'asc' ? av - bv : bv - av;
			});
	});

	const aenStart = $derived(Math.max(0, Math.floor(aenScrollTop / ROW_HEIGHT) - BUFFER));
	const aenEnd = $derived(Math.min(aenFiltered.length, Math.ceil((aenScrollTop + aenContainerH) / ROW_HEIGHT) + BUFFER));
	const aenVisible = $derived(aenFiltered.slice(aenStart, aenEnd));
	const aenPadTop = $derived(aenStart * ROW_HEIGHT);
	const aenPadBot = $derived(Math.max(0, (aenFiltered.length - aenEnd) * ROW_HEIGHT));

	// ── Dialog CO2 ────────────────────────────────────────────────────────────────
	let co2Open = $state(false);
	let co2VehicleId = $state('');
	let co2VehicleLabel = $state('');
	let co2Value = $state('');
	let purchasePriceValue = $state('');
	let co2Loading = $state(false);

	function openCO2Dialog(vehicleId: string, label: string, co2: number | null, price: number | null) {
		co2VehicleId = vehicleId;
		co2VehicleLabel = label;
		co2Value = co2?.toString() ?? '';
		purchasePriceValue = price?.toString() ?? '';
		co2Open = true;
	}

	async function saveCO2() {
		co2Loading = true;
		try {
			await client.mutation((api as any).fiscal.updateVehicleFiscalData, {
				vehicleId: co2VehicleId,
				co2Gkm: co2Value ? parseFloat(co2Value) : undefined,
				purchasePrice: purchasePriceValue ? parseFloat(purchasePriceValue) : undefined
			});
			toast.success('Données fiscales mises à jour');
			co2Open = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			co2Loading = false;
		}
	}

	// ── Dialog Attribution ────────────────────────────────────────────────────────
	let aenOpen = $state(false);
	let editingAssignmentId = $state<string | null>(null);

	let formVehicleId = $state('');
	let formUserId = $state('');
	let formStartDate = $state(new Date().toISOString().slice(0, 10));
	let formEndDate = $state('');
	let formFuelPaid = $state(false);
	let formPrivateUse = $state(true);
	let formPrivateKm = $state('');
	let formMethod = $state<'FORFAITAIRE' | 'REEL'>('FORFAITAIRE');
	let formNotes = $state('');
	let formLoading = $state(false);

	const vehicles = $derived(
		(summary?.tvsLines ?? []).map((l: any) => ({ id: l.vehicleId, label: `${l.label} — ${l.registration}` }))
	);

	function openCreateAEN() {
		editingAssignmentId = null;
		formVehicleId = ''; formUserId = '';
		formStartDate = new Date().toISOString().slice(0, 10);
		formEndDate = ''; formFuelPaid = false; formPrivateUse = true;
		formPrivateKm = ''; formMethod = 'FORFAITAIRE'; formNotes = '';
		aenOpen = true;
	}

	function openEditAEN(line: any) {
		editingAssignmentId = line.assignmentId;
		formVehicleId = line.vehicleId; formUserId = line.userId;
		formStartDate = line.startDate; formEndDate = line.endDate ?? '';
		formFuelPaid = line.fuelPaidByCompany; formPrivateUse = true;
		formPrivateKm = line.privateKmPerYear?.toString() ?? '';
		formMethod = line.method; formNotes = line.notes ?? '';
		aenOpen = true;
	}

	async function saveAEN() {
		if (!formVehicleId || !formUserId || !formStartDate) return;
		formLoading = true;
		try {
			if (editingAssignmentId) {
				await client.mutation((api as any).fiscal.updateAssignment, {
					assignmentId: editingAssignmentId,
					endDate: formEndDate || undefined,
					fuelPaidByCompany: formFuelPaid,
					privateKmPerYear: formPrivateKm ? parseFloat(formPrivateKm) : undefined,
					aenMethod: formMethod,
					notes: formNotes || undefined
				});
				toast.success('Attribution mise à jour');
			} else {
				await client.mutation((api as any).fiscal.createAssignment, {
					vehicleId: formVehicleId, userId: formUserId,
					startDate: formStartDate, endDate: formEndDate || undefined,
					fuelPaidByCompany: formFuelPaid, privateUseAllowed: formPrivateUse,
					privateKmPerYear: formPrivateKm ? parseFloat(formPrivateKm) : undefined,
					aenMethod: formMethod, notes: formNotes || undefined
				});
				toast.success('Attribution créée');
			}
			aenOpen = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			formLoading = false;
		}
	}

	async function deleteAssignment(id: string) {
		if (!confirm('Supprimer cette attribution ?')) return;
		try {
			await client.mutation((api as any).fiscal.deleteAssignment, { assignmentId: id });
			toast.success('Attribution supprimée');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		}
	}

	// ── Export CSV ────────────────────────────────────────────────────────────────
	function exportCSV() {
		if (!summary) return;
		const BOM = '﻿';
		let tvsCsv = 'Véhicule;Immatriculation;Énergie;CO2 (g/km);TVS annuelle (€)\n';
		for (const l of summary.tvsLines as any[])
			tvsCsv += `${l.label};${l.registration};${l.energy};${l.co2Gkm ?? 'N/R'};${l.tvsAnnuel}\n`;
		let aenCsv = 'Salarié;Véhicule;Immatriculation;Méthode;Carburant payé;AEN annuel (€);Début;Fin\n';
		for (const l of summary.aenLines as any[])
			aenCsv += `${l.userName ?? l.userId};${l.vehicleLabel};${l.registration};${l.method};${l.fuelPaidByCompany ? 'Oui' : 'Non'};${l.aenAnnuel};${l.startDate};${l.endDate ?? 'En cours'}\n`;
		let tvaCsv = 'Catégorie;Total TTC (€);TVA estimée (€);Taux récupération;TVA récupérable (€)\n';
		for (const l of summary.tvaLines as any[])
			tvaCsv += `${l.category};${l.totalAmount};${l.totalVat};${(l.recoveryRate * 100).toFixed(0)}%;${l.recoverable}\n`;
		const full = `${BOM}=== BILAN TVS ${summary.year} ===\n${tvsCsv}\n=== AVANTAGES EN NATURE ${summary.year} ===\n${aenCsv}\n=== TVA RÉCUPÉRABLE ${summary.year} ===\n${tvaCsv}`;
		const blob = new Blob([full], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = `mycelium-fiscal-${summary.year}.csv`; a.click();
		URL.revokeObjectURL(url);
	}

	// ── Formatters ────────────────────────────────────────────────────────────────
	const fmtCurrency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

	const CATEGORY_LABELS: Record<string, string> = {
		LEASING: 'Leasing', CARBURANT: 'Carburant', ENTRETIEN: 'Entretien',
		ASSURANCE: 'Assurance', TAXES: 'Taxes', SINISTRE: 'Sinistre',
		PARKING: 'Parking', TELEPEAGE: 'Télépéage', AUTRE: 'Autre'
	};
	const ENERGY_LABELS: Record<string, string> = { THERMAL: 'Thermique', HYBRID: 'Hybride', ELECTRIC: 'Électrique' };
	const TAB_LABELS: Record<Tab, string> = { tvs: 'TVS par véhicule', aen: 'Avantage en nature', tva: 'TVA récupérable' };
</script>

<SEOHead title="Bilan fiscal — Finance — Mycelium Fleet" description="TVS, avantage en nature et TVA récupérable" />

<div class="flex h-full flex-col gap-4 px-4 pb-6 lg:px-6 xl:px-8">

	<!-- Header -->
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon-sm" onclick={goToFinance} aria-label="Retour Finance">
				<ArrowLeftIcon class="size-4" />
			</Button>
			<LandmarkIcon class="size-5 text-muted-foreground" />
			<div>
				<h1 class="text-base font-semibold tracking-tight">Bilan fiscal flotte</h1>
				<p class="text-xs text-muted-foreground">TVS · Avantage en nature · TVA récupérable</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<div class="relative">
				<select
					class="h-8 appearance-none rounded-lg border border-border bg-card pl-3 pr-7 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
					bind:value={selectedYear}
				>
					{#each years as y (y)}<option value={y}>{y}</option>{/each}
				</select>
				<ChevronDownIcon class="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
			</div>
			<Button variant="outline" size="sm" class="gap-1.5" onclick={exportCSV} disabled={!summary}>
				<DownloadIcon class="size-4" />Exporter CSV
			</Button>
		</div>
	</div>

	<!-- KPI cards -->
	{#if summaryQ.isLoading}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each Array(3) as _, i (i)}<Skeleton class="h-24 rounded-3xl" />{/each}
		</div>
	{:else if summary}
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<MetricCard label="TVS à payer" value={fmtCurrency.format(summary.totalTVS)} description="À régler en janvier {selectedYear + 1}" variant="accent" />
			<MetricCard label="Avantage en nature total" value={fmtCurrency.format(summary.totalAEN)} description="À déclarer en DSN mensuelle" />
			<MetricCard label="TVA récupérable" value={fmtCurrency.format(summary.totalTVARecovery)} description="Sur déclaration CA3 trimestrielle" />
		</div>

		{#if (summary as any).vehiclesMissingCO2 > 0}
			<div class="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
				<AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-amber-500" />
				<p class="text-xs">
					<span class="font-semibold text-amber-700 dark:text-amber-400">{(summary as any).vehiclesMissingCO2} véhicule{(summary as any).vehiclesMissingCO2 > 1 ? 's' : ''} sans CO2 renseigné</span>
					<span class="ml-1 text-muted-foreground">— cliquez sur ✏️ dans le tableau pour compléter.</span>
				</p>
			</div>
		{/if}
	{/if}

	<!-- Tabs -->
	<div class="flex items-center gap-1 rounded-xl bg-muted/50 p-1 backdrop-blur-sm w-fit">
		{#each Object.entries(TAB_LABELS) as [key, label] (key)}
			<button
				class="rounded-lg px-3 py-1.5 text-xs font-medium transition-all {activeTab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (activeTab = key as Tab)}
			>{label}</button>
		{/each}
	</div>

	<!-- ── TVS ──────────────────────────────────────────────────────────────────── -->
	{#if activeTab === 'tvs'}
		<!-- Filters -->
		<div class="flex flex-wrap items-center gap-2">
			<div class="relative flex-1 min-w-48">
				<SearchIcon class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<input
					type="search"
					placeholder="Rechercher un véhicule..."
					class="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
					bind:value={tvsSearch}
				/>
			</div>
			<select
				class="h-8 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
				bind:value={tvsEnergyFilter}
			>
				<option value="all">Toutes énergies</option>
				<option value="THERMAL">Thermique</option>
				<option value="HYBRID">Hybride</option>
				<option value="ELECTRIC">Électrique</option>
			</select>
			{#if tvsSearch || tvsEnergyFilter !== 'all'}
				<button class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onclick={() => { tvsSearch = ''; tvsEnergyFilter = 'all'; }}>
					<XIcon class="size-3.5" />Réinitialiser
				</button>
			{/if}
			<span class="ml-auto text-xs text-muted-foreground">{tvsFiltered.length} véhicule{tvsFiltered.length !== 1 ? 's' : ''}</span>
		</div>

		<!-- Table with virtual scroll -->
		<div class="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
			{#if summaryQ.isLoading}
				<div class="p-6"><Skeleton class="h-64 w-full" /></div>
			{:else if tvsFiltered.length === 0}
				<div class="flex flex-col items-center gap-2 py-20 text-center">
					<SearchIcon class="size-8 text-muted-foreground/30" />
					<p class="text-sm text-muted-foreground">Aucun véhicule trouvé</p>
				</div>
			{:else}
				<div
					bind:this={tvsContainerEl}
					class="h-full overflow-x-auto overflow-y-auto scrollbar-thin"
					onscroll={(e) => (tvsScrollTop = (e.currentTarget as HTMLElement).scrollTop)}
				>
					<table class="w-full min-w-[700px] border-collapse text-sm">
						<thead class="sticky top-0 z-10">
							<tr class="border-b border-border/60 bg-card dark:bg-card">
								{#snippet th(key: TVSSortKey, label: string, right = false)}
									<th class="px-4 py-2.5 {right ? 'text-right' : 'text-left'} font-medium">
										<button type="button" class="flex {right ? 'w-full justify-end' : ''} items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground" onclick={() => toggleTvsSort(key)}>
											{label}
											{#if tvsSortKey === key}
												{#if tvsSortDir === 'asc'}<ChevronUpIcon class="size-3 text-foreground" />{:else}<ChevronDownIcon class="size-3 text-foreground" />{/if}
											{:else}<ChevronsUpDownIcon class="size-3 opacity-30" />{/if}
										</button>
									</th>
								{/snippet}
								{@render th('label', 'Véhicule')}
								{@render th('registration', 'Immat.')}
								{@render th('energy', 'Énergie')}
								{@render th('co2Gkm', 'CO2 g/km', true)}
								<th class="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Taux €/g</th>
								{@render th('tvsAnnuel', 'TVS annuelle', true)}
								<th class="w-10 px-4 py-2.5"></th>
							</tr>
						</thead>
						<tbody>
							{#if tvsPadTop > 0}<tr aria-hidden="true" style="height:{tvsPadTop}px"><td colspan="7"></td></tr>{/if}
							{#each tvsVisible as line (line.vehicleId)}
								<tr class="group border-b border-border/50 transition-colors hover:bg-muted/40" style="height:{ROW_HEIGHT}px">
									<td class="px-4 text-xs font-medium">{line.label}</td>
									<td class="px-4 font-mono text-xs text-muted-foreground">{line.registration}</td>
									<td class="px-4">
										{#if line.energy === 'ELECTRIC'}
											<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><ZapIcon class="size-2.5" />Électrique</span>
										{:else}
											<span class="text-xs text-muted-foreground">{ENERGY_LABELS[line.energy] ?? line.energy}</span>
										{/if}
									</td>
									<td class="px-4 text-right tabular-nums">
										{#if line.missingData}<span class="text-xs text-amber-500">N/R</span>
										{:else}<span class="text-xs">{line.co2Gkm} g/km</span>{/if}
									</td>
									<td class="px-4 text-right text-xs tabular-nums text-muted-foreground">
										{line.bandRate !== null ? `${line.bandRate} €` : '—'}
									</td>
									<td class="px-4 text-right">
										{#if line.energy === 'ELECTRIC' && !line.missingData && (line.co2Gkm ?? 999) <= 20}
											<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">0 € <span class="text-[10px] font-normal text-muted-foreground">(exonéré)</span></span>
										{:else if line.missingData}
											<span class="text-xs text-amber-500">Données manquantes</span>
										{:else}
											<span class="text-xs font-semibold tabular-nums">{fmtCurrency.format(line.tvsAnnuel)}</span>
										{/if}
									</td>
									<td class="px-4">
										<button
											class="invisible flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground group-hover:visible"
											onclick={() => openCO2Dialog(line.vehicleId, line.label, line.co2Gkm, null)}
											title="Modifier données fiscales"
										>
											<PencilLineIcon class="size-3.5" />
										</button>
									</td>
								</tr>
							{/each}
							{#if tvsPadBot > 0}<tr aria-hidden="true" style="height:{tvsPadBot}px"><td colspan="7"></td></tr>{/if}
						</tbody>
						<tfoot class="sticky bottom-0 border-t border-border bg-muted/30">
							<tr>
								<td colspan="5" class="px-4 py-3 text-xs font-semibold text-muted-foreground">Total TVS {selectedYear}</td>
								<td class="px-4 py-3 text-right text-sm font-bold tabular-nums">{fmtCurrency.format(summary?.totalTVS ?? 0)}</td>
								<td></td>
							</tr>
						</tfoot>
					</table>
				</div>
			{/if}
		</div>

	<!-- ── AEN ─────────────────────────────────────────────────────────────────── -->
	{:else if activeTab === 'aen'}
		<!-- Filters -->
		<div class="flex flex-wrap items-center gap-2">
			<div class="relative flex-1 min-w-48">
				<SearchIcon class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<input
					type="search"
					placeholder="Salarié, véhicule..."
					class="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
					bind:value={aenSearch}
				/>
			</div>
			<select class="h-8 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" bind:value={aenMethodFilter}>
				<option value="all">Toutes méthodes</option>
				<option value="FORFAITAIRE">Forfaitaire</option>
				<option value="REEL">Réelle</option>
			</select>
			<select class="h-8 rounded-lg border border-border bg-card px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" bind:value={aenStatusFilter}>
				<option value="all">Tous statuts</option>
				<option value="active">En cours</option>
				<option value="ended">Terminées</option>
			</select>
			{#if aenSearch || aenMethodFilter !== 'all' || aenStatusFilter !== 'all'}
				<button class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onclick={() => { aenSearch = ''; aenMethodFilter = 'all'; aenStatusFilter = 'all'; }}>
					<XIcon class="size-3.5" />Réinitialiser
				</button>
			{/if}
			<span class="ml-auto text-xs text-muted-foreground">{aenFiltered.length} attribution{aenFiltered.length !== 1 ? 's' : ''}</span>
			<Button size="sm" class="gap-1.5" onclick={openCreateAEN}>
				<PlusIcon class="size-4" />Nouvelle attribution
			</Button>
		</div>

		<!-- Table -->
		<div class="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
			{#if summaryQ.isLoading}
				<div class="p-6"><Skeleton class="h-64 w-full" /></div>
			{:else if aenFiltered.length === 0}
				<div class="flex flex-col items-center gap-3 py-20 text-center">
					<InfoIcon class="size-8 text-muted-foreground/30" />
					<div>
						<p class="text-sm font-medium">Aucune attribution</p>
						<p class="mt-1 text-xs text-muted-foreground">Créez une attribution pour calculer l'AEN.</p>
					</div>
					<Button size="sm" class="mt-2 gap-1.5" onclick={openCreateAEN}><PlusIcon class="size-4" />Créer</Button>
				</div>
			{:else}
				<div
					bind:this={aenContainerEl}
					class="h-full overflow-x-auto overflow-y-auto scrollbar-thin"
					onscroll={(e) => (aenScrollTop = (e.currentTarget as HTMLElement).scrollTop)}
				>
					<table class="w-full min-w-[820px] border-collapse text-sm">
						<thead class="sticky top-0 z-10">
							<tr class="border-b border-border/60 bg-card dark:bg-card">
								{#snippet ath(key: AENSortKey, label: string, right = false)}
									<th class="px-4 py-2.5 {right ? 'text-right' : 'text-left'} font-medium">
										<button type="button" class="flex {right ? 'w-full justify-end' : ''} items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground" onclick={() => toggleAenSort(key)}>
											{label}
											{#if aenSortKey === key}
												{#if aenSortDir === 'asc'}<ChevronUpIcon class="size-3 text-foreground" />{:else}<ChevronDownIcon class="size-3 text-foreground" />{/if}
											{:else}<ChevronsUpDownIcon class="size-3 opacity-30" />{/if}
										</button>
									</th>
								{/snippet}
								{@render ath('userName', 'Salarié')}
								{@render ath('vehicleLabel', 'Véhicule')}
								{@render ath('method', 'Méthode')}
								<th class="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Carburant</th>
								{@render ath('aenAnnuel', 'AEN annuel', true)}
								{@render ath('startDate', 'Période', false)}
								<th class="w-20 px-4 py-2.5"></th>
							</tr>
						</thead>
						<tbody>
							{#if aenPadTop > 0}<tr aria-hidden="true" style="height:{aenPadTop}px"><td colspan="7"></td></tr>{/if}
							{#each aenVisible as line (line.assignmentId)}
								<tr class="group border-b border-border/50 transition-colors hover:bg-muted/40" style="height:{ROW_HEIGHT}px">
									<td class="px-4 text-xs font-medium">{(line as any).userName ?? line.userId}</td>
									<td class="px-4">
										<p class="text-xs font-medium">{line.vehicleLabel}</p>
										<p class="font-mono text-[10px] text-muted-foreground">{line.registration}</p>
									</td>
									<td class="px-4">
										<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
											{line.method === 'FORFAITAIRE' ? 'Forfait' : 'Réel'}
										</span>
									</td>
									<td class="px-4 text-xs text-muted-foreground">{line.fuelPaidByCompany ? 'Payé' : 'Non'}</td>
									<td class="px-4 text-right text-xs font-semibold tabular-nums">{fmtCurrency.format(line.aenAnnuel)}</td>
									<td class="px-4 text-xs tabular-nums text-muted-foreground">
										{line.startDate} →
										{#if line.endDate}<span>{line.endDate}</span>
										{:else}<span class="text-emerald-600 dark:text-emerald-400">en cours</span>{/if}
									</td>
									<td class="px-4">
										<div class="invisible flex items-center gap-1 group-hover:visible">
											<button class="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" onclick={() => openEditAEN(line)}>
												<PencilLineIcon class="size-3.5" />
											</button>
											<button class="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onclick={() => deleteAssignment(line.assignmentId)}>
												<TrashIcon class="size-3.5" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
							{#if aenPadBot > 0}<tr aria-hidden="true" style="height:{aenPadBot}px"><td colspan="7"></td></tr>{/if}
						</tbody>
						<tfoot class="sticky bottom-0 border-t border-border bg-muted/30">
							<tr>
								<td colspan="4" class="px-4 py-3 text-xs font-semibold text-muted-foreground">Total AEN {selectedYear}</td>
								<td class="px-4 py-3 text-right text-sm font-bold tabular-nums">{fmtCurrency.format(summary?.totalAEN ?? 0)}</td>
								<td colspan="2"></td>
							</tr>
						</tfoot>
					</table>
				</div>
			{/if}
		</div>

	<!-- ── TVA ─────────────────────────────────────────────────────────────────── -->
	{:else if activeTab === 'tva'}
		<div class="overflow-hidden rounded-2xl border border-border bg-card">
			{#if summaryQ.isLoading}
				<div class="p-6"><Skeleton class="h-48 w-full" /></div>
			{:else if !summary || (summary.tvaLines as any[]).length === 0}
				<div class="py-16 text-center text-sm text-muted-foreground">Aucun coût enregistré pour {selectedYear}.</div>
			{:else}
				<table class="w-full text-sm">
					<thead class="bg-muted/30">
						<tr class="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
							<th class="px-4 py-3">Catégorie</th>
							<th class="px-4 py-3 text-right">Total TTC</th>
							<th class="px-4 py-3 text-right">TVA estimée</th>
							<th class="px-4 py-3 text-right">Taux récup.</th>
							<th class="px-4 py-3 text-right">Récupérable</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border/50">
						{#each summary.tvaLines as line ((line as any).category)}
							{@const l = line as any}
							<tr class="transition-colors hover:bg-muted/20">
								<td class="px-4 py-3 text-xs font-medium">{CATEGORY_LABELS[l.category] ?? l.category}</td>
								<td class="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{fmtCurrency.format(l.totalAmount)}</td>
								<td class="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{fmtCurrency.format(l.totalVat)}</td>
								<td class="px-4 py-3 text-right">
									{#if l.recoveryRate === 0}
										<span class="text-xs text-muted-foreground/60">0 %</span>
									{:else if l.recoveryRate === 1}
										<span class="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">100 %</span>
									{:else}
										<span class="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">{(l.recoveryRate * 100).toFixed(0)} %</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-right text-xs font-semibold tabular-nums">{l.recoverable === 0 ? '—' : fmtCurrency.format(l.recoverable)}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot class="border-t border-border bg-muted/20">
						<tr>
							<td colspan="4" class="px-4 py-3 text-xs font-semibold text-muted-foreground">Total TVA récupérable {selectedYear}</td>
							<td class="px-4 py-3 text-right text-sm font-bold tabular-nums">{fmtCurrency.format(summary?.totalTVARecovery ?? 0)}</td>
						</tr>
					</tfoot>
				</table>
			{/if}
		</div>
	{/if}

	<!-- Disclaimer -->
	<div class="flex shrink-0 items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
		<InfoIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
		<p class="text-xs leading-relaxed text-muted-foreground">
			<span class="font-semibold text-foreground">Avertissement légal —</span>
			Ces calculs sont fournis à titre indicatif (barèmes 2026, arrêté du 2 janvier 2025, art. 1010 CGI). Ils ne remplacent pas l'analyse de votre expert-comptable.
		</p>
	</div>
</div>

<!-- ═══ Dialog CO2 ═══════════════════════════════════════════════════════════ -->
<Dialog.Root bind:open={co2Open}>
	<Dialog.Content class="max-w-md bg-card">
		<Dialog.Header>
			<Dialog.Title>Données fiscales véhicule</Dialog.Title>
			<Dialog.Description>{co2VehicleLabel}</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-4 py-2">
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="co2input">Émissions CO2 (g/km WLTP)</label>
				<input
					id="co2input"
					type="number" min="0" max="500" step="1" placeholder="ex. 112"
					class="h-9 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
					bind:value={co2Value}
				/>
				<p class="text-[11px] text-muted-foreground">Disponible sur la carte grise ou le bon de commande.</p>
			</div>
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="priceinput">Prix d'achat TTC (€) — si propriété de l'entreprise</label>
				<input
					id="priceinput"
					type="number" min="0" step="100" placeholder="ex. 28000"
					class="h-9 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
					bind:value={purchasePriceValue}
				/>
				<p class="text-[11px] text-muted-foreground">Laisser vide si leasing — le coût annuel sera utilisé.</p>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="ghost" size="sm" onclick={() => (co2Open = false)}>Annuler</Button>
			<Button size="sm" disabled={co2Loading} onclick={saveCO2}>
				{co2Loading ? 'Enregistrement...' : 'Enregistrer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ═══ Dialog Attribution AEN ══════════════════════════════════════════════ -->
<Dialog.Root bind:open={aenOpen}>
	<Dialog.Content class="max-w-lg bg-card">
		<Dialog.Header>
			<Dialog.Title>{editingAssignmentId ? 'Modifier l\'attribution' : 'Nouvelle attribution'}</Dialog.Title>
			<Dialog.Description>Véhicule de fonction — calcul de l'avantage en nature</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4 py-2">
			{#if !editingAssignmentId}
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-1.5">
						<label class="text-xs font-medium" for="veh-select">Véhicule</label>
						<select id="veh-select" class="h-9 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" bind:value={formVehicleId}>
							<option value="">Choisir un véhicule</option>
							{#each vehicles as v (v.id)}<option value={v.id}>{v.label}</option>{/each}
						</select>
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-xs font-medium" for="user-select">Salarié</label>
						<select id="user-select" class="h-9 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" bind:value={formUserId}>
							<option value="">Choisir un salarié</option>
							{#each members as m (m.userId)}<option value={m.userId}>{m.name}</option>{/each}
						</select>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5">
					<label class="text-xs font-medium" for="start-date">Début</label>
					<input id="start-date" type="date" class="h-9 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" bind:value={formStartDate} disabled={!!editingAssignmentId} />
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-xs font-medium" for="end-date">Fin <span class="font-normal text-muted-foreground">(optionnel)</span></label>
					<input id="end-date" type="date" class="h-9 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" bind:value={formEndDate} />
				</div>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5">
					<label class="text-xs font-medium" for="aen-method">Méthode AEN</label>
					<select id="aen-method" class="h-9 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" bind:value={formMethod}>
						<option value="FORFAITAIRE">Forfaitaire</option>
						<option value="REEL">Réelle (km privés)</option>
					</select>
				</div>
				{#if formMethod === 'REEL'}
					<div class="flex flex-col gap-1.5">
						<label class="text-xs font-medium" for="private-km">Km privés/an</label>
						<input id="private-km" type="number" min="0" placeholder="ex. 5000" class="h-9 rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" bind:value={formPrivateKm} />
					</div>
				{/if}
			</div>

			<div class="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/20 px-4 py-3">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="flex cursor-pointer items-center justify-between" onclick={() => (formFuelPaid = !formFuelPaid)}>
					<span class="text-xs font-medium">Carburant personnel payé par l'entreprise</span>
					<div class="relative h-5 w-9 rounded-full transition-colors {formFuelPaid ? 'bg-primary' : 'bg-muted-foreground/30'}">
						<span class="absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform {formFuelPaid ? 'translate-x-4' : 'translate-x-0.5'}"></span>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium" for="aen-notes">Notes <span class="font-normal text-muted-foreground">(optionnel)</span></label>
				<textarea id="aen-notes" rows="2" class="resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Informations complémentaires..." bind:value={formNotes}></textarea>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="ghost" size="sm" onclick={() => (aenOpen = false)}>Annuler</Button>
			<Button size="sm" disabled={formLoading || (!editingAssignmentId && (!formVehicleId || !formUserId))} onclick={saveAEN}>
				{formLoading ? 'Enregistrement...' : editingAssignmentId ? 'Mettre à jour' : 'Créer l\'attribution'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
