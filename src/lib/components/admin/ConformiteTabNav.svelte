<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	const TABS = [
		{ value: 'overview', label: 'Vue d\'ensemble', path: '/admin/compliance' },
		{ value: 'infractions', label: 'Infractions', path: '/admin/violations' },
		{ value: 'sinistres', label: 'Sinistres', path: '/admin/incidents' },
		{ value: 'bik', label: 'BiK UK', path: '/admin/finance/bik' },
		{ value: 'durabilite', label: 'Durabilité', path: '/admin/sustainability' }
	];

	const activeTab = $derived.by(() => {
		const path = page.url.pathname;
		if (path.includes('/violations')) return 'infractions';
		if (path.includes('/incidents')) return 'sinistres';
		if (path.includes('/finance/bik')) return 'bik';
		if (path.includes('/sustainability')) return 'durabilite';
		return 'overview';
	});
</script>

<div class="border-b border-border bg-background">
	<Tabs.Root
		value={activeTab}
		onValueChange={(v) => {
			const tab = TABS.find((t) => t.value === v);
			if (tab) goto(resolve(localizedHref(tab.path)));
		}}
	>
		<Tabs.List variant="line" class="px-4 lg:px-6 xl:px-8">
			{#each TABS as tab (tab.value)}
				<Tabs.Trigger value={tab.value}>{tab.label}</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</Tabs.Root>
</div>
