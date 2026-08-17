<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import TicketThread from './TicketThread.svelte';
	import TicketContext from './TicketContext.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';
	import UserIcon from '@lucide/svelte/icons/user';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';

	let {
		ticketId,
		backHref
	}: {
		ticketId: Id<'conciergeTickets'>;
		backHref: string;
	} = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ticket = useQuery((api as any)['concierge/tickets'].getTicket, { ticketId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const staff = useQuery((api as any)['concierge/staff'].listMyceliumStaff, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const myRole = useQuery(api['concierge/queries'].getMyStaffRole, {});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const takeTicket = useMutation((api as any)['concierge/tickets'].takeTicket);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sendMessage = useMutation((api as any)['concierge/tickets'].sendTicketMessage);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const resolveTicket = useMutation((api as any)['concierge/tickets'].resolveTicket);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const reassignTicket = useMutation((api as any)['concierge/tickets'].reassignTicket);

	let replyContent = $state('');
	let isInternal = $state(false);
	let sending = $state(false);

	// Closing note dialog
	let resolveOpen = $state(false);
	let closingNote = $state('');
	let resolving = $state(false);

	// Assignee popover
	let assigneeOpen = $state(false);
	let reassigning = $state(false);

	const isSuperAdmin = $derived(myRole.data?.staffRole === 'SUPER_ADMIN');

	async function handleSend() {
		if (!replyContent.trim() || sending) return;
		sending = true;
		try {
			await sendMessage({ ticketId, content: replyContent.trim(), isInternal });
			replyContent = '';
		} finally {
			sending = false;
		}
	}

	async function handleResolve() {
		if (resolving) return;
		resolving = true;
		try {
			await resolveTicket({ ticketId, closingNote: closingNote.trim() || undefined });
			resolveOpen = false;
			closingNote = '';
		} finally {
			resolving = false;
		}
	}

	async function handleReassign(userId: string | undefined) {
		if (reassigning) return;
		reassigning = true;
		assigneeOpen = false;
		try {
			await reassignTicket({ ticketId, assignedTo: userId });
		} finally {
			reassigning = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSend();
	}

	const STATUS_BADGE: Record<string, { label: string; class: string }> = {
		NEW: { label: 'Nouveau', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
		IN_PROGRESS: { label: 'En cours', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' },
		WAITING_CLIENT: { label: 'En attente client', class: 'bg-muted text-muted-foreground border-border/50' },
		RESOLVED: { label: 'Résolu', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' },
		CLOSED: { label: 'Fermé', class: 'bg-muted text-muted-foreground/60 border-border/30' }
	};

	const assignedStaff = $derived(
		ticket.data?.assignedTo
			? (staff.data ?? []).find((s: any) => s.userId === ticket.data?.assignedTo)
			: null
	);
</script>

<div class="flex h-full flex-col">
	<!-- Barre titre -->
	<div class="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
		<a
			href={backHref}
			class="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			title="Retour"
		>
			<ArrowLeftIcon class="size-4" />
		</a>

		<span class="min-w-0 flex-1 truncate text-sm font-medium">
			{ticket.data?.title ?? '…'}
		</span>

		{#if ticket.data}
			{@const badge = STATUS_BADGE[ticket.data.status]}
			{#if badge}
				<Badge class="shrink-0 {badge.class}">{badge.label}</Badge>
			{/if}

			<!-- Assignee picker (super_admin uniquement ou si non assigné) -->
			{#if isSuperAdmin || !ticket.data.assignedTo}
				<Popover.Root bind:open={assigneeOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="flex h-7 items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted hover:text-foreground"
							>
								<UserIcon class="size-3" />
								<span class="hidden sm:inline">{assignedStaff?.name ?? 'Non assigné'}</span>
								<ChevronDownIcon class="size-3 opacity-60" />
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-56 p-1" align="end">
						<button
							type="button"
							onclick={() => handleReassign(undefined)}
							class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground {!ticket.data.assignedTo ? 'font-medium text-foreground' : ''}"
						>
							<span class="flex size-5 items-center justify-center rounded-full bg-muted text-[9px]">?</span>
							Non assigné
							{#if !ticket.data.assignedTo}<CheckIcon class="ml-auto size-3 text-[var(--brand)]" />{/if}
						</button>
						{#each (staff.data ?? []) as member (member._id)}
							<button
								type="button"
								onclick={() => handleReassign(member.userId)}
								class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] transition-colors hover:bg-muted {ticket.data.assignedTo === member.userId ? 'font-medium text-foreground' : 'text-muted-foreground'}"
							>
								{#if member.avatarUrl}
									<img src={member.avatarUrl} alt={member.name} class="size-5 rounded-full object-cover" />
								{:else}
									<span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-[9px] font-bold text-white">
										{member.name.slice(0, 2).toUpperCase()}
									</span>
								{/if}
								<span class="min-w-0 flex-1 truncate">{member.name}</span>
								{#if ticket.data.assignedTo === member.userId}
									<CheckIcon class="size-3 shrink-0 text-[var(--brand)]" />
								{/if}
							</button>
						{/each}
					</Popover.Content>
				</Popover.Root>
			{/if}

			<!-- Actions statut -->
			{#if ticket.data.status === 'NEW'}
				<Button size="sm" onclick={() => takeTicket({ ticketId })}>
					Prendre en charge
				</Button>
			{:else if ticket.data.status === 'IN_PROGRESS' || ticket.data.status === 'WAITING_CLIENT'}
				<Button size="sm" variant="outline" onclick={() => (resolveOpen = true)}>
					<CheckCircleIcon class="mr-1.5 size-3.5" />
					Résoudre
				</Button>
			{/if}
		{/if}
	</div>

	<!-- Corps 2 colonnes -->
	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- Fil conversation + zone réponse -->
		<div class="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border">
			{#if ticket.isLoading}
				<div class="flex flex-1 items-center justify-center">
					<div class="size-5 animate-spin rounded-full border-2 border-border border-t-foreground"></div>
				</div>
			{:else if ticket.data}
				<TicketThread messages={ticket.data.messages} />
			{:else}
				<div class="flex flex-1 items-center justify-center">
					<p class="text-sm text-muted-foreground">Ticket introuvable ou accès refusé</p>
				</div>
			{/if}

			<!-- Zone réponse -->
			{#if ticket.data && ticket.data.status !== 'RESOLVED' && ticket.data.status !== 'CLOSED'}
				<div class="shrink-0 space-y-3 border-t border-border p-4">
					<div class="flex gap-1">
						<button
							type="button"
							onclick={() => (isInternal = false)}
							class="rounded-lg px-3 py-1 text-xs font-medium transition-colors {!isInternal
								? 'bg-[var(--brand)]/10 text-[var(--brand-foreground)]'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							Répondre au client
						</button>
						<button
							type="button"
							onclick={() => (isInternal = true)}
							class="rounded-lg px-3 py-1 text-xs font-medium transition-colors {isInternal
								? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							Note interne
						</button>
					</div>
					<textarea
						bind:value={replyContent}
						onkeydown={handleKeydown}
						placeholder={isInternal
							? "Note visible uniquement par l'équipe…"
							: 'Répondre au client… (Ctrl+Entrée pour envoyer)'}
						rows="3"
						class="w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-[var(--brand)]/30
							{isInternal
								? 'border-amber-500/20 bg-amber-500/5 focus:border-amber-500/40'
								: 'border-border bg-muted/30 focus:border-border focus:bg-background'}"
					></textarea>
					<div class="flex items-center justify-between">
						<span class="text-[10px] text-muted-foreground/40">Ctrl+Entrée pour envoyer</span>
						<Button onclick={handleSend} disabled={!replyContent.trim() || sending} size="sm">
							{sending ? 'Envoi…' : 'Envoyer'}
						</Button>
					</div>
				</div>
			{:else if ticket.data?.status === 'RESOLVED'}
				<div class="shrink-0 border-t border-border px-4 py-3">
					<p class="text-center text-xs text-muted-foreground">Ticket résolu</p>
				</div>
			{/if}
		</div>

		<!-- Panneau contexte (desktop) -->
		<div class="hidden w-72 shrink-0 overflow-y-auto p-4 lg:block">
			{#if ticket.data?.organizationId}
				<TicketContext organizationId={ticket.data.organizationId} />
			{/if}
		</div>
	</div>
</div>

<!-- Dialog résolution avec closing note -->
<AlertDialog.Root bind:open={resolveOpen}>
	<AlertDialog.Content class="max-w-sm">
		<AlertDialog.Header>
			<AlertDialog.Title>Résoudre ce ticket</AlertDialog.Title>
			<AlertDialog.Description>
				Une note de clôture est optionnelle mais recommandée pour garder une trace.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="py-2">
			<textarea
				bind:value={closingNote}
				placeholder="Note de clôture (optionnelle)…"
				rows="3"
				class="w-full resize-none rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-border focus:bg-background focus:ring-1 focus:ring-[var(--brand)]/30"
			></textarea>
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
			<Button
				onclick={handleResolve}
				disabled={resolving}
				class="bg-emerald-600 text-white hover:bg-emerald-700"
			>
				<CheckCircleIcon class="mr-1.5 size-3.5" />
				{resolving ? 'Résolution…' : 'Confirmer'}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
