<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { goto } from '$app/navigation';
	import { localizedHref } from '$lib/utils/i18n';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import BellIcon from '@lucide/svelte/icons/bell';
	import BellOffIcon from '@lucide/svelte/icons/bell-off';
	import NotificationItem from './NotificationItem.svelte';
	import type { AppNotification } from './NotificationItem.svelte';

	let isOpen = $state(false);

	const client = useConvexClient();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const notificationsQuery = useQuery((api as any).notifications.listMyNotifications, {});

	const notifications = $derived<AppNotification[]>(notificationsQuery.data ?? []);
	const unreadCount = $derived(notifications.filter((n) => !n.isRead).length);

	type Group = { label: string; items: AppNotification[] };

	function getGroupLabel(ts: number): string {
		const now = new Date();
		const date = new Date(ts);
		if (date.toDateString() === now.toDateString()) return "Aujourd'hui";
		const yesterday = new Date(now);
		yesterday.setDate(now.getDate() - 1);
		if (date.toDateString() === yesterday.toDateString()) return 'Hier';
		const weekAgo = new Date(now);
		weekAgo.setDate(now.getDate() - 7);
		if (date >= weekAgo) return 'Cette semaine';
		return 'Plus ancien';
	}

	const groupedNotifications = $derived.by<Group[]>(() => {
		const ORDER = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien'];
		const map = new Map<string, AppNotification[]>();
		for (const n of notifications) {
			const label = getGroupLabel(n.createdAt);
			if (!map.has(label)) map.set(label, []);
			map.get(label)!.push(n);
		}
		return ORDER.filter((l) => map.has(l)).map((label) => ({ label, items: map.get(label)! }));
	});

	async function handleNotificationClick(notification: AppNotification) {
		if (!notification.isRead) {
			await client.mutation(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(api as any).notifications.markAsRead,
				{ notificationId: notification._id }
			);
		}
		if (notification.link) {
			isOpen = false;
			await goto(localizedHref(notification.link));
		}
	}

	async function handleMarkAllAsRead() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await client.mutation((api as any).notifications.markAllAsRead, {});
	}
</script>

<Sheet.Root bind:open={isOpen}>
	<Sheet.Trigger>
		{#snippet child({ props })}
			<div class="relative">
				<Button
					variant="ghost"
					size="icon"
					class="size-9 rounded-xl text-muted-foreground transition-all duration-150 hover:bg-muted/60 hover:text-foreground hover:ring-1 hover:ring-inset hover:ring-black/[0.04] dark:hover:bg-white/6 dark:hover:ring-white/[0.06]"
					aria-label="Notifications"
					{...props}
				>
					<BellIcon class="size-4" />
				</Button>
				{#if unreadCount > 0}
					<span
						class="pointer-events-none absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-[var(--brand-foreground)]"
						style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.2)"
					>
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				{/if}
			</div>
		{/snippet}
	</Sheet.Trigger>

	<Sheet.Content side="right" class="flex h-full w-96 flex-col gap-0 overflow-hidden p-0">
		<!-- Header -->
		<div class="flex flex-col gap-0.5 border-b border-border/50 px-5 py-3.5">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-semibold tracking-tight">Notifications</h2>
				{#if unreadCount > 0}
					<Button
						variant="ghost"
						size="sm"
						class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
						onclick={handleMarkAllAsRead}
					>
						Tout marquer comme lu
					</Button>
				{/if}
			</div>
			{#if unreadCount > 0}
				<p class="text-[11px] text-muted-foreground">
					{unreadCount} non-lue{unreadCount > 1 ? 's' : ''}
				</p>
			{/if}
		</div>

		<!-- Body -->
		<ScrollArea class="flex-1">
			{#if notifications.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
					<div class="flex size-12 items-center justify-center rounded-2xl bg-muted/80 ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]">
						<BellOffIcon class="size-5 text-muted-foreground/50" />
					</div>
					<div>
						<p class="text-sm font-medium">Aucune notification</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							Vous serez notifié de vos réservations et alertes ici.
						</p>
					</div>
				</div>
			{:else}
				<div class="divide-y divide-border/40">
					{#each groupedNotifications as group (group.label)}
						<div class="sticky top-0 z-10 border-b border-border/40 bg-[var(--topbar-bg)] px-5 py-1.5 backdrop-blur-sm">
							<p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
								{group.label}
							</p>
						</div>
						{#each group.items as notification (notification._id)}
							<NotificationItem {notification} onclick={handleNotificationClick} />
						{/each}
					{/each}
				</div>
			{/if}
		</ScrollArea>
	</Sheet.Content>
</Sheet.Root>
