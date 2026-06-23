<script lang="ts">
	type Props = {
		role: 'user' | 'assistant';
		content: string;
		isStreaming?: boolean;
		toolCall?: string | null;
	};

	let { role, content, isStreaming = false, toolCall = null }: Props = $props();

	const TOOL_LABELS: Record<string, string> = {
		getFleetUtilizationStats: 'Analyse des taux d\'utilisation…',
		getCostBreakdown: 'Analyse des coûts…',
		getReservationActivity: 'Analyse des réservations…',
		getMaintenanceOverview: 'Récupération des entretiens…',
		getComplianceStatus: 'Vérification de la conformité…',
		getFleetSummary: 'Résumé de la flotte…'
	};

	// Simple markdown → HTML: **bold**, bullet lists, numbered lists, line breaks
	function renderMarkdown(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			// bold
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			// bullet list lines
			.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
			// numbered list lines
			.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
			// wrap consecutive <li> in <ul>
			.replace(/(<li>[\s\S]*?<\/li>)(?=\s*<li>|$)/g, (match) => match)
			// line breaks (double newline = paragraph, single = <br>)
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');
	}

	const rendered = $derived(renderMarkdown(content));
</script>

{#if role === 'user'}
	<div class="flex justify-end">
		<div class="max-w-[80%] rounded-2xl rounded-tr-sm bg-[var(--brand)] px-3.5 py-2.5 text-sm text-[var(--brand-foreground)]">
			{content}
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-1.5">
		{#if toolCall}
			<div class="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
				<span class="inline-block size-1.5 animate-pulse rounded-full bg-[var(--brand)]"></span>
				{TOOL_LABELS[toolCall] ?? 'Analyse en cours…'}
			</div>
		{/if}

		{#if content}
			<div
				class="prose prose-sm max-w-none text-sm text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-foreground {isStreaming
					? 'after:ml-0.5 after:inline-block after:h-3.5 after:w-px after:animate-pulse after:bg-foreground/60 after:align-middle after:content-[\'\']'
					: ''}"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html rendered}
			</div>
		{/if}
	</div>
{/if}
