<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	type Props = {
		onSearch: (query: string) => void;
		disabled?: boolean;
	};

	let { onSearch, disabled = false }: Props = $props();

	let expanded = $state(false);
	let startDate = $state('');
	let endDate = $state('');
	let category: '' | 'PASSENGER' | 'UTILITY' | 'TRUCK' = $state('');

	const categories = [
		{ value: 'PASSENGER' as const, label: 'Tourisme' },
		{ value: 'UTILITY' as const, label: 'Utilitaire' },
		{ value: 'TRUCK' as const, label: 'Camion' }
	];

	const today = new Date().toISOString().split('T')[0];

	function handleSearch() {
		if (!startDate || !endDate) return;

		const fmt = (d: string) =>
			new Date(d).toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});

		let query = `Quels véhicules sont disponibles du ${fmt(startDate)} au ${fmt(endDate)}`;
		if (category) {
			const cat = categories.find((c) => c.value === category);
			if (cat) query += ` (type : ${cat.label})`;
		}
		query += ' ?';

		onSearch(query);
		expanded = false;
		startDate = '';
		endDate = '';
		category = '';
	}

	function close() {
		expanded = false;
		startDate = '';
		endDate = '';
		category = '';
	}

	const canSearch = $derived(!!startDate && !!endDate);
</script>

{#if !expanded}
	<button
		onclick={() => (expanded = true)}
		{disabled}
		class={cn(
			'flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors',
			'hover:border-primary/40 hover:text-foreground',
			disabled && 'cursor-not-allowed opacity-50'
		)}
	>
		<CalendarIcon class="size-3" />
		Préciser des dates
	</button>
{:else}
	<div class="flex flex-col gap-2.5 rounded-xl border bg-muted/40 p-3">
		<div class="flex items-center justify-between">
			<span class="text-xs font-medium">Dates de réservation</span>
			<button
				onclick={close}
				class="text-muted-foreground transition-colors hover:text-foreground"
				aria-label="Fermer"
			>
				<XIcon class="size-3.5" />
			</button>
		</div>

		<div class="flex flex-wrap gap-2">
			<div class="flex min-w-0 flex-1 items-center gap-1.5">
				<label for="date-start" class="shrink-0 text-xs text-muted-foreground">Du</label>
				<input
					id="date-start"
					type="date"
					bind:value={startDate}
					min={today}
					class="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/50"
				/>
			</div>
			<div class="flex min-w-0 flex-1 items-center gap-1.5">
				<label for="date-end" class="shrink-0 text-xs text-muted-foreground">Au</label>
				<input
					id="date-end"
					type="date"
					bind:value={endDate}
					min={startDate || today}
					class="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring/50"
				/>
			</div>
		</div>

		<div class="flex flex-wrap gap-1.5">
			<button
				onclick={() => (category = '')}
				class={cn(
					'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
					category === ''
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
				)}
			>
				Tous
			</button>
			{#each categories as cat}
				<button
					onclick={() => (category = category === cat.value ? '' : cat.value)}
					class={cn(
						'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
						category === cat.value
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
					)}
				>
					{cat.label}
				</button>
			{/each}
		</div>

		<Button size="sm" class="w-full" disabled={!canSearch || disabled} onclick={handleSearch}>
			Rechercher les disponibilités
		</Button>
	</div>
{/if}
