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

	const etablissementTypes = [
		{ value: 'RIE', label: 'RIE — Restaurant inter-entreprises' },
		{ value: 'CLINIQUE', label: 'Clinique / établissement de santé' },
		{ value: 'EHPAD', label: 'EHPAD' },
		{ value: 'CRECHE', label: 'Crèche' },
		{ value: 'ECOLE_PRIVEE', label: 'École privée' },
		{ value: 'AUTRE', label: 'Autre' }
	];

	let name = $state('');
	let siret = $state('');
	let etablissementType = $state('');
	let couvertsJour = $state<number | ''>('');
	let errors = $state<Record<string, Array<{ message: string }>>>({});
	let isSubmitting = $state(false);
	let initialized = $state(false);

	$effect(() => {
		const org = orgQuery.data;
		if (org && !initialized) {
			name = org.name ?? '';
			siret = org.siret ?? '';
			etablissementType = org.etablissementType ?? '';
			couvertsJour = org.couvertsJour ?? '';
			initialized = true;
		}
	});

	const isOrgAdmin = $derived(membershipQuery.data?.role === 'ORG_ADMIN');
	const isLoading = $derived(orgQuery.isLoading || membershipQuery.isLoading);

	function validate(): boolean {
		const errs: Record<string, Array<{ message: string }>> = {};
		if (!name.trim()) errs.name = [{ message: 'Le nom est obligatoire' }];
		if (siret && !/^\d{14}$/.test(siret))
			errs.siret = [{ message: 'Le SIRET doit comporter 14 chiffres' }];
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
				siret: siret || undefined,
				etablissementType:
					(etablissementType as
						| 'RIE'
						| 'CLINIQUE'
						| 'EHPAD'
						| 'CRECHE'
						| 'ECOLE_PRIVEE'
						| 'AUTRE') || undefined,
				couvertsJour: couvertsJour === '' ? undefined : Number(couvertsJour)
			});
			toast.success('Cantine mise à jour avec succès');
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
		<h1 class="text-base font-semibold">Informations de la cantine</h1>
	</div>

	{#if isLoading}
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-center py-8">
					<LoaderCircleIcon class="size-6 text-muted-foreground motion-safe:animate-spin" />
				</div>
			</Card.Content>
		</Card.Root>
	{:else if !orgQuery.data}
		<Card.Root>
			<Card.Content class="p-6">
				<p class="text-muted-foreground">Aucune cantine trouvée.</p>
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
						Mettez à jour les informations de votre cantine.
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content class="p-6 pt-0">
				<form onsubmit={handleSubmit} class="space-y-4">
					<Field.Group>
						<Field.Field>
							<Field.Label for="org-name">
								Nom de la cantine
								<span class="text-destructive">*</span>
							</Field.Label>
							<Input
								id="org-name"
								type="text"
								bind:value={name}
								placeholder="Ex : Cantine du Centre Hospitalier"
								disabled={isSubmitting || !isOrgAdmin}
								aria-invalid={!!errors.name?.length}
							/>
							<Field.Error errors={errors.name ?? []} />
						</Field.Field>

						<Field.Field>
							<Field.Label for="siret">
								Numéro SIRET
								<span class="text-xs text-muted-foreground">(optionnel)</span>
							</Field.Label>
							<Input
								id="siret"
								type="text"
								inputmode="numeric"
								bind:value={siret}
								placeholder="55203253400012"
								maxlength={14}
								disabled={isSubmitting || !isOrgAdmin}
								aria-invalid={!!errors.siret?.length}
							/>
							<Field.Error errors={errors.siret ?? []} />
						</Field.Field>

						<Field.Field>
							<Field.Label>Type d'établissement</Field.Label>
							<Select.Root
								type="single"
								value={etablissementType}
								onValueChange={(v) => (etablissementType = v)}
								disabled={isSubmitting || !isOrgAdmin}
							>
								<Select.Trigger class="w-full">
									{etablissementTypes.find((s) => s.value === etablissementType)?.label ??
										"Sélectionner un type d'établissement"}
								</Select.Trigger>
								<Select.Content>
									{#each etablissementTypes as s (s.value)}
										<Select.Item value={s.value}>{s.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</Field.Field>

						<Field.Field>
							<Field.Label for="couverts-jour">Couverts par jour</Field.Label>
							<Input
								id="couverts-jour"
								type="number"
								min="0"
								bind:value={couvertsJour}
								placeholder="Ex : 250"
								disabled={isSubmitting || !isOrgAdmin}
							/>
						</Field.Field>

						{#if isOrgAdmin}
							<Button type="submit" disabled={isSubmitting} class="w-full sm:w-auto">
								{#if isSubmitting}
									<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />
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
