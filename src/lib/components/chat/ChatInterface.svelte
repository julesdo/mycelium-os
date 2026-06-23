<script lang="ts">
	import MessageBubble from './MessageBubble.svelte';
	import ChatInput from './ChatInput.svelte';
	import StreamingIndicator from './StreamingIndicator.svelte';

	type Message = {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isStreaming?: boolean;
		toolCall?: string;
	};

	type Props = {
		onclose?: () => void;
		class?: string;
	};

	let { onclose, class: className = '' }: Props = $props();

	let messages: Message[] = $state([]);
	let isThinking: boolean = $state(false);
	let inputValue: string = $state('');
	let messagesEndEl: HTMLDivElement | undefined = $state();

	const SUGGESTIONS = [
		"J'ai besoin d'un véhicule jeudi",
		'Mes prochaines réservations',
		'Annuler ma réservation',
	] as const;

	const FAKE_RESPONSE =
		"Bien sûr, je vais vérifier les véhicules disponibles pour vous. Un instant, je consulte le planning de la flotte...";

	function generateId(): string {
		return Math.random().toString(36).slice(2, 10);
	}

	function scrollToBottom() {
		messagesEndEl?.scrollIntoView({ behavior: 'smooth' });
	}

	async function sendMessage(text: string) {
		const trimmed = text.trim();
		if (!trimmed || isThinking) return;

		inputValue = '';

		messages = [...messages, { id: generateId(), role: 'user', content: trimmed }];
		scrollToBottom();

		isThinking = true;
		await delay(1000);
		isThinking = false;

		const assistantId = generateId();
		messages = [
			...messages,
			{
				id: assistantId,
				role: 'assistant',
				content: '',
				isStreaming: true,
				toolCall: '🔍 Recherche de véhicules disponibles...',
			},
		];
		scrollToBottom();

		await streamText(assistantId, FAKE_RESPONSE);
	}

	function delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function streamText(messageId: string, fullText: string) {
		for (let i = 0; i <= fullText.length; i++) {
			messages = messages.map((m) =>
				m.id === messageId
					? { ...m, content: fullText.slice(0, i), isStreaming: i < fullText.length }
					: m
			);
			scrollToBottom();
			if (i < fullText.length) await delay(22);
		}
	}

	function handleSuggestion(text: string) {
		sendMessage(text);
	}

	function resetConversation() {
		messages = [];
		isThinking = false;
		inputValue = '';
	}
</script>

<div class="flex flex-col h-full {className}" style="background-color: oklch(0.18 0 0);">
	<header
		class="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
		style="border-color: oklch(0.28 0 0);"
	>
		<div class="flex items-center gap-3">
			<span
				class="text-sm font-semibold tracking-tight"
				style="color: oklch(0.92 0 0);"
			>
				Concierge
			</span>
			<span
				class="text-xs px-2 py-0.5 rounded-full"
				style="background-color: oklch(0.24 0 0); color: oklch(0.55 0 0);"
			>
				IA
			</span>
		</div>

		<div class="flex items-center gap-1">
			<button
				onclick={resetConversation}
				aria-label="Nouvelle conversation"
				class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
				style="color: oklch(0.60 0 0); outline-color: oklch(0.60 0.18 230);"
				onmouseenter={(e) => {
					const el = e.currentTarget as HTMLElement;
					el.style.color = 'oklch(0.88 0 0)';
					el.style.backgroundColor = 'oklch(0.24 0 0)';
				}}
				onmouseleave={(e) => {
					const el = e.currentTarget as HTMLElement;
					el.style.color = 'oklch(0.60 0 0)';
					el.style.backgroundColor = 'transparent';
				}}
			>
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
				Nouvelle conversation
			</button>

			{#if onclose}
				<button
					onclick={onclose}
					aria-label="Fermer le panneau"
					class="flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
					style="color: oklch(0.50 0 0); outline-color: oklch(0.60 0.18 230);"
					onmouseenter={(e) => {
						const el = e.currentTarget as HTMLElement;
						el.style.color = 'oklch(0.88 0 0)';
						el.style.backgroundColor = 'oklch(0.24 0 0)';
					}}
					onmouseleave={(e) => {
						const el = e.currentTarget as HTMLElement;
						el.style.color = 'oklch(0.50 0 0)';
						el.style.backgroundColor = 'transparent';
					}}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</header>

	<div
		class="flex-1 overflow-y-auto px-4 py-4"
		role="log"
		aria-label="Conversation avec le concierge"
		aria-live="polite"
	>
		{#if messages.length === 0 && !isThinking}
			<div class="flex flex-col items-center justify-center h-full gap-6 text-center">
				<div class="flex flex-col gap-1.5">
					<p class="text-base font-semibold" style="color: oklch(0.88 0 0);">
						Bonjour, comment puis-je vous aider ?
					</p>
					<p class="text-sm" style="color: oklch(0.50 0 0);">
						Je gère les réservations et la flotte de véhicules.
					</p>
				</div>

				<div class="flex flex-col gap-2 w-full max-w-xs">
					{#each SUGGESTIONS as suggestion}
						<button
							onclick={() => handleSuggestion(suggestion)}
							class="text-left text-sm px-4 py-3 rounded-xl border transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
							style="border-color: oklch(0.28 0 0); color: oklch(0.75 0 0); background-color: oklch(0.21 0 0); outline-color: oklch(0.60 0.18 230);"
							onmouseenter={(e) => {
								const el = e.currentTarget as HTMLElement;
								el.style.borderColor = 'oklch(0.36 0 0)';
								el.style.color = 'oklch(0.88 0 0)';
								el.style.backgroundColor = 'oklch(0.24 0 0)';
							}}
							onmouseleave={(e) => {
								const el = e.currentTarget as HTMLElement;
								el.style.borderColor = 'oklch(0.28 0 0)';
								el.style.color = 'oklch(0.75 0 0)';
								el.style.backgroundColor = 'oklch(0.21 0 0)';
							}}
						>
							{suggestion}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			{#each messages as message (message.id)}
				<MessageBubble
					role={message.role}
					content={message.content}
					isStreaming={message.isStreaming}
					toolCall={message.toolCall}
				/>
			{/each}

			{#if isThinking}
				<StreamingIndicator />
			{/if}
		{/if}

		<div bind:this={messagesEndEl}></div>
	</div>

	<div class="flex-shrink-0">
		<ChatInput
			value={inputValue}
			onchange={(v) => { inputValue = v; }}
			onsend={() => sendMessage(inputValue)}
			disabled={isThinking}
		/>
	</div>
</div>
