<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import { cn } from '$lib/utils.js';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import type { Id } from '$lib/convex/_generated/dataModel.js';

	const lang = $derived(page.params.lang as string | undefined);
	function localHref(path: string) { return lang ? `/${lang}${path}` : path; }

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

	const STATUS_STEPS: { key: IncidentStatus; label: string; desc: string }[] = [
		{ key: 'DECLARED',        label: 'Déclaré',         desc: 'Votre sinistre a bien été enregistré.' },
		{ key: 'SENT_TO_INSURER', label: 'Envoyé assureur',  desc: 'Le dossier a été transmis à votre assureur.' },
		{ key: 'EXPERTISE',       label: 'Expertise',         desc: 'Un expert est mandaté pour évaluer les dommages.' },
		{ key: 'REPAIR',          label: 'Réparation',        desc: 'Le véhicule est en cours de réparation.' },
		{ key: 'CLOSED',          label: 'Clôturé',           desc: 'Le dossier est terminé.' }
	];

	const currentStepIndex = $derived(
		STATUS_STEPS.findIndex(s => s.key === incident?.status)
	);
</script>

<div class="flex flex-col gap-5 px-4 pb-24 pt-3 lg:pb-8 lg:px-6 xl:px-8 2xl:px-16">

	{#if isLoading}
		<div class="flex flex-col gap-5">
			<div class="flex items-center gap-3">
				<Skeleton class="size-8 rounded-lg" />
				<div class="flex flex-col gap-1.5">
					<Skeleton class="h-5 w-44" />
					<Skeleton class="h-3.5 w-28" />
				</div>
			</div>
			<Skeleton class="h-48 w-full rounded-2xl" />
			<Skeleton class="h-28 w-full rounded-2xl" />
			<Skeleton class="h-20 w-full rounded-2xl" />
		</div>

	{:else if !incident}
		<EmptyState
			title="Sinistre introuvable"
			description="Ce sinistre n'existe pas ou vous n'y avez pas accès."
		>
			{#snippet icon()}<ShieldAlertIcon class="size-12" />{/snippet}
			{#snippet action()}
				<Button onclick={() => goto(resolve(localHref('/app/incidents')))}>
					Mes sinistres
				</Button>
			{/snippet}
		</EmptyState>

	{:else}
		{@const statusCfg = STATUS_CONFIG[incident.status as IncidentStatus]}

		<!-- Header -->
		<div class="flex items-center gap-3">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={() => goto(resolve(localHref('/app/incidents')))}
				aria-label="Retour"
			>
				<ArrowLeftIcon class="size-4" />
			</Button>
			<div class="flex flex-col gap-0.5">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-lg font-bold">
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

		<!-- Timeline progression -->
		{#if incident.status !== 'CONTESTED'}
			<div class="overflow-hidden rounded-2xl border border-border bg-card">
				<div class="border-b border-border px-4 py-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suivi de votre dossier</p>
				</div>
				<div class="px-4 py-4">
					<div class="relative">
						<div class="absolute left-3 top-3.5 bottom-3.5 w-0.5 bg-border"></div>
						{#each STATUS_STEPS as step, i (step.key)}
							{@const done = i <= currentStepIndex}
							{@const current = i === currentStepIndex}
							<div class="relative flex items-start gap-3 pb-4 last:pb-0">
								<div class={cn(
									'relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
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
								<div>
									<p class={cn('text-sm', current ? 'font-semibold' : done ? 'font-medium' : 'text-muted-foreground')}>
										{step.label}
									</p>
									{#if current}
										<p class="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10">
				<div class="border-b border-red-200 dark:border-red-900/30 px-4 py-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">Dossier contesté</p>
				</div>
				<p class="px-4 py-4 text-sm text-red-800 dark:text-red-300">
					{incident.closingNotes ?? 'Votre dossier est en cours de contestation. L\'équipe de gestion vous contactera.'}
				</p>
			</div>
		{/if}

		<!-- Circonstances -->
		<div class="overflow-hidden rounded-2xl border border-border bg-card">
			<div class="border-b border-border px-4 py-3">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Circonstances</p>
			</div>
			<div class="divide-y divide-border text-sm">
				<div class="flex items-start gap-3 px-4 py-3">
					<span class="w-28 shrink-0 text-muted-foreground">Date</span>
					<span class="font-medium">{format(new Date(incident.incidentDate), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
				</div>
				<div class="flex items-start gap-3 px-4 py-3">
					<span class="w-28 shrink-0 text-muted-foreground">Lieu</span>
					<span class="font-medium">{incident.location}</span>
				</div>
				<div class="flex items-start gap-3 px-4 py-3">
					<span class="w-28 shrink-0 text-muted-foreground">Tiers</span>
					<span class="font-medium">{incident.thirdPartyInvolved ? 'Oui' : 'Non'}{incident.thirdPartyInfo ? ` — ${incident.thirdPartyInfo}` : ''}</span>
				</div>
				{#if incident.insurerReference}
					<div class="flex items-start gap-3 px-4 py-3">
						<span class="w-28 shrink-0 text-muted-foreground">Réf. assureur</span>
						<span class="font-medium font-mono">{incident.insurerReference}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Description -->
		<div class="overflow-hidden rounded-2xl border border-border bg-card">
			<div class="border-b border-border px-4 py-3">
				<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Votre description</p>
			</div>
			<p class="px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap">{incident.description}</p>
		</div>

		<!-- Photos -->
		{#if incident.photoUrls?.length}
			<div class="overflow-hidden rounded-2xl border border-border bg-card">
				<div class="border-b border-border px-4 py-3">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Photos déposées ({incident.photoUrls.length})
					</p>
				</div>
				<div class="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
					{#each incident.photoUrls as photo, i (i)}
						{#if photo.url}
							<a href={photo.url} target="_blank" rel="noopener" class="group relative block overflow-hidden rounded-xl">
								<img src={photo.url} alt={photo.label} class="h-28 w-full object-cover transition-opacity group-hover:opacity-90" />
								<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
									<p class="truncate text-[10px] text-white">{photo.label}</p>
								</div>
							</a>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
