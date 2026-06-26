<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { page } from '$app/state';
	import { localizedHref } from '$lib/utils/i18n';

	const convexClient = useConvexClient();
	const orgsQuery = useQuery(api.organizations.listMyOrganizations, {});
	const currentOrgQuery = useQuery(api.organizations.getMyOrg, {});

	const orgs = $derived(orgsQuery.data ?? []);
	const currentOrg = $derived(currentOrgQuery.data);
	const showSwitcher = $derived(orgs.length > 1);

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

	function initials(name: string): string {
		return name
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}
</script>

{#if !currentOrg}
	<!-- Not loaded yet or no org — silent -->
{:else}
	<!-- Always a dropdown: single or multiple orgs -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<button
					type="button"
					data-testid="org-switcher-trigger"
					{...props}
					disabled={isSwitching}
					aria-label="Organisation — {currentOrg.name}"
					class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:cursor-wait disabled:opacity-60"
				>
					<div
						class="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary"
					>
						{#if isSwitching}
							<Loader2Icon class="size-4 motion-safe:animate-spin" />
						{:else if orgs.length > 1}
							{initials(currentOrg.name)}
						{:else}
							<Building2Icon class="size-4" />
						{/if}
					</div>
					<span data-testid="current-org-name" class="min-w-0 flex-1 truncate font-medium"
						>{currentOrg.name}</span
					>
					<ChevronsUpDownIcon class="size-4 shrink-0 text-sidebar-foreground/40" />
				</button>
			{/snippet}
		</DropdownMenu.Trigger>

		<DropdownMenu.Content
			data-testid="org-switcher-menu"
			align="start"
			side="right"
			sideOffset={8}
			class="w-56"
		>
			{#if orgs.length > 1}
				<DropdownMenu.Label class="px-2 py-1 text-xs font-medium text-muted-foreground">
					Organisations
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#each orgs as org (org._id)}
					{@const isActive = org._id === currentOrg._id}
					<DropdownMenu.Item
						data-testid="org-switcher-item"
						data-org-name={org.name}
						class="flex cursor-pointer items-center gap-2"
						onSelect={() => switchOrg(org._id)}
					>
						<div
							class="flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold transition-colors duration-150
							{isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}"
						>
							{initials(org.name)}
						</div>
						<span class="min-w-0 flex-1 truncate">{org.name}</span>
						{#if isActive}
							<CheckIcon class="ml-auto size-4 shrink-0 text-primary" />
						{/if}
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Separator />
			{/if}
			<DropdownMenu.Item
				class="flex cursor-pointer items-center gap-2 text-muted-foreground"
				onSelect={() => {
					window.location.href = localizedHref('/onboarding/organization');
				}}
			>
				<PlusIcon class="size-4 shrink-0" />
				<span>Créer une organisation</span>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
