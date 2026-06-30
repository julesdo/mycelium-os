<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';

	type Country = 'FR' | 'GB' | 'SE' | 'NO' | 'DK';

	// ── State ──────────────────────────────────────────────────────────────
	let vehicleCount = $state(30);
	let compactPct = $state(60);
	let utilityPct = $state(30);
	let annualKm = $state(20000);
	let thermalPct = $state(70);
	let hybridPct = $state(20);
	let utilization = $state(55); // % of available days a vehicle is booked
	let country = $state<Country>('FR');

	// ── Derived fleet mix ─────────────────────────────────────────────────
	let execPct = $derived(Math.max(0, 100 - compactPct - utilityPct));
	let electricPct = $derived(Math.max(0, 100 - thermalPct - hybridPct));
	let compactN = $derived(Math.round((vehicleCount * compactPct) / 100));
	let utilityN = $derived(Math.round((vehicleCount * utilityPct) / 100));
	let execN = $derived(vehicleCount - compactN - utilityN);

	// Weighted fuel cost factor vs 100% thermal
	let fuelFactor = $derived(
		(thermalPct / 100) * 1.0 +
			(hybridPct / 100) * 0.72 + // hybrid saves ~28% energy cost
			(electricPct / 100) * 0.32 // electric ~68% cheaper per km
	);

	// ── Country config ────────────────────────────────────────────────────
	const CTRY = {
		FR: { flag: '🇫🇷', label: 'France', sym: '€', pos: true, mult: 1.0 },
		GB: { flag: '🇬🇧', label: 'Royaume-Uni', sym: '£', pos: true, mult: 0.93 },
		SE: { flag: '🇸🇪', label: 'Suède', sym: 'kr', pos: false, mult: 10.5 },
		NO: { flag: '🇳🇴', label: 'Norvège', sym: 'kr', pos: false, mult: 11.5 },
		DK: { flag: '🇩🇰', label: 'Danemark', sym: 'kr', pos: false, mult: 7.5 }
	} as const;

	let cc = $derived(CTRY[country]);

	// ── Base costs (EUR, France, 15 000 km/an de référence) ───────────────
	// Benchmarks 2025-2026 : ALD Automotive Fleet Cost Index,
	// Arval Fleet Barometer, LeasePlan International Fleet Cost Benchmark
	const BASE = {
		compact: { leasing: 5040, fuel10k: 680, maint: 850, ins: 950 },
		utility: { leasing: 6840, fuel10k: 810, maint: 1250, ins: 1200 },
		executive: { leasing: 10800, fuel10k: 980, maint: 1600, ins: 1900 }
	} as const;
	const ADMIN_EUR_PER_VEH = 420; // overhead gestion fleet / véhicule / an

	// ── Fleet total costs ─────────────────────────────────────────────────
	let costs = $derived.by(() => {
		const m = cc.mult;
		const km10 = annualKm / 10000; // distance multiplier vs 10 000 km base
		let leasing = 0,
			fuel = 0,
			maint = 0,
			ins = 0,
			admin = 0;

		const entries = [
			[BASE.compact, compactN],
			[BASE.utility, utilityN],
			[BASE.executive, execN]
		] as const;

		for (const [b, n] of entries) {
			leasing += n * b.leasing * m;
			fuel += n * b.fuel10k * km10 * fuelFactor * m;
			maint += n * b.maint * m;
			ins += n * b.ins * m;
			admin += n * ADMIN_EUR_PER_VEH * m;
		}

		const total = leasing + fuel + maint + ins + admin;
		return { leasing, fuel, maint, ins, admin, total };
	});

	// ── Savings potential ────────────────────────────────────────────────
	let savings = $derived.by(() => {
		const m = cc.mult;

		// 1. Fleet rightsizing — meilleure visibilité → pooling + cessions
		// À 70 % d'utilisation on libère les véhicules inutiles.
		// À 55 % on atteint 70 % en réduisant la flotte de ~21 % (0.55/0.70 = 0.786)
		// Mais on capture seulement ~45 % du potentiel théorique en an 1 (leases en cours).
		const targetUtil = 70;
		const utilizationGap = Math.max(0, targetUtil - utilization);
		const captureFactor = 0.45;
		const vehs = Math.floor(vehicleCount * (utilizationGap / targetUtil) * captureFactor);
		const avgCostPerVeh = costs.total / vehicleCount;
		const rightsizing = vehs * avgCostPerVeh;

		// 2. Maintenance prédictive — alertes préventives → -20 % pannes imprévues
		// Source : Aberdeen Group Fleet Management Study (2024)
		const maint = costs.maint * 0.2;

		// 3. Éco-conduite — coaching conducteurs → -7 % consommation moyenne
		// Source : TMC Fleet / ICCT eco-driving meta-analysis
		const fuel = costs.fuel * 0.07;

		// 4. Automatisation admin — réservations, rapports, alertes permis → -60 % temps
		const admin = costs.admin * 0.6;

		// 5. Infractions & conformité — suivi + imputation conducteur
		// Moyenne flotte FR : ~1,4 infraction/véhicule/an × ~30 € de traitement admin
		const compliance = vehicleCount * 42 * m;

		const total = rightsizing + maint + fuel + admin + compliance;
		return { rightsizing, maint, fuel, admin, compliance, total, vehs };
	});

	// ── Mycelium plan ─────────────────────────────────────────────────────
	let plan = $derived.by(() => {
		const m = cc.mult;
		// Prix en EUR, convertis au taux du marché local
		if (vehicleCount <= 50)
			return { name: 'Essential', monthly: Math.round(490 * m), annual: Math.round(490 * 12 * m) };
		if (vehicleCount <= 150)
			return {
				name: 'Professional',
				monthly: Math.round(890 * m),
				annual: Math.round(890 * 12 * m)
			};
		return { name: 'Business', monthly: Math.round(1490 * m), annual: Math.round(1490 * 12 * m) };
	});

	let netSavings = $derived(savings.total - plan.annual);
	let roiMonths = $derived(
		savings.total > 0 && netSavings > 0
			? Math.max(1, Math.round(plan.annual / (savings.total / 12)))
			: 0
	);

	// ── Formatting ────────────────────────────────────────────────────────
	function fmtN(n: number): string {
		const locale = country === 'FR' ? 'fr-FR' : 'en-GB';
		return Math.round(n).toLocaleString(locale);
	}

	function money(n: number, snap = 200): string {
		const r = Math.round(n / snap) * snap;
		if (!cc.pos) return fmtN(r) + ' ' + cc.sym; // "12 500 kr"
		return cc.sym + fmtN(r); // "€12 500" / "£11 600"
	}

	function pct(val: number, total: number): number {
		return total > 0 ? Math.max(1, Math.round((val / total) * 100)) : 0;
	}

	// Ensure utility slider stays within complement of compact
	function onUtilityInput(e: Event) {
		const v = +(e.target as HTMLInputElement).value;
		utilityPct = Math.min(v, 100 - compactPct);
	}
	function onHybridInput(e: Event) {
		const v = +(e.target as HTMLInputElement).value;
		hybridPct = Math.min(v, 100 - thermalPct);
	}

	// Colors for the TCO breakdown bar
	const COLORS = {
		leasing: '#818cf8', // indigo
		fuel: '#34d399', // emerald
		maint: '#fbbf24', // amber
		ins: '#f87171', // red
		admin: '#c084fc' // purple
	};
