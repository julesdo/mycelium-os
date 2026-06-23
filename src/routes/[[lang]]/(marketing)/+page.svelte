<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import {
		HeroSection,
		FeaturesSection,
		AgentsSection,
		HowItWorksSection,
		AgenticDemoSection,
		ModulesSection,
		PricingSection,
		FaqSection,
		CtaSection
	} from '$lib/components/marketing/landing';

	const { t } = getTranslate();
</script>

<SEOHead title={$t('landing.meta.title')} description={$t('landing.meta.description')} />

<div class="min-h-screen">
	<HeroSection />
	<FeaturesSection />
	<AgentsSection />
	<HowItWorksSection />
	<AgenticDemoSection />
	<ModulesSection />
	<PricingSection />
	<FaqSection />
	<CtaSection />

	<div class="h-3"></div>
</div>
