<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';
	import CircleCheck from '@lucide/svelte/icons/circle-check';

	const { t } = getTranslate();

	const trustItems = ['landing.human.t1', 'landing.human.t2', 'landing.human.t3'] as const;
</script>

<section class="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
	<div class="grid items-center gap-12 lg:grid-cols-[55fr_45fr] lg:gap-20">

		<!-- Image -->
		<div class="relative" use:reveal>
			<div
				class="relative overflow-hidden rounded-2xl border border-border"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.07), 0 28px 72px oklch(0 0 0 / 0.07);"
			>
				<div class="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
				<img
					src="/screenshots/concierge-team.jpg"
					alt={$t('landing.human.img_alt')}
					class="aspect-[4/5] w-full object-cover object-top"
					loading="lazy"
				/>
				<div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/25 to-transparent"></div>
			</div>
		</div>

		<!-- Texte -->
		<div use:reveal={{ delay: 80 }}>
			<!-- Eyebrow -->
			<div
				class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
			>
				<span
					class="size-2 rounded-full bg-emerald-500"
					style="box-shadow: 0 0 6px oklch(0.73 0.19 160 / 0.7);"
				></span>
				<span class="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
					{$t('landing.human.eyebrow')}
				</span>
			</div>

			<!-- Titre -->
			<h2 class="text-balance text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
				{$t('landing.human.title')}
			</h2>

			<!-- Corps -->
			<p class="mt-5 text-[0.9375rem] leading-relaxed text-muted-foreground">
				{$t('landing.human.desc')}
			</p>

			<!-- Points de confiance -->
			<ul class="mt-9 space-y-4">
				{#each trustItems as key (key)}
					<li class="flex items-start gap-3">
						<CircleCheck class="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
						<span class="text-sm leading-snug text-foreground/80">{$t(key)}</span>
					</li>
				{/each}
			</ul>
		</div>

	</div>
</section>
