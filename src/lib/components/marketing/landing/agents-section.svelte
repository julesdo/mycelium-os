<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';
	import AgentCard from './agent-card.svelte';
	import { agents } from './landing-data';

	const { t } = getTranslate();
</script>

<section id="agents" class="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
	<div class="mb-14 max-w-2xl" use:reveal>
		<h2 class="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
			{$t('landing.agents.title')}
		</h2>
		<p class="mt-4 text-base leading-relaxed text-muted-foreground">
			{$t('landing.agents.lede')}
		</p>
	</div>

	<div class="grid gap-px rounded-2xl border border-border overflow-hidden sm:grid-cols-2 lg:grid-cols-3">
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
