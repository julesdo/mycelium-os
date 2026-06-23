<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import FilterIcon from '@lucide/svelte/icons/filter';
	import XIcon from '@lucide/svelte/icons/x';
	import type { MaintenanceType } from './types.js';
	import { TYPE_LABELS } from './types.js';

	interface Props {
		search: string;
		selectedTypes: Set<MaintenanceType>;
		garageFilter: string;
		vehicleFilter: string;
		onSearchChange: (v: string) => void;
		onTypeToggle: (t: MaintenanceType) => void;
		onGarageChange: (v: string) => void;
		onVehicleChange: (v: string) => void;
		onClear: () => void;
	}

	let {
		search,
		selectedTypes,
		garageFilter,
		vehicleFilter,
		onSearchChange,
		onTypeToggle,
		onGarageChange,
		onVehicleChange,
		onClear
	}: Props = $props();

	const typeOptions = (Object.keys(TYPE_LABELS) as MaintenanceType[]).map((v) => ({
		value: v,
		label: TYPE_LABELS[v]
	}));

	const hasActiveFilters = $derived(
		selectedTypes.size > 0 || garageFilter.length > 0 || vehicleFilter.length > 0
	);

	const typeLabel = $derived(
		selectedTypes.size === 0
			? 'Type'
			: selectedTypes.size === 1
				? (typeOptions.find((o) => selectedTypes.has(o.value))?.label ?? 'Type')
				: `${selectedTypes.size} types`
	);
</script>

<div class="flex flex-wrap items-center gap-2">
	<!-- Search -->
	<div class="relative">
		<SearchIcon class="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="search"
			placeholder="Véhicule, garage…"
			value={search}
			oninput={(e) => onSearchChange((e.currentTarget as HTMLInputElement).value)}
			class="h-8 w-52 pl-8 text-sm"
		/>
	</div>

	<!-- Type filter -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					variant="outline"
					size="sm"
					class="h-8 gap-1.5 {selectedTypes.size > 0 ? 'border-foreground/50' : ''}"
					{...props}
				>
					<FilterIcon class="size-3.5" />
					{typeLabel}
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="w-44">
			{#each typeOptions as opt (opt.value)}
				<DropdownMenu.CheckboxItem
					checked={selectedTypes.has(opt.value)}
					onCheckedChange={() => onTypeToggle(opt.value)}
				>
					{opt.label}
				</DropdownMenu.CheckboxItem>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<!-- Garage filter -->
	<Input
		type="text"
		placeholder="Garage"
		value={garageFilter}
		oninput={(e) => onGarageChange((e.currentTarget as HTMLInputElement).value)}
		class="h-8 w-36 text-sm"
	/>

	<!-- Vehicle filter -->
	<Input
		type="text"
		placeholder="Véhicule (immat.)"
		value={vehicleFilter}
		oninput={(e) => onVehicleChange((e.currentTarget as HTMLInputElement).value)}
		class="h-8 w-40 text-sm"
	/>

	<!-- Clear -->
	{#if hasActiveFilters}
		<Button variant="ghost" size="sm" class="h-8 px-2 text-muted-foreground" onclick={onClear}>
			<XIcon class="mr-1 size-3.5" />
			Réinitialiser
		</Button>
	{/if}
</div>
