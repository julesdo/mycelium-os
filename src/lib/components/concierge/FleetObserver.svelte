<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import CarIcon from '@lucide/svelte/icons/car';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import EyeIcon from '@lucide/svelte/icons/eye';

	let { organizationId }: { organizationId: Id<'organizations'> } = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehicles = useQuery((api as any)['concierge/fleetObserver'].getOrgVehicles, { organizationId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const reservations = useQuery((api as any)['concierge/fleetObserver'].getOrgReservations, { organizationId, limit: 25 });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const stats = useQuery((api as any)['concierge/fleetObserver'].getOrgFleetStats, { organizationId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const maintenance = useQuery((api as any)['concierge/fleetObserver'].getOrgMaintenance, { organizationId });

	let subTab = $state('vehicles');

	const STATUS_LABEL: Record<string, string> = {
		AVAILABLE: 'Disponible',
		IN_USE: 'En utilisation',
		MAINTENANCE: 'Maintenance',
		RETIRED: 'Retiré'
	};

	const STATUS_CLASS: Record<string, string> = {
		AVAILABLE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
		IN_USE: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
		MAINTENANCE: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
		RETIRED: 'bg-muted text-muted-foreground border-border/40'
	};

	const RESERVATION_STATUS_CLASS: Record<string, string> = {
		CONFIRMED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
		IN_PROGRESS: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
		PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
		COMPLETED: 'bg-muted text-muted-foreground border-border/40',
		CANCELLED: 'bg-muted text-muted-foreground/60 border-border/30'
	};

	function fmtDate(ts: number) {
		return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(ts));
	}
</script>

<div class="p-5 space-y-4">
	<!-- Bandeau read-only -->
	<div class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
		<EyeIcon class="size-3.5 shrink-0" />
		Vue lecture seule — données en temps réel du compte client
	</div>

	<!-- Stats rapides -->
	{#if stats.data}
		<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
			{#each [
				{ label: 'Véhicules', value: stats.data.total },
				{ label: 'Disponibles', value: stats.data.available, accent: 'text-emerald-500' },
				{ label: 'En utilisation', value: stats.data.inUse, accent: 'text-amber-500' },
				{ label: 'Taux utilisation', value: `${stats.data.utilizationRate}%` }
			] as stat (stat.label)}
				<div class="relative overflow-hidden rounded-xl border border-border bg-card p-3"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.06)">
					<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
					<p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
					<p class="text-2xl font-bold tabular-nums {stat.accent ?? ''}">{stat.value}</p>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
			{#each { length: 4 } as _, i (i)}
				<div class="h-16 animate-pulse rounded-xl bg-muted"></div>
			{/each}
		</div>
	{/if}

	<!-- Sous-tabs -->
	<Tabs.Root bind:value={subTab}>
		<Tabs.List class="h-8 w-fit">
			<Tabs.Trigger value="vehicles" class="gap-1 text-xs">
				<CarIcon class="size-3" />
				Véhicules {#if vehicles.data}({vehicles.data.length}){/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="reservations" class="gap-1 text-xs">
				<CalendarIcon class="size-3" />
				Réservations
			</Tabs.Trigger>
			<Tabs.Trigger value="maintenance" class="gap-1 text-xs">
				<WrenchIcon class="size-3" />
				Maintenance planifiée
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="vehicles" class="mt-3">
			{#if vehicles.isLoading}
				<div class="space-y-1">
					{#each { length: 5 } as _, i (i)}
						<div class="h-10 animate-pulse rounded-lg bg-muted"></div>
					{/each}
				</div>
			{:else if (vehicles.data ?? []).length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">Aucun véhicule dans cette flotte</p>
			{:else}
				<div class="overflow-hidden rounded-xl border border-border divide-y divide-border/60">
					{#each vehicles.data ?? [] as v (v._id)}
						<div class="flex items-center gap-3 px-3 py-2.5">
							<CarIcon class="size-4 shrink-0 text-muted-foreground/60" />
							<div class="min-w-0 flex-1">
								<span class="text-sm font-medium">{v.brand} {v.model}</span>
								<span class="ml-2 text-xs text-muted-foreground">{v.registration}</span>
							</div>
							<span class="text-xs text-muted-foreground">{v.year}</span>
							<span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium {STATUS_CLASS[v.status] ?? STATUS_CLASS.RETIRED}">
								{STATUS_LABEL[v.status] ?? v.status}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="reservations" class="mt-3">
			{#if reservations.isLoading}
				<div class="space-y-1">
					{#each { length: 4 } as _, i (i)}
						<div class="h-10 animate-pulse rounded-lg bg-muted"></div>
					{/each}
				</div>
			{:else if (reservations.data ?? []).length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">Aucune réservation récente</p>
			{:else}
				<div class="overflow-hidden rounded-xl border border-border divide-y divide-border/60">
					{#each reservations.data ?? [] as r (r._id)}
						<div class="flex items-center gap-3 px-3 py-2.5">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm">{r.purpose ?? 'Réservation'}</p>
							</div>
							<span class="text-xs text-muted-foreground tabular-nums">{fmtDate(r.startDate)}</span>
							<span class="rounded-md border px-1.5 py-0.5 text-[10px] font-medium {RESERVATION_STATUS_CLASS[r.status] ?? RESERVATION_STATUS_CLASS.COMPLETED}">
								{r.status}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="maintenance" class="mt-3">
			{#if maintenance.isLoading}
				<div class="h-20 animate-pulse rounded-xl bg-muted"></div>
			{:else if (maintenance.data ?? []).length === 0}
				<p class="py-8 text-center text-sm text-muted-foreground">Aucune maintenance planifiée</p>
			{:else}
				<div class="overflow-hidden rounded-xl border border-border divide-y divide-border/60">
					{#each maintenance.data ?? [] as m (m._id)}
						<div class="flex items-center gap-3 px-3 py-2.5">
							<WrenchIcon class="size-4 shrink-0 text-muted-foreground/60" />
							<span class="flex-1 text-sm">{m.maintenanceType}</span>
							<span class="text-xs text-muted-foreground">{fmtDate(m.scheduledDate)}</span>
							{#if m.costEstimate}
								<span class="text-xs font-medium">{m.costEstimate.toLocaleString('fr-FR')} €</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
