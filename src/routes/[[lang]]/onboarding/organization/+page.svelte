<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto } from '$app/navigation';
	import { localizedHref } from '$lib/utils/i18n';
	import { toast } from 'svelte-sonner';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import Logo from '$lib/components/icons/logo.svelte';

	const convexClient = useConvexClient();
	const billingQuery = useQuery(api.billing.getBillingStatus, {});
	const alreadyUsedTrial = $derived(billingQuery.data?.hasUsedFreeTrial ?? false);

	// ── wizard state ──────────────────────────────────────────────────────────
	let step = $state(0); // 0=org, 1=locale, 2=team, 3=done
	const STEPS = ['Organisation', 'Localisation', 'Équipe', "C'est parti !"];

	// ── step 0 : organisation ─────────────────────────────────────────────────
	let name = $state('');
	let siren = $state('');
	let sector = $state('');
	let size = $state('');
	let orgErrors = $state<Record<string, Array<{ message: string }>>>({});
	let orgSubmitting = $state(false);
	let orgError = $state('');

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

	async function submitOrg() {
		const errs: Record<string, Array<{ message: string }>> = {};
		if (!name.trim()) errs.name = [{ message: 'Le nom est obligatoire' }];
		if (siren && !validateSiren(siren))
			errs.siren = [{ message: 'SIREN invalide — 9 chiffres, algorithme de Luhn' }];
		orgErrors = errs;
		if (Object.keys(errs).length > 0) return;

		orgSubmitting = true;
		orgError = '';
		try {
			await convexClient.mutation(api.organizations.createOrganization, {
				name: name.trim(),
				siren: siren || undefined,
				sector: sector || undefined,
				size: size || undefined
			});
			step = 1;
		} catch (err) {
			orgError = err instanceof Error ? err.message : 'Une erreur est survenue';
		} finally {
			orgSubmitting = false;
		}
	}

	// ── step 1 : localisation ─────────────────────────────────────────────────
	type CountryPack = {
		country: string;
		currency: string;
		distanceUnit: 'km' | 'mile';
		timezone: string;
		locale: string;
		label: string;
	};
	const COUNTRY_PACKS: CountryPack[] = [
		{
			country: 'GB',
			currency: 'GBP',
			distanceUnit: 'mile',
			timezone: 'Europe/London',
			locale: 'en-GB',
			label: 'Royaume-Uni (GBP)'
		},
		{
			country: 'FR',
			currency: 'EUR',
			distanceUnit: 'km',
			timezone: 'Europe/Paris',
			locale: 'fr-FR',
			label: 'France (EUR)'
		},
		{
			country: 'SE',
			currency: 'SEK',
			distanceUnit: 'km',
			timezone: 'Europe/Stockholm',
			locale: 'sv-SE',
			label: 'Suède (SEK)'
		},
		{
			country: 'NO',
			currency: 'NOK',
			distanceUnit: 'km',
			timezone: 'Europe/Oslo',
			locale: 'nb-NO',
			label: 'Norvège (NOK)'
		},
		{
			country: 'DK',
			currency: 'DKK',
			distanceUnit: 'km',
			timezone: 'Europe/Copenhagen',
			locale: 'da-DK',
			label: 'Danemark (DKK)'
		},
		{
			country: 'DE',
			currency: 'EUR',
			distanceUnit: 'km',
			timezone: 'Europe/Berlin',
			locale: 'de-DE',
			label: 'Allemagne (EUR)'
		},
		{
			country: 'NL',
			currency: 'EUR',
			distanceUnit: 'km',
			timezone: 'Europe/Amsterdam',
			locale: 'nl-NL',
			label: 'Pays-Bas (EUR)'
		}
	];

	let selectedCountryCode = $state('GB');
	let localeSubmitting = $state(false);
	let localeError = $state('');

	const selectedPack = $derived(
		COUNTRY_PACKS.find((p) => p.country === selectedCountryCode) ?? COUNTRY_PACKS[0]!
	);

	async function submitLocale() {
		localeSubmitting = true;
		localeError = '';
		try {
			await convexClient.mutation(api.organizations.updateOrganization, {
				name: name.trim(),
				siren: siren || undefined,
				sector: sector || undefined,
				size: size || undefined,
				country: selectedPack.country,
				currency: selectedPack.currency,
				distanceUnit: selectedPack.distanceUnit,
				timezone: selectedPack.timezone,
				locale: selectedPack.locale
			});
			step = 2;
		} catch (err) {
			localeError = err instanceof Error ? err.message : 'Une erreur est survenue';
		} finally {
			localeSubmitting = false;
		}
	}

	// ── step 2 : inviter l'équipe ─────────────────────────────────────────────
	type InviteEntry = {
		email: string;
		role: 'ORG_ADMIN' | 'ORG_MEMBER';
		error?: string;
		sent?: boolean;
	};
	let invites = $state<InviteEntry[]>([{ email: '', role: 'ORG_MEMBER' }]);
	let teamSubmitting = $state(false);

	function addInvite() {
		invites = [...invites, { email: '', role: 'ORG_MEMBER' }];
	}

	function removeInvite(i: number) {
		invites = invites.filter((_, idx) => idx !== i);
	}

	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	async function submitTeam() {
		const toSend = invites.filter((e) => e.email.trim() !== '');

		if (toSend.length === 0) {
			step = 3;
			return;
		}

		// Validate
		let hasErrors = false;
		invites = invites.map((e) => {
			if (!e.email.trim()) return e;
			const err = EMAIL_RE.test(e.email.trim()) ? undefined : 'Email invalide';
			if (err) hasErrors = true;
			return { ...e, error: err };
		});
		if (hasErrors) return;

		teamSubmitting = true;
		await Promise.allSettled(
			toSend.map(async (entry, i) => {
				try {
					await convexClient.mutation(api.organizations.inviteOrganizationMember, {
						email: entry.email.trim(),
						role: entry.role
					});
					invites = invites.map((e, idx) =>
						e.email === entry.email ? { ...e, sent: true, error: undefined } : e
					);
				} catch (err) {
					const msg = err instanceof Error ? err.message : 'Erreur';
					invites = invites.map((e) => (e.email === entry.email ? { ...e, error: msg } : e));
				}
			})
		);
		teamSubmitting = false;

		const anyError = invites.some((e) => e.error);
		if (!anyError) step = 3;
	}

	function skipTeam() {
		step = 3;
	}

	// ── step 3 : done ─────────────────────────────────────────────────────────
	// Detect dev mode: VITE_PADDLE_CLIENT_TOKEN absent = no Paddle configured
	const isPaddleDev = !import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

	let trialLoading = $state(false);
	let devPlanLoading = $state(false);
	let trialStarted = $state(false);
	let devPlanActivated = $state(false);

	async function startTrial() {
		trialLoading = true;
		try {
			await convexClient.mutation(api.billing.startFreeTrial, {});
			trialStarted = true;
			toast.success('Essai gratuit démarré — 15 jours accès Professional !');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			trialLoading = false;
		}
	}

	async function activateDevPlan() {
		devPlanLoading = true;
		try {
			await convexClient.mutation(api.billing.activateDevPlan, {});
			devPlanActivated = true;
			toast.success('Plan dev activé — accès illimité à toutes les features !');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			devPlanLoading = false;
		}
	}

	function goDashboard() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(localizedHref('/admin/dashboard'));
	}
	function goFleet() {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(localizedHref('/admin/fleet/new'));
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
			<h1 class="text-xl font-semibold tracking-tight">Mycelium Fleet OS</h1>
		</div>

		<!-- Step indicator -->
		<div class="mb-6 flex items-center gap-0">
			{#each STEPS as label, i (i)}
				<div
					class="flex flex-1 flex-col items-center gap-1.5 {i < STEPS.length - 1 ? 'relative' : ''}"
				>
					<div class="flex w-full items-center">
						{#if i > 0}
							<div
								class="h-px flex-1 transition-colors duration-300 {i <= step
									? 'bg-[var(--brand)]'
									: 'bg-border'}"
							></div>
						{/if}
						<div
							class="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300
							{i < step
								? 'bg-[var(--brand)] text-[var(--brand-foreground)]'
								: i === step
									? 'border-2 border-[var(--brand)] bg-background text-[var(--brand)]'
									: 'border border-border bg-background text-muted-foreground'}"
						>
							{#if i < step}
								<CheckCircleIcon class="size-3.5" />
							{:else}
								{i + 1}
							{/if}
						</div>
						{#if i < STEPS.length - 1}
							<div
								class="h-px flex-1 transition-colors duration-300 {i < step
									? 'bg-[var(--brand)]'
									: 'bg-border'}"
							></div>
						{/if}
					</div>
					<span
						class="text-[10px] font-medium {i === step
							? 'text-foreground'
							: 'text-muted-foreground'}">{label}</span
					>
				</div>
			{/each}
		</div>

		<Card.Root>
			<Card.Content class="p-6">
				<!-- ─── Step 0 : organisation ────────────────────────────────── -->
				{#if step === 0}
					<div class="mb-5">
						<h2 class="text-base font-semibold">Votre organisation</h2>
						<p class="text-sm text-muted-foreground">
							Configurez les informations de base de votre entreprise.
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
									>Nom de l'organisation <span class="text-destructive">*</span></Field.Label
								>
								<Input
									id="org-name"
									data-testid="org-name-input"
									type="text"
									bind:value={name}
									placeholder="Ex : ACME SAS"
									disabled={orgSubmitting}
									aria-invalid={!!orgErrors.name?.length}
								/>
								<Field.Error errors={orgErrors.name ?? []} />
							</Field.Field>

							<Field.Field>
								<Field.Label for="siren"
									>Numéro SIREN <span class="text-xs text-muted-foreground">(optionnel)</span
									></Field.Label
								>
								<div class="relative">
									<Input
										id="siren"
										data-testid="org-siren-input"
										type="text"
										inputmode="numeric"
										bind:value={siren}
										placeholder="552032534"
										maxlength={9}
										disabled={orgSubmitting}
										aria-invalid={!!orgErrors.siren?.length}
										class={sirenLookupState === 'loading' ? 'pr-9' : ''}
									/>
									{#if sirenLookupState === 'loading'}
										<div class="absolute inset-y-0 right-3 flex items-center">
											<LoaderCircleIcon
												class="size-4 text-muted-foreground motion-safe:animate-spin"
											/>
										</div>
									{/if}
								</div>
								{#if sirenLookupState === 'success' && sirenNaf}
									<Field.Description class="text-emerald-600 dark:text-emerald-400"
										>✓ {sirenNaf}</Field.Description
									>
								{/if}
								{#if sirenLookupState === 'error'}
									<Field.Description class="text-amber-600 dark:text-amber-400"
										>SIREN non trouvé — saisissez le nom manuellement</Field.Description
									>
								{/if}
								<Field.Error data-testid="siren-error" errors={orgErrors.siren ?? []} />
							</Field.Field>

							<Field.Field>
								<Field.Label>Secteur d'activité</Field.Label>
								<Select.Root type="single" value={sector} onValueChange={(v) => (sector = v)}>
									<Select.Trigger class="w-full" disabled={orgSubmitting}>
										{sectors.find((s) => s.value === sector)?.label ?? 'Sélectionner un secteur'}
									</Select.Trigger>
									<Select.Content>
										{#each sectors as s (s.value)}<Select.Item value={s.value}
												>{s.label}</Select.Item
											>{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<Field.Field>
								<Field.Label>Taille de l'organisation</Field.Label>
								<Select.Root type="single" value={size} onValueChange={(v) => (size = v)}>
									<Select.Trigger class="w-full" disabled={orgSubmitting}>
										{sizes.find((s) => s.value === size)?.label ?? 'Nombre de salariés'}
									</Select.Trigger>
									<Select.Content>
										{#each sizes as s (s.value)}<Select.Item value={s.value}>{s.label}</Select.Item
											>{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>

							{#if orgError}
								<Field.Error data-testid="onboarding-error" errors={[{ message: orgError }]} />
							{/if}

							<Button
								data-testid="onboarding-submit"
								type="submit"
								class="w-full"
								disabled={orgSubmitting}
							>
								{#if orgSubmitting}
									<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />Création en
									cours...
								{:else}
									Continuer →
								{/if}
							</Button>
						</Field.Group>
					</form>
				{/if}

				<!-- ─── Step 1 : localisation ────────────────────────────────── -->
				{#if step === 1}
					<div class="mb-5">
						<h2 class="text-base font-semibold">Localisation & devise</h2>
						<p class="text-sm text-muted-foreground">
							Définit la devise, l'unité de distance et les taux fiscaux applicables.
						</p>
					</div>

					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
							{#each COUNTRY_PACKS as pack (pack.country)}
								<button
									type="button"
									onclick={() => (selectedCountryCode = pack.country)}
									class="flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors
										{selectedCountryCode === pack.country
										? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]'
										: 'border-border hover:border-border/80 hover:bg-muted/40'}"
								>
									<span class="text-sm font-medium">{pack.country}</span>
									<span class="text-[11px] text-muted-foreground"
										>{pack.currency} · {pack.distanceUnit}</span
									>
								</button>
							{/each}
						</div>

						<div class="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
							<div class="font-medium">{selectedPack.label}</div>
							<div class="mt-1 text-xs text-muted-foreground">
								Fuseau : {selectedPack.timezone} · Locale : {selectedPack.locale}
							</div>
						</div>

						{#if localeError}
							<p class="text-sm text-destructive">{localeError}</p>
						{/if}

						<div class="flex gap-2 pt-1">
							<Button
								variant="outline"
								class="flex-1"
								onclick={() => (step = 0)}
								disabled={localeSubmitting}>← Retour</Button
							>
							<Button class="flex-1" onclick={submitLocale} disabled={localeSubmitting}>
								{#if localeSubmitting}
									<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />
								{/if}
								Continuer →
							</Button>
						</div>
					</div>
				{/if}

				<!-- ─── Step 2 : inviter l'équipe ────────────────────────────── -->
				{#if step === 2}
					<div class="mb-5">
						<h2 class="text-base font-semibold">Inviter votre équipe</h2>
						<p class="text-sm text-muted-foreground">
							Les invités recevront un lien par email. Vous pourrez en ajouter d'autres plus tard.
						</p>
					</div>

					<div class="space-y-3">
						{#each invites as entry, i (i)}
							<div class="flex gap-2">
								<div class="flex-1 space-y-1">
									<Input
										type="email"
										placeholder="prenom.nom@entreprise.com"
										bind:value={entry.email}
										disabled={teamSubmitting || entry.sent}
										aria-invalid={!!entry.error}
										class={entry.sent ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
									/>
									{#if entry.error}
										<p class="text-xs text-destructive">{entry.error}</p>
									{/if}
									{#if entry.sent}
										<p class="text-xs text-emerald-600 dark:text-emerald-400">
											✓ Invitation envoyée
										</p>
									{/if}
								</div>
								<Select.Root
									type="single"
									value={entry.role}
									onValueChange={(v) => {
										invites = invites.map((e, idx) =>
											idx === i ? { ...e, role: v as 'ORG_ADMIN' | 'ORG_MEMBER' } : e
										);
									}}
								>
									<Select.Trigger class="w-32 shrink-0" disabled={teamSubmitting || entry.sent}>
										{entry.role === 'ORG_ADMIN' ? 'Admin' : 'Membre'}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="ORG_MEMBER">Membre</Select.Item>
										<Select.Item value="ORG_ADMIN">Admin</Select.Item>
									</Select.Content>
								</Select.Root>
								{#if invites.length > 1}
									<button
										type="button"
										onclick={() => removeInvite(i)}
										disabled={teamSubmitting || entry.sent}
										class="flex size-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-destructive"
									>
										<TrashIcon class="size-4" />
									</button>
								{/if}
							</div>
						{/each}

						<button
							type="button"
							onclick={addInvite}
							disabled={teamSubmitting}
							class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<PlusIcon class="size-4" /> Ajouter une adresse
						</button>

						<div class="flex gap-2 pt-2">
							<Button
								variant="outline"
								class="flex-1"
								onclick={() => (step = 1)}
								disabled={teamSubmitting}>← Retour</Button
							>
							<Button variant="ghost" onclick={skipTeam} disabled={teamSubmitting}>Passer</Button>
							<Button class="flex-1" onclick={submitTeam} disabled={teamSubmitting}>
								{#if teamSubmitting}
									<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />
								{/if}
								Envoyer →
							</Button>
						</div>
					</div>
				{/if}

				<!-- ─── Step 3 : done ─────────────────────────────────────────── -->
				{#if step === 3}
					<div class="flex flex-col items-center gap-4 py-2 text-center">
						<div class="flex size-12 items-center justify-center rounded-full bg-[var(--brand)]/10">
							<CheckCircleIcon class="size-6 text-[var(--brand)]" />
						</div>
						<div>
							<h2 class="text-base font-semibold">Votre espace est prêt</h2>
							<p class="mt-1 text-sm text-muted-foreground">
								<span class="font-medium text-foreground">{name}</span> est configurée.
							</p>
						</div>

						<!-- Dev mode: activate dev plan -->
						{#if isPaddleDev && !devPlanActivated}
							<div
								class="w-full rounded-lg border border-dashed border-[var(--brand)]/40 bg-[var(--brand)]/5 px-4 py-3 text-left"
							>
								<div class="flex items-start gap-2.5">
									<TerminalIcon class="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
									<div class="flex-1">
										<p class="text-xs font-medium">Mode dev détecté</p>
										<p class="text-[11px] text-muted-foreground">
											Aucune clé Paddle. Activez le plan dev pour accéder à toutes les features.
										</p>
									</div>
								</div>
								<Button
									size="sm"
									class="mt-2.5 w-full text-xs"
									onclick={activateDevPlan}
									disabled={devPlanLoading}
								>
									{#if devPlanLoading}<LoaderCircleIcon
											class="mr-1.5 size-3 motion-safe:animate-spin"
										/>{/if}
									Activer plan dev (accès illimité)
								</Button>
							</div>
						{:else if devPlanActivated}
							<div
								class="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-left"
							>
								<p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
									✓ Plan dev activé — accès illimité
								</p>
							</div>
						{:else if trialStarted}
							<div
								class="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-left"
							>
								<p class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
									✓ Essai gratuit démarré — 15 jours Professional
								</p>
							</div>
						{:else if alreadyUsedTrial}
							<!-- User already consumed their trial on a previous org -->
							<div class="w-full rounded-lg border border-border bg-muted/40 px-4 py-3 text-left">
								<div class="flex items-start gap-2.5">
									<ZapIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
									<div class="flex-1">
										<p class="text-xs font-medium">Essai déjà utilisé</p>
										<p class="text-[11px] text-muted-foreground">
											Votre compte a déjà bénéficié d'un essai gratuit. Souscrivez un plan pour
											accéder aux fonctionnalités avancées.
										</p>
									</div>
								</div>
								<Button
									size="sm"
									variant="outline"
									class="mt-2.5 w-full text-xs"
									href="/admin/settings/plans"
								>
									Voir les plans
								</Button>
							</div>
						{:else}
							<!-- Prod: offer free trial -->
							<div
								class="w-full rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/5 px-4 py-3 text-left"
							>
								<div class="flex items-start gap-2.5">
									<ZapIcon class="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
									<div class="flex-1">
										<p class="text-xs font-medium">Essai gratuit — 15 jours</p>
										<p class="text-[11px] text-muted-foreground">
											Accédez au plan Professional : BiK UK, CSRD, sync Xero/QuickBooks.
										</p>
									</div>
								</div>
								<Button
									size="sm"
									class="mt-2.5 w-full bg-[var(--brand)] text-xs text-black hover:bg-[var(--brand)]/90"
									onclick={startTrial}
									disabled={trialLoading}
								>
									{#if trialLoading}<LoaderCircleIcon
											class="mr-1.5 size-3 motion-safe:animate-spin"
										/>{/if}
									Démarrer l'essai gratuit
								</Button>
							</div>
						{/if}

						<div class="w-full space-y-2">
							<Button class="w-full" onclick={goDashboard}>Accéder au tableau de bord →</Button>
							<Button variant="outline" class="w-full" onclick={goFleet}
								>Importer mes véhicules</Button
							>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Step 0 : lien "Rejoindre" -->
		{#if step === 0}
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
		{/if}
	</div>
</div>
