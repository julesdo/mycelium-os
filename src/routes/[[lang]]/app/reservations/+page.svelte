<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n.js';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import ReservationCard from '$lib/components/reservations/ReservationCard.svelte';
	import type { ReservationWithDetails } from '$lib/components/reservations/ReservationCard.svelte';
	import ReservationDetailSheet from '$lib/components/reservations/ReservationDetailSheet.svelte';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CarIcon from '@lucide/svelte/icons/car';
	import HistoryIcon from '@lucide/svelte/icons/history';

	let selectedReservation: ReservationWithDetails | null = $state(null);
	let activeTab = $state<'upcoming' | 'history' | 'cancelled'>('upcoming');

	const client = useConvexClient();

	const upcomingQuery  = useQuery(api.reservations.listMyReservationsWithDetails, { tab: 'upcoming' });
	const historyQuery   = useQuery(api.reservations.listMyReservationsWithDetails, { tab: 'history' });
	const cancelledQuery = useQuery(api.reservations.listMyReservationsWithDetails, { tab: 'cancelled' });

	async function handleCancel(id: string) {
		await client.mutation(api.reservations.cancelReservation, {
			reservationId: id as Id<'reservations'>
		});
		selectedReservation = null;
	}

	const heroReservation = $derived(
		activeTab === 'upcoming' ? (upcomingQuery.data?.[0] ?? null) : null
	);
	const gridReservations = $derived(
		activeTab === 'upcoming'  ? (upcomingQuery.data?.slice(1) ?? []) :
		activeTab === 'history'   ? (historyQuery.data            ?? []) :
		                            (cancelledQuery.data          ?? [])
	);
	const isLoading = $derived(
		activeTab === 'upcoming'  ? upcomingQuery.isLoading  :
		activeTab === 'history'   ? historyQuery.isLoading   :
		                            cancelledQuery.isLoading
	);

	const tabs = [
		{ key: 'upcoming'  as const, label: 'À venir',    icon: CalendarIcon },
		{ key: 'history'   as const, label: 'Historique', icon: HistoryIcon  },
		{ key: 'cancelled' as const, label: 'Annulées',   icon: CarIcon      }
	];
</script>

<div class="flex flex-col gap-5 px-4 pb-24 pt-3 lg:pb-8 lg:px-6 xl:px-8 2xl:px-16">

	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<div class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-black tracking-tight">Mes trajets</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">Réservations passées et à venir</p>
		</div>
		<Button href={resolve(localizedHref('/app/reservations/new'))} class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 shadow-glass-brand">
			<PlusIcon class="size-3.5" />
			<span class="hidden sm:inline">Réserver</span>
			<span class="sm:hidden">+</span>
		</Button>
	</div>

	<!-- ── Tabs ──────────────────────────────────────────────────────────── -->
	<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v as typeof activeTab)}>
		<Tabs.List class="self-start">
			{#each tabs as tab}
				{@const count =
					tab.key === 'upcoming'  ? (upcomingQuery.data?.length  ?? 0) :
					tab.key === 'history'   ? (historyQuery.data?.length   ?? 0) :
					                          (cancelledQuery.data?.length ?? 0)}
				<Tabs.Trigger value={tab.key} class="gap-1.5">
					<tab.icon class="size-3.5 shrink-0" />
					{tab.label}
					{#if count > 0}
						<Badge variant="ghost" class="px-1.5 py-0">{count}</Badge>
					{/if}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</Tabs.Root>

	<!-- ── Content ────────────────────────────────────────────────────────── -->

	{#if isLoading}
		<div class="flex flex-col gap-5">
			{#if activeTab === 'upcoming'}
				<div class="animate-pulse overflow-hidden bg-muted" style="border-radius:28px; height: clamp(200px, 40vw, 320px)"></div>
			{/if}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each [1, 2, 3, 4] as i (i)}
					<div class="animate-pulse overflow-hidden rounded-2xl border border-border">
						<div class="aspect-video bg-muted"></div>
						<div class="flex flex-col gap-2 p-3.5">
							<div class="h-3.5 w-36 rounded-lg bg-muted"></div>
							<div class="h-3 w-24 rounded bg-muted"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

	{:else if !heroReservation && gridReservations.length === 0}
		<!-- Empty states -->
		<div class="flex flex-col items-center justify-center gap-6 border border-dashed border-border bg-muted/15 py-20 text-center" style="border-radius: 28px;">
			{#if activeTab === 'upcoming'}
				<div class="flex size-16 items-center justify-center rounded-2xl bg-muted shadow-glass-card">
					<CalendarIcon class="size-7 text-muted-foreground/40" />
				</div>
				<div>
					<p class="text-base font-bold">Aucune réservation à venir</p>
					<p class="mt-1 text-sm text-muted-foreground">Réservez un véhicule pour votre prochain déplacement.</p>
				</div>
				<Button href={resolve(localizedHref('/app/reservations/new'))} size="lg" class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 shadow-glass-brand">
					<PlusIcon class="size-4" />Réserver un véhicule
				</Button>
			{:else if activeTab === 'history'}
				<div class="flex size-16 items-center justify-center rounded-2xl bg-muted shadow-glass-card">
					<HistoryIcon class="size-7 text-muted-foreground/40" />
				</div>
				<div>
					<p class="text-base font-bold">Aucun historique</p>
					<p class="mt-1 text-sm text-muted-foreground">Vos réservations passées apparaîtront ici.</p>
				</div>
			{:else}
				<div class="flex size-16 items-center justify-center rounded-2xl bg-muted shadow-glass-card">
					<CarIcon class="size-7 text-muted-foreground/40" />
				</div>
				<div>
					<p class="text-base font-bold">Aucune réservation annulée</p>
					<p class="mt-1 text-sm text-muted-foreground">Les annulations apparaîtront ici.</p>
				</div>
			{/if}
		</div>

	{:else}
		<div class="flex flex-col gap-6">

			<!-- Hero card -->
			{#if heroReservation}
				<ReservationCard
					reservation={heroReservation}
					hero
					onDetails={() => (selectedReservation = heroReservation)}
					onCancel={handleCancel}
				/>
			{/if}

			<!-- Section separator -->
			{#if heroReservation && gridReservations.length > 0}
				<div class="flex items-center gap-3">
					<p class="shrink-0 text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
						Suivantes
					</p>
					<div class="h-px flex-1 bg-border/50"></div>
				</div>
			{/if}

			<!-- Grid -->
			{#if gridReservations.length > 0}
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each gridReservations as reservation (reservation._id)}
						<ReservationCard
							{reservation}
							onDetails={() => (selectedReservation = reservation)}
							onCancel={handleCancel}
						/>
					{/each}
				</div>
			{/if}

		</div>
	{/if}

</div>

<ReservationDetailSheet
	reservation={selectedReservation}
	onClose={() => (selectedReservation = null)}
	onCancel={handleCancel}
/>
