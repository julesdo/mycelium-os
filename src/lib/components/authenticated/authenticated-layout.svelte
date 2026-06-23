<script lang="ts">
	import { browser } from '$app/environment';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AuthenticatedSidebar from './authenticated-sidebar.svelte';
	import AuthenticatedHeader from './authenticated-header.svelte';
	import AdminTopBar from './admin-topbar.svelte';
	import AppTopBar from './app-topbar.svelte';
	import AppBottomNav from './app-bottom-nav.svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import type { Snippet } from 'svelte';
	import type { NavSubItem, SidebarConfig, User } from './types';
	import { onMount } from 'svelte';
	interface Props {
		children?: Snippet;
		sidebarConfig: SidebarConfig;
		user?: User;
		routePrefix: string;
		rootLabel: string;
		fullControl?: boolean;
		/** Thread sub-items passed separately to preserve DOM nodes in autoAnimate */
		threadSubItems?: NavSubItem[];
		/** Persisted sidebar open/collapsed state, read server-side for a flash-free first paint */
		sidebarOpen?: boolean;
		/** Show OrganizationSwitcher in sidebar header */
		showOrgSwitcher?: boolean;
		/** Navigation mode: topbar for admin area, app-topbar for employee area */
		navMode?: 'sidebar' | 'topbar' | 'app-topbar';
	}

	let {
		children,
		sidebarConfig,
		user,
		routePrefix,
		rootLabel,
		fullControl = false,
		threadSubItems,
		sidebarOpen,
		showOrgSwitcher = false,
		navMode = 'sidebar'
	}: Props = $props();

	$effect(() => {
		if (!browser || !user) return;

		document.documentElement.classList.add('auth-shell-bg');
		document.body.classList.add('auth-shell-bg');

		return () => {
			document.documentElement.classList.remove('auth-shell-bg');
			document.body.classList.remove('auth-shell-bg');
		};
	});

	onMount(() => {
		document.documentElement.dataset.hydrated = '';
	});
</script>

{#if user}
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-ring"
	>
		Passer au contenu principal
	</a>

	{#if navMode === 'topbar' || navMode === 'app-topbar'}
		<!-- Top bar layout — no sidebar, glass premium shell -->
		<div class="flex h-svh flex-col overflow-hidden bg-background">
			{#if navMode === 'app-topbar'}
				<AppTopBar config={sidebarConfig} {user} />
			{:else}
				<AdminTopBar config={sidebarConfig} {user} />
			{/if}

			{#if fullControl}
				<div id="main-content" class="@container/main min-h-0 flex-1 overflow-hidden">
					{@render children?.()}
				</div>
			{:else}
				<div id="main-content" class="flex-1 overflow-y-auto scrollbar-thin">
					<div class="@container/main flex flex-col">
						<div class="flex flex-col gap-5 py-5 md:gap-7 md:py-7">
							{@render children?.()}
						</div>
					</div>
				</div>
			{/if}

			{#if navMode === 'app-topbar'}
				<AppBottomNav config={sidebarConfig} />
			{/if}
		</div>
	{:else}
		<!-- Sidebar layout (default) -->
		<Sidebar.Provider
			open={sidebarOpen}
			style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
			class="h-svh overflow-hidden"
		>
			<AuthenticatedSidebar variant="inset" config={sidebarConfig} {user} {threadSubItems} {showOrgSwitcher} />
			<Sidebar.Inset class={fullControl ? 'flex flex-col overflow-hidden' : ''}>
				<AuthenticatedHeader {routePrefix} {rootLabel} />

				{#if fullControl}
					<div id="main-content" class="@container/main min-h-0 flex-1">
						{@render children?.()}
					</div>
				{:else}
					<ScrollArea id="main-content" class="overflow-hidden">
						<div class="flex flex-1 flex-col">
							<div class="@container/main flex flex-1 flex-col gap-2">
								<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
									{@render children?.()}
								</div>
							</div>
						</div>
					</ScrollArea>
				{/if}
			</Sidebar.Inset>
		</Sidebar.Provider>
	{/if}
{/if}
