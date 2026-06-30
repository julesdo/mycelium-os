<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Calculator from '@lucide/svelte/icons/calculator';

	// Sample profile — "PME type 30 véhicules France"
	const SAMPLE = {
		vehicles: 30,
		tco: 302_000,
		savings: 38_000,
		net: 32_000,
		roi: 2,
		plan: 'Essential',
		planCost: 490
	};

	function fmt(n: number) {
		return n.toLocaleString('fr-FR');
	}
</script>

<section class="py-20 sm:py-28">
	<div class="mx-auto max-w-6xl px-6 sm:px-8">
		<div class="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
			<!-- Left: copy -->
			<div>
				<div class="mb-5 flex items-center gap-2.5">
					<span class="h-px w-6 bg-[var(--brand)]"></span>
					<span class="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
						Outil gratuit
					</span>
				</div>

				<h2 class="text-[1.6rem] font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
					Quel est le coût réel de votre flotte ?
				</h2>
				<p class="mt-4 text-base leading-relaxed text-muted-foreground">
					Renseignez la taille de votre flotte, votre mix véhicules et votre taux d'utilisation.
					Obtenez instantanément votre TCO annuel, vos leviers d'économies et votre ROI estimé.
				</p>

				<!-- Sample inputs as chips -->
				<div class="mt-6 flex flex-wrap gap-2">
					{#each ['30 véhicules', 'France', '20 000 km / veh / an', '70 % thermique', '55 % utilisation'] as chip (chip)}
						<span
							class="inline-flex h-7 items-center rounded-full border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground"
						>
							{chip}
						</span>
					{/each}
				</div>

				<div class="mt-8 flex flex-wrap items-center gap-3">
					<a
						href={resolve(localizedHref('/simulator'))}
						class="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--brand)] px-6 text-sm font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
					>
						<Calculator class="size-4" />
						Calculer les économies de ma flotte
					</a>
					<p class="text-xs text-muted-foreground">Sans inscription · 2 minutes</p>
				</div>
			</div>

			<!-- Right: sample output card -->
			<div
				class="relative rounded-2xl border border-border bg-card p-6 sm:p-8"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
			>
				<!-- Label -->
				<div class="mb-6 flex items-center justify-between">
					<p class="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
						Exemple · {SAMPLE.vehicles} véhicules · France
					</p>
					<span
						class="inline-flex h-5 items-center rounded-full bg-[var(--brand)]/15 px-2 text-[10px] font-semibold text-[var(--brand)]"
					>
						Estimatif
					</span>
				</div>

				<!-- TCO headline -->
				<div class="mb-6">
					<p class="text-xs text-muted-foreground">Coût total annuel estimé</p>
					<p
						class="mt-0.5 text-3xl font-bold tracking-tight text-foreground tabular-nums sm:text-4xl"
					>
						{fmt(SAMPLE.tco)} €
					</p>
					<p class="mt-1 text-sm text-muted-foreground">
						soit {fmt(Math.round(SAMPLE.tco / SAMPLE.vehicles))} €&nbsp;/ véhicule / an
					</p>
				</div>

				<!-- Cost bar breakdown -->
				<div
					class="mb-6 overflow-hidden rounded-full"
					style="height:5px; background: oklch(0.5 0 0 / 0.15);"
				>
					<div class="flex h-full">
						<div style="width:54%; background:#818cf8;"></div>
						<div style="width:18%; background:#34d399;"></div>
						<div style="width:14%; background:#fbbf24;"></div>
						<div style="width:10%; background:#f87171;"></div>
						<div style="width:4%; background:#c084fc;"></div>
					</div>
				</div>
				<div class="mb-6 flex flex-wrap gap-x-4 gap-y-1.5">
					{#each [{ label: 'Leasing', color: '#818cf8' }, { label: 'Carburant', color: '#34d399' }, { label: 'Entretien', color: '#fbbf24' }, { label: 'Assurance', color: '#f87171' }, { label: 'Admin', color: '#c084fc' }] as item (item.label)}
						<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
							<span class="size-2 rounded-full" style="background:{item.color};"></span>
							{item.label}
						</div>
					{/each}
				</div>

				<!-- Divider -->
				<div class="mb-5 h-px bg-border"></div>

				<!-- Savings rows -->
				<div class="space-y-3">
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Économies brutes estimées</span>
						<span class="font-semibold text-foreground">+{fmt(SAMPLE.savings)} €</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground"
							>Mycelium {SAMPLE.plan} ({SAMPLE.planCost} €/mois)</span
						>
						<span class="text-muted-foreground">−{fmt(SAMPLE.planCost * 12)} €</span>
					</div>
				</div>

				<!-- Net gain highlight -->
				<div
					class="mt-4 flex items-center justify-between rounded-xl px-4 py-3.5"
					style="background: color-mix(in oklch, var(--brand) 12%, transparent);"
				>
					<div class="flex items-center gap-2">
						<TrendingDown class="size-4" style="color: var(--brand);" />
						<span class="text-sm font-semibold text-foreground">Gain net annuel</span>
					</div>
					<span class="text-2xl font-bold tabular-nums" style="color: var(--brand);">
						+{fmt(SAMPLE.net)} €
					</span>
				</div>

				<p class="mt-3 text-center text-xs text-muted-foreground/60">
					ROI estimé dès le {SAMPLE.roi}e mois · Basé sur benchmarks ALD/Arval/LeasePlan 2025–2026
				</p>

				<!-- CTA link -->
				<a
					href={resolve(localizedHref('/simulator'))}
					class="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--brand)] transition-opacity hover:opacity-70"
				>
					Calculer avec ma flotte réelle
					<ArrowRight class="size-3.5" />
				</a>
			</div>
		</div>
	</div>
</section>
