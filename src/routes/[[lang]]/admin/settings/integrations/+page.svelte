<script lang="ts">
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { env } from '$env/dynamic/public';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import LinkIcon from '@lucide/svelte/icons/link';
	import UnlinkIcon from '@lucide/svelte/icons/unlink';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import KeyIcon from '@lucide/svelte/icons/key';
	import WebhookIcon from '@lucide/svelte/icons/webhook';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import type { Id } from '$lib/convex/_generated/dataModel.js';

	const client = useConvexClient();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyApi = api as any;

	const integrationsQuery = useQuery(anyApi.integrations.accounting.getMyAccountingIntegrations, {});
	const apiKeysQuery = useQuery(anyApi.integrations.apiKeys.listApiKeys, {});
	const webhooksQuery = useQuery(anyApi.integrations.apiKeys.listWebhookEndpoints, {});

	// ─── Logo helper ──────────────────────────────────────────────────────────

	function getLogoUrl(domain: string): string {
		const token = env.PUBLIC_LOGO_DEV_TOKEN;
		if (token) return `https://img.logo.dev/${domain}?token=${token}&size=64&format=png`;
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	}

	// ─── Providers catalogue ──────────────────────────────────────────────────

	const PROVIDERS = [
		{
			id: 'pennylane',
			name: 'Pennylane',
			description: 'Synchronisation automatique des coûts flotte et notes de frais IK.',
			domain: 'pennylane.com',
			available: true,
			badge: 'Pro',
			authType: 'apikey' as const,
			keyPlaceholder: 'sk_live_…',
			keyHint: 'Pennylane → Paramètres → API → Générer une clé'
		},
		{
			id: 'sage',
			name: 'Sage',
			description: 'Sage Business Cloud — pour les PME établies (700 000+ entreprises FR).',
			domain: 'sage.com',
			available: true,
			badge: 'Pro',
			authType: 'apikey' as const,
			keyPlaceholder: 'Token OAuth Sage…',
			keyHint: 'Sage Business Cloud → Mes apps → Créer une intégration → Copier le token'
		},
		{
			id: 'ebp',
			name: 'EBP',
			description: 'EBP Open Line — idéal pour artisans et PME traditionnelles, BTP.',
			domain: 'ebp.fr',
			available: true,
			badge: 'Pro',
			authType: 'apikey' as const,
			keyPlaceholder: 'Clé API EBP…',
			keyHint: 'EBP Compta → Préférences → API → Générer une clé'
		},
		{
			id: 'odoo',
			name: 'Odoo',
			description: 'Module Odoo community — installable depuis apps.odoo.com.',
			domain: 'odoo.com',
			available: false,
			badge: 'Module',
			authType: 'module' as const,
			keyPlaceholder: '',
			keyHint: ''
		}
	];

	// ─── Connect modal ────────────────────────────────────────────────────────

	let connectOpen = $state(false);
	let connectProvider = $state<string>('pennylane');
	let apiKey = $state('');
	let connecting = $state(false);

	function openConnect(providerId: string) {
		connectProvider = providerId;
		apiKey = '';
		connectOpen = true;
	}

	async function handleConnect() {
		if (!apiKey.trim()) {
			toast.error('Clé API requise');
			return;
		}
		connecting = true;
		try {
			const res = await fetch('/api/accounting/connect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: connectProvider, apiKey })
			});
			const data = (await res.json()) as { ok?: boolean; error?: string };
			if (!res.ok || data.error) throw new Error(data.error ?? 'Erreur connexion');
			toast.success('Connexion établie avec succès');
			connectOpen = false;
			apiKey = '';
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Erreur lors de la connexion');
		} finally {
			connecting = false;
		}
	}

	// ─── Disconnect ───────────────────────────────────────────────────────────

	let disconnecting = $state<string | null>(null);

	async function handleDisconnect(integrationId: Id<'accountingIntegrations'>) {
		disconnecting = integrationId;
		try {
			await client.mutation(anyApi.integrations.accounting.disconnectIntegration, { integrationId });
			toast.success('Intégration déconnectée');
		} catch {
			toast.error('Erreur lors de la déconnexion');
		} finally {
			disconnecting = null;
		}
	}

	// ─── Manual sync ─────────────────────────────────────────────────────────

	let syncing = $state<string | null>(null);

	async function handleSync(integrationId: Id<'accountingIntegrations'>) {
		syncing = integrationId;
		try {
			await client.mutation(anyApi.integrations.accounting.triggerManualSync, { integrationId });
			toast.success('Synchronisation relancée');
		} catch {
			toast.error('Erreur lors de la synchronisation');
		} finally {
			syncing = null;
		}
	}

	// ─── Mapping panel ────────────────────────────────────────────────────────

	let mappingOpen = $state(false);
	let selectedIntegrationId = $state<Id<'accountingIntegrations'> | null>(null);

	const mappingsQuery = useQuery(
		anyApi.integrations.accounting.getCategoryMappings,
		() => (selectedIntegrationId ? { integrationId: selectedIntegrationId } : 'skip')
	);
	const syncLogsQuery = useQuery(
		anyApi.integrations.accounting.getRecentSyncLogs,
		() => (selectedIntegrationId ? { integrationId: selectedIntegrationId, limit: 10 } : 'skip')
	);

	function openMapping(id: Id<'accountingIntegrations'>) {
		selectedIntegrationId = id;
		mappingOpen = true;
	}

	async function handleMappingUpdate(mappingId: Id<'accountingCategoryMappings'>, code: string, label: string) {
		try {
			await client.mutation(anyApi.integrations.accounting.updateCategoryMapping, {
				mappingId,
				externalAccountCode: code,
				externalAccountLabel: label
			});
			toast.success('Mapping mis à jour');
		} catch {
			toast.error('Erreur lors de la mise à jour');
		}
	}

	// ─── API Keys ─────────────────────────────────────────────────────────────

	let newKeyOpen = $state(false);
	let newKeyName = $state('');
	let newKeyScopes = $state<string[]>(['costs:read', 'vehicles:read']);
	let creatingKey = $state(false);
	let createdKey = $state<string | null>(null);

	const ALL_SCOPES = [
		{ id: 'costs:read', label: 'Coûts — lecture' },
		{ id: 'costs:write', label: 'Coûts — écriture' },
		{ id: 'vehicles:read', label: 'Véhicules — lecture' },
		{ id: 'expenses:read', label: 'Notes de frais — lecture' }
	];

	function toggleScope(scope: string) {
		newKeyScopes = newKeyScopes.includes(scope)
			? newKeyScopes.filter((s) => s !== scope)
			: [...newKeyScopes, scope];
	}

	async function handleCreateKey() {
		if (!newKeyName.trim() || !newKeyScopes.length) return;
		creatingKey = true;
		try {
			const result = await client.mutation(anyApi.integrations.apiKeys.createApiKey, {
				name: newKeyName.trim(),
				scopes: newKeyScopes
			});
			createdKey = result.key;
		} catch {
			toast.error('Erreur lors de la création de la clé');
		} finally {
			creatingKey = false;
		}
	}

	function closeNewKey() {
		newKeyOpen = false;
		newKeyName = '';
		newKeyScopes = ['costs:read', 'vehicles:read'];
		createdKey = null;
	}

	async function copyKey() {
		if (!createdKey) return;
		await navigator.clipboard.writeText(createdKey);
		toast.success('Clé copiée');
	}

	async function handleRevokeKey(keyId: Id<'apiKeys'>) {
		try {
			await client.mutation(anyApi.integrations.apiKeys.revokeApiKey, { keyId });
			toast.success('Clé révoquée');
		} catch {
			toast.error('Erreur lors de la révocation');
		}
	}

	// ─── Webhooks ─────────────────────────────────────────────────────────────

	let newWebhookOpen = $state(false);
	let webhookUrl = $state('');
	let webhookEvents = $state<string[]>(['cost.created']);
	let createdWebhookSecret = $state<string | null>(null);
	let showSecretDialog = $state(false);
	let creatingWebhook = $state(false);

	const ALL_EVENTS = [
		{ id: 'cost.created', label: 'Coût créé' },
		{ id: 'cost.updated', label: 'Coût modifié' },
		{ id: 'expense.approved', label: 'Note de frais approuvée' },
		{ id: 'reservation.created', label: 'Réservation créée' }
	];

	function toggleEvent(event: string) {
		webhookEvents = webhookEvents.includes(event)
			? webhookEvents.filter((e) => e !== event)
			: [...webhookEvents, event];
	}

	async function handleCreateWebhook() {
		if (!webhookUrl.trim() || !webhookEvents.length) return;
		creatingWebhook = true;
		try {
			const res = await fetch('/api/webhooks/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: webhookUrl.trim(), events: webhookEvents })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error((err as any).error ?? 'Erreur lors de la création');
			}
			const data = await res.json();
			newWebhookOpen = false;
			webhookUrl = '';
			webhookEvents = ['cost.created'];
			createdWebhookSecret = data.secret;
			showSecretDialog = true;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Erreur lors de la création');
		} finally {
			creatingWebhook = false;
		}
	}

	async function handleDeleteWebhook(endpointId: Id<'webhookEndpoints'>) {
		try {
			await client.mutation(anyApi.integrations.apiKeys.deleteWebhookEndpoint, { endpointId });
			toast.success('Webhook supprimé');
		} catch {
			toast.error('Erreur lors de la suppression');
		}
	}

	async function toggleWebhookActive(endpointId: Id<'webhookEndpoints'>, isActive: boolean) {
		try {
			await client.mutation(anyApi.integrations.apiKeys.updateWebhookEndpointMutation, {
				endpointId,
				isActive: !isActive
			});
		} catch {
			toast.error('Erreur');
		}
	}

	// ─── Helpers ─────────────────────────────────────────────────────────────

	function getIntegration(providerId: string) {
		return integrationsQuery.data?.find((i) => i.provider === providerId);
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
	}

	const CATEGORY_LABELS: Record<string, string> = {
		LEASING: 'Leasing / Location',
		CARBURANT: 'Carburant',
		ENTRETIEN: 'Entretien',
		ASSURANCE: 'Assurance',
		TAXES: 'Taxes (TVS)',
		SINISTRE: 'Sinistres',
		PARKING: 'Parking',
		TELEPEAGE: 'Télépéage',
		AUTRE: 'Autres',
		IK: 'Indemnités kilométriques'
	};
