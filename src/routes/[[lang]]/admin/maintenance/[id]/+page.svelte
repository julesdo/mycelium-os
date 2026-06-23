<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import MaintenanceStatusBadge from '$lib/components/maintenance/MaintenanceStatusBadge.svelte';
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import {
		TYPE_LABELS,
		type MaintenanceType,
		type MaintenanceStatus
	} from '$lib/components/maintenance/types.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import CarIcon from '@lucide/svelte/icons/car';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import EuroIcon from '@lucide/svelte/icons/euro';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import PlayIcon from '@lucide/svelte/icons/play';
	import PhoneIcon from '@lucide/svelte/icons/phone';

	const lang = $derived(page.params.lang as string | undefined);

	const client = useConvexClient();

	const recordArgs = $state({ recordId: page.params.id as string });
	$effect(() => { recordArgs.recordId = page.params.id as string; });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const recordQuery = useQuery((api as any).maintenance.getMaintenanceWithDetails, recordArgs);

	const record = $derived(recordQuery.data);
	const isLoading = $derived(recordQuery.isLoading);

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	function goBack() {
		goto(resolve(localHref('/admin/maintenance')));
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatCost(n: number): string {
		return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
	}

	// ── Status actions ─────────────────────────────────────────────────────────
	let isChangingStatus = $state(false);
	let showCompleteDialog = $state(false);
	let costActual = $state('');
	let completionNotes = $state('');
	let showCancelDialog = $state(false);
	let cancelReason = $state('');

	async function markInProgress() {
		if (!record) return;
		isChangingStatus = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).maintenance.updateMaintenanceStatus, {
				recordId: page.params.id,
				status: 'IN_PROGRESS'
			});
			toast.success('Entretien démarré');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			isChangingStatus = false;
		}
	}

	async function markCompleted() {
		if (!record) return;
		const cost = parseFloat(costActual.replace(',', '.'));
		if (isNaN(cost)) {
			toast.error('Veuillez saisir un coût valide');
			return;
		}
		isChangingStatus = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).maintenance.completeMaintenance, {
				recordId: page.params.id,
				completedDate: Date.now(),
				costActual: cost,
				notes: completionNotes || undefined
			});
			toast.success('Entretien marqué comme terminé');
			showCompleteDialog = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			isChangingStatus = false;
		}
	}

	async function cancelRecord() {
		if (!record) return;
		isChangingStatus = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).maintenance.cancelMaintenance, {
				recordId: page.params.id,
				reason: cancelReason || undefined
			});
			toast.success('Entretien annulé');
			showCancelDialog = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			isChangingStatus = false;
		}
	}

	const TIMELINE_STEPS: { status: string; label: string }[] = [
		{ status: 'SCHEDULED', label: 'Planifié' },
		{ status: 'IN_PROGRESS', label: 'En cours' },
		{ status: 'COMPLETED', label: 'Terminé' }
	];

	const statusOrder: Record<string, number> = {
		SCHEDULED: 0,
		IN_PROGRESS: 1,
		COMPLETED: 2,
		CANCELLED: -1
	};

	const currentStatusOrder = $derived(statusOrder[record?.status ?? 'SCHEDULED'] ?? 0);
