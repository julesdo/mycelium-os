<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import { localizedHref } from '$lib/utils/i18n';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import LayoutListIcon from '@lucide/svelte/icons/layout-list';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { resolve } from '$app/paths';

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

<div class="min-h-screen bg-background">
	<!-- Topbar fixe -->
	<header class="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-screen-2xl items-center gap-6 px-6 py-0">
			<!-- Logo / titre -->
			<div class="flex items-center gap-2.5 py-3">
				<div
					class="flex size-7 items-center justify-center rounded-lg bg-[var(--brand)] text-[var(--brand-foreground)]"
				>
					<HeadphonesIcon class="size-3.5" />
				</div>
				<span class="text-sm font-bold text-foreground">Fleet Care</span>
				<span
					class="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase"
				>
					Interne
				</span>
			</div>

			<!-- Nav tabs -->
			<nav class="flex h-full items-center gap-1">
				{#each navItems as item (item.href)}
					<a
						href={resolve(item.href)}
						class={cn(
							'flex items-center gap-1.5 border-b-2 px-3 py-3.5 text-xs font-medium transition-colors',
							item.active
								? 'border-[var(--brand)] text-foreground'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						<item.icon class="size-3.5" />
						{item.label}
					</a>
				{/each}
			</nav>

			<!-- Droite : lien admin -->
			<div class="ml-auto flex items-center">
				{#if isSuperAdmin}
					<span
						class="mr-3 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400"
					>
						Super Admin
					</span>
				{:else if myRole.data}
					<span
						class="mr-3 rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase"
					>
						Concierge
					</span>
				{/if}
				<a
					href={resolve(localizedHref('/admin/dashboard'))}
					target="_blank"
					rel="noopener"
					class="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
				>
					<ExternalLinkIcon class="size-3" />
					Admin
				</a>
			</div>
		</div>
	</header>

	{@render children()}
</div>
