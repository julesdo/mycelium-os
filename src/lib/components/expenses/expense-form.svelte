<script lang="ts">
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { calculateMileageAmount, CATEGORY_LABELS, CURRENCY_SYMBOLS } from '$lib/convex/mileageRates.js';
	import type { VehicleCategory } from '$lib/convex/mileageRates.js';
	import CarIcon from '@lucide/svelte/icons/car';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import TruckIcon from '@lucide/svelte/icons/truck';

	interface Props {
		onsuccess?: () => void;
		oncancel?: () => void;
	}

	const { onsuccess, oncancel }: Props = $props();

	const client = useConvexClient();
	const rateConfigQuery = useQuery(api.expenses.getMileageRateConfig, {});

	// ── Form state ──────────────────────────────────────────────────────────────
	let date = $state(format(new Date(), 'yyyy-MM-dd'));
	let purpose = $state('');
	let departureLocation = $state('');
	let arrivalLocation = $state('');
	let roundTrip = $state(false);
	let distanceInput = $state('');
	let vehicleCategory = $state<VehicleCategory>('THERMAL');
	let vehicleDescription = $state('');
	let notes = $state('');
	let submitting = $state(false);

	const CATEGORIES: { value: VehicleCategory; icon: typeof ZapIcon; shortLabel: string }[] = [
		{ value: 'ELECTRIC', icon: ZapIcon,   shortLabel: 'Électrique' },
		{ value: 'HYBRID',   icon: FlameIcon, shortLabel: 'Hybride' },
		{ value: 'THERMAL',  icon: FlameIcon, shortLabel: 'Thermique' },
		{ value: 'UTILITY',  icon: TruckIcon, shortLabel: 'Utilitaire' }
	];

	// ── Live calculation ─────────────────────────────────────────────────────────
	const config = $derived(rateConfigQuery.data);
	const distanceUnit = $derived(config?.distanceUnit ?? 'km');
	const currency = $derived(config?.currency ?? 'EUR');
	const currencySymbol = $derived(CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency);

	const activeRate = $derived(
		config?.rates.find((r) => r.category === vehicleCategory)
	);

	const totalDistance = $derived(
		roundTrip ? (Number(distanceInput) || 0) * 2 : (Number(distanceInput) || 0)
	);

	const calculatedAmount = $derived(
		totalDistance > 0 && activeRate
			? calculateMileageAmount(totalDistance, activeRate.ratePerUnit)
			: 0
	);

	// ── Submit ──────────────────────────────────────────────────────────────────
	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!purpose.trim()) { toast.error("L'objet du déplacement est requis"); return; }
		if (!departureLocation.trim()) { toast.error('Le lieu de départ est requis'); return; }
		if (!arrivalLocation.trim()) { toast.error("Le lieu d'arrivée est requis"); return; }
		if (!distanceInput || Number(distanceInput) <= 0) {
			toast.error(`La distance doit être supérieure à 0 ${distanceUnit}`);
			return;
		}

		submitting = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).expenses.createExpense, {
				date,
				purpose: purpose.trim(),
				departureLocation: departureLocation.trim(),
				arrivalLocation: arrivalLocation.trim(),
				roundTrip,
				distance: Number(distanceInput),
				vehicleCategory,
				vehicleDescription: vehicleDescription.trim() || undefined,
				notes: notes.trim() || undefined
			});
			toast.success('Note de frais soumise avec succès');
			onsuccess?.();
		} catch {
			toast.error('Erreur lors de la soumission');
		} finally {
			submitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<!-- Date + Objet -->
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="date">Date du trajet</Label>
			<Input id="date" type="date" bind:value={date} max={format(new Date(), 'yyyy-MM-dd')} required />
		</div>
		<div class="space-y-2">
			<Label for="purpose">Objet professionnel <span class="text-destructive">*</span></Label>
			<Input id="purpose" type="text" bind:value={purpose} placeholder="Ex : Visite client Dupont SAS, réunion Lyon" required />
		</div>
	</div>

	<!-- Départ / Arrivée -->
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="departure">
				<MapPinIcon class="mr-1 inline size-3.5 text-muted-foreground" />
				Départ <span class="text-destructive">*</span>
			</Label>
			<Input id="departure" type="text" bind:value={departureLocation} placeholder="Ex : Paris 8e, siège social" required />
		</div>
		<div class="space-y-2">
			<Label for="arrival">
				<MapPinIcon class="mr-1 inline size-3.5 text-muted-foreground" />
				Arrivée <span class="text-destructive">*</span>
			</Label>
			<Input id="arrival" type="text" bind:value={arrivalLocation} placeholder="Ex : Versailles, client Dupont" required />
		</div>
	</div>

	<!-- Distance + Aller-retour -->
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="distance">Distance ({distanceUnit}) <span class="text-destructive">*</span></Label>
			<div class="relative">
				<Input
					id="distance"
					type="number"
					min="1"
					step="1"
					bind:value={distanceInput}
					placeholder="0"
					class="pr-12"
					required
				/>
				<span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{distanceUnit}</span>
			</div>
		</div>
		<div class="space-y-2">
			<Label>Aller-retour</Label>
			<div class="flex gap-2 pt-1">
				<button
					type="button"
					onclick={() => (roundTrip = false)}
					class="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-all {!roundTrip ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
				>
					<ArrowRightIcon class="size-3.5" />
					Simple
				</button>
				<button
					type="button"
					onclick={() => (roundTrip = true)}
					class="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-all {roundTrip ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
				>
					<RefreshCwIcon class="size-3.5" />
					Aller-retour
				</button>
			</div>
			{#if roundTrip && distanceInput}
				<p class="text-xs text-muted-foreground">{totalDistance} {distanceUnit} au total (× 2)</p>
			{/if}
		</div>
	</div>

	<!-- Catégorie de véhicule + Description -->
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="space-y-2">
			<Label>Type de véhicule <span class="text-destructive">*</span></Label>
			<div class="grid grid-cols-2 gap-2">
				{#each CATEGORIES as cat}
					<button
						type="button"
						onclick={() => (vehicleCategory = cat.value)}
						class="flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-all {vehicleCategory === cat.value ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]' : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
					>
						<cat.icon class="size-3.5" />
						{cat.shortLabel}
					</button>
				{/each}
			</div>
			{#if activeRate}
				<p class="text-xs text-muted-foreground">{activeRate.ratePerUnit.toFixed(3)} {currencySymbol}/{distanceUnit} · {activeRate.label ?? CATEGORY_LABELS[vehicleCategory]}</p>
			{/if}
		</div>
		<div class="space-y-2">
			<Label for="vehicle">Véhicule utilisé (optionnel)</Label>
			<div class="relative">
				<CarIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input id="vehicle" type="text" bind:value={vehicleDescription} placeholder="Ex : Tesla Model 3, Renault Clio…" class="pl-9" />
			</div>
		</div>
	</div>

	<!-- Calcul live -->
	{#if totalDistance > 0 && activeRate}
		<div class="relative overflow-hidden rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-4">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)]/40 to-transparent"></div>
			<div class="flex items-start gap-3">
				<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/15">
					<span class="text-sm font-black text-[var(--brand)]">{currencySymbol}</span>
				</div>
				<div class="flex-1">
					<p class="text-base font-bold text-[var(--brand)]">
						Indemnité calculée : <span class="font-mono tabular-nums text-xl">{calculatedAmount.toFixed(2)} {currencySymbol}</span>
					</p>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{totalDistance} {distanceUnit} × {activeRate.ratePerUnit.toFixed(3)} {currencySymbol}/{distanceUnit} · {activeRate.label ?? CATEGORY_LABELS[vehicleCategory]}
					</p>
				</div>
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
			<InfoIcon class="size-4 shrink-0" />
			Saisissez une distance pour voir l'indemnité calculée automatiquement
		</div>
	{/if}

	<!-- Notes -->
	<div class="space-y-2">
		<Label for="notes">Notes complémentaires (optionnel)</Label>
		<Textarea id="notes" bind:value={notes} placeholder="Informations supplémentaires pour le gestionnaire…" rows={2} />
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-3 pt-2">
		{#if oncancel}
			<Button type="button" variant="outline" onclick={oncancel} disabled={submitting}>
				Annuler
			</Button>
		{/if}
		<Button
			type="submit"
			disabled={submitting || totalDistance <= 0}
			class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 shadow-glass-brand"
		>
			{#if submitting}
				<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
				Envoi en cours…
			{:else}
				Soumettre la note →
			{/if}
		</Button>
	</div>
</form>
