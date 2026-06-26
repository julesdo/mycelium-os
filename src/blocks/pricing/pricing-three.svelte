<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import Check from '@lucide/svelte/icons/check';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { useQuery, useAction } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { localizedHref } from '$lib/utils/i18n';
	import { useSearchParams } from 'runed/kit';
	import { pricingParamsSchema } from '$lib/schemas/pricing-params';
	import { T, getTranslate } from '@tolgee/svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { haptic } from '$lib/hooks/use-haptic.svelte';

	const subscriptionQuery = useQuery(api.paddle.getMySubscription, {});
	const portalAction = useAction(api.paddle.getPortalUrl);
	const { isAuthenticated } = useAuth();

	const params = useSearchParams(pricingParamsSchema, {
		pushHistory: false
	});

	const PADDLE_PRICES: Record<string, string> = {
		essential: import.meta.env.VITE_PADDLE_PRICE_ESSENTIAL ?? '',
		professional: import.meta.env.VITE_PADDLE_PRICE_PROFESSIONAL ?? '',
		business: import.meta.env.VITE_PADDLE_PRICE_BUSINESS ?? ''
	};

	const currentTier = $derived(subscriptionQuery.data?.paddlePlanTier ?? null);
	const isActive = $derived(
		subscriptionQuery.data?.paddleStatus === 'active' ||
			subscriptionQuery.data?.paddleStatus === 'trialing'
	);

	const { t } = getTranslate();

	function getFeatureKeys(tierPath: string): string[] {
		const keys = ['0', '1', '2', '3', '4', '5'];
		return keys.filter((key) => {
			const fullKey = `${tierPath}.${key}`;
			const value = $t(fullKey, { orEmpty: true });
			// eslint-disable-next-line no-irregular-whitespace
			const clean = value?.replace(/[​-‍⁠﻿]/g, '').trim();
			return clean && clean.length > 0 && clean !== fullKey;
		});
	}

	const essentialFeatureKeys = $derived(getFeatureKeys('pricing.features.essential'));
	const professionalFeatureKeys = $derived(getFeatureKeys('pricing.features.professional'));
	const businessFeatureKeys = $derived(getFeatureKeys('pricing.features.business'));
	const enterpriseFeatureKeys = $derived(getFeatureKeys('pricing.features.enterprise'));

	let isPaddleLoading = $state(false);
	let isPortalLoading = $state(false);

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
		const isSandbox = import.meta.env.VITE_PADDLE_SANDBOX === 'true';
		await new Promise<void>((resolve) => {
			const script = document.createElement('script');
			script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
			script.onload = () => {
				const paddle = (window as PaddleWindow).Paddle;
				if (paddle) {
					if (isSandbox) paddle.Environment.set(paddle.Environment.sandbox);
					paddle.Initialize({ token });
				}
				resolve();
			};
			document.head.appendChild(script);
		});
	}

	async function handleCheckout(tier: string) {
		if (!isAuthenticated) {
			const redirectUrl = localizedHref('/signin');
			const currentUrl = page.url.pathname;
			const redirectWithCheckout = `${currentUrl}?checkout=${tier}`;
			goto(resolve(`${redirectUrl}?redirectTo=${encodeURIComponent(redirectWithCheckout)}`));
			return;
		}

		const priceId = PADDLE_PRICES[tier];
		if (!priceId) {
			goto(resolve(localizedHref('/admin/settings/plans')));
			return;
		}

		isPaddleLoading = true;
		try {
			await ensurePaddle();
			const orgId = subscriptionQuery.data?.organizationId as string | undefined;
			(window as PaddleWindow).Paddle?.Checkout.open({
				items: [{ priceId, quantity: 1 }],
				customData: { organization_id: orgId },
				successUrl: `${page.url.origin}/admin/settings/plans?subscribed=true`
			});
		} catch (err) {
			haptic.trigger('error');
			toast.error($t('billing.checkout_failed'));
			console.error('Checkout failed:', err);
		} finally {
			isPaddleLoading = false;
		}
	}

	async function handleManageBilling() {
		isPortalLoading = true;
		try {
			const url = await portalAction({});
			if (url) {
				window.location.href = url;
			} else {
				goto(resolve(localizedHref('/admin/settings/plans')));
			}
		} catch (err) {
			haptic.trigger('error');
			toast.error($t('billing.portal_failed'));
			console.error('Billing portal failed:', err);
		} finally {
			isPortalLoading = false;
		}
	}

	$effect(() => {
		if (params.checkout && isAuthenticated) {
			handleCheckout(params.checkout);
			params.checkout = '';
		}
	});
