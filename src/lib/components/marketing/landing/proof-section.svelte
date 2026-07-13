<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { proofStats } from './landing-data';
	import IntegrationsMarquee from './integrations-marquee.svelte';

	const { t } = getTranslate();
</script>

<div class="border-y border-border">
	<!-- Stats strip — gap-px on bg-border creates crisp grid dividers -->
	<div class="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
		{#each proofStats as stat (stat.id)}
			<div class="flex flex-col items-center bg-background px-4 py-10 text-center lg:px-8 lg:py-12">
				<div class="mb-4 h-px w-10 rounded-full bg-[var(--brand)]"></div>
				<span class="font-mono text-4xl font-bold leading-none tabular-nums text-foreground lg:text-[2.75rem]">
					{stat.value}
				</span>
				<span class="mt-3 max-w-[16ch] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
					{$t(stat.labelKey)}
				</span>
			</div>
		{/each}
	</div>

	<!-- Integrations marquee -->
	<div class="border-t border-border bg-background">
		<IntegrationsMarquee />
	</div>
</div>
