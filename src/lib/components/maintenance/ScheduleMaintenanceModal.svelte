<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import GarageSelector from './GarageSelector.svelte';
	import { TYPE_LABELS } from './types.js';
	import type { MaintenanceType } from './types.js';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import SearchIcon from '@lucide/svelte/icons/search';

	interface Props {
		open: boolean;
		preselectedVehicleId?: string;
		onClose: () => void;
		onSuccess?: () => void;
	}

	let { open = $bindable(), preselectedVehicleId, onClose, onSuccess }: Props = $props();

	const client = useConvexClient();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehiclesQuery = useQuery((api as any).vehicles.listVehicles, {});
	const vehicles = $derived(vehiclesQuery.data ?? []);

	// ── Step state ────────────────────────────────────────────────────────────────
	let step = $state(1);
	const TOTAL_STEPS = 5;

	let selectedVehicleId = $state<string>(preselectedVehicleId ?? '');
	let selectedType = $state<MaintenanceType | ''>('');
	let selectedDate = $state<string>('');
	let selectedGarageId = $state<string | null>(null);
	let notes = $state('');
	let isSubmitting = $state(false);
	let vehicleSearch = $state('');

	$effect(() => {
		if (preselectedVehicleId) selectedVehicleId = preselectedVehicleId;
	});

	$effect(() => {
		if (!open) {
			step = 1;
			selectedVehicleId = preselectedVehicleId ?? '';
			selectedType = '';
			selectedDate = '';
			selectedGarageId = null;
			notes = '';
			isSubmitting = false;
			vehicleSearch = '';
		}
	});

	const selectedVehicle = $derived(vehicles.find((v: { _id: string }) => v._id === selectedVehicleId));

	const filteredVehicles = $derived.by(() => {
		const q = vehicleSearch.trim().toLowerCase();
		if (!q) return vehicles;
		return vehicles.filter(
			(v: { registration: string; brand: string; model: string }) =>
				v.registration.toLowerCase().includes(q) ||
				v.brand.toLowerCase().includes(q) ||
				v.model.toLowerCase().includes(q)
		);
	});

	const selectedGarageQuery = useQuery(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(api as any).garages.findNearbyGarages,
		{ zipcode: '75001', radius: 20 }
	);
	const selectedGarage = $derived(
		(selectedGarageQuery.data ?? []).find((g: { _id: string }) => g._id === selectedGarageId) ??
			null
	);

	const todayIso = new Date().toISOString().slice(0, 10);

	const canProceed = $derived.by(() => {
		if (step === 1) return !!selectedVehicleId;
		if (step === 2) return !!selectedType;
		if (step === 3) return !!selectedDate;
		if (step === 4) return true;
		return true;
	});

	function next() {
		if (step < TOTAL_STEPS && canProceed) step++;
	}

	function prev() {
		if (step > 1) step--;
	}

	function formatDateFr(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	async function confirm() {
		if (!selectedVehicleId || !selectedType || !selectedDate) return;
		isSubmitting = true;
		try {
			await client.mutation(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(api as any).maintenance.scheduleMaintenanceAndNotify,
				{
					vehicleId: selectedVehicleId,
					maintenanceType: selectedType,
					scheduledDate: new Date(selectedDate).getTime(),
					garageId: selectedGarageId ?? undefined,
					notes: notes || undefined
				}
			);
			toast.success('Entretien planifié avec succès');
			onSuccess?.();
			open = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la planification');
		} finally {
			isSubmitting = false;
		}
	}

	const typeOptions = (Object.keys(TYPE_LABELS) as MaintenanceType[]).map((k) => ({
		value: k,
		label: TYPE_LABELS[k]
	}));
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-h-[90vh] max-w-lg overflow-y-auto">
			<Dialog.Header>
				<div class="flex items-center gap-2">
					<WrenchIcon class="size-5 text-muted-foreground" />
					<Dialog.Title>Planifier un entretien</Dialog.Title>
				</div>
				<!-- Progress indicator -->
				<div class="mt-3 flex items-center gap-1.5">
					{#each Array(TOTAL_STEPS) as _, i (i)}
						<div
							class="h-1.5 flex-1 rounded-full transition-colors {i + 1 <= step
								? 'bg-primary'
								: 'bg-muted'}"
						></div>
					{/each}
				</div>
				<p class="mt-1 text-xs text-muted-foreground">Étape {step} sur {TOTAL_STEPS}</p>
			</Dialog.Header>

			<div class="mt-4 min-h-[240px]">
				<!-- Step 1: Vehicle -->
				{#if step === 1}
					<div class="flex flex-col gap-3">
						<h3 class="font-medium">Sélectionner un véhicule</h3>
						{#if vehiclesQuery.isLoading}
							<div class="h-32 animate-pulse rounded-lg bg-muted"></div>
						{:else}
							<div class="relative">
								<SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<input
									type="search"
									bind:value={vehicleSearch}
									placeholder="Immatriculation, marque, modèle…"
									class="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
							<div class="flex max-h-[260px] flex-col gap-2 overflow-y-auto">
								{#each filteredVehicles as vehicle (vehicle._id)}
									<button
										class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors
										{selectedVehicleId === vehicle._id
											? 'border-primary bg-primary/5'
											: 'border-border hover:bg-muted/20'}"
										onclick={() => (selectedVehicleId = vehicle._id)}
									>
										<div
											class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold"
										>
											{vehicle.registration.slice(0, 2)}
										</div>
										<div>
											<p class="font-mono text-sm font-medium">{vehicle.registration}</p>
											<p class="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
										</div>
										{#if selectedVehicleId === vehicle._id}
											<CheckCircleIcon class="ml-auto size-4 text-primary" />
										{/if}
									</button>
								{:else}
									<p class="py-6 text-center text-sm text-muted-foreground">
										Aucun véhicule ne correspond à « {vehicleSearch} »
									</p>
								{/each}
							</div>
						{/if}
					</div>

				<!-- Step 2: Type -->
				{:else if step === 2}
					<div class="flex flex-col gap-3">
						<h3 class="font-medium">Type d'entretien</h3>
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{#each typeOptions as opt (opt.value)}
								<button
									class="flex flex-col items-center justify-center rounded-lg border p-4 text-center transition-colors
									{selectedType === opt.value
										? 'border-primary bg-primary/5 ring-1 ring-primary/30'
										: 'border-border hover:bg-muted/20'}"
									onclick={() => (selectedType = opt.value)}
								>
									<WrenchIcon class="mb-2 size-5 {selectedType === opt.value ? 'text-primary' : 'text-muted-foreground'}" />
									<span class="text-sm font-medium">{opt.label}</span>
								</button>
							{/each}
						</div>
					</div>

				<!-- Step 3: Date -->
				{:else if step === 3}
					<div class="flex flex-col gap-3">
						<h3 class="font-medium">Date souhaitée</h3>
						<p class="text-sm text-muted-foreground">
							Choisissez la date à laquelle vous souhaitez planifier l'entretien.
						</p>
						<input
							type="date"
							bind:value={selectedDate}
							min={todayIso}
							class="h-10 w-full rounded-md border border-border bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
						/>
						{#if selectedDate}
							<p class="text-sm text-muted-foreground">
								{formatDateFr(selectedDate)}
							</p>
						{/if}

						<div class="mt-2">
							<label for="modal-notes" class="text-sm font-medium">Notes (optionnel)</label>
							<textarea
								id="modal-notes"
								bind:value={notes}
								placeholder="Informations supplémentaires pour le garage…"
								rows={3}
								class="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
							></textarea>
						</div>
					</div>

				<!-- Step 4: Garage -->
				{:else if step === 4}
					<div class="flex flex-col gap-3">
						<h3 class="font-medium">Choisir un garage</h3>
						<p class="text-sm text-muted-foreground">
							Sélectionnez le garage parmi ceux disponibles (optionnel).
						</p>
						<GarageSelector
							selectedId={selectedGarageId}
							maintenanceType={selectedType}
							onSelect={(id) => (selectedGarageId = selectedGarageId === id ? null : id)}
						/>
					</div>

				<!-- Step 5: Recap -->
				{:else if step === 5}
					<div class="flex flex-col gap-4">
						<h3 class="font-medium">Récapitulatif</h3>
						<div class="rounded-lg border border-border bg-muted/30 p-4">
							<dl class="flex flex-col gap-3">
								<div class="flex items-start justify-between gap-2">
									<dt class="text-sm text-muted-foreground">Véhicule</dt>
									<dd class="text-right text-sm font-medium">
										{selectedVehicle?.registration ?? '—'}
										<span class="block text-xs text-muted-foreground">
											{selectedVehicle?.brand} {selectedVehicle?.model}
										</span>
									</dd>
								</div>
								<div class="flex items-center justify-between gap-2">
									<dt class="text-sm text-muted-foreground">Type</dt>
									<dd class="text-sm font-medium">{selectedType ? TYPE_LABELS[selectedType as MaintenanceType] : '—'}</dd>
								</div>
								<div class="flex items-center justify-between gap-2">
									<dt class="text-sm text-muted-foreground">Date</dt>
									<dd class="text-sm font-medium">{selectedDate ? formatDateFr(selectedDate) : '—'}</dd>
								</div>
								<div class="flex items-start justify-between gap-2">
									<dt class="text-sm text-muted-foreground">Garage</dt>
									<dd class="text-right text-sm font-medium">
										{selectedGarage?.name ?? 'Non sélectionné'}
										{#if selectedGarage?.city}
											<span class="block text-xs text-muted-foreground">{selectedGarage.city}</span>
										{/if}
									</dd>
								</div>
								{#if notes}
									<div class="flex items-start justify-between gap-2">
										<dt class="text-sm text-muted-foreground">Notes</dt>
										<dd class="max-w-[200px] text-right text-sm">{notes}</dd>
									</div>
								{/if}
							</dl>
						</div>

						{#if selectedGarage?.email}
							<p class="text-xs text-muted-foreground">
								Un email sera envoyé à <strong>{selectedGarage.email}</strong> pour confirmer le rendez-vous.
							</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer actions -->
			<div class="mt-6 flex items-center justify-between border-t border-border pt-4">
				<Button variant="ghost" size="sm" onclick={step === 1 ? onClose : prev}>
					{#if step === 1}
						Annuler
					{:else}
						<ChevronLeftIcon class="mr-1 size-4" />
						Retour
					{/if}
				</Button>

				{#if step < TOTAL_STEPS}
					<Button size="sm" onclick={next} disabled={!canProceed} class="gap-1.5">
						Suivant
						<ChevronRightIcon class="size-4" />
					</Button>
				{:else}
					<Button
						size="sm"
						onclick={confirm}
						disabled={isSubmitting}
						class="gap-1.5"
					>
						{#if isSubmitting}
							<span class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></span>
						{:else}
							<CheckCircleIcon class="size-4" />
						{/if}
						Confirmer le rendez-vous
					</Button>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
