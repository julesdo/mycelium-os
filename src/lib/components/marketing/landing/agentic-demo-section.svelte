<script lang="ts">
	import { onMount } from 'svelte';
	import { getTranslate } from '@tolgee/svelte';
	import { reveal } from './reveal';

	const { t } = getTranslate();

	type AgentId = 'concierge' | 'manager' | 'optimizer' | 'compliance' | 'negotiator' | 'coach';

	const AGENTS: { id: AgentId; name: string; role: string }[] = [
		{ id: 'concierge',  name: 'Concierge',          role: 'Réservations salarié' },
		{ id: 'manager',    name: 'Assistant Gestionnaire', role: 'Requêtes DAF / RH' },
		{ id: 'optimizer',  name: 'Optimiseur',          role: 'Insights hebdo flotte' },
		{ id: 'compliance', name: 'Compliance Officer',  role: 'Surveillance réglementaire' },
		{ id: 'negotiator', name: 'Négociateur',         role: 'Opportunités économies' },
		{ id: 'coach',      name: 'Coach conducteurs',   role: 'Éco-conduite & sécurité' },
	];

	type LogEvent = {
		id: number;
		agent: AgentId;
		time: string;
		action: string;
		detail: string;
	};

	const EVENT_POOL: Omit<LogEvent, 'id'>[] = [
		{ agent: 'concierge',  time: '14:23', action: 'Réservation créée',      detail: 'Marie D. → Peugeot 308 · Lyon · 8h00' },
		{ agent: 'optimizer',  time: '14:18', action: 'Économie identifiée',     detail: '3 véhicules <40% utilisation · 2 400 €/an' },
		{ agent: 'compliance', time: '14:15', action: 'Permis expirant',         detail: 'Thomas R. · 14 jours · Notification envoyée' },
		{ agent: 'manager',    time: '14:12', action: 'Rapport coûts généré',    detail: '"Coûts juillet ?" → 4 dépenses · 12 480 €' },
		{ agent: 'coach',      time: '14:08', action: 'Score amélioré',          detail: 'Jean-Paul M. · éco-conduite 7.4 → 8.1/10' },
		{ agent: 'compliance', time: '13:45', action: 'CT manquant détecté',     detail: 'Partner BC-789-EF · Alerte créée' },
		{ agent: 'concierge',  time: '13:31', action: 'Annulation traitée',      detail: 'Paul K. · Clio libérée · Créneau rouvert' },
		{ agent: 'negotiator', time: '13:18', action: 'Opportunité détectée',    detail: 'LLD Renault · -18% vs contrat actuel' },
		{ agent: 'optimizer',  time: '12:55', action: 'Rapport hebdo envoyé',    detail: '3 recommandations · économie 4 100 €/trim.' },
		{ agent: 'manager',    time: '12:40', action: 'Requête traitée',         detail: '"Taux utili. juin ?" → 82% · +12% vs mai' },
		{ agent: 'concierge',  time: '12:28', action: 'Conflit résolu',          detail: 'Double réservation · Citroën C4 proposée' },
		{ agent: 'coach',      time: '12:10', action: 'Alerte conduite',         detail: 'Pierre L. · 3 freinages brusques · Conseil envoyé' },
	];

	const AGENT_COLORS: Record<AgentId, string> = {
		concierge:  'oklch(0.92 0.23 103)',   // brand yellow
		manager:    'oklch(0.72 0.15 240)',   // blue
		optimizer:  'oklch(0.80 0.18 75)',    // amber
		compliance: 'oklch(0.72 0.19 30)',    // orange
		negotiator: 'oklch(0.72 0.18 290)',   // purple
		coach:      'oklch(0.72 0.19 150)',   // green
	};

	let events = $state<LogEvent[]>([]);
	let activeAgent = $state<AgentId | null>(null);
	let agentLastAction = $state<Record<AgentId, string>>({
		concierge: 'En attente', manager: 'En attente', optimizer: 'En attente',
		compliance: 'En attente', negotiator: 'En attente', coach: 'En attente',
	});

	let uid = 0;
	let poolIndex = 0;

	function addEvent() {
		const raw = EVENT_POOL[poolIndex % EVENT_POOL.length];
		poolIndex++;
		const evt: LogEvent = { ...raw, id: uid++ };
		events = [evt, ...events].slice(0, 5);
		activeAgent = evt.agent;
		agentLastAction = { ...agentLastAction, [evt.agent]: evt.action };
		// Clear active after 1.8s
		setTimeout(() => {
			if (activeAgent === evt.agent) activeAgent = null;
		}, 1800);
	}

	onMount(() => {
		// Seed 3 initial events immediately (staggered)
		setTimeout(() => addEvent(), 200);
		setTimeout(() => addEvent(), 700);
		setTimeout(() => addEvent(), 1200);

		const interval = setInterval(addEvent, 2800);
		return () => clearInterval(interval);
	});
</script>

