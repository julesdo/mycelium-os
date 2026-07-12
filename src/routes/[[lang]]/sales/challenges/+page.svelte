<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import CheckIcon from '@lucide/svelte/icons/check';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const gamQ = useQuery((api as any)['sales/gamification'].getMyGamification, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const badgesQ = useQuery((api as any)['sales/gamification'].getMyBadges, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const challengesQ = useQuery((api as any)['sales/challenges'].getMyCurrentChallenges, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const leaderboardQ = useQuery((api as any)['sales/gamification'].getLeaderboard, {});

	const gam = $derived(gamQ.data ?? null);
	const badges = $derived(badgesQ.data ?? []);
	const challengesEntry = $derived(challengesQ.data ?? null);
	const challenges = $derived(challengesEntry?.challenges ?? []);
	const leaderboard = $derived(leaderboardQ.data ?? []);

	const LEVEL_NAMES = ['', 'Starter', 'Closer', 'Hunter', 'Rainmaker', 'Legend'];
	const LEVEL_THRESHOLDS = [0, 1000, 5000, 15000, 40000];

	function levelProgress(totalPoints: number, level: number): number {
		const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
		const next = LEVEL_THRESHOLDS[level] ?? totalPoints;
		if (next <= current) return 100;
		return Math.round(((totalPoints - current) / (next - current)) * 100);
	}

	const BADGE_META: Record<string, { label: string; emoji: string; desc: string }> = {
		first_conversion: { label: 'Premier Closing', emoji: '🎯', desc: 'Première conversion réussie' },
		demo_launcher: { label: 'Demo Launcher', emoji: '🚀', desc: '10 démos créées' },
		unstoppable: { label: 'Unstoppable', emoji: '⚡', desc: '42 jours de streak' },
		pipeline_pro: { label: 'Pipeline Pro', emoji: '💼', desc: '5 conversions au total' }
	};

	const DIFFICULTY_COLOR: Record<string, string> = {
		easy: 'text-emerald-500',
		medium: 'text-amber-500',
		hard: 'text-rose-500'
	};

	const DIFFICULTY_LABEL: Record<string, string> = {
		easy: 'Facile',
		medium: 'Moyen',
		hard: 'Difficile'
	};
</script>

<div class="space-y-6 p-4 lg:p-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<div
			class="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)]"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2), 0 1px 3px oklch(0.92 0.23 103 / 0.3)"
		>
			<TrophyIcon class="size-5 text-[var(--brand-foreground)]" />
		</div>
		<div>
			<h1 class="text-lg font-semibold">Défis & Gamification</h1>
			<p class="text-xs text-muted-foreground">Progresse et accumule des points chaque semaine</p>
		</div>
	</div>

	<!-- Niveau + points -->
	{#if gam}
		<div
			class="relative overflow-hidden rounded-2xl border border-border bg-card p-5"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>

			<div class="flex items-start justify-between gap-4">
				<div>
					<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Niveau {gam.level}</p>
					<p class="mt-0.5 text-2xl font-bold">{LEVEL_NAMES[gam.level] ?? 'Legend'}</p>
					<p class="mt-1 text-sm text-muted-foreground">
						<span class="text-foreground font-semibold">{gam.totalPoints.toLocaleString()}</span> pts total
					</p>
				</div>
				<div class="text-right">
					<div class="flex items-center gap-1.5 justify-end">
						<FlameIcon class="size-4 text-orange-500" />
						<span class="text-lg font-bold">{gam.currentStreakDays}</span>
						<span class="text-xs text-muted-foreground">jours</span>
					</div>
					<p class="text-xs text-muted-foreground mt-0.5">Record : {gam.longestStreakDays}j</p>
				</div>
			</div>

			{#if gam.level < 5}
				<div class="mt-4">
					<div class="mb-1 flex justify-between text-[11px] text-muted-foreground">
						<span>Vers niveau {gam.level + 1} ({LEVEL_NAMES[gam.level + 1]})</span>
						<span>{levelProgress(gam.totalPoints, gam.level)}%</span>
					</div>
					<div class="h-1.5 rounded-full bg-muted overflow-hidden">
						<div
							class="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
							style="width: {levelProgress(gam.totalPoints, gam.level)}%"
						></div>
					</div>
				</div>
			{/if}

			<div class="mt-4 grid grid-cols-2 gap-3">
				<div class="rounded-xl bg-muted/50 p-3">
					<p class="text-[11px] text-muted-foreground">Cette semaine</p>
					<p class="text-lg font-bold text-[var(--brand)]">{gam.weeklyPoints}</p>
					<p class="text-[11px] text-muted-foreground">points</p>
				</div>
				<div class="rounded-xl bg-muted/50 p-3">
					<p class="text-[11px] text-muted-foreground">Ce mois</p>
					<p class="text-lg font-bold">{gam.monthlyPoints}</p>
					<p class="text-[11px] text-muted-foreground">points</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Défis de la semaine -->
	<section>
		<h2 class="mb-3 text-sm font-semibold">Défis de la semaine</h2>
		{#if challengesQ.isPending}
			<div class="space-y-2">
				{#each Array(3) as _, i (i)}
					<div class="h-24 animate-pulse rounded-2xl bg-muted"></div>
				{/each}
			</div>
		{:else if challenges.length === 0}
			<div class="rounded-2xl border border-dashed border-border p-6 text-center">
				<TrophyIcon class="mx-auto mb-2 size-8 text-muted-foreground/30" />
				<p class="text-sm text-muted-foreground">Les défis seront générés lundi matin.</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each challenges as ch (ch.id)}
					<div
						class="relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-colors"
						class:opacity-70={ch.completed}
						style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
					>
						<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent"></div>

						<div class="flex items-start justify-between gap-3">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="text-[11px] font-semibold uppercase tracking-wide {DIFFICULTY_COLOR[ch.difficulty]}">
										{DIFFICULTY_LABEL[ch.difficulty]}
									</span>
									<span class="text-[11px] text-muted-foreground">+{ch.points} pts</span>
								</div>
								<p class="mt-0.5 text-sm font-medium">{ch.title}</p>
								<p class="text-xs text-muted-foreground">{ch.description}</p>
							</div>
							{#if ch.completed}
								<div
									class="shrink-0 flex size-7 items-center justify-center rounded-full bg-[var(--brand)]"
									style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2)"
								>
									<CheckIcon class="size-4 text-[var(--brand-foreground)]" />
								</div>
							{/if}
						</div>

						<div class="mt-3">
							<div class="mb-1 flex justify-between text-[11px] text-muted-foreground">
								<span>{ch.currentValue} / {ch.targetValue}</span>
								<span>{Math.min(100, Math.round((ch.currentValue / ch.targetValue) * 100))}%</span>
							</div>
							<div class="h-1 rounded-full bg-muted overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500 {ch.completed ? 'bg-[var(--brand)]' : 'bg-muted-foreground/40'}"
									style="width: {Math.min(100, Math.round((ch.currentValue / ch.targetValue) * 100))}%"
								></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Badges -->
	{#if badges.length > 0}
		<section>
			<h2 class="mb-3 text-sm font-semibold">Badges obtenus</h2>
			<div class="grid grid-cols-2 gap-2">
				{#each badges as badge (badge._id)}
					{@const meta = BADGE_META[badge.badgeId]}
					{#if meta}
						<div
							class="relative overflow-hidden rounded-2xl border border-border bg-card p-3"
							style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
						>
							<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent"></div>
							<p class="text-2xl">{meta.emoji}</p>
							<p class="mt-1 text-xs font-semibold">{meta.label}</p>
							<p class="text-[11px] text-muted-foreground">{meta.desc}</p>
						</div>
					{/if}
				{/each}
			</div>
		</section>
	{/if}

	<!-- Leaderboard -->
	{#if leaderboard.length > 1}
		<section>
			<h2 class="mb-3 text-sm font-semibold">Classement hebdomadaire</h2>
			<div
				class="relative overflow-hidden rounded-2xl border border-border bg-card"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
			>
				<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent"></div>
				{#each leaderboard as entry, i (entry.salesUserId)}
					<div
						class="flex items-center gap-3 px-4 py-3 {i < leaderboard.length - 1 ? 'border-b border-border/60' : ''} {entry.isMe ? 'bg-[var(--brand)]/5' : ''}"
					>
						<span class="w-5 text-center text-sm font-bold {i === 0 ? 'text-[var(--brand)]' : 'text-muted-foreground'}">
							{entry.rank}
						</span>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium {entry.isMe ? 'text-[var(--brand)]' : ''}">
								{entry.isMe ? 'Toi' : `Commercial #${entry.rank}`}
							</p>
							<p class="text-[11px] text-muted-foreground">Niv. {entry.level}</p>
						</div>
						<span class="text-sm font-semibold">{entry.weeklyPoints} pts</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
