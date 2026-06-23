<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const lang = $derived(page.params.lang as string | undefined);

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	const tabs = [
		{ id: 'general',       label: 'Général',       href: '/admin/settings',               exact: true  },
		{ id: 'members',       label: 'Membres',       href: '/admin/settings/members',        exact: false },
		{ id: 'plans',         label: 'Plans',         href: '/admin/settings/plans',          exact: false },
		{ id: 'integrations',  label: 'Intégrations',  href: '/admin/settings/integrations',   exact: false },
		{ id: 'notifications', label: 'Notifications', href: '/admin/settings/notifications',  exact: false }
	] as const;

	function isActive(tab: (typeof tabs)[number]): boolean {
		const pathname = page.url.pathname;
		const localPath = localHref(tab.href);
		if (tab.exact) return pathname === localPath || pathname === localPath + '/';
		return pathname.startsWith(localPath);
	}
</script>

<div class="flex flex-1 flex-col px-4 lg:px-6 xl:px-8">
	<div class="flex-1 space-y-5">
		<!-- Header compact -->
		<div class="flex items-center gap-2">
			<h1 class="text-base font-semibold">Paramètres</h1>
			<span class="text-border">·</span>
			<p class="text-sm text-muted-foreground">Organisation</p>
		</div>

		<!-- Tab nav — DA pill style -->
		<div class="flex items-center gap-1 border-b border-border/60 pb-0">
			{#each tabs as tab (tab.id)}
				<a
					href={localHref(tab.href)}
					class={cn(
						'relative -mb-px px-3 py-2 text-sm transition-colors',
						isActive(tab)
							? 'font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground'
							: 'text-muted-foreground hover:text-foreground'
					)}
				>
					{tab.label}
				</a>
			{/each}
		</div>

		<div class="min-w-0">
			{@render children()}
		</div>
	</div>
</div>