</script>

<div class="mx-auto max-w-6xl px-6 pt-28 pb-20 sm:px-8 sm:pt-32 sm:pb-24">
	<!-- Page header -->
	<div class="mb-10 sm:mb-14">
		<div class="mb-4 flex items-center gap-2.5">
			<span class="h-px w-6 bg-[var(--brand)]"></span>
			<span class="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
				Outil gratuit
			</span>
		</div>
		<h1 class="text-[1.75rem] font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
			Calculateur de coût total de flotte (TCO)
		</h1>
		<p class="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
			Entrez les paramètres de votre flotte et obtenez instantanément votre TCO actuel, votre coût
			par véhicule et votre potentiel d'économies. Sans inscription.
		</p>
	</div>

	<!-- Grid: inputs | results -->
	<div class="grid gap-5 lg:grid-cols-[380px_1fr]">
		<!-- ─── LEFT: Inputs ─────────────────────────────────────────────── -->
		<div
			class="space-y-7 rounded-2xl border border-border bg-card p-6"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
		>
			<!-- Country -->
			<div>
				<p class="mb-2.5 text-sm font-medium text-foreground">Marché</p>
				<div class="flex flex-wrap gap-1.5">
					{#each Object.entries(CTRY) as [code, c] (code)}
						<button
							class="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors
								{country === code
								? 'border-[var(--brand)] bg-[var(--brand)] font-semibold text-[var(--brand-foreground)]'
								: 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'}"
							onclick={() => (country = code as Country)}
						>
							{c.flag}
							{c.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Vehicle count -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<p class="text-sm font-medium text-foreground">Nombre de véhicules</p>
					<span class="text-2xl font-bold text-foreground tabular-nums">{vehicleCount}</span>
				</div>
				<input
					type="range"
					min="5"
					max="150"
					step="1"
					bind:value={vehicleCount}
					class="w-full cursor-pointer"
					style="accent-color: var(--brand);"
				/>
				<div class="mt-1 flex justify-between text-xs text-muted-foreground">
					<span>5</span><span>PME type · 30–50</span><span>150</span>
				</div>
			</div>

			<!-- Vehicle mix -->
			<div>
				<p class="mb-3 text-sm font-medium text-foreground">Composition de la flotte</p>
				<div class="space-y-4">
					<div>
						<div class="mb-1.5 flex justify-between text-xs">
							<span class="text-muted-foreground"
								>Berlines / compactes <span class="font-medium text-foreground">{compactN} veh</span
								></span
							>
							<span class="font-medium text-foreground tabular-nums">{compactPct}%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							step="5"
							bind:value={compactPct}
							class="w-full cursor-pointer"
							style="accent-color: var(--brand);"
						/>
					</div>
					<div>
						<div class="mb-1.5 flex justify-between text-xs">
							<span class="text-muted-foreground"
								>Utilitaires légers <span class="font-medium text-foreground">{utilityN} veh</span
								></span
							>
							<span class="font-medium text-foreground tabular-nums"
								>{Math.min(utilityPct, 100 - compactPct)}%</span
							>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							step="5"
							value={Math.min(utilityPct, 100 - compactPct)}
							oninput={onUtilityInput}
							class="w-full cursor-pointer"
							style="accent-color: var(--brand);"
						/>
					</div>
					<div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
						<span class="text-muted-foreground">Direction / premium</span>
						<span class="font-medium text-foreground tabular-nums">{execPct}% · {execN} veh</span>
					</div>
				</div>
			</div>

			<!-- Annual km -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<p class="text-sm font-medium text-foreground">Distance / véhicule / an</p>
					<span class="text-base font-bold text-foreground tabular-nums">{fmtN(annualKm)} km</span>
				</div>
				<input
					type="range"
					min="5000"
					max="60000"
					step="1000"
					bind:value={annualKm}
					class="w-full cursor-pointer"
					style="accent-color: var(--brand);"
				/>
				<div class="mt-1 flex justify-between text-xs text-muted-foreground">
					<span>5 000</span><span>Moyenne FR : 16 000</span><span>60 000</span>
				</div>
			</div>

			<!-- Energy mix -->
			<div>
				<p class="mb-3 text-sm font-medium text-foreground">Mix énergétique</p>
				<div class="space-y-4">
					<div>
						<div class="mb-1.5 flex justify-between text-xs">
							<span class="text-muted-foreground">Thermique</span>
							<span class="font-medium text-foreground tabular-nums">{thermalPct}%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							step="5"
							bind:value={thermalPct}
							class="w-full cursor-pointer"
							style="accent-color: var(--brand);"
						/>
					</div>
					<div>
						<div class="mb-1.5 flex justify-between text-xs">
							<span class="text-muted-foreground">Hybride (PHEV / HEV)</span>
							<span class="font-medium text-foreground tabular-nums"
								>{Math.min(hybridPct, 100 - thermalPct)}%</span
							>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							step="5"
							value={Math.min(hybridPct, 100 - thermalPct)}
							oninput={onHybridInput}
							class="w-full cursor-pointer"
							style="accent-color: var(--brand);"
						/>
					</div>
					<div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
						<span class="text-muted-foreground">Électrique (BEV)</span>
						<span class="font-medium text-foreground tabular-nums">{electricPct}%</span>
					</div>
				</div>
			</div>

			<!-- Current utilization -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<p class="text-sm font-medium text-foreground">Taux d'utilisation actuel</p>
					<span class="text-base font-bold text-foreground tabular-nums">{utilization}%</span>
				</div>
				<input
					type="range"
					min="30"
					max="90"
					step="5"
					bind:value={utilization}
					class="w-full cursor-pointer"
					style="accent-color: var(--brand);"
				/>
				<div class="mt-1 flex justify-between text-xs text-muted-foreground">
					<span>30%</span>
					<span>Secteur : 55–65 %</span>
					<span>90%</span>
				</div>
				<p class="mt-1.5 text-xs text-muted-foreground/70">
					% de jours ouvrés où le véhicule est effectivement utilisé
				</p>
			</div>
		</div>

		<!-- ─── RIGHT: Results ───────────────────────────────────────────── -->
		<div class="space-y-4">
			<!-- TCO Card -->
			<div
				class="rounded-2xl border border-border bg-card p-6"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
			>
				<p class="mb-1 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
					Coût total annuel estimé
				</p>

				<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span class="text-4xl font-bold tracking-tight text-foreground tabular-nums sm:text-5xl">
						{money(costs.total, 1000)}
					</span>
					<span class="text-sm text-muted-foreground">/ an</span>
				</div>

				<p class="mt-1 text-sm text-muted-foreground">
					soit <strong class="text-foreground">{money(costs.total / vehicleCount, 100)}</strong
					>&nbsp;/ véhicule / an &nbsp;·&nbsp;
					<strong class="text-foreground"
						>{money((costs.total / vehicleCount / Math.max(1, annualKm)) * 1000, 5)}</strong
					>&nbsp;/ 1 000 km
				</p>

				<!-- Stacked TCO bar -->
				<div
					class="mt-5 overflow-hidden rounded-full"
					style="height:6px; background: oklch(0.3 0 0 / 0.4);"
				>
					<div class="flex h-full">
						<div
							style="width:{pct(costs.leasing, costs.total)}%; background:{COLORS.leasing};"
						></div>
						<div style="width:{pct(costs.fuel, costs.total)}%;    background:{COLORS.fuel};"></div>
						<div style="width:{pct(costs.maint, costs.total)}%;   background:{COLORS.maint};"></div>
						<div style="width:{pct(costs.ins, costs.total)}%;     background:{COLORS.ins};"></div>
						<div style="width:{pct(costs.admin, costs.total)}%;   background:{COLORS.admin};"></div>
					</div>
				</div>

				<!-- Legend -->
				<div class="mt-4 grid gap-2 sm:grid-cols-2">
					{#each [{ label: 'Leasing / amortissement', val: costs.leasing, color: COLORS.leasing }, { label: 'Carburant / énergie', val: costs.fuel, color: COLORS.fuel }, { label: 'Entretien', val: costs.maint, color: COLORS.maint }, { label: 'Assurance', val: costs.ins, color: COLORS.ins }, { label: 'Admin & gestion flotte', val: costs.admin, color: COLORS.admin }] as item (item.label)}
						<div class="flex items-center justify-between gap-2 text-sm">
							<div class="flex min-w-0 items-center gap-2">
								<span class="size-2.5 shrink-0 rounded-full" style="background:{item.color};"
								></span>
								<span class="truncate text-muted-foreground">{item.label}</span>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<span class="text-xs text-muted-foreground/60 tabular-nums"
									>{pct(item.val, costs.total)}%</span
								>
								<span class="w-20 text-right font-medium text-foreground tabular-nums"
									>{money(item.val, 500)}</span
								>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Savings Card -->
			<div
				class="rounded-2xl border bg-card p-6"
				style="border-color: color-mix(in oklch, var(--brand) 30%, transparent); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
			>
				<p class="mb-5 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
					Potentiel d'économies avec Mycelium
				</p>

				<div class="space-y-4">
					<!-- Rightsizing -->
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-foreground">Optimisation de la flotte</p>
							{#if savings.vehs > 0}
								<p class="mt-0.5 text-xs text-muted-foreground">
									À {utilization}% d'utilisation, {savings.vehs} véhicule{savings.vehs > 1
										? 's'
										: ''} libérable{savings.vehs > 1 ? 's' : ''} sans perte de capacité
								</p>
							{:else}
								<p class="mt-0.5 text-xs text-muted-foreground">
									Taux d'utilisation déjà élevé — gains de mutualisation limités
								</p>
							{/if}
						</div>
						<span class="shrink-0 text-sm font-semibold text-[var(--brand)] tabular-nums">
							+{money(savings.rightsizing, 500)}
						</span>
					</div>

					<!-- Maintenance -->
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-foreground">Maintenance prédictive</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Alertes kilométrage + délais constructeur, -20 % de pannes imprévues
							</p>
						</div>
						<span class="shrink-0 text-sm font-semibold text-[var(--brand)] tabular-nums">
							+{money(savings.maint, 100)}
						</span>
					</div>

					<!-- Fuel -->
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-foreground">Éco-conduite</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Coach conducteur IA, rapports vitesse/freinage, -7 % consommation
							</p>
						</div>
						<span class="shrink-0 text-sm font-semibold text-[var(--brand)] tabular-nums">
							+{money(savings.fuel, 100)}
						</span>
					</div>

					<!-- Admin -->
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-foreground">Automatisation de la gestion</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Réservations, rapports CFO, relances entretien — 60 % du temps admin récupéré
							</p>
						</div>
						<span class="shrink-0 text-sm font-semibold text-[var(--brand)] tabular-nums">
							+{money(savings.admin, 200)}
						</span>
					</div>

					<!-- Compliance -->
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<p class="text-sm font-medium text-foreground">Infractions & conformité</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Imputation automatique conducteur, suivi permis, alertes BiK/CSRD
							</p>
						</div>
						<span class="shrink-0 text-sm font-semibold text-[var(--brand)] tabular-nums">
							+{money(savings.compliance, 100)}
						</span>
					</div>
				</div>

				<!-- Totals -->
				<div class="mt-5 space-y-2 border-t border-border pt-4">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Économies brutes estimées</span>
						<span class="font-semibold text-foreground tabular-nums"
							>{money(savings.total, 500)}</span
						>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground"
							>Mycelium {plan.name} ({money(plan.monthly, 10)}/mois)</span
						>
						<span class="text-muted-foreground tabular-nums">–{money(plan.annual, 100)}</span>
					</div>

					<div
						class="mt-3 flex items-center justify-between rounded-xl px-4 py-3"
						style="background: color-mix(in oklch, var(--brand) 12%, transparent);"
					>
						<span class="text-sm font-semibold text-foreground">Gain net annuel</span>
						<span class="text-2xl font-bold tabular-nums" style="color: var(--brand);">
							{money(netSavings, 500)}
						</span>
					</div>

					{#if roiMonths > 0}
						<p class="pt-0.5 text-center text-xs text-muted-foreground">
							Retour sur investissement dès le&nbsp;<strong class="text-foreground"
								>{roiMonths}{roiMonths === 1 ? 'er' : 'e'} mois</strong
							>
						</p>
					{/if}
				</div>

				<!-- CTA -->
				<div class="mt-5 space-y-2">
					<a
						href={resolve(localizedHref('/signup'))}
						class="flex h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
					>
						Démarrer l'essai gratuit 15 jours
					</a>
					<a
						href={resolve(localizedHref('/pricing'))}
						class="flex h-10 w-full items-center justify-center rounded-full border border-border text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
					>
						Voir les tarifs détaillés
					</a>
				</div>

				<p class="mt-4 text-center text-xs leading-relaxed text-muted-foreground/50">
					Estimations basées sur les benchmarks 2025–2026 (ALD, Arval, LeasePlan, Aberdeen Group).
					Les économies réelles varient selon le contexte opérationnel de votre flotte.
				</p>
			</div>
		</div>
	</div>
</div>
