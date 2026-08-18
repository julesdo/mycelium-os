<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { HeroSection, FaqSection, CtaSection } from '$lib/components/marketing/landing';
	import { proofStats } from '$lib/components/marketing/landing/landing-data';
	import { reveal } from '$lib/components/marketing/landing/reveal';

	const { t } = getTranslate();
</script>

<SEOHead title={$t('landing.meta.title')} description={$t('landing.meta.description')} />

<div class="min-h-screen">
	<HeroSection />

	<section class="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-20">
		<div class="grid gap-4 sm:grid-cols-3">
			{#each proofStats as stat, i (stat.id)}
				<div use:reveal={{ delay: i * 50 }}>
					<div
						class="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-6
						       shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
					>
						<div
							class="pointer-events-none absolute inset-x-0 top-0 h-px
							       bg-gradient-to-r from-transparent via-white/20 to-transparent"
						></div>
						<p class="text-3xl font-semibold tracking-tight">{stat.value}</p>
						<p class="text-muted-foreground mt-2 text-sm">{$t(stat.labelKey)}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<FaqSection />
	<CtaSection />

	<div class="h-3"></div>
</div>
