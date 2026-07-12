<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { copilot } from '$lib/components/copilot/copilot-store.svelte.js';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
</script>

<div class="flex flex-col items-center justify-center py-24 gap-4 px-4">
	<MessageCircleIcon class="size-12 text-muted-foreground" />
	<h2 class="text-lg font-semibold">Contactez votre concierge</h2>
	<p class="text-sm text-muted-foreground text-center max-w-sm">
		Pour toute question ou problème, votre concierge Mycelium est disponible directement depuis le
		chat IA.
	</p>
	<Button onclick={() => copilot.open()}>Ouvrir le chat</Button>
</div>
