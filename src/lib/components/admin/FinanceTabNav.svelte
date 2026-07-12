<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	const TABS = [
		{ value: 'overview', label: 'Vue d\'ensemble', path: '/admin/finance' },
		{ value: 'costs', label: 'Coûts', path: '/admin/finance/costs' },
		{ value: 'frais', label: 'Frais IK', path: '/admin/expenses' },
		{ value: 'carburant', label: 'Carburant', path: '/admin/finance/fuel-import' },
		{ value: 'fiscal', label: 'Fiscal', path: '/admin/finance/fiscal' }
	];

	const activeTab = $derived.by(() => {
		const path = page.url.pathname;
		if (path.includes('/finance/costs')) return 'costs';
		if (path.includes('/finance/fuel-import')) return 'carburant';
		if (path.includes('/finance/fiscal')) return 'fiscal';
		if (path.includes('/expenses')) return 'frais';
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
