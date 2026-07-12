<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import SalesChatBubble from '$lib/components/sales/SalesChatBubble.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import SendIcon from '@lucide/svelte/icons/send';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { tick } from 'svelte';
	import type { Id } from '$lib/convex/_generated/dataModel';

	const threadId = $derived(page.params.threadId as Id<'salesConciergeThreads'>);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const thread = useQuery((api as any)['sales/chat'].getThread, { threadId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const messages = useQuery((api as any)['sales/chat'].listThreadMessages, { threadId });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sendMessageMutation = useMutation((api as any)['sales/chat'].sendMessage);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const markReadMutation = useMutation((api as any)['sales/chat'].markThreadReadBySales);

	let content = $state('');
	let sending = $state(false);
	let messagesEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (messages.data && (messages.data as any[]).length > 0) {
			tick().then(() => {
				messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
			});
		}
	});

	$effect(() => {
		if (thread.data && (thread.data as any).unreadBySales) {
			markReadMutation({ threadId });
		}
	});

	async function handleSend() {
		if (!content.trim() || sending) return;
		sending = true;
		const text = content.trim();
		content = '';
		try {
			await sendMessageMutation({ threadId, content: text });
		} finally {
			sending = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center gap-3 border-b border-border/60 px-4 py-3">
		<a
			href={resolve(localizedHref('/sales/chat'))}
			class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
		>
			<ArrowLeftIcon class="size-4" />
		</a>
		<div>
			<p class="text-sm font-semibold">Concierge Mycelium</p>
			<p class="text-xs text-muted-foreground">
				{(thread.data as any)?.conciergeUserIds?.length ?? 0} membre(s)
			</p>
		</div>
	</div>

	<!-- Messages -->
	<div bind:this={messagesEl} class="flex-1 overflow-y-auto space-y-1 p-4">
		{#if messages.isLoading}
			<div class="flex items-center justify-center py-8 text-sm text-muted-foreground">
				Chargement…
			</div>
		{:else if !messages.data || (messages.data as any[]).length === 0}
			<div class="flex items-center justify-center py-12 text-sm text-muted-foreground">
				Démarrez la conversation ci-dessous.
			</div>
		{:else}
			{#each (messages.data as any[]) as msg (msg._id)}
				<SalesChatBubble message={msg} />
			{/each}
		{/if}
	</div>

	<!-- Zone de saisie -->
	<div
		class="border-t border-border/60 p-3"
		style="padding-bottom: max(env(safe-area-inset-bottom), 0.75rem)"
	>
		<div class="flex items-end gap-2">
			<textarea
				bind:value={content}
				onkeydown={handleKeydown}
				placeholder="Votre message… (Entrée pour envoyer)"
				rows={1}
				class="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				style="min-height: 44px; max-height: 120px; overflow-y: auto"
			></textarea>
			<Button
				onclick={handleSend}
				disabled={sending || !content.trim()}
				size="icon"
				class="size-11 shrink-0 bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
				style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
			>
				<SendIcon class="size-4" />
			</Button>
		</div>
	</div>
</div>
