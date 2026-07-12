<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import MailIcon from '@lucide/svelte/icons/mail';
	import BuildingIcon from '@lucide/svelte/icons/building-2';
	import type { Id } from '$lib/convex/_generated/dataModel';

	const prospectId = $derived(page.params.id as Id<'salesProspects'>);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const prospect = useQuery((api as any)['sales/prospects'].getProspect, { prospectId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const updateStageMutation = useMutation((api as any)['sales/prospects'].updateProspectStage);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const addNoteMutation = useMutation((api as any)['sales/prospects'].addProspectNote);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const deleteProspectMutation = useMutation((api as any)['sales/prospects'].deleteProspect);

	const STAGES = [
		{ id: 'discovery', label: 'Découverte', color: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
		{ id: 'demo', label: 'Démo en cours', color: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
		{ id: 'negotiation', label: 'Négociation', color: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
		{ id: 'won', label: 'Gagné 🏆', color: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
		{ id: 'lost', label: 'Perdu', color: 'text-red-400', badge: 'bg-red-500/10 text-red-500 border-red-500/20' }
	] as const;

	let newNote = $state('');
	let addingNote = $state(false);
	let stageDialogOpen = $state(false);
	let lostReason = $state('');
	let pendingStage = $state<string | null>(null);
	let deleteDialogOpen = $state(false);

	const currentStage = $derived(STAGES.find((s) => s.id === (prospect.data as any)?.stage));

	async function handleStageChange(stageId: string) {
		if (stageId === 'lost') {
			pendingStage = stageId;
			lostReason = '';
			stageDialogOpen = true;
			return;
		}
		await updateStageMutation({ prospectId, stage: stageId as any });
	}

	async function confirmStageChange() {
		if (!pendingStage) return;
		await updateStageMutation({ prospectId, stage: pendingStage as any, lostReason: lostReason || undefined });
		stageDialogOpen = false;
	}

	async function handleAddNote() {
		if (!newNote.trim()) return;
		addingNote = true;
		try {
			await addNoteMutation({ prospectId, note: newNote.trim() });
			newNote = '';
		} finally {
			addingNote = false;
		}
	}

	async function handleDelete() {
		await deleteProspectMutation({ prospectId });
		goto(resolve(localizedHref('/sales/pipeline')));
	}
</script>

<div class="mx-auto max-w-lg p-4 lg:max-w-2xl lg:p-6">
	<!-- Retour -->
	<a
		href={resolve(localizedHref('/sales/pipeline'))}
		class="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<ArrowLeftIcon class="size-4" />
		Pipeline
	</a>

	{#if prospect.isLoading}
		<div class="py-12 text-center text-sm text-muted-foreground">Chargement…</div>
	{:else if !prospect.data}
		<div class="py-12 text-center text-sm text-muted-foreground">Prospect introuvable.</div>
	{:else}
		{@const data = prospect.data as any}

		<!-- En-tête -->
		<div
			class="relative mb-4 overflow-hidden rounded-2xl border border-border bg-card p-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
			></div>
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h1 class="text-lg font-semibold">{data.companyName}</h1>
					<p class="text-sm text-muted-foreground capitalize">{data.sector} · {data.country}</p>
				</div>
				<Badge class="{currentStage?.badge ?? ''} shrink-0 text-[10px]">
					{currentStage?.label ?? data.stage}
				</Badge>
			</div>
			<div class="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
				<div class="flex items-center gap-2">
					<BuildingIcon class="size-4 shrink-0" />
					<span>{data.estimatedFleetSize} véhicules estimés</span>
				</div>
				{#if data.contactEmail}
					<div class="flex items-center gap-2">
						<MailIcon class="size-4 shrink-0" />
						<a href="mailto:{data.contactEmail}" class="hover:underline">{data.contactEmail}</a>
					</div>
				{/if}
				{#if data.contactPhone}
					<div class="flex items-center gap-2">
						<PhoneIcon class="size-4 shrink-0" />
						<a href="tel:{data.contactPhone}" class="hover:underline">{data.contactPhone}</a>
					</div>
				{/if}
			</div>
		</div>

		<!-- Changer le stade -->
		<div
			class="relative mb-4 overflow-hidden rounded-2xl border border-border bg-card p-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
			></div>
			<h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Avancement
			</h2>
			<div class="flex flex-wrap gap-2">
				{#each STAGES as stage}
					<button
						type="button"
						onclick={() => handleStageChange(stage.id)}
						class="min-h-[44px] rounded-xl border px-3 py-1.5 text-xs font-medium transition-all
						{data.stage === stage.id
							? `${stage.badge} border-current`
							: 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/40'}"
					>
						{stage.label}
					</button>
				{/each}
			</div>
			{#if data.lostReason}
				<p class="mt-2 text-xs text-muted-foreground">Raison : {data.lostReason}</p>
			{/if}
		</div>

		<!-- Notes -->
		<div
			class="relative mb-4 overflow-hidden rounded-2xl border border-border bg-card p-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
			></div>
			<h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h2>

			<div class="flex gap-2">
				<textarea
					bind:value={newNote}
					placeholder="Ajouter une note…"
					rows={2}
					class="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				></textarea>
				<Button
					onclick={handleAddNote}
					disabled={addingNote || !newNote.trim()}
					size="sm"
					class="mt-0 min-h-[44px] self-end bg-[var(--brand)] text-[var(--brand-foreground)]"
				>
					{addingNote ? '…' : 'Ajouter'}
				</Button>
			</div>

			{#if data.notes}
				<div class="mt-3 rounded-lg bg-muted/30 p-3">
					<p class="whitespace-pre-wrap text-xs text-muted-foreground">{data.notes}</p>
				</div>
			{/if}
		</div>

		<!-- Actions danger -->
		<div class="flex justify-end">
			<Button
				variant="ghost"
				size="sm"
				class="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
				onclick={() => (deleteDialogOpen = true)}
			>
				Supprimer ce prospect
			</Button>
		</div>
	{/if}
</div>

<!-- Dialog : raison de perte -->
<Dialog.Root bind:open={stageDialogOpen}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Marquer comme perdu</Dialog.Title>
			<Dialog.Description>Précisez la raison pour améliorer votre pipeline.</Dialog.Description>
		</Dialog.Header>
		<div class="py-2">
			<textarea
				bind:value={lostReason}
				placeholder="Ex: Prix trop élevé, concurrent retenu…"
				rows={3}
				class="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
			></textarea>
		</div>
		<Dialog.Footer>
			<Button variant="ghost" onclick={() => (stageDialogOpen = false)}>Annuler</Button>
			<Button
				onclick={confirmStageChange}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Confirmer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Dialog : confirmation suppression -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Supprimer ce prospect ?</Dialog.Title>
			<Dialog.Description>Cette action est irréversible.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="ghost" onclick={() => (deleteDialogOpen = false)}>Annuler</Button>
			<Button
				onclick={handleDelete}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				Supprimer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
