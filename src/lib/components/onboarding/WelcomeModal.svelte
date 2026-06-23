<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import CheckIcon from '@lucide/svelte/icons/check';

	interface Props {
		open: boolean;
		userName?: string;
		/** 'admin' shows 3-slide onboarding; 'app' shows single employee welcome */
		mode?: 'admin' | 'app';
		onDone: () => void;
	}

	let { open = $bindable(false), userName = '', mode = 'admin', onDone }: Props = $props();

	let slide = $state(0);
	let dir = $state(1);

	interface Slide {
		emoji: string;
		eyebrow: string;
		title: string;
		body: string;
		cta: string;
		video?: boolean;
	}

	const allSlides = $derived.by((): Slide[] => {
		const first = userName ? userName.split(' ')[0] : '';
		const greeting = first ? `Bonjour, ${first} !` : 'Bienvenue dans Mycelium';

		if (mode === 'app') {
			return [
				{
					emoji: '💬',
					eyebrow: 'Bienvenue',
					title: greeting,
					body: 'Pour réserver un véhicule, parlez simplement au Concierge. Dites par exemple : "Réserve-moi une voiture pour lundi matin".',
					cta: 'Parler au Concierge →'
				}
			];
		}

		return [
			{
				emoji: '🌿',
				eyebrow: 'Bienvenue',
				title: greeting,
				body: 'Votre flotte de véhicules partagés, enfin simple. Centralisez, réservez, optimisez — en quelques minutes.',
				cta: 'Voyons ça →'
			},
			{
				emoji: '🚗',
				eyebrow: 'Étape 1',
				title: 'Importez votre flotte en 2 minutes',
				body: "Un fichier CSV suffit. Déposez-le et vos véhicules sont disponibles immédiatement à la réservation pour toute l'entreprise.",
				cta: 'Compris →'
			},
			{
				emoji: '💬',
				eyebrow: 'Étape 2',
				title: 'Vos salariés réservent en parlant',
				body: "\"Réserve-moi un véhicule pour lundi matin\" — c'est tout. Le Concierge IA gère la réservation sans formulaire ni email.",
				cta: 'Démarrer le tour',
				video: true
			}
		];
	});

	const currentSlide = $derived(allSlides[slide] ?? allSlides[0]!);

	function goTo(i: number) {
		dir = i > slide ? 1 : -1;
		slide = i;
	}

	function next() {
		if (slide < allSlides.length - 1) goTo(slide + 1);
		else finish();
	}

	function prev() {
		if (slide > 0) goTo(slide - 1);
	}

	function finish() {
		open = false;
		onDone();
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) finish(); }}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content showCloseButton={false} class="max-w-[420px] gap-0 overflow-hidden p-0">
			<!-- Slide body -->
			<div class="relative min-h-[220px] overflow-hidden">
				{#key slide}
					<div
						in:fly={{ x: dir * 24, duration: 240, easing: cubicOut, delay: 30 }}
						class="px-8 pt-8 pb-6"
					>
						<div class="flex flex-col items-center gap-3 text-center">
							<span class="text-4xl leading-none" role="img" aria-label={currentSlide.eyebrow}>
								{currentSlide.emoji}
							</span>
							<div>
								<p class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
									{currentSlide.eyebrow}
								</p>
								<h2 class="text-lg font-bold tracking-tight">{currentSlide.title}</h2>
							</div>

							{#if currentSlide.video}
								<div class="flex w-full aspect-video items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
									Démo vidéo — bientôt disponible
								</div>
							{/if}

							<p class="text-sm leading-relaxed text-muted-foreground">
								{currentSlide.body}
							</p>
						</div>
					</div>
				{/key}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t border-border px-6 py-4">
				<!-- Dots (hidden for single-slide app modal) -->
				{#if allSlides.length > 1}
					<div class="flex gap-1.5" role="tablist" aria-label="Navigation slides">
						{#each allSlides as _, i}
							<button
								role="tab"
								aria-selected={i === slide}
								aria-label="Slide {i + 1}"
								onclick={() => goTo(i)}
								class="h-1.5 rounded-full transition-all duration-300 ease-out
									{i === slide
									? 'w-5 bg-primary'
									: i < slide
										? 'w-1.5 bg-primary/30'
										: 'w-1.5 bg-border hover:bg-muted-foreground/40'}"
							></button>
						{/each}
					</div>
				{:else}
					<div></div>
				{/if}

				<div class="flex items-center gap-2">
					{#if slide > 0}
						<Button variant="ghost" size="sm" onclick={prev}>Précédent</Button>
					{:else}
						<button
							onclick={finish}
							class="text-xs text-muted-foreground underline-offset-2 hover:underline"
						>
							Passer
						</button>
					{/if}
					<Button size="sm" onclick={next}>
						{#if slide === allSlides.length - 1}
							<CheckIcon class="size-3.5" />
						{/if}
						{currentSlide.cta}
					</Button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
