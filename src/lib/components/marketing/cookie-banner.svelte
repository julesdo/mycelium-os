<script lang="ts">
	import { browser } from '$app/environment';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import { getPosthog, initPosthog } from '$lib/analytics/posthog';
	import { getTranslate } from '@tolgee/svelte';

	const { t } = getTranslate();

	const CONSENT_KEY = 'mycelium_cookie_consent';
	type Consent = 'accepted' | 'declined';

	let visible = $state(false);

	$effect(() => {
		if (!browser) return;
		const stored = localStorage.getItem(CONSENT_KEY) as Consent | null;
		if (!stored) {
			// Small delay to avoid banner flash on page load
			const t = setTimeout(() => (visible = true), 800);
			return () => clearTimeout(t);
		}
		// If previously accepted, make sure PostHog is running
		if (stored === 'accepted') {
			initPosthog();
		}
	});

	async function accept() {
		if (!browser) return;
		localStorage.setItem(CONSENT_KEY, 'accepted');
		visible = false;
		// Initialise PostHog now that consent is given
		await initPosthog();
	}

	function decline() {
		if (!browser) return;
		localStorage.setItem(CONSENT_KEY, 'declined');
		visible = false;
		// Opt out any already-running PostHog instance
		getPosthog()?.opt_out_capturing();
	}

	export function openCookieSettings() {
		if (browser) {
			localStorage.removeItem(CONSENT_KEY);
			visible = true;
		}
	}
</script>

{#if visible}
	<div
		role="dialog"
		aria-label={$t('aria.cookie_consent')}
		aria-modal="false"
		class="fixed right-4 bottom-4 z-50 w-[min(380px,calc(100vw-2rem))] animate-in duration-300 fade-in slide-in-from-bottom-4"
	>
		<div
			class="rounded-2xl border border-border bg-card/95 p-5 shadow-xl backdrop-blur-md"
			style="box-shadow: 0 8px 32px oklch(0 0 0 / 0.18), inset 0 1px 0 oklch(1 0 0 / 0.08);"
		>
			<!-- Icon + title -->
			<div class="mb-3 flex items-center gap-2.5">
				<div
					class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/12"
				>
					<svg
						viewBox="0 0 16 16"
						fill="none"
						class="size-3.5 text-[var(--brand)]"
						aria-hidden="true"
					>
						<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
						<circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
						<circle cx="10" cy="5" r="0.75" fill="currentColor" />
						<circle cx="10.5" cy="10" r="1.25" fill="currentColor" />
						<circle cx="6" cy="11" r="0.75" fill="currentColor" />
					</svg>
				</div>
				<p class="text-sm font-semibold tracking-tight">Cookies & analytics</p>
			</div>

			<!-- Description -->
			<p class="mb-4 text-xs leading-relaxed text-muted-foreground">
				We use analytics cookies (PostHog) to understand how the product is used and improve it.
				Essential cookies required for authentication are always active.
				<a
					href={resolve(localizedHref('/privacy'))}
					class="text-foreground/70 underline underline-offset-2 hover:text-foreground"
				>
					Privacy policy
				</a>
			</p>

			<!-- Actions -->
			<div class="flex gap-2">
				<button
					type="button"
					onclick={decline}
					class="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
				>
					Essentials only
				</button>
				<button
					type="button"
					onclick={accept}
					class="flex-1 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.25);"
				>
					Accept all
				</button>
			</div>
		</div>
	</div>
{/if}
