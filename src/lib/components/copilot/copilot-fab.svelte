<script lang="ts">
	import { copilot, type AgentType } from './copilot-store.svelte.js';
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import BotIcon from '@lucide/svelte/icons/bot';
	import XIcon from '@lucide/svelte/icons/x';

	let { defaultAgent = 'concierge' }: { defaultAgent?: AgentType } = $props();

	// Demande Human Assist active — pour le badge sur le FAB
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const activeRequestQ = useQuery((api as any)['concierge/humanAssist'].getMyActiveRequest, {});
	const hasActiveRequest = $derived(
		!!activeRequestQ.data && activeRequestQ.data.request.status !== 'closed'
	);
	const hasUnread = $derived(
		hasActiveRequest &&
		(activeRequestQ.data?.messages ?? []).some((m: any) => m.senderType === 'concierge') &&
		!copilot.isOpen
	);

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			const target = e.target as HTMLElement;
			if (target.closest('input, textarea, [contenteditable]') && target.id !== 'copilot-input') return;
			e.preventDefault();
			copilot.toggle(defaultAgent);
		}
		if (e.key === 'Escape' && copilot.isOpen) {
			copilot.close();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<button
	onclick={() => copilot.toggle(defaultAgent)}
	class="copilot-fab print:hidden"
	class:copilot-fab--open={copilot.isOpen}
	aria-label={copilot.isOpen ? 'Fermer Mycelium Assist' : 'Ouvrir Mycelium Assist (⌘K)'}
	aria-expanded={copilot.isOpen}
>
	<!-- Glass top reflection -->
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>

	<!-- Ripple on open -->
	{#if copilot.isOpen}
		<span class="fab-ripple"></span>
	{/if}

	<!-- Icon morph -->
	<span class="fab-icon-wrap" class:fab-icon-wrap--open={copilot.isOpen}>
		<BotIcon class="fab-icon fab-icon--bot" />
		<XIcon class="fab-icon fab-icon--x" />
	</span>

	<!-- Badge conversation humaine active -->
	{#if hasUnread && !copilot.isOpen}
		<span class="fab-badge" aria-label="Nouveau message de votre concierge"></span>
	{:else if hasActiveRequest && !copilot.isOpen}
		<span class="fab-badge fab-badge--pulse" aria-label="Conversation en cours avec votre concierge"></span>
	{/if}

	<!-- Keyboard hint tooltip (desktop only) -->
	<span class="fab-tooltip" aria-hidden="true">
		{#if copilot.isOpen}Fermer{:else if hasActiveRequest}Concierge actif{:else}Assist ⌘K{/if}
	</span>
</button>

<style>
.copilot-fab {
	position: fixed;
	bottom: 24px;
	right: 24px;
	z-index: 9997;

	display: flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	border-radius: 999px;

	background: var(--brand, oklch(0.92 0.23 103));
	box-shadow:
		0 4px 20px oklch(0.92 0.23 103 / 0.38),
		0 1px 4px oklch(0 0 0 / 0.18),
		inset 0 1px 0 oklch(1 0 0 / 0.38);

	transition:
		transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
		box-shadow 0.2s ease,
		background 0.2s ease;

	-webkit-tap-highlight-color: transparent;
	overflow: hidden;
}

.copilot-fab:hover {
	transform: scale(1.08);
	box-shadow:
		0 6px 28px oklch(0.92 0.23 103 / 0.48),
		0 2px 6px oklch(0 0 0 / 0.18),
		inset 0 1px 0 oklch(1 0 0 / 0.4);
}

.copilot-fab:active {
	transform: scale(0.93);
	transition-duration: 0.1s;
}

.copilot-fab--open {
	background: hsl(var(--foreground));
	box-shadow:
		0 4px 20px oklch(0 0 0 / 0.25),
		0 1px 4px oklch(0 0 0 / 0.18),
		inset 0 1px 0 oklch(1 0 0 / 0.1);
}

.copilot-fab--open:hover {
	box-shadow:
		0 6px 28px oklch(0 0 0 / 0.3),
		0 2px 6px oklch(0 0 0 / 0.15),
		inset 0 1px 0 oklch(1 0 0 / 0.08);
}

/* ── Ripple on open ──────────────────────────────────────────────────────── */
.fab-ripple {
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background: oklch(1 0 0 / 0.15);
	animation: fab-ripple 0.4s ease-out forwards;
}

@keyframes fab-ripple {
	from { opacity: 1; transform: scale(0.6); }
	to   { opacity: 0; transform: scale(1.4); }
}

/* ── Icon morph ─────────────────────────────────────────────────────────── */
.fab-icon-wrap {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
}

:global(.fab-icon) {
	position: absolute;
	width: 20px;
	height: 20px;
	color: black;
	transition:
		opacity 0.2s ease,
		transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:global(.fab-icon--bot) {
	opacity: 1;
	transform: scale(1) rotate(0deg);
}

:global(.fab-icon--x) {
	opacity: 0;
	transform: scale(0.5) rotate(-45deg);
}

.fab-icon-wrap--open :global(.fab-icon--bot) {
	opacity: 0;
	transform: scale(0.5) rotate(45deg);
}

.fab-icon-wrap--open :global(.fab-icon--x) {
	opacity: 1;
	transform: scale(1) rotate(0deg);
	color: hsl(var(--background));
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */
.fab-tooltip {
	position: absolute;
	right: calc(100% + 10px);
	top: 50%;
	transform: translateY(-50%) translateX(4px);
	white-space: nowrap;
	padding: 5px 9px;
	border-radius: 8px;
	font-size: 11.5px;
	font-weight: 600;
	background: hsl(var(--popover));
	color: hsl(var(--popover-foreground));
	border: 1px solid hsl(var(--border));
	box-shadow: 0 2px 8px oklch(0 0 0 / 0.1);
	pointer-events: none;
	opacity: 0;
	transition:
		opacity 0.15s ease,
		transform 0.15s ease;
}

@media (hover: hover) {
	.copilot-fab:hover .fab-tooltip {
		opacity: 1;
		transform: translateY(-50%) translateX(0);
	}
}

/* Mobile: no tooltip, bigger tap area */
@media (max-width: 767px) {
	.copilot-fab {
		bottom: 20px;
		right: 20px;
		width: 56px;
		height: 56px;
	}
	.fab-tooltip { display: none; }
}

/* ── Badge conversation humaine ─────────────────────────────────────────────── */
.fab-badge {
	position: absolute;
	top: 2px;
	right: 2px;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: oklch(0.55 0.18 295);
	border: 2px solid var(--background, #fff);
	box-shadow: 0 0 0 1px oklch(0.55 0.18 295 / 0.3);
}

.fab-badge--pulse {
	background: oklch(0.7 0.12 145);
	animation: fab-badge-pulse 2s ease-in-out infinite;
}

@keyframes fab-badge-pulse {
	0%, 100% { opacity: 1; transform: scale(1); }
	50% { opacity: 0.7; transform: scale(0.9); }
}
</style>
