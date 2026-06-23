<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';
	import ModuleCard from './module-card.svelte';
	import { modules } from './landing-data';

	const { t } = getTranslate();
</script>

<section class="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
	<div class="mb-14 max-w-2xl" use:reveal>
		<h2 class="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
			{$t('landing.modules.title')}
		</h2>
		<p class="mt-4 text-base leading-relaxed text-muted-foreground">
			{$t('landing.modules.lede')}
		</p>
	</div>

	<!-- Grille avec séparateurs internes -->
	<div class="overflow-hidden rounded-2xl border border-border" use:reveal={{ delay: 60 }}>
		<div class="grid sm:grid-cols-2 lg:grid-cols-3 divide-y divide-border [&>*:nth-child(n+2)]:sm:border-l [&>*:nth-child(3n+1)]:sm:border-l-0 lg:[&>*:nth-child(3n+4)]:border-t lg:[&>*:nth-child(-n+3)]:border-t-0">
			{#each modules as module, i (module.id)}
				<div use:reveal={{ delay: (i % 3) * 40 }}>
					<ModuleCard icon={module.icon} title={$t(module.titleKey)} desc={$t(module.descKey)} />
				</div>
			{/each}
		</div>
	</div>
</section>
