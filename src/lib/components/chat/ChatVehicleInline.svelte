<script lang="ts">
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

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
		totalFound: number;
		startDate?: string;
		endDate?: string;
		onSelect: (vehicle: VehicleData) => void;
		onAlt: () => void;
	};

	let { vehicle, totalFound, startDate, endDate, onSelect, onAlt }: Props = $props();

	const energyLabel: Record<'THERMAL' | 'HYBRID' | 'ELECTRIC', string> = {
		THERMAL: 'Thermique',
		HYBRID: 'Hybride',
		ELECTRIC: 'Électrique'
	};

	const categoryLabel: Record<'PASSENGER' | 'UTILITY' | 'TRUCK', string> = {
		PASSENGER: 'Tourisme',
		UTILITY: 'Utilitaire',
		TRUCK: 'Camion'
	};

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
		} catch {
			return iso;
		}
	}
</script>

<div class="flex flex-col gap-2.5">
	<!-- Vehicle card inside bubble -->
	<div class="rounded-xl bg-white/8 px-3 py-3 ring-1 ring-white/12">
		<div class="mb-2 flex items-start justify-between gap-2">
			<div>
				<span class="text-sm font-semibold text-[oklch(0.97_0_0)]">
					{vehicle.brand} {vehicle.model}
				</span>
				{#if vehicle.year}
					<span class="ml-1.5 text-xs text-[oklch(0.60_0_0)]">{vehicle.year}</span>
				{/if}
			</div>
			<span class="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-[oklch(0.65_0_0)]">
				{vehicle.registration}
			</span>
		</div>

		<div class="mb-2.5 flex flex-wrap items-center gap-2">
			<span class="text-xs text-[oklch(0.60_0_0)]">{energyLabel[vehicle.energy]}</span>
			<span class="text-[oklch(0.40_0_0)]">·</span>
			<span class="text-xs text-[oklch(0.60_0_0)]">{categoryLabel[vehicle.category]}</span>
			{#if vehicle.location}
				<span class="text-[oklch(0.40_0_0)]">·</span>
				<span class="flex items-center gap-1 text-xs text-[oklch(0.60_0_0)]">
					<MapPinIcon class="size-3" />
					{vehicle.location}
				</span>
			{/if}
		</div>

		{#if startDate && endDate}
			<div class="mb-2.5 flex items-center gap-1.5 text-xs text-[oklch(0.55_0_0)]">
				<CalendarIcon class="size-3" />
				{formatDate(startDate)} → {formatDate(endDate)}
			</div>
		{/if}

		<button
			onclick={() => onSelect(vehicle)}
			class="w-full rounded-lg bg-[oklch(0.60_0.18_230)] py-1.5 text-xs font-medium text-[oklch(0.97_0_0)] transition-opacity hover:opacity-90 focus-visible:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
		>
			Réserver ce véhicule
		</button>
	</div>

	{#if totalFound > 1}
		<button
			onclick={onAlt}
			class="text-center text-xs text-[oklch(0.45_0_0)] transition-colors hover:text-[oklch(0.65_0_0)] focus-visible:text-[oklch(0.65_0_0)] focus-visible:outline-none"
		>
			{totalFound - 1} autre{totalFound > 2 ? 's' : ''} option{totalFound > 2 ? 's' : ''} disponible{totalFound > 2 ? 's' : ''}
		</button>
	{/if}
</div>
