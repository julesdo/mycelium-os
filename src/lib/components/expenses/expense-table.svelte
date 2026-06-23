<script lang="ts">
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import ExpenseStatusBadge from './expense-status-badge.svelte';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { cn } from '$lib/utils.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

	interface ExpenseRow {
		_id: string;
		userId: string;
		date: string;
		purpose: string;
		departureLocation: string;
		arrivalLocation: string;
		roundTrip: boolean;
		distance: number;
		distanceUnit: 'km' | 'mile';
		vehicleCategory: 'ELECTRIC' | 'HYBRID' | 'THERMAL' | 'UTILITY';
		ratePerUnit: number;
		calculatedAmount: number;
		status: ExpenseStatus;
		rejectionReason?: string;
		user?: { name: string | null; email: string | null };
	}

	interface Props {
		expenses: ExpenseRow[];
		isAdmin?: boolean;
		onrefresh?: () => void;
	}

	const { expenses, isAdmin = false, onrefresh }: Props = $props();

	const client = useConvexClient();

	// ── Reject dialog ───────────────────────────────────────────────────────────
	let rejectDialogOpen = $state(false);
	let rejectingId = $state('');
	let rejectReason = $state('');
	let actionLoading = $state<string | null>(null);

	async function handleApprove(id: string) {
		actionLoading = id;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).expenses.approveExpense, { expenseId: id });
			toast.success('Note approuvée');
			onrefresh?.();
		} catch {
			toast.error("Erreur lors de l'approbation");
		} finally {
			actionLoading = null;
		}
	}

	async function handleReject() {
		if (!rejectReason.trim()) { toast.error('Un motif de rejet est requis'); return; }
		actionLoading = rejectingId;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).expenses.rejectExpense, { expenseId: rejectingId, reason: rejectReason });
			toast.success('Note rejetée');
			rejectDialogOpen = false;
			rejectReason = '';
			onrefresh?.();
		} catch {
			toast.error('Erreur lors du rejet');
		} finally {
			actionLoading = null;
		}
	}

	async function handleMarkPaid(id: string) {
		actionLoading = id;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).expenses.markExpensePaid, { expenseId: id });
			toast.success('Note marquée comme payée');
			onrefresh?.();
		} catch {
			toast.error('Erreur');
		} finally {
			actionLoading = null;
		}
	}

	function openReject(id: string) {
		rejectingId = id;
		rejectReason = '';
		rejectDialogOpen = true;
	}
</script>

