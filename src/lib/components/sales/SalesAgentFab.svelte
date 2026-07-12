<script lang="ts">
	import { tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import BotIcon from '@lucide/svelte/icons/bot';
	import XIcon from '@lucide/svelte/icons/x';
	import SendIcon from '@lucide/svelte/icons/send';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import TargetIcon from '@lucide/svelte/icons/target';
	import ZapIcon from '@lucide/svelte/icons/zap';

	type Message = {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isStreaming: boolean;
		toolCall: string | null;
	};

	let isOpen = $state(false);
	let input = $state('');
	let sending = $state(false);
	let messages = $state<Message[]>([]);
	let messagesEl: HTMLDivElement | undefined = $state();

	const QUICK_PROMPTS = [
		{ icon: TrendingUpIcon, label: 'Pipeline actuel', prompt: 'Montre-moi mon pipeline et les prochaines actions prioritaires.' },
		{ icon: ZapIcon, label: 'Signaux upsell', prompt: 'Quels sont mes signaux upsell et risques churn actuels ?' },
		{ icon: TargetIcon, label: 'Défis semaine', prompt: 'Où en suis-je dans mes défis de la semaine ?' }
	];

	function toggle() {
		isOpen = !isOpen;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	async function scrollBottom() {
		await tick();
		if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	async function sendMessage(text?: string) {
		const msg = (text ?? input).trim();
		if (!msg || sending) return;
		input = '';
		sending = true;

		const userMsg: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content: msg,
			isStreaming: false,
			toolCall: null
		};
		messages = [...messages, userMsg];
		await scrollBottom();

		const assistantId = crypto.randomUUID();
		const assistantMsg: Message = {
			id: assistantId,
			role: 'assistant',
			content: '',
			isStreaming: true,
			toolCall: null
		};
		messages = [...messages, assistantMsg];
		await scrollBottom();

		const history = messages
			.filter((m) => m.role === 'user' && m.id !== userMsg.id && !m.isStreaming && m.content)
			.slice(-6)
			.map((m) => ({ role: m.role, content: m.content }));

		try {
			const res = await fetch('/api/sales/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: msg, history })
			});

			if (!res.ok || !res.body) {
				messages = messages.map((m) =>
					m.id === assistantId
						? { ...m, content: 'Erreur de connexion à l\'agent.', isStreaming: false }
						: m
				);
				return;
			}

			const reader = res.body.getReader();
			const dec = new TextDecoder();
			let buf = '';
			let fullText = '';
			let currentTool: string | null = null;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buf += dec.decode(value, { stream: true });

				const lines = buf.split('\n');
				buf = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					try {
						const ev = JSON.parse(line.slice(6)) as {
							type: string;
							content: string;
							name?: string;
						};
						if (ev.type === 'text') {
							fullText += ev.content;
							currentTool = null;
							messages = messages.map((m) =>
								m.id === assistantId
									? { ...m, content: fullText, toolCall: null }
									: m
							);
							await scrollBottom();
						} else if (ev.type === 'tool_call') {
							currentTool = ev.name ?? null;
							messages = messages.map((m) =>
								m.id === assistantId ? { ...m, toolCall: currentTool } : m
							);
						} else if (ev.type === 'done') {
							messages = messages.map((m) =>
								m.id === assistantId
									? { ...m, isStreaming: false, toolCall: null }
									: m
							);
						} else if (ev.type === 'error') {
							messages = messages.map((m) =>
								m.id === assistantId
									? { ...m, content: ev.content, isStreaming: false, toolCall: null }
									: m
							);
						}
					} catch {
						// ignore parse errors
					}
				}
			}
		} catch (e) {
			messages = messages.map((m) =>
				m.id === assistantId
					? { ...m, content: `Erreur: ${String(e)}`, isStreaming: false }
					: m
			);
		} finally {
			sending = false;
			await scrollBottom();
		}
	}

	const TOOL_LABELS: Record<string, string> = {
		list_prospects: 'Chargement pipeline...',
		add_prospect_note: 'Enregistrement de la note...',
		get_upsell_signals: 'Analyse des signaux...',
		get_weekly_challenges: 'Chargement des défis...'
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- FAB -->
<button
	onclick={toggle}
	class="sales-fab print:hidden"
	class:sales-fab--open={isOpen}
	aria-label={isOpen ? 'Fermer Agent Commercial' : 'Agent Commercial IA'}
	aria-expanded={isOpen}
>
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
	<span class="fab-icons" class:fab-icons--open={isOpen}>
		<BotIcon class="fab-ico fab-ico--bot" />
		<XIcon class="fab-ico fab-ico--x" />
	</span>
</button>

<!-- Panel -->
{#if isOpen}
	<div
		class="sales-panel"
		transition:fly={{ y: 16, duration: 240, easing: cubicOut }}
		role="dialog"
		aria-label="Agent Commercial IA"
	>
		<!-- Header -->
		<div class="sales-panel-header">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
			<SparklesIcon class="h-4 w-4 text-[var(--brand)]" />
			<span class="text-sm font-semibold">Agent Commercial</span>
			<button onclick={() => (isOpen = false)} class="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
				<XIcon class="h-4 w-4" />
			</button>
		</div>

		<!-- Messages -->
		<div class="sales-panel-messages" bind:this={messagesEl}>
			{#if messages.length === 0}
				<div class="flex flex-col gap-2 p-4">
					<p class="text-xs text-muted-foreground">Que puis-je faire pour toi ?</p>
					{#each QUICK_PROMPTS as qp}
						<button
							onclick={() => sendMessage(qp.prompt)}
							class="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-[var(--brand)]/40 hover:bg-muted"
							style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
						>
							<svelte:component this={qp.icon} class="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
							{qp.label}
						</button>
					{/each}
				</div>
			{:else}
				{#each messages as msg (msg.id)}
					<div class="flex flex-col gap-1 px-4 py-2 {msg.role === 'user' ? 'items-end' : 'items-start'}">
						{#if msg.toolCall}
							<p class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
								<LoaderCircleIcon class="h-3 w-3 animate-spin" />
								{TOOL_LABELS[msg.toolCall] ?? 'Traitement...'}
							</p>
						{/if}
						{#if msg.content}
							<div
								class="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug
								{msg.role === 'user'
									? 'rounded-br-sm bg-[var(--brand)] text-black'
									: 'rounded-bl-sm bg-muted text-foreground'}"
								style={msg.role === 'user'
									? 'box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.2)'
									: 'box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)'}
							>
								{#if msg.isStreaming && !msg.content}
									<span class="inline-flex gap-0.5">
										<span class="typing-dot"></span>
										<span class="typing-dot" style="animation-delay:0.15s"></span>
										<span class="typing-dot" style="animation-delay:0.3s"></span>
									</span>
								{:else}
									<p class="whitespace-pre-wrap">{msg.content}</p>
									{#if msg.isStreaming}
										<span class="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current opacity-60"></span>
									{/if}
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		<!-- Input -->
		<div class="sales-panel-footer">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent"></div>
			<textarea
				bind:value={input}
				placeholder="Demande à ton agent commercial..."
				rows={1}
				disabled={sending}
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						sendMessage();
					}
				}}
				class="sales-panel-input"
			></textarea>
			<button
				onclick={() => sendMessage()}
				disabled={sending || !input.trim()}
				class="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-black disabled:opacity-40"
				style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.2)"
			>
				{#if sending}
					<LoaderCircleIcon class="h-4 w-4 animate-spin" />
				{:else}
					<SendIcon class="h-4 w-4" />
				{/if}
			</button>
		</div>
	</div>
{/if}

<style>
/* ── FAB ─────────────────────────────────────────────────────────────────── */
.sales-fab {
	position: fixed;
	bottom: calc(env(safe-area-inset-bottom) + 72px); /* au-dessus de la tab bar mobile */
	right: 20px;
	z-index: 49;

	display: flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	border-radius: 999px;
	overflow: hidden;

	background: var(--brand, oklch(0.92 0.23 103));
	box-shadow:
		0 4px 20px oklch(0.92 0.23 103 / 0.38),
		0 1px 4px oklch(0 0 0 / 0.18),
		inset 0 1px 0 oklch(1 0 0 / 0.38);

	transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
	-webkit-tap-highlight-color: transparent;
}

.sales-fab:hover { transform: scale(1.08); }
.sales-fab:active { transform: scale(0.93); transition-duration: 0.1s; }

.sales-fab--open {
	background: hsl(var(--foreground));
	box-shadow: 0 4px 20px oklch(0 0 0 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.08);
}

@media (min-width: 1024px) {
	.sales-fab {
		bottom: 28px;
	}
}

/* ── Icon morph ──────────────────────────────────────────────────────────── */
.fab-icons {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
}

:global(.fab-ico) {
	position: absolute;
	width: 20px;
	height: 20px;
	color: black;
	transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
:global(.fab-ico--bot) { opacity: 1; transform: scale(1); }
:global(.fab-ico--x) { opacity: 0; transform: scale(0.5) rotate(-45deg); }

.fab-icons--open :global(.fab-ico--bot) { opacity: 0; transform: scale(0.5) rotate(45deg); }
.fab-icons--open :global(.fab-ico--x) {
	opacity: 1;
	transform: scale(1) rotate(0deg);
	color: hsl(var(--background));
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
.sales-panel {
	position: fixed;
	bottom: calc(env(safe-area-inset-bottom) + 136px);
	right: 20px;
	z-index: 48;

	width: min(360px, calc(100vw - 32px));
	max-height: min(520px, calc(100vh - 180px));

	display: flex;
	flex-direction: column;

	border-radius: 20px;
	border: 1px solid hsl(var(--border));
	background: hsl(var(--card));
	overflow: hidden;
	box-shadow:
		0 24px 60px oklch(0 0 0 / 0.2),
		0 4px 16px oklch(0 0 0 / 0.12),
		inset 0 1px 0 oklch(1 0 0 / 0.06);
}

@media (min-width: 1024px) {
	.sales-panel {
		bottom: 96px;
		right: 28px;
		width: 380px;
	}
}

.sales-panel-header {
	position: relative;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 16px;
	border-bottom: 1px solid hsl(var(--border));
	background: hsl(var(--card));
}

.sales-panel-messages {
	flex: 1;
	overflow-y: auto;
	overscroll-behavior: contain;
	padding-bottom: 4px;
}

.sales-panel-footer {
	position: relative;
	display: flex;
	align-items: flex-end;
	gap: 8px;
	padding: 10px 12px;
	border-top: 1px solid hsl(var(--border));
	background: hsl(var(--card));
}

.sales-panel-input {
	flex: 1;
	resize: none;
	min-height: 36px;
	max-height: 120px;
	padding: 7px 10px;
	border-radius: 12px;
	border: 1px solid hsl(var(--border));
	background: hsl(var(--input));
	color: hsl(var(--foreground));
	font-size: 13px;
	line-height: 1.45;
	outline: none;
}
.sales-panel-input:focus {
	border-color: var(--brand);
	box-shadow: 0 0 0 2px oklch(0.92 0.23 103 / 0.15);
}

/* ── Typing dots ─────────────────────────────────────────────────────────── */
.typing-dot {
	display: inline-block;
	width: 5px;
	height: 5px;
	border-radius: 999px;
	background: currentColor;
	animation: typing 1.2s ease-in-out infinite;
}
@keyframes typing {
	0%, 100% { opacity: 0.3; transform: translateY(0); }
	50% { opacity: 1; transform: translateY(-3px); }
}
</style>
