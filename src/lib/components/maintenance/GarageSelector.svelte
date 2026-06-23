<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import StarIcon from '@lucide/svelte/icons/star';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import PhoneIcon from '@lucide/svelte/icons/phone';

	interface Props {
		selectedId: string | null;
		zipcode?: string;
		maintenanceType?: string;
		onSelect: (id: string) => void;
	}

	let { selectedId, zipcode = '', maintenanceType = '', onSelect }: Props = $props();

	const garageArgs = $state({ zipcode: '75001', radius: 20 as number });
	$effect(() => { garageArgs.zipcode = zipcode || '75001'; });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const garagesQuery = useQuery((api as any).garages.findNearbyGarages, garageArgs);

	const garages = $derived(garagesQuery.data ?? []);

	const filtered = $derived(
		maintenanceType
			? garages.filter(
					(g: { services: string[] }) =>
						g.services.includes(maintenanceType) || g.services.includes('AUTRE')
				)
			: garages
	);

	const displayed = $derived(filtered.slice(0, 5));

	const MOCK_SLOTS = ['Mar. 10 juin à 9h00', 'Mer. 11 juin à 14h00', 'Jeu. 12 juin à 10h30'];

	function slotForGarage(index: number): string {
		return MOCK_SLOTS[index % MOCK_SLOTS.length] ?? MOCK_SLOTS[0]!;
	}
</script>

<div class="flex flex-col gap-3">
	{#if garagesQuery.isLoading}
		{#each Array(3) as _, i (i)}
			<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
		{/each}
	{:else if displayed.length === 0}
		<p class="text-center text-sm text-muted-foreground">Aucun garage trouvé à proximité.</p>
	{:else}
		{#each displayed as garage, idx (garage._id)}
			{@const isSelected = selectedId === garage._id}
			<button
				class="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors
				{isSelected
					? 'border-primary bg-primary/5 ring-1 ring-primary/30'
					: 'border-border bg-card hover:border-border/80 hover:bg-muted/20'}"
				onclick={() => onSelect(garage._id)}
			>
				<!-- Check indicator -->
				<div
					class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2
					{isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}"
				>
					{#if isSelected}
						<CheckIcon class="size-3" />
					{/if}
				</div>

				<!-- Content -->
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-medium">{garage.name}</span>
						{#if garage.isPartner}
							<Badge
								variant="secondary"
								class="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
							>
								Partenaire
							</Badge>
						{/if}
						{#if garage.avgRating}
							<span class="flex items-center gap-0.5 text-xs text-amber-600">
								<StarIcon class="size-3 fill-amber-500 text-amber-500" />
								{garage.avgRating.toFixed(1)}
							</span>
						{/if}
					</div>

					<div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
						<span class="flex items-center gap-1">
							<MapPinIcon class="size-3 shrink-0" />
							{garage.address}, {garage.city}
						</span>
						{#if garage.phone}
							<span class="flex items-center gap-1">
								<PhoneIcon class="size-3 shrink-0" />
								{garage.phone}
							</span>
						{/if}
					</div>

					<div class="mt-1.5 flex flex-wrap gap-1">
						{#each (garage.services as string[]).slice(0, 4) as svc (svc)}
							<span class="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{svc}</span>
						{/each}
					</div>

					<p class="mt-1.5 text-xs font-medium text-primary">
						Prochain créneau : {slotForGarage(idx)}
					</p>
				</div>
			</button>
		{/each}
	{/if}
</div>
