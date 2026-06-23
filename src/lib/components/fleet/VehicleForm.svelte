<script lang="ts">
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	type Energy = 'THERMAL' | 'HYBRID' | 'ELECTRIC';
	type Category = 'PASSENGER' | 'UTILITY' | 'TRUCK';
	type Status = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';

	interface Vehicle {
		_id: string;
		registration: string;
		brand: string;
		model: string;
		year: number;
		energy: Energy;
		category: Category;
		kilometers?: number;
		purchaseDate?: string;
		leaseEndDate?: string;
		location?: string;
		notes?: string;
		status: Status;
	}

	interface Props {
		mode: 'create' | 'edit';
		initial?: Partial<Vehicle>;
		onSuccess: (vehicleId: string) => void;
		onCancel?: () => void;
		disabled?: boolean;
	}

	let { mode, initial, onSuccess, onCancel, disabled = false }: Props = $props();

	const client = useConvexClient();

	const currentYear = new Date().getFullYear();

	const energyOptions: { value: Energy; label: string }[] = [
		{ value: 'THERMAL', label: 'Thermique' },
		{ value: 'HYBRID', label: 'Hybride' },
		{ value: 'ELECTRIC', label: 'Electrique' }
	];

	const categoryOptions: { value: Category; label: string }[] = [
		{ value: 'PASSENGER', label: 'Tourisme' },
		{ value: 'UTILITY', label: 'Utilitaire' },
		{ value: 'TRUCK', label: 'Camion' }
	];

	// Capture initial prop values once to avoid reactive re-initialization
	const iv = untrack(() => initial ?? {});
	let registration = $state(iv.registration ?? '');
	let vin = $state((iv as { vin?: string }).vin ?? '');
	let brand = $state(iv.brand ?? '');
	let model = $state(iv.model ?? '');
	let year = $state<string>(iv.year?.toString() ?? '');
	let energy = $state<Energy | ''>(iv.energy ?? '');
	let category = $state<Category | ''>(iv.category ?? '');
	let kilometers = $state<string>(iv.kilometers?.toString() ?? '');
	let purchaseDate = $state(iv.purchaseDate ?? '');
	let leaseEndDate = $state(iv.leaseEndDate ?? '');
	let location = $state(iv.location ?? '');
	let notes = $state(iv.notes ?? '');
	let ctExpiryDate = $state((iv as { ctExpiryDate?: string }).ctExpiryDate ?? '');
	let insuranceExpiryDate = $state((iv as { insuranceExpiryDate?: string }).insuranceExpiryDate ?? '');
	let insurerName = $state((iv as { insurerName?: string }).insurerName ?? '');
	let policyNumber = $state((iv as { policyNumber?: string }).policyNumber ?? '');

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	function formatRegistration(raw: string): string {
		const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (cleaned.length <= 2) return cleaned;
		if (cleaned.length <= 5) return cleaned.slice(0, 2) + '-' + cleaned.slice(2);
		return cleaned.slice(0, 2) + '-' + cleaned.slice(2, 5) + '-' + cleaned.slice(5, 7);
	}

	function handleRegistrationInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const formatted = formatRegistration(input.value);
		registration = formatted;
		input.value = formatted;
	}

	function validate(): boolean {
		const errs: Record<string, string> = {};

		if (!registration.trim()) {
			errs.registration = "L'immatriculation est obligatoire";
		}
		if (!brand.trim()) {
			errs.brand = 'La marque est obligatoire';
		}
		if (!model.trim()) {
			errs.model = 'Le modele est obligatoire';
		}
		const yearNum = parseInt(year, 10);
		if (!year || isNaN(yearNum) || yearNum < 1990 || yearNum > currentYear + 1) {
			errs.year = `L'annee doit etre comprise entre 1990 et ${currentYear + 1}`;
		}
		if (!energy) {
			errs.energy = "L'energie est obligatoire";
		}
		if (!category) {
			errs.category = 'La categorie est obligatoire';
		}
		if (kilometers && parseFloat(kilometers) < 0) {
			errs.kilometers = 'Le kilometrage ne peut pas etre negatif';
		}

		errors = errs;
		return Object.keys(errs).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		isSubmitting = true;
		try {
			const fields = {
				registration: registration.trim(),
				vin: vin.trim().toUpperCase() || undefined,
				brand: brand.trim(),
				model: model.trim(),
				year: parseInt(year, 10),
				energy: energy as Energy,
				category: category as Category,
				kilometers: kilometers ? parseInt(kilometers, 10) : undefined,
				purchaseDate: purchaseDate || undefined,
				leaseEndDate: leaseEndDate || undefined,
				location: location.trim() || undefined,
				notes: notes.trim() || undefined,
				ctExpiryDate: ctExpiryDate || undefined,
				insuranceExpiryDate: insuranceExpiryDate || undefined,
				insurerName: insurerName.trim() || undefined,
				policyNumber: policyNumber.trim() || undefined
			};

			if (mode === 'create') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const id = (await client.mutation((api as any).vehicles.createVehicle, fields)) as string;
				toast.success('Vehicule cree avec succes');
				onSuccess(id);
			} else if (initial?._id) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await client.mutation((api as any).vehicles.updateVehicle, {
					vehicleId: initial._id,
					...fields
				});
				toast.success('Vehicule mis a jour');
				onSuccess(initial._id);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
		} finally {
			isSubmitting = false;
		}
	}

	const isDisabled = $derived(disabled || isSubmitting);
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-8">
	<!-- Section Identite -->
	<div class="flex flex-col gap-4">
		<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
			Identite du vehicule
		</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field.Group>
				<Field.Field>
					<Field.Label for="registration">
						Immatriculation <span class="text-destructive">*</span>
					</Field.Label>
					<Input
						id="registration"
						type="text"
						value={registration}
						oninput={handleRegistrationInput}
						placeholder="AB-123-CD"
						maxlength={9}
						disabled={isDisabled}
						aria-invalid={!!errors.registration}
						class="font-mono uppercase"
					/>
					{#if errors.registration}
						<Field.Error errors={[{ message: errors.registration }]} />
					{/if}
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="vin">
						VIN
						<span class="ml-1 text-[10px] font-normal text-muted-foreground">(requis pour Smartcar)</span>
					</Field.Label>
					<Input
						id="vin"
						type="text"
						bind:value={vin}
						placeholder="Ex : VF1RFD00X56789012"
						maxlength={17}
						disabled={isDisabled}
						class="font-mono uppercase"
						oninput={(e) => { vin = (e.target as HTMLInputElement).value.toUpperCase(); }}
					/>
					<Field.Description>Numéro d'identification du véhicule (17 caractères)</Field.Description>
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="year">
						Annee <span class="text-destructive">*</span>
					</Field.Label>
					<Input
						id="year"
						type="number"
						bind:value={year}
						placeholder={currentYear.toString()}
						min={1990}
						max={currentYear + 1}
						disabled={isDisabled}
						aria-invalid={!!errors.year}
					/>
					{#if errors.year}
						<Field.Error errors={[{ message: errors.year }]} />
					{/if}
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="brand">
						Marque <span class="text-destructive">*</span>
					</Field.Label>
					<Input
						id="brand"
						type="text"
						bind:value={brand}
						placeholder="Ex : Renault"
						disabled={isDisabled}
						aria-invalid={!!errors.brand}
					/>
					{#if errors.brand}
						<Field.Error errors={[{ message: errors.brand }]} />
					{/if}
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="model">
						Modele <span class="text-destructive">*</span>
					</Field.Label>
					<Input
						id="model"
						type="text"
						bind:value={model}
						placeholder="Ex : Clio"
						disabled={isDisabled}
						aria-invalid={!!errors.model}
					/>
					{#if errors.model}
						<Field.Error errors={[{ message: errors.model }]} />
					{/if}
				</Field.Field>
			</Field.Group>
		</div>
	</div>

	<!-- Section Caracteristiques -->
	<div class="flex flex-col gap-4">
		<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
			Caracteristiques
		</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field.Group>
				<Field.Field>
					<Field.Label>
						Energie <span class="text-destructive">*</span>
					</Field.Label>
					<Select.Root
						type="single"
						value={energy}
						onValueChange={(v) => (energy = v as Energy)}
						disabled={isDisabled}
					>
						<Select.Trigger class="w-full" aria-invalid={!!errors.energy}>
							{energyOptions.find((o) => o.value === energy)?.label ?? 'Selectionner'}
						</Select.Trigger>
						<Select.Content>
							{#each energyOptions as opt (opt.value)}
								<Select.Item value={opt.value}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if errors.energy}
						<Field.Error errors={[{ message: errors.energy }]} />
					{/if}
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label>
						Categorie <span class="text-destructive">*</span>
					</Field.Label>
					<Select.Root
						type="single"
						value={category}
						onValueChange={(v) => (category = v as Category)}
						disabled={isDisabled}
					>
						<Select.Trigger class="w-full" aria-invalid={!!errors.category}>
							{categoryOptions.find((o) => o.value === category)?.label ?? 'Selectionner'}
						</Select.Trigger>
						<Select.Content>
							{#each categoryOptions as opt (opt.value)}
								<Select.Item value={opt.value}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if errors.category}
						<Field.Error errors={[{ message: errors.category }]} />
					{/if}
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="kilometers">Kilometrage actuel</Field.Label>
					<Input
						id="kilometers"
						type="number"
						bind:value={kilometers}
						placeholder="Ex : 45000"
						min={0}
						disabled={isDisabled}
						aria-invalid={!!errors.kilometers}
					/>
					{#if errors.kilometers}
						<Field.Error errors={[{ message: errors.kilometers }]} />
					{/if}
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="purchase-date">Date d'achat</Field.Label>
					<Input
						id="purchase-date"
						type="date"
						bind:value={purchaseDate}
						disabled={isDisabled}
					/>
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="lease-end-date">Fin de leasing</Field.Label>
					<Input
						id="lease-end-date"
						type="date"
						bind:value={leaseEndDate}
						disabled={isDisabled}
					/>
				</Field.Field>
			</Field.Group>
		</div>
	</div>

	<!-- Section Conformite -->
	<div class="flex flex-col gap-4">
		<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
			Conformite & Assurance
		</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field.Group>
				<Field.Field>
					<Field.Label for="ct-expiry">Controle technique — expiration</Field.Label>
					<Input
						id="ct-expiry"
						type="date"
						bind:value={ctExpiryDate}
						disabled={isDisabled}
					/>
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="insurance-expiry">Assurance — expiration</Field.Label>
					<Input
						id="insurance-expiry"
						type="date"
						bind:value={insuranceExpiryDate}
						disabled={isDisabled}
					/>
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="insurer-name">Assureur</Field.Label>
					<Input
						id="insurer-name"
						type="text"
						bind:value={insurerName}
						placeholder="Ex : AXA, Allianz..."
						disabled={isDisabled}
					/>
				</Field.Field>
			</Field.Group>

			<Field.Group>
				<Field.Field>
					<Field.Label for="policy-number">Numero de police</Field.Label>
					<Input
						id="policy-number"
						type="text"
						bind:value={policyNumber}
						placeholder="Ex : POL-2024-001"
						disabled={isDisabled}
					/>
				</Field.Field>
			</Field.Group>
		</div>
	</div>

	<!-- Section Localisation & Notes -->
	<div class="flex flex-col gap-4">
		<h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
			Localisation & Notes
		</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field.Group>
				<Field.Field>
					<Field.Label for="location">Site / Localisation</Field.Label>
					<Input
						id="location"
						type="text"
						bind:value={location}
						placeholder="Ex : Paris - Siege"
						disabled={isDisabled}
					/>
				</Field.Field>
			</Field.Group>
		</div>

		<Field.Group>
			<Field.Field>
				<Field.Label for="notes">Notes</Field.Label>
				<Textarea
					id="notes"
					bind:value={notes}
					placeholder="Informations complementaires..."
					rows={4}
					disabled={isDisabled}
				/>
			</Field.Field>
		</Field.Group>
	</div>

	<!-- Footer actions -->
	<div class="flex items-center justify-end gap-2 border-t border-border pt-4">
		{#if onCancel}
			<Button type="button" variant="outline" onclick={onCancel} disabled={isSubmitting}>
				Annuler
			</Button>
		{/if}
		<Button type="submit" disabled={isDisabled}>
			{#if isSubmitting}
				<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
				{mode === 'create' ? 'Creation...' : 'Enregistrement...'}
			{:else}
				{mode === 'create' ? 'Creer le vehicule' : 'Enregistrer les modifications'}
			{/if}
		</Button>
	</div>
</form>
