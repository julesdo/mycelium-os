<script lang="ts">
	import { cn } from '$lib/utils.js';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		open: boolean;
		targetName: string;
		targetEmail: string;
		action: 'promote' | 'add'; // promote = concierge → super_admin, add = nouvel ajout direct
		onconfirm: () => void;
		oncancel: () => void;
	}

	let { open, targetName, targetEmail, action, onconfirm, oncancel }: Props = $props();

	const DURATION = 10;
	let remaining = $state(DURATION);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	// Démarre / arrête le timer selon l'état d'ouverture
	$effect(() => {
		if (open) {
			remaining = DURATION;
			intervalId = setInterval(() => {
				remaining -= 1;
				if (remaining <= 0) {
					clearInterval(intervalId!);
					intervalId = null;
					oncancel(); // ferme automatiquement = annulation
				}
			}, 1000);
		} else {
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
	});

	function handleConfirm() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		onconfirm();
	}

	function handleCancel() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		oncancel();
	}

	// Progression du cercle SVG
	const RADIUS = 20;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
	const progress = $derived(remaining / DURATION);
	const dashoffset = $derived(CIRCUMFERENCE * (1 - progress));

	// Couleur du timer selon urgence
	const timerColor = $derived(
		remaining > 6 ? 'text-amber-500' : remaining > 3 ? 'text-orange-500' : 'text-destructive'
	);
	const strokeColor = $derived(remaining > 6 ? '#f59e0b' : remaining > 3 ? '#f97316' : '#ef4444');
</script>

{#if open}
	<!-- Overlay -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		onclick={handleCancel}
	>
		<!-- Modale -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/30 bg-card shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Gradient top -->
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgb(251_191_36_/_0.6),transparent)]"
			></div>

			<!-- Bande d'alerte en haut -->
			<div class="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-5 py-3">
				<ShieldIcon class="size-4 text-amber-500" />
				<span class="text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
					Action sensible — Super Admin
				</span>
			</div>

			<div class="p-6">
				<!-- Timer + message principal -->
				<div class="mb-5 flex items-start gap-4">
					<!-- Cercle countdown -->
					<div class="relative shrink-0">
						<svg width="52" height="52" viewBox="0 0 52 52" class="rotate-[-90deg]">
							<!-- Piste -->
							<circle
								cx="26"
								cy="26"
								r={RADIUS}
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								class="text-muted"
							/>
							<!-- Arc de progression -->
							<circle
								cx="26"
								cy="26"
								r={RADIUS}
								fill="none"
								stroke={strokeColor}
								stroke-width="3"
								stroke-linecap="round"
								stroke-dasharray={CIRCUMFERENCE}
								stroke-dashoffset={dashoffset}
								class="transition-all duration-1000 ease-linear"
							/>
						</svg>
						<span
							class={cn(
								'absolute inset-0 flex items-center justify-center font-mono text-lg font-bold tabular-nums',
								timerColor
							)}
						>
							{remaining}
						</span>
					</div>

					<div>
						<p class="text-sm font-semibold text-foreground">
							{action === 'promote'
								? 'Promouvoir au rang Super Admin ?'
								: 'Ajouter directement comme Super Admin ?'}
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							La fenêtre se ferme automatiquement dans
							<span class={cn('font-bold tabular-nums', timerColor)}>{remaining}s</span>
							si vous ne confirmez pas.
						</p>
					</div>
				</div>

				<!-- Cible -->
				<div class="mb-5 rounded-xl border border-border bg-muted/50 px-4 py-3">
					<p class="text-xs font-medium text-muted-foreground">Utilisateur concerné</p>
					<p class="mt-0.5 text-sm font-bold text-foreground">{targetName}</p>
					<p class="text-xs text-muted-foreground">{targetEmail}</p>
				</div>

				<!-- Avertissement -->
				<div class="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
					<p class="text-xs text-amber-700 dark:text-amber-300">
						<span class="font-semibold">Ce que ça implique :</span> accès complet à toutes les organisations
						clients, au billing, à la gestion de l'équipe Mycelium et à toutes les mutations sensibles.
						À réserver aux fondateurs et à la direction technique.
					</p>
				</div>

				<!-- Actions -->
				<div class="flex gap-3">
					<button
						type="button"
						onclick={handleCancel}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<XIcon class="size-3.5" />
						Annuler
					</button>
					<button
						type="button"
						onclick={handleConfirm}
						class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
					>
						<ShieldIcon class="size-3.5" />
						Confirmer Super Admin
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
