<script lang="ts">
	import NavUser from '../nav-user.svelte';
	import OrganizationSwitcher from '../layout/OrganizationSwitcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button/index.js';
	import { resolve } from '$app/paths';
	import type { ComponentProps } from 'svelte';
	import { T } from '@tolgee/svelte';
	import type { NavItem, NavSubItem, SidebarConfig, User } from './types';
	import { haptic } from '$lib/hooks/use-haptic.svelte';
	import { PersistedState } from 'runed';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import SidebarThreadList from './sidebar-thread-list.svelte';
	import * as Kbd from '$lib/components/ui/kbd/index.js';

	interface Props extends ComponentProps<typeof Sidebar.Root> {
		config: SidebarConfig;
		user?: User;
		/** Thread sub-items passed separately to avoid snippet re-render destroying DOM nodes */
		threadSubItems?: NavSubItem[];
		/** Show the OrganizationSwitcher in the sidebar header (admin area) */
		showOrgSwitcher?: boolean;
	}

	let { config, user, threadSubItems, showOrgSwitcher = false, ...restProps }: Props = $props();

	const aiChatOpen = new PersistedState('ai-chat-threads-open', true);
</script>

{#snippet navItemBody(item: NavItem)}
	{#if item.icon}
		<item.icon />
	{/if}
	<span class="min-w-0 truncate"><T keyName={item.translationKey} /></span>
	{#if item.kbd}
		{@render shortcutHint(item.kbd)}
	{/if}
{/snippet}

<!-- Shortcut hint revealed on hover — absolutely placed so it never steals width -->
{#snippet shortcutHint(keys: string[])}
	<span
		class="pointer-events-none absolute inset-y-0 -right-2 flex items-center justify-end overflow-hidden rounded-r-md bg-sidebar-accent-hover [mask-image:linear-gradient(to_right,transparent,#000_2rem)] pr-3 pl-8 opacity-0 group-hover/menu-button:opacity-100 group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[active=true]/menu-button:bg-sidebar-accent"
	>
		<Kbd.Group>
			{#each keys as key (key)}
				<Kbd.Root>{key}</Kbd.Root>
			{/each}
		</Kbd.Group>
	</span>
{/snippet}

<Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Header>
		{#if showOrgSwitcher}
			<OrganizationSwitcher />
			<Sidebar.Separator />
		{/if}
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				{#if config.header.dropdownItems && config.header.dropdownItems.length > 0}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									variant="ghost"
									class="w-full justify-start gap-2.5 px-2 !transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
									{...props}
								>
									<span class="flex size-6 shrink-0 items-center justify-center rounded bg-sidebar-primary/10">
										<config.header.icon class="!size-4 text-sidebar-primary" />
									</span>
									<span class="text-sm font-semibold tracking-tight">
										{#if config.header.title !== undefined}
											{config.header.title}
										{:else}
											<T keyName={config.header.titleKey} />
										{/if}
									</span>
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="start" class="w-56">
							{#each config.header.dropdownItems as item (item.translationKey)}
								<a href={resolve(item.url)} onclick={() => haptic.trigger('light')}>
									<DropdownMenu.Item>
										<item.icon class="size-4" />
										<span><T keyName={item.translationKey} /></span>
									</DropdownMenu.Item>
								</a>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{:else}
					<Button
						variant="ghost"
						href={resolve(config.header.href)}
						class="w-full justify-start gap-2.5 px-2 !transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					>
						<span class="flex size-6 shrink-0 items-center justify-center rounded bg-sidebar-primary/10">
							<config.header.icon class="!size-4 text-sidebar-primary" />
						</span>
						<span class="text-sm font-semibold tracking-tight">
							{#if config.header.title !== undefined}
								{config.header.title}
							{:else}
								<T keyName={config.header.titleKey} />
							{/if}
						</span>
					</Button>
				{/if}
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent class="flex flex-col gap-0.5">
				<Sidebar.Menu>
					{#each config.navItems as item (item.translationKey)}
						{#if item.divider}
							<!-- Section label / separator -->
							{#if item.sectionLabel}
								<Sidebar.GroupLabel class="mt-3 mb-0.5 px-2 text-[10px] font-medium uppercase tracking-[0.12em] opacity-40">
									{item.sectionLabel}
								</Sidebar.GroupLabel>
							{:else}
								<li class="my-2 mx-1 h-px bg-sidebar-border" role="separator"></li>
							{/if}
						{:else if item.collapsible}
							<!-- Collapsible nav item: main button navigates, chevron toggles -->
							<Collapsible.Root
								open={aiChatOpen.current}
								onOpenChange={(open) => (aiChatOpen.current = open)}
								class="group/collapsible"
							>
								{#snippet child({ props })}
									<Sidebar.MenuItem {...props}>
										<Sidebar.MenuButton
											isActive={item.isActive}
											class="relative !transition-transform"
											onclick={() => haptic.trigger('light')}
										>
											{#snippet child({ props })}
												<a
													href={item.url ? resolve(item.url) : undefined}
													{...props}
													onclick={item.disableNav ? (e) => e.preventDefault() : undefined}
												>
													{@render navItemBody(item)}
												</a>
											{/snippet}
										</Sidebar.MenuButton>
										<Collapsible.Trigger>
											{#snippet child({ props })}
												<Sidebar.MenuAction
													{...props}
													class="transition-transform duration-200 active:translate-y-px data-[state=open]:rotate-90"
												>
													<ChevronRightIcon />
												</Sidebar.MenuAction>
											{/snippet}
										</Collapsible.Trigger>
									</Sidebar.MenuItem>
								{/snippet}
							</Collapsible.Root>
						{:else}
							<!-- Standard nav item -->
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									isActive={item.isActive}
									class="relative !transition-transform"
									onclick={() => {
										haptic.trigger('light');
										item.onSelect?.();
									}}
								>
									{#snippet child({ props })}
										{#if item.url}
											<a href={resolve(item.url)} {...props}>
												{@render navItemBody(item)}
											</a>
										{:else}
											<button type="button" {...props}>
												{@render navItemBody(item)}
											</button>
										{/if}
									{/snippet}
								</Sidebar.MenuButton>
								{#if item.badge && item.badge > 0}
									<Sidebar.MenuBadge>{item.badge >= 100 ? '99+' : item.badge}</Sidebar.MenuBadge>
								{/if}
							</Sidebar.MenuItem>
						{/if}
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>

			{#if aiChatOpen.current}
				<SidebarThreadList items={threadSubItems ?? []} />
			{/if}
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Separator />
		{#if config.footerLinks && config.footerLinks.length > 0}
			<Sidebar.Menu>
				{#each config.footerLinks as link (link.translationKey)}
					{#if link.condition !== false}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								class="relative !transition-transform"
								onclick={() => haptic.trigger('light')}
							>
								{#snippet child({ props })}
									<a href={resolve(link.url)} {...props}>
										<link.icon />
										<span class="min-w-0 truncate"><T keyName={link.translationKey} /></span>
										{#if link.kbd}
											{@render shortcutHint(link.kbd)}
										{/if}
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/if}
				{/each}
			</Sidebar.Menu>
		{/if}
		{#if user}
			<NavUser user={{ name: user.name, email: user.email, avatar: user.image || '' }} />
		{/if}
	</Sidebar.Footer>
</Sidebar.Root>
