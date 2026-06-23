<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from '$lib/components/icons/logo.svelte';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import CarIcon from '@lucide/svelte/icons/car';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ZapIcon from '@lucide/svelte/icons/zap';

	// 0 → idle  1 → user msg  2 → thinking  3 → tool call  4 → vehicle  5 → confirmed  6 → hold
	let phase = $state(0);

	const DURATIONS = [900, 1100, 1700, 1000, 1500, 1400, 3800];

	onMount(() => {
		let timer: ReturnType<typeof setTimeout>;
		function step() {
			phase = (phase + 1) % DURATIONS.length;
			timer = setTimeout(step, DURATIONS[phase]);
		}
		timer = setTimeout(step, DURATIONS[0]);
		return () => clearTimeout(timer);
	});
</script>

<div class="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card/95 shadow-glass-card backdrop-blur-xl">

	<!-- Header -->
	<div class="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
		<span
			class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.3);"
		>
			<Logo class="size-4 text-[var(--brand-foreground)]" />
		</span>
		<span class="text-sm font-semibold text-foreground">Concierge</span>
		<span class="ml-auto flex items-center gap-1.5">
			<span class="relative flex size-1.5 shrink-0">
				<span class="absolute inline-flex size-full animate-ping rounded-full bg-[oklch(0.72_0.19_150)] opacity-60"></span>
				<span class="relative inline-flex size-1.5 rounded-full bg-[oklch(0.72_0.19_150)]"></span>
			</span>
			<span class="text-xs text-muted-foreground">En ligne</span>
		</span>
	</div>

	<!-- Conversation -->
	<div class="min-h-[210px] space-y-3 p-4">

		<!-- User message -->
		{#if phase >= 1}
			<div class="flex justify-end msg-enter">
				<p class="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
					Il me faut un véhicule demain matin pour Lyon
				</p>
			</div>
		{/if}

		<!-- Thinking dots -->
		{#if phase === 2}
			<div class="flex justify-start msg-enter">
				<div class="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
					<span class="size-1.5 rounded-full bg-muted-foreground/50 dot-1"></span>
					<span class="size-1.5 rounded-full bg-muted-foreground/50 dot-2"></span>
					<span class="size-1.5 rounded-full bg-muted-foreground/50 dot-3"></span>
				</div>
			</div>
		{/if}

		<!-- Tool call -->
		{#if phase >= 3}
			<div class="msg-enter rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5">
				<div class="flex items-center gap-2 font-mono text-[11px]">
					<ZapIcon class="size-3 shrink-0 text-[var(--brand)]" />
					<span class="font-semibold text-[var(--brand)]">searchVehicles</span>
					<span class="text-muted-foreground/50">·</span>
					<span class="text-muted-foreground">destination: "Lyon"</span>
					<span class="ml-auto flex shrink-0 items-center gap-1 text-[oklch(0.48_0.16_150)] dark:text-[oklch(0.72_0.19_150)]">
						<CheckIcon class="size-3" />
						<span>3 dispo.</span>
					</span>
				</div>
			</div>
		{/if}

		<!-- Vehicle proposal -->
		{#if phase >= 4}
			<div class="msg-enter flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3.5 py-2.5">
				<span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
					<CarIcon class="size-4 text-muted-foreground" />
				</span>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-foreground">Peugeot 308 · AB-123-CD</p>
					<p class="text-xs text-muted-foreground">Demain 8h00 → 19h30 · Lyon</p>
				</div>
				<span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-[oklch(0.72_0.19_150)] text-white">
					<CheckIcon class="size-3" />
				</span>
			</div>
		{/if}

		<!-- Confirmation -->
		{#if phase >= 5}
			<div class="flex justify-start msg-enter">
				<p class="max-w-[82%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-foreground">
					Réservation confirmée pour demain 8h. Bon voyage !
				</p>
			</div>
		{/if}
	</div>

	<!-- Input -->
	<div class="border-t border-border/70 p-3">
		<div class="flex items-center gap-2 rounded-xl border border-border bg-background/60 py-2 pr-2 pl-3.5">
			<span class="flex-1 truncate text-sm text-muted-foreground">Parlez à votre Concierge…</span>
			<span
				class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-[var(--brand-foreground)]"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.3);"
			>
				<ArrowUpIcon class="size-4" />
			</span>
		</div>
	</div>
</div>

<style>
	.msg-enter {
		animation: msgIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes msgIn {
		from { opacity: 0; transform: translateY(6px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.dot-1 { animation: dotBounce 1.1s 0ms    ease-in-out infinite; }
	.dot-2 { animation: dotBounce 1.1s 160ms  ease-in-out infinite; }
	.dot-3 { animation: dotBounce 1.1s 320ms  ease-in-out infinite; }

	@keyframes dotBounce {
		0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
		40%           { transform: translateY(-5px); opacity: 1; }
	}
</style>
