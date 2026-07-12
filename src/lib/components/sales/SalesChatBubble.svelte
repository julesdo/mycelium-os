<script lang="ts">
	let { message }: { message: any } = $props();

	const isSales = $derived(message.authorRole === 'sales' || message.authorRole === 'super_admin');

	const timeStr = $derived(
		new Date(message.createdAt).toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit'
		})
	);
</script>

<div class="flex {isSales ? 'justify-end' : 'justify-start'}">
	<div
		class="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm
		{isSales
			? 'bg-[var(--brand)] text-[var(--brand-foreground)] rounded-br-sm'
			: 'bg-muted text-foreground rounded-bl-sm'}"
		style={isSales
			? 'box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.2)'
			: 'box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)'}
	>
		{#if !isSales}
			<p class="mb-0.5 text-[10px] font-semibold text-muted-foreground">Concierge</p>
		{/if}
		<p class="whitespace-pre-wrap leading-snug">{message.content}</p>
		<p class="mt-1 text-[10px] {isSales ? 'text-[var(--brand-foreground)]/60' : 'text-muted-foreground/60'} text-right">
			{timeStr}
		</p>
	</div>
</div>
