<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	export type Period = '7d' | '30d' | '90d' | '12m' | 'custom';

	interface Props {
		period: Period;
		customFrom: string;
		customTo: string;
		selectedSites: string[];
		availableSites: string[];
		onPeriodChange: (p: Period) => void;
		onCustomRangeChange: (from: string, to: string) => void;
		onSitesChange: (sites: string[]) => void;
	}

	let {
		period,
		customFrom,
		customTo,
		selectedSites,
		availableSites,
		onPeriodChange,
		onCustomRangeChange,
		onSitesChange
	}: Props = $props();

	const PERIODS: { value: Period; label: string }[] = [
		{ value: '7d', label: '7j' },
		{ value: '30d', label: '30j' },
		{ value: '90d', label: '90j' },
		{ value: '12m', label: '12m' },
		{ value: 'custom', label: 'Perso' }
	];

	const sitesLabel = $derived(
		selectedSites.length === 0
			? 'Tous les sites'
			: selectedSites.length === 1
				? selectedSites[0]
				: `${selectedSites.length} sites`
	);

	function toggleSite(site: string) {
		const next = selectedSites.includes(site)
			? selectedSites.filter((s) => s !== site)
			: [...selectedSites, site];
		onSitesChange(next);
	}

	function clearSites() {
		onSitesChange([]);
	}
</script>

<div class="flex items-center gap-2 flex-wrap">
	<!-- Period selector — segmented button group -->
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

	<!-- Custom date range — only shown when period = custom -->
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

	<!-- Sites multi-select — only shown if there are sites to filter -->
	{#if availableSites.length > 0}
		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors leading-none h-[30px]
							{selectedSites.length > 0
							? 'border-primary/50 bg-primary/8 text-primary'
							: 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'}"
					>
						<MapPinIcon class="size-3.5" />
						{sitesLabel}
						<ChevronDownIcon class="size-3.5 opacity-60" />
					</button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content align="end" class="w-48 p-1.5 gap-0">
				<div class="flex flex-col">
					{#each availableSites as site}
						<label
							class="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60 transition-colors"
						>
							<Checkbox
								checked={selectedSites.includes(site)}
								onCheckedChange={() => toggleSite(site)}
							/>
							<span class="truncate">{site}</span>
						</label>
					{/each}

					{#if selectedSites.length > 0}
						<div class="mt-1 border-t border-border pt-1">
							<button
								type="button"
								onclick={clearSites}
								class="w-full rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
							>
								Effacer la sélection
							</button>
						</div>
					{/if}
				</div>
			</Popover.Content>
		</Popover.Root>
	{/if}
</div>
