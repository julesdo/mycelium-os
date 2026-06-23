<script lang="ts">
	let { value, label }: { value: string; label: string } = $props();
</script>

<div class="flex flex-col items-center text-center">
	<span class="font-mono text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
		{value}
	</span>
	<span class="mt-2 text-sm text-muted-foreground">{label}</span>
</div>
