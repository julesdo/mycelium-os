<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import HealthScoreBanner from '$lib/components/fleet-care/health-score-banner.svelte';
	import ThisMonthSection from '$lib/components/fleet-care/this-month-section.svelte';
	import NextMonthSection from '$lib/components/fleet-care/next-month-section.svelte';
	import TalkToConciergeButton from '$lib/components/fleet-care/talk-to-concierge-button.svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const summaryQ = useQuery((api as any).concierge.clientPortal.getFleetCareSummary, {});

	const summary = $derived(summaryQ.data);
	const isLoading = $derived(summaryQ.isLoading);

	// Guard : requireOrgAdmin throws → data stays undefined after load
	$effect(() => {
		if (!isLoading && summary === undefined) {
			goto(resolve(localizedHref('/app')));
		}
	});
</script>

<div class="flex flex-col gap-5 px-4 pb-24 pt-5 lg:pb-10 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div>
		<h1 class="text-xl font-black tracking-tight">Votre flotte</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			{#if summary}
				Tableau de bord Fleet Care — {summary.orgName}
			{:else}
				Tableau de bord Fleet Care
			{/if}
		</p>
	</div>

	{#if isLoading}
		<div class="flex flex-col gap-4">
			<Skeleton class="h-24 w-full rounded-2xl" />
			<Skeleton class="h-6 w-40 rounded-full" />
			<Skeleton class="h-16 w-full rounded-xl" />
			<Skeleton class="h-16 w-full rounded-xl" />
			<Skeleton class="h-6 w-40 rounded-full" />
			<Skeleton class="h-16 w-full rounded-xl" />
		</div>

	{:else if summary}
		<!-- Score banner -->
		<HealthScoreBanner
			score={summary.healthScore}
			completedThisMonthCount={summary.completedThisMonth.length}
			openCount={summary.openCount}
		/>

		<!-- Two sections: completed / upcoming -->
		<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
			<ThisMonthSection items={summary.completedThisMonth} />
			<NextMonthSection items={summary.upcomingNextMonth} />
		</div>

		<!-- Concierge CTA -->
		<TalkToConciergeButton />
	{/if}

</div>
