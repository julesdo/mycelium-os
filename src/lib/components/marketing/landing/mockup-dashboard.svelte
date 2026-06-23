<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { TrendingUp } from '@lucide/svelte';

	const { t } = getTranslate();

	const bars = [0.6, 0.8, 0.5, 0.9, 0.7, 0.85, 0.4, 0.75, 0.9, 0.65, 0.8, 0.95, 0.7, 0.82];
</script>

<div class="w-full max-w-xs space-y-3">
	<!-- KPI accent -->
	<div
		class="relative overflow-hidden rounded-xl bg-[var(--brand)] p-5 text-[var(--brand-foreground)]"
		style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.3);"
	>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
		></div>
		<p class="font-mono text-3xl font-bold tracking-tight">82%</p>
		<p class="mt-1 text-sm font-medium">{$t('landing.features.mock.utilization')}</p>
		<p class="mt-0.5 flex items-center gap-1 text-xs opacity-80">
			<TrendingUp class="size-3" />
			+12% {$t('landing.features.mock.vs_last_month')}
		</p>
	</div>

	<!-- KPIs secondaires -->
	<div class="grid grid-cols-2 gap-3">
		<div class="rounded-xl border border-border bg-card p-4">
			<p class="font-mono text-xl font-bold text-foreground">3</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('landing.features.mock.maint_due')}</p>
		</div>
		<div class="rounded-xl border border-border bg-card p-4">
			<p class="font-mono text-xl font-bold text-foreground">12 480€</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('landing.features.mock.costs_month')}</p>
		</div>
	</div>

	<!-- Mini graphique -->
	<div class="rounded-xl border border-border bg-card p-4">
		<div class="mb-3 flex items-center justify-between">
			<p class="text-xs font-semibold text-foreground">{$t('landing.features.mock.util_14d')}</p>
			<p class="text-xs text-muted-foreground">{$t('landing.features.mock.vehicles_per_day')}</p>
		</div>
		<div class="flex h-10 items-end gap-1">
			{#each bars as h, i (i)}
				<div
					class="flex-1 rounded-sm"
					style="height: {h * 100}%; background: oklch(0.92 0.23 103 / {0.35 + h * 0.55});"
				></div>
			{/each}
		</div>
	</div>
</div>
