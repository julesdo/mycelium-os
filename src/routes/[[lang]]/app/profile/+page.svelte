<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import RestrictionBadge from '$lib/components/drivers/restriction-badge.svelte';
	import LicenseUpload from '$lib/components/drivers/license-upload.svelte';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import IdCardIcon from '@lucide/svelte/icons/id-card';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';

	const client = useConvexClient();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const profileQuery = useQuery((api as any).drivers.getMyDriverProfile, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const restrictionsQuery = useQuery((api as any).drivers.getMyDriverRestrictions, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const violationsQuery = useQuery((api as any).violations.listMyViolations, {});

	const profile = $derived(profileQuery.data ?? null);
	const restrictions = $derived(restrictionsQuery.data ?? []);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const violations = $derived((violationsQuery.data ?? []) as any[]);
	const isLoading = $derived(profileQuery.isLoading);

	const now = Date.now();
	const isExpired = $derived(
		profile?.licenseExpiryDate ? new Date(profile.licenseExpiryDate).getTime() < now : false
	);
	const isExpiringSoon = $derived.by(() => {
		if (!profile?.licenseExpiryDate) return false;
		const exp = new Date(profile.licenseExpiryDate).getTime();
		return exp > now && exp - now < 30 * 24 * 60 * 60 * 1000;
	});
	const daysUntilExpiry = $derived.by(() => {
		if (!profile?.licenseExpiryDate) return null;
		const exp = new Date(profile.licenseExpiryDate).getTime();
		return Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
	});

	type LicenseCategory = 'B' | 'BE' | 'C' | 'CE' | 'D';
	const ALL_CATEGORIES: LicenseCategory[] = ['B', 'BE', 'C', 'CE', 'D'];

	let licenseNumber = $state(untrack(() => profile?.licenseNumber ?? ''));
	let licenseIssuedDate = $state(untrack(() => profile?.licenseIssuedDate ?? ''));
	let licenseExpiryDate = $state(untrack(() => profile?.licenseExpiryDate ?? ''));
	let selectedCategories = $state<Set<LicenseCategory>>(
		new Set(untrack(() => (profile?.licenseCategories ?? []) as LicenseCategory[]))
	);
	let frontStorageId = $state(untrack(() => profile?.licenseFrontStorageId));
	let backStorageId = $state(untrack(() => profile?.licenseBackStorageId));

	$effect(() => {
		if (profile && !licenseNumber && !licenseExpiryDate) {
			licenseNumber = profile.licenseNumber ?? '';
			licenseIssuedDate = profile.licenseIssuedDate ?? '';
			licenseExpiryDate = profile.licenseExpiryDate ?? '';
			selectedCategories = new Set((profile.licenseCategories ?? []) as LicenseCategory[]);
			frontStorageId = profile.licenseFrontStorageId;
			backStorageId = profile.licenseBackStorageId;
		}
	});

	let saving = $state(false);
	let activeTab = $state('license');

	function toggleCategory(cat: LicenseCategory) {
		const next = new Set(selectedCategories);
		if (next.has(cat)) next.delete(cat);
		else next.add(cat);
		selectedCategories = next;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: '2-digit', month: '2-digit', year: 'numeric'
		});
	}
	function formatTs(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', {
			day: '2-digit', month: '2-digit', year: 'numeric'
		});
	}

	async function handleSave() {
		saving = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).drivers.upsertDriverProfile, {
				licenseNumber: licenseNumber || undefined,
				licenseCategories: selectedCategories.size > 0 ? [...selectedCategories] : undefined,
				licenseIssuedDate: licenseIssuedDate || undefined,
				licenseExpiryDate: licenseExpiryDate || undefined,
				licenseFrontStorageId: frontStorageId,
				licenseBackStorageId: backStorageId
			});
			toast.success('Permis mis à jour. Votre gestionnaire devra le valider à nouveau.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			saving = false;
		}
	}

	const VIOLATION_STATUS_LABELS: Record<string, string> = {
		RECEIVED: 'Reçue', IDENTIFIED: 'Identifiée', NOTIFIED: 'Notifiée',
		PAID: 'Payée', CONTESTED: 'Contestée', CLOSED: 'Clôturée'
	};
	const VIOLATION_STATUS_STYLES: Record<string, string> = {
		RECEIVED: 'bg-muted text-muted-foreground',
		IDENTIFIED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
		NOTIFIED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
		PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
		CONTESTED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
		CLOSED: 'bg-muted text-muted-foreground'
	};

	const violationsAtMyCharge = $derived(violations.filter((v) => v.paymentDecision === 'DRIVER'));
