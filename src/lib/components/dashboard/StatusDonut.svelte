<script lang="ts">
	interface Props {
		available: number;
		inUse: number;
		maintenance: number;
		retired: number;
	}

	let { available, inUse, maintenance, retired }: Props = $props();

	const total = $derived(available + inUse + maintenance + retired);
	const availPct = $derived(total > 0 ? Math.round((available / total) * 100) : 0);

	// Semi-circle gauge: 0° = left, 180° = right (top half)
	const CX = 80;
	const CY = 72;
	const R_OUTER = 60;
	const R_INNER = 40;

	// Convert degrees to SVG arc (semi-circle, -180° to 0°)
	function polarToXY(angleDeg: number, r: number) {
		const rad = ((angleDeg - 180) * Math.PI) / 180;
		return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
	}

	function arcPath(startDeg: number, endDeg: number, outerR: number, innerR: number): string {
		const s1 = polarToXY(startDeg, outerR);
		const e1 = polarToXY(endDeg, outerR);
		const s2 = polarToXY(endDeg, innerR);
		const e2 = polarToXY(startDeg, innerR);
		const large = endDeg - startDeg > 180 ? 1 : 0;
		return [
			`M ${s1.x} ${s1.y}`,
			`A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y}`,
			`L ${s2.x} ${s2.y}`,
			`A ${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y}`,
			'Z'
		].join(' ');
	}

	const segments = $derived([
		{ label: 'Disponible',  value: available,   color: 'oklch(0.72 0.17 145)' },
		{ label: 'En cours',    value: inUse,        color: 'oklch(0.62 0.19 248)' },
		{ label: 'Maintenance', value: maintenance,  color: 'oklch(0.78 0.20 70)'  },
		{ label: 'Retiré',      value: retired,      color: 'oklch(0.52 0.01 264)' }
	]);

	const arcs = $derived(() => {
		if (total === 0) return [];
		const result: { path: string; color: string; label: string; value: number }[] = [];
		let cursor = 0;
		for (const seg of segments) {
			const span = (seg.value / total) * 180;
			if (span > 0.5) {
				result.push({
					path: arcPath(cursor + 1, cursor + span - 1, R_OUTER, R_INNER),
					color: seg.color,
					label: seg.label,
					value: seg.value
				});
			}
			cursor += span;
		}
		return result;
	});

	// Indicator needle angle
	const needleAngle = $derived(availPct * 1.8); // 0–180°
	const needleTip = $derived(polarToXY(needleAngle, R_INNER - 4));
	const needleBase1 = $derived(polarToXY(needleAngle - 90, 4));
	const needleBase2 = $derived(polarToXY(needleAngle + 90, 4));
</script>

<div class="flex flex-col gap-4">
	<!-- Gauge SVG -->
	<div class="flex justify-center">
		<svg viewBox="0 0 160 82" class="w-full max-w-[200px]" aria-label="Répartition flotte">
			<!-- Background track -->
			<path
				d={arcPath(0, 180, R_OUTER, R_INNER)}
				fill="var(--muted)"
			/>

			<!-- Colored segments -->
			{#each arcs() as a}
				<path d={a.path} fill={a.color} opacity="0.9" />
			{/each}

			<!-- Needle -->
			{#if total > 0}
				<polygon
					points="{needleTip.x},{needleTip.y} {needleBase1.x},{needleBase1.y} {needleBase2.x},{needleBase2.y}"
					fill="var(--foreground)"
					opacity="0.7"
				/>
				<circle cx={CX} cy={CY} r="4" fill="var(--card)" stroke="var(--foreground)" stroke-width="1.5" opacity="0.7" />
			{/if}

			<!-- Center label -->
			<text x={CX} y={CY - 10} text-anchor="middle" font-size="20" font-weight="700" fill="var(--foreground)">{availPct}%</text>
			<text x={CX} y={CY + 4} text-anchor="middle" font-size="8" font-weight="500" fill="var(--muted-foreground)" letter-spacing="0.06em">DISPO</text>
		</svg>
	</div>

	<!-- Legend grid -->
	<div class="grid grid-cols-2 gap-x-4 gap-y-2.5">
		{#each segments as seg}
			{@const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0}
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-1.5 min-w-0">
					<span class="size-2 shrink-0 rounded-sm" style="background: {seg.color}; opacity: 0.85"></span>
					<span class="truncate text-[11px] text-muted-foreground">{seg.label}</span>
				</div>
				<div class="flex items-center gap-1.5 shrink-0">
					<span class="text-xs font-bold tabular-nums text-foreground">{seg.value}</span>
					<span class="text-[10px] tabular-nums text-muted-foreground/60 w-6 text-right">{pct}%</span>
				</div>
			</div>
		{/each}
	</div>
</div>
