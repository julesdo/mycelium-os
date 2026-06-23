<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto } from '$app/navigation';
	import { localizedHref } from '$lib/utils/i18n';
	import { toast } from 'svelte-sonner';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import Building2Icon from '@lucide/svelte/icons/building-2';

	const convexClient = useConvexClient();

	let name = $state('');
	let siren = $state('');
	let sector = $state('');
	let size = $state('');
	let errors = $state<Record<string, Array<{ message: string }>>>({});
	let isSubmitting = $state(false);
	let formError = $state('');

	let sirenLookupState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let sirenNaf = $state<string | null>(null);
	let sirenTimeout: ReturnType<typeof setTimeout> | undefined;

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

	function validateSiren(s: string): boolean {
		if (!/^\d{9}$/.test(s)) return false;
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			let d = +s[8 - i]!;
			if (i % 2 === 1) {
				d *= 2;
				if (d > 9) d -= 9;
			}
			sum += d;
		}
		return sum % 10 === 0;
	}

	$effect(() => {
		const value = siren;
		clearTimeout(sirenTimeout);
		sirenNaf = null;

		if (!value || !validateSiren(value)) {
			sirenLookupState = 'idle';
			return;
		}

		sirenLookupState = 'loading';
		sirenTimeout = setTimeout(async () => {
			try {
				const result = await convexClient.action(api.organizations.lookupSiren, { siren: value });
				if (result.name && !name) name = result.name;
				sirenNaf = result.naf;
				sirenLookupState = 'success';
			} catch {
				sirenLookupState = 'error';
			}
		}, 600);

		return () => clearTimeout(sirenTimeout);
	});

	function validate(): boolean {
		const errs: Record<string, Array<{ message: string }>> = {};
		if (!name.trim()) errs.name = [{ message: 'Le nom est obligatoire' }];
		if (siren && !validateSiren(siren))
			errs.siren = [{ message: 'SIREN invalide — 9 chiffres, algorithme de Luhn' }];
		errors = errs;
		return Object.keys(errs).length === 0;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!validate()) return;

		isSubmitting = true;
		formError = '';

		try {
			await convexClient.mutation(api.organizations.createOrganization, {
				name: name.trim(),
				siren: siren || undefined,
				sector: sector || undefined,
				size: size || undefined
			});
			toast.success('Organisation créée avec succès !');
			goto(localizedHref('/admin'));
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Une erreur est survenue';
			toast.error(formError);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-lg">
		<div class="mb-8 text-center">
			<div class="mb-4 flex justify-center">
				<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
					<Building2Icon class="size-6 text-primary" />
				</div>
			</div>
			<h1 class="text-2xl font-bold tracking-tight">Bienvenue sur Mycelium</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Commencez par configurer votre organisation
			</p>
		</div>

		<Card.Root>
			<Card.Content class="p-6">
				<Tabs.Root value="create" class="space-y-6">
					<Tabs.List class="w-full">
						<Tabs.Trigger value="create" class="flex-1">Créer une organisation</Tabs.Trigger>
						<Tabs.Trigger value="join" disabled class="flex-1">
							Rejoindre
							<span
								class="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
							>
								bientôt
							</span>
						</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="create">
						<form onsubmit={handleSubmit} class="space-y-4">
							<Field.Group>
								<Field.Field>
									<Field.Label for="org-name">
										Nom de l'organisation
										<span class="text-destructive">*</span>
									</Field.Label>
									<Input
										id="org-name"
										data-testid="org-name-input"
										type="text"
										bind:value={name}
										placeholder="Ex : ACME SAS"
										disabled={isSubmitting}
										aria-invalid={!!errors.name?.length}
									/>
									<Field.Error errors={errors.name ?? []} />
								</Field.Field>

								<Field.Field>
									<Field.Label for="siren">
										Numéro SIREN
										<span class="text-xs text-muted-foreground">(optionnel)</span>
									</Field.Label>
									<div class="relative">
										<Input
											id="siren"
											data-testid="org-siren-input"
											type="text"
											inputmode="numeric"
											bind:value={siren}
											placeholder="552032534"
											maxlength={9}
											disabled={isSubmitting}
											aria-invalid={!!errors.siren?.length}
											class={sirenLookupState === 'loading' ? 'pr-9' : ''}
										/>
										{#if sirenLookupState === 'loading'}
											<div class="absolute inset-y-0 right-3 flex items-center">
												<LoaderCircleIcon
													class="size-4 animate-spin text-muted-foreground"
												/>
											</div>
										{/if}
									</div>
									{#if sirenLookupState === 'success' && sirenNaf}
										<Field.Description class="text-emerald-600 dark:text-emerald-400">
											✓ {sirenNaf}
										</Field.Description>
									{/if}
									{#if sirenLookupState === 'error'}
										<Field.Description class="text-amber-600 dark:text-amber-400">
											SIREN non trouvé — saisissez le nom manuellement
										</Field.Description>
									{/if}
									<Field.Error data-testid="siren-error" errors={errors.siren ?? []} />
								</Field.Field>

								<Field.Field>
									<Field.Label>Secteur d'activité</Field.Label>
									<Select.Root
										type="single"
										value={sector}
										onValueChange={(v) => (sector = v)}
									>
										<Select.Trigger class="w-full" disabled={isSubmitting}>
											{sectors.find((s) => s.value === sector)?.label ??
												'Sélectionner un secteur'}
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
									>
										<Select.Trigger class="w-full" disabled={isSubmitting}>
											{sizes.find((s) => s.value === size)?.label ?? 'Nombre de salariés'}
										</Select.Trigger>
										<Select.Content>
											{#each sizes as s (s.value)}
												<Select.Item value={s.value}>{s.label}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</Field.Field>

								{#if formError}
									<Field.Error data-testid="onboarding-error" errors={[{ message: formError }]} />
								{/if}

								<Button data-testid="onboarding-submit" type="submit" class="w-full" disabled={isSubmitting}>
									{#if isSubmitting}
										<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
										Création en cours...
									{:else}
										Créer l'organisation
									{/if}
								</Button>
							</Field.Group>
						</form>
					</Tabs.Content>
				</Tabs.Root>
			</Card.Content>
		</Card.Root>
	</div>
</div>
