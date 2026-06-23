<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import { CATEGORY_LABELS } from './category-config.js';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import PaperclipIcon from '@lucide/svelte/icons/paperclip';
	import XIcon from '@lucide/svelte/icons/x';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';

	type Category =
		| 'LEASING' | 'CARBURANT' | 'ENTRETIEN' | 'ASSURANCE'
		| 'TAXES' | 'SINISTRE' | 'PARKING' | 'TELEPEAGE' | 'AUTRE';

	interface Cost {
		_id: string;
		vehicleId?: string;
		category: Category;
		amount: number;
		vatAmount?: number;
		date: number;
		description: string;
		invoiceUrl?: string;
		invoiceStorageId?: string;
	}

	interface Vehicle {
		_id: string;
		registration: string;
		brand: string;
		model: string;
	}

	interface Props {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
		mode: 'create' | 'edit';
		initial?: Cost;
		vehicles: Vehicle[] | null | undefined;
		onSuccess?: () => void;
	}

	let { open = $bindable(false), onOpenChange, mode, initial, vehicles, onSuccess }: Props = $props();

	const client = useConvexClient();

	const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
		value: value as Category,
		label
	}));

	// ── Form state ────────────────────────────────────────────────────────────────

	let vehicleId = $state<string>(initial?.vehicleId ?? '');
	let category = $state<Category | ''>(initial?.category ?? '');
	let amount = $state(initial?.amount?.toString() ?? '');
	let vatAmount = $state(initial?.vatAmount?.toString() ?? '');
	let dateStr = $state(
		initial?.date
			? new Date(initial.date).toISOString().slice(0, 10)
			: new Date().toISOString().slice(0, 10)
	);
	let description = $state(initial?.description ?? '');
	let invoiceStorageId = $state(initial?.invoiceStorageId ?? '');
	let invoiceUrl = $state(initial?.invoiceUrl ?? '');
	let invoiceFileName = $state('');

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);
	let isUploading = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	// ── Vehicle combobox state ────────────────────────────────────────────────────

	let vehiclePopoverOpen = $state(false);
	let vehicleSearch = $state('');

	const filteredVehicles = $derived.by(() => {
		const all = vehicles ?? [];
		const q = vehicleSearch.trim().toLowerCase();
		if (!q) return all;
		return all.filter(
			(v) =>
				v.registration.toLowerCase().includes(q) ||
				v.brand.toLowerCase().includes(q) ||
				v.model.toLowerCase().includes(q)
		);
	});

	const selectedVehicle = $derived((vehicles ?? []).find((v) => v._id === vehicleId));

	// ── Reset on open ─────────────────────────────────────────────────────────────

	$effect(() => {
		if (open) {
			const i = untrack(() => initial);
			vehicleId = i?.vehicleId ?? '';
			category = i?.category ?? '';
			amount = i?.amount?.toString() ?? '';
			vatAmount = i?.vatAmount?.toString() ?? '';
			dateStr = i?.date
				? new Date(i.date).toISOString().slice(0, 10)
				: new Date().toISOString().slice(0, 10);
			description = i?.description ?? '';
			invoiceStorageId = i?.invoiceStorageId ?? '';
			invoiceUrl = i?.invoiceUrl ?? '';
			invoiceFileName = '';
			vehicleSearch = '';
			errors = {};
		}
	});

	// ── Validation ────────────────────────────────────────────────────────────────

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (!category) e.category = 'Catégorie requise';
		const amt = parseFloat(amount);
		if (!amount || isNaN(amt) || amt <= 0) e.amount = 'Montant invalide (doit être > 0)';
		if (!dateStr) e.date = 'Date requise';
		if (!description.trim()) e.description = 'Description requise';
		errors = e;
		return Object.keys(e).length === 0;
	}

	// ── Invoice upload ────────────────────────────────────────────────────────────

	async function handleFileChange(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		if (file.size > 10 * 1024 * 1024) {
			toast.error('Fichier trop volumineux (max 10 Mo)');
			return;
		}
		isUploading = true;
		invoiceFileName = file.name;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const uploadUrl = await client.mutation((api as any).costs.generateInvoiceUploadUrl, {});
			const res = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!res.ok) throw new Error('Upload échoué');
			const { storageId } = await res.json();
			invoiceStorageId = storageId;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const url = await client.query((api as any).costs.getInvoiceUrl, { storageId });
			invoiceUrl = url ?? '';
			toast.success('Facture chargée');
		} catch {
			toast.error('Erreur lors du chargement de la facture');
			invoiceFileName = '';
			invoiceStorageId = '';
			invoiceUrl = '';
		} finally {
			isUploading = false;
		}
	}

	// ── Submit ────────────────────────────────────────────────────────────────────

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!validate()) return;
		isSubmitting = true;
		try {
			const payload = {
				vehicleId: vehicleId || undefined,
				category: category as Category,
				amount: parseFloat(amount),
				vatAmount: vatAmount ? parseFloat(vatAmount) : undefined,
				date: new Date(dateStr).getTime(),
				description: description.trim(),
				invoiceUrl: invoiceUrl || undefined,
				invoiceStorageId: invoiceStorageId || undefined
			};
			if (mode === 'create') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await client.mutation((api as any).costs.createCost, payload);
				toast.success('Coût ajouté');
			} else if (initial) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await client.mutation((api as any).costs.updateCost, { costId: initial._id, ...payload });
				toast.success('Coût mis à jour');
			}
			open = false;
			onOpenChange?.(false);
			onSuccess?.();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
		} finally {
			isSubmitting = false;
		}
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isSubmitting) {
			open = isOpen;
			onOpenChange?.(isOpen);
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<!-- max-h + flex col so the footer is always visible -->
		<Dialog.Content class="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">

			<!-- Fixed header -->
			<Dialog.Header class="shrink-0 border-b border-border px-6 py-4">
				<Dialog.Title>{mode === 'create' ? 'Ajouter un coût' : 'Modifier le coût'}</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					Les champs marqués * sont obligatoires.
				</Dialog.Description>
			</Dialog.Header>

			<!-- Scrollable body -->
			<div class="flex-1 overflow-y-auto px-6 py-5">
				<form id="cost-form" onsubmit={handleSubmit} class="flex flex-col gap-4">

					<!-- Vehicle combobox -->
					<Field.Field>
						<Field.Label>Véhicule</Field.Label>
						<Popover.Root bind:open={vehiclePopoverOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<button
										type="button"
										{...props}
										class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
									>
										{#if selectedVehicle}
											<span class="flex items-center gap-2">
												<span class="font-mono font-medium">{selectedVehicle.registration}</span>
												<span class="text-muted-foreground">{selectedVehicle.brand} {selectedVehicle.model}</span>
											</span>
										{:else}
											<span class="text-muted-foreground">Coût global (optionnel)</span>
										{/if}
										<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
									</button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-full p-0 sm:w-[440px]" align="start">
								<Command.Root>
									<Command.Input
										bind:value={vehicleSearch}
										placeholder="Rechercher par immat., marque…"
									/>
									<Command.List class="max-h-56">
										<Command.Empty>Aucun véhicule trouvé</Command.Empty>
										<Command.Group>
											<!-- "Global" option -->
											<Command.Item
												value=""
												onSelect={() => {
													vehicleId = '';
													vehiclePopoverOpen = false;
													vehicleSearch = '';
												}}
											>
												<CheckIcon class="mr-2 size-4 {vehicleId === '' ? 'opacity-100' : 'opacity-0'}" />
												<span class="text-muted-foreground">Coût global (sans véhicule)</span>
											</Command.Item>
											{#each filteredVehicles as v (v._id)}
												<Command.Item
													value={v._id}
													onSelect={() => {
														vehicleId = v._id;
														vehiclePopoverOpen = false;
														vehicleSearch = '';
													}}
												>
													<CheckIcon class="mr-2 size-4 {vehicleId === v._id ? 'opacity-100' : 'opacity-0'}" />
													<span class="font-mono font-medium">{v.registration}</span>
													<span class="ml-2 text-muted-foreground">{v.brand} {v.model}</span>
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						<Field.Description>Laissez vide pour un coût global organisation</Field.Description>
					</Field.Field>

					<!-- Category -->
					<Field.Field>
						<Field.Label for="cost-category">Catégorie *</Field.Label>
						<Select.Root value={category} onValueChange={(v) => (category = v as Category)}>
							<Select.Trigger id="cost-category" class={errors.category ? 'border-destructive' : ''}>
								{category ? CATEGORY_LABELS[category] : 'Sélectionner une catégorie'}
							</Select.Trigger>
							<Select.Content>
								{#each CATEGORIES as cat}
									<Select.Item value={cat.value}>{cat.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if errors.category}
							<Field.Error>{errors.category}</Field.Error>
						{/if}
					</Field.Field>

					<!-- Amount + VAT -->
					<div class="grid grid-cols-2 gap-3">
						<Field.Field>
							<Field.Label for="cost-amount">Montant TTC *</Field.Label>
							<div class="relative">
								<Input
									id="cost-amount"
									type="number"
									min="0.01"
									step="0.01"
									placeholder="0.00"
									bind:value={amount}
									class="pr-8 {errors.amount ? 'border-destructive' : ''}"
								/>
								<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
							</div>
							{#if errors.amount}
								<Field.Error>{errors.amount}</Field.Error>
							{/if}
						</Field.Field>
						<Field.Field>
							<Field.Label for="cost-vat">TVA</Field.Label>
							<div class="relative">
								<Input
									id="cost-vat"
									type="number"
									min="0"
									step="0.01"
									placeholder="0.00"
									bind:value={vatAmount}
									class="pr-8"
								/>
								<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
							</div>
						</Field.Field>
					</div>

					<!-- Date -->
					<Field.Field>
						<Field.Label for="cost-date">Date *</Field.Label>
						<Input
							id="cost-date"
							type="date"
							bind:value={dateStr}
							class={errors.date ? 'border-destructive' : ''}
						/>
						{#if errors.date}
							<Field.Error>{errors.date}</Field.Error>
						{/if}
					</Field.Field>

					<!-- Description -->
					<Field.Field>
						<Field.Label for="cost-description">Description *</Field.Label>
						<Textarea
							id="cost-description"
							placeholder="Ex. : Loyer mensuel janvier 2026"
							rows={2}
							bind:value={description}
							class={errors.description ? 'border-destructive' : ''}
						/>
						{#if errors.description}
							<Field.Error>{errors.description}</Field.Error>
						{/if}
					</Field.Field>

					<!-- Invoice upload -->
					<Field.Field>
						<Field.Label>Facture</Field.Label>
						{#if invoiceStorageId || invoiceUrl}
							<div class="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
								<PaperclipIcon class="size-4 shrink-0 text-blue-500" />
								<span class="flex-1 truncate text-muted-foreground">
									{invoiceFileName || 'Facture chargée'}
								</span>
								<button
									type="button"
									onclick={() => { invoiceStorageId = ''; invoiceUrl = ''; invoiceFileName = ''; }}
									class="shrink-0 text-muted-foreground hover:text-foreground"
								>
									<XIcon class="size-4" />
								</button>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => fileInputRef?.click()}
								disabled={isUploading}
								class="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/20 disabled:opacity-50"
							>
								{#if isUploading}
									<LoaderCircleIcon class="size-4 animate-spin" />
									Chargement…
								{:else}
									<PaperclipIcon class="size-4" />
									Attacher une facture (PDF, image)
								{/if}
							</button>
						{/if}
						<input
							type="file"
							accept=".pdf,.jpg,.jpeg,.png,.webp"
							class="hidden"
							bind:this={fileInputRef}
							onchange={handleFileChange}
						/>
						<Field.Description>PDF ou image · Max 10 Mo</Field.Description>
					</Field.Field>

				</form>
			</div>

			<!-- Fixed footer -->
			<div class="shrink-0 border-t border-border px-6 py-4">
				<div class="flex justify-end gap-2">
					<Button
						type="button"
						variant="ghost"
						onclick={() => handleOpenChange(false)}
						disabled={isSubmitting}
					>
						Annuler
					</Button>
					<Button type="submit" form="cost-form" disabled={isSubmitting || isUploading}>
						{#if isSubmitting}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{/if}
						{mode === 'create' ? 'Ajouter' : 'Enregistrer'}
					</Button>
				</div>
			</div>

		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
