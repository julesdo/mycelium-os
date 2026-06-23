<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';

	const { t } = getTranslate();

	const rows = [
		{
			name: 'Peugeot 3008',
			plate: 'AB-423-CD',
			statusKey: 'landing.features.mock.status_available',
			color: 'oklch(0.72 0.19 150)'
		},
		{
			name: 'Renault Clio V',
			plate: 'EF-789-GH',
			statusKey: 'landing.features.mock.status_mission',
			color: 'oklch(0.80 0.16 80)'
		},
		{
			name: 'Citroën C5 X',
			plate: 'IJ-012-KL',
			statusKey: 'landing.features.mock.status_available',
			color: 'oklch(0.72 0.19 150)'
		},
		{
			name: 'Toyota Yaris',
			plate: 'MN-345-OP',
			statusKey: 'landing.features.mock.status_maintenance',
			color: 'oklch(0.64 0.22 25)'
		},
		{
			name: 'DS 7 Crossback',
			plate: 'QR-678-ST',
			statusKey: 'landing.features.mock.status_available',
			color: 'oklch(0.72 0.19 150)'
		}
	];
</script>

<div
	class="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-glass-card"
>
	<div class="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
		<span class="text-xs font-semibold text-foreground"
			>{$t('landing.features.mock.fleet_title')}</span
		>
		<span
			class="rounded-full bg-[oklch(0.72_0.19_150_/_0.14)] px-2.5 py-0.5 text-xs font-medium text-[oklch(0.45_0.16_150)] dark:text-[oklch(0.78_0.18_150)]"
		>
			{$t('landing.features.mock.available_badge')}
		</span>
	</div>
	{#each rows as v (v.plate)}
		<div class="flex items-center gap-3 border-b border-border/30 px-4 py-3 last:border-0">
			<span class="size-2 shrink-0 rounded-full" style="background: {v.color};"></span>
			<div class="min-w-0 flex-1">
				<p class="truncate text-xs font-medium text-foreground">{v.name}</p>
				<p class="font-mono text-[0.7rem] text-muted-foreground/70">{v.plate}</p>
			</div>
			<span class="shrink-0 text-xs" style="color: {v.color};">{$t(v.statusKey)}</span>
		</div>
	{/each}
</div>
