<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';

	const { t } = getTranslate();
</script>

<!-- Espace blanc en haut pour le header flottant, puis photo insetée et arrondie -->
<section class="bg-background px-3 pt-20 sm:px-4 sm:pt-20">
	<!-- Zone photo avec rounded + overflow-hidden qui coupe les mockups en bas -->
	<div
		class="relative overflow-hidden rounded-[1.5rem] bg-[oklch(0.14_0.01_262)] sm:rounded-[2rem]"
		style="min-height: 88vh;"
	>
		<!-- Photo de fond -->
		<img
			src="/screenshots/hero-bg.jpg"
			alt=""
			class="absolute inset-0 size-full object-cover"
			aria-hidden="true"
		/>
		<!-- Overlay sombre -->
		<div class="absolute inset-0 bg-[oklch(0_0_0/0.45)]"></div>

		<!-- Contenu texte + CTA — partie haute -->
		<div
			class="relative z-10 flex flex-col items-center px-6 pt-16 pb-10 text-center sm:px-10 sm:pt-24 sm:pb-12"
		>
			<h1
				class="text-[2.75rem] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-white sm:text-[3.75rem] xl:text-[4.5rem]"
				use:reveal
			>
				{$t('landing.hero.title')}
			</h1>

			<p
				class="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty text-white/70 sm:text-lg"
				use:reveal={{ delay: 60 }}
			>
				{$t('landing.hero.lede')}
			</p>

			<div
				class="mt-10 flex flex-wrap items-center justify-center gap-3"
				use:reveal={{ delay: 120 }}
			>
				<a
					href={resolve(localizedHref('/signup'))}
					class="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--brand)] px-7 text-sm font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
				>
					{$t('landing.hero.cta_primary')}
				</a>
				<a
					href={resolve(localizedHref('/pricing'))}
					class="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
				>
					{$t('landing.hero.cta_secondary')}
				</a>
			</div>
		</div>

		<!-- Mockups ancrés en bas — coupés par overflow-hidden du parent -->
		<div
			class="absolute right-0 bottom-0 left-0 z-10 flex items-end justify-center gap-3 px-8 sm:gap-5 sm:px-12 lg:px-20"
			use:reveal={{ delay: 180 }}
		>
			<!-- Mockup admin dashboard (plus large) -->
			<div
				class="w-[60%] max-w-[620px] overflow-hidden rounded-t-xl border border-white/10 shadow-2xl"
			>
				<img
					src="/screenshots/mockup-admin.png"
					alt=""
					class="max-h-[32vh] w-full object-cover object-top"
					aria-hidden="true"
				/>
			</div>
			<!-- Mockup mobile (plus étroit) — ancré en bas, sans remontée -->
			<div
				class="w-[26%] max-w-[240px] overflow-hidden rounded-t-xl border border-white/10 shadow-2xl"
			>
				<img
					src="/screenshots/mockup-mobile.png"
					alt=""
					class="max-h-[36vh] w-full object-cover object-top"
					aria-hidden="true"
				/>
			</div>
		</div>
	</div>
</section>
