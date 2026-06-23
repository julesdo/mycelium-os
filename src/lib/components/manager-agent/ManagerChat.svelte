<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import ManagerMessage from './ManagerMessage.svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import SendIcon from '@lucide/svelte/icons/send';
	import BotIcon from '@lucide/svelte/icons/bot';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';

	type LocalMessage = {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isStreaming: boolean;
		toolCall: string | null;
	};

	type Props = { onclose: () => void };

	let { onclose }: Props = $props();

	const QUICK_PROMPTS = [
		"Quels véhicules sont sous-utilisés ce mois ?",
		"Résume l'état de la flotte",
		"Entretiens à planifier dans 30 jours",
		"Dépenses par catégorie ce trimestre"
	];

	let messages: LocalMessage[] = $state([]);
	let conversationId: string | null = $state(null);
	let inputValue = $state('');
	let isSending = $state(false);
	let messagesEndEl: HTMLDivElement | undefined = $state();
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	function scrollToBottom() {
		tick().then(() => messagesEndEl?.scrollIntoView({ behavior: 'smooth' }));
	}

	function updateLast(patch: Partial<LocalMessage>) {
		messages = messages.map((m, i) => (i === messages.length - 1 ? { ...m, ...patch } : m));
	}

	async function send(text: string) {
		const trimmed = text.trim();
		if (!trimmed || isSending) return;

		inputValue = '';
		isSending = true;

		messages = [
			...messages,
			{ id: crypto.randomUUID(), role: 'user', content: trimmed, isStreaming: false, toolCall: null },
			{ id: crypto.randomUUID(), role: 'assistant', content: '', isStreaming: true, toolCall: null }
		];
		scrollToBottom();

		try {
			const res = await fetch('/api/manager', {
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
					try { event = JSON.parse(json) as Record<string, unknown>; }
					catch { continue; }

					if (event.type === 'text') {
						messages = messages.map((m, i) =>
							i === messages.length - 1
								? { ...m, content: m.content + (event.text as string), toolCall: null }
								: m
						);
						scrollToBottom();
					} else if (event.type === 'tool_call') {
						updateLast({ toolCall: event.name as string });
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
			updateLast({
				content: e instanceof Error ? `Erreur réseau : ${e.message}` : 'Erreur réseau',
				isStreaming: false,
				toolCall: null
			});
		} finally {
			isSending = false;
			await tick();
			textareaEl?.focus();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
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
</script>

<div
	class="fixed right-6 bottom-24 z-50 flex w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
	style="height: min(620px, calc(100vh - 8rem));"
>
	<!-- Header -->
	<div class="flex shrink-0 items-center gap-2.5 border-b border-border/50 bg-muted/30 px-4 py-3">
		<div class="flex size-7 items-center justify-center rounded-xl bg-[var(--brand)]/15">
			<BotIcon class="size-4 text-[var(--brand)]" />
		</div>
		<div class="min-w-0 flex-1">
			<p class="text-[13px] font-semibold">Assistant Gestionnaire</p>
			<p class="text-[11px] text-muted-foreground">Analyse en langage naturel</p>
		</div>
		<div class="flex items-center gap-1">
			{#if messages.length > 0}
				<Button
					variant="ghost"
					size="icon"
					class="size-7 text-muted-foreground"
					onclick={reset}
					title="Nouvelle conversation"
				>
					<RotateCcwIcon class="size-3.5" />
				</Button>
			{/if}
			<Button variant="ghost" size="icon" class="size-7 text-muted-foreground" onclick={onclose}>
				<XIcon class="size-3.5" />
			</Button>
		</div>
	</div>

	<!-- Messages -->
	<div class="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
		{#if messages.length === 0}
			<div class="flex flex-col gap-2">
				<p class="text-center text-xs text-muted-foreground">Posez une question sur votre flotte</p>
				<div class="flex flex-col gap-1.5">
					{#each QUICK_PROMPTS as prompt (prompt)}
						<button
							class="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-left text-[12px] text-foreground/80 transition-colors hover:border-border hover:bg-muted hover:text-foreground"
							onclick={() => send(prompt)}
							disabled={isSending}
						>
							{prompt}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			{#each messages as msg (msg.id)}
				<ManagerMessage
					role={msg.role}
					content={msg.content}
					isStreaming={msg.isStreaming}
					toolCall={msg.toolCall}
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
				bind:this={textareaEl}
				bind:value={inputValue}
				onkeydown={handleKeydown}
				placeholder="Posez une question analytique…"
				rows={1}
				disabled={isSending}
				class="max-h-28 flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
				style="field-sizing: content;"
			></textarea>
			<Button
				size="icon"
				class="size-7 shrink-0 rounded-lg"
				disabled={!inputValue.trim() || isSending}
				onclick={() => send(inputValue)}
			>
				<SendIcon class="size-3.5" />
			</Button>
		</div>
		<p class="mt-1.5 text-center text-[10px] text-muted-foreground/40">
			Lecture seule · Données réelles uniquement
		</p>
	</div>
</div>
