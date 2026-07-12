<script lang="ts">
	import { useAction } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { DEMO_TEMPLATES } from '$lib/convex/demo/templates';
	import type { DemoTemplateId } from '$lib/convex/demo/templates';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select/index.js';
	import { localizedHref } from '$lib/utils/i18n';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import { page } from '$app/state';

	const COUNTRIES = [
		{ value: 'FR', label: 'France' },
		{ value: 'GB', label: 'Royaume-Uni' },
		{ value: 'SE', label: 'Suède' },
		{ value: 'NO', label: 'Norvège' },
		{ value: 'DK', label: 'Danemark' },
		{ value: 'DE', label: 'Allemagne' },
		{ value: 'NL', label: 'Pays-Bas' }
	];

	const TEMPLATES = Object.values(DEMO_TEMPLATES);

	// État du wizard
	let step = $state(1);
	const TOTAL_STEPS = 4;

	// Formulaire
	let form = $state({
		orgName: '',
		templateId: 'services' as DemoTemplateId,
		country: 'FR',
		fleetSize: 30,
		prospectName: '',
		prospectEmail: '',
		prospectCity: '',
		commercialName: '',
		commercialPhone: '',
		commercialCalendlyUrl: '',
		notes: '',
		expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000 // J+14 par défaut
	});

	// Résultat de génération
	let generatedOrgId = $state<string | null>(null);
	let generatedToken = $state<string | null>(null);
	let generating = $state(false);
	let generateError = $state<string | null>(null);
	let copied = $state(false);

	const generateAction = useAction((api as any)['demo/generator'].generateDemoOrg);

	const selectedTemplate = $derived(DEMO_TEMPLATES[form.templateId]);

	const demoLink = $derived(
		generatedToken
			? `${page.url.origin}/${page.params.lang ? page.params.lang + '/' : ''}demo/${generatedToken}`
			: null
	);

	const expiresAtDate = $derived(new Date(form.expiresAt).toISOString().split('T')[0]);

	function setExpiresAt(dateStr: string) {
		form.expiresAt = new Date(dateStr).getTime();
	}

	const maxExpiry = $derived(
		new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
	);

	const minExpiry = $derived(
		new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
	);

	function canProceed(s: number): boolean {
		if (s === 1) return !!form.orgName.trim() && !!form.templateId && !!form.prospectName.trim();
		if (s === 2) return !!form.commercialName.trim() && !!form.commercialPhone.trim();
		return true;
	}

	function nextStep() {
		if (step < TOTAL_STEPS && canProceed(step)) step++;
	}

	function prevStep() {
		if (step > 1) step--;
	}

	// Aperçu de 5 véhicules pour l'étape 3
	const previewVehicles = $derived.by(() => {
		const specs = selectedTemplate.vehicleSpecs;
		const result: { brand: string; model: string; energy: string; registration: string }[] = [];
		for (let i = 0; i < 5; i++) {
			const spec = specs[i % specs.length];
			if (!spec) continue;
			const num = String(100 + i * 37);
			const letters = String.fromCharCode(65 + i, 65 + (i * 3) % 26);
			result.push({
				brand: spec.brand,
				model: spec.model,
				energy: spec.energy,
				registration: `DM-${num}-${letters}`
			});
		}
		return result;
	});

	async function generate() {
		if (generating) return;
		generating = true;
		generateError = null;

		try {
			const result = await generateAction({
				orgName: form.orgName,
				templateId: form.templateId,
				fleetSize: form.fleetSize,
				country: form.country,
				createdBy: 'staff',
				commercialName: form.commercialName,
				commercialPhone: form.commercialPhone,
				commercialCalendlyUrl: form.commercialCalendlyUrl || undefined,
				prospectName: form.prospectName,
				prospectEmail: form.prospectEmail || undefined,
				prospectCity: form.prospectCity || undefined,
				notes: form.notes || undefined,
				expiresAt: form.expiresAt
			});
			generatedOrgId = result.orgId;
			generatedToken = result.token;
			step = 4;
		} catch (e: unknown) {
			generateError = e instanceof Error ? e.message : 'Erreur lors de la génération';
		} finally {
			generating = false;
		}
	}

	async function copyLink() {
		if (!demoLink) return;
		await navigator.clipboard.writeText(demoLink);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function energyLabel(e: string) {
		return e === 'ELECTRIC' ? 'Électrique' : e === 'HYBRID' ? 'Hybride' : 'Thermique';
	}

	const countryLabel = $derived(
		COUNTRIES.find((c) => c.value === form.country)?.label ?? form.country
	);
</script>

<div class="mx-auto max-w-2xl space-y-8 p-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Button
			variant="ghost"
			size="icon"
			href={localizedHref('/concierge')}
			class="size-8 shrink-0"
		>
			<ArrowLeftIcon class="size-4" />
		</Button>
		<div>
			<h1 class="text-xl font-semibold">Créer un compte démo</h1>
			<p class="text-sm text-muted-foreground">Générez un environnement prospect en moins de 3 min</p>
		</div>
	</div>

	<!-- Progress bar -->
	<div class="space-y-2">
		<div class="flex justify-between text-xs text-muted-foreground">
			{#each ['Prospect', 'Commercial', 'Aperçu', 'Terminé'] as label, i}
				<span class={step >= i + 1 ? 'text-foreground font-medium' : ''}>{label}</span>
			{/each}
		</div>
		<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div
				class="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
				style="width: {((step - 1) / (TOTAL_STEPS - 1)) * 100}%"
			></div>
		</div>
	</div>

	<!-- Card principale -->
	<div
		class="relative overflow-hidden rounded-2xl border border-border bg-card p-6 space-y-6"
		style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 4px 16px oklch(0 0 0 / 0.06)"
	>
		<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

		<!-- ── Étape 1 : Infos prospect ── -->
		{#if step === 1}
			<div class="space-y-5">
				<h2 class="font-semibold">Informations prospect</h2>

				<div class="space-y-1.5">
					<Label for="orgName">Nom de l'entreprise *</Label>
					<Input
						id="orgName"
						bind:value={form.orgName}
						placeholder="Acme SAS"
						class="h-10"
					/>
				</div>

				<div class="space-y-1.5">
					<Label>Secteur d'activité *</Label>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
						{#each TEMPLATES as tpl}
							<button
								type="button"
								onclick={() => (form.templateId = tpl.id)}
								class="relative overflow-hidden rounded-xl border p-3 text-left transition-all
									{form.templateId === tpl.id
										? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]'
										: 'border-border bg-card hover:border-border/60'}"
								style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
							>
								<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
								<span class="text-xl">{tpl.emoji}</span>
								<p class="mt-1.5 text-xs font-medium leading-tight">{tpl.label}</p>
								<p class="mt-0.5 text-xs text-muted-foreground leading-tight">{tpl.description}</p>
							</button>
						{/each}
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<Label for="country">Pays</Label>
						<select
							id="country"
							bind:value={form.country}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						>
							{#each COUNTRIES as c}
								<option value={c.value}>{c.label}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<Label for="fleetSize">
							Taille flotte : {form.fleetSize} véhicules
						</Label>
						<input
							id="fleetSize"
							type="range"
							min={selectedTemplate.fleetRange[0]}
							max={selectedTemplate.fleetRange[1]}
							step="5"
							bind:value={form.fleetSize}
							class="mt-3 h-2 w-full cursor-pointer accent-[var(--brand)]"
						/>
						<div class="flex justify-between text-xs text-muted-foreground">
							<span>{selectedTemplate.fleetRange[0]}</span>
							<span>{selectedTemplate.fleetRange[1]}</span>
						</div>
					</div>
				</div>

				<div class="space-y-4 border-t border-border pt-4">
					<h3 class="text-sm font-medium text-muted-foreground">Contact prospect</h3>
					<div class="space-y-1.5">
						<Label for="prospectName">Nom du contact *</Label>
						<Input
							id="prospectName"
							bind:value={form.prospectName}
							placeholder="Jean Dupont"
							class="h-10"
						/>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<Label for="prospectEmail">Email</Label>
							<Input
								id="prospectEmail"
								type="email"
								bind:value={form.prospectEmail}
								placeholder="jean@acme.fr"
								class="h-10"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="prospectCity">Ville</Label>
							<Input
								id="prospectCity"
								bind:value={form.prospectCity}
								placeholder="Lyon"
								class="h-10"
							/>
						</div>
					</div>
				</div>
			</div>

		<!-- ── Étape 2 : Paramètres démo ── -->
		{:else if step === 2}
			<div class="space-y-5">
				<h2 class="font-semibold">Paramètres de la démo</h2>

				<div class="space-y-4">
					<h3 class="text-sm font-medium text-muted-foreground">Informations commercial</h3>
					<div class="space-y-1.5">
						<Label for="commercialName">Votre nom *</Label>
						<Input
							id="commercialName"
							bind:value={form.commercialName}
							placeholder="Marie Martin"
							class="h-10"
						/>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-1.5">
							<Label for="commercialPhone">Téléphone direct *</Label>
							<Input
								id="commercialPhone"
								type="tel"
								bind:value={form.commercialPhone}
								placeholder="+33 6 12 34 56 78"
								class="h-10"
							/>
						</div>
						<div class="space-y-1.5">
							<Label for="calendly">Lien Calendly</Label>
							<Input
								id="calendly"
								bind:value={form.commercialCalendlyUrl}
								placeholder="calendly.com/marie"
								class="h-10"
							/>
						</div>
					</div>
				</div>

				<div class="space-y-4 border-t border-border pt-4">
					<h3 class="text-sm font-medium text-muted-foreground">Durée de la démo</h3>
					<div class="space-y-1.5">
						<Label for="expiresAt">Date d'expiration</Label>
						<Input
							id="expiresAt"
							type="date"
							value={expiresAtDate}
							min={minExpiry}
							max={maxExpiry}
							onchange={(e) => setExpiresAt((e.target as HTMLInputElement).value)}
							class="h-10"
						/>
						<p class="text-xs text-muted-foreground">Maximum 30 jours. Défaut : J+14.</p>
					</div>
				</div>

				<div class="space-y-1.5 border-t border-border pt-4">
					<Label for="notes">Notes internes</Label>
					<Textarea
						id="notes"
						bind:value={form.notes}
						placeholder="Contexte de la vente, pain points identifiés… (non visible du prospect)"
						rows={3}
						class="resize-none"
					/>
				</div>
			</div>

		<!-- ── Étape 3 : Prévisualisation ── -->
		{:else if step === 3}
			<div class="space-y-5">
				<h2 class="font-semibold">Aperçu de la démo</h2>

				<div
					class="relative overflow-hidden rounded-xl border border-border bg-muted/30 p-4 space-y-3"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
				>
					<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium">{form.orgName}</p>
							<p class="text-xs text-muted-foreground">
								{selectedTemplate.emoji} {selectedTemplate.label} · {countryLabel} · {form.fleetSize} véhicules
							</p>
						</div>
						<span class="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
							Démo
						</span>
					</div>

					<div class="grid grid-cols-3 gap-3 border-t border-border pt-3">
						<div class="text-center">
							<p class="text-lg font-semibold">{Math.round(selectedTemplate.utilizationRate * 100)}%</p>
							<p class="text-xs text-muted-foreground">Taux d'utilisation</p>
						</div>
						<div class="text-center">
							<p class="text-lg font-semibold">{selectedTemplate.avgKmPerVehiclePerMonth.toLocaleString()}</p>
							<p class="text-xs text-muted-foreground">km/véhicule/mois</p>
						</div>
						<div class="text-center">
							<p class="text-lg font-semibold">{selectedTemplate.avgCostPerKm.toFixed(2)}€</p>
							<p class="text-xs text-muted-foreground">coût/km</p>
						</div>
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-sm font-medium">5 véhicules exemple</p>
					<div class="space-y-1.5">
						{#each previewVehicles as v}
							<div
								class="relative overflow-hidden flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
								style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
							>
								<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
								<span class="text-sm font-medium">{v.brand} {v.model}</span>
								<div class="flex items-center gap-2">
									<span class="text-xs text-muted-foreground">{energyLabel(v.energy)}</span>
									<span class="font-mono text-xs text-muted-foreground">{v.registration}</span>
								</div>
							</div>
						{/each}
					</div>
					<p class="text-xs text-muted-foreground">
						+ {form.fleetSize - 5} autres véhicules générés avec historique 30 jours.
					</p>
				</div>

				<div
					class="relative overflow-hidden rounded-xl border border-border bg-muted/20 p-3 space-y-1"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
				>
					<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
					<p class="text-xs font-medium">Récapitulatif</p>
					<p class="text-xs text-muted-foreground">Contact : {form.prospectName}{form.prospectCity ? ` · ${form.prospectCity}` : ''}</p>
					<p class="text-xs text-muted-foreground">
						Expire le {new Date(form.expiresAt).toLocaleDateString('fr-FR')} · Plan Professional
					</p>
				</div>
			</div>

		<!-- ── Étape 4 : Terminé ── -->
		{:else if step === 4}
			<div class="space-y-5">
				{#if generatedToken}
					<div class="flex flex-col items-center gap-3 py-2 text-center">
						<div class="flex size-12 items-center justify-center rounded-full bg-[var(--brand)]/10">
							<CheckIcon class="size-6 text-[var(--brand)]" />
						</div>
						<div>
							<h2 class="font-semibold">Démo créée avec succès</h2>
							<p class="text-sm text-muted-foreground mt-1">
								{form.fleetSize} véhicules + historique 30 jours générés pour {form.orgName}
							</p>
						</div>
					</div>

					<div class="space-y-2">
						<Label>Lien magique à partager</Label>
						<div
							class="relative overflow-hidden flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3"
							style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
						>
							<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
							<p class="flex-1 truncate font-mono text-xs text-muted-foreground">{demoLink}</p>
							<Button
								variant="ghost"
								size="icon"
								class="size-7 shrink-0"
								onclick={copyLink}
							>
								{#if copied}
									<CheckIcon class="size-3.5 text-[var(--brand)]" />
								{:else}
									<CopyIcon class="size-3.5" />
								{/if}
							</Button>
						</div>
					</div>

					<div class="flex gap-2">
						<Button
							variant="outline"
							class="flex-1"
							onclick={copyLink}
						>
							<CopyIcon class="mr-2 size-4" />
							{copied ? 'Copié !' : 'Copier le lien'}
						</Button>
						<Button
							class="flex-1 bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
							href={demoLink ?? '#'}
							target="_blank"
						>
							<ExternalLinkIcon class="mr-2 size-4" />
							Ouvrir la démo
						</Button>
					</div>

					<div class="border-t border-border pt-4">
						<Button
							variant="ghost"
							class="w-full text-sm"
							href={localizedHref('/concierge')}
						>
							Retour au dashboard concierge
						</Button>
					</div>
				{:else}
					<!-- Génération en cours -->
					<div class="flex flex-col items-center gap-4 py-8 text-center">
						<LoaderIcon class="size-8 animate-spin text-muted-foreground" />
						<div>
							<h2 class="font-semibold">Génération en cours...</h2>
							<p class="text-sm text-muted-foreground mt-1">
								Création de {form.fleetSize} véhicules + historique 30 jours
							</p>
						</div>
					</div>
					{#if generateError}
						<div class="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
							{generateError}
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	{#if step < 4 || (step === 4 && !generatedToken)}
		<div class="flex items-center justify-between">
			<Button
				variant="ghost"
				onclick={prevStep}
				disabled={step === 1 || generating}
			>
				<ArrowLeftIcon class="mr-2 size-4" />
				Retour
			</Button>

			{#if step < 3}
				<Button
					onclick={nextStep}
					disabled={!canProceed(step)}
					class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
				>
					Continuer
					<ArrowRightIcon class="ml-2 size-4" />
				</Button>
			{:else if step === 3}
				<Button
					onclick={generate}
					disabled={generating}
					class="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
				>
					{#if generating}
						<LoaderIcon class="mr-2 size-4 animate-spin" />
						Génération...
					{:else}
						Créer le compte démo
						<ArrowRightIcon class="ml-2 size-4" />
					{/if}
				</Button>
			{/if}
		</div>
	{/if}
</div>
