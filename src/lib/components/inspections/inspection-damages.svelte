<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { cn } from '$lib/utils.js';

	type Severity = 'MINOR' | 'MODERATE' | 'MAJOR';

	interface Damage {
		location: string;
		description: string;
		severity: Severity;
		isNew: boolean;
	}

	interface Props {
		damages: Damage[];
		onchange: (damages: Damage[]) => void;
	}

	let { damages, onchange }: Props = $props();

	const SEVERITY_CONFIG: Record<Severity, { label: string; class: string }> = {
		MINOR: { label: 'Mineur', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
		MODERATE: { label: 'Modéré', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
		MAJOR: { label: 'Majeur', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
	};

	function addDamage() {
		onchange([...damages, { location: '', description: '', severity: 'MINOR', isNew: false }]);
	}

	function removeDamage(index: number) {
		onchange(damages.filter((_, i) => i !== index));
	}

	function updateDamage(index: number, field: keyof Damage, value: string | boolean) {
		const updated = damages.map((d, i) => (i === index ? { ...d, [field]: value } : d));
		onchange(updated);
	}
</script>

<div class="flex flex-col gap-4">
	{#if damages.length === 0}
		<p class="rounded-xl bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
			Aucun dommage signalé. Cliquez sur "Ajouter un dommage" si vous en constatez.
		</p>
	{/if}

	{#each damages as damage, i}
		<div class="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium">Dommage #{i + 1}</p>
				<button
					type="button"
					onclick={() => removeDamage(i)}
					class="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
					aria-label="Supprimer ce dommage"
				>
					<TrashIcon class="size-3.5" />
				</button>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="flex flex-col gap-1.5">
					<Label for="dmg-location-{i}">Localisation</Label>
					<Input
						id="dmg-location-{i}"
						value={damage.location}
						placeholder="ex: pare-chocs avant"
						oninput={(e) => updateDamage(i, 'location', (e.target as HTMLInputElement).value)}
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="dmg-desc-{i}">Description</Label>
					<Input
						id="dmg-desc-{i}"
						value={damage.description}
						placeholder="ex: rayure légère"
						oninput={(e) => updateDamage(i, 'description', (e.target as HTMLInputElement).value)}
					/>
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<Label>Sévérité</Label>
				<div class="flex gap-2">
					{#each Object.entries(SEVERITY_CONFIG) as [sev, cfg]}
						<button
							type="button"
							onclick={() => updateDamage(i, 'severity', sev)}
							class={cn(
								'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
								damage.severity === sev
									? cfg.class + ' ring-2 ring-offset-1 ring-current'
									: 'bg-muted text-muted-foreground hover:bg-muted/70'
							)}
						>
							{cfg.label}
						</button>
					{/each}
				</div>
			</div>

			<label class="flex cursor-pointer items-center gap-2.5">
				<input
					type="checkbox"
					checked={damage.isNew}
					onchange={(e) => updateDamage(i, 'isNew', (e.target as HTMLInputElement).checked)}
					class="size-4 rounded"
				/>
				<span class="text-sm text-muted-foreground">
					Dommage <strong class="text-foreground">nouveau</strong> (absent au départ)
				</span>
			</label>
		</div>
	{/each}

	<Button variant="outline" size="sm" type="button" onclick={addDamage} class="self-start">
		<PlusIcon class="size-4" />
		Ajouter un dommage
	</Button>
</div>
