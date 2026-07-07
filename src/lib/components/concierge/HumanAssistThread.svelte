<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { api } from '$lib/convex/_generated/api';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	type Props = {
		requestId: Id<'humanAssistRequests'>;
		summary?: string;
	};

	let { requestId, summary }: Props = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const thread = useQuery((api as any)['concierge/humanAssist'].getRequestWithMessages, { requestId });

	function getInitials(name: string): string {
		return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	}
</script>

<!-- Contexte IA -->
{#if summary}
	<div class="mb-3 rounded-xl border border-border/50 bg-background px-3 py-2">
		<p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Contexte partagé par le client</p>
		<p class="whitespace-pre-wrap text-[11px] text-muted-foreground line-clamp-4">{summary}</p>
	</div>
{/if}

<!-- Messages -->
{#if thread.isLoading}
	<div class="mb-3 flex justify-center py-3">
		<LoaderCircleIcon class="size-4 text-muted-foreground motion-safe:animate-spin" />
	</div>
{:else if thread.data}
	<div class="mb-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
		{#each thread.data.messages as msg (msg._id)}
			{#if msg.senderType === 'client'}
				<div class="flex gap-2">
					<div class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
						{getInitials(msg.senderName)}
					</div>
					<div>
						<p class="mb-0.5 text-[10px] font-semibold text-muted-foreground">{msg.senderName}</p>
						<div class="rounded-xl rounded-tl-sm border border-border/50 bg-background px-3 py-2 text-xs">
							{msg.content}
						</div>
					</div>
				</div>
			{:else}
				<div class="flex justify-end gap-2">
					<div class="text-right">
						<p class="mb-0.5 text-[10px] font-semibold text-muted-foreground">{msg.senderName} · Vous</p>
						<div class="rounded-xl rounded-tr-sm bg-violet-600 px-3 py-2 text-xs text-white">
							{msg.content}
						</div>
					</div>
				</div>
			{/if}
		{/each}
		{#if thread.data.messages.length === 0}
			<p class="py-2 text-center text-[11px] text-muted-foreground/50">Aucun message pour l'instant.</p>
		{/if}
	</div>
{/if}
