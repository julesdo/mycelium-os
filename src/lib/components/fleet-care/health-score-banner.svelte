<script lang="ts">
	interface Props {
		score: number;
		completedThisMonthCount: number;
		openCount: number;
	}

	let { score, completedThisMonthCount, openCount }: Props = $props();

	const headline = $derived(
		score >= 90
			? 'Votre flotte est en excellente forme'
			: score >= 75
				? 'Votre flotte est en bonne forme'
				: 'Votre concierge est à l\'œuvre'
	);

	const sub = $derived(
		completedThisMonthCount > 0
			? `${completedThisMonthCount} action${completedThisMonthCount > 1 ? 's' : ''} réalisée${completedThisMonthCount > 1 ? 's' : ''} ce mois-ci`
			: openCount > 0
				? `${openCount} sujet${openCount > 1 ? 's' : ''} en cours de traitement`
				: 'Aucun point d\'attention détecté'
	);

	const scoreColorClass = $derived(
		score >= 90 ? 'text-emerald-500' : score >= 75 ? 'text-sky-500' : 'text-amber-500'
	);

	const accentColor = $derived(
		score >= 90
			? 'oklch(0.696 0.17 162.48 / 0.09)'
			: score >= 75
				? 'oklch(0.623 0.214 259.815 / 0.09)'
				: 'oklch(0.769 0.188 70.08 / 0.09)'
	);
</script>

<div class="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-glass-card">
	<!-- Glass reflection -->
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/14"></div>
	<!-- Score-tinted accent -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-20"
		style="background: linear-gradient(to bottom, {accentColor}, transparent)"
	></div>

	<div class="relative flex items-center gap-6">
		<div class="shrink-0 text-center">
			<p class="text-6xl font-black tabular-nums leading-none {scoreColorClass}">{score}</p>
			<p class="mt-1 text-xs font-semibold text-muted-foreground">/100</p>
		</div>

		<div class="min-w-0 flex-1">
			<p class="text-lg font-black leading-snug">{headline}</p>
			<p class="mt-1 text-sm text-muted-foreground">{sub}</p>
		</div>
	</div>
</div>
