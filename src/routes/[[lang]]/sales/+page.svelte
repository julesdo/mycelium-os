<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const prospects = useQuery((api as any)['sales/prospects'].listMyProspects, {});

	const pipelineSummary = $derived.by(() => {
		const data = (prospects.data as any[]) ?? [];
		const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
		return {
			total: data.length,
			demos: data.filter((p) => p.stage === 'demo').length,
			negotiation: data.filter((p) => p.stage === 'negotiation').length,
			wonThisMonth: data.filter((p) => p.stage === 'won' && p.lastActivityAt > monthAgo).length
		};
	});

	const greeting = $derived.by(() => {
		const h = new Date().getHours();
		if (h < 12) return 'Bonjour';
		if (h < 18) return 'Bon après-midi';
		return 'Bonsoir';
	});
</script>

<div class="mx-auto max-w-lg space-y-4 p-4 lg:max-w-none lg:p-6">
	<!-- Salutation -->
	<div class="pt-1">
		<h1 class="text-xl font-semibold">{greeting} 👋</h1>
		<p class="text-sm text-muted-foreground">
			{new Date().toLocaleDateString('fr-FR', {
				weekday: 'long',
				day: 'numeric',
				month: 'long'
			})}
		</p>
	</div>

	<!-- Pipeline résumé -->
	<div
		class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
		style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 2px 8px oklch(0 0 0 / 0.06)"
	>
		<div
			class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
		></div>

		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-semibold">Pipeline</h2>
			<span class="text-xs text-muted-foreground">{pipelineSummary.total} prospects</span>
		</div>

		<div class="grid grid-cols-3 gap-3">
			{#each [
				{ label: 'Démos actives', value: pipelineSummary.demos, color: 'text-amber-500' },
				{ label: 'En négociation', value: pipelineSummary.negotiation, color: 'text-blue-500' },
				{ label: 'Gagnés ce mois', value: pipelineSummary.wonThisMonth, color: 'text-emerald-500' }
			] as stat}
				<div class="text-center">
					<p class="text-2xl font-bold {stat.color}">{stat.value}</p>
					<p class="text-[11px] text-muted-foreground">{stat.label}</p>
				</div>
			{/each}
		</div>

		<a
			href={resolve(localizedHref('/sales/pipeline'))}
			class="mt-3 block text-xs font-medium text-[var(--brand-foreground)] hover:underline"
		>
			Voir le pipeline →
		</a>
	</div>

	<!-- Défi en cours — placeholder P37 -->
	<div
		class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
		style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
	>
		<div
			class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
		></div>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-semibold">Défi de la semaine</h2>
			<span class="text-xs font-medium text-orange-500">🔥 Streak : 0j</span>
		</div>
		<p class="text-xs text-muted-foreground">Les défis arrivent bientôt. Revenez vite !</p>
		<a
			href={resolve(localizedHref('/sales/challenges'))}
			class="mt-2 block text-xs font-medium text-[var(--brand-foreground)] hover:underline"
		>
			Voir les défis →
		</a>
	</div>

	<!-- CTA Nouvelle démo -->
	<Button
		href={resolve(localizedHref('/concierge/demos/new'))}
		class="w-full min-h-[44px] bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
		style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
	>
		<PlusIcon class="mr-2 size-4" />
		Créer une démo prospect
	</Button>

	<!-- CTA Ajouter un prospect -->
	<Button
		href={resolve(localizedHref('/sales/pipeline/new'))}
		variant="outline"
		class="w-full min-h-[44px]"
	>
		<PlusIcon class="mr-2 size-4" />
		Ajouter un prospect
	</Button>
</div>
