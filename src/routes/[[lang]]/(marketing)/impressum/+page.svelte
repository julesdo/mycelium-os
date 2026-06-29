<script lang="ts">
	import ObfuscatedEmail from '$lib/components/obfuscated-email.svelte';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { LEGAL_CONFIG } from '$lib/config/legal';
	import { getTranslate } from '@tolgee/svelte';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';

	const { t } = getTranslate();
</script>

<SEOHead title={$t('meta.impressum.title')} description={$t('meta.impressum.description')} />

<div lang="en" class="mx-auto max-w-3xl px-6 pt-40 pb-24 lg:px-12">
	<article
		class="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight"
	>
		<h1>Legal Notice — Mentions légales</h1>
		<p class="text-sm text-muted-foreground">
			In accordance with French Law n° 2004-575 of June 21, 2004 for confidence in the digital
			economy (<em>Loi pour la Confiance dans l'Économie Numérique</em>).
		</p>

		<hr />

		<h2>Publisher</h2>
		<p>
			<strong>{LEGAL_CONFIG.companyName}</strong><br />
			Société par actions simplifiée (SAS)<br />
			RCS {LEGAL_CONFIG.rcs} — SIREN {LEGAL_CONFIG.siren}<br />
			Siège social : {LEGAL_CONFIG.address}<br />
			TVA intracommunautaire : {LEGAL_CONFIG.vatNumber}
		</p>

		<h2>Director of Publication</h2>
		<p>The Chief Executive Officer of {LEGAL_CONFIG.companyName}.</p>

		<h2>Contact</h2>
		<p>
			Email: <ObfuscatedEmail
				user={LEGAL_CONFIG.email.user}
				domain={LEGAL_CONFIG.email.domain}
				tld={LEGAL_CONFIG.email.tld}
				class="underline underline-offset-4"
			/>
		</p>

		<h2>Hosting</h2>
		<p>
			The Service is hosted on <strong>Cloudflare Workers</strong> (Cloudflare, Inc., 101 Townsend
			St, San Francisco, CA 94107, USA) and <strong>Convex</strong> (Convex, Inc.) on AWS eu-west-1 (Ireland).
			Data is replicated across Cloudflare's European points of presence.
		</p>

		<h2>Intellectual Property</h2>
		<p>
			All content on this website — including text, graphics, logos, and software — is the exclusive
			property of {LEGAL_CONFIG.companyName} or its licensors, protected under French and international
			intellectual property law. Reproduction or use of any content without prior written authorisation
			is prohibited.
		</p>

		<h2>Personal Data</h2>
		<p>
			For information about how we process personal data, please refer to our <a
				href={resolve(localizedHref('/privacy'))}>Privacy Policy</a
			>. To exercise your rights under the GDPR or French data protection law, contact us at: <ObfuscatedEmail
				user={LEGAL_CONFIG.dpo.user}
				domain={LEGAL_CONFIG.dpo.domain}
				tld={LEGAL_CONFIG.dpo.tld}
				class="underline underline-offset-4"
			/>
		</p>

		<h2>Applicable Law</h2>
		<p>
			This Legal Notice is governed by French law. Any disputes shall be subject to the jurisdiction
			of the competent French courts.
		</p>
	</article>
</div>
