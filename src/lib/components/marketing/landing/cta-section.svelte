<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';

	const { t } = getTranslate();
</script>

<section class="mx-auto max-w-6xl px-6 pb-24 sm:px-10 sm:pb-32">
	<div class="h-px w-full bg-border" use:reveal></div>

	<div class="py-20 text-center sm:py-28" use:reveal={{ delay: 40 }}>
		<h2 class="mx-auto max-w-2xl text-3xl font-bold tracking-[-0.02em] text-balance text-foreground sm:text-4xl lg:text-[3rem]">
			{$t('landing.cta.title')}
		</h2>
		<p class="mx-auto mt-5 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground">
			{$t('landing.cta.lede')}
		</p>

		<div class="mt-10 flex flex-wrap items-center justify-center gap-3">
			<a
				href={resolve(localizedHref('/signup'))}
				class="inline-flex h-12 items-center rounded-full bg-[var(--brand)] px-8 text-sm font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
			>
				{$t('landing.cta.primary')}
			</a>
			<a
				href={resolve(localizedHref('/about'))}
				class="inline-flex h-12 items-center rounded-full border border-border px-8 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
			>
				{$t('landing.cta.secondary')}
			</a>
		</div>
	</div>
</section>
