<script lang="ts">
	import type { VehicleProposalWidget } from './types.js';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { getVehicleImageUrl } from '$lib/utils/vehicle-image.js';

	let { data, onSelect, onAlt }: {
		data: VehicleProposalWidget;
		onSelect?: (vehicleId: string, startDate?: string, endDate?: string) => void;
		onAlt?: () => void;
	} = $props();

	const ENERGY_LABELS: Record<string, string> = {
		THERMAL: 'Thermique', HYBRID: 'Hybride', ELECTRIC: 'Électrique'
	};
	const CATEGORY_LABELS: Record<string, string> = {
		PASSENGER: 'Tourisme', UTILITY: 'Utilitaire', TRUCK: 'Camion'
	};

	function formatDate(iso: string) {
		try {
			return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
		} catch { return iso; }
	}

	const imgSrc = $derived(getVehicleImageUrl(data.vehicle.brand, data.vehicle.model));
</script>

<div class="flex flex-col gap-2">
	<div class="relative overflow-hidden rounded-xl border border-border bg-card shadow-glass-card">
		<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"></div>

		<!-- Vehicle image strip -->
		<div class="relative h-24 bg-gradient-to-br from-slate-800 to-slate-950">
			<img
				src={imgSrc}
				alt="{data.vehicle.brand} {data.vehicle.model}"
				class="absolute inset-0 h-full w-full object-cover opacity-60"
				onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
			<div class="absolute bottom-2 left-3">
				<p class="text-sm font-bold text-white">{data.vehicle.brand} {data.vehicle.model}</p>
				<p class="font-mono text-[10px] text-white/50">{data.vehicle.registration}</p>
			</div>
		</div>

		<div class="p-3">
			<!-- Tags -->
			<div class="mb-3 flex flex-wrap gap-1.5">
				<span class="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{ENERGY_LABELS[data.vehicle.energy]}</span>
				<span class="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{CATEGORY_LABELS[data.vehicle.category]}</span>
				{#if data.vehicle.location}
					<span class="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
						<MapPinIcon class="size-2.5" />{data.vehicle.location}
					</span>
				{/if}
			</div>

			<!-- Dates -->
			{#if data.startDate && data.endDate}
				<div class="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
					<CalendarIcon class="size-3" />
					{formatDate(data.startDate)} → {formatDate(data.endDate)}
				</div>
			{/if}

			<!-- CTA -->
			<button
				onclick={() => onSelect?.(data.vehicle.id, data.startDate, data.endDate)}
				class="w-full rounded-lg bg-[var(--brand)] py-2 text-xs font-bold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.25)"
			>
				Réserver ce véhicule
			</button>
		</div>
	</div>

	{#if data.totalFound > 1}
		<button
			onclick={() => onAlt?.()}
			class="text-center text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
		>
			{data.totalFound - 1} autre{data.totalFound > 2 ? 's' : ''} option{data.totalFound > 2 ? 's' : ''} disponible{data.totalFound > 2 ? 's' : ''}
		</button>
	{/if}
</div>
