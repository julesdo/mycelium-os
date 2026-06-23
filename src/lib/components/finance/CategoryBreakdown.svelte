<script lang="ts">
	import { pie, arc } from 'd3-shape';
	import { CATEGORY_COLORS, CATEGORY_LABELS } from './category-config.js';

	interface CategoryData {
		category: string;
		total: number;
		count: number;
		average: number;
	}

	interface Props {
		data: CategoryData[] | null | undefined;
		loading?: boolean;
	}

	let { data, loading = false }: Props = $props();

	const SIZE = 180;
	const OUTER = 80;
	const INNER = 50;

	function fmt(n: number) {
		return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
	}

	const segments = $derived(
		(data ?? []).map((d) => ({
			key: d.category,
			label: CATEGORY_LABELS[d.category] ?? d.category,
			value: d.total,
			total: d.total,
			count: d.count,
			color: CATEGORY_COLORS[d.category] ?? CATEGORY_COLORS.AUTRE
		}))
	);

	const grandTotal = $derived(segments.reduce((s, d) => s + d.value, 0));

	const pieFn = $derived(
		pie<(typeof segments)[0]>()
			.value((d) => d.value)
			.sort((a, b) => b.value - a.value)
			.padAngle(0.025)
	);

	const arcFn = $derived(
		arc<ReturnType<typeof pieFn>[0]>()
			.innerRadius(INNER)
			.outerRadius(OUTER)
	);

	const arcs = $derived(grandTotal > 0 && segments.length > 0 ? pieFn(segments) : []);

	const sorted = $derived([...segments].sort((a, b) => b.value - a.value));
</script>

<div class="flex flex-col gap-6 @md:flex-row @md:items-start">
	<!-- Donut -->
	<div class="flex shrink-0 justify-center">
		{#if loading}
			<div class="size-[180px] animate-pulse rounded-full bg-muted"></div>
		{:else}
			<svg viewBox="0 0 {SIZE} {SIZE}" class="w-[180px] shrink-0">
				<g transform="translate({SIZE / 2},{SIZE / 2})">
					{#if arcs.length > 0}
						{#each arcs as a, i}
							<path
								d={arcFn(a) ?? ''}
								fill={segments[i]?.color ?? CATEGORY_COLORS.AUTRE}
								opacity="0.92"
							/>
						{/each}
					{:else}
						<circle r={OUTER} fill="var(--muted)" />
						<circle r={INNER} fill="var(--card)" />
					{/if}
					<text text-anchor="middle" dy="-0.15em" font-size="13" font-weight="600" fill="var(--foreground)">
						{grandTotal > 0 ? fmt(grandTotal) : '—'}
					</text>
					<text text-anchor="middle" dy="1.1em" font-size="8.5" fill="var(--muted-foreground)">
						total
					</text>
				</g>
			</svg>
		{/if}
	</div>

	<!-- Legend table -->
	<div class="flex-1 min-w-0">
		{#if loading}
			<div class="flex flex-col gap-2">
				{#each Array(5) as _, i (i)}
					<div class="h-7 animate-pulse rounded-md bg-muted"></div>
				{/each}
			</div>
		{:else if sorted.length === 0}
			<p class="text-sm text-muted-foreground">Aucun coût sur cette période.</p>
		{:else}
			<div class="divide-y divide-border/60">
				{#each sorted as seg}
					{@const pct = grandTotal > 0 ? (seg.value / grandTotal) * 100 : 0}
					<div class="flex items-center gap-3 py-2 text-sm">
						<span
							class="inline-block size-2.5 shrink-0 rounded-sm"
							style="background-color: {seg.color}"
						></span>
						<span class="flex-1 truncate text-muted-foreground">{seg.label}</span>
						<div class="hidden w-20 shrink-0 @sm:block">
							<div class="h-1.5 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full transition-all"
									style="width: {pct.toFixed(1)}%; background-color: {seg.color}; opacity: 0.8"
								></div>
							</div>
						</div>
						<span class="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
							{pct.toFixed(0)}%
						</span>
						<span class="w-20 shrink-0 text-right font-medium tabular-nums">
							{fmt(seg.value)}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
