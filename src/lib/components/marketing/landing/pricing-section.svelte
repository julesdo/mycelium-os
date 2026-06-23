<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';
	import PricingCard from './pricing-card.svelte';
	import { pricingTiers } from './landing-data';

	const { t } = getTranslate();

	const signupHref = resolve(localizedHref('/signup'));
	const aboutHref = resolve(localizedHref('/about'));
</script>

<section id="pricing" class="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
	<div class="mb-14 max-w-2xl" use:reveal>
		<h2 class="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
			{$t('landing.pricing.title')}
		</h2>
		<p class="mt-4 text-base leading-relaxed text-muted-foreground">
			{$t('landing.pricing.lede')}
		</p>
	</div>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		{#each pricingTiers as plan, i (plan.id)}
			<div use:reveal={{ delay: i * 50 }}>
				<PricingCard
					tier={plan.tier}
					price={plan.price}
					perMonth={$t('landing.pricing.per_month')}
					sub={$t(plan.subKey)}
					agents={$t(plan.agentsKey)}
					features={plan.featureKeys.map((k) => $t(k))}
					cta={$t(plan.ctaKey)}
					href={plan.id === 'scale' ? aboutHref : signupHref}
					featured={plan.featured}
				/>
			</div>
		{/each}
	</div>

	<p class="mt-8 text-xs text-muted-foreground/50">
		{$t('landing.pricing.footnote')}
	</p>
</section>
