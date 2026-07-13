<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import SlaTimer from './SlaTimer.svelte';
	import BuildingIcon from '@lucide/svelte/icons/building-2';

	let { ticket, href }: { ticket: Record<string, any>; href?: string } = $props();

	const PRIORITY_DOT: Record<string, string> = {
		URGENT: 'bg-red-500',
		HIGH: 'bg-orange-400',
		NORMAL: 'bg-blue-400',
		LOW: 'bg-muted-foreground/40'
	};

	const SOURCE_LABEL: Record<string, string> = {
		HUMAN_ASSIST: 'Demande client',
		SUPPORT_TICKET: 'Support',
		CONCIERGE_TASK: 'Automatique',
		SALES_MESSAGE: 'Commercial',
		MANUAL: 'Manuel'
	};
</script>

<a
	href={href ?? resolve(localizedHref(`/concierge/inbox/${ticket._id}`))}
	class="flex items-start gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
>
	<span class="mt-2 size-2 shrink-0 rounded-full {PRIORITY_DOT[ticket.priority] ?? 'bg-muted'}"></span>

	<div class="min-w-0 flex-1 space-y-0.5">
		<div class="flex items-center gap-2">
			<span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{SOURCE_LABEL[ticket.sourceType] ?? ticket.sourceType}
			</span>
			<span class="text-muted-foreground/40">·</span>
			<span class="flex items-center gap-1 text-[11px] text-muted-foreground">
				<BuildingIcon class="size-3" />
				{ticket.orgName}
			</span>
		</div>
		<p class="truncate text-sm font-medium text-foreground">{ticket.title}</p>
		<p class="truncate text-xs text-muted-foreground">{ticket.summary}</p>
	</div>

	<div class="flex shrink-0 flex-col items-end gap-1">
		{#if ticket.slaDeadline && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED'}
			<SlaTimer deadline={ticket.slaDeadline} firstResponseAt={ticket.firstResponseAt} />
		{/if}
		{#if !ticket.assignedTo}
			<span class="rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
				Non assigné
			</span>
		{/if}
	</div>
</a>
