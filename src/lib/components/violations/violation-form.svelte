<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { cn } from '$lib/utils.js';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import SearchIcon from '@lucide/svelte/icons/search';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PaperclipIcon from '@lucide/svelte/icons/paperclip';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import UserXIcon from '@lucide/svelte/icons/user-x';

	interface Props {
		open: boolean;
		onclose: () => void;
		onsuccess?: () => void;
	}

	let { open = $bindable(), onclose, onsuccess }: Props = $props();

	const client = useConvexClient();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehiclesQuery = useQuery((api as any).vehicles.listVehicles, {});
	const vehicles = $derived(vehiclesQuery.data ?? []);

	// ── Step state ─────────────────────────────────────────────────────────────
	let step = $state(1);
	const TOTAL_STEPS = 3;

	let vehicleSearch = $state('');
	let vehicleId = $state('');
	let violationDateStr = $state(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
	let amount = $state('');
	let description = $state('');
	let reference = $state('');
	let notes = $state('');
	let documentStorageId = $state('');
	let documentFileName = $state('');
	let submitting = $state(false);
	let uploadingDoc = $state(false);

	$effect(() => {
		if (!open) {
			step = 1;
			vehicleSearch = '';
			vehicleId = '';
			violationDateStr = format(new Date(), "yyyy-MM-dd'T'HH:mm");
			amount = '';
			description = '';
			reference = '';
			notes = '';
			documentStorageId = '';
			documentFileName = '';
		}
	});

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

	const selectedVehicle = $derived(vehicles.find((v: { _id: string }) => v._id === vehicleId));

	const canProceed = $derived.by(() => {
		if (step === 1) return !!vehicleId;
		if (step === 2) return !!violationDateStr && !!amount && !!description;
		return true;
	});

	function next() {
		if (canProceed && step < TOTAL_STEPS) step++;
	}

	function prev() {
		if (step > 1) step--;
	}

	async function handleDocumentUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		uploadingDoc = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const uploadUrl = await client.mutation((api as any).violations.generateViolationUploadUrl, {});
			const res = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!res.ok) throw new Error('Upload échoué');
			const { storageId } = await res.json();
			documentStorageId = storageId;
			documentFileName = file.name;
		} catch {
			toast.error("Erreur lors de l'upload du document");
		} finally {
			uploadingDoc = false;
			input.value = '';
		}
	}

	async function confirm() {
		submitting = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = await client.mutation((api as any).violations.createViolation, {
				vehicleId,
				violationDate: new Date(violationDateStr).getTime(),
				amount: parseFloat(amount),
				description: description.trim(),
				reference: reference.trim() || undefined,
				documentStorageId: documentStorageId || undefined,
				notes: notes.trim() || undefined
			});
			if (result.identifiedDriver) {
				toast.success('Contravention saisie — conducteur identifié automatiquement');
			} else {
				toast.success('Contravention saisie — conducteur non identifié sur cette période');
			}
			onsuccess?.();
			open = false;
		} catch {
			toast.error('Erreur lors de la saisie');
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-h-[90vh] max-w-lg overflow-y-auto">
			<Dialog.Header>
				<div class="flex items-center gap-2">
					<AlertTriangleIcon class="size-5 text-muted-foreground" />
					<Dialog.Title>Saisir une contravention</Dialog.Title>
				</div>
				<!-- Progress bars -->
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

			<div class="mt-4 min-h-[260px]">

				<!-- Step 1 — Véhicule -->
				{#if step === 1}
					<div class="flex flex-col gap-3">
						<h3 class="font-medium">Sélectionner le véhicule</h3>
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
							<div class="flex max-h-56 flex-col gap-1 overflow-y-auto">
								{#each filteredVehicles as v (v._id)}
									<button
										type="button"
										onclick={() => (vehicleId = v._id)}
										class={cn(
											'flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
											vehicleId === v._id
												? 'bg-primary/10 text-primary ring-1 ring-primary/30'
												: 'hover:bg-muted/60'
										)}
									>
										<div>
											<span class="font-medium">{v.brand} {v.model}</span>
											<span class="ml-2 font-mono text-xs text-muted-foreground">{v.registration}</span>
										</div>
										{#if vehicleId === v._id}
											<CheckIcon class="size-4 shrink-0" />
										{/if}
									</button>
								{:else}
									<p class="py-4 text-center text-sm text-muted-foreground">Aucun véhicule trouvé</p>
								{/each}
							</div>
						{/if}
					</div>

				<!-- Step 2 — Infraction -->
				{:else if step === 2}
					<div class="flex flex-col gap-4">
						<h3 class="font-medium">Détails de l'infraction</h3>

						<div class="grid grid-cols-2 gap-3">
							<div class="flex flex-col gap-1.5">
								<Label for="vf-date">Date de l'infraction <span class="text-destructive">*</span></Label>
								<Input id="vf-date" type="datetime-local" bind:value={violationDateStr} />
							</div>
							<div class="flex flex-col gap-1.5">
								<Label for="vf-amount">Montant (€) <span class="text-destructive">*</span></Label>
								<Input
									id="vf-amount"
									type="number"
									min="0"
									step="0.01"
									placeholder="135"
									bind:value={amount}
								/>
							</div>
						</div>

						<div class="flex flex-col gap-1.5">
							<Label for="vf-desc">Type d'infraction <span class="text-destructive">*</span></Label>
							<Input
								id="vf-desc"
								placeholder="ex: Excès de vitesse, Stationnement interdit…"
								bind:value={description}
							/>
						</div>

						<div class="flex flex-col gap-1.5">
							<Label for="vf-ref">Numéro de PV</Label>
							<Input id="vf-ref" placeholder="ex: FR-2026-XXXX" bind:value={reference} />
						</div>

						<div class="flex flex-col gap-1.5">
							<Label>Document (PV scan)</Label>
							{#if documentFileName}
								<div class="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
									<CheckIcon class="size-4 shrink-0 text-emerald-600" />
									<span class="min-w-0 flex-1 truncate text-sm">{documentFileName}</span>
									<button
										type="button"
										onclick={() => { documentStorageId = ''; documentFileName = ''; }}
										class="shrink-0 text-xs text-muted-foreground hover:text-destructive"
									>
										Supprimer
									</button>
								</div>
							{:else}
								<label
									class="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 hover:bg-muted/40"
								>
									{#if uploadingDoc}
										<LoaderCircleIcon class="size-4 animate-spin text-muted-foreground" />
										<span class="text-sm text-muted-foreground">Upload…</span>
									{:else}
										<PaperclipIcon class="size-4 text-muted-foreground" />
										<span class="text-sm text-muted-foreground">Joindre le PV (PDF, image)</span>
									{/if}
									<input
										type="file"
										accept="image/*,application/pdf"
										class="sr-only"
										disabled={uploadingDoc}
										onchange={handleDocumentUpload}
									/>
								</label>
							{/if}
						</div>

						<div class="flex flex-col gap-1.5">
							<Label for="vf-notes">Notes internes</Label>
							<Textarea
								id="vf-notes"
								rows={2}
								placeholder="Contexte, circonstances…"
								bind:value={notes}
							/>
						</div>
					</div>

				<!-- Step 3 — Confirmation -->
				{:else if step === 3}
					<div class="flex flex-col gap-4">
						<h3 class="font-medium">Vérifier et confirmer</h3>

						<div class="rounded-xl border border-border bg-muted/20 p-4">
							<div class="flex flex-col gap-2 text-sm">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Véhicule</span>
									<span class="font-medium">
										{selectedVehicle?.brand} {selectedVehicle?.model}
										<span class="ml-1 font-mono text-xs text-muted-foreground">{selectedVehicle?.registration}</span>
									</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Date</span>
									<span class="font-medium">
										{new Date(violationDateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
									</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Montant</span>
									<span class="font-semibold">{parseFloat(amount).toLocaleString('fr-FR')} €</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Infraction</span>
									<span class="font-medium text-right max-w-[60%]">{description}</span>
								</div>
								{#if reference}
									<div class="flex justify-between">
										<span class="text-muted-foreground">N° PV</span>
										<span class="font-mono text-xs">{reference}</span>
									</div>
								{/if}
								{#if documentFileName}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Document</span>
										<span class="text-emerald-600 dark:text-emerald-400">Attaché</span>
									</div>
								{/if}
							</div>
						</div>

						<div class="flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
							<UserCheckIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
							<div class="text-sm text-muted-foreground">
								Le conducteur sera <strong class="text-foreground">identifié automatiquement</strong>
								via le planning de réservations à la date de l'infraction.
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			<div class="mt-6 flex items-center justify-between">
				<Button variant="ghost" onclick={step > 1 ? prev : onclose} disabled={submitting}>
					{step > 1 ? 'Précédent' : 'Annuler'}
				</Button>
				{#if step < TOTAL_STEPS}
					<Button onclick={next} disabled={!canProceed}>
						Suivant
					</Button>
				{:else}
					<Button onclick={confirm} disabled={submitting}>
						{#if submitting}
							<LoaderCircleIcon class="size-3.5 animate-spin" />
						{/if}
						Enregistrer
					</Button>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
