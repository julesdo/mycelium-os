<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import XIcon from '@lucide/svelte/icons/x';

	type Energy = 'THERMAL' | 'HYBRID' | 'ELECTRIC';

	interface Props {
		search: string;
		selectedEnergies: Set<Energy>;
		location: string;
		onSearchChange: (v: string) => void;
		onEnergyToggle: (e: Energy) => void;
		onLocationChange: (v: string) => void;
		onClear: () => void;
	}

	let {
		search,
		selectedEnergies,
		location,
		onSearchChange,
		onEnergyToggle,
		onLocationChange,
		onClear
	}: Props = $props();

	const energyOptions: { value: Energy; label: string }[] = [
		{ value: 'THERMAL', label: 'Thermique' },
		{ value: 'HYBRID', label: 'Hybride' },
		{ value: 'ELECTRIC', label: 'Électrique' }
	];

	const hasActiveFilters = $derived(
		selectedEnergies.size > 0 || location.length > 0 || search.length > 0
	);

	const energyLabel = $derived(
		selectedEnergies.size === 0
			? 'Énergie'
			: selectedEnergies.size === 1
				? (energyOptions.find((o) => selectedEnergies.has(o.value))?.label ?? 'Énergie')
				: `${selectedEnergies.size} énergies`
	);
</script>

<div class="flex flex-wrap items-center gap-2">
	<!-- Recherche -->
	<div class="relative">
		<SearchIcon class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="search"
			placeholder="Immat., marque, modèle…"
			value={search}
			oninput={(e) => onSearchChange((e.currentTarget as HTMLInputElement).value)}
			class="h-8 w-56 pl-8 text-sm"
		/>
	</div>

	<!-- Filtre énergie -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					variant="outline"
					size="sm"
					class="h-8 gap-1.5 {selectedEnergies.size > 0 ? 'border-foreground/40 bg-muted/60' : ''}"
					{...props}
				>
					<ZapIcon class="size-3.5" />
					{energyLabel}
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="w-40">
			{#each energyOptions as opt (opt.value)}
				<DropdownMenu.CheckboxItem
					checked={selectedEnergies.has(opt.value)}
					onCheckedChange={() => onEnergyToggle(opt.value)}
				>
					{opt.label}
				</DropdownMenu.CheckboxItem>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<!-- Filtre site / localisation -->
	<Input
		type="text"
		placeholder="Site / Localisation"
		value={location}
		oninput={(e) => onLocationChange((e.currentTarget as HTMLInputElement).value)}
		class="h-8 w-44 text-sm"
	/>

	<!-- Réinitialiser -->
	{#if hasActiveFilters}
		<Button variant="ghost" size="sm" class="h-8 px-2 text-muted-foreground" onclick={onClear}>
			<XIcon class="mr-1 size-3.5" />
			Réinitialiser
		</Button>
	{/if}
</div>
