<script lang="ts">
	import { cn } from '$lib/utils';

	export type InfoRequestFields = {
		needsStartDate: boolean;
		needsEndDate: boolean;
		needsLocation: boolean;
		needsPurpose: boolean;
		knownStartDate?: string;
		knownEndDate?: string;
		knownLocation?: string;
	};

	export type InfoRequestSubmitParams = {
		startDate: number;
		endDate: number;
		location?: string;
		purpose?: string;
	};

	type Props = {
		fields: InfoRequestFields;
		locations?: string[];
		onSubmit: (params: InfoRequestSubmitParams) => void;
	};

	let { fields, locations = [], onSubmit }: Props = $props();

	const PURPOSES = ['RDV client', 'Déplacement', 'Formation', 'Autre'] as const;
	const HOURS = ['6h', '7h', '8h', '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h', '22h'];

	let startDate = $state(fields.knownStartDate ?? '');
	let endDate = $state(fields.knownEndDate ?? '');
	let startHour = $state('9h');
	let endHour = $state('19h');
	let location = $state(fields.knownLocation ?? '');
	let purpose = $state('');
	let purposeCustom = $state('');

	const today = new Date().toISOString().split('T')[0];
	const canSubmit = $derived(!!startDate && !!endDate);

	function hourToMs(dateStr: string, hour: string): number {
		const h = parseInt(hour);
		const d = new Date(dateStr);
		d.setHours(h, 0, 0, 0);
		return d.getTime();
	}

	function doSubmit() {
		if (!startDate || !endDate) return;
		const finalPurpose = purpose === 'Autre' ? purposeCustom.trim() : purpose;
		onSubmit({
			startDate: hourToMs(startDate, startHour),
			endDate: hourToMs(endDate, endHour),
			location: location || undefined,
			purpose: finalPurpose || undefined
		});
	}

	const darkInput = [
		'rounded-lg px-2 py-1 text-xs outline-none',
		'bg-white/8 border border-white/12 text-white/80',
		'focus:ring-1 focus:ring-white/25 w-full min-w-0'
	].join(' ');

	const darkSelect = [
		'rounded-lg px-1.5 py-1 text-xs outline-none appearance-none cursor-pointer',
		'bg-white/8 border border-white/12 text-white/70',
		'focus:ring-1 focus:ring-white/25'
	].join(' ');

	const chipBase = 'rounded-full border px-2.5 py-0.5 text-xs transition-colors cursor-pointer';
	const chipOff = 'border-white/15 text-white/50 hover:border-white/35 hover:text-white/80';
	const chipOn = 'border-white/45 bg-white/12 text-white/90';
</script>

<div class="mt-2.5 flex flex-col gap-3 rounded-xl bg-white/6 p-3 ring-1 ring-white/10">
	{#if fields.needsStartDate || fields.needsEndDate}
		<div class="grid grid-cols-2 gap-2">
			<!-- Start -->
			<div class="flex flex-col gap-1">
				<span class="text-[10px] uppercase tracking-wide text-[oklch(0.55_0_0)]">Départ</span>
				<input type="date" bind:value={startDate} min={today} class={darkInput} />
				<select bind:value={startHour} class={darkSelect}>
					{#each HOURS as h}
						<option value={h}>{h}</option>
					{/each}
				</select>
			</div>
			<!-- End -->
			<div class="flex flex-col gap-1">
				<span class="text-[10px] uppercase tracking-wide text-[oklch(0.55_0_0)]">Retour</span>
				<input type="date" bind:value={endDate} min={startDate || today} class={darkInput} />
				<select bind:value={endHour} class={darkSelect}>
					{#each HOURS as h}
						<option value={h}>{h}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

	{#if fields.needsLocation && locations.length > 1}
		<div>
			<p class="mb-1.5 text-[10px] uppercase tracking-wide text-[oklch(0.55_0_0)]">Site de départ</p>
			<div class="flex flex-wrap gap-1.5">
				{#each locations as loc}
					<button
						onclick={() => { location = location === loc ? '' : loc; }}
						class={cn(chipBase, location === loc ? chipOn : chipOff)}
					>{loc}</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if fields.needsPurpose}
		<div>
			<p class="mb-1.5 text-[10px] uppercase tracking-wide text-[oklch(0.55_0_0)]">Objet</p>
			<div class="flex flex-wrap gap-1.5">
				{#each PURPOSES as p}
					<button
						onclick={() => { purpose = purpose === p ? '' : p; }}
						class={cn(chipBase, purpose === p ? chipOn : chipOff)}
					>{p}</button>
				{/each}
			</div>
			{#if purpose === 'Autre'}
				<input type="text" bind:value={purposeCustom} placeholder="Préciser..." class="{darkInput} mt-1.5" />
			{/if}
		</div>
	{/if}

	<button
		onclick={doSubmit}
		disabled={!canSubmit}
		class="w-full rounded-lg bg-[oklch(0.60_0.18_230)] py-1.5 text-xs font-medium text-[oklch(0.97_0_0)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
	>
		Rechercher les disponibilités
	</button>
</div>
