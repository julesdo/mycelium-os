<script lang="ts">
	import { copilot, type AgentType } from './copilot-store.svelte.js';
	import BotIcon from '@lucide/svelte/icons/bot';
	import XIcon from '@lucide/svelte/icons/x';

	let { defaultAgent = 'concierge' }: { defaultAgent?: AgentType } = $props();

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
	class="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] transition-transform hover:scale-105 active:scale-95 print:hidden"
	style="box-shadow: 0 4px 24px oklch(0.92 0.23 103 / 0.35), 0 1px 3px oklch(0 0 0 / 0.20), inset 0 1px 0 oklch(1 0 0 / 0.35)"
	aria-label={copilot.isOpen ? 'Fermer le copilote IA' : 'Ouvrir le copilote IA (Cmd+K)'}
>
	<!-- Glass reflection -->
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>

	{#if copilot.isOpen}
		<XIcon class="h-5 w-5 text-black" />
	{:else}
		<BotIcon class="h-6 w-6 text-black" />
	{/if}
</button>
