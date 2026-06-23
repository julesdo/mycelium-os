<script lang="ts">
	import { page } from '$app/state';
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import InspectionPhotos from '$lib/components/inspections/inspection-photos.svelte';
	import InspectionDamages from '$lib/components/inspections/inspection-damages.svelte';
	import { fly, fade } from 'svelte/transition';
	import { cn } from '$lib/utils.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';

	type Angle = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'INTERIOR' | 'DASHBOARD';
	interface PhotoEntry { angle: Angle; storageId: string; previewUrl: string }
	interface Damage { location: string; description: string; severity: 'MINOR' | 'MODERATE' | 'MAJOR'; isNew: boolean }

	const lang = $derived(page.params.lang as string | undefined);

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	const client = useConvexClient();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const resQuery = useQuery((api as any).reservations.getReservationWithDetails, {
		reservationId: page.params.id
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const inspectionsQuery = useQuery((api as any).inspections.getInspectionsForReservation, {
		reservationId: page.params.id
	});

	const reservationId = page.params.id;

	const reservation = $derived(resQuery.data);
	const existingInspections = $derived(inspectionsQuery.data ?? []);

	const hasDeparture = $derived(existingInspections.some((i: { type: string }) => i.type === 'DEPARTURE'));
	const hasReturn = $derived(existingInspections.some((i: { type: string }) => i.type === 'RETURN'));
	const inspectionType = $derived<'DEPARTURE' | 'RETURN'>(!hasDeparture ? 'DEPARTURE' : 'RETURN');

	const canInspect = $derived(
		reservation?.status === 'IN_PROGRESS' ||
		(inspectionType === 'DEPARTURE' && reservation?.status === 'CONFIRMED')
	);

	// ── Stepper ─────────────────────────────────────────────────────────────────
	const TOTAL = 3;
	const STEPS: { label: string; sublabel: string }[] = [
		{ label: 'Photos',     sublabel: '6 angles requis' },
		{ label: 'Dommages',   sublabel: 'Signalement optionnel' },
		{ label: 'Validation', sublabel: 'Vérifier et confirmer' }
	];

	let step = $state(1);
	let slideDir = $state(1);

	function next() {
		if (step === 1 && photos.length < 6) {
			toast.error('Photographiez les 6 angles du véhicule avant de continuer');
			return;
		}
		slideDir = 1;
		step = Math.min(step + 1, TOTAL);
	}

	function back() {
		if (step > 1) {
			slideDir = -1;
			step--;
		} else {
			goto(resolve(localHref(`/app/reservations/${reservationId}`)));
		}
	}

	// ── Form state ───────────────────────────────────────────────────────────────
	let photos = $state<PhotoEntry[]>([]);
	let damages = $state<Damage[]>([]);
	let kmAtInspection = $state('');
	let fuelLevel = $state(5);
	let notes = $state('');
	let submitting = $state(false);
	let done = $state(false);

	const FUEL_LABELS = ['Vide', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', 'Plein'];

	const newDamages = $derived(damages.filter((d) => d.isNew));

	async function handleSubmit() {
		submitting = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).inspections.createInspection, {
				reservationId,
				type: inspectionType,
				kmAtInspection: kmAtInspection ? parseInt(kmAtInspection) : undefined,
				fuelLevelPercent: Math.round((fuelLevel / 8) * 100),
				photos: photos.map(({ angle, storageId }) => ({ angle, storageId })),
				damages: damages.length > 0 ? damages : undefined,
				notes: notes.trim() || undefined
			});
			done = true;
			toast.success(
				inspectionType === 'DEPARTURE'
					? 'État des lieux départ enregistré'
					: 'État des lieux retour enregistré'
			);
		} catch {
			toast.error("Erreur lors de l'enregistrement");
		} finally {
			submitting = false;
		}
	}
</script>

