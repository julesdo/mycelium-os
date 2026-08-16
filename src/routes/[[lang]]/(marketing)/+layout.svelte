<script lang="ts">
	import PostHogIdentify from '$lib/components/analytics/PostHogIdentify.svelte';
	import MarketingFooter from '$lib/components/marketing/marketing-footer.svelte';
	import MarketingHeader from '$lib/components/marketing/marketing-header.svelte';
	import CookieBanner from '$lib/components/marketing/cookie-banner.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	let cookieBanner: CookieBanner | undefined = $state();
</script>

<PostHogIdentify />
<MarketingHeader />
<div class="flex min-h-svh flex-col bg-background">
	<main id="main-content" class="flex-1">
		{@render children?.()}
	</main>
	<MarketingFooter onOpenCookieSettings={() => cookieBanner?.openCookieSettings()} />
</div>
<CookieBanner bind:this={cookieBanner} />
