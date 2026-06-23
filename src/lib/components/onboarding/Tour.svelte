<script lang="ts" module>
	export interface TourStep {
		selector: string;
		title: string;
		description: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
	}
</script>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Button } from '$lib/components/ui/button/index.js';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		steps: TourStep[];
		active: boolean;
		onComplete: () => void;
		onSkip: () => void;
	}

	let { steps, active, onComplete, onSkip }: Props = $props();

	const TOOLTIP_W = 280;
	const PAD = 10;
	const GAP = 16;

	let stepIdx = $state(0);
	let rect = $state<DOMRect | null>(null);
	let winW = $state(0);
	let winH = $state(0);

	function measureTarget() {
		if (!browser || !active) return;
		const currentStep = steps[stepIdx];
		if (!currentStep) return;
		const el = document.querySelector<HTMLElement>(currentStep.selector);
		if (!el) { rect = null; return; }
		el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
		requestAnimationFrame(() => {
			rect = el.getBoundingClientRect();
		});
	}

	$effect(() => {
		// Track both to re-measure on step change or activation
		void stepIdx;
		void active;
		measureTarget();
	});

	function handleResize() {
		winW = window.innerWidth;
		winH = window.innerHeight;
		measureTarget();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!active) return;
		const onButton = (e.target as HTMLElement).closest('button');
		if (e.key === 'Escape') { e.preventDefault(); onSkip(); }
		else if (e.key === 'ArrowRight' && !onButton) { e.preventDefault(); advance(); }
		else if (e.key === 'ArrowLeft' && !onButton) { e.preventDefault(); back(); }
	}

	onMount(() => {
		winW = window.innerWidth;
		winH = window.innerHeight;
		window.addEventListener('resize', handleResize, { passive: true });
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('resize', handleResize);
		window.removeEventListener('keydown', handleKeydown);
	});

	function advance() {
		if (stepIdx < steps.length - 1) stepIdx++;
		else onComplete();
	}

	function back() {
		if (stepIdx > 0) stepIdx--;
	}

	// Spotlight cutout rect (with padding around target)
	const spot = $derived.by(() => {
		if (!rect) return null;
		return {
			x: rect.left - PAD,
			y: rect.top - PAD,
			w: rect.width + PAD * 2,
			h: rect.height + PAD * 2
		};
	});

	// Compute tooltip position based on target rect + placement preference
	const tipStyle = $derived.by(() => {
		const fallback = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:${TOOLTIP_W}px`;
		if (!rect || !winW || !winH) return fallback;

		const placement = steps[stepIdx]?.placement ?? 'bottom';
		let top: number;
		let left: number;

		switch (placement) {
			case 'right':
				top = rect.top + rect.height / 2 - 100;
				left = rect.right + GAP;
				break;
			case 'left':
				top = rect.top + rect.height / 2 - 100;
				left = rect.left - TOOLTIP_W - GAP;
				break;
			case 'top':
				top = rect.top - 200 - GAP;
				left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
				break;
			default: // bottom
				top = rect.bottom + GAP;
				left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
		}

		// Clamp to viewport
		const clampedLeft = Math.max(8, Math.min(left, winW - TOOLTIP_W - 8));
		const clampedTop = Math.max(8, Math.min(top, winH - 230));

		return `position:fixed;top:${clampedTop}px;left:${clampedLeft}px;width:${TOOLTIP_W}px`;
	});
</script>

{#if active}
	<!-- Backdrop with SVG spotlight cutout -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
	<div
		transition:fade={{ duration: 180 }}
		class="fixed inset-0 z-[9990]"
		aria-hidden="true"
		role="presentation"
		onclick={onSkip}
	>
		{#if spot}
			<svg class="absolute inset-0 h-full w-full" aria-hidden="true">
				<defs>
					<mask id="tour-spotlight-mask">
						<rect width="100%" height="100%" fill="white" />
						<rect
							x={spot.x}
							y={spot.y}
							width={spot.w}
							height={spot.h}
							rx="8"
							fill="black"
						/>
					</mask>
				</defs>
				<!-- Dark overlay with hole -->
				<rect
					width="100%"
					height="100%"
					fill="rgba(0,0,0,0.52)"
					mask="url(#tour-spotlight-mask)"
				/>
				<!-- Subtle ring around the highlighted element -->
				<rect
					x={spot.x}
					y={spot.y}
					width={spot.w}
					height={spot.h}
					rx="8"
					fill="none"
					stroke="white"
					stroke-width="1.5"
					opacity="0.2"
				/>
			</svg>
		{:else}
			<div class="absolute inset-0 bg-black/52"></div>
		{/if}
	</div>

	<!-- Tooltip card -->
	{#key stepIdx}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div
			in:fly={{ y: 6, duration: 200, easing: cubicOut }}
			style={tipStyle}
			class="z-[9991] overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
			role="dialog"
			tabindex="-1"
			aria-live="polite"
			aria-label="Tour guidé"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Progress bar -->
			<div class="h-0.5 bg-border">
				<div
					class="h-full bg-primary transition-all duration-300 ease-out"
					style="width: {((stepIdx + 1) / steps.length) * 100}%"
				></div>
			</div>

			<div class="p-4">
				<!-- Header: counter + close -->
				<div class="mb-2.5 flex items-center justify-between">
					<span class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
						{stepIdx + 1} / {steps.length}
					</span>
					<button
						onclick={onSkip}
						class="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label="Ignorer le tour"
					>
						<XIcon class="size-3.5" />
					</button>
				</div>

				<h3 class="mb-1.5 text-sm font-semibold leading-snug">{steps[stepIdx]?.title}</h3>
				<p class="mb-4 text-xs leading-relaxed text-muted-foreground">
					{steps[stepIdx]?.description}
				</p>

				<!-- Navigation buttons -->
				<div class="flex items-center gap-2">
					{#if stepIdx > 0}
						<Button variant="ghost" size="sm" onclick={back} class="h-7 px-2 text-xs">
							← Précédent
						</Button>
					{/if}
					<Button size="sm" onclick={advance} class="ml-auto h-7 px-3 text-xs">
						{stepIdx === steps.length - 1 ? 'Terminer ✓' : 'Suivant →'}
					</Button>
				</div>
			</div>

			<!-- Step dots -->
			<div class="flex justify-center gap-1 pb-3">
				{#each steps as _, i}
					<div
						class="h-1 rounded-full transition-all duration-200
							{i === stepIdx ? 'w-4 bg-primary' : i < stepIdx ? 'w-1 bg-primary/30' : 'w-1 bg-border'}"
					></div>
				{/each}
			</div>
		</div>
	{/key}
{/if}
