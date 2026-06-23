<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';
	import StepCard from './step-card.svelte';
	import { steps } from './landing-data';

	const { t } = getTranslate();
</script>

<section class="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
	<div class="mb-16 max-w-2xl" use:reveal>
		<h2 class="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
			{$t('landing.steps.title')}
		</h2>
		<p class="mt-4 text-base leading-relaxed text-muted-foreground">
			{$t('landing.agents.lede')}
		</p>
	</div>

	<div class="grid gap-10 sm:grid-cols-3 sm:gap-12">
		{#each steps as step, i (step.n)}
			<div use:reveal={{ delay: i * 80 }}>
				<StepCard n={step.n} title={$t(step.titleKey)} desc={$t(step.descKey)} />
			</div>
		{/each}
	</div>
</section>
