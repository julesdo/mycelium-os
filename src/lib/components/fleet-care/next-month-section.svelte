<script lang="ts">
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';

	interface Item {
		title: string;
		summary: string;
		dueDate?: number;
	}

	interface Props {
		items: Item[];
	}

	let { items }: Props = $props();

	function formatDue(ts: number): string {
		return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(ts));
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between gap-2">
		<h2 class="text-sm font-black uppercase tracking-widest text-muted-foreground">
			Mois prochain
		</h2>
		{#if items.length > 0}
			<span class="rounded-full bg-sky-500/12 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400">
				{items.length} à venir
			</span>
		{/if}
	</div>

	{#if items.length === 0}
		<div class="relative overflow-hidden rounded-xl border border-border bg-muted/20 px-4 py-5">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>
			<p class="text-sm text-muted-foreground">Aucune échéance à anticiper le mois prochain.</p>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each items as item (item.title + (item.dueDate ?? ''))}
				<div class="relative overflow-hidden rounded-xl border border-border bg-card px-4 py-3.5 shadow-glass-card">
					<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>
					<div class="relative flex items-start gap-3">
						<CalendarClockIcon class="mt-0.5 size-4 shrink-0 text-sky-500" />
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5">
								<p class="text-sm font-semibold leading-snug">{item.title}</p>
								<span class="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
									Pris en charge
								</span>
							</div>
							{#if item.dueDate}
								<p class="mt-0.5 text-xs text-muted-foreground">
									Échéance le {formatDue(item.dueDate)}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
