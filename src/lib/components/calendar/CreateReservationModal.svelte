<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import type { CalendarReservation } from './ReservationBlock.svelte';
	import type { CalendarMaintenance } from './MaintenanceBlock.svelte';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import WrenchIcon from '@lucide/svelte/icons/wrench';

	type Vehicle = {
		_id: string;
		brand: string;
		model: string;
		registration: string;
		status: string;
	};

	type Props = {
		open: boolean;
		vehicles: Vehicle[];
		reservations: CalendarReservation[];
		maintenances: CalendarMaintenance[];
		initialVehicleId?: string;
		initialDate?: Date;
		initialEndDate?: Date;
		initialPurpose?: string;
		onCreated: (
			vehicleId: string,
			startDate: number,
			endDate: number,
			purpose: string,
			notes?: string
		) => Promise<'SUCCESS' | 'CONFLICT' | 'ERROR'>;
		onClose: () => void;
	};

	let {
		open = $bindable(),
		vehicles,
		reservations,
		maintenances,
		initialVehicleId,
		initialDate,
		initialEndDate,
		initialPurpose,
		onCreated,
		onClose
	}: Props = $props();

	let selectedVehicleId = $state('');
	let startDateStr = $state('');
	let endDateStr = $state('');
	let purpose = $state('');
	let notes = $state('');
	let submitting = $state(false);
	let error = $state('');

	$effect(() => {
		if (open) {
			selectedVehicleId = initialVehicleId ?? (vehicles[0]?._id ?? '');
			startDateStr = initialDate ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : '';
			endDateStr = initialEndDate ? format(initialEndDate, "yyyy-MM-dd'T'HH:mm") : startDateStr;
			purpose = initialPurpose ?? '';
			notes = '';
			error = '';
		}
	});

	const availableVehicles = $derived.by(() => {
		const base = vehicles.filter((v) => v.status !== 'RETIRED');
		if (!startDateStr || !endDateStr) return base;
		const start = new Date(startDateStr).getTime();
		const end = new Date(endDateStr).getTime();
		if (isNaN(start) || isNaN(end) || end <= start) return base;

		const blockedByReservation = new Set(
			reservations
				.filter(
					(r) =>
						(r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS' || r.status === 'PENDING') &&
						r.startDate < end &&
						r.endDate > start
				)
				.map((r) => r.vehicleId)
		);

		const dayMs = 24 * 60 * 60 * 1000;
		const blockedByMaintenance = new Set(
			maintenances
				.filter((m) => {
					const dayStart = Math.floor(m.scheduledDate / dayMs) * dayMs;
					return dayStart < end && dayStart + dayMs > start;
				})
				.map((m) => m.vehicleId)
		);

		return base.filter((v) => !blockedByReservation.has(v._id) && !blockedByMaintenance.has(v._id));
	});

	// Réinitialise la sélection si le véhicule choisi n'est plus disponible sur les nouvelles dates
	$effect(() => {
		if (selectedVehicleId && !availableVehicles.find((v) => v._id === selectedVehicleId)) {
			selectedVehicleId = availableVehicles[0]?._id ?? '';
		}
	});

	const conflictWarning = $derived.by(() => {
		if (!selectedVehicleId || !startDateStr || !endDateStr) return null;
		const start = new Date(startDateStr).getTime();
		const end = new Date(endDateStr).getTime();
		return (
			reservations.find(
				(r) =>
					r.vehicleId === selectedVehicleId &&
					(r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS') &&
					r.startDate < end &&
					r.endDate > start
			) ?? null
		);
	});

	const maintenanceWarning = $derived.by(() => {
		if (!selectedVehicleId || !startDateStr || !endDateStr) return null;
		const start = new Date(startDateStr).getTime();
		const end = new Date(endDateStr).getTime();
		if (isNaN(start) || isNaN(end)) return null;
		const dayMs = 24 * 60 * 60 * 1000;
		return (
			maintenances.find((m) => {
				if (m.vehicleId !== selectedVehicleId) return false;
				const dayStart = Math.floor(m.scheduledDate / dayMs) * dayMs;
				return dayStart < end && dayStart + dayMs > start;
			}) ?? null
		);
	});

	function formatDate(ts: number) {
		return format(new Date(ts), 'd MMMM yyyy', { locale: fr });
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!selectedVehicleId || !startDateStr || !endDateStr || !purpose.trim()) {
			error = 'Veuillez remplir tous les champs obligatoires.';
			return;
		}

		const start = new Date(startDateStr).getTime();
		const end = new Date(endDateStr).getTime();

		if (end <= start) {
			error = 'La date de fin doit être postérieure à la date de début.';
			return;
		}

		submitting = true;
		error = '';
		const result = await onCreated(
			selectedVehicleId,
			start,
			end,
			purpose.trim(),
			notes.trim() || undefined
		);
		submitting = false;

		if (result === 'SUCCESS') {
			toast.success('Réservation créée');
			open = false;
			onClose();
		} else if (result === 'CONFLICT') {
			error = 'Ce véhicule est déjà réservé sur cette période.';
		} else {
			error = 'Erreur inattendue lors de la création.';
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nouvelle réservation</Dialog.Title>
			<Dialog.Description>Réservez un véhicule pour une période donnée.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="flex flex-col gap-4 py-2">
			<!-- Vehicle select -->
			<div class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between">
					<Label for="vehicle">Véhicule *</Label>
					{#if startDateStr && endDateStr}
						<span class="text-[11px] text-muted-foreground">
							{availableVehicles.length} disponible{availableVehicles.length !== 1 ? 's' : ''}
						</span>
					{/if}
				</div>
				<select
					id="vehicle"
					bind:value={selectedVehicleId}
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
					required
				>
					<option value="" disabled>Sélectionner un véhicule</option>
					{#each availableVehicles as v (v._id)}
						<option value={v._id}>{v.brand} {v.model} — {v.registration}</option>
					{/each}
				</select>
				{#if startDateStr && endDateStr && availableVehicles.length === 0}
					<p class="text-xs text-amber-600 dark:text-amber-400">Aucun véhicule disponible sur cette période.</p>
				{/if}
			</div>

			<!-- Dates + heures -->
			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-1.5">
					<Label for="start-date">Début *</Label>
					<Input id="start-date" type="datetime-local" bind:value={startDateStr} required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="end-date">Fin *</Label>
					<Input id="end-date" type="datetime-local" bind:value={endDateStr} min={startDateStr} required />
				</div>
			</div>

			{#if conflictWarning}
				<Alert class="border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
					<TriangleAlertIcon class="size-4" />
					<AlertDescription>
						Conflit : ce véhicule est déjà réservé du {formatDate(conflictWarning.startDate)} au {formatDate(
							conflictWarning.endDate
						)}.
					</AlertDescription>
				</Alert>
			{/if}

			{#if maintenanceWarning}
				<Alert class="border-orange-200 bg-orange-50/80 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
					<WrenchIcon class="size-4" />
					<AlertDescription>
						Entretien planifié : ce véhicule est en {maintenanceWarning.maintenanceType === 'REVISION' ? 'révision' : maintenanceWarning.maintenanceType === 'VIDANGE' ? 'vidange' : maintenanceWarning.maintenanceType === 'PNEUS' ? 'remplacement de pneumatiques' : maintenanceWarning.maintenanceType === 'FREINS' ? 'remplacement de freins' : 'entretien'} le {formatDate(maintenanceWarning.scheduledDate)}.
					</AlertDescription>
				</Alert>
			{/if}

			<!-- Purpose -->
			<div class="flex flex-col gap-1.5">
				<Label for="purpose">Motif *</Label>
				<Input
					id="purpose"
					bind:value={purpose}
					placeholder="Ex : Visite client Lyon"
					required
				/>
			</div>

			<!-- Notes -->
			<div class="flex flex-col gap-1.5">
				<Label for="notes">Notes</Label>
				<Textarea
					id="notes"
					bind:value={notes}
					placeholder="Informations complémentaires…"
					rows={2}
				/>
			</div>

			{#if error}
				<p class="text-xs text-destructive">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={onClose} disabled={submitting}>
					Annuler
				</Button>
				<Button type="submit" loading={submitting}>
					{submitting ? 'Création…' : 'Créer la réservation'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
