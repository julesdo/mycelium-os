<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { getTranslate } from '@tolgee/svelte';
	import * as Accordion from '$lib/components/ui/accordion/index';
	import { reveal } from './reveal';
	import { faqs } from './landing-data';

	const { t } = getTranslate();
</script>

<section class="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
	<div class="grid gap-16 lg:grid-cols-[1fr_1.6fr]">
		<div use:reveal>
			<h2 class="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
				{$t('landing.faq.title')}
			</h2>
			<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
				{$t('landing.faq.contact_prefix')}
				<a
					href={resolve(localizedHref('/about'))}
					class="font-medium text-foreground underline underline-offset-4"
				>
					{$t('landing.faq.contact_link')}
				</a>
			</p>
		</div>

		<div use:reveal={{ delay: 60 }}>
			<Accordion.Root type="single">
				{#each faqs as faq (faq.id)}
					<Accordion.Item value={faq.id} class="border-b border-border">
						<Accordion.Trigger class="py-4 text-sm font-medium text-foreground">
							{$t(faq.qKey)}
						</Accordion.Trigger>
						<Accordion.Content class="pb-4 text-sm leading-relaxed text-muted-foreground">
							{$t(faq.aKey)}
						</Accordion.Content>
					</Accordion.Item>
				{/each}
			</Accordion.Root>
		</div>
	</div>
</section>
