<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { toast } from 'svelte-sonner';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import SearchIcon from '@lucide/svelte/icons/search';
	import BuildingIcon from '@lucide/svelte/icons/building-2';

	const TIER_LABEL: Record<string, string> = {
		diagnostic: 'Diag.',
		conformite: 'Conf.',
		operateur: 'Opé.'
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const accessibleOrgs = useQuery((api as any)['concierge/staff'].getMyAccessibleOrgs, {});
	const currentOrgQuery = useQuery(api.organizations.getMyOrg, {});
	const client = useConvexClient();

	let open = $state(false);
	let search = $state('');
	let switching = $state(false);

	const currentOrg = $derived(currentOrgQuery.data);

	const filtered = $derived(
		(accessibleOrgs.data ?? []).filter((o: { name: string }) =>
			o.name.toLowerCase().includes(search.toLowerCase())
		)
	);

	async function select(orgId: string) {
		if (switching || orgId === currentOrg?._id) {
			open = false;
			return;
		}
		switching = true;
		try {
			await client.mutation(api.organizations.platformSwitchOrganization, {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				organizationId: orgId as any
			});
			open = false;
			window.location.reload();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Impossible de changer d'organisation");
			switching = false;
		}
	}
</script>

{#if accessibleOrgs.data && accessibleOrgs.data.length > 0}
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			<Popover.Root bind:open onOpenChange={(v) => { if (!v) search = ''; }}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Sidebar.MenuButton
							size="lg"
							class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							{...props}
						>
							<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold uppercase">
								{#if currentOrg}
									{currentOrg.name.slice(0, 2)}
								{:else}
									<BuildingIcon class="size-4 text-muted-foreground/50" />
								{/if}
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">
									{currentOrg?.name ?? 'Sélectionner une org'}
								</span>
								<span class="truncate text-[10px] text-muted-foreground/60 uppercase tracking-wide">
									{#if currentOrg}
										{TIER_LABEL[(currentOrg as any).tier] ?? (currentOrg as any).tier ?? ''}
										· Mycelium
									{:else}
										Accès Mycelium · {accessibleOrgs.data.length} orgs
									{/if}
								</span>
							</div>
							<ChevronsUpDownIcon class="ml-auto size-4 shrink-0 opacity-40" />
						</Sidebar.MenuButton>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-72 p-0" align="start" side="right" sideOffset={8}>
					<div class="flex items-center gap-2 border-b border-border px-3 py-2">
						<SearchIcon class="size-3.5 shrink-0 text-muted-foreground" />
						<input
							type="text"
							placeholder="Rechercher une organisation…"
							bind:value={search}
							class="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50"
						/>
					</div>
					<div class="max-h-72 overflow-y-auto py-1">
						{#if filtered.length === 0}
							<p class="px-3 py-4 text-center text-xs text-muted-foreground">
								Aucune organisation trouvée
							</p>
						{:else}
							{#each filtered as org (org._id)}
								<button
									type="button"
									onclick={() => select(org._id)}
									disabled={switching}
									class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted/60 disabled:opacity-50 {org._id === currentOrg?._id ? 'bg-muted/40 font-medium' : ''}"
								>
									<div class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold uppercase">
										{org.name.slice(0, 2)}
									</div>
									<span class="min-w-0 flex-1 truncate">{org.name}</span>
									<span class="shrink-0 rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
										{TIER_LABEL[org.tier] ?? org.tier}
									</span>
									{#if org._id === currentOrg?._id}
										<CheckIcon class="size-3.5 shrink-0 text-[var(--brand)]" />
									{/if}
								</button>
							{/each}
						{/if}
					</div>
					<div class="border-t border-border px-3 py-2">
						<p class="text-[10px] text-muted-foreground/50">
							{accessibleOrgs.data.length} organisations · accès Mycelium
						</p>
					</div>
				</Popover.Content>
			</Popover.Root>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
	<Sidebar.Separator />
{/if}
