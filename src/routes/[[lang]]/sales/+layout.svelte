<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import Logo from '$lib/components/icons/logo.svelte';
	import HomeIcon from '@lucide/svelte/icons/home';
	import LayoutListIcon from '@lucide/svelte/icons/layout-list';
	import TrophyIcon from '@lucide/svelte/icons/trophy';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SalesAgentFab from '$lib/components/sales/SalesAgentFab.svelte';

	let { children }: { children: Snippet } = $props();

	const NAV_TABS = [
		{ href: localizedHref('/sales'), label: 'Accueil', icon: HomeIcon, match: /\/sales\/?$/ },
		{
			href: localizedHref('/sales/pipeline'),
			label: 'Pipeline',
			icon: LayoutListIcon,
			match: /\/sales\/pipeline/
		},
		{
			href: localizedHref('/sales/challenges'),
			label: 'Défis',
			icon: TrophyIcon,
			match: /\/sales\/challenges/
		},
		{
			href: localizedHref('/sales/chat'),
			label: 'Chat',
			icon: MessageCircleIcon,
			match: /\/sales\/chat/
		}
	];

	const currentPath = $derived(page.url.pathname);
</script>

<div class="flex h-screen flex-col overflow-hidden bg-background">
	<!-- Topbar minimal -->
	<header
		class="flex h-[56px] shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm"
	>
		<a href={resolve(localizedHref('/sales'))} class="flex items-center gap-2">
			<span
				class="flex size-7 items-center justify-center rounded-lg bg-[var(--brand)]"
				style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
			>
				<Logo class="size-5 text-[var(--brand-foreground)]" />
			</span>
			<span class="text-sm font-semibold">Sales</span>
		</a>

		<!-- Sidebar desktop : bouton Nouvelle démo -->
		<a
			href={resolve(localizedHref('/concierge/demos/new'))}
			class="hidden lg:flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90 min-h-[36px]"
			style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
		>
			<PlusIcon class="size-3.5" />
			Nouvelle démo
		</a>

		<!-- Mobile : bouton notifications (placeholder P37) -->
		<button
			type="button"
			class="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground lg:hidden"
			aria-label="Notifications"
		>
			<svg class="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
				<path d="M13.73 21a2 2 0 0 1-3.46 0" />
			</svg>
		</button>
	</header>

	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar desktop (≥ 1024px) -->
		<aside class="hidden w-52 shrink-0 flex-col border-r border-border/60 lg:flex">
			<nav class="flex-1 p-2 space-y-0.5">
				{#each NAV_TABS as tab (tab.href)}
					{@const isActive = tab.match.test(currentPath)}
					<a
						href={resolve(tab.href)}
						class={cn(
							'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 min-h-[40px]',
							isActive
								? 'topbar-nav-pill-active'
								: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:ring-1 hover:ring-black/[0.04] hover:ring-inset dark:hover:bg-white/6 dark:hover:ring-white/[0.06]'
						)}
					>
						<tab.icon class="size-4" />
						{tab.label}
					</a>
				{/each}
			</nav>
		</aside>

		<!-- Contenu principal -->
		<main class="flex-1 overflow-auto pb-[calc(env(safe-area-inset-bottom)+56px)] lg:pb-0">
			{@render children()}
		</main>
	</div>

	<!-- Agent Commercial FAB -->
	<SalesAgentFab />

	<!-- Bottom tab bar mobile (< 1024px) -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-sm lg:hidden"
		style="padding-bottom: env(safe-area-inset-bottom)"
	>
		<div class="flex h-14 items-center justify-around">
			{#each NAV_TABS as tab (tab.href)}
				{@const isActive = tab.match.test(currentPath)}
				<a
					href={resolve(tab.href)}
					class="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-2 transition-colors"
					aria-current={isActive ? 'page' : undefined}
				>
					<tab.icon
						class="size-5 transition-opacity {isActive
							? 'text-[var(--brand-foreground)] opacity-100'
							: 'text-muted-foreground opacity-60'}"
					/>
					<span
						class="text-[10px] font-medium {isActive
							? 'text-[var(--brand-foreground)]'
							: 'text-muted-foreground'}"
					>
						{tab.label}
					</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
