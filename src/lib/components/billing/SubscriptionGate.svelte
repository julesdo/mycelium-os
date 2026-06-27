<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { localizedHref } from '$lib/utils/i18n';
	import type { PlanFeature } from '$lib/convex/billing.js';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import LockIcon from '@lucide/svelte/icons/lock';

	interface Props {
		feature: PlanFeature;
		requiredPlan?: 'professional' | 'business';
		children?: Snippet;
	}

	let { feature, requiredPlan = 'professional', children }: Props = $props();

	const billingQ = useQuery((api as any).billing.getBillingStatus, {});
	const status = $derived(billingQ.data);

	const PLAN_LABELS: Record<string, string> = {
		professional: 'Professional',
		business: 'Business'
	};

	const hasAccess = $derived(() => {
		if (billingQ.isLoading) return true; // Optimistic while loading
		if (!status) return false;
		const { tier } = status;
		if (tier === 'dev' || tier === 'enterprise') return true;
		if (tier === 'business') return true;
		if (tier === 'professional') return requiredPlan === 'professional';
		if (tier === 'essential') return requiredPlan === 'professional';
		return false; // free / none
	});
</script>

{#if hasAccess()}
	{@render children?.()}
{:else}
	<div
		class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center"
	>
		<div class="flex size-10 items-center justify-center rounded-full bg-muted">
			<LockIcon class="size-5 text-muted-foreground" />
		</div>
		<div>
			<p class="text-sm font-medium text-foreground">
				Fonctionnalité réservée au plan {PLAN_LABELS[requiredPlan] ?? requiredPlan}
			</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Votre plan actuel ne donne pas accès à cette fonctionnalité.
			</p>
		</div>
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a href={localizedHref('/admin/settings/plans')}>
			<Button size="sm" class="bg-[var(--brand)] text-black hover:bg-[var(--brand)]/90">
				<ZapIcon class="mr-1.5 size-3.5" />
				Passer à {PLAN_LABELS[requiredPlan] ?? requiredPlan}
			</Button>
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
{/if}
