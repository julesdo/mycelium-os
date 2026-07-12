<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { goto } from '$app/navigation';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const threads = useQuery((api as any)['sales/chat'].listMyThreads, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const createThreadMutation = useMutation((api as any)['sales/chat'].createThread);

	let creating = $state(false);

	async function createNewThread() {
		creating = true;
		try {
			const id = await createThreadMutation({});
			goto(resolve(localizedHref(`/sales/chat/${id}`)));
		} finally {
			creating = false;
		}
	}

	function timeAgo(ts: number): string {
		const diff = Date.now() - ts;
		if (diff < 60000) return 'à l\'instant';
		if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}min`;
		if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`;
		return `il y a ${Math.floor(diff / 86400000)}j`;
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-border/60 p-4">
		<h1 class="text-base font-semibold">Chat concierge</h1>
		<Button
			onclick={createNewThread}
			disabled={creating}
			size="sm"
			class="min-h-[44px] bg-[var(--brand)] text-[var(--brand-foreground)] md:min-h-[36px]"
			style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
		>
			<PlusIcon class="size-4" />
			<span class="ml-1.5 hidden md:inline">Nouveau thread</span>
		</Button>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if threads.isLoading}
			<div class="flex items-center justify-center py-16 text-sm text-muted-foreground">
				Chargement…
			</div>
		{:else if !threads.data || (threads.data as any[]).length === 0}
			<div class="flex flex-col items-center justify-center gap-4 py-24">
				<MessageCircleIcon class="size-10 text-muted-foreground/30" />
				<p class="text-sm text-muted-foreground">Aucun échange avec les concierges.</p>
				<Button
					onclick={createNewThread}
					class="min-h-[44px] bg-[var(--brand)] text-[var(--brand-foreground)]"
				>
					Démarrer un échange
				</Button>
			</div>
		{:else}
			<div class="divide-y divide-border/40">
				{#each (threads.data as any[]) as thread (thread._id)}
					<a
						href={resolve(localizedHref(`/sales/chat/${thread._id}`))}
						class="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30 min-h-[44px]"
					>
						<div
							class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
						>
							C
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<p class="truncate text-sm font-medium">
									{thread.organizationId ? 'Org liée' : 'Discussion générale'}
								</p>
								<span class="shrink-0 text-[10px] text-muted-foreground">
									{timeAgo(thread.lastMessageAt)}
								</span>
							</div>
							<p class="mt-0.5 text-xs text-muted-foreground">
								{thread.conciergeUserIds.length} concierge(s) impliqué(s)
							</p>
						</div>
						{#if thread.unreadBySales}
							<div class="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--brand)]"></div>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
