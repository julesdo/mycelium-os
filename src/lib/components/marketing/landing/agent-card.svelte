<script lang="ts">
	let {
		agentId,
		name,
		role,
		desc
	}: {
		agentId: string;
		name: string;
		role: string;
		desc: string;
	} = $props();

	let rotX = $state(0);
	let rotY = $state(0);
	let hovered = $state(false);

	function onmousemove(e: MouseEvent) {
		const el = (e.currentTarget as HTMLElement);
		const rect = el.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		rotY = ((e.clientX - cx) / (rect.width / 2)) * 22;
		rotX = -((e.clientY - cy) / (rect.height / 2)) * 22;
	}

	function onmouseleave() {
		rotX = 0;
		rotY = 0;
		hovered = false;
	}

	function onmouseenter() {
		hovered = true;
	}
</script>

<div
	class="flex h-full flex-col rounded-2xl border border-border bg-background p-7 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_oklch(0_0_0/0.18)]"
	{onmousemove}
	{onmouseleave}
	{onmouseenter}
>
	<!-- Icône avec effet 3D au survol de la card -->
	<div class="mb-6 size-14 cursor-default" style="perspective: 300px;">
		<div
			style="
				transform: rotateX({rotX}deg) rotateY({rotY}deg) scale({hovered ? 1.12 : 1});
				transition: transform {hovered ? '0ms' : '400ms cubic-bezier(0.23,1,0.32,1)'};
				transform-style: preserve-3d;
				will-change: transform;
			"
			class="size-full"
		>
			{#if agentId === 'concierge'}
				<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-full drop-shadow-[0_4px_12px_var(--brand)]">
					<rect x="4" y="4" width="48" height="48" rx="3" stroke="var(--brand)" stroke-width="1.5"/>
					<rect x="10" y="10" width="36" height="36" rx="2" stroke="var(--brand)" stroke-width="1.2" opacity="0.7"/>
					<rect x="16" y="16" width="24" height="24" rx="1.5" stroke="var(--brand)" stroke-width="1" opacity="0.45"/>
					<rect x="22" y="22" width="12" height="12" rx="1" stroke="var(--brand)" stroke-width="0.8" opacity="0.25"/>
				</svg>
			{:else if agentId === 'manager'}
				<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-full drop-shadow-[0_4px_12px_var(--brand)]">
					<circle cx="28" cy="28" r="24" stroke="var(--brand)" stroke-width="1.5"/>
					<circle cx="28" cy="28" r="18" stroke="var(--brand)" stroke-width="1.2" opacity="0.7"/>
					<circle cx="28" cy="28" r="12" stroke="var(--brand)" stroke-width="1" opacity="0.45"/>
					<circle cx="28" cy="28" r="6" stroke="var(--brand)" stroke-width="0.8" opacity="0.25"/>
				</svg>
			{:else if agentId === 'optimizer'}
				<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-full drop-shadow-[0_4px_12px_var(--brand)]">
					<path d="M28 4 L52 28 L28 52 L4 28 Z" stroke="var(--brand)" stroke-width="1.5"/>
					<path d="M28 10 L46 28 L28 46 L10 28 Z" stroke="var(--brand)" stroke-width="1.2" opacity="0.7"/>
					<path d="M28 16 L40 28 L28 40 L16 28 Z" stroke="var(--brand)" stroke-width="1" opacity="0.45"/>
					<path d="M28 22 L34 28 L28 34 L22 28 Z" stroke="var(--brand)" stroke-width="0.8" opacity="0.25"/>
				</svg>
			{:else if agentId === 'compliance'}
				<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-full drop-shadow-[0_4px_12px_var(--brand)]">
					<rect x="4" y="8" width="48" height="40" rx="3" stroke="var(--brand)" stroke-width="1.5"/>
					<rect x="10" y="14" width="36" height="28" rx="2" stroke="var(--brand)" stroke-width="1.2" opacity="0.7"/>
					<rect x="16" y="20" width="24" height="16" rx="1.5" stroke="var(--brand)" stroke-width="1" opacity="0.45"/>
					<rect x="22" y="26" width="12" height="4" rx="1" fill="var(--brand)" opacity="0.2"/>
				</svg>
			{:else if agentId === 'negotiator'}
				<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-full drop-shadow-[0_4px_12px_var(--brand)]">
					<ellipse cx="28" cy="28" rx="24" ry="14" stroke="var(--brand)" stroke-width="1.5"/>
					<ellipse cx="28" cy="28" rx="24" ry="14" stroke="var(--brand)" stroke-width="1.2" opacity="0.7" transform="rotate(60 28 28)"/>
					<ellipse cx="28" cy="28" rx="24" ry="14" stroke="var(--brand)" stroke-width="1" opacity="0.45" transform="rotate(120 28 28)"/>
					<circle cx="28" cy="28" r="3" fill="var(--brand)" opacity="0.4"/>
				</svg>
			{:else}
				<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-full drop-shadow-[0_4px_12px_var(--brand)]">
					<circle cx="28" cy="28" r="24" stroke="var(--brand)" stroke-width="1.5"/>
					<circle cx="28" cy="28" r="18" stroke="var(--brand)" stroke-width="1.2" opacity="0.65" stroke-dasharray="4 3"/>
					<circle cx="28" cy="28" r="12" stroke="var(--brand)" stroke-width="1" opacity="0.4" stroke-dasharray="3 4"/>
					<circle cx="28" cy="28" r="6" stroke="var(--brand)" stroke-width="0.8" opacity="0.2"/>
				</svg>
			{/if}
		</div>
	</div>

	<h3 class="text-base font-bold tracking-[-0.01em] text-foreground">{name}</h3>
	<p class="mt-0.5 text-xs text-muted-foreground/70">{role}</p>
	<p class="mt-3 flex-1 text-sm leading-relaxed text-pretty text-muted-foreground">{desc}</p>
</div>
