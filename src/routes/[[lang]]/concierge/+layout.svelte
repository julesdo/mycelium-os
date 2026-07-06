<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import { localizedHref } from '$lib/utils/i18n';
	import { cn } from '$lib/utils.js';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	import Logo from '$lib/components/icons/logo.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import LayoutListIcon from '@lucide/svelte/icons/layout-list';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let { children }: { children: Snippet } = $props();

	const myRole = useQuery(api['concierge/queries'].getMyStaffRole, {});

	const isSuperAdmin = $derived(myRole.data?.staffRole === 'super_admin');

	const navItems = $derived([
		{
			href: localizedHref('/concierge'),
			label: 'File de tâches',
			icon: LayoutListIcon,
			active:
				page.url.pathname.match(/\/concierge\/?$/) ||
				(page.url.pathname.includes('/concierge/') && !page.url.pathname.includes('/staff'))
		},
		...(isSuperAdmin
			? [
					{
						href: localizedHref('/concierge/staff'),
						label: 'Équipe Mycelium',
						icon: UsersIcon,
						active: page.url.pathname.includes('/concierge/staff')
					}
				]
			: [])
	]);
</script>

<div class="flex h-screen flex-col overflow-hidden bg-background">
	<header class="admin-topbar shrink-0 h-[62px]">
		<div class="flex h-full items-center gap-4 px-6">
			<!-- Logo Mycelium -->
			<a
				href={resolve(localizedHref('/admin/dashboard'))}
				class="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
			>
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] shadow-sm ring-1 ring-[var(--brand-foreground)]/10"
					style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
				>
					<Logo class="size-8 text-[var(--brand-foreground)]" />
				</span>
				<span class="hidden text-sm font-semibold tracking-tight sm:block">Mycelium</span>
			</a>

			<div class="hidden h-5 w-px bg-border/60 md:block"></div>

			<Badge variant="outline" class="text-[10px] font-medium tracking-wider uppercase">
				Interne
			</Badge>

			<!-- Nav tabs -->
			<nav class="flex h-full items-center gap-0.5">
				{#each navItems as item (item.href)}
					<a
						href={resolve(item.href)}
						class={cn(
							'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150',
							item.active
								? 'topbar-nav-pill-active'
								: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:ring-1 hover:ring-black/[0.04] hover:ring-inset dark:hover:bg-white/6 dark:hover:ring-white/[0.06]'
						)}
					>
						<item.icon class="size-3.5" />
						{item.label}
					</a>
				{/each}
			</nav>

			<!-- Droite -->
			<div class="ml-auto flex items-center gap-3">
				{#if isSuperAdmin}
					<Badge class="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
						Super Admin
					</Badge>
				{:else if myRole.data}
					<Badge variant="secondary">Concierge</Badge>
				{/if}

				<Button
					variant="ghost"
					size="sm"
					href={resolve(localizedHref('/admin/dashboard'))}
					target="_blank"
					rel="noopener"
				>
					<ExternalLinkIcon class="size-3.5" />
					Admin
				</Button>
			</div>
		</div>
	</header>

	<div class="flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
