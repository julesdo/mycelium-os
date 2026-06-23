<script lang="ts">
	import { copilot } from './copilot-store.svelte.js';
	import { tick } from 'svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import SendIcon from '@lucide/svelte/icons/send';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import BotIcon from '@lucide/svelte/icons/bot';
	import CopilotMessage from './copilot-message.svelte';
	import type { CopilotWidget } from './widgets/types.js';

	type LocalMessage = {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isStreaming: boolean;
		toolCall: string | null;
		widget?: CopilotWidget;
	};

	const CONCIERGE_QUICK_PROMPTS = [
		'Réserver un véhicule pour demain',
		'Voir mes réservations à venir',
		'Annuler une réservation'
	];

	const MANAGER_QUICK_PROMPTS = [
		"Résume l'état de la flotte",
		"Taux d'utilisation ce mois",
		"Coûts par catégorie ce trimestre",
		"Entretiens en retard"
	];

	const COMPLIANCE_QUICK_PROMPTS = [
		'Tableau de bord conformité',
		'Documents véhicules expirés',
		'Permis conducteurs à renouveler',
		'Contraventions en attente'
	];

	let messages = $state<LocalMessage[]>([]);
	let conversationId = $state<string | null>(null);
	let isStreaming = $state(false);
	let inputValue = $state('');
	let messagesEndEl: HTMLDivElement | undefined = $state();
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	const endpoint = $derived(
		copilot.activeAgent === 'manager' ? '/api/manager' :
		copilot.activeAgent === 'compliance' ? '/api/compliance' :
		'/api/concierge'
	);
	const quickPrompts = $derived(
		copilot.activeAgent === 'manager' ? MANAGER_QUICK_PROMPTS :
		copilot.activeAgent === 'compliance' ? COMPLIANCE_QUICK_PROMPTS :
		CONCIERGE_QUICK_PROMPTS
	);

	$effect(() => {
		if (copilot.isOpen) {
			tick().then(() => textareaEl?.focus());
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

		messages = [
			...messages,
			{ id: crypto.randomUUID(), role: 'user', content: trimmed, isStreaming: false, toolCall: null },
			{ id: crypto.randomUUID(), role: 'assistant', content: '', isStreaming: true, toolCall: null }
		];
		scrollToBottom();

		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: trimmed, conversationId: conversationId ?? undefined })
			});

			if (!res.ok || !res.body) {
				const errText = await res.text().catch(() => `Erreur ${res.status}`);
				updateLast({ content: errText, isStreaming: false });
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
					try {
						event = JSON.parse(json) as Record<string, unknown>;
					} catch {
						continue;
					}

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
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const { type, ...widgetData } = event;
						updateLast({ widget: widgetData as CopilotWidget, toolCall: null });
						scrollToBottom();
					} else if (event.type === 'done') {
						conversationId = (event.conversationId as string) ?? null;
						updateLast({ isStreaming: false, toolCall: null });
					} else if (event.type === 'error') {
						const existing = messages[messages.length - 1]?.content ?? '';
						updateLast({
							content: existing
								? `${existing}\n\n⚠ ${event.message as string}`
								: `⚠ ${event.message as string}`,
							isStreaming: false,
							toolCall: null
						});
					}
				}
			}
		} catch (e) {
			updateLast({
				content: e instanceof Error ? `Erreur réseau : ${e.message}` : 'Erreur réseau',
				isStreaming: false,
				toolCall: null
			});
		} finally {
			isStreaming = false;
			await tick();
			textareaEl?.focus();
		}
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send(inputValue);
		}
	}

	function reset() {
		messages = [];
		conversationId = null;
		inputValue = '';
	}

	function handleVehicleSelect(vehicleId: string, startDate?: string, endDate?: string) {
		const lastWidget = messages.findLast((m) => m.widget?.widget === 'vehicle_proposal');
		const w = lastWidget?.widget as { widget: 'vehicle_proposal'; vehicle: { brand: string; model: string; registration: string } } | undefined;
		if (w) {
			send(`Oui, réservez le ${w.vehicle.brand} ${w.vehicle.model} (${w.vehicle.registration}).`);
		}
	}

	function handleVehicleAlt() {
		send("Montrez-moi l'option suivante.");
	}
