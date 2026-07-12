<script lang="ts">
	import { page } from '$app/state';
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import TicketThread from '$lib/components/concierge/TicketThread.svelte';
	import TicketContext from '$lib/components/concierge/TicketContext.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	const ticketId = $derived(page.params.ticketId as Id<'conciergeTickets'>);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ticket = useQuery((api as any)['concierge/tickets'].getTicket, { ticketId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const takeTicket = useMutation((api as any)['concierge/tickets'].takeTicket);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sendMessage = useMutation((api as any)['concierge/tickets'].sendTicketMessage);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const resolveTicket = useMutation((api as any)['concierge/tickets'].resolveTicket);

	let replyContent = $state('');
	let isInternal = $state(false);
	let sending = $state(false);

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

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			handleSend();
		}
	}

	const STATUS_BADGE: Record<string, { label: string; class: string }> = {
		NEW: { label: 'Nouveau', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
		IN_PROGRESS: { label: 'En cours', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' },
		WAITING_CLIENT: { label: 'En attente client', class: 'bg-muted text-muted-foreground border-border/50' },
		RESOLVED: { label: 'Résolu', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' },
		CLOSED: { label: 'Fermé', class: 'bg-muted text-muted-foreground/60 border-border/30' }
	};
</script>

<svelte:head>
	<title>{ticket.data?.title ?? 'Ticket'} — Inbox Mycelium</title>
</svelte:head>

<div class="flex h-full flex-col">
	<!-- Barre titre -->
	<div class="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
		<a
			href={resolve(localizedHref('/concierge/inbox'))}
			class="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

			{#if ticket.data.status === 'NEW'}
				<Button
					size="sm"
					onclick={() => takeTicket({ ticketId })}
				>
					Prendre en charge
				</Button>
			{:else if ticket.data.status === 'IN_PROGRESS' || ticket.data.status === 'WAITING_CLIENT'}
				<Button
					size="sm"
					variant="outline"
					onclick={() => resolveTicket({ ticketId })}
				>
					Résoudre
				</Button>
			{/if}
		{/if}
	</div>

	<!-- Corps 3 colonnes -->
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
				<div class="shrink-0 border-t border-border p-4 space-y-3">
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
								? 'bg-muted text-foreground'
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
						<Button
							onclick={handleSend}
							disabled={!replyContent.trim() || sending}
							size="sm"
						>
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

		<!-- Panneau contexte client (desktop uniquement) -->
		<div class="hidden w-72 shrink-0 overflow-y-auto p-4 lg:block">
			{#if ticket.data?.organizationId}
				<TicketContext organizationId={ticket.data.organizationId} />
			{/if}
		</div>
	</div>
</div>