<!-- Table desktop -->
<div class="hidden md:block">
	<div class="overflow-hidden rounded-xl border bg-card">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b bg-muted/40">
					{#if isAdmin}
						<th class="px-4 py-3 text-left font-medium text-muted-foreground">Salarié</th>
					{/if}
					<th class="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
					<th class="px-4 py-3 text-left font-medium text-muted-foreground">Trajet</th>
					<th class="px-4 py-3 text-right font-medium text-muted-foreground">KM</th>
					<th class="px-4 py-3 text-right font-medium text-muted-foreground">Montant</th>
					<th class="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
					{#if isAdmin}
						<th class="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each expenses as expense (expense._id)}
					<tr class="border-b transition-colors last:border-0 hover:bg-muted/30">
						{#if isAdmin}
							<td class="px-4 py-3">
								<div class="font-medium">{expense.user?.name ?? '—'}</div>
								<div class="text-xs text-muted-foreground">{expense.user?.email ?? ''}</div>
							</td>
						{/if}
						<td class="px-4 py-3 text-muted-foreground">
							{format(new Date(expense.date), 'dd/MM/yy', { locale: fr })}
						</td>
						<td class="max-w-[220px] px-4 py-3">
							<p class="truncate font-medium">{expense.purpose}</p>
							<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
								{expense.departureLocation}
								{#if expense.roundTrip}
									<RefreshCwIcon class="size-3 shrink-0" />
								{:else}
									<ArrowRightIcon class="size-3 shrink-0" />
								{/if}
								{expense.arrivalLocation}
							</p>
						</td>
						<td class="px-4 py-3 text-right font-mono text-sm">{expense.distance} {expense.distanceUnit}</td>
						<td class="px-4 py-3 text-right">
							<span class="font-bold">{expense.calculatedAmount.toFixed(2)} €</span>
						</td>
						<td class="px-4 py-3">
							<ExpenseStatusBadge status={expense.status} />
						</td>
						{#if isAdmin}
							<td class="px-4 py-3">
								<div class="flex justify-end gap-1.5">
									{#if expense.status === 'SUBMITTED'}
										<Button
											size="sm"
											variant="outline"
											onclick={() => handleApprove(expense._id)}
											disabled={actionLoading === expense._id}
											class="h-7 gap-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
										>
											{#if actionLoading === expense._id}
												<LoaderCircleIcon class="size-3 animate-spin" />
											{:else}
												<CheckIcon class="size-3" />
											{/if}
											<span class="hidden lg:inline">Approuver</span>
										</Button>
										<Button
											size="sm"
											variant="outline"
											onclick={() => openReject(expense._id)}
											class="h-7 gap-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
										>
											<XIcon class="size-3" />
											<span class="hidden lg:inline">Rejeter</span>
										</Button>
									{:else if expense.status === 'APPROVED'}
										<Button
											size="sm"
											variant="outline"
											onclick={() => handleMarkPaid(expense._id)}
											disabled={actionLoading === expense._id}
											class="h-7 gap-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950"
										>
											{#if actionLoading === expense._id}
												<LoaderCircleIcon class="size-3 animate-spin" />
											{:else}
												<CreditCardIcon class="size-3" />
											{/if}
											<span class="hidden lg:inline">Payée</span>
										</Button>
									{/if}
								</div>
							</td>
						{/if}
					</tr>
				{:else}
					<tr>
						<td
							colspan={isAdmin ? 7 : 5}
							class="px-4 py-12 text-center text-sm text-muted-foreground"
						>
							Aucune note de frais
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Cards mobile -->
<div class="space-y-3 md:hidden">
	{#each expenses as expense (expense._id)}
		<div class="rounded-xl border bg-card p-4 shadow-sm">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0 flex-1">
					{#if isAdmin && expense.user?.name}
						<p class="text-xs font-medium text-muted-foreground">{expense.user.name}</p>
					{/if}
					<p class="truncate font-semibold">{expense.purpose}</p>
					<p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
						{expense.departureLocation}
						{#if expense.roundTrip}
							<RefreshCwIcon class="size-3 shrink-0" />
						{:else}
							<ArrowRightIcon class="size-3 shrink-0" />
						{/if}
						{expense.arrivalLocation}
					</p>
				</div>
				<ExpenseStatusBadge status={expense.status} class="shrink-0" />
			</div>
			<div class="mt-3 flex items-center justify-between border-t pt-3">
				<div class="text-xs text-muted-foreground">
					{format(new Date(expense.date), 'dd/MM/yy', { locale: fr })} · {expense.distance} {expense.distanceUnit} · {expense.ratePerUnit.toFixed(3)}/{expense.distanceUnit}
				</div>
				<span class="text-base font-bold">{expense.calculatedAmount.toFixed(2)} €</span>
			</div>
			{#if isAdmin && expense.status === 'SUBMITTED'}
				<div class="mt-3 flex gap-2 border-t pt-3">
					<Button
						size="sm"
						variant="outline"
						onclick={() => handleApprove(expense._id)}
						disabled={actionLoading === expense._id}
						class="flex-1 gap-1 text-emerald-600"
					>
						<CheckIcon class="size-3" /> Approuver
					</Button>
					<Button
						size="sm"
						variant="outline"
						onclick={() => openReject(expense._id)}
						class="flex-1 gap-1 text-red-600"
					>
						<XIcon class="size-3" /> Rejeter
					</Button>
				</div>
			{/if}
		</div>
	{:else}
		<div class="rounded-xl border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
			Aucune note de frais
		</div>
	{/each}
</div>

<!-- Reject dialog -->
<Dialog.Root bind:open={rejectDialogOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Rejeter la note de frais</Dialog.Title>
			<Dialog.Description>Indiquez le motif de rejet. Le salarié sera informé.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-2 py-2">
			<Label for="reject-reason">Motif <span class="text-destructive">*</span></Label>
			<Textarea
				id="reject-reason"
				bind:value={rejectReason}
				placeholder="Ex : Distance incorrecte, trajet non professionnel…"
				rows={3}
			/>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (rejectDialogOpen = false)}>Annuler</Button>
			<Button
				variant="destructive"
				onclick={handleReject}
				disabled={!rejectReason.trim() || actionLoading !== null}
			>
				{#if actionLoading !== null}
					<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
				{/if}
				Rejeter
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
