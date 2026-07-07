<script lang="ts">
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';

	interface Item {
		title: string;
		summary: string;
	}

	interface Props {
		items: Item[];
	}

	let { items }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between gap-2">
		<h2 class="text-sm font-black uppercase tracking-widest text-muted-foreground">
			Ce mois-ci
		</h2>
		{#if items.length > 0}
			<span class="rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
				{items.length} réalisé{items.length > 1 ? 's' : ''}
			</span>
		{/if}
	</div>

	{#if items.length === 0}
		<div class="relative overflow-hidden rounded-xl border border-border bg-muted/20 px-4 py-5">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>
			<p class="text-sm text-muted-foreground">Votre concierge surveille votre flotte en continu.</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each items as item (item.title + item.summary)}
				<div class="relative overflow-hidden rounded-xl border border-border bg-card px-4 py-3.5 shadow-glass-card">
					<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>
					<div class="relative flex items-start gap-3">
						<CheckCircle2Icon class="mt-0.5 size-4 shrink-0 text-emerald-500" />
						<div class="min-w-0 flex-1">
							<p class="text-sm font-semibold leading-snug">{item.title}</p>
							{#if item.summary && item.summary !== item.title}
								<p class="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
