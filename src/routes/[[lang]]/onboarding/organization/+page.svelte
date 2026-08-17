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
	import { toast } from 'svelte-sonner';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import Logo from '$lib/components/icons/logo.svelte';

	const convexClient = useConvexClient();

	// ── wizard state ──────────────────────────────────────────────────────────
	let step = $state(0); // 0=cantine, 1=équipe, 2=done
	const STEPS = ['Cantine', 'Équipe', "C'est parti !"];

	// ── step 0 : cantine ──────────────────────────────────────────────────────
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
		orgErrors = errs;
		if (Object.keys(errs).length > 0) return;

		orgSubmitting = true;
		orgError = '';
		try {
			await convexClient.mutation(api.organizations.createOrganization, {
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
			step = 1;
		} catch (err) {
			orgError = err instanceof Error ? err.message : 'Une erreur est survenue';
		} finally {
			orgSubmitting = false;
		}
	}

	// ── step 1 : inviter l'équipe ─────────────────────────────────────────────
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
			step = 2;
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
			toSend.map(async (entry) => {
				try {
					await convexClient.mutation(api.organizations.inviteOrganizationMember, {
						email: entry.email.trim(),
						role: entry.role
					});
					invites = invites.map((e) =>
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
		if (!anyError) step = 2;
	}

	function skipTeam() {
		step = 2;
	}

	// ── step 2 : done ─────────────────────────────────────────────────────────
	// Detect dev mode: VITE_PADDLE_CLIENT_TOKEN absent = no Paddle configured
	const isPaddleDev = !import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

	let devPlanLoading = $state(false);
	let devPlanActivated = $state(false);

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
		goto(localizedHref('/app'));
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
				<!-- ─── Step 0 : cantine ─────────────────────────────────────── -->
				{#if step === 0}
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
									bind:value={name}
									placeholder="Ex : Cantine du Centre Hospitalier"
									disabled={orgSubmitting}
									aria-invalid={!!orgErrors.name?.length}
								/>
								<Field.Error errors={orgErrors.name ?? []} />
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
									inputmode="numeric"
									bind:value={siret}
									placeholder="55203253400012"
									maxlength={14}
									disabled={orgSubmitting}
									aria-invalid={!!orgErrors.siret?.length}
								/>
								<Field.Error data-testid="siret-error" errors={orgErrors.siret ?? []} />
							</Field.Field>

							<Field.Field>
								<Field.Label>Type d'établissement</Field.Label>
								<Select.Root
									type="single"
									value={etablissementType}
									onValueChange={(v) => (etablissementType = v)}
								>
									<Select.Trigger class="w-full" disabled={orgSubmitting}>
										{etablissementTypes.find((s) => s.value === etablissementType)?.label ??
											"Sélectionner un type d'établissement"}
									</Select.Trigger>
									<Select.Content>
										{#each etablissementTypes as s (s.value)}<Select.Item value={s.value}
												>{s.label}</Select.Item
											>{/each}
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
									disabled={orgSubmitting}
								/>
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

				<!-- ─── Step 1 : inviter l'équipe ────────────────────────────── -->
				{#if step === 1}
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
								onclick={() => (step = 0)}
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

				<!-- ─── Step 2 : done ─────────────────────────────────────────── -->
				{#if step === 2}
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
						{:else}
							<!-- Prod: aucun plan actif — inviter à démarrer un diagnostic -->
							<div class="w-full rounded-lg border border-border bg-muted/40 px-4 py-3 text-left">
								<div class="flex-1">
									<p class="text-xs font-medium">Aucun abonnement actif</p>
									<p class="text-[11px] text-muted-foreground">
										Démarrez un diagnostic EGalim ou passez à un plan payant quand vous êtes prêt.
									</p>
								</div>
							</div>
						{/if}

						<div class="w-full space-y-2">
							<Button class="w-full" onclick={goDashboard}>Accéder au tableau de bord →</Button>
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