</script>

<!-- ─── Connect modal ──────────────────────────────────────────────────────── -->
<Dialog.Root bind:open={connectOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Connecter {PROVIDERS.find((p) => p.id === connectProvider)?.name}</Dialog.Title>
			<Dialog.Description>
				{PROVIDERS.find((p) => p.id === connectProvider)?.keyHint}
			</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-1.5">
				<Label for="api-key">Clé API / Token</Label>
				<Input
					id="api-key"
					type="password"
					placeholder={PROVIDERS.find((p) => p.id === connectProvider)?.keyPlaceholder ?? ''}
					bind:value={apiKey}
					onkeydown={(e) => e.key === 'Enter' && handleConnect()}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (connectOpen = false)}>Annuler</Button>
			<Button onclick={handleConnect} disabled={connecting || !apiKey.trim()}>
				{#if connecting}
					<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
				{:else}
					<LinkIcon class="mr-2 h-4 w-4" />
				{/if}
				Connecter
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ─── Mapping panel ──────────────────────────────────────────────────────── -->
<Dialog.Root bind:open={mappingOpen}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Mapping comptable</Dialog.Title>
			<Dialog.Description>Associez chaque catégorie Mycelium à un compte PCG et un axe analytique.</Dialog.Description>
		</Dialog.Header>
		<div class="max-h-[60vh] overflow-y-auto space-y-1 py-2">
			{#if mappingsQuery.isLoading}
				{#each { length: 6 } as _, i (i)}
					<Skeleton class="h-10 w-full rounded-lg" />
				{/each}
			{:else if mappingsQuery.data}
				<div class="grid grid-cols-[1fr_7rem_7rem] gap-2 px-1 py-1 text-xs font-medium text-muted-foreground">
					<span>Catégorie</span><span>Compte PCG</span><span>Axe analytique</span>
				</div>
				{#each mappingsQuery.data as m (m._id)}
					<div class="grid grid-cols-[1fr_7rem_7rem] items-center gap-2 rounded-lg border border-border/50 px-3 py-2">
						<span class="text-sm">{CATEGORY_LABELS[m.myceliumCategory] ?? m.myceliumCategory}</span>
						<Input
							class="h-7 text-xs"
							value={m.externalAccountCode}
							onblur={(e) => handleMappingUpdate(m._id, (e.target as HTMLInputElement).value, m.externalAccountLabel ?? '')}
						/>
						<span class="text-xs text-muted-foreground">{m.analyticAxis ?? 'Flotte'}</span>
					</div>
				{/each}
			{/if}
		</div>
		{#if syncLogsQuery.data?.length}
			<div class="border-t border-border/60 pt-3">
				<p class="mb-2 text-xs font-medium text-muted-foreground">Dernières synchronisations</p>
				<div class="space-y-1 max-h-40 overflow-y-auto">
					{#each syncLogsQuery.data as log (log._id)}
						<div class="flex items-center gap-2 rounded px-2 py-1 text-xs">
							{#if log.status === 'SUCCESS'}
								<CheckCircle2Icon class="h-3.5 w-3.5 shrink-0 text-emerald-500" />
							{:else if log.status === 'FAILED'}
								<XCircleIcon class="h-3.5 w-3.5 shrink-0 text-destructive" />
							{:else}
								<ClockIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							{/if}
							<span class="text-muted-foreground">{log.entityType}</span>
							<span class="truncate font-mono text-[10px] text-muted-foreground/60">{log.entityId.slice(-8)}</span>
							{#if log.error}
								<span class="ml-auto truncate text-destructive max-w-[160px]">{log.error}</span>
							{:else if log.syncedAt}
								<span class="ml-auto text-muted-foreground/60">{formatDate(log.syncedAt)}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (mappingOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ─── New API Key modal ──────────────────────────────────────────────────── -->
<Dialog.Root bind:open={newKeyOpen} onOpenChange={(o) => !o && closeNewKey()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nouvelle clé API</Dialog.Title>
			<Dialog.Description>La clé ne sera affichée qu'une seule fois. Conservez-la en lieu sûr.</Dialog.Description>
		</Dialog.Header>
		{#if createdKey}
			<div class="space-y-3 py-2">
				<p class="text-sm text-muted-foreground">Copiez cette clé maintenant — elle ne sera plus affichée.</p>
				<div class="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
					<EyeOffIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
					<code class="flex-1 truncate text-xs font-mono">{createdKey}</code>
					<Button size="sm" variant="ghost" class="h-7 w-7 p-0" onclick={copyKey}>
						<CopyIcon class="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
			<Dialog.Footer>
				<Button onclick={closeNewKey}>Fermer</Button>
			</Dialog.Footer>
		{:else}
			<div class="space-y-4 py-2">
				<div class="space-y-1.5">
					<Label for="key-name">Nom de la clé</Label>
					<Input id="key-name" placeholder="Odoo production" bind:value={newKeyName} />
				</div>
				<div class="space-y-1.5">
					<Label>Permissions (scopes)</Label>
					<div class="grid grid-cols-2 gap-2">
						{#each ALL_SCOPES as scope (scope.id)}
							<button
								type="button"
								onclick={() => toggleScope(scope.id)}
								class={[
									'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition-colors',
									newKeyScopes.includes(scope.id)
										? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-foreground'
										: 'border-border/50 text-muted-foreground hover:border-border'
								].join(' ')}
							>
								<span class={[
									'h-3.5 w-3.5 shrink-0 rounded-sm border',
									newKeyScopes.includes(scope.id) ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-muted-foreground/40'
								].join(' ')}></span>
								{scope.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={closeNewKey}>Annuler</Button>
				<Button onclick={handleCreateKey} disabled={creatingKey || !newKeyName.trim() || !newKeyScopes.length}>
					{#if creatingKey}
						<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					{:else}
						<KeyIcon class="mr-2 h-4 w-4" />
					{/if}
					Créer la clé
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- ─── New Webhook modal ──────────────────────────────────────────────────── -->
<Dialog.Root bind:open={newWebhookOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nouveau webhook</Dialog.Title>
			<Dialog.Description>Les payloads sont signés HMAC SHA-256 via le header <code>X-Mycelium-Signature</code>.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-1.5">
				<Label for="webhook-url">URL HTTPS</Label>
				<Input id="webhook-url" placeholder="https://votre-app.com/hooks/mycelium" bind:value={webhookUrl} />
			</div>
			<div class="space-y-1.5">
				<Label>Événements</Label>
				<div class="space-y-1.5">
					{#each ALL_EVENTS as event (event.id)}
						<button
							type="button"
							onclick={() => toggleEvent(event.id)}
							class={[
								'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition-colors',
								webhookEvents.includes(event.id)
									? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-foreground'
									: 'border-border/50 text-muted-foreground hover:border-border'
							].join(' ')}
						>
							<span class={[
								'h-3.5 w-3.5 shrink-0 rounded-sm border',
								webhookEvents.includes(event.id) ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-muted-foreground/40'
							].join(' ')}></span>
							{event.label}
							<code class="ml-auto text-[10px] text-muted-foreground/60">{event.id}</code>
						</button>
					{/each}
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (newWebhookOpen = false)}>Annuler</Button>
			<Button onclick={handleCreateWebhook} disabled={creatingWebhook || !webhookUrl.trim() || !webhookEvents.length}>
				{#if creatingWebhook}
					<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
				{:else}
					<WebhookIcon class="mr-2 h-4 w-4" />
				{/if}
				Créer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ─── Webhook secret (shown once at creation) ───────────────────────────── -->
<Dialog.Root bind:open={showSecretDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Clé secrète du webhook</Dialog.Title>
			<Dialog.Description>
				Copiez cette clé maintenant — elle ne sera plus jamais affichée. Utilisez-la pour vérifier la signature
				<code>X-Mycelium-Signature</code> sur vos payloads entrants.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-lg border border-border bg-muted/50 p-3">
			<code class="break-all text-xs font-mono select-all">{createdWebhookSecret}</code>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					if (createdWebhookSecret) {
						navigator.clipboard.writeText(createdWebhookSecret);
						toast.success('Clé copiée');
					}
				}}
			>
				<CopyIcon class="mr-2 h-3.5 w-3.5" />
				Copier
			</Button>
			<Button onclick={() => { showSecretDialog = false; createdWebhookSecret = null; }}>
				J'ai copié la clé
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ─── Main content ──────────────────────────────────────────────────────── -->
<div class="space-y-4">
	<div>
		<h2 class="text-sm font-semibold">Intégrations & API</h2>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Connectez Mycelium à votre logiciel de comptabilité ou exposez vos données via l'API publique.
		</p>
	</div>

	<Tabs.Root value="accounting">
		<Tabs.List class="mb-4">
			<Tabs.Trigger value="accounting">Comptabilité</Tabs.Trigger>
			<Tabs.Trigger value="dev">Développeurs / API</Tabs.Trigger>
		</Tabs.List>

		<!-- ─── Tab Comptabilité ─────────────────────────────────────────── -->
		<Tabs.Content value="accounting" class="space-y-4">
			{#if integrationsQuery.isLoading}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each { length: 4 } as _, i (i)}
						<Skeleton class="h-36 w-full rounded-xl" />
					{/each}
				</div>
			{:else}
				<div class="grid gap-3 sm:grid-cols-2">
					{#each PROVIDERS as provider (provider.id)}
						{@const integration = getIntegration(provider.id)}
						{@const isConnected = integration?.status === 'CONNECTED'}
						{@const isError = integration?.status === 'ERROR'}

						<Card.Root class="relative overflow-hidden rounded-xl border border-border/60 bg-card">
							<Card.Content class="p-4">
								<div class="flex items-start justify-between gap-3">
									<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-border/40">
										<img
											src={getLogoUrl(provider.domain)}
											alt={provider.name}
											class="h-full w-full object-contain"
											onerror={(e) => {
												const el = e.currentTarget as HTMLImageElement;
												el.style.display = 'none';
												el.parentElement!.innerHTML = `<span class="text-xs font-bold text-muted-foreground">${provider.name.slice(0, 2)}</span>`;
											}}
										/>
									</div>
									<span class={[
										'rounded-full px-2 py-0.5 text-[10px] font-medium',
										isConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
										: isError ? 'bg-destructive/10 text-destructive'
										: !provider.available ? 'bg-muted text-muted-foreground'
										: 'bg-[var(--brand)]/10 text-[var(--brand)]'
									].join(' ')}>
										{isConnected ? 'Connecté' : isError ? 'Erreur' : provider.badge}
									</span>
								</div>

								<div class="mt-3">
									<p class="text-sm font-semibold">{provider.name}</p>
									<p class="mt-0.5 text-xs text-muted-foreground leading-relaxed">{provider.description}</p>
								</div>

								{#if integration?.lastSyncAt}
									<p class="mt-2 text-[10px] text-muted-foreground/60">
										Dernière sync : {formatDate(integration.lastSyncAt)}
									</p>
								{/if}
								{#if isError && integration?.lastSyncError}
									<p class="mt-1 flex items-center gap-1 text-[10px] text-destructive">
										<AlertCircleIcon class="h-3 w-3" />
										{integration.lastSyncError}
									</p>
								{/if}

								<div class="mt-3 flex items-center gap-2">
									{#if isConnected || isError}
										<Button size="sm" variant="outline" class="h-7 text-xs"
											disabled={syncing === integration?._id}
											onclick={() => integration && handleSync(integration._id)}>
											<RefreshCwIcon class={['mr-1.5 h-3 w-3', syncing === integration?._id ? 'animate-spin' : ''].join(' ')} />
											Synchroniser
										</Button>
										<Button size="sm" variant="ghost" class="h-7 text-xs"
											onclick={() => integration && openMapping(integration._id)}>
											<SettingsIcon class="mr-1.5 h-3 w-3" />
											Mapping
										</Button>
										<Button size="sm" variant="ghost" class="ml-auto h-7 text-xs text-muted-foreground hover:text-destructive"
											disabled={disconnecting === integration?._id}
											onclick={() => integration && handleDisconnect(integration._id)}>
											<UnlinkIcon class="mr-1.5 h-3 w-3" />
											Déconnecter
										</Button>
									{:else if provider.available && provider.authType === 'apikey'}
										<Button size="sm" class="h-7 text-xs" onclick={() => openConnect(provider.id)}>
											<LinkIcon class="mr-1.5 h-3 w-3" />
											Connecter
										</Button>
									{:else if provider.authType === 'module'}
										<a
											href="https://apps.odoo.com"
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/60 px-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
										>
											<LinkIcon class="h-3 w-3" />
											apps.odoo.com
										</a>
									{:else}
										<span class="text-xs text-muted-foreground/60">Disponible prochainement</span>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}

			<div class="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-3">
				<p class="text-xs text-muted-foreground">
					<span class="font-medium text-foreground">Intégrations comptables — Plan Pro (590€/mois).</span>
					Coûts flotte et notes de frais IK synchronisés automatiquement. Zéro double saisie.
				</p>
			</div>
		</Tabs.Content>

		<!-- ─── Tab Développeurs ──────────────────────────────────────────── -->
		<Tabs.Content value="dev" class="space-y-6">

			<!-- API Keys -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-semibold">Clés API</h3>
						<p class="text-xs text-muted-foreground mt-0.5">
							Authentification Bearer <code class="text-[10px]">myc_live_…</code> sur l'API REST v1.
						</p>
					</div>
					<Button size="sm" class="h-7 text-xs" onclick={() => (newKeyOpen = true)}>
						<PlusIcon class="mr-1.5 h-3 w-3" />
						Nouvelle clé
					</Button>
				</div>

				{#if apiKeysQuery.isLoading}
					<Skeleton class="h-20 w-full rounded-xl" />
				{:else if !apiKeysQuery.data?.length}
					<div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-8 text-center">
						<KeyIcon class="h-8 w-8 text-muted-foreground/40" />
						<p class="text-sm text-muted-foreground">Aucune clé API — créez-en une pour commencer.</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each apiKeysQuery.data as key (key._id)}
							<div class="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
								<KeyIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium">{key.name}</p>
									<p class="text-[10px] font-mono text-muted-foreground/60">{key.prefix}…</p>
								</div>
								<div class="flex items-center gap-1.5 flex-wrap justify-end">
									{#each key.scopes as scope (scope)}
										<Badge variant="outline" class="text-[9px] px-1.5 py-0">{scope}</Badge>
									{/each}
								</div>
								{#if key.lastUsedAt}
									<span class="text-[10px] text-muted-foreground/60 shrink-0">{formatDate(key.lastUsedAt)}</span>
								{/if}
								<Button size="sm" variant="ghost" class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
									onclick={() => handleRevokeKey(key._id)}>
									<TrashIcon class="h-3.5 w-3.5" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}

				<!-- API base URL info -->
				<div class="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
					<p class="text-xs font-medium text-muted-foreground">Base URL</p>
					<code class="text-xs">{env.PUBLIC_CONVEX_SITE_URL ?? 'https://yourapp.convex.site'}/api/v1</code>
					<p class="mt-2 text-[10px] text-muted-foreground/70">
						Endpoints : <code>GET /costs</code>, <code>POST /costs</code>,
						<code>GET /vehicles</code>, <code>GET /expenses</code>, <code>GET /webhooks</code>
					</p>
				</div>
			</div>

			<!-- Webhooks -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-semibold">Webhooks</h3>
						<p class="text-xs text-muted-foreground mt-0.5">
							Payloads signés HMAC SHA-256 — header <code class="text-[10px]">X-Mycelium-Signature</code>. Retry x5 avec backoff.
						</p>
					</div>
					<Button size="sm" class="h-7 text-xs" onclick={() => (newWebhookOpen = true)}>
						<PlusIcon class="mr-1.5 h-3 w-3" />
						Nouveau webhook
					</Button>
				</div>

				{#if webhooksQuery.isLoading}
					<Skeleton class="h-20 w-full rounded-xl" />
				{:else if !webhooksQuery.data?.length}
					<div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-8 text-center">
						<WebhookIcon class="h-8 w-8 text-muted-foreground/40" />
						<p class="text-sm text-muted-foreground">Aucun webhook — créez-en un pour recevoir des événements.</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each webhooksQuery.data as endpoint (endpoint._id)}
							<div class="rounded-xl border border-border/60 bg-card px-4 py-3">
								<div class="flex items-center gap-3">
									<WebhookIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
									<div class="flex-1 min-w-0">
										<p class="truncate text-sm font-mono">{endpoint.url}</p>
										<div class="mt-1 flex flex-wrap gap-1">
											{#each endpoint.events as event (event)}
												<Badge variant="outline" class="text-[9px] px-1.5 py-0">{event}</Badge>
											{/each}
										</div>
									</div>
									<button
										type="button"
										onclick={() => toggleWebhookActive(endpoint._id, endpoint.isActive)}
										class={[
											'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer',
											endpoint.isActive
												? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
												: 'bg-muted text-muted-foreground hover:bg-muted/80'
										].join(' ')}
									>
										{endpoint.isActive ? 'Actif' : 'Inactif'}
									</button>
									{#if endpoint.lastDeliveredAt}
										<span class="text-[10px] text-muted-foreground/60 shrink-0">{formatDate(endpoint.lastDeliveredAt)}</span>
									{/if}
									<Button size="sm" variant="ghost" class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
										onclick={() => handleDeleteWebhook(endpoint._id)}>
										<TrashIcon class="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-3">
				<p class="text-xs text-muted-foreground">
					<span class="font-medium text-foreground">API publique — Plan Business (990€/mois).</span>
					Intégrez Mycelium dans vos outils internes ou utilisez le module Odoo community pour une sync automatique.
				</p>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
