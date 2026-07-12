<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import { localizedHref } from '$lib/utils/i18n';
	import { cn } from '$lib/utils.js';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import Logo from '$lib/components/icons/logo.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import LayoutListIcon from '@lucide/svelte/icons/layout-list';
	import UsersIcon from '@lucide/svelte/icons/users';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import PlayCircleIcon from '@lucide/svelte/icons/play-circle';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import SearchIcon from '@lucide/svelte/icons/search';
	import BuildingIcon from '@lucide/svelte/icons/building-2';

	let { children }: { children: Snippet } = $props();

	const myRole = useQuery(api['concierge/queries'].getMyStaffRole, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const accessibleOrgs = useQuery((api as any)['concierge/staff'].getMyAccessibleOrgs, {});

	const isSuperAdmin = $derived(myRole.data?.staffRole === 'super_admin');

	// Org active = org dans l'URL si on est sur /concierge/[orgId]
	const activeOrgId = $derived.by(() => {
		const match = page.url.pathname.match(/\/concierge\/([^/]+)/);
		const id = match?.[1];
		if (!id || id === 'staff') return null;
		return id;
	});

	const activeOrg = $derived(
		accessibleOrgs.data?.find((o) => o._id === activeOrgId) ?? null
	);

	let orgSwitcherOpen = $state(false);
	let orgSearch = $state('');

	const filteredOrgs = $derived(
		(accessibleOrgs.data ?? []).filter((o) =>
			o.name.toLowerCase().includes(orgSearch.toLowerCase())
		)
	);

	function selectOrg(orgId: string) {
		orgSwitcherOpen = false;
		orgSearch = '';
		goto(resolve(localizedHref(`/concierge/${orgId}`)));
	}

	const TIER_LABEL: Record<string, string> = {
		essential: 'Ess.',
		professional: 'Pro',
		business: 'Biz',
		enterprise: 'Ent.'
	};

	const navItems = $derived([
		{
			href: localizedHref('/concierge/inbox'),
			label: 'Inbox',
			icon: InboxIcon,
			active: page.url.pathname.includes('/concierge/inbox')
		},
		{
			href: localizedHref('/concierge'),
			label: 'File de tâches',
			icon: LayoutListIcon,
			active:
				!!page.url.pathname.match(/\/concierge\/?$/) ||
				(page.url.pathname.includes('/concierge/') &&
					!page.url.pathname.includes('/staff') &&
					!page.url.pathname.includes('/inbox') &&
					!page.url.pathname.includes('/demos'))
		},
		{
			href: localizedHref('/concierge/demos'),
			label: 'Démos',
			icon: PlayCircleIcon,
			active: page.url.pathname.includes('/concierge/demos')
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

			<!-- Droite : org switcher + badges -->
			<div class="ml-auto flex items-center gap-2">

				<!-- Org switcher combobox — visible si on a des orgs accessibles -->
				{#if accessibleOrgs.data && accessibleOrgs.data.length > 0}
					<Popover.Root bind:open={orgSwitcherOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									class={cn(
										'flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[12px] font-medium transition-all',
										orgSwitcherOpen
											? 'border-border bg-muted text-foreground'
											: 'border-border/50 bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
									)}
								>
									<BuildingIcon class="size-3.5 shrink-0" />
									<span class="hidden max-w-[140px] truncate sm:block">
										{activeOrg?.name ?? 'Sélectionner une org'}
									</span>
									<ChevronsUpDownIcon class="size-3 shrink-0 opacity-50" />
								</button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-72 p-0" align="end">
							<!-- Search -->
							<div class="flex items-center gap-2 border-b border-border px-3 py-2">
								<SearchIcon class="size-3.5 shrink-0 text-muted-foreground" />
								<input
									type="text"
									placeholder="Rechercher une organisation…"
									bind:value={orgSearch}
									class="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50"
								/>
							</div>
							<!-- List -->
							<div class="max-h-72 overflow-y-auto py-1">
								{#if filteredOrgs.length === 0}
									<p class="px-3 py-4 text-center text-xs text-muted-foreground">
										Aucune organisation trouvée
									</p>
								{:else}
									{#each filteredOrgs as org (org._id)}
										<button
											type="button"
											onclick={() => selectOrg(org._id)}
											class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted/60 {org._id === activeOrgId ? 'bg-muted/40 font-medium' : ''}"
										>
											<div class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold uppercase">
												{org.name.slice(0, 2)}
											</div>
											<span class="min-w-0 flex-1 truncate">{org.name}</span>
											<span class="shrink-0 rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
												{TIER_LABEL[org.tier] ?? org.tier}
											</span>
											{#if org._id === activeOrgId}
												<CheckIcon class="size-3.5 shrink-0 text-[var(--brand)]" />
											{/if}
										</button>
									{/each}
								{/if}
							</div>
							{#if isSuperAdmin}
								<div class="border-t border-border px-3 py-2">
									<p class="text-[10px] text-muted-foreground/50">
										{accessibleOrgs.data?.length ?? 0} organisations — accès total super admin
									</p>
								</div>
							{/if}
						</Popover.Content>
					</Popover.Root>
				{/if}

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
