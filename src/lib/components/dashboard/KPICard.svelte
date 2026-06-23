<script lang="ts">
	import MetricCard from '$lib/components/ui/metric-card.svelte';

	interface Props {
		label: string;
		value: string | number;
		variation?: number;
		description?: string;
		href?: string;
		loading?: boolean;
		variant?: 'default' | 'accent' | 'destructive';
		class?: string;
	}

	let { label, value, variation, description, href, loading = false, variant = 'default', class: className }: Props = $props();

	const trend = $derived(
		variation !== undefined
			? {
					value: `${variation > 0 ? '+' : ''}${variation.toFixed(1)}%`,
					direction: variation > 0 ? ('up' as const) : variation < 0 ? ('down' as const) : ('neutral' as const)
				}
			: undefined
	);
</script>

<MetricCard {label} {value} {trend} {description} {href} {loading} {variant} class={className} />
