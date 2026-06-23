<script lang="ts">
	import type { CopilotWidget } from './widgets/types.js';
	import CopilotFleetSummaryWidget from './widgets/CopilotFleetSummaryWidget.svelte';
	import CopilotFleetUtilizationWidget from './widgets/CopilotFleetUtilizationWidget.svelte';
	import CopilotCostBreakdownWidget from './widgets/CopilotCostBreakdownWidget.svelte';
	import CopilotMaintenanceWidget from './widgets/CopilotMaintenanceWidget.svelte';
	import CopilotComplianceWidget from './widgets/CopilotComplianceWidget.svelte';
	import CopilotVehicleProposalWidget from './widgets/CopilotVehicleProposalWidget.svelte';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	const TOOL_LABELS: Record<string, string> = {
		searchVehicles: 'Recherche des véhicules disponibles…',
		createReservation: 'Création de la réservation…',
		listReservations: 'Récupération de vos réservations…',
		cancelReservation: 'Annulation de la réservation…',
		getFleetUtilizationStats: "Analyse des taux d'utilisation…",
		getCostBreakdown: 'Analyse des coûts…',
		getReservationActivity: 'Analyse des réservations…',
		getMaintenanceOverview: 'Récupération des entretiens…',
		getComplianceStatus: 'Vérification de la conformité…',
		getFleetSummary: 'Résumé de la flotte…'
	};

	type Props = {
		role: 'user' | 'assistant';
		content: string;
		isStreaming?: boolean;
		toolCall?: string | null;
		widget?: CopilotWidget;
		onVehicleSelect?: (vehicleId: string, startDate?: string, endDate?: string) => void;
		onVehicleAlt?: () => void;
	};

	let { role, content, isStreaming = false, toolCall = null, widget, onVehicleSelect, onVehicleAlt }: Props = $props();

	function renderMarkdown(raw: string): string {
		let text = raw
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Code blocks (``` ... ```)
		text = text.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="copilot-pre"><code>$1</code></pre>');

		// Inline code
		text = text.replace(/`([^`]+)`/g, '<code class="copilot-code">$1</code>');

		// Tables — detect | col | col | pattern
		text = text.replace(/((?:\|[^\n]+\|\n?)+)/g, (block) => {
			const rows = block.trim().split('\n').filter((r) => r.trim());
			if (rows.length < 2) return block;

			const isHeader = rows[1]?.replace(/[\s|:-]/g, '') === '';
			let html = '<table class="copilot-table">';

			rows.forEach((row, i) => {
				if (i === 1 && isHeader) return; // skip separator
				const cells = row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1);
				if (i === 0 && isHeader) {
					html += '<thead><tr>' + cells.map((c) => `<th>${c.trim()}</th>`).join('') + '</tr></thead><tbody>';
				} else {
					html += '<tr>' + cells.map((c) => `<td>${c.trim()}</td>`).join('') + '</tr>';
				}
			});

			html += isHeader ? '</tbody></table>' : '</table>';
			return html;
		});

		// Headings
		text = text.replace(/^### (.+)$/gm, '<h4 class="copilot-h4">$1</h4>');
		text = text.replace(/^## (.+)$/gm, '<h3 class="copilot-h3">$1</h3>');
		text = text.replace(/^# (.+)$/gm, '<h3 class="copilot-h3">$1</h3>');

		// Bold + italic
		text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
		text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
		text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

		// Lists — group consecutive list items
		text = text.replace(/((?:^[-*•] .+\n?)+)/gm, (block) => {
			const items = block.trim().split('\n').map((l) => `<li>${l.replace(/^[-*•] /, '')}</li>`).join('');
			return `<ul class="copilot-ul">${items}</ul>`;
		});
		text = text.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
			const items = block.trim().split('\n').map((l) => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
			return `<ol class="copilot-ol">${items}</ol>`;
		});

		// Paragraphs (double newline → paragraph break)
		text = text.replace(/\n\n+/g, '</p><p class="copilot-p">');
		text = text.replace(/\n/g, '<br>');

		// Wrap everything in a p tag if not already block-level
		if (!text.startsWith('<')) text = `<p class="copilot-p">${text}</p>`;

		return text;
	}

	const renderedContent = $derived(content ? renderMarkdown(content) : '');

	function formatDate(iso: string) {
		try {
			return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
		} catch { return iso; }
	}
</script>

{#if role === 'user'}
	<div class="flex justify-end">
		<div class="max-w-[82%] rounded-2xl rounded-tr-sm bg-[var(--brand)] px-3.5 py-2.5 text-sm text-[var(--brand-foreground)]">
			{content}
		</div>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		<!-- Tool call indicator -->
		{#if toolCall}
			<div class="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
				<span class="inline-block size-1.5 animate-pulse rounded-full bg-[var(--brand)]"></span>
				{TOOL_LABELS[toolCall] ?? 'Analyse en cours…'}
			</div>
		{/if}

		<!-- Widget -->
		{#if widget}
			{#if widget.widget === 'fleet_summary'}
				<CopilotFleetSummaryWidget data={widget} />
			{:else if widget.widget === 'fleet_utilization'}
				<CopilotFleetUtilizationWidget data={widget} />
			{:else if widget.widget === 'cost_breakdown'}
				<CopilotCostBreakdownWidget data={widget} />
			{:else if widget.widget === 'maintenance_overview'}
				<CopilotMaintenanceWidget data={widget} />
			{:else if widget.widget === 'compliance_status'}
				<CopilotComplianceWidget data={widget} />
			{:else if widget.widget === 'vehicle_proposal'}
				<CopilotVehicleProposalWidget
					data={widget}
					onSelect={onVehicleSelect}
					onAlt={onVehicleAlt}
				/>
			{:else if widget.widget === 'reservation_confirmed'}
				<div class="flex flex-col gap-1.5 rounded-xl border border-emerald-200/50 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
					<div class="flex items-center gap-2">
						<CheckCircleIcon class="size-4 text-emerald-500" />
						<span class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Réservation confirmée</span>
					</div>
					<p class="text-sm font-medium">{widget.reservation.vehicle}</p>
					<div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<CalendarIcon class="size-3" />
						{formatDate(widget.reservation.startDate)} → {formatDate(widget.reservation.endDate)}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Text content with styled markdown -->
		{#if content}
			<div class="copilot-prose text-sm text-foreground {isStreaming ? 'streaming-cursor' : ''}">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html renderedContent}
			</div>
		{:else if isStreaming && !widget}
			<span class="inline-block size-1.5 animate-pulse rounded-full bg-[var(--brand)]"></span>
		{/if}
	</div>
{/if}

<style>
	:global(.copilot-prose) {
		line-height: 1.6;
	}
	:global(.copilot-p) {
		margin: 0 0 0.5rem;
	}
	:global(.copilot-p:last-child) {
		margin-bottom: 0;
	}
	:global(.copilot-h3) {
		font-size: 0.875rem;
		font-weight: 700;
		margin: 0.75rem 0 0.25rem;
		color: var(--fg, hsl(var(--foreground)));
	}
	:global(.copilot-h4) {
		font-size: 0.8125rem;
		font-weight: 600;
		margin: 0.5rem 0 0.25rem;
		color: var(--fg, hsl(var(--foreground)));
	}
	:global(.copilot-ul),
	:global(.copilot-ol) {
		margin: 0.25rem 0 0.5rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	:global(.copilot-ul) { list-style-type: disc; }
	:global(.copilot-ol) { list-style-type: decimal; }
	:global(.copilot-table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
		margin: 0.5rem 0;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid hsl(var(--border));
	}
	:global(.copilot-table th) {
		background: hsl(var(--muted));
		padding: 0.35rem 0.6rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: hsl(var(--muted-foreground));
	}
	:global(.copilot-table td) {
		padding: 0.3rem 0.6rem;
		border-top: 1px solid hsl(var(--border));
	}
	:global(.copilot-table tr:hover td) {
		background: hsl(var(--muted) / 0.4);
	}
	:global(.copilot-pre) {
		background: hsl(var(--muted));
		border-radius: 0.5rem;
		padding: 0.6rem 0.75rem;
		font-size: 0.75rem;
		overflow-x: auto;
		margin: 0.5rem 0;
	}
	:global(.copilot-code) {
		background: hsl(var(--muted));
		border-radius: 0.25rem;
		padding: 0.1rem 0.3rem;
		font-size: 0.8em;
		font-family: ui-monospace, monospace;
	}
	:global(.streaming-cursor::after) {
		content: '';
		display: inline-block;
		width: 1px;
		height: 0.875rem;
		background: hsl(var(--foreground) / 0.6);
		margin-left: 1px;
		vertical-align: middle;
		animation: blink 600ms step-end infinite;
	}
	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}
</style>
