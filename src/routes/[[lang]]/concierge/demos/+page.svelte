<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const demos = useQuery((api as any)['concierge/demos'].listDemos, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const extendDemoMutation = useMutation((api as any)['concierge/demos'].extendDemo);

	const stats = $derived.by(() => {
		const data = (demos.data as any[]) ?? [];
		return {
			active: data.filter((d) => !d.demoConfig?.isExpired && !d.demoConfig?.convertedAt).length,
			expired: data.filter((d) => d.demoConfig?.isExpired && !d.demoConfig?.convertedAt).length,
			converted: data.filter((d) => d.demoConfig?.convertedAt).length
		};
	});

	// Prolongation dialog
	let extendDialogOpen = $state(false);
	let extendTarget = $state<{ orgId: string; orgName: string } | null>(null);
	let extraDays = $state(7);
	let extending = $state(false);
	let extendError = $state<string | null>(null);

	function openExtend(orgId: string, orgName: string) {
		extendTarget = { orgId, orgName };
		extraDays = 7;
		extendError = null;
		extendDialogOpen = true;
	}

	async function doExtend() {
		if (!extendTarget) return;
		extending = true;
		extendError = null;
		try {
			await extendDemoMutation({ organizationId: extendTarget.orgId, extraDays });
			extendDialogOpen = false;
		} catch (e: unknown) {
			extendError = e instanceof Error ? e.message : 'Erreur lors de la prolongation';
		} finally {
			extending = false;
		}
	}

	function daysLeft(expiresAt: number): number {
		return Math.ceil((expiresAt - Date.now()) / 86400000);
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold">Comptes démo</h1>
			<p class="text-sm text-muted-foreground">{(demos.data as any[])?.length ?? 0} démos créées</p>
		</div>
		<Button
			href={resolve(localizedHref('/concierge/demos/new'))}
			class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
		>
			<PlusIcon class="mr-1.5 size-4" />
			Nouvelle démo
		</Button>
	</div>

	<!-- KPIs -->
	<div class="grid grid-cols-3 gap-4">
		{#each [
			{ label: 'Démos actives', value: stats.active, color: 'text-emerald-500' },
			{ label: 'Expirées (à relancer)', value: stats.expired, color: 'text-red-500' },
			{ label: 'Converties', value: stats.converted, color: 'text-[var(--brand)]' }
		] as kpi}
			<div
				class="relative overflow-hidden rounded-xl border border-border bg-card p-4"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
			>
				<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
				<p class="text-2xl font-bold {kpi.color}">{kpi.value}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">{kpi.label}</p>
			</div>
		{/each}
	</div>

	<!-- Table des démos -->
	<div class="overflow-hidden rounded-xl border border-border">
		{#if demos.isLoading}
			<div class="py-12 text-center text-sm text-muted-foreground">Chargement…</div>
		{:else if !demos.data || (demos.data as any[]).length === 0}
			<div class="py-12 text-center text-sm text-muted-foreground">
				Aucune démo créée.
				<a
					href={resolve(localizedHref('/concierge/demos/new'))}
					class="ml-1 underline hover:text-foreground"
				>
					Créer la première
				</a>
			</div>
		{:else}
			<table class="w-full">
				<thead class="border-b border-border bg-muted/30">
					<tr>
						{#each ['Prospect', 'Template', 'Commercial', 'Créée le', 'Expire', 'Statut', 'Actions'] as h}
							<th
								class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
							>
								{h}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-border/60">
					{#each (demos.data as any[]) as demo (demo._id)}
						{@const cfg = demo.demoConfig}
						{@const dl = cfg ? daysLeft(cfg.expiresAt) : 0}
						<tr class="transition-colors hover:bg-muted/30">
							<td class="px-4 py-3">
								<p class="text-sm font-medium">{demo.name}</p>
								<p class="text-xs text-muted-foreground">{cfg?.prospectName ?? ''}</p>
							</td>
							<td class="px-4 py-3 text-sm capitalize text-muted-foreground">
								{cfg?.templateId ?? '—'}
							</td>
							<td class="px-4 py-3 text-sm text-muted-foreground">
								{cfg?.commercialName ?? '—'}
							</td>
							<td class="px-4 py-3 text-xs text-muted-foreground">
								{demo.createdAt
									? new Date(demo.createdAt).toLocaleDateString('fr-FR', {
											day: '2-digit',
											month: 'short'
										})
									: '—'}
							</td>
							<td class="px-4 py-3">
								{#if cfg?.isExpired}
									<Badge class="border-red-500/20 bg-red-500/10 text-[10px] text-red-500">
										Expirée
									</Badge>
								{:else if dl <= 3 && dl > 0}
									<Badge class="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-600">
										J-{dl}
									</Badge>
								{:else if dl > 0}
									<span class="text-xs text-muted-foreground">J-{dl}</span>
								{:else}
									<Badge class="border-red-500/20 bg-red-500/10 text-[10px] text-red-500">
										Expirée
									</Badge>
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if cfg?.convertedAt}
									<Badge class="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600">
										Converti
									</Badge>
								{:else if cfg?.isExpired}
									<Badge class="border-red-500/20 bg-red-500/10 text-[10px] text-red-500">
										Expiré
									</Badge>
								{:else}
									<Badge class="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-600">
										Actif
									</Badge>
								{/if}
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-1.5">
									<Button
										size="sm"
										variant="ghost"
										class="h-7 text-xs"
										href={resolve(localizedHref(`/concierge/${demo._id}`))}
									>
										Voir
									</Button>
									{#if !cfg?.convertedAt && (cfg?.extendedCount ?? 0) < 3}
										<Button
											size="sm"
											variant="outline"
											class="h-7 text-xs"
											onclick={() => openExtend(demo._id, demo.name)}
										>
											Prolonger
										</Button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<!-- Dialog prolongation -->
<Dialog.Root bind:open={extendDialogOpen}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Prolonger la démo</Dialog.Title>
			<Dialog.Description>
				{extendTarget?.orgName} — max. 3 prolongations, 14 jours chacune.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-2">
			<div class="space-y-1.5">
				<Label for="extraDays">Nombre de jours supplémentaires</Label>
				<Input
					id="extraDays"
					type="number"
					min={1}
					max={14}
					bind:value={extraDays}
					class="h-10"
				/>
			</div>
			{#if extendError}
				<p class="text-sm text-destructive">{extendError}</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="ghost" onclick={() => (extendDialogOpen = false)}>Annuler</Button>
			<Button
				onclick={doExtend}
				disabled={extending || extraDays < 1 || extraDays > 14}
				class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
			>
				{extending ? 'Prolongation…' : 'Confirmer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
