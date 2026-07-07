<script lang="ts">
	import { copilot, AGENT_CONFIGS, type AgentType } from './copilot-store.svelte.js';
	import { tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut, quintOut } from 'svelte/easing';
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { toast } from 'svelte-sonner';
	import XIcon from '@lucide/svelte/icons/x';
	import SendIcon from '@lucide/svelte/icons/send';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import BarChart2Icon from '@lucide/svelte/icons/bar-chart-2';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import UserHeartIcon from '@lucide/svelte/icons/heart-handshake';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import XSmallIcon from '@lucide/svelte/icons/x';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import CopilotMessage from './copilot-message.svelte';
	import type { CopilotWidget } from './widgets/types.js';

	type LocalMessage = {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isStreaming: boolean;
		toolCall: string | null;
		widget?: CopilotWidget;
		source?: 'ai' | 'human';
		humanName?: string;
		humanAvatarUrl?: string | null;
	};

	// ── Concierge humain disponible ───────────────────────────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const conciergeQ = useQuery((api as any)['concierge/staff'].getAvailableConciergeForOrg, {});
	const concierge = $derived(conciergeQ.data ?? null);

	// ── Demande humain active (polling Convex réactif) ────────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const activeRequestQ = useQuery((api as any)['concierge/humanAssist'].getMyActiveRequest, {});
	const activeRequest = $derived(activeRequestQ.data ?? null);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const createRequest = useMutation((api as any)['concierge/humanAssist'].createRequest);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const sendClientMessage = useMutation((api as any)['concierge/humanAssist'].sendClientMessage);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const closeMyRequest = useMutation((api as any)['concierge/humanAssist'].closeMyRequest);

	// ── Mode humain ───────────────────────────────────────────────────────────
	let humanMode = $state(false);
	let humanInputValue = $state('');
	let humanSending = $state(false);
	let requestingHuman = $state(false);
	let humanMessagesEndEl: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (activeRequest && !humanMode) humanMode = true;
	});

	$effect(() => {
		if (humanMode && activeRequest?.messages.length) {
			tick().then(() => humanMessagesEndEl?.scrollIntoView({ behavior: 'smooth' }));
		}
	});

	async function requestHuman() {
		if (requestingHuman) return;
		requestingHuman = true;
		try {
			const context = messages
				.filter((m) => m.content && !m.isStreaming)
				.slice(-4)
				.map((m) => `${m.role === 'user' ? 'Client' : 'IA'}: ${m.content.slice(0, 200)}`)
				.join('\n');
			await createRequest({ summary: context || undefined });
			humanMode = true;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		} finally {
			requestingHuman = false;
		}
	}

	async function sendHumanMessage() {
		const trimmed = humanInputValue.trim();
		if (!trimmed || humanSending || !activeRequest) return;
		humanSending = true;
		humanInputValue = '';
		try {
			await sendClientMessage({ requestId: activeRequest.request._id, content: trimmed });
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		} finally {
			humanSending = false;
			await tick();
			document.getElementById('human-input')?.focus();
		}
	}

	async function closeHumanChat() {
		if (!activeRequest) return;
		try {
			await closeMyRequest({ requestId: activeRequest.request._id });
			humanMode = false;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		}
	}

	// ── Config affichage ──────────────────────────────────────────────────────
	const SPECIALTY_LABELS: Record<string, string> = {
		fleet_ops: 'Opérations flotte',
		compliance: 'Conformité & réglementation',
		finance: 'Finance & coûts',
		generalist: 'Accompagnement flotte'
	};

	const STATUS_CONFIG = {
		online:  { dot: 'bg-emerald-500', label: 'En ligne'  },
		busy:    { dot: 'bg-amber-400',   label: 'Occupé'    },
		offline: { dot: 'bg-muted-foreground/30', label: 'Hors ligne' }
	};

	const AGENT_ICONS = {
		concierge:  CalendarIcon,
		manager:    BarChart2Icon,
		compliance: ShieldCheckIcon
	};

	// ── Messages IA locaux ────────────────────────────────────────────────────
	let messages = $state<LocalMessage[]>([]);
	let conversationId = $state<string | null>(null);
	let isStreaming = $state(false);
	let inputValue = $state('');
	let messagesEndEl: HTMLDivElement | undefined = $state();
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	// ── Quick prompts éditables ───────────────────────────────────────────────
	let editingPrompts = $state(false);
	let draftPrompts = $state<string[]>([]);

	function startEditPrompts() {
		draftPrompts = [...copilot.quickPrompts];
		editingPrompts = true;
	}

	function savePrompts() {
		const cleaned = draftPrompts.map((p) => p.trim()).filter(Boolean).slice(0, 5);
		copilot.setCustomPrompts(copilot.activeAgent, cleaned);
		editingPrompts = false;
	}

	const endpoint = $derived(AGENT_CONFIGS[copilot.activeAgent].endpoint);

	$effect(() => {
		if (copilot.isOpen && !humanMode) {
			tick().then(() => textareaEl?.focus());
		}
	});

	$effect(() => {
		if (copilot.activeAgent) {
			messages = [];
			conversationId = null;
			editingPrompts = false;
		}
	});

	function scrollToBottom() {
		tick().then(() => messagesEndEl?.scrollIntoView({ behavior: 'smooth' }));
	}

	function updateLast(patch: Partial<LocalMessage>) {
		messages = messages.map((m, i) => (i === messages.length - 1 ? { ...m, ...patch } : m));
	}

	async function send(text: string) {
		const trimmed = text.trim();
		if (!trimmed || isStreaming) return;
		inputValue = '';
		isStreaming = true;
		editingPrompts = false;

		messages = [
			...messages,
			{ id: crypto.randomUUID(), role: 'user', content: trimmed, isStreaming: false, toolCall: null, source: 'ai' },
			{ id: crypto.randomUUID(), role: 'assistant', content: '', isStreaming: true, toolCall: null, source: 'ai' }
		];
		scrollToBottom();

		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: trimmed, conversationId: conversationId ?? undefined })
			});

			if (!res.ok || !res.body) {
				updateLast({ content: await res.text().catch(() => `Erreur ${res.status}`), isStreaming: false });
				return;
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const json = line.slice(6).trim();
					if (!json) continue;
					let event: Record<string, unknown>;
					try { event = JSON.parse(json) as Record<string, unknown>; } catch { continue; }

					if (event.type === 'text') {
						messages = messages.map((m, i) =>
							i === messages.length - 1
								? { ...m, content: m.content + (event.text as string), toolCall: null }
								: m
						);
						scrollToBottom();
					} else if (event.type === 'tool_call') {
						updateLast({ toolCall: event.name as string });
					} else if (event.type === 'widget') {
						const { type: _t, ...widgetData } = event;
						updateLast({ widget: widgetData as CopilotWidget, toolCall: null });
						scrollToBottom();
					} else if (event.type === 'done') {
						conversationId = (event.conversationId as string) ?? null;
						updateLast({ isStreaming: false, toolCall: null });
					} else if (event.type === 'error') {
						const existing = messages[messages.length - 1]?.content ?? '';
						updateLast({
							content: existing ? `${existing}\n\n⚠ ${event.message as string}` : `⚠ ${event.message as string}`,
							isStreaming: false,
							toolCall: null
						});
					}
				}
			}
		} catch (e) {
			updateLast({ content: e instanceof Error ? `Erreur réseau : ${e.message}` : 'Erreur réseau', isStreaming: false, toolCall: null });
		} finally {
			isStreaming = false;
			await tick();
			textareaEl?.focus();
		}
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inputValue); }
	}

	function handleHumanKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendHumanMessage(); }
	}

	function reset() {
		messages = [];
		conversationId = null;
		inputValue = '';
		editingPrompts = false;
	}

	function handleVehicleSelect() {
		const lastWidget = messages.findLast((m) => m.widget?.widget === 'vehicle_proposal');
		const w = lastWidget?.widget as { widget: 'vehicle_proposal'; vehicle: { brand: string; model: string; registration: string } } | undefined;
		if (w) send(`Oui, réservez le ${w.vehicle.brand} ${w.vehicle.model} (${w.vehicle.registration}).`);
	}

	function handleVehicleAlt() { send("Montrez-moi l'option suivante."); }

	function getInitials(name: string): string {
		return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	}

	const showHumanButton = $derived(
		!humanMode &&
		messages.filter((m) => m.role === 'assistant' && m.content && !m.isStreaming).length >= 1
	);
