<script lang="ts">
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { cn } from '$lib/utils';

	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Download from '@lucide/svelte/icons/download';
	import MailIcon from '@lucide/svelte/icons/mail';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import Truck from '@lucide/svelte/icons/truck';
	import Car from '@lucide/svelte/icons/car';
	import Building2 from '@lucide/svelte/icons/building-2';

	type Country = 'FR' | 'GB' | 'SE' | 'NO' | 'DK';
	type FleetType = 'corporate' | 'mixed' | 'utility';
	type KmLevel = 'low' | 'standard' | 'intensive';

	const CTRY = {
		FR: { flag: '🇫🇷', label: 'France', sym: '€', pos: true, mult: 1.0 },
		GB: { flag: '🇬🇧', label: 'UK', sym: '£', pos: true, mult: 0.93 },
		SE: { flag: '🇸🇪', label: 'Suède', sym: 'kr', pos: false, mult: 10.5 },
		NO: { flag: '🇳🇴', label: 'Norvège', sym: 'kr', pos: false, mult: 11.5 },
		DK: { flag: '🇩🇰', label: 'Danemark', sym: 'kr', pos: false, mult: 7.5 }
	} as const;

	const FLEET = {
		corporate: {
			label: 'Corporate',
			sub: 'Berlines & SUV',
			compactPct: 70,
			utilityPct: 5,
			execPct: 25,
			thermalPct: 65,
			hybridPct: 25
		},
		mixed: {
			label: 'Mixte',
			sub: 'Berlines & utilitaires',
			compactPct: 50,
			utilityPct: 40,
			execPct: 10,
			thermalPct: 76,
			hybridPct: 15
		},
		utility: {
			label: 'Transport',
			sub: 'Utilitaires & commerciaux',
			compactPct: 15,
			utilityPct: 80,
			execPct: 5,
			thermalPct: 88,
			hybridPct: 8
		}
	} as const;

	const FLEET_ICONS = { corporate: Building2, mixed: Car, utility: Truck } as const;

	const KM = { low: 12_000, standard: 20_000, intensive: 35_000 } as const;

	const BASE = {
		compact: { leasing: 5040, fuel10k: 680, maint: 850, ins: 950 },
		utility: { leasing: 6840, fuel10k: 810, maint: 1250, ins: 1200 },
		executive: { leasing: 10800, fuel10k: 980, maint: 1600, ins: 1900 }
	} as const;
	const ADMIN_EUR_PER_VEH = 420;

	const PLAN_PRICES: Record<Country, [number, number, number]> = {
		FR: [490, 890, 1490],
		GB: [420, 750, 1250],
		SE: [5200, 9400, 15700],
		NO: [5700, 10200, 17200],
		DK: [3900, 7000, 11700]
	};

	const COST_CATS = [
		{ key: 'leasing' as const, label: 'Leasing', hex: '#818cf8' },
		{ key: 'fuel' as const, label: 'Carburant', hex: '#34d399' },
		{ key: 'maint' as const, label: 'Entretien', hex: '#fbbf24' },
		{ key: 'ins' as const, label: 'Assurance', hex: '#f87171' },
		{ key: 'admin' as const, label: 'Admin', hex: '#c084fc' }
	];

	let vehicleCount = $state(30);
	let country = $state<Country>('FR');
	let fleetType = $state<FleetType>('mixed');
	let kmLevel = $state<KmLevel>('standard');

	const cc = $derived(CTRY[country]);
	const fl = $derived(FLEET[fleetType]);
	const annualKm = $derived(KM[kmLevel]);

	const compactN = $derived(Math.round((vehicleCount * fl.compactPct) / 100));
	const utilityN = $derived(Math.round((vehicleCount * fl.utilityPct) / 100));
	const execN = $derived(Math.max(0, vehicleCount - compactN - utilityN));
	const electricPct = $derived(Math.max(0, 100 - fl.thermalPct - fl.hybridPct));
	const fuelFactor = $derived(
		fl.thermalPct / 100 + (fl.hybridPct / 100) * 0.72 + (electricPct / 100) * 0.32
	);

	const costs = $derived.by(() => {
		const m = cc.mult;
		const km10 = annualKm / 10_000;
		let leasing = 0,
			fuel = 0,
			maint = 0,
			ins = 0,
			admin = 0;
		for (const [b, n] of [
			[BASE.compact, compactN],
			[BASE.utility, utilityN],
			[BASE.executive, execN]
		] as const) {
			leasing += n * b.leasing * m;
			fuel += n * b.fuel10k * km10 * fuelFactor * m;
			maint += n * b.maint * m;
			ins += n * b.ins * m;
			admin += n * ADMIN_EUR_PER_VEH * m;
		}
		return { leasing, fuel, maint, ins, admin, total: leasing + fuel + maint + ins + admin };
	});

	const savings = $derived.by(() => {
		const m = cc.mult;
		const fleetOpt =
			Math.floor(vehicleCount * (Math.max(0, 70 - 55) / 70) * 0.45) *
			(costs.total / Math.max(1, vehicleCount));
		const maintenance = costs.maint * 0.2;
		const adminSav = costs.admin * 0.6;
		const fuelSav = costs.fuel * 0.07;
		const compliance = vehicleCount * 42 * m;
		const total = fleetOpt + maintenance + adminSav + fuelSav + compliance;
		return { fleetOpt, maintenance, adminSav, fuelSav, compliance, total };
	});

	const plan = $derived.by(() => {
		const prices = PLAN_PRICES[country];
		if (vehicleCount <= 50)
			return { name: 'Essential', monthly: prices[0], annual: prices[0] * 12 };
		if (vehicleCount <= 150)
			return { name: 'Professional', monthly: prices[1], annual: prices[1] * 12 };
		return { name: 'Business', monthly: prices[2], annual: prices[2] * 12 };
	});

	const netSavings = $derived(savings.total - plan.annual);
	const roiMonths = $derived(
		netSavings > 0 ? Math.max(1, Math.round(plan.annual / (savings.total / 12))) : 0
	);
	const tcoPerVeh = $derived(costs.total / Math.max(1, vehicleCount));

	const levers = $derived([
		{
			key: 'fleet',
			label: 'Optimisation & admin',
			desc: 'Véhicules sous-utilisés, automatisation gestion',
			amount: savings.fleetOpt + savings.adminSav
		},
		{
			key: 'maint',
			label: 'Maintenance préventive',
			desc: 'Alertes prédictives, réduction des pannes',
			amount: savings.maintenance
		},
		{
			key: 'compliance',
			label: 'Carburant & conformité',
			desc: 'Éco-conduite, infractions, BiK/CSRD',
			amount: savings.fuelSav + savings.compliance
		}
	]);
	const maxLever = $derived(Math.max(...levers.map((l) => l.amount), 1));

	function fmtN(n: number) {
		return Math.round(n).toLocaleString(country === 'FR' ? 'fr-FR' : 'en-GB');
	}
	function money(n: number, snap = 200) {
		const r = Math.round(n / snap) * snap;
		return cc.pos ? cc.sym + fmtN(r) : fmtN(r) + ' ' + cc.sym;
	}
	function pct(val: number, total: number) {
		return total > 0 ? Math.max(1, Math.round((val / total) * 100)) : 0;
	}

	let formEmail = $state('');
	let formSubmitting = $state(false);
	let formSubmitted = $state(false);

	async function handleReport(e: Event) {
		e.preventDefault();
		if (!formEmail) return;
		formSubmitting = true;
		try {
			await fetch('/api/simulator/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: formEmail,
					data: {
						vehicleCount,
						country,
						fleetType,
						annualKm,
						tco: Math.round(costs.total),
						savings: Math.round(savings.total),
						netSavings: Math.round(netSavings),
						roiMonths,
						plan: plan.name
					}
				})
			});
		} catch {
			/* endpoint not live in dev */
		}
		formSubmitted = true;
		formSubmitting = false;
	}

	function downloadReport() {
		window.print();
	}
