<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button';
	import BuildingIcon from '@lucide/svelte/icons/building-2';
	import CheckIcon from '@lucide/svelte/icons/check';
	import SearchIcon from '@lucide/svelte/icons/search';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ShieldIcon from '@lucide/svelte/icons/shield';

	interface Props {
		open: boolean;
		conciergeUserId: string;
		conciergeName: string;
		onclose: () => void;
	}

	let { open, conciergeUserId, conciergeName, onclose }: Props = $props();

	// Query des accès actuels du concierge
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const accessQ = useQuery((api as any)['concierge/staff'].listConciergeOrgAccess, { conciergeUserId });
	// Toutes les orgs (super admin y a accès via getMyAccessibleOrgs qui retourne tout)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const allOrgsQ = useQuery((api as any)['concierge/staff'].getMyAccessibleOrgs, {});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const assignOrg = useMutation((api as any)['concierge/staff'].assignOrgToConcierge);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const removeOrg = useMutation((api as any)['concierge/staff'].removeOrgFromConcierge);

	let search = $state('');
	let toggling = $state<string | null>(null);

	const assignedIds = $derived(
		new Set((accessQ.data ?? []).map((a: { organizationId: string }) => a.organizationId))
	);

	const filteredOrgs = $derived(
		(allOrgsQ.data ?? []).filter((o: { name: string }) =>
			o.name.toLowerCase().includes(search.toLowerCase())
		)
	);

	async function toggle(orgId: string) {
		if (toggling) return;
		toggling = orgId;
		try {
			if (assignedIds.has(orgId)) {
				await removeOrg({ conciergeUserId, organizationId: orgId });
				toast.success('Org retirée.');
			} else {
				await assignOrg({ conciergeUserId, organizationId: orgId });
				toast.success('Org assignée.');
			}
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		} finally {
			toggling = null;
		}
	}

	const TIER_COLOR: Record<string, string> = {
		essential: 'text-slate-500',
		professional: 'text-blue-500',
		business: 'text-violet-500',
		enterprise: 'text-amber-500'
	};
</script>

<Dialog.Root {open} onOpenChange={(v) => { if (!v) onclose(); }}>
	<Dialog.Content class="flex max-h-[80vh] flex-col sm:max-w-md">
		<Dialog.Header class="shrink-0">
			<Dialog.Title>Accès organisations</Dialog.Title>
			<Dialog.Description>
				Organisations auxquelles <strong>{conciergeName}</strong> peut accéder.
				Super admins ont accès à toutes les orgs sans configuration.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Search -->
		<div class="shrink-0 border-b border-border pb-3 pt-1">
			<div class="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
				<SearchIcon class="size-3.5 shrink-0 text-muted-foreground/50" />
				<input
					type="text"
					placeholder="Rechercher une organisation…"
					bind:value={search}
					class="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/40"
				/>
				{#if search}
					<button type="button" onclick={() => (search = '')} class="text-muted-foreground/50 hover:text-foreground">
						<span class="sr-only">Effacer</span>
						×
					</button>
				{/if}
			</div>
		</div>

		<!-- Liste orgs -->
		<div class="min-h-0 flex-1 overflow-y-auto">
			{#if allOrgsQ.isLoading || accessQ.isLoading}
				<div class="flex items-center justify-center py-10">
					<LoaderCircleIcon class="size-5 text-muted-foreground motion-safe:animate-spin" />
				</div>
			{:else if filteredOrgs.length === 0}
				<div class="flex flex-col items-center gap-2 py-10 text-center">
					<BuildingIcon class="size-6 text-muted-foreground/30" />
					<p class="text-sm text-muted-foreground">Aucune organisation trouvée</p>
				</div>
			{:else}
				<div class="divide-y divide-border/50">
					{#each filteredOrgs as org (org._id)}
						{@const isAssigned = assignedIds.has(org._id)}
						{@const isToggling = toggling === org._id}
						<button
							type="button"
							onclick={() => toggle(org._id)}
							disabled={isToggling}
							class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
						>
							<!-- Icône org -->
							<div class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-[11px] font-bold uppercase text-muted-foreground">
								{org.name.slice(0, 2)}
							</div>

							<!-- Infos -->
							<div class="min-w-0 flex-1">
								<p class="truncate text-[13px] font-medium leading-tight">{org.name}</p>
								<p class="text-[11px] {TIER_COLOR[org.tier] ?? 'text-muted-foreground'} capitalize">
									{org.tier}
									{#if org.country}· {org.country}{/if}
								</p>
							</div>

							<!-- Toggle indicator -->
							<div class="shrink-0">
								{#if isToggling}
									<LoaderCircleIcon class="size-4 text-muted-foreground motion-safe:animate-spin" />
								{:else if isAssigned}
									<div class="flex size-5 items-center justify-center rounded-full bg-[var(--brand)]">
										<CheckIcon class="size-3 text-black" />
									</div>
								{:else}
									<div class="size-5 rounded-full border-2 border-border/60"></div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer stat -->
		<div class="shrink-0 border-t border-border pt-3">
			<div class="flex items-center justify-between">
				<p class="text-[12px] text-muted-foreground">
					<span class="font-semibold text-foreground">{assignedIds.size}</span>
					org{assignedIds.size !== 1 ? 's' : ''} assignée{assignedIds.size !== 1 ? 's' : ''}
					sur {allOrgsQ.data?.length ?? '…'}
				</p>
				<Button variant="outline" size="sm" onclick={onclose}>Fermer</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
