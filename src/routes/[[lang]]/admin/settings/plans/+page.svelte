<script lang="ts">
	import { useQuery, useAction } from '@mmailaender/convex-svelte';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import MailIcon from '@lucide/svelte/icons/mail';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import UsersIcon from '@lucide/svelte/icons/users';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import DevPlanActivator from '$lib/components/billing/DevPlanActivator.svelte';

	const subscriptionQuery = useQuery(api.paddle.getMySubscription, {});
	const portalAction = useAction(api.paddle.getPortalUrl);

	const billingQ = useQuery((api as any).billing.getBillingStatus, {});
	const convexClient = useConvexClient();

	const billingStatus = $derived(billingQ.data);

	// Effective tier drives the UI
	const effectiveTier = $derived(billingStatus?.tier ?? null);
	const isDev = $derived(billingStatus?.isDev ?? false);
	const paddleTier = $derived(subscriptionQuery.data?.paddlePlanTier ?? null);
	const isPaddleActive = $derived(
		subscriptionQuery.data?.paddleStatus === 'active' ||
			subscriptionQuery.data?.paddleStatus === 'trialing'
	);
	const periodEnd = $derived(
		subscriptionQuery.data?.paddleCurrentPeriodEnd
			? new Date(subscriptionQuery.data.paddleCurrentPeriodEnd).toLocaleDateString('fr-FR', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: null
	);
	const seatsAllowed = $derived(billingStatus?.seatsAllowed ?? null);
	const seatsUsed = $derived(billingStatus?.seatsUsed ?? 0);
	const trialDaysLeft = $derived(billingStatus?.trialDaysLeft ?? null);
	const trialEndsAt = $derived(billingStatus?.trialEndsAt ?? null);
	const hasPaddleKey = !!import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
	const isSandbox = import.meta.env.VITE_PADDLE_SANDBOX === 'true';

	// Seats gauge
	const seatsPct = $derived(
		seatsAllowed && seatsAllowed < 9999 && seatsAllowed > 0
			? Math.min(100, Math.round((seatsUsed / seatsAllowed) * 100))
			: null
	);
	const seatGaugeColor = $derived(
		seatsPct === null
			? 'bg-primary'
			: seatsPct >= 90
				? 'bg-destructive'
				: seatsPct >= 70
					? 'bg-amber-500'
					: 'bg-emerald-500'
	);

	const trialEndFormatted = $derived(
		trialEndsAt
			? new Date(trialEndsAt).toLocaleDateString('fr-FR', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: null
	);

	// Plan display data
	const PLAN_META: Record<string, { label: string; desc: string; price: string; color: string }> = {
		essential: {
			label: 'Essential',
			desc: 'Gestion flotte & réservations',
			color: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
			price: '490 € / mois'
		},
		professional: {
			label: 'Professional',
			desc: 'Conformité & intégrations comptables',
			color: 'bg-[var(--brand)]/12 text-[var(--brand)]',
			price: '890 € / mois'
		},
		business: {
			label: 'Business',
			desc: 'Suite IA complète',
			color: 'bg-violet-500/12 text-violet-700 dark:text-violet-400',
			price: '1 490 € / mois'
		},
		enterprise: {
			label: 'Enterprise',
			desc: 'Conducteurs illimités, SLA dédié',
			color: 'bg-primary/10 text-primary',
			price: 'Sur devis'
		},
		trial: {
			label: 'Essai',
			desc: 'Accès Professional — essai 15 jours',
			color: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
			price: 'Gratuit'
		},
		dev: {
			label: 'Dev',
			desc: 'Accès illimité — environnement développement',
			color: 'bg-[var(--brand)]/12 text-[var(--brand)]',
			price: 'Illimité'
		}
	};

	const currentMeta = $derived(
		effectiveTier ? (PLAN_META[effectiveTier] ?? PLAN_META['essential']) : null
	);

	// Features per tier (client-side mirror of backend PLAN_FEATURES)
	const FEATURES: { key: string; label: string; tiers: string[] }[] = [
		{
			key: 'concierge',
			label: 'Agent Concierge IA',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'fleet',
			label: 'Gestion flotte & calendrier',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'reservations',
			label: 'Réservations & planification',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'notifications',
			label: 'Notifications email',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'expenses',
			label: 'Notes de frais IK',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'drivers',
			label: 'Gestion conducteurs & permis',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'incidents',
			label: 'Sinistres & contraventions',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'maintenance',
			label: 'Maintenance & alertes',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'finance',
			label: 'Suivi financier & coûts',
			tiers: ['essential', 'professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'xero',
			label: 'Sync Xero',
			tiers: ['professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'quickbooks',
			label: 'Sync QuickBooks',
			tiers: ['professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'bik',
			label: 'Avantage en nature BiK UK',
			tiers: ['professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'compliance',
			label: 'Agent Compliance Officer',
			tiers: ['professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'csrd',
			label: 'Durabilité CSRD / ESG',
			tiers: ['professional', 'business', 'enterprise', 'trial', 'dev']
		},
		{
			key: 'optimizer',
			label: 'Optimiseur de flotte IA',
			tiers: ['business', 'enterprise', 'dev']
		},
		{ key: 'coach', label: 'Coach conducteurs', tiers: ['business', 'enterprise', 'dev'] },
		{
			key: 'negotiator',
			label: 'Agent Négociateur coûts',
			tiers: ['business', 'enterprise', 'dev']
		}
	];

	const includedFeatures = $derived(
		effectiveTier ? FEATURES.filter((f) => f.tiers.includes(effectiveTier!)) : []
	);
	const excludedFeatures = $derived(
		effectiveTier ? FEATURES.filter((f) => !f.tiers.includes(effectiveTier!)) : []
	);

	// Dev plan restore / simulate
	let devPlanLoading = $state(false);
	let simulateLoading = $state<string | null>(null);

	async function activateDevPlan() {
		devPlanLoading = true;
		try {
			await convexClient.mutation((api as any).billing.activateDevPlan, {});
			toast.success('Plan dev illimité activé.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			devPlanLoading = false;
		}
	}

	async function simulatePlan(tier: string | undefined) {
		simulateLoading = tier ?? 'dev';
		try {
			await convexClient.mutation((api as any).billing.setSimulatedTier, { tier });
			if (tier) toast.success(`Simulation plan ${tier} activée.`);
			else toast.success('Retour en mode dev illimité.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			simulateLoading = null;
		}
	}

	// "Change plan" collapsible
	let showChangePlan = $state(false);
	const isDevCurrent = $derived(effectiveTier === 'dev');

	// Trial + plan selection (when no plan active)
	let trialLoading = $state(false);
	const showTrialCTA = $derived(
		billingStatus != null && billingStatus.tier === 'none' && !billingStatus.isDev
	);
	const isOnTrial = $derived(effectiveTier === 'trial');
	const hasActivePlan = $derived(effectiveTier !== null && effectiveTier !== 'none');

	async function startTrial() {
		trialLoading = true;
		try {
			await convexClient.mutation((api as any).billing.startFreeTrial, {});
			toast.success('Essai gratuit démarré — 15 jours accès Professional !');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			trialLoading = false;
		}
	}

	// Paddle checkout
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

	let isPaddleLoading = $state<string | null>(null);
	let isPortalLoading = $state(false);

	async function handleCheckout(tierId: string) {
		if (!hasPaddleKey) return;
		const priceId = PADDLE_PRICES[tierId];
		if (!priceId) {
			toast.error('Prix non configuré — contactez le support.');
			return;
		}

		isPaddleLoading = tierId;
		try {
			await ensurePaddle();
			const orgId = subscriptionQuery.data?.organizationId as string | undefined;
			(window as PaddleWindow).Paddle?.Checkout.open({
				items: [{ priceId, quantity: 1 }],
				customData: { organization_id: orgId },
				successUrl: `${page.url.origin}/admin/settings/plans?subscribed=true`
			});
		} catch {
			toast.error('Erreur lors du paiement. Réessayez ou contactez le support.');
		} finally {
			isPaddleLoading = null;
		}
	}

	async function handleManageBilling() {
		isPortalLoading = true;
		try {
			const url = await portalAction({});
			if (url) window.location.href = url;
			else toast.error('Portail indisponible — contactez le support.');
		} catch {
			toast.error("Impossible d'ouvrir le portail de facturation.");
		} finally {
			isPortalLoading = false;
		}
	}

	const statusLabel: Record<string, string> = {
		active: 'Actif',
		trialing: 'Essai Paddle',
		paused: 'Suspendu',
		past_due: 'Impayé',
		canceled: 'Résilié'
	};

	// Full plan list for the no-plan selection grid
	type PlanDef = {
		id: string;
		price: string;
		sub: string;
		seats: string;
		features: string[];
		cta: 'checkout' | 'contact';
		popular: boolean;
	};
	const PLANS_FULL: PlanDef[] = [
		{
			id: 'essential',
			price: '490 €',
			sub: '/ mois',
			seats: '50 conducteurs',
			features: [
				'Agent Concierge IA',
				'Calendrier & gestion flotte',
				'Réservations & notifications',
				'Import flotte CSV',
				'Support standard'
			],
			cta: 'checkout',
			popular: false
		},
		{
			id: 'professional',
			price: '890 €',
			sub: '/ mois',
			seats: '150 conducteurs',
			features: [
				"Tout l'Essential",
				'Sync Xero & QuickBooks',
				'Compliance Officer (BiK UK, CSRD lite)',
				'Gestion des permis conducteurs',
				'Suivi sinistres & contraventions'
			],
			cta: 'checkout',
			popular: true
		},
		{
			id: 'business',
			price: '1 490 €',
			sub: '/ mois',
			seats: '300 conducteurs',
			features: [
				'Tout le Professional',
				'Optimiseur de flotte (insights IA hebdo)',
				'Agent Négociateur de coûts',
				'Coach conducteurs (éco-conduite)',
				'Conseils IA avantages en nature'
			],
			cta: 'checkout',
			popular: false
		},
		{
			id: 'enterprise',
			price: 'Sur devis',
			sub: '',
			seats: 'Conducteurs illimités',
			features: [
				'Toutes les fonctionnalités Business',
				'Intégrations sur mesure',
				'Account manager dédié',
				'Garanties SLA',
				'Onboarding personnalisé'
			],
			cta: 'contact',
			popular: false
		}
	];

	const PLANS_FOR_CHANGE = [
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

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-base font-semibold">Plan & facturation</h2>
		<p class="text-sm text-muted-foreground">Gérez votre abonnement Mycelium Fleet OS</p>
	</div>

	<!-- Dev plan activator (only in dev mode) -->
	<DevPlanActivator />

	{#if billingQ.isLoading}
		<Skeleton class="h-40 w-full rounded-xl" />
		<div class="grid grid-cols-3 gap-4">
			<Skeleton class="h-24 rounded-xl" />
			<Skeleton class="h-24 rounded-xl" />
			<Skeleton class="h-24 rounded-xl" />
		</div>
	{:else if hasActivePlan && currentMeta}
		<!-- ═══════════════════════════════════════════════════════════════
		     ACTIVE PLAN VIEW
		     ═══════════════════════════════════════════════════════════════ -->

		<!-- Hero card -->
		<Card.Root class="overflow-hidden">
			<!-- Subtle top accent -->
			{#if effectiveTier === 'professional' || effectiveTier === 'trial'}
				<div class="h-px bg-linear-to-r from-transparent via-[var(--brand)] to-transparent"></div>
			{:else if effectiveTier === 'business'}
				<div class="h-px bg-linear-to-r from-transparent via-violet-500 to-transparent"></div>
			{/if}
			<Card.Content class="p-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<!-- Left: plan info -->
					<div class="flex items-start gap-4">
						<div
							class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40"
						>
							{#if effectiveTier === 'dev'}
								<TerminalIcon class="size-5 text-[var(--brand)]" />
							{:else if effectiveTier === 'trial'}
								<ZapIcon class="size-5 text-amber-500" />
							{:else}
								<CreditCardIcon class="size-5 text-muted-foreground" />
							{/if}
						</div>
						<div>
							<div class="flex items-center gap-2">
								<span class="text-lg font-semibold">{currentMeta.label}</span>
								<span
									class="rounded-full px-2 py-0.5 text-[11px] font-semibold {currentMeta.color}"
								>
									{#if effectiveTier === 'dev'}
										Dev
									{:else if effectiveTier === 'trial'}
										Essai · {trialDaysLeft}j
									{:else}
										{statusLabel[subscriptionQuery.data?.paddleStatus ?? ''] ?? 'Actif'}
									{/if}
								</span>
							</div>
							<p class="mt-0.5 text-sm text-muted-foreground">{currentMeta.desc}</p>
							<p class="mt-1 text-base font-semibold">{currentMeta.price}</p>
						</div>
					</div>

					<!-- Right: actions -->
					<div class="flex shrink-0 flex-wrap gap-2">
						{#if isPaddleActive}
							<Button
								variant="outline"
								size="sm"
								onclick={handleManageBilling}
								disabled={isPortalLoading}
							>
								{isPortalLoading ? 'Chargement...' : 'Gérer la facturation'}
							</Button>
						{/if}
						<Button
							size="sm"
							class={isOnTrial ? 'bg-[var(--brand)] text-black hover:bg-[var(--brand)]/90' : ''}
							variant={isOnTrial ? 'default' : 'outline'}
							onclick={() => {
								showChangePlan = !showChangePlan;
							}}
						>
							{#if isOnTrial}
								<ArrowUpRightIcon class="mr-1.5 size-3.5" />
								Souscrire maintenant
							{:else}
								Changer de plan
							{/if}
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Stats row -->
		<div class="grid gap-4 sm:grid-cols-3">
			<!-- Seats gauge -->
			<Card.Root>
				<Card.Content class="p-5">
					<div class="mb-3 flex items-center gap-2">
						<UsersIcon class="size-4 text-muted-foreground" />
						<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase"
							>Conducteurs</span
						>
					</div>
					{#if seatsAllowed && seatsAllowed >= 9999}
						<p class="text-2xl font-bold">
							{seatsUsed} <span class="text-base font-normal text-muted-foreground">/ ∞</span>
						</p>
						<p class="mt-1 text-xs text-muted-foreground">Illimité (dev)</p>
					{:else if seatsAllowed}
						<p class="text-2xl font-bold">
							{seatsUsed}
							<span class="text-base font-normal text-muted-foreground">/ {seatsAllowed}</span>
						</p>
						<div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full transition-all {seatGaugeColor}"
								style="width: {seatsPct}%"
							></div>
						</div>
						<p class="mt-1.5 text-xs text-muted-foreground">
							{seatsAllowed - seatsUsed} place{seatsAllowed - seatsUsed !== 1 ? 's' : ''} disponible{seatsAllowed -
								seatsUsed !==
							1
								? 's'
								: ''}
						</p>
					{:else}
						<p class="text-2xl font-bold">{seatsUsed}</p>
						<p class="mt-1 text-xs text-muted-foreground">conducteurs actifs</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Next event -->
			<Card.Root>
				<Card.Content class="p-5">
					<div class="mb-3 flex items-center gap-2">
						<CalendarIcon class="size-4 text-muted-foreground" />
						<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							{effectiveTier === 'trial' ? "Fin d'essai" : 'Renouvellement'}
						</span>
					</div>
					{#if effectiveTier === 'trial' && trialEndFormatted}
						<p class="text-sm font-semibold">{trialEndFormatted}</p>
						{#if trialDaysLeft !== null}
							<p
								class="mt-1 text-xs {trialDaysLeft <= 3
									? 'text-destructive'
									: trialDaysLeft <= 7
										? 'text-amber-600 dark:text-amber-400'
										: 'text-muted-foreground'}"
							>
								{trialDaysLeft} jour{trialDaysLeft !== 1 ? 's' : ''} restant{trialDaysLeft !== 1
									? 's'
									: ''}
							</p>
						{/if}
					{:else if periodEnd}
						<p class="text-sm font-semibold">{periodEnd}</p>
						<p class="mt-1 text-xs text-muted-foreground">Renouvellement automatique</p>
					{:else if effectiveTier === 'dev'}
						<p class="text-sm font-semibold">∞</p>
						<p class="mt-1 text-xs text-muted-foreground">Pas d'expiration</p>
					{:else}
						<p class="text-sm text-muted-foreground">Non défini</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Overage / usage note -->
			<Card.Root>
				<Card.Content class="p-5">
					<div class="mb-3 flex items-center gap-2">
						<CreditCardIcon class="size-4 text-muted-foreground" />
						<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase"
							>Dépassement</span
						>
					</div>
					<p class="text-sm font-semibold">5 – 8 € / conducteur</p>
					<p class="mt-1 text-xs text-muted-foreground">Par mois au-delà du quota inclus</p>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Features included -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="text-sm font-medium">Fonctionnalités incluses</Card.Title>
			</Card.Header>
			<Card.Content class="pt-0">
				<div class="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each includedFeatures as f (f.key)}
						<div class="flex items-center gap-2 text-sm">
							<CheckIcon class="size-3.5 shrink-0 text-emerald-500" />
							{f.label}
						</div>
					{/each}
					{#each excludedFeatures as f (f.key)}
						<div class="flex items-center gap-2 text-sm text-muted-foreground/50">
							<XIcon class="size-3.5 shrink-0" />
							{f.label}
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Change plan (collapsible) -->
		<div>
			<button
				type="button"
				class="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50"
				onclick={() => {
					showChangePlan = !showChangePlan;
				}}
			>
				<span>Changer de plan</span>
				{#if showChangePlan}
					<ChevronUpIcon class="size-4 text-muted-foreground" />
				{:else}
					<ChevronDownIcon class="size-4 text-muted-foreground" />
				{/if}
			</button>

			{#if showChangePlan}
				<div class="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
					<!-- Dev plan card — always shown in change section -->
					<div
						class="relative flex flex-col rounded-xl border p-4
							{isDevCurrent
							? 'border-[var(--brand)]/40 bg-[var(--brand)]/4 ring-1 ring-[var(--brand)]/20'
							: 'border-border bg-card'}"
					>
						{#if isDevCurrent}
							<div
								class="absolute inset-x-0 -top-px h-px rounded-t-xl bg-linear-to-r from-transparent via-[var(--brand)] to-transparent"
							></div>
							<span
								class="absolute top-3 right-3 rounded-full bg-[var(--brand)]/12 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--brand)] uppercase"
							>
								Actuel
							</span>
						{/if}

						<div class="mb-1 flex items-center gap-1.5">
							<TerminalIcon class="size-3.5 text-[var(--brand)]" />
							<p class="text-sm font-semibold">Dev</p>
						</div>
						<div class="mt-0.5 flex items-baseline gap-1">
							<span class="text-xl font-bold">Illimité</span>
						</div>
						<p class="mt-0.5 mb-3 text-xs text-muted-foreground">
							Toutes les fonctionnalités, conducteurs illimités
						</p>

						<ul class="mb-4 flex flex-1 flex-col gap-1.5">
							{#each ['Toutes les fonctionnalités', 'Conducteurs illimités', 'Sans restriction'] as f (f)}
								<li class="flex items-start gap-1.5 text-xs">
									<CheckIcon class="mt-0.5 size-3 shrink-0 text-[var(--brand)]" />
									{f}
								</li>
							{/each}
						</ul>

						{#if isDevCurrent}
							<Button variant="outline" class="w-full text-xs" disabled>
								<TerminalIcon class="mr-1.5 size-3" />
								Plan actuel
							</Button>
						{:else if !hasPaddleKey}
							<!-- Dev sans Paddle: reset simulation -->
							<Button
								variant="outline"
								class="w-full border-[var(--brand)]/30 text-xs text-[var(--brand)] hover:bg-[var(--brand)]/8"
								onclick={() => simulatePlan(undefined)}
								disabled={simulateLoading === 'dev'}
							>
								{#if simulateLoading === 'dev'}<LoaderCircleIcon
										class="mr-1.5 size-3 motion-safe:animate-spin"
									/>{/if}
								Retour dev illimité
							</Button>
						{:else}
							<!-- Paddle configuré: activer devPlan réel -->
							<Button
								variant="outline"
								class="w-full border-[var(--brand)]/30 text-xs text-[var(--brand)] hover:bg-[var(--brand)]/8"
								onclick={activateDevPlan}
								disabled={devPlanLoading}
							>
								{#if devPlanLoading}<LoaderCircleIcon
										class="mr-1.5 size-3 motion-safe:animate-spin"
									/>{/if}
								Revenir en dev
							</Button>
						{/if}
					</div>

					{#each PLANS_FOR_CHANGE as plan (plan.id)}
						{@const isCurrent =
							effectiveTier === plan.id ||
							(effectiveTier === 'trial' && plan.id === 'professional')}
						{@const loading = isPaddleLoading === plan.id}
						<div
							class="relative flex flex-col rounded-xl border p-4
								{plan.popular ? 'border-[var(--brand)]/35' : 'border-border'}
								{isCurrent ? 'ring-1 ring-primary/30' : ''}"
						>
							{#if plan.popular}
								<div
									class="absolute inset-x-0 -top-px h-px rounded-t-xl bg-linear-to-r from-transparent via-[var(--brand)] to-transparent"
								></div>
							{/if}
							{#if isCurrent}
								<span
									class="absolute top-3 right-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase"
								>
									{effectiveTier === 'trial' ? 'Essai actif' : 'Actuel'}
								</span>
							{/if}

							<p class="text-sm font-semibold">{plan.name}</p>
							<div class="mt-0.5 flex items-baseline gap-1">
								<span class="text-xl font-bold">{plan.price}</span>
								<span class="text-xs text-muted-foreground">{plan.sub}</span>
							</div>
							<p class="mt-0.5 mb-3 text-xs text-muted-foreground">{plan.seats}</p>

							<ul class="mb-4 flex flex-1 flex-col gap-1.5">
								{#each plan.features as feature (feature)}
									<li class="flex items-start gap-1.5 text-xs">
										<CheckIcon class="mt-0.5 size-3 shrink-0 text-emerald-500" />
										{feature}
									</li>
								{/each}
							</ul>

							{#if !hasPaddleKey}
								<!-- Dev sans Paddle: simulation directe -->
								{#if isCurrent}
									<Button variant="outline" class="w-full text-xs" disabled>
										Plan simulé actif
									</Button>
								{:else}
									<Button
										class="w-full text-xs {plan.popular
											? 'bg-[var(--brand)] text-black hover:bg-[var(--brand)]/90'
											: ''}"
										variant={plan.popular ? 'default' : 'outline'}
										onclick={() => simulatePlan(plan.id)}
										disabled={simulateLoading === plan.id}
									>
										{simulateLoading === plan.id ? 'Application...' : `Simuler ${plan.name}`}
									</Button>
								{/if}
							{:else if isCurrent && isPaddleActive}
								<Button
									variant="outline"
									class="w-full text-xs"
									onclick={handleManageBilling}
									disabled={isPortalLoading}
								>
									{isPortalLoading ? '...' : 'Gérer'}
								</Button>
							{:else if isCurrent && effectiveTier === 'trial'}
								<Button
									class="w-full bg-[var(--brand)] text-xs text-black hover:bg-[var(--brand)]/90"
									onclick={() => handleCheckout(plan.id)}
									disabled={loading || isPaddleLoading !== null}
								>
									{loading ? 'Traitement...' : 'Souscrire maintenant'}
								</Button>
							{:else}
								<Button
									class="w-full text-xs {plan.popular
										? 'bg-[var(--brand)] text-black hover:bg-[var(--brand)]/90'
										: ''}"
									variant={plan.popular ? 'default' : 'outline'}
									onclick={() => handleCheckout(plan.id)}
									disabled={loading || isPaddleLoading !== null}
								>
									{loading ? 'Traitement...' : isCurrent ? 'Plan actuel' : 'Changer'}
								</Button>
							{/if}
						</div>
					{/each}
				</div>

				<div
					class="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
				>
					<p class="text-xs text-muted-foreground">Plus de 300 conducteurs ?</p>
					<Button
						variant="ghost"
						size="sm"
						class="h-7 gap-1.5 text-xs"
						onclick={() => {
							window.location.href =
								'mailto:sales@mycelium.io?subject=Devis Enterprise Mycelium Fleet OS';
						}}
					>
						<MailIcon class="size-3.5" />
						Contacter les ventes
					</Button>
				</div>
			{/if}
		</div>
	{:else}
		<!-- ═══════════════════════════════════════════════════════════════
		     NO PLAN — SELECTION VIEW (fallback; modal normally intercepts)
		     ═══════════════════════════════════════════════════════════════ -->

		<!-- Trial CTA -->
		{#if showTrialCTA}
			<div
				class="flex flex-col gap-3 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/6 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="flex items-start gap-3">
					<ZapIcon class="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
					<div>
						<p class="text-sm font-medium">Essai gratuit de 15 jours</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							Accès complet au plan Professional. Aucune carte bancaire requise.
						</p>
					</div>
				</div>
				<Button
					class="shrink-0 bg-[var(--brand)] text-black hover:bg-[var(--brand)]/90"
					onclick={startTrial}
					disabled={trialLoading}
				>
					{#if trialLoading}<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />{/if}
					Démarrer l'essai gratuit
				</Button>
			</div>
		{/if}

		<!-- Plan cards -->
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each PLANS_FULL as plan (plan.id)}
				{@const meta = PLAN_META[plan.id]}
				{@const loading = isPaddleLoading === plan.id}

				<Card.Root class="relative flex flex-col {plan.popular ? 'border-[var(--brand)]/35' : ''}">
					{#if plan.popular}
						<div
							class="absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-[var(--brand)] to-transparent"
						></div>
						<span
							class="absolute top-3 right-3 rounded-full bg-[var(--brand)]/12 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--brand)] uppercase"
						>
							Recommandé
						</span>
					{/if}

					<Card.Header class="pb-3">
						<Card.Title class="text-base">{meta?.label ?? plan.id}</Card.Title>
						<div class="flex items-baseline gap-1">
							<span class="text-3xl font-bold">{plan.price}</span>
							{#if plan.sub}
								<span class="text-sm text-muted-foreground">{plan.sub}</span>
							{/if}
						</div>
						<p class="text-sm text-muted-foreground">{meta?.desc ?? ''}</p>
						<p class="flex items-center gap-1 text-xs font-medium text-foreground/70">
							<UsersIcon class="size-3" />
							{plan.seats}
						</p>
					</Card.Header>

					<Card.Content class="flex flex-1 flex-col">
						<ul class="flex flex-col gap-2">
							{#each plan.features as feature (feature)}
								<li class="flex items-start gap-2 text-sm">
									<CheckIcon class="mt-0.5 size-4 shrink-0 text-emerald-500" />
									{feature}
								</li>
							{/each}
						</ul>
					</Card.Content>

					<Card.Footer class="pt-0">
						{#if plan.cta === 'contact'}
							<Button
								variant="outline"
								class="w-full"
								onclick={() => {
									window.location.href =
										'mailto:sales@mycelium.io?subject=Devis Enterprise Mycelium Fleet OS';
								}}
							>
								<MailIcon class="size-4" />
								Contacter les ventes
							</Button>
						{:else if !hasPaddleKey}
							<Button variant="outline" class="w-full opacity-50" disabled
								>Paddle non configuré</Button
							>
						{:else}
							<Button
								class="w-full {plan.popular
									? 'bg-[var(--brand)] text-black hover:bg-[var(--brand)]/90'
									: ''}"
								variant={plan.popular ? 'default' : 'outline'}
								onclick={() => handleCheckout(plan.id)}
								disabled={loading || isPaddleLoading !== null}
							>
								{loading ? 'Traitement...' : `Choisir ${meta?.label ?? plan.id}`}
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>

		<div class="rounded-lg border border-border bg-muted/30 p-4">
			<p class="text-sm font-medium">Dépassement de quota</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Au-delà du quota conducteurs inclus, chaque conducteur supplémentaire est facturé 5 € à 8 €
				/ mois selon le plan.
			</p>
		</div>
	{/if}
</div>
