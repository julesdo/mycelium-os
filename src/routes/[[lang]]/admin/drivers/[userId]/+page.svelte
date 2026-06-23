<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import RestrictionBadge from '$lib/components/drivers/restriction-badge.svelte';
	import LicenseUpload from '$lib/components/drivers/license-upload.svelte';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	const lang = $derived(page.params.lang as string | undefined);
	const client = useConvexClient();

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	// ─── Reactive query args ──────────────────────────────────────────────────
	const profileArgs = $state({ targetUserId: page.params.userId });
	$effect(() => { profileArgs.targetUserId = page.params.userId; });

	const restrictionArgs = $state({ targetUserId: page.params.userId });
	$effect(() => { restrictionArgs.targetUserId = page.params.userId; });

	const reservationArgs = $state({ targetUserId: page.params.userId });
	$effect(() => { reservationArgs.targetUserId = page.params.userId; });

	// ─── Queries ──────────────────────────────────────────────────────────────
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const profileQuery = useQuery((api as any).drivers.getDriverProfile, profileArgs);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const restrictionsQuery = useQuery((api as any).drivers.getDriverRestrictions, restrictionArgs);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const reservationsQuery = useQuery((api as any).drivers.listDriverReservations, reservationArgs);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const userInfoQuery = useQuery((api as any).drivers.getDriverUserInfo, profileArgs);

	const profile = $derived(profileQuery.data ?? null);
	const restrictions = $derived(restrictionsQuery.data ?? []);
	const reservations = $derived(reservationsQuery.data ?? []);
	const userInfo = $derived(userInfoQuery.data ?? null);
	const isLoading = $derived(profileQuery.isLoading && restrictionsQuery.isLoading);

	// ─── Derived status ───────────────────────────────────────────────────────
	const now = Date.now();
	const isExpired = $derived(
		profile?.licenseExpiryDate
			? new Date(profile.licenseExpiryDate).getTime() < now
			: false
	);
	const isExpiringSoon = $derived.by(() => {
		if (!profile?.licenseExpiryDate) return false;
		const exp = new Date(profile.licenseExpiryDate).getTime();
		return exp > now && exp - now < 30 * 24 * 60 * 60 * 1000;
	});

	// ─── Form state (profile tab) ─────────────────────────────────────────────
	type LicenseCategory = 'B' | 'BE' | 'C' | 'CE' | 'D';
	const ALL_CATEGORIES: LicenseCategory[] = ['B', 'BE', 'C', 'CE', 'D'];

	let licenseNumber = $state(untrack(() => profile?.licenseNumber ?? ''));
	let licenseIssuedDate = $state(untrack(() => profile?.licenseIssuedDate ?? ''));
	let licenseExpiryDate = $state(untrack(() => profile?.licenseExpiryDate ?? ''));
	let profileNotes = $state(untrack(() => profile?.notes ?? ''));
	let selectedCategories = $state<Set<LicenseCategory>>(
		new Set(untrack(() => (profile?.licenseCategories ?? []) as LicenseCategory[]))
	);
	let frontStorageId = $state(untrack(() => profile?.licenseFrontStorageId));
	let backStorageId = $state(untrack(() => profile?.licenseBackStorageId));

	// Sync form when profile loads for the first time
	$effect(() => {
		if (profile && !licenseNumber && !licenseExpiryDate) {
			licenseNumber = profile.licenseNumber ?? '';
			licenseIssuedDate = profile.licenseIssuedDate ?? '';
			licenseExpiryDate = profile.licenseExpiryDate ?? '';
			profileNotes = profile.notes ?? '';
			selectedCategories = new Set((profile.licenseCategories ?? []) as LicenseCategory[]);
			frontStorageId = profile.licenseFrontStorageId;
			backStorageId = profile.licenseBackStorageId;
		}
	});

	let saving = $state(false);
	let validating = $state(false);

	// ─── Restriction form state ───────────────────────────────────────────────
	let showRestrictionForm = $state(false);
	type RestrictionType = 'NO_LONG_DISTANCE' | 'NO_UTILITY' | 'NO_TRUCK' | 'MAX_KM_PER_MONTH' | 'SITE_ONLY';
	let newRestrictionType = $state<RestrictionType>('NO_UTILITY');
	let newRestrictionValue = $state('');
	let newRestrictionReason = $state('');
	let addingRestriction = $state(false);

	const RESTRICTION_LABELS: Record<RestrictionType, string> = {
		NO_LONG_DISTANCE: "Pas de long trajet",
		NO_UTILITY: "Pas d'utilitaire",
		NO_TRUCK: 'Pas de camion',
		MAX_KM_PER_MONTH: 'Km max/mois',
		SITE_ONLY: 'Site limité'
	};

	const STATUS_LABELS: Record<string, string> = {
		PENDING: 'En attente',
		CONFIRMED: 'Confirmée',
		IN_PROGRESS: 'En cours',
		COMPLETED: 'Terminée',
		CANCELLED: 'Annulée'
	};

	const STATUS_STYLES: Record<string, string> = {
		PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
		CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
		IN_PROGRESS: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
		COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
		CANCELLED: 'bg-muted text-muted-foreground'
	};

	function toggleCategory(cat: LicenseCategory) {
		const next = new Set(selectedCategories);
		if (next.has(cat)) next.delete(cat);
		else next.add(cat);
		selectedCategories = next;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatTs(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// ─── Actions ──────────────────────────────────────────────────────────────
	async function handleSaveProfile() {
		saving = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).drivers.upsertDriverProfile, {
				targetUserId: page.params.userId,
				licenseNumber: licenseNumber || undefined,
				licenseCategories: selectedCategories.size > 0 ? [...selectedCategories] : undefined,
				licenseIssuedDate: licenseIssuedDate || undefined,
				licenseExpiryDate: licenseExpiryDate || undefined,
				licenseFrontStorageId: frontStorageId,
				licenseBackStorageId: backStorageId,
				notes: profileNotes || undefined
			});
			toast.success('Profil mis à jour');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			saving = false;
		}
	}

	async function handleValidateLicense() {
		validating = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).drivers.validateDriverLicense, {
				targetUserId: page.params.userId
			});
			toast.success('Permis validé');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la validation');
		} finally {
			validating = false;
		}
	}

	async function handleAddRestriction() {
		addingRestriction = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).drivers.addDriverRestriction, {
				targetUserId: page.params.userId,
				type: newRestrictionType,
				value: newRestrictionValue || undefined,
				reason: newRestrictionReason || undefined
			});
			toast.success('Restriction ajoutée');
			showRestrictionForm = false;
			newRestrictionValue = '';
			newRestrictionReason = '';
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			addingRestriction = false;
		}
	}

	async function handleRemoveRestriction(restrictionId: string) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).drivers.removeDriverRestriction, {
				restrictionId: restrictionId as any // eslint-disable-line @typescript-eslint/no-explicit-any
			});
			toast.success('Restriction supprimée');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		}
	}
