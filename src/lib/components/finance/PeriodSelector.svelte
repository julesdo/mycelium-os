<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import type { FinancePeriod } from './period-utils.js';

	interface Props {
		period: FinancePeriod;
		customFrom: string;
		customTo: string;
		onPeriodChange: (p: FinancePeriod) => void;
		onCustomRangeChange: (from: string, to: string) => void;
	}

	let { period, customFrom, customTo, onPeriodChange, onCustomRangeChange }: Props = $props();

	const PERIODS: { value: FinancePeriod; label: string }[] = [
		{ value: 'month', label: 'Ce mois' },
		{ value: 'quarter', label: 'Trimestre' },
		{ value: 'year', label: 'Année' },
		{ value: 'custom', label: 'Perso' }
	];
</script>

<div class="flex items-center gap-2 flex-wrap">
	<div
		class="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-sm"
		role="group"
		aria-label="Sélecteur de période"
	>
		{#each PERIODS as p}
			<button
				type="button"
				onclick={() => onPeriodChange(p.value)}
				aria-pressed={period === p.value}
				class="rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors leading-none
					{period === p.value
					? 'bg-background text-foreground shadow-xs'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{p.label}
			</button>
		{/each}
	</div>

	{#if period === 'custom'}
		<div class="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
			<CalendarIcon class="size-3.5 text-muted-foreground" />
			<input
				type="date"
				value={customFrom}
				max={customTo || undefined}
				onchange={(e) => onCustomRangeChange((e.currentTarget as HTMLInputElement).value, customTo)}
				class="bg-transparent text-xs outline-none w-28 text-foreground"
			/>
			<span class="text-muted-foreground">→</span>
			<input
				type="date"
				value={customTo}
				min={customFrom || undefined}
				onchange={(e) => onCustomRangeChange(customFrom, (e.currentTarget as HTMLInputElement).value)}
				class="bg-transparent text-xs outline-none w-28 text-foreground"
			/>
		</div>
	{/if}
</div>
