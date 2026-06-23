<script lang="ts">
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import AlertTriangleIcon from '@lucide/svelte/icons/triangle-alert';
	import CopyXIcon from '@lucide/svelte/icons/copy-x';
	import CalendarOffIcon from '@lucide/svelte/icons/calendar-off';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import MapPinOffIcon from '@lucide/svelte/icons/map-pin-off';

	interface Anomaly {
		_id: string;
		type:
			| 'WEEKEND_FILL'
			| 'ABNORMAL_VOLUME'
			| 'SUSPICIOUS_LOCATION'
			| 'DUPLICATE'
			| 'NO_ACTIVE_RESERVATION';
		severity: 'HIGH' | 'MEDIUM' | 'LOW';
		resolution?: 'ACCEPTED' | 'REJECTED' | 'PENDING';
		date: number;
		amount: number;
		liters?: number;
		station?: string;
		registration?: string;
	}

	interface Props {
		anomaly: Anomaly;
		onResolved?: () => void;
	}

	let { anomaly, onResolved }: Props = $props();

	const client = useConvexClient();
	let resolving = $state<'ACCEPTED' | 'REJECTED' | null>(null);

	const TYPE_CONFIG = {
		WEEKEND_FILL: {
			label: 'Plein week-end',
			description: 'Transaction effectuée un samedi ou dimanche',
			icon: CalendarOffIcon,
			color: 'text-amber-600 dark:text-amber-400',
			bg: 'bg-amber-500/8'
		},
		ABNORMAL_VOLUME: {
			label: 'Volume anormal',
			description: 'Quantité supérieure à 120L — capacité réservoir dépassée',
			icon: FlameIcon,
			color: 'text-red-600 dark:text-red-400',
			bg: 'bg-red-500/8'
		},
		SUSPICIOUS_LOCATION: {
			label: 'Lieu suspect',
			description: 'Station à plus de 100km du siège social',
			icon: MapPinOffIcon,
			color: 'text-orange-600 dark:text-orange-400',
			bg: 'bg-orange-500/8'
		},
		DUPLICATE: {
			label: 'Doublon probable',
			description: 'Même véhicule, même montant dans un intervalle de 30 minutes',
			icon: CopyXIcon,
			color: 'text-red-600 dark:text-red-400',
			bg: 'bg-red-500/8'
		},
		NO_ACTIVE_RESERVATION: {
			label: 'Sans réservation',
			description: 'Aucune réservation active pour ce véhicule à cette date',
			icon: AlertTriangleIcon,
			color: 'text-amber-600 dark:text-amber-400',
			bg: 'bg-amber-500/8'
		}
	} as const;

	const SEVERITY_BADGE = {
		HIGH: 'bg-red-500/10 text-red-600 dark:text-red-400',
		MEDIUM: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
		LOW: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
	};

	const SEVERITY_LABEL = { HIGH: 'Élevé', MEDIUM: 'Moyen', LOW: 'Faible' };

	const config = $derived(TYPE_CONFIG[anomaly.type]);
	const isResolved = $derived(
		anomaly.resolution === 'ACCEPTED' || anomaly.resolution === 'REJECTED'
	);

	async function resolve(resolution: 'ACCEPTED' | 'REJECTED') {
		resolving = resolution;
		try {
			await client.mutation((api as any).fuelImport.resolveAnomaly, {
				anomalyId: anomaly._id,
				resolution
			});
			toast.success(resolution === 'ACCEPTED' ? 'Coût créé' : 'Transaction rejetée');
			onResolved?.();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			resolving = null;
		}
	}

	const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const fmtDate = new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});
</script>

<div
	class="rounded-lg border border-border {config.bg} p-4 transition-opacity {isResolved
		? 'opacity-50'
		: ''}"
>
	<div class="flex items-start gap-3">
		<!-- Icon -->
		<div class="mt-0.5 shrink-0 {config.color}">
			<config.icon class="size-5" />
		</div>

		<!-- Content -->
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-sm font-medium">{config.label}</span>
				<span
					class="rounded-full px-1.5 py-0.5 text-[10px] font-medium {SEVERITY_BADGE[
						anomaly.severity
					]}"
				>
					{SEVERITY_LABEL[anomaly.severity]}
				</span>
				{#if anomaly.resolution === 'ACCEPTED'}
					<span
						class="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
					>
						Accepté
					</span>
				{:else if anomaly.resolution === 'REJECTED'}
					<span
						class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
					>
						Rejeté
					</span>
				{/if}
			</div>

			<p class="mt-0.5 text-xs text-muted-foreground">{config.description}</p>

			<!-- Transaction details -->
			<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
				{#if anomaly.registration}
					<span class="font-mono font-medium">{anomaly.registration}</span>
				{/if}
				<span class="text-muted-foreground">{fmtDate.format(new Date(anomaly.date))}</span>
				<span class="font-medium">{fmt.format(anomaly.amount)}</span>
				{#if anomaly.liters}
					<span class="text-muted-foreground">{anomaly.liters}L</span>
				{/if}
				{#if anomaly.station}
					<span class="max-w-[180px] truncate text-muted-foreground">{anomaly.station}</span>
				{/if}
			</div>
		</div>

		<!-- Actions -->
		{#if !isResolved}
			<div class="flex shrink-0 items-center gap-1.5">
				<Button
					variant="outline"
					size="sm"
					class="h-7 gap-1 px-2 text-xs hover:border-red-400 hover:text-red-600"
					disabled={!!resolving}
					onclick={() => resolve('REJECTED')}
				>
					{#if resolving === 'REJECTED'}
						<LoaderCircleIcon class="size-3 motion-safe:animate-spin" />
					{:else}
						<XIcon class="size-3" />
					{/if}
					Rejeter
				</Button>
				<Button
					size="sm"
					class="h-7 gap-1 px-2 text-xs"
					disabled={!!resolving}
					onclick={() => resolve('ACCEPTED')}
				>
					{#if resolving === 'ACCEPTED'}
						<LoaderCircleIcon class="size-3 motion-safe:animate-spin" />
					{:else}
						<CheckIcon class="size-3" />
					{/if}
					Accepter
				</Button>
			</div>
		{/if}
	</div>
</div>