</script>

<div class="mx-auto max-w-[1520px] px-4 pt-20 pb-4 sm:px-6 lg:px-8">
	<div class="no-print mb-4">
		<p class="mb-0.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
			Calculateur TCO · Outil gratuit · Sans inscription
		</p>
		<h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
			Quel est le coût réel de votre flotte ?
		</h1>
	</div>

	<div class="grid items-start gap-4 lg:grid-cols-[280px_1fr]">
		<!-- LEFT: inputs -->
		<div
			class="no-print relative overflow-hidden rounded-3xl border border-border bg-card p-4 lg:sticky lg:top-20"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
		>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
			></div>

			<p class="mb-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
				Profil de votre flotte
			</p>

			<!-- Country -->
			<div class="mb-3 flex flex-wrap gap-1.5">
				{#each Object.entries(CTRY) as [code, c] (code)}
					<button
						onclick={() => (country = code as Country)}
						class={cn(
							'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors duration-100',
							country === code
								? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]'
								: 'border-border text-muted-foreground hover:text-foreground'
						)}>{c.flag} {c.label}</button
					>
				{/each}
			</div>

			<div class="mb-3 h-px bg-border"></div>

			<!-- Vehicle count -->
			<div class="mb-3">
				<div class="mb-1 flex items-center justify-between">
					<span class="text-xs font-medium text-muted-foreground">Véhicules</span>
					<span class="font-mono text-2xl leading-none font-bold text-foreground tabular-nums"
						>{vehicleCount}</span
					>
				</div>
				<input
					type="range"
					min="5"
					max="150"
					step="5"
					bind:value={vehicleCount}
					class="w-full cursor-pointer accent-[var(--brand)]"
				/>
				<div class="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
					<span>5</span><span>PME 20–60</span><span>150</span>
				</div>
			</div>

			<div class="mb-3 h-px bg-border"></div>

			<!-- Fleet type -->
			<div class="mb-3">
				<p class="mb-2 text-xs font-medium text-muted-foreground">Type de flotte</p>
				<div class="space-y-1.5">
					{#each Object.entries(FLEET) as [type, f] (type)}
						{@const FIcon = FLEET_ICONS[type as FleetType]}
						<button
							onclick={() => (fleetType = type as FleetType)}
							class={cn(
								'relative w-full overflow-hidden rounded-2xl border px-3 py-2 text-left transition-colors duration-100',
								fleetType === type
									? 'border-[var(--brand)] bg-[var(--brand)]/5'
									: 'border-border hover:bg-muted/30'
							)}
						>
							{#if fleetType === type}
								<div
									class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[var(--brand)]/50 to-transparent"
								></div>
							{/if}
							<div class="flex items-center gap-2.5">
								<div
									class={cn(
										'flex size-7 shrink-0 items-center justify-center rounded-lg',
										fleetType === type
											? 'bg-[var(--brand)] text-[var(--brand-foreground)]'
											: 'bg-muted text-muted-foreground'
									)}
								>
									<FIcon class="size-3.5" />
								</div>
								<div class="min-w-0">
									<p class="text-sm leading-tight font-semibold text-foreground">{f.label}</p>
									<p class="truncate text-[11px] text-muted-foreground">{f.sub}</p>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<div class="mb-3 h-px bg-border"></div>

			<!-- Mileage -->
			<div>
				<p class="mb-2 text-xs font-medium text-muted-foreground">Kilométrage annuel</p>
				<div class="grid grid-cols-3 gap-1.5">
					{#each [{ key: 'low' as const, label: 'Faible', sub: '< 15k km' }, { key: 'standard' as const, label: 'Standard', sub: '15–25k' }, { key: 'intensive' as const, label: 'Intensif', sub: '> 25k km' }] as opt (opt.key)}
						<button
							onclick={() => (kmLevel = opt.key)}
							class={cn(
								'rounded-xl border py-2 text-center transition-colors duration-100',
								kmLevel === opt.key
									? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]'
									: 'border-border text-foreground hover:bg-muted/40'
							)}
						>
							<p class="text-xs leading-tight font-semibold">{opt.label}</p>
							<p
								class={cn(
									'text-[10px] leading-tight',
									kmLevel === opt.key
										? 'text-[var(--brand-foreground)]/70'
										: 'text-muted-foreground'
								)}
							>
								{opt.sub}
							</p>
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- RIGHT: results -->
		<div class="flex flex-col gap-4">
			<!-- Row 1: 3 KPI MetricCards -->
			<div
				class="grid grid-cols-3 gap-3 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card"
			>
				<MetricCard
					label="TCO annuel estimé"
					value={money(costs.total, 1000)}
					description="{vehicleCount} véhicules · {money(tcoPerVeh, 100)}/veh"
				/>
				<MetricCard
					label="Économies identifiées"
					value={money(savings.total, 500)}
					trend={{ value: `${pct(savings.total, costs.total)}% du TCO`, direction: 'up' }}
				/>
				<MetricCard
					label="ROI Mycelium {plan.name}"
					value={roiMonths > 0 ? `Mois ${roiMonths}` : 'Optimal'}
					description="Gain net {money(netSavings, 500)}/an"
				/>
			</div>

			<!-- Row 2: 3 panels side by side -->
			<div class="grid gap-4 lg:grid-cols-3">
				<!-- Panel 1: Cost breakdown -->
				<div
					class="relative overflow-hidden rounded-3xl border border-border bg-card p-5"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>

					<div class="mb-1">
						<p class="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
							Répartition du TCO
						</p>
						<p class="mt-1 font-mono text-2xl font-bold text-foreground tabular-nums">
							{money(costs.total, 1000)}
						</p>
						<p class="text-xs text-muted-foreground">{money(tcoPerVeh, 100)} / véhicule / an</p>
					</div>

					<div class="my-4 flex h-2 overflow-hidden rounded-full">
						{#each COST_CATS as cat (cat.key)}
							<div
								style="width: {pct(
									costs[cat.key],
									costs.total
								)}%; background: {cat.hex}; transition: width .3s;"
							></div>
						{/each}
					</div>

					<div class="space-y-2">
						{#each COST_CATS as cat (cat.key)}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-1.5">
									<span class="size-1.5 shrink-0 rounded-full" style="background: {cat.hex};"
									></span>
									<span class="text-xs text-muted-foreground">{cat.label}</span>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-[11px] text-muted-foreground"
										>{pct(costs[cat.key], costs.total)}%</span
									>
									<span class="font-mono text-xs font-semibold text-foreground tabular-nums"
										>{money(costs[cat.key], 100)}</span
									>
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-4 rounded-2xl bg-muted/40 p-3">
						<p class="text-[11px] text-muted-foreground">
							Source : ALD Automotive, Arval, LeasePlan Fleet Cost Benchmark 2025–2026 · Estimations
							indicatives
						</p>
					</div>
				</div>

				<!-- Panel 2: Savings levers + Plan -->
				<div
					class="relative overflow-hidden rounded-3xl border border-border bg-card p-5"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>

					<div class="mb-3 flex items-start justify-between">
						<p class="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
							Leviers d'économies
						</p>
						<span class="font-mono text-sm font-bold tabular-nums" style="color: var(--brand);"
							>+{money(savings.total, 500)}</span
						>
					</div>

					<div class="space-y-4">
						{#each levers as lever (lever.key)}
							<div>
								<div class="mb-0.5 flex items-center justify-between gap-2">
									<p class="text-sm font-semibold text-foreground">{lever.label}</p>
									<span
										class="shrink-0 font-mono text-sm font-semibold tabular-nums"
										style="color: var(--brand);">+{money(lever.amount, 100)}</span
									>
								</div>
								<p class="mb-1.5 text-xs text-muted-foreground">{lever.desc}</p>
								<div class="h-1.5 overflow-hidden rounded-full bg-muted/50">
									<div
										class="h-full rounded-full transition-[width] duration-500"
										style="width: {(lever.amount / maxLever) * 100}%; background: var(--brand);"
									></div>
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-4 rounded-2xl border border-border p-3">
						<p
							class="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
						>
							Plan recommandé
						</p>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-base font-bold text-foreground">{plan.name}</p>
								<p class="text-xs text-muted-foreground">
									jusqu'à {vehicleCount <= 50 ? 50 : vehicleCount <= 150 ? 150 : 300} conducteurs
								</p>
							</div>
							<div class="text-right">
								<p class="font-mono text-xl font-bold text-foreground tabular-nums">
									{money(plan.monthly, 10)}
								</p>
								<p class="text-xs text-muted-foreground">/ mois</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Panel 3: Net gain + Report -->
				<div
					class="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-5"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
					></div>

					<div
						class="mb-4 rounded-2xl p-4 text-center"
						style="background: color-mix(in oklch, var(--brand) 10%, transparent);"
					>
						<div class="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
							<TrendingDown class="size-3.5" style="color: var(--brand);" />
							Gain net annuel estimé
						</div>
						<p
							class="mt-1.5 font-mono text-3xl font-bold tabular-nums"
							style="color: var(--brand);"
						>
							+{money(netSavings, 500)}
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							{roiMonths > 0
								? `ROI dès le mois ${roiMonths} · Plan ${plan.name} inclus`
								: 'Flotte déjà optimale'}
						</p>
					</div>

					{#if formSubmitted}
						<div class="flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-center">
							<CheckCircle class="size-9 text-emerald-500" />
							<p class="text-sm font-semibold text-foreground">Rapport envoyé</p>
							<p class="text-xs text-muted-foreground">Vérifiez votre boîte mail</p>
						</div>
					{:else}
						<div class="mb-2 flex items-center gap-2">
							<div
								class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]"
								style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.25);"
							>
								<MailIcon class="size-3.5" style="color: var(--brand-foreground);" />
							</div>
							<p class="text-sm font-semibold text-foreground">Recevoir le rapport PDF</p>
						</div>
						<form onsubmit={handleReport} class="mb-3 space-y-2">
							<input
								type="email"
								required
								placeholder="Email professionnel"
								bind:value={formEmail}
								class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--brand)] focus:outline-none"
							/>
							<Button type="submit" class="w-full" disabled={formSubmitting}>
								{formSubmitting ? 'Envoi...' : 'Recevoir mon rapport gratuit'}
							</Button>
						</form>
						<p class="mb-3 text-center text-[10px] text-muted-foreground">
							Sans spam · Désabonnement en 1 clic
						</p>
					{/if}

					<div class="h-px bg-border"></div>

					<div class="mt-3 space-y-2">
						<button
							onclick={downloadReport}
							class="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
						>
							<Download class="size-3.5 text-muted-foreground" />
							Télécharger en PDF
						</button>
						<Button href={resolve(localizedHref('/signup'))} class="w-full">
							Démarrer l'essai gratuit 15 jours
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@media print {
		.no-print {
			display: none !important;
		}
	}
</style>
