<script lang="ts">
	type Props = {
		value: string;
		onchange: (value: string) => void;
		onsend: () => void;
		disabled?: boolean;
	};

	let { value, onchange, onsend, disabled = false }: Props = $props();

	let textareaEl: HTMLTextAreaElement | undefined = $state();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (!disabled && value.trim()) {
				onsend();
			}
		}
	}

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLTextAreaElement;
		onchange(target.value);
		autoResize(target);
	}

	function autoResize(el: HTMLTextAreaElement) {
		el.style.height = 'auto';
		el.style.height = Math.min(el.scrollHeight, 160) + 'px';
	}

	$effect(() => {
		if (textareaEl) {
			textareaEl.focus();
		}
	});
</script>

<div class="flex items-end gap-2 px-4 py-3 border-t" style="border-color: oklch(0.28 0 0);">
	<textarea
		bind:this={textareaEl}
		{value}
		oninput={handleInput}
		onkeydown={handleKeydown}
		{disabled}
		rows={1}
		placeholder="Envoyer un message..."
		aria-label="Message au concierge"
		class="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[oklch(0.45_0_0)] disabled:opacity-40"
		style="color: oklch(0.88 0 0); font-family: var(--font-sans, ui-sans-serif, system-ui);"
	></textarea>

	<button
		onclick={onsend}
		disabled={disabled || !value.trim()}
		aria-label="Envoyer le message"
		class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
		style="
			background-color: {disabled || !value.trim() ? 'oklch(0.28 0 0)' : 'oklch(0.60 0.18 230)'};
			color: {disabled || !value.trim() ? 'oklch(0.45 0 0)' : 'oklch(0.97 0 0)'};
			outline-color: oklch(0.60 0.18 230);
			cursor: {disabled || !value.trim() ? 'not-allowed' : 'pointer'};
		"
	>
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M5 12h14M12 5l7 7-7 7" />
		</svg>
	</button>
</div>
