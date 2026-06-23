<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import XIcon from '@lucide/svelte/icons/x';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	export type StepperSearchParams = {
		startDate: number;
		endDate: number;
		location?: string;
		purpose?: string;
	};

	type Props = {
		locations?: string[];
		onSearch: (params: StepperSearchParams) => void;
		onClose: () => void;
		onSendText?: () => void;
		hasInputText?: boolean;
		prefill?: {
			startDate?: string;
			endDate?: string;
			location?: string;
			purpose?: string;
		};
	};

	let {
		locations = [],
		onSearch,
		onClose,
		onSendText,
		hasInputText = false,
		prefill = {}
	}: Props = $props();

	const PURPOSES = ['RDV client', 'Déplacement', 'Formation', 'Autre'] as const;

	let startDate = $state(prefill.startDate ?? '');
	let endDate = $state(prefill.endDate ?? '');
	let location = $state(prefill.location ?? '');
	let purpose = $state(prefill.purpose ?? '');
	let purposeCustom = $state('');
	let activeStep = $state<'dates' | 'site' | 'purpose'>('dates');

	const today = new Date().toISOString().split('T')[0];
	const multiSite = $derived(locations.length > 1);
	const datesFilled = $derived(!!startDate && !!endDate);
	const canSearch = $derived(datesFilled);

	const fmtDate = (d: string) =>
		new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

	// Auto-advance when dates are both filled
	$effect(() => {
		if (datesFilled && activeStep === 'dates') {
			activeStep = multiSite ? 'site' : 'purpose';
		}
	});

	function selectLocation(loc: string) {
		location = location === loc ? '' : loc;
		if (location) activeStep = 'purpose';
	}

	function skipSite() {
		location = '';
		activeStep = 'purpose';
	}

	function selectPurpose(p: string) {
		purpose = purpose === p ? '' : p;
	}

	function doSearch() {
		if (!startDate || !endDate) return;
		const s = new Date(startDate);
		s.setHours(9, 0, 0, 0);
		const e = new Date(endDate);
		e.setHours(19, 0, 0, 0);
		const finalPurpose = purpose === 'Autre' ? purposeCustom.trim() : purpose;
		onSearch({
			startDate: s.getTime(),
			endDate: e.getTime(),
			location: location || undefined,
			purpose: finalPurpose || undefined
		});
	}

	const steps = $derived([
		{
			id: 'dates' as const,
			label: datesFilled ? `${fmtDate(startDate)} → ${fmtDate(endDate)}` : 'Dates',
			done: datesFilled,
			enabled: true
		},
		...(multiSite
			? [
					{
						id: 'site' as const,
						label: location || 'Site',
						done: !!location,
						enabled: datesFilled
					}
				]
			: []),
		{
			id: 'purpose' as const,
			label: purpose || 'Objet',
			done: !!purpose,
			enabled: datesFilled
		}
	]);
</script>

<div class="rounded-xl border bg-background">
	<!-- Step pills nav -->
	<div class="flex items-center gap-1.5 border-b px-3 py-2">
		{#each steps as step, i}
			{#if i > 0}
				<ChevronRightIcon class="size-3 shrink-0 text-muted-foreground/50" />
			{/if}
			<button
				onclick={() => step.enabled && (activeStep = step.id)}
				disabled={!step.enabled}
				aria-label="Étape : {step.label}{step.done ? ' (complété)' : ''}{activeStep === step.id ? ' (actif)' : ''}"
				aria-current={activeStep === step.id ? 'step' : undefined}
				class={cn(
					'rounded-full px-2.5 py-0.5 text-xs font-medium transition-all',
					activeStep === step.id
						? 'bg-primary/10 text-primary ring-1 ring-primary/30'
						: step.done
							? 'bg-muted text-foreground'
							: 'text-muted-foreground',
					!step.enabled && 'cursor-default opacity-40'
				)}
			>
				{step.label}
			</button>
		{/each}
		<div class="flex-1"></div>
		<button
			onclick={onClose}
			class="text-muted-foreground transition-colors hover:text-foreground"
			aria-label="Fermer"
		>
			<XIcon class="size-3.5" />
		</button>
	</div>

	<!-- Step content -->
	<div class="px-3 pb-3 pt-2.5">
		{#if activeStep === 'dates'}
			<div class="flex gap-2">
				<div class="flex min-w-0 flex-1 items-center gap-1.5">
					<label for="st-start" class="shrink-0 text-xs text-muted-foreground">Du</label>
					<input
						id="st-start"
						type="date"
						bind:value={startDate}
						min={today}
						class="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/50"
					/>
				</div>
				<div class="flex min-w-0 flex-1 items-center gap-1.5">
					<label for="st-end" class="shrink-0 text-xs text-muted-foreground">Au</label>
					<input
						id="st-end"
						type="date"
						bind:value={endDate}
						min={startDate || today}
						class="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/50"
					/>
				</div>
			</div>

		{:else if activeStep === 'site'}
			<div class="flex flex-wrap gap-1.5">
				{#each locations as loc}
					<button
						onclick={() => selectLocation(loc)}
						class={cn(
							'rounded-full border px-3 py-1 text-xs transition-colors',
							location === loc
								? 'border-primary/50 bg-primary/10 text-primary'
								: 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
						)}
					>{loc}</button>
				{/each}
				<button
					onclick={skipSite}
					class="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
				>
					Tous les sites
				</button>
			</div>

		{:else if activeStep === 'purpose'}
			<div class="flex flex-wrap gap-1.5">
				{#each PURPOSES as p}
					<button
						onclick={() => selectPurpose(p)}
						class={cn(
							'rounded-full border px-3 py-1 text-xs transition-colors',
							purpose === p
								? 'border-primary/50 bg-primary/10 text-primary'
								: 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
						)}
					>{p}</button>
				{/each}
			</div>
			{#if purpose === 'Autre'}
				<input
					type="text"
					bind:value={purposeCustom}
					placeholder="Préciser l'objet..."
					class="mt-2 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/50"
				/>
			{/if}
		{/if}

		{#if canSearch && activeStep !== 'dates'}
			<Button size="sm" class="mt-2.5 w-full" onclick={doSearch}>
				Rechercher les disponibilités
			</Button>
		{/if}

		{#if hasInputText && onSendText}
			<button
				onclick={onSendText}
				class="mt-2 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				Envoyer en texte libre →
			</button>
		{/if}
	</div>
</div>
