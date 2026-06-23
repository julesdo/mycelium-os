<script lang="ts">
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';
	import { localizedHref } from '$lib/utils/i18n.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { cn } from '$lib/utils.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import CheckIcon from '@lucide/svelte/icons/check';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import type { Id } from '$lib/convex/_generated/dataModel.js';

	const client = useConvexClient();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyApi = api as any;

	const vehiclesQuery = useQuery(anyApi.vehicles.listVehicles, {});

	// ── Stepper ───────────────────────────────────────────────────────────────────
	let step = $state(1);
	let slideDir = $state(1);
	const TOTAL = 3;

	const STEPS = [
		{ label: 'Circonstances', sublabel: 'Où et quand ?' },
		{ label: 'Photos',         sublabel: 'Documenter les dommages' },
		{ label: 'Description',    sublabel: 'Récapitulatif' }
	];

	// ── Étape 1 — Circonstances ───────────────────────────────────────────────────
	let vehicleId = $state<Id<'vehicles'> | ''>('');
	let incidentDate = $state(new Date().toISOString().slice(0, 16));
	let location = $state('');
	let thirdPartyInvolved = $state(false);
	let thirdPartyInfo = $state('');

	// ── Étape 2 — Photos ──────────────────────────────────────────────────────────
	const PHOTO_LABELS = [
		'Dommage principal', "Vue d'ensemble", "Plaque d'immatriculation",
		'Contexte (route, parking…)', 'Autre vue', 'Document constat', 'Photo supplémentaire'
	];
	interface PhotoItem { label: string; storageId: string; previewUrl: string }
	let photos = $state<PhotoItem[]>([]);
	let uploading = $state(false);

	// ── Étape 3 — Description ─────────────────────────────────────────────────────
	let description = $state('');
	let submitting = $state(false);

	// ── Navigation ────────────────────────────────────────────────────────────────
	function canAdvance(): boolean {
		if (step === 1) return !!vehicleId && !!incidentDate && location.trim().length > 2;
		if (step === 2) return photos.length >= 1;
		return description.trim().length > 10;
	}

	function next() {
		if (!canAdvance() || step >= TOTAL) return;
		slideDir = 1;
		step++;
	}

	function back() {
		if (step > 1) {
			slideDir = -1;
			step--;
		} else {
			goto(resolve(localizedHref('/app/incidents')));
		}
	}

	// ── Upload photo ──────────────────────────────────────────────────────────────
	async function handlePhotoUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length || photos.length >= 10) return;
		uploading = true;
		try {
			for (const file of Array.from(input.files).slice(0, 10 - photos.length)) {
				const uploadUrl = await client.mutation(anyApi.incidents.generateIncidentUploadUrl, {});
				const res = await fetch(uploadUrl, {
					method: 'POST',
					headers: { 'Content-Type': file.type },
					body: file
				});
				const { storageId } = await res.json();
				const labelIndex = photos.length % PHOTO_LABELS.length;
				photos = [...photos, { label: PHOTO_LABELS[labelIndex] ?? `Photo ${photos.length + 1}`, storageId, previewUrl: URL.createObjectURL(file) }];
			}
		} catch {
			toast.error("Erreur lors de l'upload de la photo");
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	function removePhoto(index: number) { photos = photos.filter((_, i) => i !== index); }

	// ── Soumission ────────────────────────────────────────────────────────────────
	async function handleSubmit() {
		if (!vehicleId || !canAdvance()) return;
		submitting = true;
		try {
			const incidentId = await client.mutation(anyApi.incidents.declareIncident, {
				vehicleId,
				incidentDate: new Date(incidentDate).getTime(),
				location: location.trim(),
				description: description.trim(),
				thirdPartyInvolved,
				thirdPartyInfo: thirdPartyInvolved && thirdPartyInfo.trim() ? thirdPartyInfo.trim() : undefined,
				photos: photos.map(({ label, storageId }) => ({ label, storageId }))
			});
			toast.success('Sinistre déclaré — l\'équipe a été notifiée');
			goto(resolve(localizedHref(`/app/incidents/${incidentId}`)));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Erreur lors de la déclaration');
		} finally {
			submitting = false;
		}
	}

	const selectedVehicle = $derived((vehiclesQuery.data ?? []).find((v: { _id: string; registration?: string }) => v._id === vehicleId));
</script>

<div class="flex h-full flex-col overflow-hidden bg-background">

	<!-- Header sticky -->
	<header class="z-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-md">
		<div class="px-4 sm:px-6">

			<!-- Row 1: back + title + step counter -->
			<div class="flex items-center gap-3 py-3.5">
				<button
					onclick={back}
					class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Retour"
				>
					<ArrowLeftIcon class="size-4" />
				</button>
				<div class="flex min-w-0 flex-1 items-baseline justify-between gap-4">
					<span class="truncate text-sm font-semibold">Déclarer un sinistre</span>
					<span class="shrink-0 text-xs text-muted-foreground">{step} / {TOTAL}</span>
				</div>
			</div>

			<!-- Row 2: step dots + labels -->
			<div class="relative flex items-center pb-4">
				{#each STEPS as s, i}
					{@const n = i + 1}
					{@const done = n < step}
					{@const active = n === step}
					<div class="relative flex shrink-0 flex-col items-center">
						<div class={cn(
							'flex size-7 items-center justify-center rounded-full border-2 transition-all duration-300',
							done   ? 'border-primary bg-primary text-primary-foreground' : '',
							active ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/15' : '',
							!done && !active ? 'border-border bg-background text-muted-foreground' : ''
						)}>
							{#if done}
								<CheckIcon class="size-3.5" strokeWidth={3} />
							{:else}
								<span class="text-[11px] font-bold">{n}</span>
							{/if}
						</div>
						<span class={cn(
							'absolute top-9 hidden whitespace-nowrap text-[10px] font-semibold sm:block',
							active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/40'
						)}>
							{s.label}
						</span>
					</div>
					{#if i < STEPS.length - 1}
						<div class={cn(
							'mx-1 h-0.5 flex-1 rounded-full transition-all duration-500',
							n < step ? 'bg-primary' : 'bg-border'
						)}></div>
					{/if}
				{/each}
			</div>
			<div class="hidden h-5 sm:block"></div>
		</div>
	</header>

	<!-- Step 1 — Circonstances -->
	{#if step === 1}
		<div class="flex-1 overflow-y-auto" in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}>
			<div class="mx-auto max-w-lg px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-6">
					<div>
						<h2 class="text-2xl font-bold tracking-tight">Que s'est-il passé ?</h2>
						<p class="mt-1 text-muted-foreground">Renseignez les informations de base sur l'accident.</p>
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="vehicle">Véhicule concerné *</Label>
						<select
							id="vehicle"
							bind:value={vehicleId}
							class="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
						>
							<option value="">Sélectionner un véhicule</option>
							{#each vehiclesQuery.data ?? [] as v (v._id)}
								<option value={v._id}>{v.brand} {v.model} — {v.registration}</option>
							{/each}
						</select>
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="incident-date">Date et heure *</Label>
						<Input
							id="incident-date"
							type="datetime-local"
							bind:value={incidentDate}
							max={new Date().toISOString().slice(0, 16)}
							class="h-11"
						/>
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="location">Lieu de l'accident *</Label>
						<Input
							id="location"
							placeholder="Parking Carrefour Cergy, A6 sens Paris…"
							bind:value={location}
							class="h-11"
						/>
					</div>

					<div class="overflow-hidden rounded-2xl border border-border bg-card">
						<div class="border-b border-border px-4 py-3">
							<Label class="text-sm font-medium">Tiers impliqué dans l'accident ?</Label>
						</div>
						<div class="flex gap-2 p-3">
							<button
								type="button"
								onclick={() => { thirdPartyInvolved = false; thirdPartyInfo = ''; }}
								class={cn(
									'flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all',
									!thirdPartyInvolved
										? 'border-primary bg-primary/8 text-primary'
										: 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
								)}
							>Non</button>
							<button
								type="button"
								onclick={() => (thirdPartyInvolved = true)}
								class={cn(
									'flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all',
									thirdPartyInvolved
										? 'border-primary bg-primary/8 text-primary'
										: 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
								)}
							>Oui</button>
						</div>
						{#if thirdPartyInvolved}
							<div class="border-t border-border px-3 pb-3 pt-2">
								<Textarea
									placeholder="Nom, plaque, assureur du tiers : Jean Martin · AB-456-CD · AXA n°12345…"
									bind:value={thirdPartyInfo}
									rows={2}
									class="text-sm"
								/>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

	<!-- Step 2 — Photos -->
	{:else if step === 2}
		<div class="flex-1 overflow-y-auto" in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}>
			<div class="mx-auto max-w-lg px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-6">
					<div>
						<h2 class="text-2xl font-bold tracking-tight">Photos des dommages</h2>
						<p class="mt-1 text-muted-foreground">
							Documentez visuellement les dégâts. <span class="font-medium text-foreground">Minimum 1, maximum 10.</span>
						</p>
					</div>

					{#if photos.length > 0}
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{#each photos as photo, i (i)}
								<div class="group relative overflow-hidden rounded-xl border border-border">
									<img src={photo.previewUrl} alt={photo.label} class="h-36 w-full object-cover" />
									<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
										<p class="truncate text-[10px] text-white">{photo.label}</p>
									</div>
									<button
										type="button"
										onclick={() => removePhoto(i)}
										class="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
									>
										<TrashIcon class="size-3" />
									</button>
								</div>
							{/each}
						</div>
					{/if}

					{#if photos.length < 10}
						<label class={cn(
							'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-10 transition-colors',
							uploading ? 'border-border bg-muted/20' : 'border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/30'
						)}>
							{#if uploading}
								<LoaderCircleIcon class="size-6 animate-spin text-muted-foreground" />
								<span class="text-sm text-muted-foreground">Upload en cours…</span>
							{:else}
								<CameraIcon class="size-7 text-muted-foreground" />
								<span class="text-sm font-medium">{photos.length === 0 ? 'Ajouter des photos' : 'Ajouter d\'autres photos'}</span>
								<span class="text-xs text-muted-foreground">{photos.length}/10 · Depuis la caméra ou galerie</span>
							{/if}
							<input
								type="file"
								accept="image/*"
								multiple
								capture="environment"
								class="hidden"
								onchange={handlePhotoUpload}
								disabled={uploading}
							/>
						</label>
					{/if}
				</div>
			</div>
		</div>

	<!-- Step 3 — Description + récap -->
	{:else}
		<div class="flex-1 overflow-y-auto" in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}>
			<div class="mx-auto max-w-lg px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-6">
					<div>
						<h2 class="text-2xl font-bold tracking-tight">Décrivez l'accident</h2>
						<p class="mt-1 text-muted-foreground">Soyez précis : circonstances, vitesse, conditions météo, dégâts observés.</p>
					</div>

					<div class="flex flex-col gap-1.5">
						<Label for="description">Description *</Label>
						<Textarea
							id="description"
							placeholder="Exemple : En sortant du parking, un autre véhicule a percuté mon aile avant gauche. Conditions sèches, vitesse lente. Dégât visible sur la porte et le pare-chocs…"
							bind:value={description}
							rows={7}
							class="text-sm"
						/>
						<p class="text-xs text-muted-foreground">{description.length} caractères</p>
					</div>

					<!-- Récap -->
					<div class="overflow-hidden rounded-2xl border border-border bg-muted/20">
						<div class="border-b border-border px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Récapitulatif</p>
						</div>
						<div class="divide-y divide-border text-sm">
							<div class="flex items-center justify-between px-4 py-2.5">
								<span class="text-muted-foreground">Véhicule</span>
								<span class="font-medium">{selectedVehicle?.registration ?? '—'}</span>
							</div>
							<div class="flex items-center justify-between px-4 py-2.5">
								<span class="text-muted-foreground">Date</span>
								<span class="font-medium">{new Date(incidentDate).toLocaleDateString('fr-FR')}</span>
							</div>
							<div class="flex items-center justify-between px-4 py-2.5">
								<span class="text-muted-foreground">Lieu</span>
								<span class="max-w-[200px] truncate text-right font-medium">{location}</span>
							</div>
							<div class="flex items-center justify-between px-4 py-2.5">
								<span class="text-muted-foreground">Tiers</span>
								<span class="font-medium">{thirdPartyInvolved ? 'Oui' : 'Non'}</span>
							</div>
							<div class="flex items-center justify-between px-4 py-2.5">
								<span class="text-muted-foreground">Photos</span>
								<span class="font-medium">{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Footer navigation -->
	<footer class="shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-md">
		<div class="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4 sm:px-6">
			<Button variant="outline" onclick={back}>
				<ArrowLeftIcon class="size-4" />
				{step === 1 ? 'Annuler' : 'Retour'}
			</Button>

			{#if step < TOTAL}
				<Button onclick={next} disabled={!canAdvance()}>
					Suivant
					<ArrowRightIcon class="size-4" />
				</Button>
			{:else}
				<Button
					onclick={handleSubmit}
					disabled={submitting || !canAdvance()}
					class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 shadow-glass-brand"
				>
					{#if submitting}
						<LoaderCircleIcon class="size-4 animate-spin" />
					{:else}
						<CheckIcon class="size-4" />
					{/if}
					Déclarer le sinistre
				</Button>
			{/if}
		</div>
	</footer>
</div>
