<script lang="ts">
	import { useQuery, useAction } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { page } from '$app/state';
	import { localizedHref } from '$lib/utils/i18n';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import XIcon from '@lucide/svelte/icons/x';
	import { browser } from '$app/environment';

	const billingQ = useQuery((api as any).billing.getBillingStatus, {});
	const status = $derived(billingQ.data);

	let dismissed = $state(false);

	$effect(() => {
		if (!browser) return;
		const key = `mycelium:trial-banner:${status?.trialEndsAt ?? ''}`;
		dismissed = !!localStorage.getItem(key);
	});

	function dismiss() {
		if (!browser || !status?.trialEndsAt) return;
		localStorage.setItem(`mycelium:trial-banner:${status.trialEndsAt}`, '1');
		dismissed = true;
	}

	const show = $derived(
		!dismissed && status != null && status.tier === 'trial' && status.trialDaysLeft != null
	);

	const urgency = $derived(
		status?.trialDaysLeft != null
			? status.trialDaysLeft <= 3
				? 'high'
				: status.trialDaysLeft <= 7
					? 'mid'
					: 'low'
			: 'low'
	);
</script>

{#if show && status}
	<div
		class="flex items-center gap-3 px-4 py-2 text-sm
		{urgency === 'high'
			? 'border-b border-destructive/20 bg-destructive/10 text-destructive'
			: urgency === 'mid'
				? 'border-b border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400'
				: 'border-b border-[var(--brand)]/15 bg-[var(--brand)]/8 text-foreground'}"
	>
		<ZapIcon class="size-3.5 shrink-0" />
		<span class="flex-1">
			Essai gratuit —
			<strong class="font-semibold">
				{#if status.trialDaysLeft === 0}
					expire aujourd'hui
				{:else if status.trialDaysLeft === 1}
					1 jour restant
				{:else}
					{status.trialDaysLeft} jours restants
				{/if}
			</strong>
			(plan Professional). Souscrivez pour ne pas perdre l'accès.
		</span>
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a href={localizedHref('/admin/settings/plans')}>
			<Button
				size="sm"
				class="h-6 bg-[var(--brand)] px-2.5 text-xs text-black hover:bg-[var(--brand)]/90"
			>
				Choisir un plan
			</Button>
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		<!-- eslint-disable local/no-hardcoded-aria-label -->
		<button
			type="button"
			onclick={dismiss}
			class="rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
			aria-label="Masquer"
		>
			<XIcon class="size-3.5" />
		</button>
		<!-- eslint-enable local/no-hardcoded-aria-label -->
	</div>
{/if}
