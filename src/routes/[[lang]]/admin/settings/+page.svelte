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
				size: size || undefined
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

<div class="flex flex-col gap-6">
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
	{/if}
</div>
