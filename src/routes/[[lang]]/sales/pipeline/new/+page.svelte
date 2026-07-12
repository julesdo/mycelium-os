<script lang="ts">
	import { useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select/index.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const createProspect = useMutation((api as any)['sales/prospects'].createProspect);

	let companyName = $state('');
	let sector = $state('services');
	let estimatedFleetSize = $state(20);
	let country = $state('FR');
	let contactName = $state('');
	let contactEmail = $state('');
	let contactPhone = $state('');
	let notes = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	const SECTORS = [
		{ value: 'services', label: 'Services' },
		{ value: 'btp', label: 'BTP / Construction' },
		{ value: 'distribution', label: 'Distribution / Logistique' },
		{ value: 'sante', label: 'Santé' },
		{ value: 'commerce', label: 'Commerce / Retail' },
		{ value: 'vtc', label: 'VTC / Transport' },
		{ value: 'public', label: 'Secteur public' }
	];

	const COUNTRIES = [
		{ value: 'FR', label: 'France' },
		{ value: 'GB', label: 'Royaume-Uni' },
		{ value: 'SE', label: 'Suède' },
		{ value: 'NO', label: 'Norvège' },
		{ value: 'DK', label: 'Danemark' },
		{ value: 'DE', label: 'Allemagne' },
		{ value: 'NL', label: 'Pays-Bas' }
	];

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!companyName.trim() || !contactName.trim()) return;
		saving = true;
		error = null;
		try {
			const id = await createProspect({
				companyName: companyName.trim(),
				sector,
				estimatedFleetSize,
				country,
				contactName: contactName.trim(),
				contactEmail: contactEmail.trim() || undefined,
				contactPhone: contactPhone.trim() || undefined,
				notes: notes.trim() || undefined
			});
			goto(resolve(localizedHref(`/sales/pipeline/${id}`)));
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Erreur lors de la création';
			saving = false;
		}
	}
</script>

<div class="mx-auto max-w-lg p-4 lg:p-6">
	<!-- Retour -->
	<a
		href={resolve(localizedHref('/sales/pipeline'))}
		class="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<ArrowLeftIcon class="size-4" />
		Pipeline
	</a>

	<h1 class="mb-6 text-lg font-semibold">Nouveau prospect</h1>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div
			class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
			></div>
			<h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Entreprise
			</h2>
			<div class="space-y-3">
				<div class="space-y-1.5">
					<Label for="companyName">Nom de l'entreprise *</Label>
					<Input
						id="companyName"
						bind:value={companyName}
						placeholder="Acme Corp"
						required
						class="h-11"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<Label for="sector">Secteur</Label>
						<select
							id="sector"
							bind:value={sector}
							class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{#each SECTORS as s}
								<option value={s.value}>{s.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for="country">Pays</Label>
						<select
							id="country"
							bind:value={country}
							class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{#each COUNTRIES as c}
								<option value={c.value}>{c.label}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="space-y-1.5">
					<Label for="fleetSize">Taille de flotte estimée</Label>
					<Input
						id="fleetSize"
						type="number"
						min={1}
						max={500}
						bind:value={estimatedFleetSize}
						class="h-11"
					/>
				</div>
			</div>
		</div>

		<div
			class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
			></div>
			<h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Contact
			</h2>
			<div class="space-y-3">
				<div class="space-y-1.5">
					<Label for="contactName">Nom du contact *</Label>
					<Input
						id="contactName"
						bind:value={contactName}
						placeholder="Marie Dupont"
						required
						class="h-11"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<Label for="contactEmail">Email</Label>
						<Input
							id="contactEmail"
							type="email"
							bind:value={contactEmail}
							placeholder="marie@acme.fr"
							class="h-11"
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="contactPhone">Téléphone</Label>
						<Input
							id="contactPhone"
							type="tel"
							bind:value={contactPhone}
							placeholder="+33 6 12 34 56 78"
							class="h-11"
						/>
					</div>
				</div>
			</div>
		</div>

		<div
			class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div
				class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
			></div>
			<h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h2>
			<textarea
				bind:value={notes}
				placeholder="Contexte, besoins identifiés, prochaine étape…"
				rows={4}
				class="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
			></textarea>
		</div>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}

		<div class="flex gap-3 pb-safe">
			<Button
				type="button"
				variant="outline"
				class="min-h-[44px] flex-1"
				href={resolve(localizedHref('/sales/pipeline'))}
			>
				Annuler
			</Button>
			<Button
				type="submit"
				disabled={saving || !companyName.trim() || !contactName.trim()}
				class="min-h-[44px] flex-1 bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
				style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
			>
				{saving ? 'Enregistrement…' : 'Créer le prospect'}
			</Button>
		</div>
	</form>
</div>
