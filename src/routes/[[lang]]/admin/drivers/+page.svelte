<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import { cn } from '$lib/utils.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import UsersIcon from '@lucide/svelte/icons/users';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	const lang = $derived(page.params.lang as string | undefined);

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const allDriversQuery = useQuery((api as any).drivers.listDriversForOrg, { filter: 'all' });
	const allDrivers = $derived(allDriversQuery.data ?? []);
	const isLoading = $derived(allDriversQuery.isLoading);

	type DriverRow = {
		member: { _id: string; userId: string; role: string };
		profile: {
			isBlocked?: boolean;
			licenseValidated?: boolean;
			licenseExpiryDate?: string;
			licenseCategories?: string[];
			licenseNumber?: string;
		} | null;
		isExpiringSoon: boolean;
		isExpired: boolean;
		user: { name: string | null; email: string; image: string | null } | null;
	};

	let activeFilter = $state<'all' | 'expiring_soon' | 'blocked' | 'not_validated'>('all');

	const filtered = $derived(
		allDrivers.filter((d: DriverRow) => {
			if (activeFilter === 'blocked') return d.profile?.isBlocked || d.isExpired;
			if (activeFilter === 'expiring_soon') return d.isExpiringSoon;
			if (activeFilter === 'not_validated') return d.profile !== null && !d.profile.licenseValidated;
			return true;
		})
	);

	const blockedCount = $derived(
		allDrivers.filter((d: DriverRow) => d.profile?.isBlocked || d.isExpired).length
	);
	const expiringSoonCount = $derived(allDrivers.filter((d: DriverRow) => d.isExpiringSoon).length);

	function formatExpiry(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function statusLabel(d: DriverRow): { label: string; class: string; icon: 'blocked' | 'expiring' | 'validated' | 'incomplete' | 'pending' } {
		if (d.profile?.isBlocked || d.isExpired)
			return { label: 'Bloqué', class: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: 'blocked' };
		if (d.isExpiringSoon)
			return { label: 'Bientôt', class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', icon: 'expiring' };
		if (d.profile?.licenseValidated)
			return { label: 'Validé', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: 'validated' };
		if (d.profile && !d.profile.licenseValidated)
			return { label: 'Non validé', class: 'bg-muted text-muted-foreground', icon: 'pending' };
		return { label: 'Incomplet', class: 'bg-muted text-muted-foreground', icon: 'incomplete' };
	}
</script>

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div class="flex items-center justify-between gap-4">
		<div class="flex items-center gap-2">
			<h1 class="text-base font-semibold">Conducteurs</h1>
			{#if !isLoading && allDrivers.length > 0}
				<span class="tabular-nums rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
					{allDrivers.length}
				</span>
			{/if}
		</div>
	</div>

	<!-- Alert banners -->
	{#if !isLoading && (expiringSoonCount > 0 || blockedCount > 0)}
		<div class="flex flex-col gap-2">
			{#if blockedCount > 0}
				<div class="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
					<XCircleIcon class="size-4 shrink-0" />
					{blockedCount} conducteur{blockedCount > 1 ? 's' : ''} bloqué{blockedCount > 1 ? 's' : ''} — permis expiré
				</div>
			{/if}
			{#if expiringSoonCount > 0}
				<div class="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
					<AlertTriangleIcon class="size-4 shrink-0" />
					{expiringSoonCount} conducteur{expiringSoonCount > 1 ? 's' : ''} avec permis expirant dans 30 jours
				</div>
			{/if}
		</div>
	{/if}

	<!-- Tabs filter -->
	<Tabs.Root bind:value={activeFilter}>
		<Tabs.List variant="line">
			<Tabs.Trigger value="all">
				Tous
				{#if allDrivers.length > 0}
					<Badge variant="ghost" class="ml-1 px-1.5 py-0">{allDrivers.length}</Badge>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="expiring_soon">
				Bientôt expirés
				{#if expiringSoonCount > 0}
					<Badge variant="warning" class="ml-1 px-1.5 py-0">{expiringSoonCount}</Badge>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="blocked">
				Bloqués
				{#if blockedCount > 0}
					<Badge variant="destructive" class="ml-1 px-1.5 py-0">{blockedCount}</Badge>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="not_validated">Non validés</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	<!-- Content -->
	{#if isLoading}
		<div class="overflow-hidden rounded-2xl border border-border">
			<div class="divide-y divide-border">
				{#each Array(6) as _, i (i)}
					<div class="flex h-12 items-center gap-4 px-4">
						<Skeleton class="h-3.5 w-32" />
						<Skeleton class="h-3.5 w-24" />
						<Skeleton class="ml-auto h-3.5 w-20" />
						<Skeleton class="h-5 w-16 rounded-full" />
					</div>
				{/each}
			</div>
		</div>

	{:else if filtered.length === 0}
		<EmptyState
			title={activeFilter === 'all' ? 'Aucun conducteur' : 'Aucun conducteur dans ce filtre'}
			description={activeFilter === 'all' ? 'Aucun membre dans cette organisation.' : undefined}
		>
			{#snippet icon()}<UsersIcon class="size-12" />{/snippet}
		</EmptyState>

	{:else}
		<div class="overflow-hidden rounded-2xl border border-border">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-border bg-muted/40">
						<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Conducteur</th>
						<th class="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground md:table-cell">Catégories</th>
						<th class="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground lg:table-cell">Expiration</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Statut</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filtered as d (d.member.userId)}
						{@const status = statusLabel(d)}
						<tr
							class="cursor-pointer transition-colors hover:bg-muted/40"
							onclick={() => goto(resolve(localHref(`/admin/drivers/${d.member.userId}`)))}
						>
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									{#if d.user?.image}
										<img src={d.user.image} alt="" class="size-8 rounded-full object-cover shrink-0" />
									{:else}
										<div class="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
											<span class="text-xs font-semibold text-muted-foreground">
												{(d.user?.name ?? d.user?.email ?? '?')[0].toUpperCase()}
											</span>
										</div>
									{/if}
									<div class="flex flex-col gap-0.5 min-w-0">
										<span class="font-medium text-sm truncate">{d.user?.name ?? d.user?.email ?? d.member.userId.slice(-8)}</span>
										{#if d.user?.name && d.user?.email}
											<span class="text-xs text-muted-foreground truncate">{d.user.email}</span>
										{/if}
									</div>
								</div>
							</td>
							<td class="hidden px-4 py-3 md:table-cell">
								{#if d.profile?.licenseCategories?.length}
									<span class="font-medium">{d.profile.licenseCategories.join(', ')}</span>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</td>
							<td class="hidden px-4 py-3 lg:table-cell">
								{#if d.profile?.licenseExpiryDate}
									<span class={cn(
										d.isExpired && 'text-red-600 dark:text-red-400',
										d.isExpiringSoon && 'text-amber-600 dark:text-amber-400'
									)}>
										{formatExpiry(d.profile.licenseExpiryDate)}
									</span>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium {status.class}">
									{#if status.icon === 'blocked'}
										<XCircleIcon class="size-3" />
									{:else if status.icon === 'expiring'}
										<AlertTriangleIcon class="size-3" />
									{:else if status.icon === 'validated'}
										<ShieldCheckIcon class="size-3" />
									{:else}
										<ClipboardListIcon class="size-3" />
									{/if}
									{status.label}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
