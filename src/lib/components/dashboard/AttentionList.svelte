<script lang="ts">
	import { page } from '$app/state';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';

	interface Vehicle {
		_id: string;
		registration: string;
		brand: string;
		model: string;
		leaseEndDate?: string;
		kilometers?: number;
		status: string;
	}

	interface Props {
		leaseEndingSoon: Vehicle[];
		maintenanceDue: Vehicle[];
	}

	let { leaseEndingSoon, maintenanceDue }: Props = $props();

	const lang = $derived(page.params.lang as string | undefined);

	function vehicleHref(id: string) {
		return lang ? `/${lang}/admin/fleet/${id}` : `/admin/fleet/${id}`;
	}

	function daysUntil(dateStr: string) {
		return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
	}

	type Item =
		| { kind: 'lease'; vehicle: Vehicle; days: number }
		| { kind: 'maint'; vehicle: Vehicle };

	const items = $derived<Item[]>([
		...leaseEndingSoon.map((v) => ({
			kind: 'lease' as const,
			vehicle: v,
			days: v.leaseEndDate ? daysUntil(v.leaseEndDate) : 999
		})),
		...maintenanceDue.map((v) => ({ kind: 'maint' as const, vehicle: v }))
	]);

	const isEmpty = $derived(items.length === 0);
</script>

{#if isEmpty}
	<div class="flex flex-col items-center gap-2 py-8 text-center">
		<div class="flex size-9 items-center justify-center rounded-full bg-emerald-500/10">
			<CheckCircle2Icon class="size-4 text-emerald-500/70" />
		</div>
		<p class="text-xs text-muted-foreground">Flotte au vert</p>
	</div>
{:else}
	<ul class="flex flex-col divide-y divide-border/50">
		{#each items as item}
			{@const v = item.vehicle}
			<li>
				<a
					href={vehicleHref(v._id)}
					class="flex items-center gap-3 py-2.5 text-sm transition-colors hover:bg-muted/30"
				>
					<!-- Urgency dot -->
					{#if item.kind === 'lease'}
						{@const d = item.days}
						<span class="size-1.5 shrink-0 rounded-full {d <= 14 ? 'bg-destructive' : d <= 30 ? 'bg-orange-500' : 'bg-[var(--brand)]'}"></span>
					{:else}
						<span class="size-1.5 shrink-0 rounded-full bg-orange-500/70"></span>
					{/if}

					<!-- Registration + name -->
					<span class="font-mono text-[11px] text-muted-foreground shrink-0">{v.registration}</span>
					<span class="min-w-0 flex-1 truncate text-[13px] font-medium">{v.brand} {v.model}</span>

					<!-- Badge -->
					{#if item.kind === 'lease' && v.leaseEndDate}
						{@const d = item.days}
						<span class="shrink-0 text-[11px] font-bold tabular-nums {d <= 14 ? 'text-destructive' : d <= 30 ? 'text-orange-500' : 'text-muted-foreground'}">
							J−{d}
						</span>
					{:else if item.kind === 'maint' && v.kilometers !== undefined}
						<span class="shrink-0 text-[11px] tabular-nums text-muted-foreground">
							{v.kilometers.toLocaleString('fr-FR')} km
						</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
