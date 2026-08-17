<script lang="ts">
	import { tick } from 'svelte';

	let {
		messages
	}: {
		messages: Array<{
			_id: string;
			authorId: string;
			// 'concierge' vient du fil humanAssistMessages (table non retypée) ;
			// 'operator' / 'super_admin' viennent des notes internes conciergeTicketMessages.
			authorRole: 'concierge' | 'operator' | 'super_admin' | 'client';
			senderName?: string | null;
			content: string;
			isInternal: boolean;
			createdAt: number;
		}>;
	} = $props();

	let scrollEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		// Scroll to bottom when messages change
		if (messages.length && scrollEl) {
			tick().then(() => {
				scrollEl?.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
			});
		}
	});

	function formatTime(ts: number) {
		return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
			new Date(ts)
		);
	}

	function formatDate(ts: number) {
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(new Date(ts));
	}

	function isSameDay(a: number, b: number) {
		const da = new Date(a);
		const db = new Date(b);
		return da.getFullYear() === db.getFullYear() &&
			da.getMonth() === db.getMonth() &&
			da.getDate() === db.getDate();
	}
</script>

<div bind:this={scrollEl} class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
	{#if messages.length === 0}
		<div class="flex items-center justify-center py-12">
			<p class="text-sm text-muted-foreground">Aucun message pour l'instant</p>
		</div>
	{:else}
		{#each messages as msg, i (msg._id)}
			{#if i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt)}
				<div class="flex items-center gap-3 py-1">
					<div class="h-px flex-1 bg-border/50"></div>
					<span class="text-[10px] text-muted-foreground/60">{formatDate(msg.createdAt)}</span>
					<div class="h-px flex-1 bg-border/50"></div>
				</div>
			{/if}

			<div class="flex flex-col gap-0.5 {msg.isInternal ? 'opacity-80' : ''}">
				<div class="flex items-center gap-2">
					<span class="text-[11px] font-medium
						{msg.authorRole === 'client' ? 'text-blue-500' : 'text-foreground'}">
						{msg.senderName ?? (msg.authorRole === 'client' ? 'Client' : msg.authorRole === 'super_admin' ? 'Super Admin' : 'Opérateur')}
					</span>
					{#if msg.isInternal}
						<span class="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
							note interne
						</span>
					{/if}
					<span class="text-[10px] text-muted-foreground/50">{formatTime(msg.createdAt)}</span>
				</div>
				<div class="rounded-xl px-3 py-2 text-sm leading-relaxed
					{msg.authorRole === 'client'
						? 'bg-muted/60 text-foreground'
						: msg.isInternal
						? 'bg-amber-500/5 border border-amber-500/20 text-foreground'
						: 'bg-[var(--brand)]/5 border border-[var(--brand)]/10 text-foreground'}">
					{msg.content}
				</div>
			</div>
		{/each}
	{/if}
</div>
