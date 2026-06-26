<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { localizedHref } from '$lib/utils/i18n';
	import { haptic } from '$lib/hooks/use-haptic.svelte';
	import { toast } from 'svelte-sonner';
	import { T, getTranslate } from '@tolgee/svelte';
	import type { SidebarConfig, User } from './types';
	import CommandTrigger from '$lib/components/global-search/command-trigger.svelte';
	import NotificationCenter from '$lib/components/notifications/NotificationCenter.svelte';
	import LightSwitch from '$lib/components/ui/light-switch/light-switch.svelte';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import AppWindowIcon from '@lucide/svelte/icons/app-window';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import XIcon from '@lucide/svelte/icons/x';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import { cn } from '$lib/utils';
	import Logo from '../icons/logo.svelte';
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';

	const { t } = getTranslate();

	interface Props {
		config: SidebarConfig;
		user?: User;
	}

	let { config, user }: Props = $props();

	let mobileMenuOpen = $state(false);

	// Org switcher
	const convexClient = useConvexClient();
	const orgsQuery = useQuery(api.organizations.listMyOrganizations, {});
	const currentOrgQuery = useQuery(api.organizations.getMyOrg, {});
	const orgs = $derived(orgsQuery.data ?? []);
	const currentOrg = $derived(currentOrgQuery.data);
	let isSwitching = $state(false);

	async function switchOrg(orgId: string) {
		if (isSwitching || orgId === currentOrg?._id) return;
		isSwitching = true;
		try {
			await convexClient.mutation(api.organizations.switchOrganization, {
				organizationId: orgId as any
			});
			window.location.reload();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Impossible de changer d'organisation");
			isSwitching = false;
		}
	}

	function orgInitials(name: string): string {
		return name
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	const initials = $derived(
		(user?.name ?? '')
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || '?'
	);

	// Groups for desktop topbar — fall back to flat navItems if not defined
	const topbarGroups = $derived(config.topbarGroups ?? []);
	// Flat items for mobile menu (unchanged)
	const navItems = $derived(config.navItems.filter((item) => !item.divider));

	async function signOut() {
		haptic.trigger('light');
		const result = await authClient.signOut();
		if (result.error) {
			toast.error($t('common.error'));
		} else {
			await goto(resolve(localizedHref('/')));
		}
	}
</script>

<header class="admin-topbar sticky top-0 z-50 h-[62px] shrink-0">
	<div class="flex h-full items-center gap-4 px-4 lg:px-6">
		<!-- Logo -->
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

		<!-- Divider -->
		<div class="hidden h-5 w-px bg-border/60 md:block"></div>

		<!-- Desktop nav — grouped -->
		<nav class="hidden flex-1 items-center gap-0.5 md:flex">
			{#each topbarGroups as group (group.label)}
				{@const groupActive = group.items.some((i) => i.isActive)}

				{#if group.items.length === 1}
					<!-- Standalone link pill -->
					{@const item = group.items[0]}
					<a
						href={resolve(item.url ?? '#')}
						class={cn(
							'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150',
							groupActive
								? 'topbar-nav-pill-active'
								: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:ring-1 hover:ring-black/[0.04] hover:ring-inset dark:hover:bg-white/6 dark:hover:ring-white/[0.06]'
						)}
					>
						{#if group.icon}
							<group.icon class="size-3.5 shrink-0" />
						{/if}
						{group.label}
					</a>
				{:else}
					<!-- Dropdown group -->
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<button
									type="button"
									{...props}
									class={cn(
										'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150 focus:outline-none',
										groupActive
											? 'topbar-nav-pill-active'
											: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:ring-1 hover:ring-black/[0.04] hover:ring-inset dark:hover:bg-white/6 dark:hover:ring-white/[0.06]'
									)}
								>
									{#if group.icon}
										<group.icon class="size-3.5 shrink-0" />
									{/if}
									{group.label}
									<ChevronDownIcon
										class="size-3 shrink-0 opacity-50 transition-transform [[data-state=open]_&]:rotate-180"
									/>
								</button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="start" class="w-52" sideOffset={6}>
							{#each group.items as item (item.translationKey)}
								{#if item.url}
									<a href={resolve(item.url)}>
										<DropdownMenu.Item
											class={cn(
												'cursor-pointer gap-2.5 py-2',
												item.isActive && 'bg-muted font-medium text-foreground'
											)}
										>
											{#if item.icon}
												<item.icon
													class={cn(
														'size-4 shrink-0',
														item.isActive ? 'text-foreground' : 'text-muted-foreground'
													)}
												/>
											{/if}
											<T keyName={item.translationKey} />
											{#if item.isActive}
												<span class="ml-auto size-1.5 rounded-full bg-primary"></span>
											{/if}
										</DropdownMenu.Item>
									</a>
								{/if}
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			{/each}
		</nav>

		<!-- Right actions -->
		<div class="ml-auto flex shrink-0 items-center gap-0.5">
			<div class="hidden items-center gap-0.5 md:flex">
				<CommandTrigger />
				<NotificationCenter />
			</div>

			<!-- Divider -->
			<div class="mx-1.5 hidden h-5 w-px bg-border/60 md:block"></div>

			<!-- User menu -->
			{#if user}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<button
								type="button"
								class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-150 hover:bg-muted/60 hover:ring-1 hover:ring-black/[0.04] hover:ring-inset focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 dark:hover:bg-white/6 dark:hover:ring-white/[0.06]"
								{...props}
							>
								<Avatar.Root class="size-7 rounded-lg ring-1 ring-border/50 after:rounded-lg">
									<Avatar.Image src={user.image} alt={user.name} class="rounded-lg" />
									<Avatar.Fallback class="rounded-lg bg-muted text-[10px] font-bold"
										>{initials}</Avatar.Fallback
									>
								</Avatar.Root>
								<span class="hidden text-sm font-medium lg:block">{user.name}</span>
							</button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-64">
						<DropdownMenu.Label class="p-0 font-normal">
							<div class="flex items-center gap-3 px-3 py-3">
								<Avatar.Root class="size-9 rounded-xl ring-1 ring-border/50 after:rounded-xl">
									<Avatar.Image src={user.image} alt={user.name} class="rounded-xl" />
									<Avatar.Fallback class="rounded-xl bg-muted text-xs font-bold"
										>{initials}</Avatar.Fallback
									>
								</Avatar.Root>
								<div class="grid flex-1 text-left leading-tight">
									<span class="truncate text-sm font-semibold">{user.name}</span>
									<span class="truncate text-xs text-muted-foreground">{user.email}</span>
								</div>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />

						<!-- Organisation switcher -->
						{#if currentOrg}
							<DropdownMenu.Label
								class="px-3 py-1 text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase"
							>
								Organisation
							</DropdownMenu.Label>
							{#each orgs as org (org._id)}
								{@const isActive = org._id === currentOrg._id}
								<DropdownMenu.Item
									class="mx-1 gap-2.5 rounded-lg py-2"
									onSelect={() => switchOrg(org._id)}
									disabled={isSwitching}
								>
									<div
										class="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded text-[10px] font-bold
										{(org as any).logoUrl
											? ''
											: isActive
												? 'bg-primary/15 text-primary'
												: 'bg-muted text-muted-foreground'}"
									>
										{#if (org as any).logoUrl}
											<img
												src={(org as any).logoUrl}
												alt={org.name}
												class="size-full object-contain"
											/>
										{:else}
											{orgInitials(org.name)}
										{/if}
									</div>
									<span class="min-w-0 flex-1 truncate text-sm">{org.name}</span>
									{#if isActive}
										<CheckIcon class="size-3.5 shrink-0 text-primary" />
									{/if}
								</DropdownMenu.Item>
							{/each}
							<DropdownMenu.Item
								class="mx-1 gap-2.5 rounded-lg py-2 text-muted-foreground"
								onSelect={() => {
									window.location.href = localizedHref('/onboarding/organization');
								}}
							>
								<div class="flex size-5 shrink-0 items-center justify-center rounded bg-muted">
									<PlusIcon class="size-3" />
								</div>
								<span class="text-sm">Créer une organisation</span>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
						{/if}

						<DropdownMenu.Group>
							<a href={resolve(localizedHref('/app'))}>
								<DropdownMenu.Item class="gap-2.5 py-2">
									<AppWindowIcon class="size-4 text-muted-foreground" />
									<span>Espace salarié</span>
								</DropdownMenu.Item>
							</a>
							<a href={resolve(localizedHref('/admin/settings'))}>
								<DropdownMenu.Item class="gap-2.5 py-2">
									<SettingsIcon class="size-4 text-muted-foreground" />
									<T keyName="admin.sidebar.settings" />
								</DropdownMenu.Item>
							</a>
						</DropdownMenu.Group>
						<DropdownMenu.Separator />
						<div class="flex items-center justify-between px-3 py-1.5">
							<span class="text-sm text-muted-foreground">Thème</span>
							<LightSwitch variant="ghost" />
						</div>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							onclick={() => signOut()}
							data-testid="logout-button"
							class="gap-2.5 py-2 text-destructive focus:text-destructive dark:text-destructive"
						>
							<LogOutIcon class="size-4" />
							<T keyName="app.user_menu.logout" />
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}

			<!-- Mobile hamburger -->
			<button
				type="button"
				class="ml-1 flex size-9 items-center justify-center rounded-xl transition-all duration-150 hover:bg-muted/60 md:hidden dark:hover:bg-white/5"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label="Menu"
			>
				{#if mobileMenuOpen}
					<XIcon class="size-4.5" />
				{:else}
					<MenuIcon class="size-4.5" />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile nav menu -->
	{#if mobileMenuOpen}
		<div
			class="admin-topbar absolute inset-x-0 top-[62px] z-50 border-t border-[var(--topbar-border)] px-4 py-3 md:hidden"
		>
			<nav class="flex flex-col gap-1">
				{#each navItems as item (item.translationKey)}
					{#if item.url}
						<a
							href={resolve(item.url)}
							onclick={() => (mobileMenuOpen = false)}
							class={cn(
								'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
								item.isActive
									? 'topbar-nav-pill-active'
									: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5'
							)}
						>
							{#if item.icon}
								<item.icon class="size-4 shrink-0" />
							{/if}
							<T keyName={item.translationKey} />
						</a>
					{/if}
				{/each}
				<div class="mt-2 flex items-center gap-0.5 border-t border-[var(--topbar-border)] pt-2">
					<NotificationCenter />
				</div>
			</nav>
		</div>
	{/if}
</header>
