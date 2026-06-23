<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import MaintenanceStatusBadge from './MaintenanceStatusBadge.svelte';
	import type { MaintenanceRecord } from './types.js';
	import { TYPE_LABELS } from './types.js';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import EuroIcon from '@lucide/svelte/icons/euro';
	import MoreHorizontalIcon from '@lucide/svelte/icons/ellipsis';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		record: MaintenanceRecord;
		onViewDetails?: (id: string) => void;
		onMarkCompleted?: (id: string) => void;
		onCancel?: (id: string) => void;
	}

	let { record, onViewDetails, onMarkCompleted, onCancel }: Props = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatCost(n: number): string {
		return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
	}

	const canComplete = $derived(
		record.status === 'SCHEDULED' || record.status === 'IN_PROGRESS'
	);
	const canCancel = $derived(
		record.status === 'SCHEDULED' || record.status === 'IN_PROGRESS'
	);
</script>

<div
	class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80 hover:bg-muted/20 sm:flex-row sm:items-start sm:gap-4"
>
	<!-- Icon -->
	<div
		class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
	>
		<WrenchIcon class="size-4" />
	</div>

	<!-- Content -->
	<div class="min-w-0 flex-1">
		<!-- Top row -->
		<div class="flex flex-wrap items-start justify-between gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<span class="font-mono text-sm font-semibold">{record.vehicleRegistration}</span>
				<span class="text-sm text-muted-foreground">{record.vehicleBrand} {record.vehicleModel}</span>
				<span class="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{TYPE_LABELS[record.type]}</span>
			</div>
			<MaintenanceStatusBadge status={record.status} />
		</div>

		<!-- Details row -->
		<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
			<span class="flex items-center gap-1.5">
				<CalendarIcon class="size-3.5 shrink-0" />
				{formatDate(record.scheduledDate)}
			</span>
			<span class="flex items-center gap-1.5">
				<MapPinIcon class="size-3.5 shrink-0" />
				{record.garage}
			</span>
			<span class="flex items-center gap-1.5">
				<EuroIcon class="size-3.5 shrink-0" />
				{formatCost(record.costEstimate)} estimé
			</span>
		</div>

		{#if record.notes}
			<p class="mt-2 text-xs text-muted-foreground/80">{record.notes}</p>
		{/if}
	</div>

	<!-- Actions -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button
					variant="ghost"
					size="icon-sm"
					class="shrink-0 text-muted-foreground"
					aria-label="Actions"
					{...props}
				>
					<MoreHorizontalIcon class="size-4" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-44">
			<DropdownMenu.Item onclick={() => onViewDetails?.(record.id)}>
				<EyeIcon class="mr-2 size-3.5" />
				Voir les détails
			</DropdownMenu.Item>
			{#if canComplete}
				<DropdownMenu.Item onclick={() => onMarkCompleted?.(record.id)}>
					<CheckIcon class="mr-2 size-3.5" />
					Marquer terminé
				</DropdownMenu.Item>
			{/if}
			{#if canCancel}
				<DropdownMenu.Separator />
				<DropdownMenu.Item
					class="text-destructive focus:text-destructive"
					onclick={() => onCancel?.(record.id)}
				>
					<XIcon class="mr-2 size-3.5" />
					Annuler
				</DropdownMenu.Item>
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