<section class="relative bg-[oklch(0.10_0.01_262)] px-3 py-20 sm:px-4 sm:py-28">
	<!-- Subtle top/bottom fade into background -->
	<div class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent"></div>
	<div class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"></div>

	<div class="relative mx-auto max-w-6xl px-3 sm:px-6">

		<!-- Heading -->
		<div class="mb-12 max-w-2xl" use:reveal>
			<p class="mb-3 text-xs font-semibold tracking-[0.12em] uppercase text-[var(--brand)]">
				{$t('landing.agents_demo.label')}
			</p>
			<h2 class="text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
				{$t('landing.agents_demo.title')}
			</h2>
			<p class="mt-4 text-base leading-relaxed text-white/55">
				{$t('landing.agents_demo.lede')}
			</p>
		</div>

		<!-- Main panel -->
		<div
			class="overflow-hidden rounded-2xl border border-white/8 bg-[oklch(0.13_0.015_262)]"
			use:reveal={{ delay: 60 }}
		>
			<div class="grid lg:grid-cols-[280px_1fr]">

				<!-- Left: Agent roster -->
				<div class="border-b border-white/8 lg:border-b-0 lg:border-r">
					<!-- Header -->
					<div class="flex items-center gap-2 border-b border-white/8 px-4 py-3">
						<span class="relative flex size-1.5 shrink-0">
							<span class="absolute inline-flex size-full animate-ping rounded-full bg-[oklch(0.72_0.19_150)] opacity-60"></span>
							<span class="relative inline-flex size-1.5 rounded-full bg-[oklch(0.72_0.19_150)]"></span>
						</span>
						<span class="text-xs font-semibold text-white/50 uppercase tracking-wide">6 agents actifs</span>
					</div>

					<!-- Agent list -->
					<div class="divide-y divide-white/5">
						{#each AGENTS as ag (ag.id)}
							{@const isActive = activeAgent === ag.id}
							{@const color = AGENT_COLORS[ag.id]}
							<div class="flex items-center gap-3 px-4 py-3 transition-colors duration-300 {isActive ? 'bg-white/5' : ''}">
								<!-- Status dot -->
								<span class="relative flex size-2 shrink-0">
									{#if isActive}
										<span class="absolute inline-flex size-full animate-ping rounded-full opacity-60" style="background: {color};"></span>
									{/if}
									<span class="relative inline-flex size-2 rounded-full transition-colors duration-300" style="background: {isActive ? color : 'oklch(1 0 0 / 0.15)'};"></span>
								</span>

								<div class="min-w-0 flex-1">
									<p class="text-xs font-semibold text-white/80 truncate">{ag.name}</p>
									<p class="text-[10px] truncate transition-colors duration-300 {isActive ? 'text-white/60' : 'text-white/30'}">
										{isActive ? agentLastAction[ag.id] : ag.role}
									</p>
								</div>

								{#if isActive}
									<span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style="background: {color}30; color: {color};">
										RUN
									</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Right: Live event log -->
				<div>
					<!-- Header -->
					<div class="flex items-center justify-between border-b border-white/8 px-4 py-3">
						<span class="text-xs font-semibold text-white/50 uppercase tracking-wide">Journal d'activité</span>
						<span class="font-mono text-[10px] text-white/25">temps réel</span>
					</div>

					<!-- Events -->
					<div class="divide-y divide-white/5 overflow-hidden">
						{#if events.length === 0}
							<div class="flex items-center gap-3 px-4 py-6">
								<span class="size-1.5 rounded-full bg-white/20 animate-pulse"></span>
								<span class="text-xs text-white/30">Initialisation des agents…</span>
							</div>
						{/if}
						{#each events as evt (evt.id)}
							{@const color = AGENT_COLORS[evt.agent]}
							<div class="log-event flex items-start gap-3 px-4 py-3">
								<!-- Colored indicator -->
								<div class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md" style="background: {color}20;">
									<span class="size-1.5 rounded-full" style="background: {color};"></span>
								</div>

								<div class="min-w-0 flex-1">
									<div class="flex items-baseline gap-2">
										<span class="text-xs font-semibold" style="color: {color};">{AGENTS.find(a => a.id === evt.agent)?.name}</span>
										<span class="text-xs font-medium text-white/70">{evt.action}</span>
									</div>
									<p class="mt-0.5 truncate text-[11px] text-white/35">{evt.detail}</p>
								</div>

								<span class="shrink-0 font-mono text-[10px] text-white/25">{evt.time}</span>
							</div>
						{/each}

						<!-- Placeholder rows when fewer than 5 events -->
						{#each Array(Math.max(0, 5 - events.length)) as _, i (i)}
							<div class="flex items-center gap-3 px-4 py-3">
								<div class="size-5 shrink-0 rounded-md bg-white/5"></div>
								<div class="h-3 flex-1 rounded-sm bg-white/5" style="width: {60 + (i * 15)}%;"></div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.log-event {
		animation: logIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes logIn {
		from { opacity: 0; transform: translateY(-10px); }
		to   { opacity: 1; transform: translateY(0); }
	}
</style>