<!-- ░░ Page wrapper ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ -->
<div class="flex h-full flex-col overflow-hidden bg-background">

	<!-- ══ HEADER ═══════════════════════════════════════════════════════════════ -->
	<header class="z-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-md">
		<div class="px-4 sm:px-6 lg:px-8">

			<!-- Row 1: back + title + count -->
			<div class="flex items-center gap-3 py-3.5">
				<button
					onclick={back}
					class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Retour"
				>
					<ArrowLeftIcon class="size-4" />
				</button>
				<div class="flex min-w-0 flex-1 items-baseline justify-between gap-4">
					<div class="min-w-0">
						<span class="truncate text-sm font-semibold">
							État des lieux — {inspectionType === 'DEPARTURE' ? 'Départ' : 'Retour'}
						</span>
						{#if reservation}
							<span class="ml-2 font-mono text-xs text-muted-foreground">
								{reservation.brand} {reservation.model} · {reservation.registration}
							</span>
						{/if}
					</div>
					{#if !done && canInspect}
						<span class="shrink-0 text-xs text-muted-foreground">{step} / {TOTAL}</span>
					{/if}
				</div>
			</div>

			<!-- Row 2: step circles (only when active wizard) -->
			{#if !done && canInspect && !(hasDeparture && hasReturn)}
				<div class="relative flex items-center pb-4">
					{#each STEPS as s, i}
						{@const n = i + 1}
						{@const isDone = n < step}
						{@const isActive = n === step}

						<div class="relative flex shrink-0 flex-col items-center">
							<div class={cn(
								'flex size-7 items-center justify-center rounded-full border-2 transition-all duration-300',
								isDone   ? 'border-primary bg-primary text-primary-foreground' : '',
								isActive ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/15' : '',
								!isDone && !isActive ? 'border-border bg-background text-muted-foreground' : ''
							)}>
								{#if isDone}
									<CheckIcon class="size-3.5" strokeWidth={3} />
								{:else}
									<span class="text-[11px] font-bold">{n}</span>
								{/if}
							</div>
							<span class={cn(
								'absolute top-9 hidden whitespace-nowrap text-[10px] font-semibold sm:block',
								isActive ? 'text-primary' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/40'
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
			{/if}
		</div>
	</header>

	<!-- ══ BODY ════════════════════════════════════════════════════════════════ -->

	{#if resQuery.isLoading}
		<div class="flex flex-1 items-center justify-center">
			<LoaderCircleIcon class="size-8 animate-spin text-muted-foreground/40" />
		</div>

	{:else if done}
		<!-- ── Confirmation ──────────────────────────────────────────────────── -->
		<div class="flex flex-1 items-center justify-center px-4" in:fade={{ duration: 300 }}>
			<div class="flex max-w-sm flex-col items-center gap-5 text-center">
				<div class="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
					<CheckCircleIcon class="size-8 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div>
					<h2 class="text-lg font-semibold">État des lieux enregistré</h2>
					<p class="mt-1.5 text-sm text-muted-foreground">
						{photos.length} photo{photos.length > 1 ? 's' : ''} ·
						{damages.length > 0
							? `${damages.length} dommage${damages.length > 1 ? 's' : ''} signalé${damages.length > 1 ? 's' : ''}`
							: 'Aucun dommage'}
					</p>
					{#if newDamages.length > 0}
						<p class="mt-2 text-xs text-amber-600 dark:text-amber-400">
							{newDamages.length} nouveau{newDamages.length > 1 ? 'x' : ''} dommage{newDamages.length > 1 ? 's' : ''} — les gestionnaires ont été notifiés
						</p>
					{/if}
				</div>
				<Button
					size="lg"
					class="w-full"
					onclick={() => goto(resolve(localHref(`/app/reservations/${reservationId}`)))}
				>
					Retour à la réservation
				</Button>
			</div>
		</div>

	{:else if !canInspect}
		<!-- ── Not available ─────────────────────────────────────────────────── -->
		<div class="flex flex-1 items-center justify-center px-4">
			<div class="flex max-w-sm flex-col items-center gap-4 text-center">
				<CameraIcon class="size-12 text-muted-foreground/30" />
				<div>
					<h2 class="font-semibold">État des lieux indisponible</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						L'état des lieux est disponible uniquement pour une réservation confirmée ou en cours.
					</p>
				</div>
				<Button
					variant="outline"
					onclick={() => goto(resolve(localHref(`/app/reservations/${reservationId}`)))}
				>
					Retour à la réservation
				</Button>
			</div>
		</div>

	{:else if hasDeparture && hasReturn}
		<!-- ── Both done ─────────────────────────────────────────────────────── -->
		<div class="flex flex-1 items-center justify-center px-4">
			<div class="flex max-w-sm flex-col items-center gap-4 text-center">
				<div class="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
					<CheckCircleIcon class="size-7 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div>
					<h2 class="font-semibold">États des lieux complétés</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Le départ et le retour ont déjà été enregistrés pour cette réservation.
					</p>
				</div>
				<Button
					variant="outline"
					onclick={() => goto(resolve(localHref(`/app/reservations/${reservationId}`)))}
				>
					Retour
				</Button>
			</div>
		</div>

	<!-- ── Step 1 — Photos ───────────────────────────────────────────────────── -->
	{:else if step === 1}
		<div
			class="flex-1 overflow-y-auto"
			in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}
		>
			<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-8">
					<div>
						<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
							{inspectionType === 'DEPARTURE' ? 'Photos de départ' : 'Photos de retour'}
						</h1>
						<p class="mt-1.5 text-muted-foreground">
							Photographiez le véhicule sous les 6 angles. Appuyez sur chaque case pour prendre ou importer une photo.
						</p>
					</div>

					<InspectionPhotos
						{photos}
						onchange={(p) => (photos = p)}
					/>

					{#if photos.length > 0 && photos.length < 6}
						<p class="text-sm text-muted-foreground" in:fade={{ duration: 150 }}>
							{photos.length}/6 photos — encore {6 - photos.length} angle{6 - photos.length > 1 ? 's' : ''} requis
						</p>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<div class="flex flex-col gap-2">
							<label class="flex flex-col gap-2">
								<span class="text-sm font-semibold">Kilométrage</span>
								<Input type="number" bind:value={kmAtInspection} placeholder="ex: 42 500" class="h-12 px-4" />
							</label>
						</div>
						<div class="flex flex-col gap-2">
							<span class="text-sm font-semibold">Niveau carburant</span>
							<div class="flex h-12 flex-col justify-center rounded-xl border border-border bg-card px-4">
								<input
									type="range"
									min="0"
									max="8"
									step="1"
									bind:value={fuelLevel}
									class="w-full accent-primary"
								/>
								<div class="flex justify-between text-[10px] text-muted-foreground">
									<span>Vide</span>
									<span class="font-semibold text-foreground">{FUEL_LABELS[fuelLevel]}</span>
									<span>Plein</span>
								</div>
							</div>
						</div>
					</div>

					<Button
						size="lg"
						class="w-full text-base"
						disabled={photos.length < 6}
						onclick={next}
					>
						Continuer — signaler les dommages
						<ArrowRightIcon class="size-4" />
					</Button>
				</div>
			</div>
		</div>

	<!-- ── Step 2 — Dommages ─────────────────────────────────────────────────── -->
	{:else if step === 2}
		<div
			class="flex-1 overflow-y-auto"
			in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}
		>
			<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-8">
					<div>
						<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Dommages constatés</h1>
						<p class="mt-1.5 text-muted-foreground">
							{inspectionType === 'DEPARTURE'
								? 'Signalez les dommages pré-existants pour vous protéger en cas de litige.'
								: 'Signalez tout nouveau dommage constaté au retour du véhicule.'}
						</p>
					</div>

					<InspectionDamages {damages} onchange={(d) => (damages = d)} />

					{#if damages.some(d => d.isNew)}
						<div
							class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
							in:fade={{ duration: 200 }}
						>
							<AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
							<p class="text-sm text-amber-700 dark:text-amber-400">
								Les dommages nouveaux seront signalés aux gestionnaires de flotte.
							</p>
						</div>
					{/if}

					<div class="flex flex-col gap-2">
						<label class="flex flex-col gap-2">
							<span class="text-sm font-semibold">Notes complémentaires</span>
							<textarea
								bind:value={notes}
								rows={3}
								placeholder="Observations, remarques particulières…"
								class="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xs transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							></textarea>
						</label>
					</div>

					<Button size="lg" class="w-full text-base" onclick={next}>
						Vérifier et confirmer
						<ArrowRightIcon class="size-4" />
					</Button>
				</div>
			</div>
		</div>

	<!-- ── Step 3 — Confirmation ─────────────────────────────────────────────── -->
	{:else if step === 3}
		<div
			class="flex-1 overflow-y-auto"
			in:fly={{ y: slideDir * 24, duration: 280, opacity: 0 }}
		>
			<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6">
				<div class="flex flex-col gap-8">
					<div>
						<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Vérifier l'état des lieux</h1>
						<p class="mt-1.5 text-muted-foreground">
							Vérifiez les informations avant de valider.
						</p>
					</div>

					<!-- Récap -->
					<div class="flex flex-col gap-3">
						<div class="overflow-hidden rounded-2xl border border-border">
							<div class="flex flex-col divide-y divide-border text-sm">
								<div class="flex items-center justify-between px-4 py-3">
									<span class="text-muted-foreground">Type</span>
									<span class="font-medium">
										{inspectionType === 'DEPARTURE' ? 'État des lieux départ' : 'État des lieux retour'}
									</span>
								</div>
								<div class="flex items-center justify-between px-4 py-3">
									<span class="text-muted-foreground">Photos</span>
									<span class="font-medium">{photos.length} / 6</span>
								</div>
								{#if kmAtInspection}
									<div class="flex items-center justify-between px-4 py-3">
										<span class="text-muted-foreground">Kilométrage</span>
										<span class="font-medium tabular-nums">{parseInt(kmAtInspection).toLocaleString('fr-FR')} km</span>
									</div>
								{/if}
								<div class="flex items-center justify-between px-4 py-3">
									<span class="text-muted-foreground">Carburant</span>
									<span class="font-medium">{FUEL_LABELS[fuelLevel]}</span>
								</div>
								<div class="flex items-center justify-between px-4 py-3">
									<span class="text-muted-foreground">Dommages signalés</span>
									<span class={cn('font-medium', damages.length > 0 ? 'text-amber-600 dark:text-amber-400' : '')}>
										{damages.length === 0 ? 'Aucun' : `${damages.length} dommage${damages.length > 1 ? 's' : ''}`}
									</span>
								</div>
								{#if notes}
									<div class="flex flex-col gap-1 px-4 py-3">
										<span class="text-muted-foreground">Notes</span>
										<span class="text-sm">{notes}</span>
									</div>
								{/if}
							</div>
						</div>

						{#if newDamages.length > 0}
							<div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
								<AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
								<p class="text-sm text-amber-700 dark:text-amber-400">
									<strong>{newDamages.length} nouveau{newDamages.length > 1 ? 'x' : ''} dommage{newDamages.length > 1 ? 's' : ''}</strong>
									— les gestionnaires seront notifiés.
								</p>
							</div>
						{/if}
					</div>

					<Button
						size="lg"
						class="w-full text-base"
						disabled={submitting}
						onclick={handleSubmit}
					>
						{#if submitting}
							<LoaderCircleIcon class="size-4 animate-spin" />
						{:else}
							<CheckIcon class="size-4" />
						{/if}
						Valider l'état des lieux
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
