<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import MetricCard from '$lib/components/ui/metric-card.svelte';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import ViolationForm from '$lib/components/violations/violation-form.svelte';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { cn } from '$lib/utils.js';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import UserIcon from '@lucide/svelte/icons/user';
	import DotsHorizontalIcon from '@lucide/svelte/icons/ellipsis';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	type ViolationStatus = 'RECEIVED' | 'IDENTIFIED' | 'NOTIFIED' | 'PAID' | 'CONTESTED' | 'CLOSED';
	type PaymentDecision = 'COMPANY' | 'DRIVER' | 'PENDING';

	interface ViolationRow {
		_id: string;
		vehicleId: string;
		driverUserId?: string;
		violationDate: number;
		amount: number;
		description: string;
		reference?: string;
		status: ViolationStatus;
		paymentDecision?: PaymentDecision;
		notes?: string;
		vehicle: { brand: string; model: string; registration: string } | null;
		driver: { name: string | null; email: string } | null;
		documentUrl?: string | null;
	}

	const STATUS_CONFIG: Record<ViolationStatus, { label: string; class: string }> = {
		RECEIVED: {
			label: 'Reçue',
			class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
		},
		IDENTIFIED: {
			label: 'Identifié',
			class: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
		},
		NOTIFIED: {
			label: 'Notifié',
			class: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
		},
		PAID: {
			label: 'Payée',
			class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
		},
		CONTESTED: {
			label: 'Contestée',
			class: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
		},
		CLOSED: { label: 'Clôturée', class: 'bg-muted text-muted-foreground' }
	};

	const PAYMENT_LABELS: Record<PaymentDecision, string> = {
		PENDING: '—',
		COMPANY: 'Entreprise',
		DRIVER: 'Conducteur'
	};

	// ── Queries ───────────────────────────────────────────────────────────────────
	const client = useConvexClient();

	const violationsQuery = useQuery((api as any).violations.listViolations, {});
	const allViolations = $derived<ViolationRow[]>(violationsQuery.data ?? []);
	const isLoading = $derived(violationsQuery.isLoading);

	// ── Tabs / filter ──────────────────────────────────────────────────────────────
	let activeTab = $state<ViolationStatus | 'all'>('all');

	const filtered = $derived(
		activeTab === 'all' ? allViolations : allViolations.filter((v) => v.status === activeTab)
	);

	// ── KPIs ──────────────────────────────────────────────────────────────────────
	const stats = $derived.by(() => {
		const total = allViolations.length;
		const pending = allViolations.filter(
			(v) => v.status === 'RECEIVED' || v.status === 'IDENTIFIED'
		).length;
		const notified = allViolations.filter((v) => v.status === 'NOTIFIED').length;
		const totalAmount = allViolations.reduce((s, v) => s + v.amount, 0);
		return { total, pending, notified, totalAmount };
	});

	// ── Status tabs with counts ────────────────────────────────────────────────────
	const statusTabs = $derived([
		{ value: 'all' as const, label: 'Toutes', count: stats.total },
		{
			value: 'RECEIVED' as const,
			label: 'Reçues',
			count: allViolations.filter((v) => v.status === 'RECEIVED').length
		},
		{
			value: 'IDENTIFIED' as const,
			label: 'Identifié',
			count: allViolations.filter((v) => v.status === 'IDENTIFIED').length
		},
		{
			value: 'NOTIFIED' as const,
			label: 'Notifié',
			count: allViolations.filter((v) => v.status === 'NOTIFIED').length
		},
		{
			value: 'PAID' as const,
			label: 'Payée',
			count: allViolations.filter((v) => v.status === 'PAID').length
		},
		{
			value: 'CLOSED' as const,
			label: 'Clôturée',
			count: allViolations.filter((v) => v.status === 'CLOSED' || v.status === 'CONTESTED').length
		}
	]);

	// ── Add modal ─────────────────────────────────────────────────────────────────
	let showForm = $state(false);

	// ── Process modal ─────────────────────────────────────────────────────────────
	let processingViolation = $state<ViolationRow | null>(null);
	let processDecision = $state<'COMPANY' | 'DRIVER'>('COMPANY');
	let processNotes = $state('');
	let processing = $state(false);

	async function handleProcess() {
		if (!processingViolation) return;
		processing = true;
		try {
			await client.mutation((api as any).violations.processViolation, {
				violationId: processingViolation._id,
				paymentDecision: processDecision,
				notes: processNotes.trim() || undefined
			});
			toast.success('Contravention traitée');
			processingViolation = null;
		} catch {
			toast.error('Erreur lors du traitement');
		} finally {
			processing = false;
		}
	}

	// ── Status update modal ───────────────────────────────────────────────────────
	let updatingViolation = $state<ViolationRow | null>(null);
	let updateStatus = $state<'PAID' | 'CONTESTED' | 'CLOSED'>('PAID');
	let updating = $state(false);

	async function handleStatusUpdate() {
		if (!updatingViolation) return;
		updating = true;
		try {
			await client.mutation((api as any).violations.updateViolationStatus, {
				violationId: updatingViolation._id,
				status: updateStatus
			});
			toast.success('Statut mis à jour');
			updatingViolation = null;
		} catch {
			toast.error('Erreur lors de la mise à jour');
		} finally {
			updating = false;
		}
	}

	const isEmpty = $derived(!isLoading && allViolations.length === 0);
