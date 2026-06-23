<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { T } from '@tolgee/svelte';

	interface Props {
		isAdmin: boolean;
	}

	let { isAdmin }: Props = $props();
</script>

{#if isAdmin}
	<Badge variant="default"><T keyName="admin.settings.type_admin" /></Badge>
{:else}
	<Badge variant="secondary"><T keyName="admin.settings.type_custom" /></Badge>
{/if}
