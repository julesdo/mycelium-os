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
	import UploadIcon from '@lucide/svelte/icons/upload';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	const anyApi = api as any;

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

	// --- Logo upload ---
	let logoPreview = $state<string | null>(null);
	let isUploadingLogo = $state(false);
	let isDeletingLogo = $state(false);
	const currentLogoUrl = $derived(logoPreview ?? (orgQuery.data as any)?.logoUrl ?? null);

	async function handleLogoFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			toast.error('Format non supporté. Utilisez PNG, JPG ou SVG.');
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			toast.error('Fichier trop lourd. Maximum 2 Mo.');
			return;
		}
		isUploadingLogo = true;
		try {
			const uploadUrl = await convexClient.mutation(
				anyApi.organizations.generateOrgLogoUploadUrl,
				{}
			);
			const res = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!res.ok) throw new Error(`Upload échoué : ${res.status}`);
			const { storageId } = await res.json();
			const url = await convexClient.mutation(anyApi.organizations.saveOrgLogo, { storageId });
			logoPreview = url;
			toast.success('Logo mis à jour');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload");
		} finally {
			isUploadingLogo = false;
		}
	}

	async function handleDeleteLogo() {
		isDeletingLogo = true;
		try {
			await convexClient.mutation(anyApi.organizations.deleteOrgLogo, {});
			logoPreview = null;
			toast.success('Logo supprimé');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			isDeletingLogo = false;
		}
	}

	function validate(): boolean {
		const errs: Record<string, Array<{ message: string }>> = {};
		if (!name.trim()) errs.name = [{ message: 'Le nom est obligatoire' }];
		if (siren && !/^\d{9}$/.test(siren))
			errs.siren = [{ message: 'Le SIREN doit comporter 9 chiffres' }];
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
					<LoaderCircleIcon class="size-6 text-muted-foreground motion-safe:animate-spin" />
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

		<!-- Logo -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Logo de l'organisation</Card.Title>
				<Card.Description
					>Affiché dans les emails, exports PDF et rapports. PNG, JPG ou SVG, max 2 Mo.</Card.Description
				>
			</Card.Header>
			<Card.Content class="p-6 pt-0">
				<div class="flex items-center gap-5">
					<div
						class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted"
					>
						{#if currentLogoUrl}
							<img src={currentLogoUrl} alt="Logo" class="size-full object-contain p-1" />
						{:else}
							<Building2Icon class="size-8 text-muted-foreground/40" />
						{/if}
					</div>
					{#if isOrgAdmin}
						<div class="flex flex-col gap-2">
							<label
								class="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground {isUploadingLogo
									? 'pointer-events-none opacity-50'
									: ''}"
							>
								{#if isUploadingLogo}
									<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
									Upload en cours...
								{:else}
									<UploadIcon class="size-4" />
									{currentLogoUrl ? 'Remplacer le logo' : 'Choisir un fichier'}
								{/if}
								<input
									type="file"
									accept="image/png,image/jpeg,image/svg+xml,image/webp"
									class="sr-only"
									disabled={isUploadingLogo}
									onchange={handleLogoFile}
								/>
							</label>
							{#if currentLogoUrl}
								<Button
									variant="ghost"
									size="sm"
									class="justify-start gap-2 px-3 text-destructive hover:text-destructive"
									disabled={isDeletingLogo}
									onclick={handleDeleteLogo}
								>
									{#if isDeletingLogo}
										<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
									{:else}
										<Trash2Icon class="size-4" />
									{/if}
									Supprimer le logo
								</Button>
							{/if}
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
