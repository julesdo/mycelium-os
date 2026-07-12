<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	const TABS = [
		{ value: 'organisation', label: 'Organisation', path: '/admin/settings/organization' },
		{ value: 'equipe', label: 'Équipe', path: '/admin/settings/members' },
		{ value: 'notifications', label: 'Notifications', path: '/admin/settings/notifications' },
		{ value: 'plans', label: 'Plans', path: '/admin/settings/plans' }
	];

	const activeTab = $derived.by(() => {
		const path = page.url.pathname;
		if (path.includes('/settings/members')) return 'equipe';
		if (path.includes('/settings/notifications')) return 'notifications';
		if (path.includes('/settings/plans')) return 'plans';
		return 'organisation';
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
