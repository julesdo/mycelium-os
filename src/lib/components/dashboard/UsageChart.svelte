<script lang="ts">
	import { scaleLinear, scaleTime } from 'd3-scale';
	import { line, area, curveMonotoneX } from 'd3-shape';

	interface DataPoint {
		date: string;
		count: number;
	}

	interface Props {
		data: DataPoint[];
	}

	let { data }: Props = $props();

	const W = 560;
	const H = 220;
	const PAD = { top: 16, right: 12, bottom: 36, left: 32 };

	const chartW = $derived(W - PAD.left - PAD.right);
	const chartH = $derived(H - PAD.top - PAD.bottom);

	const dates = $derived(data.map((d) => new Date(d.date)));
	const counts = $derived(data.map((d) => d.count));
	const maxCount = $derived(Math.max(...counts, 1));

	const xScale = $derived(
		scaleTime()
			.domain([dates[0] ?? new Date(), dates.at(-1) ?? new Date()])
			.range([0, chartW])
	);

	const yScale = $derived(
		scaleLinear().domain([0, maxCount]).range([chartH, 0]).nice()
	);

	const lineFn = $derived(
		line<DataPoint>()
			.x((d) => xScale(new Date(d.date)))
			.y((d) => yScale(d.count))
			.curve(curveMonotoneX)
	);

	const areaFn = $derived(
		area<DataPoint>()
			.x((d) => xScale(new Date(d.date)))
			.y0(chartH)
			.y1((d) => yScale(d.count))
			.curve(curveMonotoneX)
	);

	const pathD = $derived(data.length > 0 ? (lineFn(data) ?? '') : '');
	const areaD = $derived(data.length > 0 ? (areaFn(data) ?? '') : '');

	const yTicks = $derived(yScale.ticks(4).filter((t) => t >= 0));
	const xTicks = $derived(
		[data[0], data[Math.floor(data.length / 3)], data[Math.floor((data.length * 2) / 3)], data[data.length - 1]]
			.filter((d): d is DataPoint => d !== undefined)
			.filter((d, i, arr) => arr.findIndex((x) => x.date === d.date) === i)
	);

	function fmtDate(s: string) {
		return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
	}

	let tooltip = $state<{ x: number; y: number; point: DataPoint } | null>(null);

	function onMouseMove(e: MouseEvent) {
		if (!data.length) return;
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		const mx = (e.clientX - rect.left) * (W / rect.width) - PAD.left;
		const closest = data.reduce((prev, cur) =>
			Math.abs(xScale(new Date(cur.date)) - mx) < Math.abs(xScale(new Date(prev.date)) - mx) ? cur : prev
		);
		const tx = xScale(new Date(closest.date)) + PAD.left;
		const ty = yScale(closest.count) + PAD.top;
		tooltip = { x: tx, y: ty, point: closest };
	}

	function onMouseLeave() {
		tooltip = null;
	}
</script>

<div class="relative w-full select-none">
	<svg
		viewBox="0 0 {W} {H}"
		class="w-full"
		aria-label="Graphique d'utilisation"
		role="img"
		onmousemove={onMouseMove}
		onmouseleave={onMouseLeave}
	>
		<defs>
			<linearGradient id="usage-gradient" x1="0" x2="0" y1="0" y2="1">
				<stop offset="0%" stop-color="var(--brand)" stop-opacity="0.30" />
				<stop offset="85%" stop-color="var(--brand)" stop-opacity="0.02" />
			</linearGradient>
			<filter id="dot-glow">
				<feGaussianBlur stdDeviation="2" result="coloredBlur" />
				<feMerge>
					<feMergeNode in="coloredBlur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<g transform="translate({PAD.left},{PAD.top})">
			<!-- Y grid lines (dashed) -->
			{#each yTicks as tick}
				<line
					x1={0} x2={chartW}
					y1={yScale(tick)} y2={yScale(tick)}
					stroke="var(--border)"
					stroke-width="1"
					stroke-dasharray="4 6"
					opacity="0.6"
				/>
				<text
					x={-8} y={yScale(tick)}
					dy="0.35em"
					text-anchor="end"
					font-size="10"
					font-weight="500"
					fill="var(--muted-foreground)"
					opacity="0.7"
				>{tick}</text>
			{/each}

			<!-- Area fill -->
			{#if areaD}
				<path d={areaD} fill="url(#usage-gradient)" />
			{/if}

			<!-- Line -->
			{#if pathD}
				<path
					d={pathD}
					fill="none"
					stroke="var(--brand)"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/if}

			<!-- Data point dots -->
			{#if data.length <= 60}
				{#each data as point}
					<circle
						cx={xScale(new Date(point.date))}
						cy={yScale(point.count)}
						r={data.length <= 14 ? 3 : 2}
						fill="var(--brand)"
						opacity={tooltip?.point.date === point.date ? 1 : 0.55}
					/>
				{/each}
			{/if}

			<!-- X axis labels -->
			{#each xTicks as tick}
				<text
					x={xScale(new Date(tick.date))}
					y={chartH + 22}
					text-anchor="middle"
					font-size="10"
					font-weight="500"
					fill="var(--muted-foreground)"
					opacity="0.7"
				>{fmtDate(tick.date)}</text>
			{/each}

			<!-- Hover vertical line -->
			{#if tooltip}
				<line
					x1={tooltip.x - PAD.left}
					x2={tooltip.x - PAD.left}
					y1={0}
					y2={chartH}
					stroke="var(--border)"
					stroke-width="1"
					stroke-dasharray="3 4"
					opacity="0.8"
				/>
				<!-- Hover dot (glow) -->
				<circle
					cx={tooltip.x - PAD.left}
					cy={tooltip.y - PAD.top}
					r={7}
					fill="var(--brand)"
					opacity="0.18"
					filter="url(#dot-glow)"
				/>
				<circle
					cx={tooltip.x - PAD.left}
					cy={tooltip.y - PAD.top}
					r={4.5}
					fill="var(--brand)"
					stroke="white"
					stroke-width="2"
				/>
			{/if}
		</g>
	</svg>

	<!-- Tooltip popup -->
	{#if tooltip}
		<div
			class="pointer-events-none absolute z-10 rounded-xl border border-border/60 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
			style="left: {(tooltip.x / W) * 100}%; top: {(tooltip.y / H) * 100}%; transform: translate(-50%, -120%);"
		>
			<div class="flex items-baseline gap-1.5">
				<span class="text-sm font-bold tabular-nums" style="color: var(--brand)">{tooltip.point.count}</span>
				<span class="text-muted-foreground">résa</span>
			</div>
			<div class="mt-0.5 text-[10px] text-muted-foreground/70">{fmtDate(tooltip.point.date)}</div>
		</div>
	{/if}
</div>
