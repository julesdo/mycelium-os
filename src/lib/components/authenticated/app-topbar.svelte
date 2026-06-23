<script lang="ts">
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
	import NotificationCenter from '$lib/components/notifications/NotificationCenter.svelte';
	import LightSwitch from '$lib/components/ui/light-switch/light-switch.svelte';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { cn } from '$lib/utils';
	import Logo from '../icons/logo.svelte';

	const { t } = getTranslate();

	interface Props {
		config: SidebarConfig;
		user?: User;
	}

	let { config, user }: Props = $props();

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

	const navItems = $derived(config.navItems.filter((item) => !item.divider));
	const footerLinks = $derived(config.footerLinks ?? []);

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
		<!-- Logo — links to /app home -->
		<a
			href={resolve(localizedHref('/app'))}
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

		<!-- Divider — desktop only -->
		<div class="hidden h-5 w-px bg-border/60 md:block"></div>

		<!-- Desktop nav — hidden on mobile (bottom nav takes over) -->
		<nav class="hidden flex-1 items-center gap-0.5 md:flex">
			{#each navItems as item (item.translationKey)}
				{#if item.url}
					<a
						href={resolve(item.url)}
						class={cn(
							'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-150',
							item.isActive
								? 'topbar-nav-pill-active'
								: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/6 hover:ring-1 hover:ring-inset hover:ring-black/[0.04] dark:hover:ring-white/[0.06]'
						)}
					>
						{#if item.icon}
							<item.icon class="size-3.5 shrink-0" />
						{/if}
						<T keyName={item.translationKey} />
					</a>
				{/if}
			{/each}
		</nav>

		<!-- Right actions — always visible -->
		<div class="ml-auto flex shrink-0 items-center gap-0.5">
			<NotificationCenter />

			<div class="mx-1.5 hidden h-5 w-px bg-border/60 md:block"></div>

			<!-- User avatar dropdown -->
			{#if user}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<button
								type="button"
								class="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-150 hover:bg-muted/60 hover:ring-1 hover:ring-inset hover:ring-black/[0.04] dark:hover:bg-white/6 dark:hover:ring-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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
					<DropdownMenu.Content align="end" class="w-60">
						<!-- Profile header -->
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

						<!-- Footer links (e.g. admin panel) -->
						{#if footerLinks.length > 0}
							<DropdownMenu.Group>
								{#each footerLinks as link (link.translationKey)}
									{#if link.url}
										<a href={resolve(link.url)}>
											<DropdownMenu.Item class="gap-2.5 py-2">
												{#if link.icon}
													<link.icon class="size-4 text-muted-foreground" />
												{/if}
												<T keyName={link.translationKey} />
											</DropdownMenu.Item>
										</a>
									{/if}
								{/each}
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
						{/if}

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
		</div>
	</div>
</header>
