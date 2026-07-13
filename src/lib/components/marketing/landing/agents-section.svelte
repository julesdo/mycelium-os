<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';
	import AgentCard from './agent-card.svelte';
	import { agents } from './landing-data';
	import UserRound from '@lucide/svelte/icons/user-round';

	const { t } = getTranslate();
</script>

<section id="agents" class="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
	<div class="mb-14 max-w-2xl" use:reveal>
		<p class="mb-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
			{$t('landing.agents.eyebrow')}
		</p>
		<h2 class="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
			{$t('landing.agents.title')}
		</h2>
		<p class="mt-4 text-base leading-relaxed text-muted-foreground">
			{$t('landing.agents.lede')}
		</p>
	</div>

	<!-- Human concierge highlight -->
	<div
		class="mb-10 flex items-start gap-5 rounded-2xl border p-6 sm:p-7"
		style="border-color: color-mix(in oklch, var(--brand) 30%, transparent); background: color-mix(in oklch, var(--brand) 6%, transparent);"
		use:reveal
	>
		<div
			class="flex size-12 flex-shrink-0 items-center justify-center rounded-xl"
			style="background: color-mix(in oklch, var(--brand) 14%, transparent);"
		>
			<UserRound class="size-5" style="color: var(--brand);" />
		</div>
		<div>
			<p class="mb-1 text-xs font-semibold tracking-[0.1em] uppercase" style="color: var(--brand);">
				{$t('landing.agents.human_badge')}
			</p>
			<h3 class="text-base font-bold text-foreground">
				{$t('landing.agents.human_title')}
			</h3>
			<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">
				{$t('landing.agents.human_desc')}
			</p>
		</div>
	</div>

	<!-- AI agents label -->
	<p
		class="mb-6 text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase"
		use:reveal
	>
		{$t('landing.agents.ai_label')}
	</p>

	<div class="grid gap-px overflow-hidden rounded-2xl border border-border sm:grid-cols-2 lg:grid-cols-3">
		{#each agents as agent, i (agent.id)}
			<div use:reveal={{ delay: i * 40 }}>
				<AgentCard
					agentId={agent.id}
					name={$t(agent.nameKey)}
					role={$t(agent.roleKey)}
					desc={$t(agent.descKey)}
				/>
			</div>
		{/each}
	</div>
</section>
