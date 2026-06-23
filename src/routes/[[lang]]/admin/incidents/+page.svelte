<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { cn } from '$lib/utils.js';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import DotsHorizontalIcon from '@lucide/svelte/icons/ellipsis';
	import SendIcon from '@lucide/svelte/icons/send';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import type { Id } from '$lib/convex/_generated/dataModel.js';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyApi = api as any;
	const client = useConvexClient();

	const incidentsQuery = useQuery(anyApi.incidents.listIncidents, { limit: 100 });
	const statsQuery = useQuery(anyApi.incidents.getIncidentStats, {});

	const allIncidents = $derived(incidentsQuery.data ?? []);
	const isLoading = $derived(incidentsQuery.isLoading);
	const stats = $derived(statsQuery.data ?? { total: 0, open: 0, sentToInsurer: 0, closed: 0, totalFranchise: 0 });

	type IncidentStatus = 'DECLARED' | 'SENT_TO_INSURER' | 'EXPERTISE' | 'REPAIR' | 'CLOSED' | 'CONTESTED';
	let activeTab = $state<IncidentStatus | 'all'>('all');

	const STATUS_CONFIG: Record<IncidentStatus, { label: string; class: string }> = {
		DECLARED:        { label: 'Déclaré',          class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
		SENT_TO_INSURER: { label: 'Envoyé assureur',  class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
		EXPERTISE:       { label: 'Expertise',         class: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
		REPAIR:          { label: 'Réparation',        class: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
		CLOSED:          { label: 'Clôturé',           class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
		CONTESTED:       { label: 'Contesté',          class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' }
	};

	interface IncidentItem { status: string; [k: string]: unknown }

	const filtered = $derived(
		activeTab === 'all' ? allIncidents : allIncidents.filter((i: IncidentItem) => i.status === activeTab)
	);

	const statusTabs = $derived([
		{ value: 'all' as const, label: 'Tous', count: stats.total },
		{ value: 'DECLARED' as const, label: 'Déclaré', count: allIncidents.filter((i: IncidentItem) => i.status === 'DECLARED').length },
		{ value: 'SENT_TO_INSURER' as const, label: 'Assureur', count: allIncidents.filter((i: IncidentItem) => i.status === 'SENT_TO_INSURER').length },
		{ value: 'EXPERTISE' as const, label: 'Expertise', count: allIncidents.filter((i: IncidentItem) => i.status === 'EXPERTISE').length },
		{ value: 'REPAIR' as const, label: 'Réparation', count: allIncidents.filter((i: IncidentItem) => i.status === 'REPAIR').length },
		{ value: 'CLOSED' as const, label: 'Clôturé', count: allIncidents.filter((i: IncidentItem) => i.status === 'CLOSED' || i.status === 'CONTESTED').length }
	]);

	// ── Send to insurer dialog ────────────────────────────────────────────────────
	interface IncidentRow { _id: Id<'incidents'>; insurerEmail?: string; [k: string]: unknown }
	let sendingIncident = $state<IncidentRow | null>(null);
	let insurerEmailInput = $state('');
	let sendingEmail = $state(false);

	async function handleSendToInsurer() {
		if (!sendingIncident || !insurerEmailInput.trim()) return;
		sendingEmail = true;
		try {
			await client.mutation(anyApi.incidents.triggerSendToInsurer, {
				incidentId: sendingIncident._id,
				insurerEmail: insurerEmailInput.trim()
			});
			toast.success('Dossier envoyé à l\'assureur');
			sendingIncident = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Erreur');
		} finally {
			sendingEmail = false;
		}
	}

	const isEmpty = $derived(!isLoading && allIncidents.length === 0);
</script>

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div class="flex items-center justify-between gap-4">
		<div class="flex items-center gap-2">
			<h1 class="text-base font-semibold">Sinistres</h1>
			{#if !isLoading && allIncidents.length > 0}
				<span class="tabular-nums rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
					{stats.total}
				</span>
			{/if}
		</div>
	</div>

	{#if isLoading}
		<div class="flex flex-col gap-6">
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{#each Array(4) as _, i (i)}
					<Skeleton class="h-[88px] w-full rounded-3xl" />
				{/each}
			</div>
			<div class="overflow-hidden rounded-2xl border border-border">
				<div class="divide-y divide-border">
					{#each Array(5) as _, i (i)}
						<div class="flex h-12 items-center gap-4 px-4">
							<Skeleton class="h-3.5 w-28" />
							<Skeleton class="h-3.5 w-32" />
							<Skeleton class="h-3.5 w-20" />
							<Skeleton class="ml-auto h-5 w-20 rounded-full" />
							<Skeleton class="size-7 rounded-md" />
						</div>
					{/each}
				</div>
			</div>
		</div>

	{:else if isEmpty}
		<div class="flex flex-1 items-center justify-center py-16">
			<EmptyState
				title="Aucun sinistre déclaré"
				description="Les sinistres déclarés par vos salariés apparaîtront ici pour suivi et gestion."
			>
				{#snippet icon()}<ShieldAlertIcon class="size-12" />{/snippet}
			</EmptyState>
		</div>

	{:else}
		<!-- KPI Cards -->
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<MetricCard label="Dossiers ouverts" value={stats.open} variant="accent" />
			<MetricCard
				label="Total sinistres"
				value={stats.total}
				description="Depuis l'ouverture"
			/>
			<MetricCard
				label="Chez assureur"
				value={stats.sentToInsurer}
				description={stats.sentToInsurer > 0 ? 'En attente de retour' : 'Aucun en cours'}
			/>
			<MetricCard
				label="Franchise totale"
				value="{stats.totalFranchise.toLocaleString('fr-FR')} €"
				description="Coûts imputés"
			/>
		</div>

		<!-- Tabs -->
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List variant="line">
				{#each statusTabs as tab (tab.value)}
					<Tabs.Trigger value={tab.value}>
						{tab.label}
						{#if tab.count > 0}
							<span class={cn(
								'ml-1.5 tabular-nums rounded-full px-1.5 text-[11px] font-semibold',
								activeTab === tab.value ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground/60'
							)}>{tab.count}</span>
						{/if}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>

		<!-- Table or empty state -->
		{#if filtered.length === 0}
			<div class="flex items-center justify-center py-16">
				<EmptyState title="Aucun sinistre dans ce statut">
					{#snippet action()}
						<Button variant="ghost" size="sm" onclick={() => (activeTab = 'all')}>Voir tous</Button>
					{/snippet}
				</EmptyState>
			</div>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-muted/40">
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Véhicule</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Lieu</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Franchise</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Statut</th>
							<th class="w-10 px-3 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each filtered as incident (incident._id)}
							{@const cfg = STATUS_CONFIG[incident.status as IncidentStatus]}
							<tr
								class="cursor-pointer transition-colors hover:bg-muted/40"
								onclick={() => goto(`/admin/incidents/${incident._id}`)}
							>
								<td class="px-4 py-3">
									{#if incident.vehicle}
										<p class="font-medium">{incident.vehicle.brand} {incident.vehicle.model}</p>
										<p class="font-mono text-xs text-muted-foreground">{incident.vehicle.registration}</p>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</td>
								<td class="max-w-[160px] px-4 py-3 text-muted-foreground truncate hidden sm:table-cell">
									{incident.location}
								</td>
								<td class="px-4 py-3 text-muted-foreground whitespace-nowrap">
									{format(new Date(incident.incidentDate), 'd MMM yyyy', { locale: fr })}
								</td>
								<td class="px-4 py-3 text-muted-foreground hidden md:table-cell">
									{incident.franchiseAmount != null ? `${incident.franchiseAmount.toLocaleString('fr-FR')} €` : '—'}
								</td>
								<td class="px-4 py-3">
									<span class={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', cfg?.class)}>
										{cfg?.label ?? incident.status}
									</span>
								</td>
								<td class="px-3 py-3" onclick={(e) => e.stopPropagation()}>
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button variant="ghost" size="icon-sm" class="size-7" {...props}>
													<DotsHorizontalIcon class="size-4" />
													<span class="sr-only">Actions</span>
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end" class="w-44">
											<DropdownMenu.Item onclick={() => goto(`/admin/incidents/${incident._id}`)}>
												Voir le dossier
											</DropdownMenu.Item>
											{#if incident.status === 'DECLARED'}
												<DropdownMenu.Separator />
												<DropdownMenu.Item onclick={() => {
													sendingIncident = incident as IncidentRow;
													insurerEmailInput = (incident as IncidentRow).insurerEmail ?? '';
												}}>
													<SendIcon class="size-3.5" />
													Envoyer à l'assureur
												</DropdownMenu.Item>
											{/if}
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<!-- Dialog envoi assureur -->
<Dialog.Root
	open={!!sendingIncident}
	onOpenChange={(o) => { if (!o) sendingIncident = null; }}
>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-sm">
			<Dialog.Header>
				<Dialog.Title>Envoyer à l'assureur</Dialog.Title>
				<Dialog.Description>
					Le dossier complet sera envoyé par email à l'assureur.
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex flex-col gap-1.5 py-2">
				<Label for="insurer-email-dlg">Email de l'assureur</Label>
				<Input
					id="insurer-email-dlg"
					type="email"
					placeholder="sinistres@assureur.fr"
					bind:value={insurerEmailInput}
				/>
			</div>
			<div class="mt-4 flex items-center justify-between">
				<Button variant="ghost" onclick={() => (sendingIncident = null)} disabled={sendingEmail}>Annuler</Button>
				<Button onclick={handleSendToInsurer} disabled={sendingEmail || !insurerEmailInput.trim()}>
					{#if sendingEmail}<LoaderCircleIcon class="size-3.5 animate-spin" />{/if}
					Envoyer
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
