<script lang="ts">
	import { copilot } from '$lib/components/copilot/copilot-store.svelte.js';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
</script>

<button
	type="button"
	onclick={() => copilot.open('concierge')}
	class="group relative w-full overflow-hidden rounded-2xl border border-[var(--brand)]/25 bg-gradient-to-br from-[var(--brand)]/10 via-muted/20 to-muted/10 px-5 py-4 shadow-glass-card transition-all hover:border-[var(--brand)]/45 hover:from-[var(--brand)]/15 active:scale-[0.99]"
>
	<!-- Glass reflection -->
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>

	<div class="relative flex items-center gap-4">
		<div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/15 ring-1 ring-[var(--brand)]/25 transition-colors group-hover:bg-[var(--brand)]/25">
			<SparklesIcon class="size-5 text-[var(--brand-foreground)] dark:text-[var(--brand)]" />
		</div>
		<div class="min-w-0 flex-1 text-left">
			<p class="font-bold">Parler à mon concierge</p>
			<p class="mt-0.5 text-sm text-muted-foreground">Posez une question, signalez un problème</p>
		</div>
		<ArrowRightIcon class="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
	</div>
</button>
