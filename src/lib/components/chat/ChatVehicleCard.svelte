<script lang="ts">
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import { Button } from '$lib/components/ui/button';

	export type VehicleData = {
		id: string;
		brand: string;
		model: string;
		registration: string;
		year?: number;
		label: string;
		category: 'PASSENGER' | 'UTILITY' | 'TRUCK';
		energy: 'THERMAL' | 'HYBRID' | 'ELECTRIC';
		location: string | null;
	};

	type Props = {
		vehicle: VehicleData;
		onSelect: (vehicle: VehicleData) => void;
	};

	let { vehicle, onSelect }: Props = $props();

	const categoryLabel: Record<'PASSENGER' | 'UTILITY' | 'TRUCK', string> = {
		PASSENGER: 'Tourisme',
		UTILITY: 'Utilitaire',
		TRUCK: 'Camion'
	};

	const energyConfig: Record<'THERMAL' | 'HYBRID' | 'ELECTRIC', { label: string; classes: string }> = {
		THERMAL: {
			label: 'Thermique',
			classes:
				'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20'
		},
		HYBRID: {
			label: 'Hybride',
			classes:
				'bg-blue-50 text-blue-700 ring-blue-700/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20'
		},
		ELECTRIC: {
			label: 'Électrique',
			classes:
				'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20'
		}
	};
</script>

<div
	class="flex flex-col gap-2.5 rounded-xl border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm"
>
	<div class="flex items-start justify-between gap-2">
		<div class="flex flex-col gap-0.5">
			<span class="text-sm font-semibold leading-tight">{vehicle.brand} {vehicle.model}</span>
			{#if vehicle.year}
				<span class="text-xs text-muted-foreground">{vehicle.year}</span>
			{/if}
		</div>
		<span class="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
			{vehicle.registration}
		</span>
	</div>

	<div class="flex flex-wrap items-center gap-1.5">
		<span
			class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset {energyConfig[
				vehicle.energy
			].classes}"
		>
			{energyConfig[vehicle.energy].label}
		</span>
		<span class="text-xs text-muted-foreground">{categoryLabel[vehicle.category]}</span>
		{#if vehicle.location}
			<span class="flex items-center gap-1 text-xs text-muted-foreground">
				<MapPinIcon class="size-3" />
				{vehicle.location}
			</span>
		{/if}
	</div>

	<Button variant="outline" size="sm" class="w-full text-xs" onclick={() => onSelect(vehicle)}>
		Réserver ce véhicule
	</Button>
</div>
