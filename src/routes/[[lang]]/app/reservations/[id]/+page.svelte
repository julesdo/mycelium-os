<script lang="ts">
	import { page } from '$app/state';
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CarIcon from '@lucide/svelte/icons/car';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import XIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import TruckIcon from '@lucide/svelte/icons/truck';
	import ClipboardCheckIcon from '@lucide/svelte/icons/clipboard-check';
	import { RESERVATION_STATUS_CONFIG } from '$lib/components/reservations/status.js';
	import { cn } from '$lib/utils.js';

	const lang = $derived(page.params.lang as string | undefined);

	const client = useConvexClient();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const resQuery = useQuery((api as any).reservations.getReservationWithDetails, {
		reservationId: page.params.id
	});

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	const ENERGY_LABELS: Record<string, string> = {
		THERMAL: 'Thermique',
		HYBRID: 'Hybride',
		ELECTRIC: 'Électrique'
	};

	const CATEGORY_LABELS: Record<string, string> = {
		PASSENGER: 'Tourisme',
		UTILITY: 'Utilitaire',
		TRUCK: 'Camion'
	};

	let isEditing = $state(false);
	let editPurpose = $state('');
	let editNotes = $state('');
	let editStartStr = $state('');
	let editEndStr = $state('');
	let submitting = $state(false);
	let cancelling = $state(false);
	let showCancelConfirm = $state(false);

	$effect(() => {
		const res = resQuery.data;
		if (res && !isEditing) {
			editPurpose = res.purpose;
			editNotes = res.notes ?? '';
			editStartStr = format(new Date(res.startDate), "yyyy-MM-dd'T'HH:mm");
			editEndStr = format(new Date(res.endDate), "yyyy-MM-dd'T'HH:mm");
		}
	});

	const isCancellable = $derived(
		resQuery.data?.status === 'PENDING' || resQuery.data?.status === 'CONFIRMED'
	);

	const isEditable = $derived(
		resQuery.data?.status === 'PENDING' || resQuery.data?.status === 'CONFIRMED'
	);

	const canInspect = $derived(
		resQuery.data?.status === 'IN_PROGRESS' || resQuery.data?.status === 'CONFIRMED'
	);

	function formatDate(ts: number) {
		const d = new Date(ts);
		const h = d.getHours();
		const m = d.getMinutes();
		if ((h === 0 && m === 0) || (h === 23 && m >= 59)) {
			return format(d, 'd MMMM yyyy', { locale: fr });
		}
		return format(d, "d MMMM yyyy 'à' HH:mm", { locale: fr });
	}

	function durationLabel(start: number, end: number): string {
		const totalMinutes = Math.round((end - start) / 60_000);
		if (totalMinutes < 60) return `${totalMinutes} min`;
		const hours = Math.floor(totalMinutes / 60);
		const mins = totalMinutes % 60;
		if (hours < 24) return mins > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${hours}h`;
		const days = Math.floor(hours / 24);
		const remHours = hours % 24;
		return remHours > 0 ? `${days}j ${remHours}h` : `${days} jour${days > 1 ? 's' : ''}`;
	}

	function shortId(id: string) {
		return id.slice(-8).toUpperCase();
	}

	async function handleSave() {
		const res = resQuery.data;
		if (!res) return;
		submitting = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.updateReservation, {
				reservationId: res._id,
				startDate: new Date(editStartStr).getTime(),
				endDate: new Date(editEndStr).getTime(),
				purpose: editPurpose.trim(),
				notes: editNotes.trim() || undefined
			});
			toast.success('Réservation mise à jour');
			isEditing = false;
		} catch (err: unknown) {
			const convexErr = err as { data?: { code?: string } };
			if (convexErr?.data?.code === 'VEHICLE_NOT_AVAILABLE') {
				toast.error('Conflit : ce véhicule est déjà réservé sur cette période.');
			} else {
				toast.error('Erreur lors de la mise à jour.');
			}
		} finally {
			submitting = false;
		}
	}

	async function handleCancel() {
		const res = resQuery.data;
		if (!res) return;
		cancelling = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).reservations.cancelReservation, {
				reservationId: res._id
			});
			toast.success('Réservation annulée');
			goto(resolve(localHref('/app/reservations')));
		} catch {
			toast.error("Erreur lors de l'annulation.");
		} finally {
			cancelling = false;
			showCancelConfirm = false;
		}
	}
</script>

<div class="flex flex-col gap-6 px-4 pb-10 lg:px-6 xl:px-8 2xl:px-16">
	{#if resQuery.isLoading}
		<div class="flex flex-col gap-6">
			<div class="flex items-center gap-3">
				<Skeleton class="size-8 rounded-lg" />
				<div class="flex flex-col gap-2">
					<Skeleton class="h-5 w-48" />
					<Skeleton class="h-3.5 w-32" />
				</div>
				<Skeleton class="ml-auto h-5 w-20 rounded-full" />
			</div>
			<div class="grid gap-4 lg:grid-cols-2">
				<Skeleton class="h-36 w-full rounded-2xl" />
				<Skeleton class="h-36 w-full rounded-2xl" />
				<Skeleton class="h-48 w-full rounded-2xl lg:col-span-2" />
			</div>
		</div>

	{:else if !resQuery.data}
		<EmptyState
			title="Réservation introuvable"
			description="Cette réservation n'existe pas ou vous n'y avez pas accès."
		>
			{#snippet icon()}<CalendarIcon class="size-12" />{/snippet}
			{#snippet action()}
				<Button onclick={() => goto(resolve(localHref('/app/reservations')))}>
					Retour aux réservations
				</Button>
			{/snippet}
		</EmptyState>

	{:else}
		{@const res = resQuery.data}
		{@const statusCfg = RESERVATION_STATUS_CONFIG[res.status as keyof typeof RESERVATION_STATUS_CONFIG] ?? { label: res.status, class: 'bg-muted text-muted-foreground' }}

		<!-- Header -->
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => goto(resolve(localHref('/app/reservations')))}
					aria-label="Retour aux réservations"
				>
					<ArrowLeftIcon class="size-4" />
				</Button>
				<div>
					<div class="flex items-center gap-2.5">
						<h1 class="text-base font-semibold tracking-tight">
							Réservation #{shortId(res._id)}
						</h1>
						<span
							class={cn(
								'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
								statusCfg.class
							)}
						>
							{statusCfg.label}
						</span>
					</div>
					<p class="mt-0.5 text-[13px] text-muted-foreground">
						{formatDate(res.startDate)} → {formatDate(res.endDate)}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				{#if canInspect && !isEditing}
					<Button
						size="sm"
						variant="outline"
						onclick={() => goto(resolve(localHref(`/app/reservations/${res._id}/inspect`)))}
					>
						<ClipboardCheckIcon class="size-4" />
						État des lieux
					</Button>
				{/if}
				{#if isEditable}
					{#if isEditing}
						<Button size="sm" variant="ghost" onclick={() => (isEditing = false)} disabled={submitting}>
							<XIcon class="size-4" />
							Annuler
						</Button>
						<Button size="sm" onclick={handleSave} disabled={submitting}>
							{#if submitting}
								<LoaderCircleIcon class="size-3.5 animate-spin" />
							{:else}
								<CheckIcon class="size-4" />
							{/if}
							Enregistrer
						</Button>
					{:else}
						<Button size="sm" variant="outline" onclick={() => (isEditing = true)}>
							<PencilIcon class="size-4" />
							Modifier
						</Button>
					{/if}
				{/if}
				{#if isCancellable && !isEditing}
					{#if showCancelConfirm}
						<Button
							size="sm"
							variant="ghost"
							onclick={() => (showCancelConfirm = false)}
							disabled={cancelling}
						>
							Garder
						</Button>
						<Button
							size="sm"
							class="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
							onclick={handleCancel}
							disabled={cancelling}
						>
							{cancelling ? 'Annulation…' : 'Confirmer l\'annulation'}
						</Button>
					{:else}
						<Button
							size="sm"
							variant="outline"
							class="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
							onclick={() => (showCancelConfirm = true)}
						>
							Annuler la réservation
						</Button>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Content grid -->
		<div class="grid gap-4 lg:grid-cols-2">

			<!-- Véhicule -->
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						<CarIcon class="size-3.5" />
						Véhicule
					</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-2">
					<p class="text-base font-semibold">{res.brand} {res.model}</p>
					<p class="font-mono text-sm tracking-wide text-muted-foreground">{res.registration}</p>
					<div class="flex flex-wrap gap-1.5">
						<span class="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
							<TruckIcon class="size-3" />
							{CATEGORY_LABELS[res.category] ?? res.category}
						</span>
						<span class="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
							<ZapIcon class="size-3" />
							{ENERGY_LABELS[res.energy] ?? res.energy}
						</span>
					</div>
					{#if res.location}
						<p class="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
							<MapPinIcon class="size-3.5 shrink-0" />
							{res.location}
						</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Dates -->
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						<CalendarIcon class="size-3.5" />
						Dates
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if isEditing}
						<div class="grid grid-cols-2 gap-3">
							<div class="flex flex-col gap-1.5">
								<Label for="edit-start">Début</Label>
								<Input id="edit-start" type="datetime-local" bind:value={editStartStr} />
							</div>
							<div class="flex flex-col gap-1.5">
								<Label for="edit-end">Fin</Label>
								<Input id="edit-end" type="datetime-local" bind:value={editEndStr} min={editStartStr} />
							</div>
						</div>
					{:else}
						<div class="flex flex-col gap-1.5">
							<p class="text-sm font-medium">{formatDate(res.startDate)}</p>
							<p class="text-sm text-muted-foreground">→ {formatDate(res.endDate)}</p>
							<span class="mt-1 inline-flex self-start rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
								{durationLabel(res.startDate, res.endDate)}
							</span>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Détails -->
			<Card.Root class="lg:col-span-2">
				<Card.Header class="pb-3">
					<Card.Title class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Détails
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if isEditing}
						<div class="flex flex-col gap-4">
							<div class="flex flex-col gap-1.5">
								<Label for="edit-purpose">Motif</Label>
								<Input id="edit-purpose" bind:value={editPurpose} />
							</div>
							<div class="flex flex-col gap-1.5">
								<Label for="edit-notes">Notes</Label>
								<Textarea id="edit-notes" bind:value={editNotes} rows={3} />
							</div>
						</div>
					{:else}
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div class="flex flex-col gap-0.5">
								<p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
									Motif
								</p>
								<p class="text-sm">{res.purpose}</p>
							</div>
							{#if res.notes}
								<div class="flex flex-col gap-0.5 sm:col-span-2">
									<p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
										Notes
									</p>
									<p class="text-sm text-muted-foreground">{res.notes}</p>
								</div>
							{/if}
							<div class="flex flex-col gap-0.5">
								<p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
									Créée le
								</p>
								<p class="text-sm text-muted-foreground">{formatDate(res.createdAt)}</p>
							</div>
							{#if res.updatedAt !== res.createdAt}
								<div class="flex flex-col gap-0.5">
									<p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
										Modifiée le
									</p>
									<p class="text-sm text-muted-foreground">{formatDate(res.updatedAt)}</p>
								</div>
							{/if}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
