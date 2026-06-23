<script lang="ts">
	import ChatVehicleCard from './ChatVehicleCard.svelte';
	import type { VehicleData } from './ChatVehicleCard.svelte';
	import CarIcon from '@lucide/svelte/icons/car';

	type Props = {
		vehicles: VehicleData[];
		startDate?: string;
		endDate?: string;
		onSelect: (vehicle: VehicleData) => void;
	};

	let { vehicles, startDate, endDate, onSelect }: Props = $props();

	function formatDate(dateStr: string) {
		try {
			return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
		} catch {
			return dateStr;
		}
	}
</script>

<div class="mt-2 flex flex-col gap-2">
	<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
		<CarIcon class="size-3.5" />
		<span>
			{vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} disponible{vehicles.length > 1
				? 's'
				: ''}
			{#if startDate && endDate}
				· {formatDate(startDate)} → {formatDate(endDate)}
			{/if}
		</span>
	</div>

	{#if vehicles.length === 0}
		<div
			class="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground"
		>
			Aucun véhicule disponible pour cette période.
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			{#each vehicles as vehicle (vehicle.id)}
				<ChatVehicleCard {vehicle} {onSelect} />
			{/each}
		</div>
	{/if}
</div>
