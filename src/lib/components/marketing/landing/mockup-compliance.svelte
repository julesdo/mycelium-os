<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { IdCard, Wrench, FileText, Siren, Leaf, Check, TriangleAlert } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { IconProps } from '@lucide/svelte';

	const { t } = getTranslate();

	type Row = {
		icon: Component<IconProps>;
		labelKey: string;
		detailKey: string;
		ok: boolean;
	};

	const rows: Row[] = [
		{
			icon: IdCard,
			labelKey: 'landing.features.mock.licenses',
			detailKey: 'landing.features.mock.licenses_detail',
			ok: true
		},
		{
			icon: Wrench,
			labelKey: 'landing.features.mock.ct',
			detailKey: 'landing.features.mock.ct_detail',
			ok: false
		},
		{
			icon: FileText,
			labelKey: 'landing.features.mock.insurance',
			detailKey: 'landing.features.mock.insurance_detail',
			ok: true
		},
		{
			icon: Siren,
			labelKey: 'landing.features.mock.violations',
			detailKey: 'landing.features.mock.violations_detail',
			ok: false
		},
		{
			icon: Leaf,
			labelKey: 'landing.features.mock.csrd',
			detailKey: 'landing.features.mock.csrd_detail',
			ok: true
		}
	];
</script>

<div class="w-full max-w-xs space-y-2.5">
	{#each rows as row (row.labelKey)}
		{@const Icon = row.icon}
		<div
			class={`flex items-center gap-3 rounded-xl border p-3.5 ${
				row.ok
					? 'border-[oklch(0.72_0.19_150_/_0.3)] bg-[oklch(0.72_0.19_150_/_0.08)]'
					: 'border-[oklch(0.80_0.16_80_/_0.35)] bg-[oklch(0.80_0.16_80_/_0.10)]'
			}`}
		>
			<span
				class={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
					row.ok
						? 'text-[oklch(0.48_0.16_150)] dark:text-[oklch(0.78_0.18_150)]'
						: 'text-[oklch(0.52_0.15_75)] dark:text-[oklch(0.82_0.16_80)]'
				}`}
			>
				<Icon class="size-4" />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-xs font-semibold text-foreground">{$t(row.labelKey)}</p>
				<p
					class={`text-xs ${
						row.ok
							? 'text-[oklch(0.48_0.16_150)] dark:text-[oklch(0.74_0.16_150)]'
							: 'text-[oklch(0.52_0.15_75)] dark:text-[oklch(0.80_0.15_80)]'
					}`}
				>
					{$t(row.detailKey)}
				</p>
			</div>
			<span
				class={`flex size-5 shrink-0 items-center justify-center rounded-full text-white ${
					row.ok ? 'bg-[oklch(0.72_0.19_150)]' : 'bg-[oklch(0.80_0.16_80)]'
				}`}
			>
				{#if row.ok}
					<Check class="size-3" />
				{:else}
					<TriangleAlert class="size-3" />
				{/if}
			</span>
		</div>
	{/each}
</div>
