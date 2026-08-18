<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto } from '$app/navigation';
	import { localizedHref } from '$lib/utils/i18n';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import Logo from '$lib/components/icons/logo.svelte';

	const convexClient = useConvexClient();

	// Une cantine compte un à trois utilisateurs, et l'opérateur onboarde ses
	// clients personnellement lors d'un engagement payant : une seule étape,
	// pas d'assistant. L'invitation d'équipe reste disponible plus tard depuis
	// /app/parametres.
	let name = $state('');
	let siret = $state('');
	let etablissementType = $state('');
	let couvertsJour = $state<number | ''>('');
	let orgErrors = $state<Record<string, Array<{ message: string }>>>({});
	let orgSubmitting = $state(false);
	let orgError = $state('');

	const etablissementTypes = [
		{ value: 'RIE', label: 'RIE — Restaurant inter-entreprises' },
		{ value: 'CLINIQUE', label: 'Clinique / établissement de santé' },
		{ value: 'EHPAD', label: 'EHPAD' },
		{ value: 'CRECHE', label: 'Crèche' },
		{ value: 'ECOLE_PRIVEE', label: 'École privée' },
		{ value: 'AUTRE', label: 'Autre' }
	];

	async function submitOrg() {
		const errs: Record<string, Array<{ message: string }>> = {};
		if (!name.trim()) errs.name = [{ message: 'Le nom est obligatoire' }];
		if (siret && !/^\d{14}$/.test(siret))
			errs.siret = [{ message: 'SIRET invalide — 14 chiffres' }];
		if (!etablissementType)
			errs.etablissementType = [{ message: "Le type d'établissement est obligatoire" }];
		if (couvertsJour === '') {
			errs.couvertsJour = [{ message: 'Le nombre de couverts par jour est obligatoire' }];
		} else if (!Number.isInteger(Number(couvertsJour)) || Number(couvertsJour) <= 0) {
			errs.couvertsJour = [{ message: 'Le nombre de couverts doit être un entier positif' }];
		}
		orgErrors = errs;
		if (Object.keys(errs).length > 0) return;

		orgSubmitting = true;
		orgError = '';
		try {
			await convexClient.mutation(api.organizations.createOrganization, {
				name: name.trim(),
				siret: siret || undefined,
				etablissementType: etablissementType as
					| 'RIE'
					| 'CLINIQUE'
					| 'EHPAD'
					| 'CRECHE'
					| 'ECOLE_PRIVEE'
					| 'AUTRE',
				couvertsJour: Number(couvertsJour)
			});
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(localizedHref('/app'));
		} catch (err) {
			orgError = err instanceof Error ? err.message : 'Une erreur est survenue';
			orgSubmitting = false;
		}
	}
</script>

<div class="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-lg">
		<!-- Logo / brand -->
		<div class="mb-8 text-center">
			<div class="mb-3 flex justify-center">
				<span
					class="flex size-10 items-center justify-center rounded-xl bg-[var(--brand)] shadow-sm ring-1 ring-[var(--brand-foreground)]/10"
					style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
				>
					<Logo class="size-10 text-[var(--brand-foreground)]" />
				</span>
			</div>
			<h1 class="text-xl font-semibold tracking-tight">Mycelium</h1>
		</div>

		<Card.Root>
			<Card.Content class="p-6">
				<div class="mb-5">
					<h2 class="text-base font-semibold">Votre cantine</h2>
					<p class="text-sm text-muted-foreground">
						Configurez les informations de base de votre établissement.
					</p>
				</div>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						submitOrg();
					}}
					class="space-y-4"
				>
					<Field.Group>
						<Field.Field>
							<Field.Label for="org-name"
								>Nom de la cantine <span class="text-destructive">*</span></Field.Label
							>
							<Input
								id="org-name"
								data-testid="org-name-input"
								type="text"
								class="h-10"
								bind:value={name}
								placeholder="Ex : Cantine du Centre Hospitalier"
								disabled={orgSubmitting}
								aria-invalid={!!orgErrors.name?.length}
							/>
							<Field.Error errors={orgErrors.name ?? []} />
						</Field.Field>

						<Field.Field>
							<Field.Label
								>Type d'établissement <span class="text-destructive">*</span></Field.Label
							>
							<Select.Root
								type="single"
								value={etablissementType}
								onValueChange={(v) => (etablissementType = v)}
							>
								<Select.Trigger
									class="h-10 w-full"
									disabled={orgSubmitting}
									aria-invalid={!!orgErrors.etablissementType?.length}
								>
									{etablissementTypes.find((s) => s.value === etablissementType)?.label ??
										"Sélectionner un type d'établissement"}
								</Select.Trigger>
								<Select.Content>
									{#each etablissementTypes as s (s.value)}<Select.Item value={s.value}
											>{s.label}</Select.Item
										>{/each}
								</Select.Content>
							</Select.Root>
							<Field.Error errors={orgErrors.etablissementType ?? []} />
						</Field.Field>

						<Field.Field>
							<Field.Label for="couverts-jour"
								>Couverts par jour <span class="text-destructive">*</span></Field.Label
							>
							<Input
								id="couverts-jour"
								data-testid="couverts-jour-input"
								type="number"
								class="h-10"
								min="1"
								step="1"
								bind:value={couvertsJour}
								placeholder="Ex : 250"
								disabled={orgSubmitting}
								aria-invalid={!!orgErrors.couvertsJour?.length}
							/>
							<Field.Error errors={orgErrors.couvertsJour ?? []} />
						</Field.Field>

						<Field.Field>
							<Field.Label for="siret"
								>Numéro SIRET <span class="text-xs text-muted-foreground">(optionnel)</span
								></Field.Label
							>
							<Input
								id="siret"
								data-testid="org-siret-input"
								type="text"
								class="h-10"
								inputmode="numeric"
								bind:value={siret}
								placeholder="55203253400012"
								maxlength={14}
								disabled={orgSubmitting}
								aria-invalid={!!orgErrors.siret?.length}
							/>
							<Field.Error data-testid="siret-error" errors={orgErrors.siret ?? []} />
						</Field.Field>

						{#if orgError}
							<Field.Error data-testid="onboarding-error" errors={[{ message: orgError }]} />
						{/if}

						<Button
							data-testid="onboarding-submit"
							type="submit"
							class="h-10 w-full"
							disabled={orgSubmitting}
						>
							{#if orgSubmitting}
								<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />Création en
								cours...
							{:else}
								Créer mon espace →
							{/if}
						</Button>
					</Field.Group>
				</form>
			</Card.Content>
		</Card.Root>

		<p class="mt-4 text-center text-xs text-muted-foreground">
			Vous avez reçu une invitation ?
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={localizedHref('/signin')}
				class="underline underline-offset-2 hover:text-foreground"
				>Connectez-vous depuis le lien reçu par email.</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</p>
	</div>
</div>
