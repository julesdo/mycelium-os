<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import type { Id } from '$lib/convex/_generated/dataModel.js';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import CarIcon from '@lucide/svelte/icons/car';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { toast } from 'svelte-sonner';
	import VehicleThumb from './VehicleThumb.svelte';

	type Props = {
		open: boolean;
		onClose: () => void;
		onCreated?: () => void;
	};

	let { open = $bindable(), onClose, onCreated }: Props = $props();

	const client = useConvexClient();

	let startDateStr = $state('');
	let endDateStr = $state('');
	let selectedVehicleId = $state('');
	let purpose = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let error = $state('');

	const startTs = $derived(startDateStr ? new Date(startDateStr).getTime() : null);
	const endTs = $derived(endDateStr ? new Date(endDateStr).getTime() : null);
	const hasValidDates = $derived(
		startTs !== null && endTs !== null && !isNaN(startTs) && !isNaN(endTs) && endTs > startTs
	);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehiclesQuery = useQuery((api as any).reservations.searchAvailableVehicles, () =>
		hasValidDates ? { startDate: startTs!, endDate: endTs! } : 'skip'
	);

	const vehicles = $derived(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(vehiclesQuery.data as any[] | undefined) ?? []
	);

	$effect(() => {
		if (vehicles.length > 0 && !vehicles.find((v) => v._id === selectedVehicleId)) {
			selectedVehicleId = '';
		}
	});

	$effect(() => {
		if (!open) {
			startDateStr = '';
			endDateStr = '';
			selectedVehicleId = '';
			purpose = '';
			notes = '';
			error = '';
		}
	});

	const ENERGY_CONFIG: Record<string, { label: string; class: string }> = {
		THERMAL: { label: 'Thermique', class: 'bg-muted text-muted-foreground' },
		HYBRID: {
			label: 'Hybride',
			class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
		},
		ELECTRIC: {
			label: 'Électrique',
			class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
		}
	};

	function formatDate(ts: number) {
		return format(new Date(ts), 'd MMM yyyy', { locale: fr });
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!hasValidDates || !selectedVehicleId || !purpose.trim()) {
			error = 'Veuillez remplir tous les champs obligatoires.';
			return;
		}

		submitting = true;
		error = '';
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.createReservation, {
				vehicleId: selectedVehicleId as Id<'vehicles'>,
				startDate: startTs!,
				endDate: endTs!,
				purpose: purpose.trim(),
				notes: notes.trim() || undefined
			});
			toast.success('Réservation confirmée');
			open = false;
			onClose();
			onCreated?.();
		} catch (err) {
			const code = (err as { data?: { code?: string } }).data?.code;
			error =
				code === 'VEHICLE_NOT_AVAILABLE'
					? "Ce véhicule vient d'être réservé. Veuillez en choisir un autre."
					: 'Erreur inattendue. Veuillez réessayer.';
		} finally {
			submitting = false;
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={(v) => { if (!v) onClose(); }}>
	<Sheet.Content side="right" class="flex w-full flex-col sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title>Nouvelle réservation</Sheet.Title>
			<Sheet.Description>Choisissez vos dates pour voir les véhicules disponibles.</Sheet.Description>
		</Sheet.Header>

		<form onsubmit={handleSubmit} class="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
			<!-- Dates -->
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="rs-start">Départ *</Label>
					<Input id="rs-start" type="datetime-local" bind:value={startDateStr} required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="rs-end">Retour *</Label>
					<Input
						id="rs-end"
						type="datetime-local"
						bind:value={endDateStr}
						min={startDateStr}
						required
					/>
				</div>
			</div>

			{#if startDateStr && endDateStr && !hasValidDates}
				<p class="text-xs text-destructive">La date de retour doit être après le départ.</p>
			{/if}

			<!-- Véhicules disponibles -->
			{#if hasValidDates}
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between">
						<Label>Véhicule *</Label>
						{#if vehiclesQuery.isLoading}
							<span class="text-[11px] text-muted-foreground">Recherche…</span>
						{:else}
							<span class="text-[11px] text-muted-foreground">
								{vehicles.length} disponible{vehicles.length !== 1 ? 's' : ''}
								· {formatDate(startTs!)} → {formatDate(endTs!)}
							</span>
						{/if}
					</div>

					{#if vehiclesQuery.isLoading}
						<div class="grid grid-cols-2 gap-2">
							{#each [1, 2, 3, 4] as i (i)}
								<div class="overflow-hidden rounded-xl border border-border">
									<div class="aspect-video animate-pulse bg-muted"></div>
									<div class="space-y-1.5 p-2.5">
										<div class="h-3.5 w-20 animate-pulse rounded bg-muted"></div>
										<div class="h-3 w-14 animate-pulse rounded bg-muted"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else if vehicles.length === 0}
						<div class="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/30 py-8 text-center">
							<CarIcon class="size-8 text-muted-foreground/50" />
							<p class="text-sm font-medium text-muted-foreground">Aucun véhicule disponible</p>
							<p class="text-xs text-muted-foreground">Essayez d'autres dates.</p>
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-2">
							{#each vehicles as v (v._id)}
								{@const isSelected = selectedVehicleId === v._id}
								{@const energyCfg = ENERGY_CONFIG[v.energy] ?? ENERGY_CONFIG.THERMAL}
								<button
									type="button"
									class="group relative overflow-hidden rounded-xl border text-left transition-all {isSelected
										? 'border-primary shadow-sm ring-1 ring-primary/20'
										: 'border-border hover:border-primary/50 hover:shadow-sm'}"
									onclick={() => (selectedVehicleId = v._id)}
								>
									<VehicleThumb brand={v.brand} model={v.model} />

									<div class="p-2.5">
										<p class="text-[13px] font-semibold leading-tight">{v.brand}</p>
										<p class="text-[12px] text-muted-foreground">{v.model}</p>
										<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
											<span class="rounded-full px-1.5 py-0.5 text-[10px] font-medium {energyCfg.class}">
												{energyCfg.label}
											</span>
											{#if v.location}
												<span class="flex items-center gap-0.5 text-[10px] text-muted-foreground">
													<MapPinIcon class="size-2.5" />{v.location}
												</span>
											{/if}
										</div>
									</div>

									{#if isSelected}
										<div class="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
											<CheckIcon class="size-3" strokeWidth={3} />
										</div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Motif -->
			<div class="flex flex-col gap-1.5">
				<Label for="rs-purpose">Motif *</Label>
				<Input
					id="rs-purpose"
					bind:value={purpose}
					placeholder="Ex : Visite client Marseille"
					required
				/>
			</div>

			<!-- Notes -->
			<div class="flex flex-col gap-1.5">
				<Label for="rs-notes">Notes</Label>
				<Textarea id="rs-notes" bind:value={notes} placeholder="Informations complémentaires…" rows={2} />
			</div>

			{#if error}
				<p class="text-xs text-destructive">{error}</p>
			{/if}

			<div class="mt-auto flex gap-2">
				<Button type="button" variant="outline" class="flex-1" onclick={onClose} disabled={submitting}>
					Annuler
				</Button>
				<Button
					type="submit"
					class="flex-1"
					disabled={submitting || !hasValidDates || !selectedVehicleId || !purpose.trim()}
					loading={submitting}
				>
					{submitting ? 'Confirmation…' : 'Confirmer'}
				</Button>
			</div>
		</form>
	</Sheet.Content>
</Sheet.Root>
