<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import LandingSection from './landing-section.svelte';
	import ProofStat from './proof-stat.svelte';
	import { proofStats } from './landing-data';

	const { t } = getTranslate();
</script>

<LandingSection class="px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
	<div class="grid grid-cols-2 gap-y-10 lg:grid-cols-4 lg:gap-y-0">
		{#each proofStats as stat, i (stat.id)}
			<div
				class="lg:px-6 {i % 2 === 1 ? 'border-l border-border' : ''} {i > 0
					? 'lg:border-l lg:border-border'
					: 'lg:border-l-0'}"
			>
				<ProofStat value={stat.value} label={$t(stat.labelKey)} />
			</div>
		{/each}
	</div>
</LandingSection>
