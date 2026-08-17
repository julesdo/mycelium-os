<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import UserHeartIcon from '@lucide/svelte/icons/heart-handshake';
	import SendIcon from '@lucide/svelte/icons/send';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import HumanAssistThread from './HumanAssistThread.svelte';

	let { organizationId }: { organizationId: Id<'organizations'> } = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const assistRequests = useQuery((api as any)['concierge/humanAssist'].listRequestsForOrg, () => ({
		organizationId
	}));
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const replyAsConcierge = useMutation((api as any)['concierge/humanAssist'].replyAsConciege);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const closeByConcierge = useMutation((api as any)['concierge/humanAssist'].closeByConcierge);

	let expandedRequestId = $state<Id<'humanAssistRequests'> | null>(null);
	let replyInputs = $state<Record<string, string>>({});
	let replySending = $state<Record<string, boolean>>({});

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		const h = Math.floor(diff / 3_600_000);
		const d = Math.floor(h / 24);
		if (d > 0) return `${d}j`;
		if (h > 0) return `${h}h`;
		return 'maintenant';
	}

	function getInitials(name: string): string {
		return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	}

	function toggleExpand(requestId: Id<'humanAssistRequests'>) {
		expandedRequestId = expandedRequestId === requestId ? null : requestId;
	}

	async function sendReply(requestId: Id<'humanAssistRequests'>) {
		const content = (replyInputs[requestId] ?? '').trim();
		if (!content || replySending[requestId]) return;
		replySending = { ...replySending, [requestId]: true };
		try {
			await replyAsConcierge({ requestId, content });
			replyInputs = { ...replyInputs, [requestId]: '' };
			toast.success('Réponse envoyée.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		} finally {
			replySending = { ...replySending, [requestId]: false };
		}
	}

	async function closeRequest(requestId: Id<'humanAssistRequests'>) {
		try {
			await closeByConcierge({ requestId });
			if (expandedRequestId === requestId) expandedRequestId = null;
			toast.success('Conversation clôturée.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		}
	}
</script>

<div class="px-6 py-5 space-y-5">
	{#if assistRequests.isLoading}
		<div class="space-y-1.5">
			{#each { length: 4 } as _, i (i)}<Skeleton class="h-14 rounded-xl" />{/each}
		</div>
	{:else if !assistRequests.data || assistRequests.data.length === 0}
		<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
			<InboxIcon class="mb-2 size-7 text-muted-foreground/30" />
			<p class="text-sm font-medium text-muted-foreground">Aucune demande d'assistance en attente</p>
			<p class="mt-0.5 text-xs text-muted-foreground/50">Ce client n'a pas sollicité d'aide humaine récemment.</p>
		</div>
	{:else}
		<div>
			<div class="mb-2 flex items-center gap-2">
				<UserHeartIcon class="size-4 text-violet-500" />
				<h2 class="text-sm font-semibold">Demandes clients en attente</h2>
				<span class="rounded-full bg-violet-100 px-1.5 text-[10px] font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
					{assistRequests.data.length}
				</span>
			</div>
			<div class="flex flex-col gap-0 overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-900/30">
				{#each assistRequests.data as req, i (req._id)}
					{@const isExpanded = expandedRequestId === req._id}
					{@const isLast = i === assistRequests.data.length - 1}
					<div class={cn(!isLast && 'border-b border-border/40')}>
						<button
							type="button"
							onclick={() => toggleExpand(req._id)}
							class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
						>
							<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-[11px] font-bold text-white">
								{getInitials(req.requesterName)}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-semibold">{req.requesterName}</span>
									{#if req.status === 'pending'}
										<span class="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
											<span class="inline-block size-1.5 animate-pulse rounded-full bg-amber-500"></span>En attente
										</span>
									{:else if req.status === 'in_progress'}
										<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">En cours</span>
									{/if}
								</div>
								{#if req.lastMessage}
									<p class="mt-0.5 truncate text-xs text-muted-foreground">
										{req.lastMessage.senderType === 'client' ? '🧑 ' : '🤝 '}{req.lastMessage.content}
									</p>
								{:else if req.summary}
									<p class="mt-0.5 truncate text-xs text-muted-foreground italic">{req.summary}</p>
								{/if}
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<span class="text-[10px] text-muted-foreground">{timeAgo(req.createdAt)}</span>
								<ChevronDownIcon class={cn('size-3.5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
							</div>
						</button>
						{#if isExpanded}
							<div class="border-t border-border/40 bg-muted/20 px-4 py-3 space-y-3">
								{#if req.summary}
									<div class="rounded-xl border border-border/50 bg-background px-3 py-2">
										<p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Contexte</p>
										<p class="whitespace-pre-wrap text-[11px] text-muted-foreground line-clamp-4">{req.summary}</p>
									</div>
								{/if}
								<HumanAssistThread requestId={req._id} summary={req.summary} />
								{#if req.status !== 'closed'}
									<div class="flex gap-2">
										<input
											type="text"
											bind:value={replyInputs[req._id]}
											onkeydown={(e) => e.key === 'Enter' && sendReply(req._id)}
											placeholder="Répondre à {req.requesterName}…"
											class="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20"
										/>
										<Button
											size="icon"
											onclick={() => sendReply(req._id)}
											disabled={!replyInputs[req._id]?.trim() || replySending[req._id]}
											class="size-9 shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
										>
											{#if replySending[req._id]}
												<LoaderCircleIcon class="size-3.5 motion-safe:animate-spin" />
											{:else}
												<SendIcon class="size-3.5" />
											{/if}
										</Button>
										<Button variant="outline" size="sm" onclick={() => closeRequest(req._id)} class="shrink-0 text-[11px]">
											Clôturer
										</Button>
									</div>
								{:else}
									<p class="text-center text-[11px] text-muted-foreground/50">Conversation clôturée.</p>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
