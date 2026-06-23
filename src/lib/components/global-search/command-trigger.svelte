<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { getTranslate } from '@tolgee/svelte';
	import { useGlobalSearchContext } from './context.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';

	interface Props {
		class?: string;
	}

	const { t } = getTranslate();

	let { class: className }: Props = $props();

	const globalSearch = useGlobalSearchContext();
</script>

<Button
	variant="ghost"
	size="icon"
	class={cn('topbar-brand-btn size-9 rounded-xl', className)}
	onclick={() => globalSearch.openMenu()}
	aria-label={$t('search.command.trigger_aria_label')}
>
	<SearchIcon class="size-4" />
</Button>
