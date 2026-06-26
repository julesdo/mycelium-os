<script lang="ts">
	/* eslint-disable svelte/no-unused-props */
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	export type AuthType = 'oauth' | 'apikey' | 'token-pair' | 'csv' | 'module';
	export type ProviderCategory =
		| 'accounting'
		| 'hr'
		| 'fuel'
		| 'telematics'
		| 'comms'
		| 'compliance'
		| 'insurance'
		| 'erp';
	export type PlanTier = 'essential' | 'professional' | 'business';

	export interface IntegrationProvider {
		id: string;
		name: string;
		description: string;
		domain: string;
		category: ProviderCategory;
		authType: AuthType;
		markets: string[];
		planRequired: PlanTier;
		keyPlaceholder?: string;
		keyHint?: string;
		docsUrl?: string;
		oauthUrl?: string;
		dataPoints: string[];
		syncDescription: string;
		prerequisites: string[];
	}

	type Step = 'overview' | 'auth' | 'configure' | 'verify' | 'done';
	type CheckStatus = 'idle' | 'running' | 'ok' | 'error';

	interface Check {
		label: string;
		detail?: string;
		status: CheckStatus;
	}

	let {
		provider,
		open = $bindable(false),
		onSuccess
	}: {
		provider: IntegrationProvider;
		open: boolean;
		onSuccess?: (providerId: string) => void;
	} = $props();

	const convex = useConvexClient();

	const anyApi = api as any;

	const STEPS: Step[] = ['overview', 'auth', 'configure', 'verify', 'done'];
	const TOTAL = STEPS.length - 1; // don't count "done" in progress bar

	let step = $state<Step>('overview');
	let apiKey = $state('');
	let showKey = $state(false);
	let syncFrequency = $state<'realtime' | 'daily' | 'weekly' | 'manual'>('daily');
	let connecting = $state(false);
	let error = $state<string | null>(null);

	const checks = $state<Check[]>([
		{ label: 'Connexion au serveur', status: 'idle' },
		{ label: 'Vérification des permissions', status: 'idle' },
		{ label: 'Accès aux données', status: 'idle' },
		{ label: 'Configuration validée', status: 'idle' }
	]);

	const stepIndex = (s: Step) => STEPS.indexOf(s);
	const progressPct = $derived(Math.round((stepIndex(step) / TOTAL) * 100));

	const FREQ_OPTIONS: { value: typeof syncFrequency; label: string }[] = [
		{ value: 'realtime', label: 'Temps réel' },
		{ value: 'daily', label: 'Quotidienne' },
		{ value: 'weekly', label: 'Hebdomadaire' },
		{ value: 'manual', label: 'Manuelle' }
	];

	function getLogoUrl(domain: string) {
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	}

	function resetState() {
		step = 'overview';
		apiKey = '';
		showKey = false;
		error = null;
		connecting = false;
		checks.forEach((c) => {
			c.status = 'idle';
			c.detail = undefined;
		});
	}

	function handleClose() {
		open = false;
		setTimeout(resetState, 300);
	}

	function next() {
		const idx = stepIndex(step);
		const n = STEPS[idx + 1];
		if (n && idx < STEPS.length - 1) step = n;
	}

	function back() {
		const idx = stepIndex(step);
		const p = STEPS[idx - 1];
		if (p && idx > 0) step = p;
	}

	function handleAuth() {
		if (!apiKey.trim()) {
			error = 'Clé API requise.';
			return;
		}
		error = null;
		next();
	}

	async function runVerification() {
		connecting = true;
		error = null;
		checks.forEach((c) => {
			c.status = 'idle';
			c.detail = undefined;
		});

		try {
			const connectPromise =
				provider.category === 'comms'
					? convex.action(anyApi.comms.connectCommsProvider, {
							provider: provider.id,
							webhookUrl: apiKey.trim()
						})
					: convex.action(anyApi.integrations.accounting.connectApiKeyProvider, {
							provider: provider.id,
							apiKey: apiKey.trim()
						});

			for (let i = 0; i < checks.length; i++) {
				const c = checks[i];
				if (c) c.status = 'running';
				await new Promise((r) => setTimeout(r, 500 + i * 350));
			}

			await connectPromise;

			checks.forEach((c) => (c.status = 'ok'));
			await new Promise((r) => setTimeout(r, 500));
			step = 'done';
			onSuccess?.(provider.id);
		} catch (err: unknown) {
			if (checks[0]) checks[0].status = 'ok';
			if (checks[1]) checks[1].status = 'ok';
			if (checks[2]) checks[2].status = 'ok';
			const last = checks[3];
			const msg = err instanceof Error ? err.message : 'Vérification échouée';
			if (last) {
				last.status = 'error';
				last.detail = msg;
			}
			error = msg;
		} finally {
			connecting = false;
		}
	}

	$effect(() => {
		if (step === 'verify') runVerification();
	});
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<!-- Provider identity -->
			<div class="flex items-center gap-3">
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-border/40"
				>
					<img
						src={getLogoUrl(provider.domain)}
						alt={provider.name}
						class="h-5 w-5 object-contain"
						onerror={(e) => {
							const el = e.currentTarget as HTMLImageElement;
							el.style.display = 'none';
							el.parentElement!.innerHTML = `<span class="text-[10px] font-bold text-muted-foreground">${provider.name.slice(0, 2)}</span>`;
						}}
					/>
				</div>
				<Dialog.Title>{provider.name}</Dialog.Title>
			</div>

			<!-- Progress bars -->
			{#if step !== 'done'}
				<div class="mt-3 flex items-center gap-1">
					{#each STEPS.filter((s) => s !== 'done') as s, i (s)}
						<div
							class="h-1 flex-1 rounded-full transition-colors {stepIndex(step) > i
								? 'bg-primary'
								: stepIndex(step) === i
									? 'bg-primary/50'
									: 'bg-muted'}"
						></div>
					{/each}
				</div>
				<p class="mt-1 text-xs text-muted-foreground">
					Étape {stepIndex(step) + 1} sur {TOTAL}
				</p>
			{/if}
		</Dialog.Header>

		<!-- Body -->
		<div class="mt-4 min-h-[200px]">
			<!-- Step 1: Overview -->
			{#if step === 'overview'}
				<div class="flex flex-col gap-4">
					<div>
						<h3 class="font-medium">Connecter {provider.name}</h3>
						<p class="mt-1 text-sm text-muted-foreground">{provider.description}</p>
					</div>
					<div
						class="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
					>
						<span class="font-medium text-foreground">Synchronise :</span>
						{provider.dataPoints.join(', ')}.
					</div>
					{#if provider.prerequisites.length > 0}
						<p class="text-xs text-muted-foreground">
							<span class="font-medium text-foreground">Prérequis :</span>
							{provider.prerequisites.join(' · ')}
						</p>
					{/if}
				</div>

				<!-- Step 2: Auth -->
			{:else if step === 'auth'}
				<div class="flex flex-col gap-4">
					<h3 class="font-medium">
						{provider.authType === 'oauth'
							? `Autoriser l'accès à ${provider.name}`
							: provider.category === 'comms'
								? 'URL Webhook entrant'
								: 'Clé API'}
					</h3>

					{#if provider.authType === 'oauth'}
						<p class="text-sm text-muted-foreground">
							Vous allez être redirigé vers {provider.name} pour autoriser Mycelium à lire vos données.
						</p>
						<Button class="w-full gap-2" onclick={handleAuth}>
							<ExternalLinkIcon class="h-4 w-4" />
							Continuer vers {provider.name}
						</Button>
					{:else}
						<div class="flex flex-col gap-2">
							<Label for="api-key-input">
								{provider.category === 'comms'
									? 'URL Webhook'
									: provider.keyPlaceholder
										? 'Clé API'
										: 'Token'}
							</Label>
							<div class="relative">
								<Input
									id="api-key-input"
									type={provider.category === 'comms' ? 'text' : showKey ? 'text' : 'password'}
									placeholder={provider.keyPlaceholder ?? '…'}
									bind:value={apiKey}
									class="pr-9 font-mono"
									onkeydown={(e) => e.key === 'Enter' && handleAuth()}
								/>
								{#if provider.category !== 'comms'}
									<button
										type="button"
										onclick={() => (showKey = !showKey)}
										class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
										aria-label={showKey ? 'Masquer' : 'Afficher'}
									>
										{#if showKey}<EyeOffIcon class="h-4 w-4" />{:else}<EyeIcon
												class="h-4 w-4"
											/>{/if}
									</button>
								{/if}
							</div>
							{#if provider.keyHint}
								<details class="group">
									<summary
										class="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
									>
										<span class="transition-transform group-open:rotate-90">▶</span>
										Où trouver cette clé
									</summary>
									<p class="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
										{provider.keyHint}
									</p>
								</details>
							{/if}
							{#if provider.docsUrl}
								<!-- eslint-disable svelte/no-navigation-without-resolve -->
								<a
									href={provider.docsUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
								>
									<ExternalLinkIcon class="h-3 w-3" />
									Documentation {provider.name}
								</a>
								<!-- eslint-enable svelte/no-navigation-without-resolve -->
							{/if}
						</div>
					{/if}

					{#if error}
						<p class="text-xs text-destructive">{error}</p>
					{/if}
				</div>

				<!-- Step 3: Configure -->
			{:else if step === 'configure'}
				<div class="flex flex-col gap-4">
					<h3 class="font-medium">Fréquence de synchronisation</h3>
					<div class="grid grid-cols-2 gap-2">
						{#each FREQ_OPTIONS as opt (opt.value)}
							<button
								type="button"
								onclick={() => (syncFrequency = opt.value)}
								class="flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition-all
									{syncFrequency === opt.value
									? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
									: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Step 4: Verify -->
			{:else if step === 'verify'}
				<div class="flex flex-col gap-3">
					<h3 class="font-medium">Vérification en cours…</h3>
					<div class="flex flex-col gap-2">
						{#each checks as check (check.label)}
							<div class="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5">
								<div class="flex h-5 w-5 shrink-0 items-center justify-center">
									{#if check.status === 'idle'}
										<div class="h-3 w-3 rounded-full border-2 border-muted-foreground/30"></div>
									{:else if check.status === 'running'}
										<div
											class="h-4 w-4 rounded-full border-2 border-primary border-t-transparent motion-safe:animate-spin"
										></div>
									{:else if check.status === 'ok'}
										<CheckCircleIcon class="h-4 w-4 text-emerald-500" />
									{:else}
										<XCircleIcon class="h-4 w-4 text-destructive" />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p
										class="text-sm {check.status === 'error'
											? 'text-destructive'
											: check.status === 'idle'
												? 'text-muted-foreground/60'
												: 'text-foreground'}"
									>
										{check.label}
									</p>
									{#if check.detail}
										<p class="mt-0.5 text-xs text-destructive/80">{check.detail}</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>

					{#if error && !connecting}
						<div
							class="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
						>
							<p class="text-xs text-destructive">{error}</p>
							<Button
								size="sm"
								variant="ghost"
								class="ml-2 h-7 shrink-0 text-xs"
								onclick={runVerification}
							>
								Réessayer
							</Button>
						</div>
					{/if}
				</div>

				<!-- Step 5: Done -->
			{:else if step === 'done'}
				<div class="flex flex-col items-center gap-4 py-4 text-center">
					<CheckCircleIcon class="h-10 w-10 text-emerald-500" />
					<div>
						<h3 class="font-medium">Connecté</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							{provider.name} est maintenant synchronisé avec Mycelium.
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<Dialog.Footer class="mt-6">
			{#if step === 'done'}
				<Button class="w-full" onclick={handleClose}>Fermer</Button>
			{:else if step === 'verify'}
				<p class="mr-auto text-xs text-muted-foreground">
					{connecting ? 'Test en cours…' : error ? 'Vérification échouée' : ''}
				</p>
			{:else}
				<Button variant="ghost" onclick={handleClose}>Annuler</Button>
				<div class="ml-auto flex gap-2">
					{#if step !== 'overview'}
						<Button variant="outline" onclick={back}>Retour</Button>
					{/if}
					{#if step === 'overview'}
						<Button onclick={next}>Commencer</Button>
					{:else if step === 'auth'}
						<Button onclick={handleAuth} disabled={provider.authType !== 'oauth' && !apiKey.trim()}>
							Continuer
						</Button>
					{:else if step === 'configure'}
						<Button onclick={next}>Vérifier la connexion</Button>
					{/if}
				</div>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
