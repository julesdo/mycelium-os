<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';
	import FeatureShowcase from './feature-showcase.svelte';
	import MockupFleetTable from './mockup-fleet-table.svelte';
	import MockupDashboard from './mockup-dashboard.svelte';
	import MockupCompliance from './mockup-compliance.svelte';
	import MockupConciergeAnimated from './mockup-concierge-animated.svelte';
	import { featureShowcases } from './landing-data';

	const { t } = getTranslate();
</script>

<section id="features" class="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
	<!-- Heading -->
	<div class="mb-16 max-w-2xl" use:reveal>
		<h2 class="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
			{$t('landing.features.title')}
		</h2>
		<p class="mt-4 text-base leading-relaxed text-muted-foreground">
			{$t('landing.features.lede')}
		</p>
	</div>

	<!-- Showcases -->
	<div class="space-y-20 sm:space-y-28">
		{#each featureShowcases as s (s.id)}
			<FeatureShowcase
				title={$t(s.titleKey)}
				desc={$t(s.descKey)}
				bullets={s.bulletKeys.map((k) => $t(k))}
				reverse={s.reverse}
			>
				{#snippet mockup()}
					{#if s.mockup === 'fleet'}
						<MockupFleetTable />
					{:else if s.mockup === 'dashboard'}
						<MockupDashboard />
					{:else if s.mockup === 'concierge'}
						<MockupConciergeAnimated />
					{:else}
						<MockupCompliance />
					{/if}
				{/snippet}
			</FeatureShowcase>
		{/each}
	</div>
</section>