</script>

<section class="py-16 md:py-24">
	<div class="mx-auto max-w-7xl px-6 lg:px-12">
		<div class="mt-12 gap-4 sm:grid sm:grid-cols-2 md:mt-24">
			<div class="sm:w-3/5">
				<h1 class="text-3xl font-bold sm:text-4xl">
					<T keyName="pricing.title" />
				</h1>
			</div>
			<div class="mt-6 sm:mt-0">
				<p>
					<T keyName="pricing.description" />
				</p>
			</div>
		</div>

		<div class="mt-12 grid gap-6 sm:grid-cols-2 md:mt-24 lg:grid-cols-4">
			<!-- Essential -->
			<Card>
				<CardHeader>
					<CardTitle class="font-medium">
						<T keyName="pricing.tiers.essential.name" />
						{#if currentTier === 'essential' && isActive}
							<span class="ml-2 text-xs font-normal text-muted-foreground">
								<T keyName="pricing.current_plan_badge" />
							</span>
						{/if}
					</CardTitle>
					<span class="my-3 block text-2xl font-semibold">
						<T keyName="pricing.tiers.essential.price" />
					</span>
					<CardDescription class="text-sm">
						<T keyName="pricing.tiers.essential.description" />
					</CardDescription>
					{#if currentTier === 'essential' && isActive}
						<Button
							variant="outline"
							class="mt-4 w-full"
							onclick={handleManageBilling}
							disabled={isPortalLoading}
						>
							{#if isPortalLoading}
								<T keyName="pricing.buttons.loading" />
							{:else}
								<T keyName="pricing.tiers.essential.button_manage" />
							{/if}
						</Button>
					{:else}
						<Button
							variant="outline"
							class="mt-4 w-full"
							onclick={() => handleCheckout('essential')}
							disabled={isPaddleLoading}
						>
							{#if isPaddleLoading}
								<T keyName="pricing.buttons.loading" />
							{:else}
								<T keyName="pricing.tiers.essential.button" />
							{/if}
						</Button>
					{/if}
				</CardHeader>
				<CardContent class="space-y-4 pb-6">
					<hr class="border-dashed" />
					<ul class="list-outside space-y-3 text-sm">
						{#each essentialFeatureKeys as key (key)}
							<li class="flex items-center gap-2">
								<Check class="size-3" />
								<T keyName="pricing.features.essential.{key}" />
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>

			<!-- Professional — Popular -->
			<Card class="relative overflow-visible">
				<span
					class="absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full bg-linear-to-br/increasing from-purple-400 to-amber-300 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-white/20 ring-offset-1 ring-offset-gray-950/5 ring-inset"
				>
					<T keyName="pricing.popular_badge" />
				</span>
				<CardHeader>
					<CardTitle class="font-medium">
						<T keyName="pricing.tiers.professional.name" />
						{#if currentTier === 'professional' && isActive}
							<span class="ml-2 text-xs font-normal text-muted-foreground">
								<T keyName="pricing.current_plan_badge" />
							</span>
						{/if}
					</CardTitle>
					<span class="my-3 block text-2xl font-semibold">
						<T keyName="pricing.tiers.professional.price" />
					</span>
					<CardDescription class="text-sm">
						<T keyName="pricing.tiers.professional.description" />
					</CardDescription>
					{#if currentTier === 'professional' && isActive}
						<Button
							data-testid="pricing-manage-professional"
							variant="outline"
							class="mt-4 w-full"
							onclick={handleManageBilling}
							disabled={isPortalLoading}
						>
							{#if isPortalLoading}
								<T keyName="pricing.buttons.loading" />
							{:else}
								<T keyName="pricing.tiers.professional.button_manage" />
							{/if}
						</Button>
					{:else}
						<Button
							data-testid="pricing-checkout-professional"
							class="mt-4 w-full"
							onclick={() => handleCheckout('professional')}
							disabled={isPaddleLoading}
						>
							{#if isPaddleLoading}
								<T keyName="pricing.tiers.professional.button_loading" />
							{:else}
								<T keyName="pricing.tiers.professional.button" />
							{/if}
						</Button>
					{/if}
				</CardHeader>
				<CardContent class="space-y-4 pb-6">
					<hr class="border-dashed" />
					<ul class="list-outside space-y-3 text-sm">
						{#each professionalFeatureKeys as key (key)}
							<li class="flex items-center gap-2">
								<Check class="size-3" />
								<T keyName="pricing.features.professional.{key}" />
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>

			<!-- Business -->
			<Card>
				<CardHeader>
					<CardTitle class="font-medium">
						<T keyName="pricing.tiers.business.name" />
						{#if currentTier === 'business' && isActive}
							<span class="ml-2 text-xs font-normal text-muted-foreground">
								<T keyName="pricing.current_plan_badge" />
							</span>
						{/if}
					</CardTitle>
					<span class="my-3 block text-2xl font-semibold">
						<T keyName="pricing.tiers.business.price" />
					</span>
					<CardDescription class="text-sm">
						<T keyName="pricing.tiers.business.description" />
					</CardDescription>
					{#if currentTier === 'business' && isActive}
						<Button
							data-testid="pricing-manage-business"
							variant="outline"
							class="mt-4 w-full"
							onclick={handleManageBilling}
							disabled={isPortalLoading}
						>
							{#if isPortalLoading}
								<T keyName="pricing.buttons.loading" />
							{:else}
								<T keyName="pricing.tiers.business.button_manage" />
							{/if}
						</Button>
					{:else}
						<Button
							data-testid="pricing-checkout-business"
							class="mt-4 w-full"
							onclick={() => handleCheckout('business')}
							disabled={isPaddleLoading}
						>
							{#if isPaddleLoading}
								<T keyName="pricing.tiers.business.button_loading" />
							{:else}
								<T keyName="pricing.tiers.business.button" />
							{/if}
						</Button>
					{/if}
				</CardHeader>
				<CardContent class="space-y-4 pb-6">
					<hr class="border-dashed" />
					<ul class="list-outside space-y-3 text-sm">
						{#each businessFeatureKeys as key (key)}
							<li class="flex items-center gap-2">
								<Check class="size-3" />
								<T keyName="pricing.features.business.{key}" />
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>

			<!-- Enterprise — contact -->
			<Card>
				<CardHeader>
					<CardTitle class="font-medium">
						<T keyName="pricing.tiers.enterprise.name" />
					</CardTitle>
					<span class="my-3 block text-2xl font-semibold">
						<T keyName="pricing.tiers.enterprise.price" />
					</span>
					<CardDescription class="text-sm">
						<T keyName="pricing.tiers.enterprise.description" />
					</CardDescription>
					<Button variant="outline" class="mt-4 w-full" href="mailto:sales@mycelium.io">
						<T keyName="pricing.tiers.enterprise.button" />
					</Button>
				</CardHeader>
				<CardContent class="space-y-4 pb-6">
					<hr class="border-dashed" />
					<ul class="list-outside space-y-3 text-sm">
						{#each enterpriseFeatureKeys as key (key)}
							<li class="flex items-center gap-2">
								<Check class="size-3" />
								<T keyName="pricing.features.enterprise.{key}" />
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>
		</div>
	</div>
</section>
