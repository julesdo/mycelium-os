<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { cn } from '$lib/utils.js';

	interface Props {
		/** Nombre d'éléments encore masqués. */
		restants: number;
		ouvert: boolean;
		onbasculer: () => void;
		class?: string;
	}

	let { restants, ouvert, onbasculer, class: className }: Props = $props();
</script>

<Button
	variant="ghost"
	class={cn('h-11 w-full justify-center text-[13px] text-muted-foreground', className)}
	aria-expanded={ouvert}
	onclick={onbasculer}
>
	<ChevronDownIcon class={cn('size-4 transition-transform', ouvert && 'rotate-180')} />
	{ouvert ? 'Réduire la liste' : `Voir les ${restants} autres`}
</Button>