</script>

{#if copilot.isOpen}
	<!-- Mobile overlay -->
	<div
		class="fixed inset-0 z-40 bg-black/50 md:hidden"
		onclick={() => copilot.close()}
		role="presentation"
	></div>

	<!-- Panel -->
	<aside
		class="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col border-l border-border bg-background shadow-2xl md:w-[420px]"
	>
		<!-- Header -->
		<header class="flex shrink-0 items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
			<div class="flex items-center gap-2.5">
				<div class="flex size-7 items-center justify-center rounded-xl bg-[var(--brand)]/15">
					<BotIcon class="size-4 text-[var(--brand)]" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="text-[13px] font-semibold">
						{copilot.activeAgent === 'manager' ? 'Assistant Gestionnaire' :
						 copilot.activeAgent === 'compliance' ? 'Compliance Officer' :
						 'Concierge Mycelium'}
					</p>
					<p class="text-[11px] text-muted-foreground">
						{copilot.activeAgent === 'manager' ? 'Analyse en langage naturel' :
						 copilot.activeAgent === 'compliance' ? 'Surveillance réglementaire' :
						 'Réservation conversationnelle'}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-1">
				{#if messages.length > 0}
					<button
						class="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						onclick={reset}
						title="Nouvelle conversation"
						aria-label="Nouvelle conversation"
					>
						<RotateCcwIcon class="size-3.5" />
					</button>
				{/if}
				<button
					class="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					onclick={() => copilot.close()}
					aria-label="Fermer"
				>
					<XIcon class="size-3.5" />
				</button>
			</div>
		</header>

		<!-- Messages -->
		<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 scrollbar-thin">
			{#if messages.length === 0}
				<div class="flex flex-col gap-2">
					<p class="text-center text-xs text-muted-foreground">
						{copilot.activeAgent === 'concierge'
							? 'Bonjour ! Comment puis-je vous aider ?'
							: 'Posez une question sur votre flotte'}
					</p>
					<div class="flex flex-col gap-1.5">
						{#each quickPrompts as prompt (prompt)}
							<button
								class="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-left text-[12px] text-foreground/80 transition-colors hover:border-border hover:bg-muted hover:text-foreground"
								onclick={() => send(prompt)}
								disabled={isStreaming}
							>
								{prompt}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				{#each messages as msg (msg.id)}
					<CopilotMessage
						role={msg.role}
						content={msg.content}
						isStreaming={msg.isStreaming}
						toolCall={msg.toolCall}
						widget={msg.widget}
						onVehicleSelect={handleVehicleSelect}
						onVehicleAlt={handleVehicleAlt}
					/>
				{/each}
			{/if}
			<div bind:this={messagesEndEl}></div>
		</div>

		<!-- Input -->
		<div class="shrink-0 border-t border-border/50 px-3 py-3">
			<div
				class="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
			>
				<textarea
					id="copilot-input"
					bind:this={textareaEl}
					bind:value={inputValue}
					onkeydown={handleInputKeydown}
					placeholder={copilot.activeAgent === 'concierge'
						? 'Ex : Réserve-moi un véhicule lundi matin…'
						: "Ex : Taux d'utilisation ce mois ?"}
					rows={1}
					disabled={isStreaming}
					class="max-h-28 flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
					style="field-sizing: content;"
				></textarea>
				<button
					class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-[var(--brand-foreground)] transition-opacity disabled:opacity-40"
					disabled={!inputValue.trim() || isStreaming}
					onclick={() => send(inputValue)}
					aria-label="Envoyer"
				>
					<SendIcon class="size-3.5" />
				</button>
			</div>
			<p class="mt-1.5 text-center text-[10px] text-muted-foreground/40">
				Cmd+K · Échap pour fermer
			</p>
		</div>
	</aside>
{/if}
