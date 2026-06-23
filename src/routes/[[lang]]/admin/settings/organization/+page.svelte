<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import Building2Icon from '@lucide/svelte/icons/building-2';

	const convexClient = useConvexClient();

	const orgQuery = useQuery(api.organizations.getMyOrg, {});
	const membershipQuery = useQuery(api.organizations.getMyOrgMembership, {});

	const sectors = [
		{ value: 'technologie', label: 'Technologie & Informatique' },
		{ value: 'finance', label: 'Finance & Assurance' },
		{ value: 'commerce', label: 'Commerce & Distribution' },
		{ value: 'industrie', label: 'Industrie & Fabrication' },
		{ value: 'construction', label: 'Construction & BTP' },
		{ value: 'transport', label: 'Transport & Logistique' },
		{ value: 'sante', label: 'Santé & Médical' },
		{ value: 'education', label: 'Éducation & Formation' },
		{ value: 'agriculture', label: 'Agriculture' },
		{ value: 'services', label: 'Services aux entreprises' },
		{ value: 'autre', label: 'Autre' }
	];

	const sizes = [
		{ value: '1-10', label: '1 à 10 salariés' },
		{ value: '10-50', label: '10 à 50 salariés' },
		{ value: '50-200', label: '50 à 200 salariés' },
		{ value: '200-500', label: '200 à 500 salariés' },
		{ value: '500+', label: '500+ salariés' }
	];

	let name = $state('');
	let siren = $state('');
	let sector = $state('');
	let size = $state('');
	let country = $state('');
	let currency = $state('');
	let distanceUnit = $state<'km' | 'mile' | ''>('');
	let timezone = $state('');
	let locale = $state('');
	let errors = $state<Record<string, Array<{ message: string }>>>({});
	let isSubmitting = $state(false);
	let initialized = $state(false);

	$effect(() => {
		const org = orgQuery.data;
		if (org && !initialized) {
			name = org.name ?? '';
			siren = org.siren ?? '';
			sector = org.sector ?? '';
			size = org.size ?? '';
			country = org.country ?? '';
			currency = org.currency ?? '';
			distanceUnit = (org.distanceUnit as 'km' | 'mile') ?? '';
			timezone = org.timezone ?? '';
			locale = org.locale ?? '';
			initialized = true;
		}
	});

	const isOrgAdmin = $derived(membershipQuery.data?.role === 'ORG_ADMIN');
	const isLoading = $derived(orgQuery.isLoading || membershipQuery.isLoading);

	function validate(): boolean {
		const errs: Record<string, Array<{ message: string }>> = {};
		if (!name.trim()) errs.name = [{ message: 'Le nom est obligatoire' }];
		if (siren && !/^\d{9}$/.test(siren)) errs.siren = [{ message: 'Le SIREN doit comporter 9 chiffres' }];
		errors = errs;
		return Object.keys(errs).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		isSubmitting = true;
		try {
			await convexClient.mutation(api.organizations.updateOrganization, {
				name: name.trim(),
				siren: siren || undefined,
				sector: sector || undefined,
				size: size || undefined,
				country: country || undefined,
				currency: currency || undefined,
				distanceUnit: (distanceUnit as 'km' | 'mile') || undefined,
				timezone: timezone || undefined,
				locale: locale || undefined
			});
			toast.success('Organisation mise à jour avec succès');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Une erreur est survenue';
			toast.error(message);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-6 px-4 lg:px-6 xl:px-8 2xl:px-16">
	<div class="flex items-center gap-2">
		<h1 class="text-base font-semibold">Informations de l'organisation</h1>
	</div>

	{#if isLoading}
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-center py-8">
					<LoaderCircleIcon class="size-6 animate-spin text-muted-foreground" />
				</div>
			</Card.Content>
		</Card.Root>
	{:else if !orgQuery.data}
		<Card.Root>
			<Card.Content class="p-6">
				<p class="text-muted-foreground">Aucune organisation trouvée.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title data-testid="org-settings-name">{orgQuery.data?.name}</Card.Title>
				<Card.Description>
					{#if !isOrgAdmin}
						<span class="text-amber-600 dark:text-amber-400">
							Seul un ORG_ADMIN peut modifier ces informations.
						</span>
					{:else}
						Mettez à jour les informations de votre organisation.
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content class="p-6 pt-0">
				<form onsubmit={handleSubmit} class="space-y-4">
					<Field.Group>
						<Field.Field>
							<Field.Label for="org-name">
								Nom de l'organisation
								<span class="text-destructive">*</span>
							</Field.Label>
							<Input
								id="org-name"
								type="text"
								bind:value={name}
								placeholder="Ex : ACME SAS"
								disabled={isSubmitting || !isOrgAdmin}
								aria-invalid={!!errors.name?.length}
							/>
							<Field.Error errors={errors.name ?? []} />
						</Field.Field>

						<Field.Field>
							<Field.Label for="siren">
								Numéro SIREN
								<span class="text-xs text-muted-foreground">(optionnel)</span>
							</Field.Label>
							<Input
								id="siren"
								type="text"
								inputmode="numeric"
								bind:value={siren}
								placeholder="552032534"
								maxlength={9}
								disabled={isSubmitting || !isOrgAdmin}
								aria-invalid={!!errors.siren?.length}
							/>
							<Field.Error errors={errors.siren ?? []} />
						</Field.Field>

						<Field.Field>
							<Field.Label>Secteur d'activité</Field.Label>
							<Select.Root
								type="single"
								value={sector}
								onValueChange={(v) => (sector = v)}
								disabled={isSubmitting || !isOrgAdmin}
							>
								<Select.Trigger class="w-full">
									{sectors.find((s) => s.value === sector)?.label ?? 'Sélectionner un secteur'}
								</Select.Trigger>
								<Select.Content>
									{#each sectors as s (s.value)}
										<Select.Item value={s.value}>{s.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</Field.Field>

						<Field.Field>
							<Field.Label>Taille de l'organisation</Field.Label>
							<Select.Root
								type="single"
								value={size}
								onValueChange={(v) => (size = v)}
								disabled={isSubmitting || !isOrgAdmin}
							>
								<Select.Trigger class="w-full">
									{sizes.find((s) => s.value === size)?.label ?? 'Nombre de salariés'}
								</Select.Trigger>
								<Select.Content>
									{#each sizes as s (s.value)}
										<Select.Item value={s.value}>{s.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</Field.Field>

						{#if isOrgAdmin}
							<Button type="submit" disabled={isSubmitting} class="w-full sm:w-auto">
								{#if isSubmitting}
									<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
									Enregistrement...
								{:else}
									Enregistrer les modifications
								{/if}
							</Button>
						{/if}
					</Field.Group>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Localisation & Currency -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Localisation & Currency</Card.Title>
				<Card.Description>
					Sets the currency, distance unit, and timezone used across the platform and for mileage reimbursements.
				</Card.Description>
			</Card.Header>
			<Card.Content class="p-6 pt-0">
				<form onsubmit={handleSubmit} class="space-y-4">
					<Field.Group>
						<div class="grid gap-4 sm:grid-cols-2">
							<Field.Field>
								<Field.Label>Country</Field.Label>
								<Select.Root
									type="single"
									value={country}
									onValueChange={(v) => (country = v)}
									disabled={isSubmitting || !isOrgAdmin}
								>
									<Select.Trigger class="w-full">
										{[
											{ value: 'FR', label: '🇫🇷 France' },
											{ value: 'GB', label: '🇬🇧 United Kingdom' },
											{ value: 'SE', label: '🇸🇪 Sweden' },
											{ value: 'NO', label: '🇳🇴 Norway' },
											{ value: 'DK', label: '🇩🇰 Denmark' }
										].find((c) => c.value === country)?.label ?? 'Select country'}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="FR">🇫🇷 France</Select.Item>
										<Select.Item value="GB">🇬🇧 United Kingdom</Select.Item>
										<Select.Item value="SE">🇸🇪 Sweden</Select.Item>
										<Select.Item value="NO">🇳🇴 Norway</Select.Item>
										<Select.Item value="DK">🇩🇰 Denmark</Select.Item>
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<Field.Field>
								<Field.Label>Currency</Field.Label>
								<Select.Root
									type="single"
									value={currency}
									onValueChange={(v) => (currency = v)}
									disabled={isSubmitting || !isOrgAdmin}
								>
									<Select.Trigger class="w-full">
										{[
											{ value: 'EUR', label: 'EUR — Euro (€)' },
											{ value: 'GBP', label: 'GBP — Pound Sterling (£)' },
											{ value: 'SEK', label: 'SEK — Swedish Krona (kr)' },
											{ value: 'NOK', label: 'NOK — Norwegian Krone (kr)' },
											{ value: 'DKK', label: 'DKK — Danish Krone (kr)' }
										].find((c) => c.value === currency)?.label ?? 'Select currency'}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="EUR">EUR — Euro (€)</Select.Item>
										<Select.Item value="GBP">GBP — Pound Sterling (£)</Select.Item>
										<Select.Item value="SEK">SEK — Swedish Krona (kr)</Select.Item>
										<Select.Item value="NOK">NOK — Norwegian Krone (kr)</Select.Item>
										<Select.Item value="DKK">DKK — Danish Krone (kr)</Select.Item>
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<Field.Field>
								<Field.Label>Distance unit</Field.Label>
								<Select.Root
									type="single"
									value={distanceUnit}
									onValueChange={(v) => (distanceUnit = v as 'km' | 'mile')}
									disabled={isSubmitting || !isOrgAdmin}
								>
									<Select.Trigger class="w-full">
										{distanceUnit === 'mile' ? 'Miles (mi)' : distanceUnit === 'km' ? 'Kilometres (km)' : 'Select unit'}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="km">Kilometres (km)</Select.Item>
										<Select.Item value="mile">Miles (mi)</Select.Item>
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<Field.Field>
								<Field.Label for="timezone">Timezone</Field.Label>
								<Input
									id="timezone"
									type="text"
									bind:value={timezone}
									placeholder="Europe/London"
									disabled={isSubmitting || !isOrgAdmin}
								/>
								<Field.Description>IANA timezone identifier</Field.Description>
							</Field.Field>
						</div>

						{#if isOrgAdmin}
							<Button type="submit" disabled={isSubmitting} class="w-full sm:w-auto">
								{#if isSubmitting}
									<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
									Enregistrement...
								{:else}
									Enregistrer les modifications
								{/if}
							</Button>
						{/if}
					</Field.Group>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