</script>

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8 2xl:px-16">
	<!-- Header -->
	<div class="flex items-center justify-between gap-4">
		<div class="flex items-center gap-2">
			<h1 class="text-base font-semibold">Contraventions</h1>
			{#if !isLoading && allViolations.length > 0}
				<span
					class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
				>
					{allViolations.length}
				</span>
			{/if}
		</div>
		<Button size="sm" onclick={() => (showForm = true)}>
			<PlusIcon class="size-4" />
			Saisir une contravention
		</Button>
	</div>

	{#if isLoading}
		<!-- Skeleton -->
		<div class="flex flex-col gap-6">
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{#each Array(4) as _, i (i)}
					<Skeleton class="h-[88px] w-full rounded-3xl" />
				{/each}
			</div>
			<div class="overflow-hidden rounded-2xl border border-border">
				<div class="divide-y divide-border">
					{#each Array(6) as _, i (i)}
						<div class="flex h-12 items-center gap-4 px-4">
							<Skeleton class="h-3.5 w-24" />
							<Skeleton class="h-3.5 w-32" />
							<Skeleton class="h-3.5 w-16" />
							<Skeleton class="ml-auto h-3.5 w-24" />
							<Skeleton class="h-5 w-16 rounded-full" />
							<Skeleton class="size-7 rounded-md" />
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else if isEmpty}
		<!-- Empty state -->
		<div class="flex flex-1 items-center justify-center py-16">
			<EmptyState
				title="Aucune contravention"
				description="Saisissez les contraventions reçues pour identifier automatiquement les conducteurs et gérer la prise en charge."
			>
				{#snippet icon()}<AlertTriangleIcon class="size-12" />{/snippet}
				{#snippet action()}
					<Button onclick={() => (showForm = true)}>
						<PlusIcon class="size-4" />
						Saisir une contravention
					</Button>
				{/snippet}
			</EmptyState>
		</div>
	{:else}
		<!-- KPI Cards -->
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<MetricCard label="Total" value={stats.total} variant="accent" />
			<MetricCard
				label="À traiter"
				value={stats.pending}
				description={stats.pending > 0 ? 'Nécessitent une action' : 'Tout est traité'}
			/>
			<MetricCard
				label="Notifiées"
				value={stats.notified}
				description={stats.notified > 0 ? 'En attente de paiement' : 'Aucune en attente'}
			/>
			<MetricCard
				label="Montant total"
				value="{stats.totalAmount.toLocaleString('fr-FR')} €"
				description="Toutes contraventions"
			/>
		</div>

		<!-- Tabs -->
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List variant="line">
				{#each statusTabs as tab (tab.value)}
					<Tabs.Trigger value={tab.value}>
						{tab.label}
						{#if tab.count > 0}
							<span
								class={cn(
									'ml-1.5 rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
									activeTab === tab.value
										? 'bg-muted text-muted-foreground'
										: 'bg-muted text-muted-foreground/60'
								)}>{tab.count}</span
							>
						{/if}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>

		<!-- Table or filtered empty state -->
		{#if filtered.length === 0}
			<div class="flex items-center justify-center py-16">
				<EmptyState title="Aucune contravention dans ce statut">
					{#snippet action()}
						<Button variant="ghost" size="sm" onclick={() => (activeTab = 'all')}>
							Voir toutes
						</Button>
					{/snippet}
				</EmptyState>
			</div>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-border">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border bg-muted/40">
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Véhicule</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
								>Infraction</th
							>
							<th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Montant</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
								>Conducteur</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
								>Prise en charge</th
							>
							<th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Statut</th>
							<th class="w-10 px-3 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each filtered as v (v._id)}
							{@const statusCfg = STATUS_CONFIG[v.status]}
							<tr class="transition-colors hover:bg-muted/40">
								<td class="px-4 py-3">
									{#if v.vehicle}
										<p class="font-medium">{v.vehicle.brand} {v.vehicle.model}</p>
										<p class="font-mono text-xs text-muted-foreground">{v.vehicle.registration}</p>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-muted-foreground">
									{format(new Date(v.violationDate), 'd MMM yyyy', { locale: fr })}
								</td>
								<td class="max-w-[180px] px-4 py-3">
									<p class="truncate">{v.description}</p>
									{#if v.reference}
										<p class="truncate text-xs text-muted-foreground">PV : {v.reference}</p>
									{/if}
								</td>
								<td class="px-4 py-3 text-right font-semibold tabular-nums">
									{v.amount.toLocaleString('fr-FR')} €
								</td>
								<td class="px-4 py-3">
									{#if v.driver}
										<div class="flex items-center gap-1.5">
											<UserIcon class="size-3.5 shrink-0 text-muted-foreground" />
											<span class="truncate">{v.driver.name ?? v.driver.email}</span>
										</div>
									{:else}
										<span
											class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400"
										>
											<AlertTriangleIcon class="size-3" />
											À identifier
										</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">
									{PAYMENT_LABELS[v.paymentDecision ?? 'PENDING']}
								</td>
								<td class="px-4 py-3">
									<span
										class={cn(
											'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
											statusCfg.class
										)}
									>
										{statusCfg.label}
									</span>
								</td>
								<td class="px-3 py-3">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button variant="ghost" size="icon-sm" class="size-7" {...props}>
													<DotsHorizontalIcon class="size-4" />
													<!-- eslint-disable-next-line local/no-hardcoded-sr-only -->
													<span class="sr-only">Actions</span>
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end" class="w-44">
											{#if v.status === 'RECEIVED' || v.status === 'IDENTIFIED'}
												<DropdownMenu.Item
													onclick={() => {
														processingViolation = v;
														processDecision = 'COMPANY';
														processNotes = v.notes ?? '';
													}}
												>
													Traiter
												</DropdownMenu.Item>
											{/if}
											{#if v.status === 'NOTIFIED'}
												<DropdownMenu.Item
													onclick={() => {
														updatingViolation = v;
														updateStatus = 'PAID';
													}}
												>
													Mettre à jour
												</DropdownMenu.Item>
											{/if}
											{#if v.documentUrl}
												<DropdownMenu.Separator />
												<DropdownMenu.Item onclick={() => window.open(v.documentUrl!, '_blank')}>
													<ExternalLinkIcon class="size-3.5" />
													Voir le document
												</DropdownMenu.Item>
											{/if}
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<!-- Saisie contravention -->
<ViolationForm bind:open={showForm} onclose={() => (showForm = false)} />

<!-- Modal traitement -->
<Dialog.Root
	open={!!processingViolation}
	onOpenChange={(o) => {
		if (!o) processingViolation = null;
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Traiter la contravention</Dialog.Title>
				<Dialog.Description>
					Définissez qui prend en charge le paiement de cette infraction.
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-4 py-2">
				<div class="flex flex-col gap-1.5">
					<Label>Prise en charge</Label>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							onclick={() => (processDecision = 'COMPANY')}
							class={cn(
								'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
								processDecision === 'COMPANY'
									? 'border-primary bg-primary/8 text-primary'
									: 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
							)}
						>
							<p>Entreprise</p>
							<p class="mt-0.5 text-xs font-normal opacity-70">L'entreprise règle l'amende</p>
						</button>
						<button
							type="button"
							onclick={() => (processDecision = 'DRIVER')}
							class={cn(
								'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
								processDecision === 'DRIVER'
									? 'border-primary bg-primary/8 text-primary'
									: 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
							)}
						>
							<p>Conducteur</p>
							<p class="mt-0.5 text-xs font-normal opacity-70">Notifié par message in-app</p>
						</button>
					</div>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="proc-notes">Notes internes</Label>
					<Textarea
						id="proc-notes"
						rows={2}
						placeholder="Contexte, circonstances…"
						bind:value={processNotes}
					/>
				</div>
			</div>

			<div class="mt-4 flex items-center justify-between">
				<Button variant="ghost" onclick={() => (processingViolation = null)} disabled={processing}>
					Annuler
				</Button>
				<Button onclick={handleProcess} disabled={processing}>
					{#if processing}
						<LoaderCircleIcon class="size-3.5 motion-safe:animate-spin" />
					{/if}
					Confirmer
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- Modal statut -->
<Dialog.Root
	open={!!updatingViolation}
	onOpenChange={(o) => {
		if (!o) updatingViolation = null;
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-sm">
			<Dialog.Header>
				<Dialog.Title>Mettre à jour le statut</Dialog.Title>
				<Dialog.Description>
					Choisissez le nouveau statut de cette contravention.
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-2 py-2">
				{#each [{ value: 'PAID' as const, label: 'Payée', desc: "L'amende a été réglée" }, { value: 'CONTESTED' as const, label: 'Contestée', desc: 'Un recours a été déposé' }, { value: 'CLOSED' as const, label: 'Clôturée', desc: 'Dossier archivé' }] as opt (opt.value)}
					<button
						type="button"
						onclick={() => (updateStatus = opt.value)}
						class={cn(
							'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all',
							updateStatus === opt.value
								? 'border-primary bg-primary/8 text-primary'
								: 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
						)}
					>
						<p>{opt.label}</p>
						<p class="mt-0.5 text-xs font-normal opacity-70">{opt.desc}</p>
					</button>
				{/each}
			</div>

			<div class="mt-4 flex items-center justify-between">
				<Button variant="ghost" onclick={() => (updatingViolation = null)} disabled={updating}>
					Annuler
				</Button>
				<Button onclick={handleStatusUpdate} disabled={updating}>
					{#if updating}
						<LoaderCircleIcon class="size-3.5 motion-safe:animate-spin" />
					{/if}
					Confirmer
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