</script>

<div class="flex flex-col gap-6 px-4 pb-8 lg:px-6 xl:px-8 2xl:px-16">
	{#if isLoading}
		<div class="flex flex-col gap-6">
			<div class="flex items-center gap-3">
				<Skeleton class="size-8 rounded" />
				<Skeleton class="h-6 w-48" />
				<Skeleton class="h-5 w-20 rounded-full" />
			</div>
			<Skeleton class="h-10 w-64 rounded-xl" />
			<Skeleton class="h-64 w-full rounded-xl" />
		</div>
	{:else}
		<!-- Header -->
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => goto(resolve(localHref('/admin/drivers')))}
					aria-label="Retour aux conducteurs"
				>
					<ArrowLeftIcon class="size-4" />
				</Button>

				{#if userInfo?.image}
					<img src={userInfo.image} alt="" class="size-10 rounded-full object-cover shrink-0" />
				{:else}
					<div class="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
						<span class="text-sm font-semibold text-muted-foreground">
							{(userInfo?.name ?? userInfo?.email ?? '?')[0].toUpperCase()}
						</span>
					</div>
				{/if}

				<div class="flex flex-col gap-0.5">
					<div class="flex items-center gap-2.5">
						<h1 class="text-base font-semibold">
							{userInfo?.name ?? userInfo?.email ?? page.params.userId.slice(-8).toUpperCase()}
						</h1>
						{#if profile?.isBlocked || isExpired}
							<Badge variant="destructive"><XCircleIcon class="size-3" />Bloqué</Badge>
						{:else if isExpiringSoon}
							<Badge variant="warning"><AlertTriangleIcon class="size-3" />Bientôt</Badge>
						{:else if profile?.licenseValidated}
							<Badge variant="success"><ShieldCheckIcon class="size-3" />Permis validé</Badge>
						{/if}
					</div>
					<p class="text-sm text-muted-foreground">
						{#if userInfo?.name && userInfo?.email}
							{userInfo.email} · {profile ? 'Profil configuré' : 'Aucun profil conducteur'}
						{:else}
							{profile ? 'Profil conducteur configuré' : 'Aucun profil conducteur'}
						{/if}
					</p>
				</div>
			</div>
		</div>

		<!-- Tabs -->
		<Tabs.Root value="profile">
			<Tabs.List>
				<Tabs.Trigger value="profile">Profil</Tabs.Trigger>
				<Tabs.Trigger value="license">Permis</Tabs.Trigger>
				<Tabs.Trigger value="formations">Formations</Tabs.Trigger>
				<Tabs.Trigger value="restrictions">
					Restrictions
					{#if restrictions.length > 0}
						<span class="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
							{restrictions.length}
						</span>
					{/if}
				</Tabs.Trigger>
				<Tabs.Trigger value="history">
					Historique
					{#if reservations.length > 0}
						<span class="ml-1.5 tabular-nums rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
							{reservations.length}
						</span>
					{/if}
				</Tabs.Trigger>
			</Tabs.List>

			<!-- ── Tab: Profil ─────────────────────────────────────────────────── -->
			<Tabs.Content value="profile" class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Informations permis</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-5">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<label for="license-number" class="text-sm font-medium">Numéro de permis</label>
								<Input id="license-number" bind:value={licenseNumber} placeholder="Ex: 12AB34567" />
							</div>
							<div class="space-y-1.5">
								<p class="text-sm font-medium">Catégories</p>
								<div class="flex flex-wrap gap-2">
									{#each ALL_CATEGORIES as cat}
										<button
											type="button"
											class="rounded-md border px-3 py-1 text-xs font-medium transition-colors
												{selectedCategories.has(cat)
													? 'border-primary bg-primary/10 text-primary'
													: 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'}"
											onclick={() => toggleCategory(cat)}
										>
											{cat}
										</button>
									{/each}
								</div>
							</div>
							<div class="space-y-1.5">
								<label for="issued-date" class="text-sm font-medium">Date de délivrance</label>
								<Input id="issued-date" type="date" bind:value={licenseIssuedDate} />
							</div>
							<div class="space-y-1.5">
								<label for="expiry-date" class="text-sm font-medium">Date d'expiration</label>
								<Input id="expiry-date" type="date" bind:value={licenseExpiryDate} />
							</div>
						</div>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<p class="text-sm font-medium">Recto du permis</p>
								<LicenseUpload
									label="Recto"
									currentStorageId={frontStorageId}
									onUpload={(id) => (frontStorageId = id)}
								/>
							</div>
							<div class="space-y-1.5">
								<p class="text-sm font-medium">Verso du permis</p>
								<LicenseUpload
									label="Verso"
									currentStorageId={backStorageId}
									onUpload={(id) => (backStorageId = id)}
								/>
							</div>
						</div>
						<div class="space-y-1.5">
							<label for="profile-notes" class="text-sm font-medium">Notes internes</label>
							<textarea
								id="profile-notes"
								bind:value={profileNotes}
								rows={3}
								placeholder="Notes visibles par les gestionnaires uniquement"
								class="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							></textarea>
						</div>
						<div class="flex justify-end">
							<Button onclick={handleSaveProfile} disabled={saving} class="gap-1.5">
								{#if saving}
									<LoaderCircleIcon class="size-3.5 animate-spin" />
								{/if}
								Enregistrer
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- ── Tab: Permis ─────────────────────────────────────────────────── -->
			<Tabs.Content value="license" class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Validation du permis</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if !profile}
							<p class="text-sm text-muted-foreground">Aucun profil conducteur configuré.</p>
						{:else}
							<div class="space-y-4">
								<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
									<div>
										<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Numéro</p>
										<p class="mt-1 text-sm font-medium">{profile.licenseNumber ?? '—'}</p>
									</div>
									<div>
										<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Catégories</p>
										<p class="mt-1 text-sm font-medium">{profile.licenseCategories?.join(', ') ?? '—'}</p>
									</div>
									<div>
										<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Délivré le</p>
										<p class="mt-1 text-sm">{profile.licenseIssuedDate ? formatDate(profile.licenseIssuedDate) : '—'}</p>
									</div>
									<div>
										<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expire le</p>
										<p class="mt-1 text-sm {isExpired ? 'font-medium text-red-600 dark:text-red-400' : isExpiringSoon ? 'font-medium text-amber-600 dark:text-amber-400' : ''}">
											{profile.licenseExpiryDate ? formatDate(profile.licenseExpiryDate) : '—'}
											{#if isExpired}<span class="ml-1 text-xs">(expiré)</span>{/if}
										</p>
									</div>
								</div>

								{#if profile.licenseValidatedAt}
									<p class="text-xs text-muted-foreground">
										Validé le {formatTs(profile.licenseValidatedAt)}
									</p>
								{/if}

								{#if !profile.licenseValidated && profile.licenseNumber}
									<div class="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
										<div class="flex-1">
											<p class="text-sm font-medium">Valider ce permis</p>
											<p class="text-xs text-muted-foreground">
												Confirmez que le permis a été contrôlé et est valide.
											</p>
										</div>
										<Button
											size="sm"
											class="gap-1.5"
											onclick={handleValidateLicense}
											disabled={validating}
										>
											{#if validating}
												<LoaderCircleIcon class="size-3.5 animate-spin" />
											{:else}
												<CheckIcon class="size-3.5" />
											{/if}
											Valider
										</Button>
									</div>
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- ── Tab: Formations ────────────────────────────────────────────── -->
			<Tabs.Content value="formations" class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Formations & certifications</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if !profile?.formations?.length}
							<EmptyState title="Aucune formation" description="Aucune formation enregistrée pour ce conducteur.">
								{#snippet icon()}<UsersIcon class="size-10" />{/snippet}
							</EmptyState>
						{:else}
							<div class="space-y-2">
								{#each profile.formations as f}
									<div class="flex items-center justify-between rounded-lg border border-border p-3">
										<div>
											<p class="text-sm font-medium">{f.type}</p>
											<p class="text-xs text-muted-foreground">
												Obtenu le {formatDate(f.obtainedDate)}
												{#if f.expiryDate} · Expire le {formatDate(f.expiryDate)}{/if}
											</p>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- ── Tab: Restrictions ──────────────────────────────────────────── -->
			<Tabs.Content value="restrictions" class="mt-6">
				<Card.Root>
					<Card.Header class="flex-row items-center justify-between">
						<Card.Title>Restrictions de conduite</Card.Title>
						<Button
							variant="outline"
							size="sm"
							class="gap-1.5"
							onclick={() => (showRestrictionForm = !showRestrictionForm)}
						>
							<PlusIcon class="size-3.5" />
							Ajouter
						</Button>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#if showRestrictionForm}
							<div class="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
								<div class="space-y-1.5">
									<label for="restriction-type" class="text-sm font-medium">Type</label>
									<select
										id="restriction-type"
										bind:value={newRestrictionType}
										class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									>
										{#each Object.entries(RESTRICTION_LABELS) as [key, label]}
											<option value={key}>{label}</option>
										{/each}
									</select>
								</div>
								{#if newRestrictionType === 'MAX_KM_PER_MONTH' || newRestrictionType === 'SITE_ONLY'}
									<div class="space-y-1.5">
										<label for="restriction-value" class="text-sm font-medium">
											{newRestrictionType === 'MAX_KM_PER_MONTH' ? 'Kilomètres max/mois' : 'Site autorisé'}
										</label>
										<Input
											id="restriction-value"
											bind:value={newRestrictionValue}
											placeholder={newRestrictionType === 'MAX_KM_PER_MONTH' ? 'Ex: 1000' : 'Ex: Paris Nord'}
										/>
									</div>
								{/if}
								<div class="space-y-1.5">
									<label for="restriction-reason" class="text-sm font-medium">Raison (optionnel)</label>
									<Input
										id="restriction-reason"
										bind:value={newRestrictionReason}
										placeholder="Ex: Accord médical"
									/>
								</div>
								<div class="flex gap-2">
									<Button size="sm" onclick={handleAddRestriction} disabled={addingRestriction} class="gap-1.5">
										{#if addingRestriction}
											<LoaderCircleIcon class="size-3.5 animate-spin" />
										{/if}
										Ajouter
									</Button>
									<Button variant="ghost" size="sm" onclick={() => (showRestrictionForm = false)}>
										Annuler
									</Button>
								</div>
							</div>
						{/if}

						{#if restrictions.length === 0}
							<p class="text-sm text-muted-foreground">Aucune restriction configurée.</p>
						{:else}
							<div class="space-y-2">
								{#each restrictions as r}
									<div class="flex items-center justify-between rounded-lg border border-border p-3">
										<div class="flex items-center gap-3">
											<RestrictionBadge type={r.type} value={r.value} />
											{#if r.reason}
												<span class="text-xs text-muted-foreground">{r.reason}</span>
											{/if}
										</div>
										<Button
											variant="ghost"
											size="icon-sm"
											class="text-muted-foreground hover:text-destructive"
											onclick={() => handleRemoveRestriction(r._id)}
										>
											<Trash2Icon class="size-3.5" />
										</Button>
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- ── Tab: Historique ────────────────────────────────────────────── -->
			<Tabs.Content value="history" class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Historique des réservations</Card.Title>
					</Card.Header>
					<Card.Content class="p-0">
						{#if reservationsQuery.isLoading}
							<div class="divide-y divide-border">
								{#each Array(4) as _, i (i)}
									<div class="flex h-12 items-center gap-4 px-4">
										<Skeleton class="h-3.5 w-32" />
										<Skeleton class="h-3.5 w-24" />
										<Skeleton class="ml-auto h-5 w-20 rounded-full" />
									</div>
								{/each}
							</div>
						{:else if reservations.length === 0}
							<div class="p-6">
								<EmptyState title="Aucune réservation" description="Ce conducteur n'a pas encore de réservation.">
									{#snippet icon()}<UsersIcon class="size-10" />{/snippet}
								</EmptyState>
							</div>
						{:else}
							<table class="w-full text-sm">
								<thead>
									<tr class="border-b border-border bg-muted/40">
										<th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Période</th>
										<th class="hidden px-4 py-2.5 text-left text-xs font-medium text-muted-foreground sm:table-cell">Objet</th>
										<th class="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Statut</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									{#each reservations as r}
										<tr>
											<td class="px-4 py-3 text-xs text-muted-foreground">
												{formatTs(r.startDate)} → {formatTs(r.endDate)}
											</td>
											<td class="hidden px-4 py-3 sm:table-cell">{r.purpose}</td>
											<td class="px-4 py-3">
												<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {STATUS_STYLES[r.status] ?? 'bg-muted text-muted-foreground'}">
													{STATUS_LABELS[r.status] ?? r.status}
												</span>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	{/if}
</div>
