<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { Button } from '$lib/components/ui/button';
	import ClockIcon from '@lucide/svelte/icons/clock';

	let { organizationId }: { organizationId: Id<'organizations'> } = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const timeline = useQuery((api as any)['concierge/timeline'].getOrgTimeline, { organizationId, limit: 50 });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const addNote = useMutation((api as any)['concierge/timeline'].addConciergeNote);

	let noteContent = $state('');
	let addingNote = $state(false);

	const TYPE_CONFIG: Record<string, { label: string; dot: string }> = {
		ONBOARDING: { label: 'Onboarding', dot: 'bg-emerald-500' },
		FACTURES_DEPOSEES: { label: 'Factures déposées', dot: 'bg-blue-500' },
		DIAGNOSTIC_REMIS: { label: 'Diagnostic remis', dot: 'bg-emerald-400' },
		RATIO_MESURE: { label: 'Ratio mesuré', dot: 'bg-amber-400' },
		DECLARATION_DEPOSEE: { label: 'Télédéclaration déposée', dot: 'bg-indigo-500' },
		ABONNEMENT: { label: 'Abonnement', dot: 'bg-indigo-500' },
		NOTE_OPERATEUR: { label: 'Note opérateur', dot: 'bg-muted-foreground/60' }
	};

	function fmtDate(ts: number) {
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: '2-digit'
		}).format(new Date(ts));
	}

	async function handleAddNote() {
		if (!noteContent.trim() || addingNote) return;
		addingNote = true;
		try {
			await addNote({ organizationId, note: noteContent.trim() });
			noteContent = '';
		} finally {
			addingNote = false;
		}
	}
</script>

<div class="p-5 space-y-5">
	<!-- Zone ajout note -->
	<div class="relative overflow-hidden rounded-xl border border-border bg-card p-4 space-y-3"
		style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
		<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
		<p class="text-xs font-medium text-muted-foreground">Ajouter une note interne</p>
		<textarea
			bind:value={noteContent}
			placeholder="Note visible uniquement par l'équipe concierge…"
			rows="2"
			class="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:bg-background focus:ring-1 focus:ring-[var(--brand)]/20"
		></textarea>
		<Button size="sm" onclick={handleAddNote} disabled={!noteContent.trim() || addingNote}>
			{addingNote ? 'Ajout…' : 'Ajouter'}
		</Button>
	</div>

	<!-- Timeline -->
	{#if timeline.isLoading}
		<div class="space-y-4 pl-4">
			{#each { length: 4 } as _, i (i)}
				<div class="flex gap-3 animate-pulse">
					<div class="size-2.5 mt-1 rounded-full bg-muted shrink-0"></div>
					<div class="flex-1 space-y-1.5">
						<div class="h-3.5 w-1/2 rounded bg-muted"></div>
						<div class="h-3 w-3/4 rounded bg-muted"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if (timeline.data ?? []).length === 0}
		<div class="flex flex-col items-center gap-2 py-12">
			<ClockIcon class="size-9 text-muted-foreground/30" />
			<p class="text-sm text-muted-foreground">Aucun événement enregistré</p>
		</div>
	{:else}
		<div class="relative space-y-0 pl-4">
			{#each timeline.data ?? [] as event, i (event._id)}
				{@const config = TYPE_CONFIG[event.type] ?? { label: event.type, dot: 'bg-muted-foreground' }}
				<div class="flex gap-4 pb-4">
					<div class="flex flex-col items-center -ml-4">
						<span class="size-2.5 rounded-full {config.dot} shrink-0 mt-1"></span>
						{#if i < (timeline.data?.length ?? 0) - 1}
							<div class="w-px flex-1 bg-border/50 mt-1"></div>
						{/if}
					</div>
					<div class="min-w-0 flex-1 pb-1">
						<div class="flex flex-wrap items-baseline gap-2 mb-0.5">
							<span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
								{config.label}
							</span>
							<span class="text-[10px] text-muted-foreground/50">{fmtDate(event.occurredAt)}</span>
						</div>
						<p class="text-sm font-medium">{event.title}</p>
						{#if event.description}
							<p class="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
