<script lang="ts">
	import SvelteMarkdown from '@humanspeak/svelte-markdown';
	import ObfuscatedEmail from '$lib/components/obfuscated-email.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { getTranslate } from '@tolgee/svelte';
	import { termsMarkdown } from '$lib/content/terms';
	import { LEGAL_CONFIG } from '$lib/config/legal';

	const { t } = getTranslate();
</script>

<SEOHead title={$t('meta.terms.title')} description={$t('meta.terms.description')} />

<!-- Legal text is intentionally English-only — the English version is the governing version. -->
<div lang="en" class="mx-auto max-w-3xl px-6 pt-40 pb-24 lg:px-12">
	<article
		class="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[var(--brand)] prose-a:no-underline hover:prose-a:underline prose-table:text-xs prose-th:font-medium prose-td:align-top"
	>
		<SvelteMarkdown source={termsMarkdown} />
		<p>
			<ObfuscatedEmail
				user={LEGAL_CONFIG.email.user}
				domain={LEGAL_CONFIG.email.domain}
				tld={LEGAL_CONFIG.email.tld}
				class="underline underline-offset-4"
			/>
		</p>
	</article>
</div>