</script>

<!-- ── Backdrop (mobile) ───────────────────────────────────────────────────── -->
<div
	class="copilot-backdrop"
	class:copilot-backdrop--open={copilot.isOpen}
	onclick={() => copilot.close()}
	role="presentation"
	aria-hidden="true"
></div>

<!-- ── Panel ──────────────────────────────────────────────────────────────── -->
<aside
	class="copilot-panel"
	class:copilot-panel--open={copilot.isOpen}
	aria-hidden={!copilot.isOpen}
	inert={!copilot.isOpen ? true : undefined}
>
	<!-- ── Header ─────────────────────────────────────────────────────────── -->
	<header class="copilot-header shrink-0">
		<!-- Top inset glow (glass-metal) -->
		<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/15"></div>

		<div class="flex items-center justify-between gap-2 px-4 py-3">
			<div class="flex items-center gap-2.5">
				<!-- Brand avatar -->
				<div class="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] shadow-sm"
					style="box-shadow: 0 0 0 1px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.4)">
					<span class="text-[12px] font-black tracking-tight text-black">M</span>
					{#if concierge?.availabilityStatus === 'online'}
						<span class="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm"></span>
					{/if}
				</div>

				{#if humanMode}
					<div in:fly={{ x: -6, duration: 200, easing: cubicOut }}>
						<p class="text-[13px] font-semibold leading-none">Concierge Mycelium</p>
						<p class="mt-0.5 text-[10px] text-muted-foreground">Conversation humaine</p>
					</div>
				{:else}
					<div in:fly={{ x: -6, duration: 200, easing: cubicOut }}>
						<p class="text-[13px] font-semibold leading-none">Mycelium Assist</p>
						<p class="mt-0.5 text-[10px] text-muted-foreground">IA + Concierge humain</p>
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-1">
				{#if humanMode && activeRequest?.request.status !== 'closed'}
					<button
						class="h-7 rounded-lg px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
						onclick={closeHumanChat}
					>Terminer</button>
				{/if}
				{#if !humanMode && messages.length > 0}
					<button
						class="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
						onclick={reset}
						title="Nouvelle conversation"
					>
						<RotateCcwIcon class="size-3.5" />
					</button>
				{/if}
				<button
					class="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90"
					onclick={() => copilot.close()}
					aria-label="Fermer"
				>
					<XIcon class="size-4" />
				</button>
			</div>
		</div>

		<!-- Agent tabs (masqués en mode humain) -->
		{#if !humanMode}
			<div class="copilot-tabs px-3 pb-2.5" role="tablist" aria-label="Agents">
				{#each Object.values(AGENT_CONFIGS) as cfg (cfg.id)}
					{@const Icon = AGENT_ICONS[cfg.id]}
					{@const isActive = copilot.activeAgent === cfg.id}
					<button
						type="button"
						role="tab"
						onclick={() => copilot.open(cfg.id)}
						class="copilot-tab"
						class:copilot-tab--active={isActive}
						aria-selected={isActive}
					>
						<Icon class="size-3.5 shrink-0" />
						<span class="truncate">{cfg.label}</span>
					</button>
				{/each}
			</div>
		{/if}
	</header>

	<!-- ── Carte concierge ──────────────────────────────────────────────── -->
	{#if !conciergeQ.isLoading && concierge}
		{@const statusCfg = STATUS_CONFIG[concierge.availabilityStatus ?? 'offline']}
		<div
			class="concierge-card shrink-0"
			in:fly={{ y: -6, duration: 280, delay: 80, easing: quintOut }}
		>
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"></div>
			<div class="flex items-center gap-3 px-4 py-3">
				<div class="relative shrink-0">
					<div class="size-9 overflow-hidden rounded-full ring-2 ring-border ring-offset-1 ring-offset-background">
						{#if concierge.avatarUrl}
							<img src={concierge.avatarUrl} alt={concierge.name} class="h-full w-full object-cover" />
						{:else}
							<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-[11px] font-bold text-white">
								{getInitials(concierge.name)}
							</div>
						{/if}
					</div>
					<span class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background {statusCfg.dot}"></span>
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-1.5">
						<p class="text-[13px] font-semibold">{concierge.name}</p>
						<span class="text-[10px] text-muted-foreground">{statusCfg.label}</span>
					</div>
					<p class="truncate text-[11px] text-muted-foreground">
						{concierge.bio ?? SPECIALTY_LABELS[concierge.specialty ?? 'generalist']}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- ════════════════════════════════════════════════════════════════════ -->
	<!-- MODE IA ──────────────────────────────────────────────────────────── -->
	<!-- ════════════════════════════════════════════════════════════════════ -->
	{#if !humanMode}
		<div class="copilot-messages-area flex-1">
			<!-- Messages ou empty state -->
			{#if messages.length === 0}
				{#key copilot.activeAgent}
					<div
						class="flex flex-col gap-3 p-4"
						in:fade={{ duration: 180 }}
					>
						<!-- Description agent -->
						<div class="flex items-center gap-2 py-2">
							<div class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/10">
								<SparklesIcon class="size-3.5 text-[var(--brand-foreground)] dark:text-[var(--brand)]" />
							</div>
							<p class="text-[12px] text-muted-foreground">
								{AGENT_CONFIGS[copilot.activeAgent].description}
							</p>
						</div>

						<!-- Quick prompts -->
						<div class="group/prompts relative flex flex-col gap-1.5">
							{#if !editingPrompts}
								{#each copilot.quickPrompts as prompt, i (prompt)}
									<button
										class="quick-prompt-btn"
										in:fly={{ y: 8, x: -4, duration: 220, delay: 60 + i * 55, easing: quintOut }}
										onclick={() => send(prompt)}
										disabled={isStreaming}
									>
										<span class="min-w-0 truncate text-left">{prompt}</span>
										<span class="prompt-arrow shrink-0">→</span>
									</button>
								{/each}
								<button
									class="mt-1 flex items-center gap-1 self-end text-[10px] text-muted-foreground/30 opacity-0 transition-opacity group-hover/prompts:opacity-100 hover:text-muted-foreground"
									onclick={startEditPrompts}
								>
									<PencilIcon class="size-2.5" />
									Personnaliser
								</button>
							{:else}
								<div class="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-3" in:fly={{ y: 4, duration: 180 }}>
									<p class="text-[11px] font-medium text-muted-foreground">Modifiez vos raccourcis :</p>
									{#each draftPrompts as _, i (i)}
										<div class="flex items-center gap-1.5">
											<input
												type="text"
												bind:value={draftPrompts[i]}
												class="flex-1 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[12px] transition-shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
												placeholder="Raccourci…"
											/>
											<button onclick={() => { draftPrompts = draftPrompts.filter((_, j) => j !== i); }} class="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:scale-90">
												<XSmallIcon class="size-3.5" />
											</button>
										</div>
									{/each}
									{#if draftPrompts.length < 5}
										<button onclick={() => { draftPrompts = [...draftPrompts, '']; }} class="mt-0.5 self-start text-[11px] text-[var(--brand-foreground)] dark:text-[var(--brand)] hover:underline">
											+ Ajouter
										</button>
									{/if}
									<div class="mt-2 flex justify-end gap-2">
										<button onclick={() => (editingPrompts = false)} class="rounded-lg px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted">Annuler</button>
										<button onclick={savePrompts} class="flex items-center gap-1 rounded-lg bg-[var(--brand)] px-2.5 py-1 text-[11px] font-semibold text-black">
											<CheckIcon class="size-3" />
											Enregistrer
										</button>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/key}
			{:else}
				<div class="flex flex-col gap-3 p-4">
					{#each messages as msg (msg.id)}
						<div in:fly={{ y: 10, duration: 240, easing: quintOut }}>
							<CopilotMessage
								role={msg.role}
								content={msg.content}
								isStreaming={msg.isStreaming}
								toolCall={msg.toolCall}
								widget={msg.widget}
								source={msg.source}
								humanName={msg.humanName}
								humanAvatarUrl={msg.humanAvatarUrl}
								onVehicleSelect={handleVehicleSelect}
								onVehicleAlt={handleVehicleAlt}
							/>
						</div>
					{/each}
					<div bind:this={messagesEndEl}></div>
				</div>
			{/if}
		</div>

		<!-- Bouton "Parler à un humain" -->
		{#if showHumanButton}
			<div
				class="shrink-0 px-4 pb-2"
				in:fly={{ y: 8, duration: 260, easing: quintOut }}
			>
				<button
					type="button"
					onclick={requestHuman}
					disabled={requestingHuman}
					class="human-cta-btn group w-full"
				>
					<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10 rounded-t-xl"></div>
					<div class="flex items-center gap-3">
						{#if requestingHuman}
							<div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/50">
								<LoaderCircleIcon class="size-4 text-violet-600 dark:text-violet-400 motion-safe:animate-spin" />
							</div>
						{:else}
							<div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/50 transition-transform group-hover:scale-110">
								<UserHeartIcon class="size-4 text-violet-600 dark:text-violet-400" />
							</div>
						{/if}
						<div class="min-w-0 flex-1 text-left">
							<p class="text-[13px] font-semibold">Parler à un concierge</p>
							<p class="text-[11px] text-muted-foreground">
								{concierge?.availabilityStatus === 'online'
									? `${concierge.name} est disponible`
									: 'Un humain prend le relais'}
							</p>
						</div>
						<span class="shrink-0 text-[11px] text-muted-foreground/40 transition-transform group-hover:translate-x-0.5">→</span>
					</div>
				</button>
			</div>
		{/if}

		<!-- Input IA -->
		<div class="copilot-input-area shrink-0">
			<div class="copilot-input-wrap">
				<textarea
					id="copilot-input"
					bind:this={textareaEl}
					bind:value={inputValue}
					onkeydown={handleInputKeydown}
					placeholder={AGENT_CONFIGS[copilot.activeAgent].placeholder}
					rows={1}
					disabled={isStreaming}
					class="copilot-textarea"
					style="field-sizing: content;"
				></textarea>
				<button
					class="copilot-send-btn"
					class:copilot-send-btn--active={!!inputValue.trim() && !isStreaming}
					disabled={!inputValue.trim() || isStreaming}
					onclick={() => send(inputValue)}
					aria-label="Envoyer"
				>
					{#if isStreaming}
						<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
					{:else}
						<SendIcon class="size-4" />
					{/if}
				</button>
			</div>
			<p class="copilot-hint">⌘K ouvrir · Entrée envoyer · ⇧Entrée saut de ligne</p>
		</div>

	<!-- ════════════════════════════════════════════════════════════════════ -->
	<!-- MODE HUMAIN ─────────────────────────────────────────────────────── -->
	<!-- ════════════════════════════════════════════════════════════════════ -->
	{:else}
		<div class="copilot-messages-area flex-1">
			{#if activeRequestQ.isLoading}
				<div class="flex items-center justify-center py-10">
					<LoaderCircleIcon class="size-5 text-muted-foreground motion-safe:animate-spin" />
				</div>
			{:else if activeRequest}
				<div class="flex flex-col gap-3 p-4">
					<!-- Statut bannière -->
					{#if activeRequest.request.status === 'pending'}
						<div class="status-banner status-banner--pending" in:fly={{ y: -4, duration: 200 }}>
							<span class="inline-flex size-2 shrink-0 animate-pulse rounded-full bg-amber-400"></span>
							<p class="text-[12px] font-medium text-amber-700 dark:text-amber-400">
								En attente d'un concierge disponible…
							</p>
						</div>
					{:else if activeRequest.request.status === 'in_progress'}
						<div class="status-banner status-banner--active" in:fly={{ y: -4, duration: 200 }}>
							<span class="inline-flex size-2 shrink-0 rounded-full bg-emerald-500"></span>
							<p class="text-[12px] font-medium text-emerald-700 dark:text-emerald-400">
								Concierge connecté
							</p>
						</div>
					{:else}
						<div class="status-banner" in:fly={{ y: -4, duration: 200 }}>
							<p class="text-[12px] text-muted-foreground">Conversation terminée.</p>
							<button onclick={() => { humanMode = false; }} class="ml-auto text-[11px] text-[var(--brand-foreground)] dark:text-[var(--brand)] hover:underline">
								Retour à l'IA
							</button>
						</div>
					{/if}

					<!-- Contexte IA -->
					{#if activeRequest.request.summary}
						<div class="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
							<p class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Contexte partagé</p>
							<p class="whitespace-pre-wrap text-[11px] text-muted-foreground/80 line-clamp-3">{activeRequest.request.summary}</p>
						</div>
					{/if}

					<!-- Messages -->
					{#each activeRequest.messages as msg (msg._id)}
						<div in:fly={{ y: 8, duration: 220, easing: quintOut }}>
							{#if msg.senderType === 'client'}
								<div class="flex justify-end">
									<div class="max-w-[82%] rounded-2xl rounded-tr-sm bg-[var(--brand)] px-3.5 py-2.5 text-sm leading-relaxed text-black">
										{msg.content}
									</div>
								</div>
							{:else}
								<div class="flex gap-2.5">
									<div class="mt-0.5 size-7 shrink-0 overflow-hidden rounded-full ring-2 ring-border">
										{#if msg.senderAvatarUrl}
											<img src={msg.senderAvatarUrl} alt={msg.senderName} class="h-full w-full object-cover" />
										{:else}
											<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-[10px] font-bold text-white">
												{getInitials(msg.senderName)}
											</div>
										{/if}
									</div>
									<div class="flex flex-col gap-1">
										<p class="text-[11px] font-semibold text-foreground/70">
											{msg.senderName} <span class="font-normal text-muted-foreground/50">· Concierge</span>
										</p>
										<div class="max-w-[82%] rounded-2xl rounded-tl-sm border border-border/60 bg-card px-3.5 py-2.5 text-sm leading-relaxed shadow-sm">
											{msg.content}
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}

					{#if activeRequest.messages.length === 0 && activeRequest.request.status === 'pending'}
						<p class="py-4 text-center text-[11px] text-muted-foreground/40">
							Les messages du concierge apparaîtront ici
						</p>
					{/if}
					<div bind:this={humanMessagesEndEl}></div>
				</div>
			{/if}
		</div>

		<!-- Input humain -->
		{#if activeRequest && activeRequest.request.status !== 'closed'}
			<div class="copilot-input-area shrink-0">
				<div class="copilot-input-wrap">
					<textarea
						id="human-input"
						bind:value={humanInputValue}
						onkeydown={handleHumanKeydown}
						placeholder="Répondre au concierge…"
						rows={1}
						disabled={humanSending}
						class="copilot-textarea"
						style="field-sizing: content;"
					></textarea>
					<button
						class="copilot-send-btn copilot-send-btn--human"
						class:copilot-send-btn--active={!!humanInputValue.trim() && !humanSending}
						disabled={!humanInputValue.trim() || humanSending}
						onclick={sendHumanMessage}
						aria-label="Envoyer"
					>
						{#if humanSending}
							<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
						{:else}
							<SendIcon class="size-4" />
						{/if}
					</button>
				</div>
			</div>
		{:else if !activeRequest}
			<div class="shrink-0 border-t border-border/50 px-4 py-4">
				<button
					onclick={() => { humanMode = false; }}
					class="flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeftIcon class="size-3.5" />
					Retour à l'assistant IA
				</button>
			</div>
		{/if}
	{/if}
</aside>

<style>
/* ── Backdrop ──────────────────────────────────────────────────────────────── */
.copilot-backdrop {
	display: none;
}
@media (max-width: 767px) {
	.copilot-backdrop {
		display: block;
		position: fixed;
		inset: 0;
		z-index: 40;
		background: oklch(0 0 0 / 0.55);
		backdrop-filter: blur(2px);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.28s ease;
	}
	.copilot-backdrop--open {
		opacity: 1;
		pointer-events: auto;
	}
}

/* ── Panel container ───────────────────────────────────────────────────────── */
.copilot-panel {
	position: fixed;
	bottom: 0;
	right: 0;
	z-index: 50;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100dvh;
	background: hsl(var(--background));
	border-left: 1px solid hsl(var(--border));

	/* Desktop: slide from right */
	transform: translateX(calc(100% + 1px));
	opacity: 0;
	visibility: hidden;
	pointer-events: none;
	transition:
		transform 0.32s cubic-bezier(0.32, 0.72, 0, 1),
		opacity 0.25s ease,
		visibility 0s linear 0.32s;

	will-change: transform;
}

.copilot-panel--open {
	transform: translateX(0);
	opacity: 1;
	visibility: visible;
	pointer-events: auto;
	transition:
		transform 0.32s cubic-bezier(0.32, 0.72, 0, 1),
		opacity 0.22s ease,
		visibility 0s linear 0s;
	/* Premium shadow */
	box-shadow:
		-1px 0 0 hsl(var(--border)),
		-24px 0 48px oklch(0 0 0 / 0.10),
		-8px 0 16px oklch(0 0 0 / 0.06);
}

/* Mobile: slide from bottom */
@media (max-width: 767px) {
	.copilot-panel {
		transform: translateY(100%);
		border-left: none;
		border-top: 1px solid hsl(var(--border));
		border-radius: 20px 20px 0 0;
		box-shadow: none;
	}
	.copilot-panel--open {
		transform: translateY(0);
		box-shadow:
			0 -4px 32px oklch(0 0 0 / 0.12),
			0 -1px 0 hsl(var(--border));
	}
}

/* Desktop width */
@media (min-width: 768px) {
	.copilot-panel {
		width: 420px;
	}
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.copilot-header {
	position: relative;
	border-bottom: 1px solid hsl(var(--border) / 0.6);
	background: hsl(var(--background) / 0.97);
	backdrop-filter: blur(8px);
}

/* Mobile: drag handle hint */
@media (max-width: 767px) {
	.copilot-header::before {
		content: '';
		display: block;
		width: 36px;
		height: 4px;
		border-radius: 2px;
		background: hsl(var(--muted-foreground) / 0.25);
		margin: 10px auto 0;
	}
}

/* ── Agent tabs ─────────────────────────────────────────────────────────────── */
.copilot-tabs {
	display: flex;
	gap: 4px;
	padding-left: 12px;
	padding-right: 12px;
}

.copilot-tab {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 6px 10px;
	border-radius: 10px;
	font-size: 11px;
	font-weight: 600;
	color: hsl(var(--muted-foreground));
	transition:
		color 0.15s ease,
		background 0.18s ease,
		box-shadow 0.18s ease,
		transform 0.12s ease;
	-webkit-tap-highlight-color: transparent;
}

.copilot-tab:hover {
	color: hsl(var(--foreground));
	background: hsl(var(--muted) / 0.5);
}

.copilot-tab:active {
	transform: scale(0.96);
}

.copilot-tab--active {
	background: var(--brand, oklch(0.92 0.23 103));
	color: black;
	box-shadow:
		0 1px 3px oklch(0.92 0.23 103 / 0.35),
		inset 0 1px 0 oklch(1 0 0 / 0.45);
}

.copilot-tab--active:hover {
	background: var(--brand, oklch(0.92 0.23 103));
	color: black;
}

/* ── Concierge card ─────────────────────────────────────────────────────────── */
.concierge-card {
	position: relative;
	border-bottom: 1px solid hsl(var(--border) / 0.5);
	background: linear-gradient(
		to bottom,
		hsl(var(--muted) / 0.25),
		hsl(var(--muted) / 0.05)
	);
}

/* ── Messages area ──────────────────────────────────────────────────────────── */
.copilot-messages-area {
	overflow-y: auto;
	overflow-x: hidden;
	overscroll-behavior: contain;
	-webkit-overflow-scrolling: touch;
	scroll-behavior: smooth;
}

/* Inset shadow at top to indicate scrollable content */
.copilot-messages-area {
	background:
		linear-gradient(hsl(var(--background)) 30%, transparent) top / 100% 16px,
		radial-gradient(farthest-side at 50% 0, oklch(0 0 0 / 0.06), transparent) top / 100% 8px;
	background-attachment: local, scroll;
}

/* ── Quick prompt buttons ───────────────────────────────────────────────────── */
.quick-prompt-btn {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 10px 14px;
	border-radius: 12px;
	border: 1px solid hsl(var(--border) / 0.6);
	background: hsl(var(--card) / 0.6);
	font-size: 12.5px;
	color: hsl(var(--foreground) / 0.8);
	text-align: left;
	position: relative;
	overflow: hidden;
	transition:
		border-color 0.15s ease,
		background 0.15s ease,
		transform 0.12s ease,
		box-shadow 0.15s ease,
		color 0.15s ease;
	-webkit-tap-highlight-color: transparent;
}

.quick-prompt-btn::before {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(135deg, oklch(1 0 0 / 0.03) 0%, transparent 60%);
	pointer-events: none;
}

.quick-prompt-btn:hover {
	border-color: hsl(var(--border));
	background: hsl(var(--card));
	color: hsl(var(--foreground));
	transform: translateY(-1px);
	box-shadow: 0 2px 8px oklch(0 0 0 / 0.06);
}

.quick-prompt-btn:active {
	transform: translateY(0) scale(0.98);
	box-shadow: none;
}

.quick-prompt-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
	transform: none;
}

.prompt-arrow {
	font-size: 13px;
	color: hsl(var(--muted-foreground) / 0.4);
	transition: transform 0.15s ease, color 0.15s ease;
}

.quick-prompt-btn:hover .prompt-arrow {
	transform: translateX(3px);
	color: hsl(var(--muted-foreground));
}

/* ── Human CTA button ──────────────────────────────────────────────────────── */
.human-cta-btn {
	position: relative;
	overflow: hidden;
	display: block;
	padding: 10px 14px;
	border-radius: 14px;
	border: 1px solid hsl(var(--border) / 0.7);
	background: hsl(var(--card) / 0.5);
	transition:
		border-color 0.15s ease,
		background 0.15s ease,
		transform 0.12s ease,
		box-shadow 0.15s ease;
	-webkit-tap-highlight-color: transparent;
}

.human-cta-btn:hover {
	border-color: oklch(0.7 0.12 295 / 0.5);
	background: oklch(0.97 0.02 295 / 0.5);
	transform: translateY(-1px);
	box-shadow: 0 2px 12px oklch(0.6 0.15 295 / 0.12);
}

.human-cta-btn:active {
	transform: scale(0.98);
}

.human-cta-btn:disabled {
	opacity: 0.6;
	cursor: default;
	transform: none;
}

/* ── Input area ────────────────────────────────────────────────────────────── */
.copilot-input-area {
	border-top: 1px solid hsl(var(--border) / 0.5);
	padding: 12px 12px;
	padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
	background: hsl(var(--background) / 0.97);
	backdrop-filter: blur(8px);
}

.copilot-input-wrap {
	display: flex;
	align-items: flex-end;
	gap: 8px;
	padding: 8px 10px 8px 14px;
	border-radius: 16px;
	border: 1px solid hsl(var(--border));
	background: hsl(var(--background));
	transition:
		border-color 0.15s ease,
		box-shadow 0.2s ease;
}

.copilot-input-wrap:focus-within {
	border-color: hsl(var(--ring) / 0.6);
	box-shadow:
		0 0 0 3px hsl(var(--ring) / 0.08),
		0 1px 3px oklch(0 0 0 / 0.04);
}

.copilot-textarea {
	flex: 1;
	resize: none;
	background: transparent;
	font-size: 14px;
	line-height: 1.5;
	min-height: 22px;
	max-height: 120px;
	color: hsl(var(--foreground));
	outline: none;
}

.copilot-textarea::placeholder {
	color: hsl(var(--muted-foreground) / 0.45);
}

.copilot-textarea:disabled {
	opacity: 0.5;
}

/* ── Send button ────────────────────────────────────────────────────────────── */
.copilot-send-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border-radius: 10px;
	flex-shrink: 0;
	color: hsl(var(--muted-foreground));
	background: hsl(var(--muted) / 0.4);
	transition:
		background 0.15s ease,
		color 0.15s ease,
		transform 0.1s ease,
		box-shadow 0.15s ease;
}

.copilot-send-btn--active {
	background: var(--brand, oklch(0.92 0.23 103));
	color: black;
	box-shadow:
		0 2px 8px oklch(0.92 0.23 103 / 0.4),
		inset 0 1px 0 oklch(1 0 0 / 0.4);
}

.copilot-send-btn--human.copilot-send-btn--active {
	background: oklch(0.55 0.18 295);
	color: white;
	box-shadow:
		0 2px 8px oklch(0.55 0.18 295 / 0.35),
		inset 0 1px 0 oklch(1 0 0 / 0.2);
}

.copilot-send-btn--active:hover {
	transform: scale(1.06);
}

.copilot-send-btn--active:active {
	transform: scale(0.94);
}

.copilot-send-btn:disabled {
	opacity: 0.4;
	cursor: default;
}

/* ── Hint text ──────────────────────────────────────────────────────────────── */
.copilot-hint {
	margin-top: 6px;
	text-align: center;
	font-size: 10px;
	color: hsl(var(--muted-foreground) / 0.35);
	letter-spacing: 0.01em;
}

@media (max-width: 767px) {
	.copilot-hint { display: none; }
}

/* ── Status banners ─────────────────────────────────────────────────────────── */
.status-banner {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 10px;
	border: 1px solid hsl(var(--border) / 0.5);
	background: hsl(var(--muted) / 0.3);
}

.status-banner--pending {
	border-color: oklch(0.85 0.12 80 / 0.4);
	background: oklch(0.98 0.04 80 / 0.4);
}

.status-banner--active {
	border-color: oklch(0.8 0.12 145 / 0.4);
	background: oklch(0.97 0.04 145 / 0.3);
}
</style>
