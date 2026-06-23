<script lang="ts">
	let { n, title, desc }: { n: string; title: string; desc: string } = $props();
</script>

<div class="relative">
	<div class="mb-6 h-px w-full bg-[var(--brand)]"></div>
	<span class="block font-mono text-4xl font-bold tracking-tight text-foreground tabular-nums">{n}</span>
	<h3 class="mt-4 text-base font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
	<p class="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">{desc}</p>
</div>
