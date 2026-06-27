<script lang="ts">
	import { useQuery, useAction } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';

	const billingQ = useQuery((api as any).billing.getBillingStatus, {});
	const membershipQ = useQuery(api.organizations.getMyOrgMembership, {});
	const portalAction = useAction(api.paddle.getPortalUrl);

	const status = $derived(billingQ.data);
	const membership = $derived(membershipQ.data);

	const hasPaddleKey = !!import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
	const isSandbox = import.meta.env.VITE_PADDLE_SANDBOX === 'true';

	// Don't show on the plans page itself — user is already there
	const isOnPlansPage = $derived(page.url.pathname.includes('/settings/plans'));

	const shouldShow = $derived(
		!billingQ.isLoading &&
			!membershipQ.isLoading &&
			status != null &&
			(status.tier === 'none' || status.tier === 'free') &&
			membership?.role === 'ORG_ADMIN' &&
			!isOnPlansPage
	);

	const PADDLE_PRICES: Record<string, string> = {
		essential: import.meta.env.VITE_PADDLE_PRICE_ESSENTIAL ?? '',
		professional: import.meta.env.VITE_PADDLE_PRICE_PROFESSIONAL ?? '',
		business: import.meta.env.VITE_PADDLE_PRICE_BUSINESS ?? ''
	};

	type PaddleWindow = typeof window & {
		Paddle?: {
			Environment: { set: (env: unknown) => void; sandbox: unknown };
			Initialize: (opts: { token: string }) => void;
			Checkout: {
				open: (opts: {
					items: Array<{ priceId: string; quantity: number }>;
					customData?: Record<string, string | undefined>;
					successUrl: string;
				}) => void;
			};
		};
	};

	async function ensurePaddle(): Promise<void> {
		if (typeof window === 'undefined') return;
		if ((window as PaddleWindow).Paddle) return;
		const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
		if (!token) return;
		await new Promise<void>((res) => {
			const script = document.createElement('script');
			script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
			script.onload = () => {
				const paddle = (window as PaddleWindow).Paddle;
				if (paddle) {
					if (isSandbox) paddle.Environment.set(paddle.Environment.sandbox);
					paddle.Initialize({ token });
				}
				res();
			};
			document.head.appendChild(script);
		});
	}

	let checkoutLoading = $state<string | null>(null);

	async function handleCheckout(tierId: string) {
		if (!hasPaddleKey) return;
		const priceId = PADDLE_PRICES[tierId];
		if (!priceId) {
			toast.error('Prix non configuré — contactez le support.');
			return;
		}

		checkoutLoading = tierId;
		try {
			await ensurePaddle();
			(window as PaddleWindow).Paddle?.Checkout.open({
				items: [{ priceId, quantity: 1 }],
				customData: {},
				successUrl: `${page.url.origin}${page.url.pathname}`
			});
		} catch {
			toast.error('Erreur lors du paiement. Réessayez ou contactez le support.');
		} finally {
			checkoutLoading = null;
		}
	}

	const PLANS = [
		{
			id: 'essential',
			name: 'Essential',
			price: '490 €',
			sub: '/ mois',
			seats: '50 conducteurs',
			features: [
				'Agent Concierge IA',
				'Gestion flotte & calendrier',
				'Réservations & notifications'
			],
			popular: false
		},
		{
			id: 'professional',
			name: 'Professional',
			price: '890 €',
			sub: '/ mois',
			seats: '150 conducteurs',
			features: ["Tout l'Essential", 'Sync Xero & QuickBooks', 'BiK UK & Compliance Officer'],
			popular: true
		},
		{
			id: 'business',
			name: 'Business',
			price: '1 490 €',
			sub: '/ mois',
			seats: '300 conducteurs',
			features: [
				'Tout le Professional',
				'Optimiseur de flotte IA',
				'Coach conducteurs & Négociateur'
			],
			popular: false
		}
	];
</script>

<Dialog.Root open={shouldShow}>
	<Dialog.Content
		showCloseButton={false}
		escapeKeydownBehavior="ignore"
		interactOutsideBehavior="ignore"
		class="gap-0 overflow-hidden p-0 sm:max-w-3xl"
	>
		<!-- Header -->
		<div class="px-8 pt-8 pb-6">
			<div class="mb-4 flex items-center gap-2">
				<div class="flex size-7 items-center justify-center rounded-md bg-[var(--brand)]">
					<svg viewBox="0 0 16 16" fill="none" class="size-4">
						<path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" fill="black" />
					</svg>
				</div>
				<span class="text-sm font-semibold tracking-tight">Mycelium Fleet OS</span>
			</div>
			<h2 class="text-xl font-semibold tracking-tight">Choisissez votre plan</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Vous êtes sur le plan gratuit. Passez à un plan payant pour débloquer toutes les
				fonctionnalités.
			</p>
		</div>

		<!-- Plan cards -->
		<div class="grid grid-cols-3 gap-3 px-8 pb-6">
			{#each PLANS as plan (plan.id)}
				{@const loading = checkoutLoading === plan.id}
				<div
					class="relative flex flex-col rounded-xl border p-4
					{plan.popular ? 'border-[var(--brand)]/40 bg-[var(--brand)]/4' : 'border-border bg-card'}"
				>
					{#if plan.popular}
						<div
							class="absolute inset-x-0 -top-px h-px rounded-t-xl bg-linear-to-r from-transparent via-[var(--brand)] to-transparent"
						></div>
						<span
							class="absolute top-3 right-3 rounded-full bg-[var(--brand)]/12 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--brand)] uppercase"
						>
							Recommandé
						</span>
					{/if}

					<div class="mb-3">
						<p class="text-sm font-semibold">{plan.name}</p>
						<div class="mt-1 flex items-baseline gap-1">
							<span class="text-2xl font-bold">{plan.price}</span>
							<span class="text-xs text-muted-foreground">{plan.sub}</span>
						</div>
						<p class="mt-0.5 text-xs text-muted-foreground">{plan.seats}</p>
					</div>

					<ul class="mb-4 flex flex-1 flex-col gap-1.5">
						{#each plan.features as feature (feature)}
							<li class="flex items-start gap-1.5 text-xs">
								<CheckIcon class="mt-0.5 size-3 shrink-0 text-emerald-500" />
								{feature}
							</li>
						{/each}
					</ul>

					{#if !hasPaddleKey}
						<Button variant="outline" class="w-full text-xs" disabled>Paddle non configuré</Button>
					{:else}
						<Button
							class="w-full text-xs {plan.popular
								? 'bg-[var(--brand)] text-black hover:bg-[var(--brand)]/90'
								: ''}"
							variant={plan.popular ? 'default' : 'outline'}
							onclick={() => handleCheckout(plan.id)}
							disabled={loading || checkoutLoading !== null}
						>
							{#if loading}<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />{/if}
							{loading ? 'Traitement...' : `Choisir ${plan.name}`}
						</Button>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-between border-t border-border bg-muted/30 px-8 py-4">
			<p class="text-xs text-muted-foreground">
				Plus de 300 conducteurs ?
				<a
					href="mailto:sales@mycelium.io?subject=Devis Enterprise Mycelium Fleet OS"
					class="text-foreground underline-offset-2 hover:underline"
				>
					Contactez-nous pour un devis Enterprise
				</a>
			</p>
			<div class="flex items-center gap-1 text-[10px] text-muted-foreground/60">
				<svg viewBox="0 0 16 16" fill="none" class="size-3">
					<path d="M8 1L15 5V11L8 15L1 11V5L8 1Z" fill="currentColor" opacity="0.4" />
				</svg>
				Paiement sécurisé par Paddle
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
