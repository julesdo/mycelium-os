<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	const TABS = [
		{ value: 'vehicules', label: 'Véhicules', path: '/admin/fleet' },
		{ value: 'reservations', label: 'Réservations', path: '/admin/reservations' },
		{ value: 'maintenance', label: 'Maintenance', path: '/admin/maintenance' },
		{ value: 'conducteurs', label: 'Conducteurs', path: '/admin/drivers' }
	];

	const activeTab = $derived.by(() => {
		const path = page.url.pathname;
		if (path.includes('/reservations')) return 'reservations';
		if (path.includes('/maintenance')) return 'maintenance';
		if (path.includes('/drivers')) return 'conducteurs';
		return 'vehicules';
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
