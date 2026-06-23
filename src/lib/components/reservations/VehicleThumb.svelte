<script lang="ts">
	import CarIcon from '@lucide/svelte/icons/car';
	import { getVehicleImageUrl } from '$lib/utils/vehicle-image.js';

	type Props = { brand: string; model: string };
	let { brand, model }: Props = $props();

	let imgError = $state(false);
	const src = $derived(getVehicleImageUrl(brand, model));
</script>

<div class="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-800 to-slate-700">
	{#if !imgError}
		<img
			{src}
			alt="{brand} {model}"
			class="absolute inset-0 h-full w-full object-cover object-center"
			onerror={() => (imgError = true)}
			loading="lazy"
		/>
	{/if}
	{#if imgError}
		<div class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/30">
			<CarIcon class="size-7" />
			<span class="text-[9px] font-semibold uppercase tracking-widest">{brand}</span>
		</div>
	{/if}
</div>
