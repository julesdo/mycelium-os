<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import Logo from '$lib/components/icons/logo.svelte';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const org = useQuery((api as any).organizations.getMyOrg, {});

	const isExpiredDemo = $derived(
		(org.data as any)?.isDemo === true && (org.data as any)?.demoConfig?.isExpired === true
	);

	const config = $derived((org.data as any)?.demoConfig ?? null);
	const orgName = $derived((org.data as any)?.name ?? '');
</script>

{#if isExpiredDemo && config}
	<!-- Overlay infranchissable — pas de bouton fermer, pas d'Échap -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-[9999] flex items-center justify-center"
		style="backdrop-filter: blur(8px); background: oklch(0 0 0 / 0.65);"
		onkeydown={(e) => e.preventDefault()}
		role="dialog"
		aria-modal="true"
		aria-label="Votre démo a expiré"
	>
		<div
			class="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 24px 64px oklch(0 0 0 / 0.4)"
		>
			<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

			<div class="space-y-6 p-8">
				<!-- Logo + titre -->
				<div class="space-y-3 text-center">
					<div
						class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand)]"
						style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
					>
						<Logo class="size-8 text-[var(--brand-foreground)]" />
					</div>
					<div>
						<h2 class="text-xl font-semibold">Votre essai Mycelium est terminé.</h2>
						<p class="mt-1 text-sm text-muted-foreground">{orgName}</p>
					</div>
					<p class="text-sm text-muted-foreground">
						Votre période de démo a expiré. Continuez à piloter votre flotte en souscrivant à un abonnement.
					</p>
				</div>

				<!-- 3 CTAs -->
				<div class="space-y-3">
					<!-- CTA 1 : Appel -->
					<a
						href="tel:{config.commercialPhone}"
						class="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
						style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
					>
						<PhoneIcon class="size-4" />
						Appeler {config.commercialName}
					</a>

					<!-- CTA 2 : Calendly -->
					{#if config.commercialCalendlyUrl}
						<a
							href={config.commercialCalendlyUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
						>
							<CalendarIcon class="size-4" />
							Prendre rendez-vous
						</a>
					{/if}

					<!-- CTA 3 : Paddle checkout Essential -->
					<button
						type="button"
						class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
						onclick={() => {
							if (typeof window !== 'undefined' && (window as any).Paddle) {
								(window as any).Paddle.Checkout.open({
									items: [{ priceId: 'pri_essential', quantity: 1 }]
								});
							}
						}}
					>
						<CheckCircleIcon class="size-4 text-[var(--brand)]" />
						S'abonner maintenant
					</button>
				</div>

				<p class="text-center text-xs text-muted-foreground">
					Des questions ? <a href="mailto:demo@mycelium.io" class="underline hover:text-foreground">demo@mycelium.io</a>
				</p>
			</div>
		</div>
	</div>
{/if}