</script>

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8 2xl:px-16">
	{#if isLoading}
		<div class="flex flex-col gap-6">
			<div class="flex items-center gap-3">
				<Skeleton class="size-8 rounded" />
				<Skeleton class="h-8 w-48" />
				<Skeleton class="h-5 w-24 rounded-full" />
			</div>
			<Skeleton class="h-40 w-full rounded-lg" />
			<Skeleton class="h-32 w-full rounded-lg" />
		</div>
	{:else if !record}
		<EmptyState
			title="Entretien introuvable"
			description="Cet entretien n'existe pas ou vous n'y avez pas accès."
		>
			{#snippet icon()}<WrenchIcon class="size-12" />{/snippet}
			{#snippet action()}
				<Button onclick={goBack}>Retour à la maintenance</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<!-- Header -->
		<div class="flex items-center justify-between gap-4 flex-wrap">
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="icon-sm" onclick={goBack} aria-label="Retour">
					<ArrowLeftIcon class="size-4" />
				</Button>
				<div class="flex flex-col gap-0.5">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-xl font-bold">
							{TYPE_LABELS[record.maintenanceType as MaintenanceType] ?? record.maintenanceType}
						</h1>
						<MaintenanceStatusBadge status={record.status as MaintenanceStatus} />
					</div>
					<p class="text-sm text-muted-foreground">
						{record.vehicle?.registration ?? '—'} · {record.vehicle?.brand} {record.vehicle?.model}
					</p>
				</div>
			</div>

			<!-- Actions -->
			{#if record.status !== 'COMPLETED' && record.status !== 'CANCELLED'}
				<div class="flex items-center gap-2">
					{#if record.status === 'SCHEDULED'}
						<Button
							variant="outline"
							size="sm"
							class="gap-1.5"
							disabled={isChangingStatus}
							onclick={markInProgress}
						>
							<PlayIcon class="size-3.5" />
							Démarrer
						</Button>
					{/if}
					<Button
						size="sm"
						class="gap-1.5"
						disabled={isChangingStatus}
						onclick={() => (showCompleteDialog = true)}
					>
						<CheckIcon class="size-3.5" />
						Marquer terminé
					</Button>
					<Button
						variant="outline"
						size="sm"
						class="gap-1.5 text-destructive hover:text-destructive"
						onclick={() => (showCancelDialog = true)}
					>
						<XIcon class="size-3.5" />
						Annuler
					</Button>
				</div>
			{/if}
		</div>

		<!-- Timeline -->
		{#if record.status !== 'CANCELLED'}
			<div class="flex items-center gap-2">
				{#each TIMELINE_STEPS as tStep, i (tStep.status)}
					{@const done = (statusOrder[tStep.status] ?? -1) <= currentStatusOrder}
					{@const isCurrent = tStep.status === record.status}
					<div class="flex items-center gap-2">
						<div class="flex flex-col items-center gap-1">
							<div
								class="flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors
								{done
									? isCurrent
										? 'bg-primary text-primary-foreground'
										: 'bg-primary/20 text-primary'
									: 'bg-muted text-muted-foreground'}"
							>
								{#if done && !isCurrent}
									<CheckIcon class="size-3.5" />
								{:else}
									{i + 1}
								{/if}
							</div>
							<span class="text-[11px] font-medium {done ? 'text-foreground' : 'text-muted-foreground'}">
								{tStep.label}
							</span>
						</div>
						{#if i < TIMELINE_STEPS.length - 1}
							<div
								class="h-0.5 w-12 rounded-full transition-colors {(statusOrder[tStep.status] ?? -1) < currentStatusOrder
									? 'bg-primary/40'
									: 'bg-muted'}"
							></div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
				<XIcon class="size-4 text-muted-foreground" />
				<span class="text-sm text-muted-foreground">
					Cet entretien a été annulé.
					{#if record.notes}
						Motif : {record.notes}
					{/if}
				</span>
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2">
			<!-- Véhicule -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						<CarIcon class="size-4" />
						Véhicule
					</Card.Title>
				</Card.Header>
				<Card.Content class="pt-0">
					<dl class="grid grid-cols-2 gap-x-6 gap-y-3">
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Immatriculation</dt>
							<dd class="font-mono text-sm font-medium">{record.vehicle?.registration ?? '—'}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Marque / Modèle</dt>
							<dd class="text-sm">{record.vehicle?.brand} {record.vehicle?.model}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Type d'entretien</dt>
							<dd class="text-sm font-medium">{TYPE_LABELS[record.maintenanceType as MaintenanceType] ?? record.maintenanceType}</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Date planifiée</dt>
							<dd class="text-sm">{formatDate(record.scheduledDate)}</dd>
						</div>
						{#if record.completedDate}
							<div class="flex flex-col gap-0.5">
								<dt class="text-xs text-muted-foreground">Date de réalisation</dt>
								<dd class="text-sm">{formatDate(record.completedDate)}</dd>
							</div>
						{/if}
					</dl>
				</Card.Content>
			</Card.Root>

			<!-- Garage -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						<MapPinIcon class="size-4" />
						Garage
					</Card.Title>
				</Card.Header>
				<Card.Content class="pt-0">
					{#if record.garage}
						<dl class="flex flex-col gap-3">
							<div class="flex flex-col gap-0.5">
								<dt class="text-xs text-muted-foreground">Nom</dt>
								<dd class="text-sm font-medium">{record.garage.name}</dd>
							</div>
							<div class="flex flex-col gap-0.5">
								<dt class="text-xs text-muted-foreground">Adresse</dt>
								<dd class="text-sm">{record.garage.address}, {record.garage.city} {record.garage.zipcode}</dd>
							</div>
							{#if record.garage.phone}
								<div class="flex items-center gap-1.5 text-sm">
									<PhoneIcon class="size-3.5 text-muted-foreground" />
									{record.garage.phone}
								</div>
							{/if}
						</dl>
					{:else}
						<p class="text-sm text-muted-foreground">Aucun garage assigné.</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Coûts -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						<EuroIcon class="size-4" />
						Coûts
					</Card.Title>
				</Card.Header>
				<Card.Content class="pt-0">
					<dl class="grid grid-cols-2 gap-x-6 gap-y-3">
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Coût estimé</dt>
							<dd class="text-sm">
								{record.costEstimate != null ? formatCost(record.costEstimate) : '—'}
							</dd>
						</div>
						<div class="flex flex-col gap-0.5">
							<dt class="text-xs text-muted-foreground">Coût réel</dt>
							<dd class="text-sm font-medium">
								{record.costActual != null ? formatCost(record.costActual) : '—'}
							</dd>
						</div>
					</dl>
				</Card.Content>
			</Card.Root>

			<!-- Facture & Notes -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
						<CalendarIcon class="size-4" />
						Facture & Notes
					</Card.Title>
				</Card.Header>
				<Card.Content class="pt-0 flex flex-col gap-3">
					{#if record.invoiceUrl}
						<a
							href={record.invoiceUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 text-sm text-primary underline"
						>
							<UploadIcon class="size-3.5" />
							Voir la facture
						</a>
					{:else if record.status === 'COMPLETED'}
						<Button
							variant="outline"
							size="sm"
							class="w-fit gap-1.5"
							onclick={() => toast.info('Upload de facture à venir')}
						>
							<UploadIcon class="size-3.5" />
							Uploader la facture
						</Button>
					{:else}
						<p class="text-sm text-muted-foreground">Aucune facture pour le moment.</p>
					{/if}

					{#if record.notes}
						<div class="rounded-md bg-muted/50 px-3 py-2">
							<p class="text-xs text-muted-foreground">Notes</p>
							<p class="mt-0.5 text-sm">{record.notes}</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

<!-- Complete dialog -->
<Dialog.Root bind:open={showCompleteDialog}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Marquer comme terminé</Dialog.Title>
				<Dialog.Description>
					Saisissez le coût réel de l'entretien pour finaliser.
				</Dialog.Description>
			</Dialog.Header>
			<div class="mt-4 flex flex-col gap-3">
				<div>
					<label class="text-sm font-medium" for="cost-actual">Coût réel (€)</label>
					<Input id="cost-actual" type="text" bind:value={costActual} placeholder="ex : 285" class="mt-1.5" />
				</div>
				<div>
					<label class="text-sm font-medium" for="completion-notes">Notes (optionnel)</label>
					<Textarea id="completion-notes" bind:value={completionNotes} rows={3} placeholder="Travaux effectués, observations…" class="mt-1.5" />
				</div>
			</div>
			<Dialog.Footer class="mt-4">
				<Button variant="outline" onclick={() => (showCompleteDialog = false)}>Annuler</Button>
				<Button disabled={isChangingStatus} onclick={markCompleted} class="gap-1.5">
					<CheckIcon class="size-4" />
					Confirmer
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Cancel dialog -->
<Dialog.Root bind:open={showCancelDialog}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Annuler l'entretien</Dialog.Title>
				<Dialog.Description>
					Cette action est irréversible. Indiquez le motif optionnellement.
				</Dialog.Description>
			</Dialog.Header>
			<div class="mt-4">
				<label class="text-sm font-medium" for="cancel-reason">Motif (optionnel)</label>
				<textarea
					id="cancel-reason"
					bind:value={cancelReason}
					rows={2}
					placeholder="Raison de l'annulation…"
					class="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				></textarea>
			</div>
			<Dialog.Footer class="mt-4">
				<Button variant="outline" onclick={() => (showCancelDialog = false)}>Fermer</Button>
				<Button
					variant="destructive"
					disabled={isChangingStatus}
					onclick={cancelRecord}
					class="gap-1.5"
				>
					<XIcon class="size-4" />
					Annuler l'entretien
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
