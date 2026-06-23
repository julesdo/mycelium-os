<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { cn } from '$lib/utils.js';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import SendIcon from '@lucide/svelte/icons/send';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import type { Id } from '$lib/convex/_generated/dataModel.js';

	const lang = $derived(page.params.lang as string | undefined);
	function localHref(path: string) { return lang ? `/${lang}${path}` : path; }

	const client = useConvexClient();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyApi = api as any;
	const incidentId = page.params.id as Id<'incidents'>;
	const incidentQuery = useQuery(anyApi.incidents.getIncident, { incidentId });

	const incident = $derived(incidentQuery.data);
	const isLoading = $derived(incidentQuery.isLoading);

	type IncidentStatus = 'DECLARED' | 'SENT_TO_INSURER' | 'EXPERTISE' | 'REPAIR' | 'CLOSED' | 'CONTESTED';

	const STATUS_CONFIG: Record<IncidentStatus, { label: string; class: string }> = {
		DECLARED:        { label: 'Déclaré',          class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
		SENT_TO_INSURER: { label: 'Envoyé assureur',  class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
		EXPERTISE:       { label: 'Expertise',         class: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
		REPAIR:          { label: 'Réparation',        class: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
		CLOSED:          { label: 'Clôturé',           class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
		CONTESTED:       { label: 'Contesté',          class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' }
	};

	const STATUS_STEPS: { key: IncidentStatus; label: string }[] = [
		{ key: 'DECLARED',        label: 'Déclaré' },
		{ key: 'SENT_TO_INSURER', label: 'Envoyé assureur' },
		{ key: 'EXPERTISE',       label: 'Expertise' },
		{ key: 'REPAIR',          label: 'Réparation' },
		{ key: 'CLOSED',          label: 'Clôturé' }
	];

	const currentStepIndex = $derived(
		STATUS_STEPS.findIndex(s => s.key === incident?.status)
	);

	// ── Pré-remplissage ──────────────────────────────────────────────────────────
	let insurerEmail = $state('');
	let insurerReference = $state('');
	let franchiseAmount = $state('');
	let estimatedRepairCost = $state('');
	let closingNotes = $state('');

	$effect(() => {
		if (incident) {
			insurerEmail = incident.insurerEmail ?? '';
			insurerReference = incident.insurerReference ?? '';
			franchiseAmount = incident.franchiseAmount != null ? String(incident.franchiseAmount) : '';
			estimatedRepairCost = incident.estimatedRepairCost != null ? String(incident.estimatedRepairCost) : '';
			closingNotes = incident.closingNotes ?? '';
		}
	});

	// ── Dialog send to insurer ────────────────────────────────────────────────────
	let showSendDialog = $state(false);
	let sendingEmail = $state(false);

	async function handleSendToInsurer() {
		if (!insurerEmail.trim()) return;
		sendingEmail = true;
		try {
			await client.mutation(anyApi.incidents.triggerSendToInsurer, {
				incidentId,
				insurerEmail: insurerEmail.trim()
			});
			toast.success('Dossier envoyé à l\'assureur');
			showSendDialog = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Erreur');
		} finally {
			sendingEmail = false;
		}
	}

	// ── Dialog update status ──────────────────────────────────────────────────────
	let showUpdateDialog = $state(false);
	let newStatus = $state<string>('');
	let updatingStatus = $state(false);

	async function handleUpdateStatus() {
		if (!newStatus) return;
		updatingStatus = true;
		try {
			await client.mutation(anyApi.incidents.updateIncidentStatus, {
				incidentId,
				status: newStatus,
				insurerEmail: insurerEmail || undefined,
				insurerReference: insurerReference || undefined,
				franchiseAmount: franchiseAmount ? parseFloat(franchiseAmount) : undefined,
				estimatedRepairCost: estimatedRepairCost ? parseFloat(estimatedRepairCost) : undefined,
				closingNotes: closingNotes || undefined
			});
			toast.success('Statut mis à jour');
			showUpdateDialog = false;
			newStatus = '';
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Erreur');
		} finally {
			updatingStatus = false;
		}
	}
</script>

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8 2xl:px-16">

	{#if isLoading}
		<div class="flex flex-col gap-6">
			<div class="flex items-center gap-3">
				<Skeleton class="size-8 rounded-lg" />
				<Skeleton class="h-6 w-48" />
				<Skeleton class="h-5 w-20 rounded-full" />
			</div>
			<div class="grid gap-4 lg:grid-cols-3">
				<div class="space-y-4 lg:col-span-2">
					<Skeleton class="h-36 w-full rounded-2xl" />
					<Skeleton class="h-28 w-full rounded-2xl" />
					<Skeleton class="h-48 w-full rounded-2xl" />
				</div>
				<div class="space-y-4">
					<Skeleton class="h-32 w-full rounded-2xl" />
					<Skeleton class="h-48 w-full rounded-2xl" />
				</div>
			</div>
		</div>

	{:else if !incident}
		<EmptyState
			title="Sinistre introuvable"
			description="Ce sinistre n'existe pas ou vous n'y avez pas accès."
		>
			{#snippet icon()}<ShieldAlertIcon class="size-12" />{/snippet}
			{#snippet action()}
				<Button onclick={() => goto(resolve(localHref('/admin/incidents')))}>
					Retour aux sinistres
				</Button>
			{/snippet}
		</EmptyState>

	{:else}
		{@const statusCfg = STATUS_CONFIG[incident.status as IncidentStatus]}

		<!-- Header -->
		<div class="flex items-center justify-between gap-4 flex-wrap">
			<div class="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => goto(resolve(localHref('/admin/incidents')))}
					aria-label="Retour"
				>
					<ArrowLeftIcon class="size-4" />
				</Button>
				<div class="flex flex-col gap-0.5">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-xl font-bold">
							{incident.vehicle?.brand ?? ''} {incident.vehicle?.model ?? ''}
						</h1>
						{#if statusCfg}
							<span class={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.class)}>
								{statusCfg.label}
							</span>
						{/if}
					</div>
					<p class="text-sm text-muted-foreground">
						{incident.vehicle?.registration ?? '—'} · Déclaré le {format(new Date(incident.createdAt), 'd MMMM yyyy', { locale: fr })}
					</p>
				</div>
			</div>

			{#if incident.status !== 'CLOSED' && incident.status !== 'CONTESTED'}
				<div class="flex items-center gap-2">
					{#if incident.status === 'DECLARED'}
						<Button
							variant="outline"
							size="sm"
							onclick={() => { showSendDialog = true; }}
						>
							<SendIcon class="size-3.5" />
							Envoyer à l'assureur
						</Button>
					{/if}
					<Button
						size="sm"
						onclick={() => { newStatus = ''; showUpdateDialog = true; }}
					>
						<CheckIcon class="size-3.5" />
						Mettre à jour
					</Button>
				</div>
			{/if}
		</div>

		<!-- Body -->
		<div class="grid gap-4 lg:grid-cols-3">

			<!-- Main column -->
			<div class="flex flex-col gap-4 lg:col-span-2">

				<!-- Timeline -->
				<div class="overflow-hidden rounded-2xl border border-border bg-card">
					<div class="border-b border-border px-4 py-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progression du dossier</p>
					</div>
					<div class="px-4 py-4">
						<div class="relative">
							<div class="absolute left-3 top-3.5 bottom-3.5 w-0.5 bg-border"></div>
							{#each STATUS_STEPS as step, i (step.key)}
								{@const done = i <= currentStepIndex}
								<div class="relative flex items-center gap-3 pb-4 last:pb-0">
									<div class={cn(
										'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
										done
											? 'border-[var(--brand)] bg-[var(--brand)] text-background'
											: 'border-border bg-card text-muted-foreground'
									)}>
										{#if done}
											<CheckIcon class="size-3" />
										{:else}
											{i + 1}
										{/if}
									</div>
									<span class={cn('text-sm', done ? 'font-medium' : 'text-muted-foreground')}>
										{step.label}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<!-- Circonstances -->
				<div class="overflow-hidden rounded-2xl border border-border bg-card">
					<div class="border-b border-border px-4 py-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Circonstances</p>
					</div>
					<div class="divide-y divide-border text-sm">
						<div class="flex items-center gap-3 px-4 py-3">
							<span class="w-32 shrink-0 text-muted-foreground">Date</span>
							<span class="font-medium">{format(new Date(incident.incidentDate), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
						</div>
						<div class="flex items-center gap-3 px-4 py-3">
							<span class="w-32 shrink-0 text-muted-foreground">Lieu</span>
							<span class="font-medium">{incident.location}</span>
						</div>
						<div class="flex items-center gap-3 px-4 py-3">
							<span class="w-32 shrink-0 text-muted-foreground">Tiers impliqué</span>
							<span class="font-medium">{incident.thirdPartyInvolved ? 'Oui' : 'Non'}{incident.thirdPartyInfo ? ` — ${incident.thirdPartyInfo}` : ''}</span>
						</div>
						{#if incident.insurerReference}
							<div class="flex items-center gap-3 px-4 py-3">
								<span class="w-32 shrink-0 text-muted-foreground">Réf. assureur</span>
								<span class="font-medium font-mono">{incident.insurerReference}</span>
							</div>
						{/if}
						{#if incident.franchiseAmount != null}
							<div class="flex items-center gap-3 px-4 py-3">
								<span class="w-32 shrink-0 text-muted-foreground">Franchise</span>
								<span class="font-medium">{incident.franchiseAmount.toLocaleString('fr-FR')} €</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Description -->
				<div class="overflow-hidden rounded-2xl border border-border bg-card">
					<div class="border-b border-border px-4 py-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
					</div>
					<p class="px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap">{incident.description}</p>
				</div>

				<!-- Photos -->
				{#if incident.photoUrls?.length}
					<div class="overflow-hidden rounded-2xl border border-border bg-card">
						<div class="border-b border-border px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Photos ({incident.photoUrls.length})
							</p>
						</div>
						<div class="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
							{#each incident.photoUrls as photo, i (i)}
								{#if photo.url}
									<a href={photo.url} target="_blank" rel="noopener" class="group relative block overflow-hidden rounded-xl">
										<img src={photo.url} alt={photo.label} class="h-32 w-full object-cover transition-opacity group-hover:opacity-90" />
										<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
											<p class="truncate text-[10px] text-white">{photo.label}</p>
										</div>
									</a>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Aside (quick info) -->
			<div class="flex flex-col gap-4">
				<div class="overflow-hidden rounded-2xl border border-border bg-card">
					<div class="border-b border-border px-4 py-3">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Véhicule</p>
					</div>
					<div class="px-4 py-4 text-sm space-y-1">
						<p class="font-semibold">{incident.vehicle?.brand} {incident.vehicle?.model}</p>
						<p class="font-mono text-muted-foreground">{incident.vehicle?.registration}</p>
					</div>
				</div>

				{#if incident.insurerEmail}
					<div class="overflow-hidden rounded-2xl border border-border bg-card">
						<div class="border-b border-border px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assureur</p>
						</div>
						<div class="px-4 py-4 text-sm">
							<p class="font-medium break-all">{incident.insurerEmail}</p>
							{#if incident.insurerReference}
								<p class="mt-1 font-mono text-xs text-muted-foreground">Réf. {incident.insurerReference}</p>
							{/if}
						</div>
					</div>
				{/if}

				{#if incident.status === 'CLOSED' && incident.closingNotes}
					<div class="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10">
						<div class="border-b border-emerald-200 dark:border-emerald-900/30 px-4 py-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Clôture</p>
						</div>
						<p class="px-4 py-4 text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">{incident.closingNotes}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Dialog envoi assureur -->
<Dialog.Root bind:open={showSendDialog}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-sm">
			<Dialog.Header>
				<Dialog.Title>Envoyer à l'assureur</Dialog.Title>
				<Dialog.Description>
					Le dossier complet (véhicule, photos, description, tiers) sera envoyé par email.
				</Dialog.Description>
			</Dialog.Header>
			<div class="flex flex-col gap-1.5 py-2">
				<Label for="insurer-email-dlg">Email de l'assureur</Label>
				<Input
					id="insurer-email-dlg"
					type="email"
					placeholder="sinistres@assureur.fr"
					bind:value={insurerEmail}
				/>
			</div>
			<div class="mt-4 flex items-center justify-between">
				<Button variant="ghost" onclick={() => (showSendDialog = false)} disabled={sendingEmail}>Annuler</Button>
				<Button onclick={handleSendToInsurer} disabled={sendingEmail || !insurerEmail.trim()}>
					{#if sendingEmail}<LoaderCircleIcon class="size-3.5 animate-spin" />{/if}
					Envoyer
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Dialog mise à jour statut -->
<Dialog.Root bind:open={showUpdateDialog}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Mettre à jour le dossier</Dialog.Title>
				<Dialog.Description>
					Sélectionnez le nouveau statut et renseignez les informations associées.
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-4 py-2">
				<!-- Statut -->
				<div class="flex flex-col gap-1.5">
					<Label>Nouveau statut</Label>
					<div class="grid grid-cols-2 gap-2">
						{#each [
							{ value: 'SENT_TO_INSURER', label: 'Envoyé assureur', desc: 'Dossier transmis' },
							{ value: 'EXPERTISE',       label: 'Expertise',        desc: 'Expert mandaté' },
							{ value: 'REPAIR',          label: 'Réparation',       desc: 'Garage en cours' },
							{ value: 'CLOSED',          label: 'Clôturer',         desc: 'Dossier terminé' },
							{ value: 'CONTESTED',       label: 'Contester',        desc: 'Recours en cours' }
						] as opt (opt.value)}
							{#if incident && opt.value !== incident.status}
								<button
									type="button"
									onclick={() => (newStatus = opt.value)}
									class={cn(
										'rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all',
										newStatus === opt.value
											? 'border-primary bg-primary/8 text-primary'
											: 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
									)}
								>
									<p>{opt.label}</p>
									<p class="mt-0.5 text-xs font-normal opacity-70">{opt.desc}</p>
								</button>
							{/if}
						{/each}
					</div>
				</div>

				<!-- Champs complémentaires -->
				<div class="grid grid-cols-2 gap-3">
					<div class="flex flex-col gap-1.5">
						<Label for="upd-ref">Réf. assureur</Label>
						<Input id="upd-ref" placeholder="SIN-2026-XXXXX" bind:value={insurerReference} />
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="upd-franchise">Franchise (€)</Label>
						<Input id="upd-franchise" type="number" min="0" bind:value={franchiseAmount} />
					</div>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="upd-repair">Coût réparation estimé (€)</Label>
					<Input id="upd-repair" type="number" min="0" bind:value={estimatedRepairCost} />
				</div>
				{#if newStatus === 'CLOSED' || newStatus === 'CONTESTED'}
					<div class="flex flex-col gap-1.5">
						<Label for="upd-notes">Notes de clôture</Label>
						<Textarea id="upd-notes" bind:value={closingNotes} rows={2} placeholder="Résumé du règlement…" />
					</div>
				{/if}

				{#if newStatus === 'CLOSED' && franchiseAmount}
					<p class="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
						Un coût <span class="font-semibold text-foreground">SINISTRE de {franchiseAmount} €</span> sera imputé au véhicule et le statut passera à DISPONIBLE.
					</p>
				{/if}
			</div>

			<div class="mt-4 flex items-center justify-between">
				<Button variant="ghost" onclick={() => (showUpdateDialog = false)} disabled={updatingStatus}>Annuler</Button>
				<Button onclick={handleUpdateStatus} disabled={updatingStatus || !newStatus}>
					{#if updatingStatus}<LoaderCircleIcon class="size-3.5 animate-spin" />{/if}
					Confirmer
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
