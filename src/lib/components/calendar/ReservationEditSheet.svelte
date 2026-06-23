<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import type { CalendarReservation } from './ReservationBlock.svelte';

	type Props = {
		reservation: CalendarReservation | null;
		reservations: CalendarReservation[];
		onUpdate: (
			resId: string,
			patch: { startDate?: number; endDate?: number; purpose?: string; notes?: string }
		) => Promise<'SUCCESS' | 'CONFLICT' | 'ERROR'>;
		onCancel: (res: CalendarReservation) => Promise<void>;
		onClose: () => void;
	};

	let { reservation = $bindable(), reservations, onUpdate, onCancel, onClose }: Props = $props();

	const open = $derived(reservation !== null);

	let editPurpose = $state('');
	let editNotes = $state('');
	let editStartStr = $state('');
	let editEndStr = $state('');
	let submitting = $state(false);
	let cancelling = $state(false);
	let confirmingCancel = $state(false);
	let error = $state('');

	$effect(() => {
		if (reservation) {
			editPurpose = reservation.purpose;
			editNotes = reservation.notes ?? '';
			editStartStr = format(new Date(reservation.startDate), "yyyy-MM-dd'T'HH:mm");
			editEndStr = format(new Date(reservation.endDate), "yyyy-MM-dd'T'HH:mm");
			error = '';
			confirmingCancel = false;
		}
	});

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
		COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
		CANCELLED: 'bg-muted text-muted-foreground'
	};

	const isCancellable = $derived(
		reservation?.status === 'PENDING' || reservation?.status === 'CONFIRMED'
	);

	const isEditable = $derived(
		reservation?.status === 'PENDING' || reservation?.status === 'CONFIRMED'
	);

	// Pré-validation conflit côté client lors de la modification des dates
	const editConflict = $derived.by(() => {
		if (!reservation || !editStartStr || !editEndStr) return null;
		const start = new Date(editStartStr).getTime();
		const end = new Date(editEndStr).getTime();
		return (
			reservations.find(
				(r) =>
					r._id !== reservation._id &&
					r.vehicleId === reservation.vehicleId &&
					(r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS') &&
					r.startDate < end &&
					r.endDate > start
			) ?? null
		);
	});

	async function handleUpdate(e: Event) {
		e.preventDefault();
		if (!reservation) return;

		submitting = true;
		error = '';
		const patch = {
			startDate: new Date(editStartStr).getTime(),
			endDate: new Date(editEndStr).getTime(),
			purpose: editPurpose.trim(),
			notes: editNotes.trim() || undefined
		};
		const result = await onUpdate(reservation._id, patch);
		submitting = false;
		if (result === 'SUCCESS') {
			toast.success('Réservation mise à jour');
			onClose();
		} else if (result === 'CONFLICT') {
			error = 'Conflit : ce véhicule est déjà réservé sur cette période.';
		} else {
			error = 'Erreur inattendue lors de la mise à jour.';
		}
	}

	async function handleCancelConfirm() {
		if (!reservation) return;
		cancelling = true;
		await onCancel(reservation);
		cancelling = false;
		confirmingCancel = false;
	}

	function formatDate(ts: number) {
		const d = new Date(ts);
		const h = d.getHours();
		const m = d.getMinutes();
		if ((h === 0 && m === 0) || (h === 23 && m >= 59)) {
			return format(d, 'd MMMM yyyy', { locale: fr });
		}
		return format(d, 'd MMMM yyyy à HH:mm', { locale: fr });
	}

	const lang = $derived(page.params.lang as string | undefined);

	function detailHref(id: string): string {
		const path = `/admin/reservations/${id}`;
		return lang ? `/${lang}${path}` : path;
	}
</script>

<Sheet.Root
	{open}
	onOpenChange={(v) => {
		if (!v) onClose();
	}}
>
	<Sheet.Content side="right" class="w-full sm:max-w-md">
		<Sheet.Header>
			<div class="flex items-center justify-between gap-2">
				<Sheet.Title>Réservation</Sheet.Title>
				{#if reservation}
					<Button
						variant="ghost"
						size="sm"
						class="h-7 gap-1 px-2 text-xs text-muted-foreground"
						onclick={() => {
							const href = detailHref(reservation!._id);
							onClose();
							goto(href);
						}}
					>
						<ExternalLinkIcon class="size-3" />
						Détail complet
					</Button>
				{/if}
			</div>
			{#if reservation}
				<Sheet.Description>
					{reservation.brand}
					{reservation.model} — {reservation.registration}
				</Sheet.Description>
			{/if}
		</Sheet.Header>

		{#if reservation}
			<div class="flex flex-col gap-4 p-4">
				<!-- Status badge -->
				<div class="flex items-center gap-2">
					<span
						class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {STATUS_STYLES[reservation.status] ?? ''}"
					>
						{STATUS_LABELS[reservation.status] ?? reservation.status}
					</span>
					<span class="text-xs text-muted-foreground">
						{formatDate(reservation.startDate)} → {formatDate(reservation.endDate)}
					</span>
				</div>

				{#if isEditable}
					<form onsubmit={handleUpdate} class="flex flex-col gap-3">
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

						{#if editConflict}
							<p
								class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
							>
								⚠ Conflit : ce véhicule est déjà réservé du {formatDate(editConflict.startDate)} au {formatDate(editConflict.endDate)}.
							</p>
						{/if}

						<div class="flex flex-col gap-1.5">
							<Label for="edit-purpose">Motif</Label>
							<Input id="edit-purpose" bind:value={editPurpose} />
						</div>

						<div class="flex flex-col gap-1.5">
							<Label for="edit-notes">Notes</Label>
							<Textarea id="edit-notes" bind:value={editNotes} rows={3} />
						</div>

						{#if error}
							<p class="text-xs text-destructive">{error}</p>
						{/if}

						<Button type="submit" disabled={submitting} class="w-full">
							{submitting ? 'Enregistrement…' : 'Enregistrer'}
						</Button>
					</form>
				{:else}
					<div class="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
						<p><span class="font-medium">Motif :</span> {reservation.purpose}</p>
						{#if reservation.notes}
							<p><span class="font-medium">Notes :</span> {reservation.notes}</p>
						{/if}
						{#if reservation.location}
							<p><span class="font-medium">Site :</span> {reservation.location}</p>
						{/if}
					</div>
				{/if}

				{#if isCancellable}
					<div class="border-t border-border pt-3">
						{#if confirmingCancel}
							<div class="flex items-center gap-2 rounded-xl bg-destructive/6 px-3 py-2">
								<span class="flex-1 text-[13px] font-medium text-destructive">Confirmer l'annulation ?</span>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2.5 text-xs"
									onclick={() => (confirmingCancel = false)}
									disabled={cancelling}
								>
									Garder
								</Button>
								<Button
									size="sm"
									class="h-7 border-0 bg-destructive/12 px-2.5 text-xs text-destructive hover:bg-destructive/20"
									onclick={handleCancelConfirm}
									disabled={cancelling}
								>
									{cancelling ? 'Annulation…' : 'Oui, annuler'}
								</Button>
							</div>
						{:else}
							<Button
								variant="outline"
								class="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
								onclick={() => (confirmingCancel = true)}
							>
								Annuler la réservation
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
