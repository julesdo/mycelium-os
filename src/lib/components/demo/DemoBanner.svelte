<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	const org = useQuery(api.organizations.getMyOrg, {});

	const isDemo = $derived((org.data as any)?.isDemo === true);
	const config = $derived((org.data as any)?.demoConfig ?? null);

	const daysLeft = $derived.by(() => {
		if (!config) return null;
		const diff = config.expiresAt - Date.now();
		return Math.ceil(diff / (1000 * 60 * 60 * 24));
	});
</script>

{#if isDemo && config}
	<div class="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs">
		<span class="text-amber-700 dark:text-amber-400 font-medium">
			Environnement démo
			{#if daysLeft !== null && daysLeft > 0}
				&middot; Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
			{:else if daysLeft !== null && daysLeft <= 0}
				&middot; Expirée
			{/if}
		</span>
		<div class="flex items-center gap-3">
			{#if config.commercialCalendlyUrl}
				<a
					href={config.commercialCalendlyUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1 text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
				>
					<CalendarIcon class="size-3" />
					Prendre RDV
				</a>
			{/if}
			<a
				href="tel:{config.commercialPhone}"
				class="flex items-center gap-1 font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
			>
				<PhoneIcon class="size-3" />
				{config.commercialName}
			</a>
		</div>
	</div>
{/if}
