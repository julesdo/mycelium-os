<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Props {
		size?: 'xs' | 'sm' | 'md' | 'lg';
		class?: string;
		label?: string;
	}

	const sizeClasses = {
		xs: 'size-3',
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-6'
	} as const;

	let { size = 'md', class: className, label = 'Chargement...' }: Props = $props();
</script>

<span role="status" class={cn('inline-flex', className)}>
	<svg
		class={cn('motion-safe:animate-spin text-current', sizeClasses[size])}
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
		<path
			class="opacity-75"
			fill="currentColor"
			d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
		/>
	</svg>
	<span class="sr-only">{label}</span>
</span>
