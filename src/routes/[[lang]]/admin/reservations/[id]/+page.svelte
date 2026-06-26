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

	const lang = $derived(page.params.lang as string | undefined);

	const client = useConvexClient();

	const resQuery = useQuery((api as any).reservations.getReservationWithDetails, {
		reservationId: page.params.id
	});

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	const STATUS_LABELS: Record<string, string> = {
		PENDING: 'En attente',
		CONFIRMED: 'Confirmée',
		IN_PROGRESS: 'En cours',
		COMPLETED: 'Terminée',
		CANCELLED: 'Annulée'
	};

	const STATUS_STYLES: Record<string, string> = {
		PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
		CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
		IN_PROGRESS: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
		COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
		CANCELLED: 'bg-muted text-muted-foreground'
	};

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

	function formatDate(ts: number) {
		const d = new Date(ts);
		const h = d.getHours();
		const m = d.getMinutes();
		if ((h === 0 && m === 0) || (h === 23 && m >= 59)) {
			return format(d, 'd MMMM yyyy', { locale: fr });
		}
		return format(d, 'd MMMM yyyy à HH:mm', { locale: fr });
	}

	function durationLabel(start: number, end: number): string {
		const ms = end - start;
		const totalMinutes = Math.round(ms / 60_000);
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
		if (!res || !confirm("Confirmer l'annulation de cette réservation ?")) return;
		cancelling = true;
		try {
			await client.mutation((api as any).reservations.cancelReservation, {
				reservationId: res._id
			});
			toast.success('Réservation annulée');
			goto(resolve(localHref('/admin/reservations')));
		} catch {
			toast.error("Erreur lors de l'annulation.");
		} finally {
			cancelling = false;
		}
	}
</script>

<div class="flex flex-col gap-6 px-4 lg:px-6 xl:px-8 2xl:px-16">
	{#if resQuery.isLoading}
		<div class="flex flex-col gap-6">
			<div class="flex items-center gap-3">
				<Skeleton class="size-8 rounded" />
				<Skeleton class="h-8 w-48" />
				<Skeleton class="h-5 w-20 rounded-full" />
			</div>
			<div class="grid gap-4 lg:grid-cols-2">
				<Skeleton class="h-36 w-full rounded-lg" />
				<Skeleton class="h-36 w-full rounded-lg" />
				<Skeleton class="h-48 w-full rounded-lg lg:col-span-2" />
			</div>
		</div>
	{:else if !resQuery.data}
		<EmptyState
			title="Réservation introuvable"
			description="Cette réservation n'existe pas ou vous n'y avez pas accès."
		>
			{#snippet icon()}<CalendarIcon class="size-12" />{/snippet}
			{#snippet action()}
				<Button onclick={() => goto(resolve(localHref('/admin/reservations')))}>
					Retour au calendrier
				</Button>
			{/snippet}
		</EmptyState>
	{:else}
		{@const res = resQuery.data}

		<!-- Header -->
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<!-- eslint-disable local/no-hardcoded-aria-label -->
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => goto(resolve(localHref('/admin/reservations')))}
					aria-label="Retour au calendrier"
				>
					<ArrowLeftIcon class="size-4" />
				</Button>
				<!-- eslint-enable local/no-hardcoded-aria-label -->
				<div>
					<div class="flex items-center gap-2.5">
						<h1 class="text-xl font-bold">Réservation #{shortId(res._id)}</h1>
						<span
							class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {STATUS_STYLES[
								res.status
							] ?? ''}"
						>
							{STATUS_LABELS[res.status] ?? res.status}
						</span>
					</div>
					<p class="text-sm text-muted-foreground">
						{formatDate(res.startDate)} → {formatDate(res.endDate)}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				{#if isEditable}
					{#if isEditing}
						<Button
							size="sm"
							variant="ghost"
							onclick={() => (isEditing = false)}
							disabled={submitting}
						>
							<XIcon class="size-4" />
							Annuler
						</Button>
						<Button size="sm" onclick={handleSave} disabled={submitting}>
							{#if submitting}
								<LoaderCircleIcon class="size-3.5 motion-safe:animate-spin" />
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
					<Button
						size="sm"
						variant="outline"
						class="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
						onclick={handleCancel}
						disabled={cancelling}
					>
						{cancelling ? 'Annulation…' : 'Annuler la réservation'}
					</Button>
				{/if}
			</div>
		</div>

		<!-- Content grid -->
		<div class="grid gap-4 lg:grid-cols-2">
			<!-- Vehicle card -->
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title
						class="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>
						<CarIcon class="size-3.5" />
						Véhicule
					</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-1.5">
					<p class="text-lg font-semibold">{res.brand} {res.model}</p>
					<p class="font-mono text-sm tracking-wide text-muted-foreground">{res.registration}</p>
					<div class="mt-1 flex flex-wrap gap-1.5">
						<span class="rounded-md bg-muted px-2 py-0.5 text-xs">
							{CATEGORY_LABELS[res.category] ?? res.category}
						</span>
						<span class="rounded-md bg-muted px-2 py-0.5 text-xs">
							{ENERGY_LABELS[res.energy] ?? res.energy}
						</span>
					</div>
					{#if res.location}
						<p class="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
							<MapPinIcon class="size-3.5 shrink-0" />
							{res.location}
						</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Dates card -->
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title
						class="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>
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
								<Input
									id="edit-end"
									type="datetime-local"
									bind:value={editEndStr}
									min={editStartStr}
								/>
							</div>
						</div>
					{:else}
						<div class="flex flex-col gap-1">
							<p class="text-base font-medium">{formatDate(res.startDate)}</p>
							<p class="text-sm text-muted-foreground">→ {formatDate(res.endDate)}</p>
							<p class="mt-1 text-xs text-muted-foreground">
								{durationLabel(res.startDate, res.endDate)}
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Details card -->
			<Card.Root class="lg:col-span-2">
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Détails
					</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					{#if isEditing}
						<div class="flex flex-col gap-1.5">
							<Label for="edit-purpose">Motif</Label>
							<Input id="edit-purpose" bind:value={editPurpose} />
						</div>
						<div class="flex flex-col gap-1.5">
							<Label for="edit-notes">Notes</Label>
							<Textarea id="edit-notes" bind:value={editNotes} rows={3} />
						</div>
					{:else}
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div>
								<p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
									Motif
								</p>
								<p class="text-sm">{res.purpose}</p>
							</div>
							{#if res.notes}
								<div>
									<p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
										Notes
									</p>
									<p class="text-sm text-muted-foreground">{res.notes}</p>
								</div>
							{/if}
							<div>
								<p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
									Créée le
								</p>
								<p class="text-sm text-muted-foreground">{formatDate(res.createdAt)}</p>
							</div>
							{#if res.updatedAt !== res.createdAt}
								<div>
									<p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
