<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import { cn } from '$lib/utils.js';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const myIncidentsQuery = useQuery((api as any).incidents.listMyIncidents, {});
	const isLoading = $derived(myIncidentsQuery.isLoading);
	const incidents = $derived(myIncidentsQuery.data ?? []);

	type IncidentStatus = 'DECLARED' | 'SENT_TO_INSURER' | 'EXPERTISE' | 'REPAIR' | 'CLOSED' | 'CONTESTED';

	const STATUS_CONFIG: Record<IncidentStatus, { label: string; class: string }> = {
		DECLARED:        { label: 'Déclaré',          class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
		SENT_TO_INSURER: { label: 'Envoyé assureur',  class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
		EXPERTISE:       { label: 'Expertise',         class: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
		REPAIR:          { label: 'Réparation',        class: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
		CLOSED:          { label: 'Clôturé',           class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
		CONTESTED:       { label: 'Contesté',          class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' }
	};
</script>

<div class="flex flex-col gap-5 px-4 pb-24 pt-3 lg:pb-8 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div class="flex items-center justify-between gap-4">
		<div>
			<h1 class="text-xl font-black tracking-tight">Mes sinistres</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">Historique de vos déclarations</p>
		</div>
		<Button
			href={resolve(localizedHref('/app/incidents/new'))}
			class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 shadow-glass-brand"
		>
			<PlusIcon class="size-3.5" />
			<span class="hidden sm:inline">Déclarer</span>
			<span class="sm:hidden">+</span>
		</Button>
	</div>

	{#if isLoading}
		<div class="flex flex-col gap-3">
			{#each Array(3) as _, i (i)}
				<Skeleton class="h-[72px] w-full rounded-2xl" />
			{/each}
		</div>

	{:else if incidents.length === 0}
		<EmptyState
			title="Aucun sinistre déclaré"
			description="En cas d'accident, déclarez votre sinistre ici. L'équipe de gestion sera immédiatement notifiée."
		>
			{#snippet icon()}<ShieldAlertIcon class="size-12" />{/snippet}
			{#snippet action()}
				<Button
					href={resolve(localizedHref('/app/incidents/new'))}
					class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 shadow-glass-brand"
				>
					Déclarer un sinistre
				</Button>
			{/snippet}
		</EmptyState>

	{:else}
		<div class="overflow-hidden rounded-2xl border border-border">
			{#each incidents as incident, i (incident._id)}
				{@const cfg = STATUS_CONFIG[incident.status as IncidentStatus]}
				<button
					type="button"
					onclick={() => goto(`/app/incidents/${incident._id}`)}
					class={cn(
						'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40',
						i > 0 && 'border-t border-border'
					)}
				>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<p class="font-medium text-sm truncate">
								{incident.vehicle?.brand ?? ''} {incident.vehicle?.model ?? ''} — {incident.vehicle?.registration ?? ''}
							</p>
							<span class={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', cfg?.class)}>
								{cfg?.label ?? incident.status}
							</span>
						</div>
						<p class="mt-0.5 text-xs text-muted-foreground truncate">
							{incident.location} · {format(new Date(incident.incidentDate), 'd MMM yyyy', { locale: fr })}
						</p>
					</div>
					<ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
				</button>
			{/each}
		</div>
	{/if}
</div>
