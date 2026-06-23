<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import MailIcon from '@lucide/svelte/icons/mail';

	const orgQuery = useQuery(api.organizations.getMyOrg, {});

	const PLANS = [
		{
			id: 'flat' as const,
			name: 'Forfait Flat',
			price: '290 €',
			period: '/mois',
			description: 'Idéal pour les flottes de moins de 30 véhicules',
			features: [
				"Jusqu'à 30 véhicules",
				'Utilisateurs illimités',
				'Calendrier temps réel',
				'Notifications email',
				'Agent Concierge IA',
				'Support prioritaire'
			]
		},
		{
			id: 'per_seat' as const,
			name: 'Par utilisateur',
			price: '9 €',
			period: '/utilisateur/mois',
			description: 'Pour les entreprises avec plus de 30 véhicules',
			features: [
				'Véhicules illimités',
				'Facturation au salarié actif',
				'Calendrier temps réel',
				'Notifications email',
				'Agent Concierge IA',
				'Support prioritaire'
			]
		}
	];

	const currentPlan = $derived(orgQuery.data?.plan ?? null);
</script>

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-base font-semibold">Plan & facturation</h2>
		<p class="text-sm text-muted-foreground">Votre abonnement Mycelium Fleet OS</p>
	</div>

	<!-- Current plan -->
	{#if orgQuery.isLoading}
		<Skeleton class="h-16 w-full rounded-lg" />
	{:else if orgQuery.data}
		<div
			class="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
		>
			<CreditCardIcon class="size-5 shrink-0 text-primary" />
			<div>
				<p class="text-sm font-medium">
					Plan actuel :
					<span class="text-primary">
						{currentPlan === 'flat' ? 'Forfait Flat — 290 €/mois' : 'Par utilisateur — 9 €/utilisateur/mois'}
					</span>
				</p>
				<p class="text-xs text-muted-foreground">{orgQuery.data.name}</p>
			</div>
		</div>
	{/if}

	<!-- Plan cards -->
	<div class="grid gap-4 sm:grid-cols-2">
		{#each PLANS as plan (plan.id)}
			<Card.Root
				class="relative transition-shadow {currentPlan === plan.id
					? 'border-primary shadow-sm ring-1 ring-primary/20'
					: ''}"
			>
				{#if currentPlan === plan.id}
					<div
						class="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
					>
						Plan actuel
					</div>
				{/if}
				<Card.Header class="pb-3">
					<Card.Title class="text-base">{plan.name}</Card.Title>
					<div class="flex items-baseline gap-1">
						<span class="text-3xl font-bold">{plan.price}</span>
						<span class="text-sm text-muted-foreground">{plan.period}</span>
					</div>
					<p class="text-sm text-muted-foreground">{plan.description}</p>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					<ul class="flex flex-col gap-2">
						{#each plan.features as feature (feature)}
							<li class="flex items-center gap-2 text-sm">
								<CheckIcon class="size-4 shrink-0 text-emerald-500" />
								{feature}
							</li>
						{/each}
					</ul>
				</Card.Content>
				<Card.Footer>
					{#if currentPlan === plan.id}
						<Button variant="outline" class="w-full" disabled>Plan actuel</Button>
					{:else}
						<Button
							variant="outline"
							class="w-full"
							onclick={() => {
								window.location.href = `mailto:hello@mycelium.fr?subject=Changement de plan — ${plan.name}`;
							}}
						>
							<MailIcon class="size-4" />
							Demander ce plan
						</Button>
					{/if}
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>

	<!-- Contact block -->
	<div class="rounded-lg border border-border bg-muted/30 p-4">
		<p class="text-sm font-medium">Besoin d'un devis personnalisé ?</p>
		<p class="mt-1 text-sm text-muted-foreground">
			Pour les grandes flottes ou des besoins spécifiques, contactez-nous directement.
		</p>
		<Button
			variant="outline"
			size="sm"
			class="mt-3"
			onclick={() => {
				window.location.href = 'mailto:hello@mycelium.fr?subject=Devis personnalisé';
			}}
		>
			<MailIcon class="size-4" />
			Contacter l'équipe
		</Button>
	</div>
</div>