</script>

<div class="flex flex-col gap-5 px-4 pb-24 pt-3 lg:pb-8 lg:px-6 xl:px-8 2xl:px-16">

	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-xl font-black tracking-tight">Mon permis & profil</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">Gérez votre permis de conduire</p>
		</div>
		{#if !isLoading}
			{#if profile?.isBlocked || isExpired}
				<span class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
					<XCircleIcon class="size-3.5" />Accès bloqué
				</span>
			{:else if isExpiringSoon}
				<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
					<AlertTriangleIcon class="size-3.5" />Expire bientôt
				</span>
			{:else if profile?.licenseValidated}
				<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
					<ShieldCheckIcon class="size-3.5" />Permis validé
				</span>
			{/if}
		{/if}
	</div>

	<!-- ── Alert banners ───────────────────────────────────────────────────── -->
	{#if !isLoading}
		{#if profile?.isBlocked}
			<div class="flex items-start gap-3 rounded-2xl border-l-4 border-red-500 bg-red-50 px-4 py-4 dark:bg-red-500/10">
				<XCircleIcon class="mt-0.5 size-5 shrink-0 text-red-500" />
				<div>
					<p class="text-sm font-bold text-red-800 dark:text-red-300">Votre accès à la flotte est bloqué</p>
					{#if profile.blockReason}
						<p class="mt-0.5 text-sm text-red-700 dark:text-red-400">{profile.blockReason}</p>
					{/if}
					<p class="mt-1 text-xs text-red-600 dark:text-red-500">Contactez votre gestionnaire pour régulariser.</p>
				</div>
			</div>
		{:else if isExpired}
			<div class="flex items-start gap-3 rounded-2xl border-l-4 border-red-500 bg-red-50 px-4 py-4 dark:bg-red-500/10">
				<AlertTriangleIcon class="mt-0.5 size-5 shrink-0 text-red-500" />
				<div>
					<p class="text-sm font-bold text-red-800 dark:text-red-300">Votre permis a expiré</p>
					<p class="mt-0.5 text-sm text-red-700 dark:text-red-400">Mettez à jour vos informations ci-dessous.</p>
				</div>
			</div>
		{:else if isExpiringSoon && daysUntilExpiry !== null}
			<div class="flex items-start gap-3 rounded-2xl border-l-4 border-amber-500 bg-amber-50 px-4 py-4 dark:bg-amber-500/10">
				<AlertTriangleIcon class="mt-0.5 size-5 shrink-0 text-amber-500" />
				<div>
					<p class="text-sm font-bold text-amber-800 dark:text-amber-300">
						Permis expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? 's' : ''}
					</p>
					<p class="mt-0.5 text-sm text-amber-700 dark:text-amber-400">Renouvelez votre permis et mettez à jour vos informations.</p>
				</div>
			</div>
		{:else if !profile}
			<div class="flex items-start gap-3 rounded-2xl border-l-4 border-[var(--brand)]/50 bg-[var(--brand)]/6 px-4 py-4">
				<IdCardIcon class="mt-0.5 size-5 shrink-0 text-[var(--brand-foreground)] dark:text-[var(--brand)]" />
				<div>
					<p class="text-sm font-bold">Complétez votre profil conducteur</p>
					<p class="mt-0.5 text-sm text-muted-foreground">Renseignez votre permis pour réserver des véhicules.</p>
				</div>
			</div>
		{/if}
	{/if}

	{#if isLoading}
		<div class="flex flex-col gap-4">
			<Skeleton class="h-10 w-72 rounded-xl" />
			<Skeleton class="h-[180px] w-full rounded-3xl" />
			<Skeleton class="h-64 w-full rounded-3xl" />
		</div>
	{:else}
		<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v)}>

			<!-- ── Tabs strip ─────────────────────────────────────────────────── -->
			<Tabs.List class="self-start">
				<Tabs.Trigger value="license" class="gap-1.5">
					<IdCardIcon class="size-3.5 shrink-0" />
					Permis
				</Tabs.Trigger>
				<Tabs.Trigger value="restrictions" class="gap-1.5">
					<ShieldAlertIcon class="size-3.5 shrink-0" />
					Restrictions
					{#if restrictions.length > 0}
						<Badge variant="ghost" class="px-1.5 py-0">{restrictions.length}</Badge>
					{/if}
				</Tabs.Trigger>
				<Tabs.Trigger value="violations" class="gap-1.5">
					<ReceiptIcon class="size-3.5 shrink-0" />
					Contraventions
					{#if violationsAtMyCharge.length > 0}
						<Badge variant="ghost" class="px-1.5 py-0 text-destructive">{violationsAtMyCharge.length}</Badge>
					{/if}
				</Tabs.Trigger>
			</Tabs.List>

			<!-- ══════════════════════════════════════════════════════════════ -->
			<!-- Tab: Permis -->
			<!-- ══════════════════════════════════════════════════════════════ -->
			<Tabs.Content value="license" class="mt-5 flex flex-col gap-5">

				<!-- License card -->
				{#if profile?.licenseNumber}
					{@const validated = profile.licenseValidated}
					{@const blocked   = profile.isBlocked || isExpired}
					<Card.Root>
						<Card.Content class="pt-5">
							<!-- Header row -->
							<div class="mb-4 flex items-start justify-between gap-3">
								<div>
									<p class="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Permis de conduire</p>
									<p class="mt-0.5 text-xs text-muted-foreground/60">République Française</p>
								</div>
								{#if blocked}
									<Badge variant="destructive">
										<XCircleIcon />Bloqué
									</Badge>
								{:else if isExpiringSoon}
									<Badge variant="warning">
										<AlertTriangleIcon />Expire bientôt
									</Badge>
								{:else if validated}
									<Badge variant="success">
										<ShieldCheckIcon />Validé
									</Badge>
								{:else}
									<Badge variant="ghost">En attente</Badge>
								{/if}
							</div>

							<!-- License number -->
							<p class="font-mono text-2xl font-black tracking-[0.1em] sm:text-3xl">
								{profile.licenseNumber}
							</p>

							<!-- Categories -->
							{#if (profile.licenseCategories ?? []).length > 0}
								<div class="mt-3 flex flex-wrap gap-1.5">
									{#each (profile.licenseCategories ?? []) as cat}
										<Badge variant="secondary" class="font-black">{cat}</Badge>
									{/each}
								</div>
							{/if}

							<!-- Dates -->
							{#if profile.licenseIssuedDate || profile.licenseExpiryDate}
								<div class="mt-4 flex items-center gap-6 border-t border-border/50 pt-4">
									{#if profile.licenseIssuedDate}
										<div>
											<p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Délivré</p>
											<p class="mt-0.5 text-sm font-semibold">{formatDate(profile.licenseIssuedDate)}</p>
										</div>
									{/if}
									{#if profile.licenseExpiryDate}
										<div>
											<p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expire</p>
											<p class="mt-0.5 text-sm font-semibold {isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : isExpired ? 'text-destructive' : ''}">
												{formatDate(profile.licenseExpiryDate)}
												{#if daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30}
													<span class="ml-1.5 text-[10px] text-amber-500">({daysUntilExpiry}j)</span>
												{/if}
											</p>
										</div>
									{/if}
									<div class="ml-auto">
										<IdCardIcon class="size-5 text-muted-foreground/20" />
									</div>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Validation status alert -->
				{#if profile?.licenseValidated}
					<Alert.Root class="border-emerald-500/40">
						<ShieldCheckIcon class="text-emerald-600 dark:text-emerald-400" />
						<Alert.Title class="text-emerald-800 dark:text-emerald-300">Permis validé par votre gestionnaire</Alert.Title>
						{#if profile.licenseValidatedAt}
							<Alert.Description>Le {formatTs(profile.licenseValidatedAt)}</Alert.Description>
						{/if}
					</Alert.Root>
				{:else if profile?.licenseNumber}
					<Alert.Root class="border-amber-500/40">
						<AlertTriangleIcon class="text-amber-600 dark:text-amber-400" />
						<Alert.Title class="text-amber-800 dark:text-amber-300">En attente de validation</Alert.Title>
						<Alert.Description>Votre gestionnaire devra valider votre permis avant que vous puissiez réserver.</Alert.Description>
					</Alert.Root>
				{/if}

				<!-- License info form -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Informations du permis</Card.Title>
						<Card.Description>Toute modification requiert une nouvelle validation.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<Field.Group>
							<Field.Field>
								<Field.Label for="license-number">Numéro de permis</Field.Label>
								<Input
									id="license-number"
									type="text"
									bind:value={licenseNumber}
									placeholder="Ex : 12AB34567"
								/>
							</Field.Field>

							<Field.Field>
								<Field.Label for="issued-date">Date de délivrance</Field.Label>
								<Input
									id="issued-date"
									type="date"
									bind:value={licenseIssuedDate}
									class="dark:[color-scheme:dark]"
								/>
							</Field.Field>

							<Field.Field>
								<Field.Label for="expiry-date">Date d'expiration</Field.Label>
								<Input
									id="expiry-date"
									type="date"
									bind:value={licenseExpiryDate}
									class="dark:[color-scheme:dark]"
								/>
							</Field.Field>

							<Field.Field>
								<Field.Label>Catégories</Field.Label>
								<div class="flex flex-wrap gap-2 pt-1">
									{#each ALL_CATEGORIES as cat}
										<button
											type="button"
											class="rounded-xl px-4 py-2 text-sm font-bold transition-all duration-150
												{selectedCategories.has(cat)
													? 'bg-[var(--brand)] text-[var(--brand-foreground)] shadow-sm ring-1 ring-inset ring-white/20'
													: 'bg-muted text-muted-foreground hover:bg-muted/70'}"
											onclick={() => toggleCategory(cat)}
										>
											{cat}
										</button>
									{/each}
								</div>
							</Field.Field>
						</Field.Group>
					</Card.Content>
				</Card.Root>

				<!-- License photos -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Photos du permis</Card.Title>
						<Card.Description>Recto et verso de votre permis de conduire.</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-2 gap-3">
							<div class="flex flex-col gap-2">
								<p class="text-sm font-semibold">Recto</p>
								<LicenseUpload
									label="Recto"
									currentStorageId={frontStorageId}
									onUpload={(id) => (frontStorageId = id)}
								/>
							</div>
							<div class="flex flex-col gap-2">
								<p class="text-sm font-semibold">Verso</p>
								<LicenseUpload
									label="Verso"
									currentStorageId={backStorageId}
									onUpload={(id) => (backStorageId = id)}
								/>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Button onclick={handleSave} loading={saving} size="lg" class="w-full">
					Enregistrer les modifications
				</Button>

				<!-- Formations -->
				{#if profile?.formations?.length}
					<Card.Root>
						<Card.Header>
							<Card.Title>Formations & certifications</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-3">
							{#each profile.formations as f}
								<div class="rounded-xl bg-muted/40 px-4 py-3">
									<p class="text-sm font-semibold">{f.type}</p>
									<p class="mt-0.5 text-xs text-muted-foreground">
										Obtenu le {formatDate(f.obtainedDate)}
										{#if f.expiryDate} · Expire le {formatDate(f.expiryDate)}{/if}
									</p>
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{/if}
			</Tabs.Content>

			<!-- ══════════════════════════════════════════════════════════════ -->
			<!-- Tab: Restrictions -->
			<!-- ══════════════════════════════════════════════════════════════ -->
			<Tabs.Content value="restrictions" class="mt-5">
				{#if restrictionsQuery.isLoading}
					<div class="flex flex-col gap-3">
						{#each Array(3) as _, i (i)}
							<Skeleton class="h-16 w-full rounded-2xl" />
						{/each}
					</div>
				{:else if restrictions.length === 0}
					<div class="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-muted/15 py-16 text-center">
						<div class="flex size-14 items-center justify-center rounded-2xl bg-muted">
							<ShieldCheckIcon class="size-7 text-emerald-500/60" />
						</div>
						<div>
							<p class="text-base font-bold">Aucune restriction</p>
							<p class="mt-1 text-sm text-muted-foreground">Vous n'avez aucune restriction de conduite active.</p>
						</div>
					</div>
				{:else}
					<div class="flex flex-col gap-2">
						{#each restrictions as r}
							<div class="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border/50 shadow-glass-card">
								<RestrictionBadge type={r.type} value={r.value} />
								{#if r.reason}
									<p class="text-sm text-muted-foreground">{r.reason}</p>
								{/if}
							</div>
						{/each}
						<p class="mt-2 px-1 text-xs text-muted-foreground">
							Restrictions ajoutées par votre gestionnaire. Contactez-le pour toute question.
						</p>
					</div>
				{/if}
			</Tabs.Content>

			<!-- ══════════════════════════════════════════════════════════════ -->
			<!-- Tab: Contraventions -->
			<!-- ══════════════════════════════════════════════════════════════ -->
			<Tabs.Content value="violations" class="mt-5">
				<div class="flex flex-col gap-4">
					{#if violationsAtMyCharge.length > 0}
						<div class="flex items-start gap-3 rounded-2xl border-l-4 border-red-500 bg-red-50 px-4 py-3.5 dark:bg-red-500/10">
							<ReceiptIcon class="mt-0.5 size-5 shrink-0 text-red-500" />
							<p class="text-sm font-semibold text-red-800 dark:text-red-300">
								{violationsAtMyCharge.length} contravention{violationsAtMyCharge.length > 1 ? 's' : ''} à votre charge.
								Contactez votre gestionnaire pour toute question.
							</p>
						</div>
					{/if}

					{#if violationsQuery.isLoading}
						<div class="flex flex-col gap-3">
							{#each Array(3) as _, i (i)}
								<Skeleton class="h-20 w-full rounded-2xl" />
							{/each}
						</div>
					{:else if violations.length === 0}
						<div class="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-muted/15 py-16 text-center">
							<div class="flex size-14 items-center justify-center rounded-2xl bg-muted">
								<ReceiptIcon class="size-7 text-muted-foreground/40" />
							</div>
							<div>
								<p class="text-base font-bold">Aucune contravention</p>
								<p class="mt-1 text-sm text-muted-foreground">Aucune contravention enregistrée en votre nom.</p>
							</div>
						</div>
					{:else}
						<div class="flex flex-col gap-3">
							{#each violations as v}
								<Card.Root size="sm">
									<Card.Content class="px-4 py-3.5">
										<div class="flex items-start justify-between gap-3">
											<div class="min-w-0 flex-1">
												<div class="flex flex-wrap items-center gap-2">
													<span class="text-sm font-bold">{formatTs(v.violationDate)}</span>
													{#if v.vehicle}
														<span class="text-sm text-muted-foreground">{v.vehicle.brand} {v.vehicle.model}</span>
														<span class="font-mono text-xs text-muted-foreground/60">{v.vehicle.registration}</span>
													{/if}
												</div>
												<div class="mt-2 flex flex-wrap items-center gap-2">
													<span class="text-lg font-black tabular-nums">{v.amount}€</span>
													{#if v.paymentDecision === 'DRIVER'}
														<span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
															À votre charge
														</span>
													{:else if v.paymentDecision === 'COMPANY'}
														<span class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
															Pris en charge
														</span>
													{:else}
														<span class="text-xs text-muted-foreground">Décision en attente</span>
													{/if}
												</div>
											</div>
											<span class="mt-0.5 shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold {VIOLATION_STATUS_STYLES[v.status] ?? 'bg-muted text-muted-foreground'}">
												{VIOLATION_STATUS_LABELS[v.status] ?? v.status}
											</span>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					{/if}

					<p class="px-1 text-xs text-muted-foreground">
						Toutes les contraventions identifiées à votre nom, quelle que soit la décision de prise en charge.
					</p>
				</div>
			</Tabs.Content>

		</Tabs.Root>
	{/if}

</div>
