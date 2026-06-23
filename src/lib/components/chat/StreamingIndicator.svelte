<script lang="ts">
</script>

<div class="flex items-center gap-1.5 px-4 py-3" aria-label="L'agent réfléchit" aria-live="polite">
	<span class="text-sm italic" style="color: oklch(0.55 0 0);">L'agent réfléchit</span>
	<span class="flex items-center gap-0.5">
		<span class="dot" style="animation-delay: 0ms;"></span>
		<span class="dot" style="animation-delay: 150ms;"></span>
		<span class="dot" style="animation-delay: 300ms;"></span>
	</span>
</div>

<style>
	.dot {
		display: inline-block;
		width: 3px;
		height: 3px;
		border-radius: 9999px;
		background-color: oklch(0.55 0 0);
		animation: bounce 900ms ease-in-out infinite;
	}

	@keyframes bounce {
		0%, 60%, 100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-4px);
			opacity: 1;
		}
	}
</style>
