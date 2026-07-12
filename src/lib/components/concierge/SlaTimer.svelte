<script lang="ts">
	let { deadline, firstResponseAt }: { deadline: number; firstResponseAt?: number } = $props();

	let now = $state(Date.now());

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 60_000);
		return () => clearInterval(id);
	});

	const remainingMs = $derived(deadline - now);
	const isBreached = $derived(remainingMs < 0);
	const alreadyResponded = $derived(!!firstResponseAt && firstResponseAt < deadline);

	const label = $derived.by(() => {
		if (alreadyResponded) return null;
		const absMs = Math.abs(remainingMs);
		const mins = Math.floor(absMs / 60_000);
		if (mins < 60) return `${mins}min`;
		const hrs = Math.floor(mins / 60);
		return `${hrs}h`;
	});

	const colorClass = $derived.by(() => {
		if (alreadyResponded || label === null) return '';
		if (isBreached) return 'text-red-500';
		if (remainingMs < 30 * 60_000) return 'text-orange-500';
		return 'text-muted-foreground';
	});
</script>

{#if label !== null}
	<span class="text-[10px] font-medium tabular-nums {colorClass}">
		{isBreached ? '+' : ''}{label}
	</span>
{/if}
