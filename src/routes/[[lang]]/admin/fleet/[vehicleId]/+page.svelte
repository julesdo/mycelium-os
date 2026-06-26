<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import VehicleStatusBadge from '$lib/components/fleet/VehicleStatusBadge.svelte';
	import VehicleForm from '$lib/components/fleet/VehicleForm.svelte';
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { goto, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CarIcon from '@lucide/svelte/icons/car';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import UnlinkIcon from '@lucide/svelte/icons/unlink';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import BatteryChargingIcon from '@lucide/svelte/icons/battery-charging';
	import GaugeIcon from '@lucide/svelte/icons/gauge';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';

	type Status = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';

	const lang = $derived(page.params.lang as string | undefined);

	const client = useConvexClient();

	const vehicleQuery = useQuery((api as any).vehicles.getVehicle, {
		vehicleId: page.params.vehicleId
	});

	let showEditDialog = $state(false);
	let isChangingStatus = $state(false);

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	function goToFleet() {
		goto(resolve(localHref('/admin/fleet')));
	}

	function formatDate(iso: string | undefined): string {
		if (!iso) return '—';
		const d = new Date(iso);
		if (isNaN(d.getTime())) return '—';
		return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
	}

	function formatCreatedAt(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});
	}

	const energyLabel: Record<string, string> = {
		THERMAL: 'Thermique',
		HYBRID: 'Hybride',
		ELECTRIC: 'Electrique'
	};

	const categoryLabel: Record<string, string> = {
		PASSENGER: 'Tourisme',
		UTILITY: 'Utilitaire',
		TRUCK: 'Camion'
	};

	function availableStatuses(current: Status): { value: Status; label: string }[] {
		const all: { value: Status; label: string }[] = [
			{ value: 'AVAILABLE', label: 'Disponible' },
			{ value: 'MAINTENANCE', label: 'En maintenance' },
			{ value: 'RETIRED', label: 'Retire' }
		];
		return all.filter((s) => s.value !== current);
	}

	async function changeStatus(newStatus: Status) {
		if (!vehicleQuery.data) return;
		isChangingStatus = true;
		try {
			await client.mutation((api as any).vehicles.updateVehicle, {
				vehicleId: vehicleQuery.data._id,
				status: newStatus
			});
			toast.success('Statut mis a jour');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			isChangingStatus = false;
		}
	}

	function onEditSuccess() {
		showEditDialog = false;
		toast.success('Modifications enregistrees');
	}

	// ─── Télématique Smartcar ─────────────────────────────────────────────────────

	const anyApi = api as any;

	// Résultat OAuth transmis via query param après redirection.
	// On lit depuis l'URL initiale une seule fois pour éviter une boucle réactive
	// si goto() / replaceState() met à jour page.url de façon asynchrone.
	const smartcarResult = page.url.searchParams.get('smartcar');

	$effect(() => {
		if (!smartcarResult) return;
		if (smartcarResult === 'connected') {
			toast.success('Télématique connectée !');
		} else if (smartcarResult === 'no_match') {
			toast.error(
				'VIN non trouvé dans Smartcar — vérifiez que le conducteur a bien autorisé son véhicule.'
			);
		} else if (smartcarResult === 'already_linked') {
			toast.error('Ce véhicule est déjà connecté à une autre organisation.');
		} else if (smartcarResult === 'no_vin') {
			toast.error("Ce véhicule n'a pas de VIN renseigné — ajoutez-le dans l'onglet Informations.");
		} else if (smartcarResult === 'error') {
			toast.error('Erreur lors de la connexion Smartcar. Réessayez.');
		}
		// Nettoyer l'URL via goto pour passer par le pipeline de navigation SvelteKit
		// et garantir la mise à jour synchrone de page.url (replaceState seul cause
		// une boucle avec les runes Svelte 5 + $app/state).
		goto(page.url.pathname, { replaceState: true, noScroll: true, keepFocus: true });
	});

	let unlinking = $state(false);
	let syncing = $state(false);

	async function handleUnlink() {
		if (!vehicleQuery.data) return;
		unlinking = true;
		try {
			await client.mutation(anyApi.smartcar.unlinkVehicleFromSmartcar, {
				vehicleId: vehicleQuery.data._id
			});
			toast.success('Télématique déconnectée');
		} catch {
			toast.error('Erreur lors de la déconnexion');
		} finally {
			unlinking = false;
		}
	}

	async function handleSync() {
		if (!vehicleQuery.data) return;
		syncing = true;
		try {
			await client.mutation(anyApi.smartcar.scheduleSyncForVehicle, {
				vehicleId: vehicleQuery.data._id
			});
			toast.success('Synchronisation en cours…');
		} catch {
			toast.error('Erreur lors de la synchronisation');
		} finally {
			syncing = false;
		}
	}

	function formatSync(ts: number) {
		return new Date(ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
	}
</script>

<div class="flex flex-col gap-6 px-4 lg:px-6 xl:px-8 2xl:px-16">
	{#if vehicleQuery.isLoading}
		<!-- Loading skeleton -->
		<div class="flex flex-col gap-6">
			<div class="flex items-center gap-3">
				<Skeleton class="size-8 rounded" />
				<Skeleton class="h-8 w-48" />
				<Skeleton class="h-5 w-20 rounded-full" />
			</div>
			<Skeleton class="h-64 w-full rounded-lg" />
		</div>
	{:else if !vehicleQuery.data}
		<EmptyState
			title="Véhicule introuvable"
			description="Ce véhicule n'existe pas ou vous n'y avez pas accès."
		>
			{#snippet icon()}<CarIcon class="size-12" />{/snippet}
			{#snippet action()}
				<Button onclick={goToFleet}>Retour à la flotte</Button>
			{/snippet}
		</EmptyState>
	{:else}
		{@const vehicle = vehicleQuery.data}

		<!-- Header -->
		<div class="flex items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="icon-sm" onclick={goToFleet} aria-label="Retour a la flotte">
					<ArrowLeftIcon class="size-4" />
				</Button>
				<div class="flex flex-col gap-0.5">
					<div class="flex items-center gap-2.5">
						<h1 class="font-mono text-lg font-bold tracking-wider">{vehicle.registration}</h1>
						<VehicleStatusBadge status={vehicle.status} />
					</div>
					<p class="text-sm text-muted-foreground">
						{vehicle.brand}
						{vehicle.model}
						&middot;
						{vehicle.year}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<!-- Changer statut -->
				{#if vehicle.status !== 'IN_USE'}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button
									variant="outline"
									size="sm"
									class="gap-1.5"
									disabled={isChangingStatus}
									{...props}
								>
									{#if isChangingStatus}
										<LoaderCircleIcon class="size-3.5 motion-safe:animate-spin" />
									{/if}
									Changer statut
									<ChevronDownIcon class="size-3.5" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-44">
							{#each availableStatuses(vehicle.status) as s (s.value)}
								<DropdownMenu.Item onclick={() => changeStatus(s.value)}>
									{s.label}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}

				<!-- Modifier -->
				<Dialog.Root bind:open={showEditDialog}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button size="sm" class="gap-1.5" {...props}>
								<PencilIcon class="size-3.5" />
								Modifier
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Portal>
						<Dialog.Overlay />
						<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto">
							<Dialog.Header>
								<Dialog.Title>Modifier le vehicule</Dialog.Title>
							</Dialog.Header>
							<VehicleForm
								mode="edit"
								initial={vehicle}
								onSuccess={onEditSuccess}
								onCancel={() => (showEditDialog = false)}
							/>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			</div>
		</div>

		<!-- Tabs -->
		<Tabs.Root value="info">
			<Tabs.List variant="line">
				<Tabs.Trigger value="info">Informations</Tabs.Trigger>
				<Tabs.Trigger value="telematics">Télématique</Tabs.Trigger>
				<Tabs.Trigger value="history">Historique</Tabs.Trigger>
			</Tabs.List>

			<!-- Onglet Informations -->
			<Tabs.Content value="info" class="mt-4">
				<div class="flex flex-col gap-6">
					<!-- Identite -->
					<Card.Root>
						<Card.Header>
							<Card.Title
								class="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
							>
								Identite
							</Card.Title>
						</Card.Header>
						<Card.Content class="pt-0">
							<dl class="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Immatriculation</dt>
									<dd class="font-mono text-sm font-medium">{vehicle.registration}</dd>
								</div>
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Marque</dt>
									<dd class="text-sm">{vehicle.brand}</dd>
								</div>
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Modele</dt>
									<dd class="text-sm">{vehicle.model}</dd>
								</div>
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Annee</dt>
									<dd class="text-sm">{vehicle.year}</dd>
								</div>
								{#if (vehicle as { vin?: string }).vin}
									<div class="col-span-2 flex flex-col gap-0.5">
										<dt class="text-xs text-muted-foreground">VIN</dt>
										<dd class="font-mono text-sm tracking-wider">
											{(vehicle as { vin?: string }).vin}
										</dd>
									</div>
								{/if}
							</dl>
						</Card.Content>
					</Card.Root>

					<!-- Caracteristiques -->
					<Card.Root>
						<Card.Header>
							<Card.Title
								class="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
							>
								Caracteristiques
							</Card.Title>
						</Card.Header>
						<Card.Content class="pt-0">
							<dl class="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Energie</dt>
									<dd class="text-sm">{energyLabel[vehicle.energy] ?? vehicle.energy}</dd>
								</div>
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Categorie</dt>
									<dd class="text-sm">{categoryLabel[vehicle.category] ?? vehicle.category}</dd>
								</div>
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Kilometrage</dt>
									<dd class="text-sm tabular-nums">
										{vehicle.kilometers != null
											? vehicle.kilometers.toLocaleString('fr-FR') + ' km'
											: '—'}
									</dd>
								</div>
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Date d'achat</dt>
									<dd class="text-sm">{formatDate(vehicle.purchaseDate)}</dd>
								</div>
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Fin de leasing</dt>
									<dd class="text-sm">{formatDate(vehicle.leaseEndDate)}</dd>
								</div>
							</dl>
						</Card.Content>
					</Card.Root>

					<!-- Localisation & Notes -->
					<Card.Root>
						<Card.Header>
							<Card.Title
								class="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
							>
								Localisation & Notes
							</Card.Title>
						</Card.Header>
						<Card.Content class="pt-0">
							<dl class="flex flex-col gap-4">
								<div class="flex flex-col gap-0.5">
									<dt class="text-xs text-muted-foreground">Site</dt>
									<dd class="text-sm">{vehicle.location ?? '—'}</dd>
								</div>
								{#if vehicle.notes}
									<div class="flex flex-col gap-0.5">
										<dt class="text-xs text-muted-foreground">Notes</dt>
										<dd class="text-sm whitespace-pre-line text-muted-foreground">
											{vehicle.notes}
										</dd>
									</div>
								{/if}
							</dl>
						</Card.Content>
					</Card.Root>

					<!-- Metadonnees -->
					<div class="flex items-center gap-6 text-xs text-muted-foreground">
						<span>Ajoute le {formatCreatedAt(vehicle.createdAt)}</span>
						<span class="flex items-center gap-1.5">
							Statut actuel : <VehicleStatusBadge status={vehicle.status} />
						</span>
					</div>
				</div>
			</Tabs.Content>

			<!-- Onglet Télématique -->
			<Tabs.Content value="telematics" class="mt-4">
				{@const vehicleId = vehicle._id}

				{#if !vehicle.vin}
					<!-- État A — pas de VIN renseigné -->
					<Card.Root class="border-border/50">
						<Card.Content class="flex items-start gap-4 p-5">
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40"
							>
								<CarIcon class="h-4 w-4 text-muted-foreground/60" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium">VIN manquant</p>
								<p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
									Le VIN (numéro d'identification du véhicule) est requis pour activer la connexion
									Smartcar. Ajoutez-le dans l'onglet Informations.
								</p>
								<div class="mt-3">
									<Button
										size="sm"
										variant="outline"
										class="h-7 gap-1.5 text-xs"
										onclick={() => (showEditDialog = true)}
									>
										<PencilIcon class="h-3 w-3" />
										Modifier la fiche
									</Button>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{:else if !vehicle.smartcarVehicleId}
					<!-- État B — VIN renseigné, pas encore connecté à Smartcar -->
					<Card.Root class="border-blue-500/20 bg-blue-500/5">
						<Card.Header class="pb-3">
							<Card.Title
								class="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase"
							>
								<WifiIcon class="h-3.5 w-3.5 text-blue-500" />
								Télématique Smartcar
								<span
									class="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal tracking-normal text-muted-foreground normal-case"
								>
									Non connecté
								</span>
							</Card.Title>
							<p class="mt-1 font-mono text-[10px] text-muted-foreground/60">VIN : {vehicle.vin}</p>
						</Card.Header>
						<Card.Content class="space-y-3 pt-0">
							<p class="text-xs leading-relaxed text-muted-foreground">
								Connectez ce véhicule à Smartcar pour synchroniser automatiquement l'odomètre, le
								niveau de batterie (VE/PHEV) et la position GPS. Aucun hardware requis.
							</p>
							<div>
								<a href="/api/smartcar/vehicle/start?vehicleId={vehicleId}" data-sveltekit-reload>
									<Button size="sm" class="h-8 gap-1.5 text-xs">
										<WifiIcon class="h-3 w-3" />
										Connecter via Smartcar
									</Button>
								</a>
								<p class="mt-2 text-[11px] text-muted-foreground/70">
									Vous serez redirigé vers Smartcar Connect pour authentifier ce véhicule auprès du
									constructeur.
								</p>
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<!-- État C — connecté, affichage télémétrie -->
					<Card.Root class="border-blue-500/20 bg-blue-500/5">
						<Card.Header class="pb-3">
							<div class="flex items-center justify-between gap-3">
								<Card.Title
									class="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase"
								>
									<WifiIcon class="h-3.5 w-3.5 text-blue-500" />
									Télématique Smartcar
									<span
										class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium tracking-normal text-emerald-600 normal-case dark:text-emerald-400"
									>
										<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
										Connecté
									</span>
								</Card.Title>
								<div class="flex items-center gap-1.5">
									{#if vehicle.smartcarLastSync}
										<span class="text-[10px] text-muted-foreground/60">
											sync {formatSync(vehicle.smartcarLastSync)}
										</span>
									{/if}
									<Button
										size="sm"
										variant="ghost"
										class="h-6 w-6 p-0 text-muted-foreground"
										disabled={syncing}
										onclick={handleSync}
										title="Synchroniser maintenant"
									>
										<RefreshCwIcon
											class={['h-3 w-3', syncing ? 'motion-safe:animate-spin' : ''].join(' ')}
										/>
									</Button>
									<Button
										size="sm"
										variant="ghost"
										class="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
										disabled={unlinking}
										onclick={handleUnlink}
									>
										<UnlinkIcon class="mr-1 h-3 w-3" />
										Délier
									</Button>
								</div>
							</div>
						</Card.Header>
						<Card.Content class="space-y-4 pt-0">
							<!-- Bannière succès post-connexion -->
							{#if smartcarResult === 'connected'}
								<div
									class="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
								>
									<CheckCircle2Icon class="h-4 w-4 shrink-0 text-emerald-500" />
									<p class="text-sm">
										<span class="font-medium">Félicitations !</span>
										<span class="ml-1 text-muted-foreground"
											>La télématique est bien connectée. Les données se synchronisent
											automatiquement.</span
										>
									</p>
								</div>
							{/if}

							<dl class="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
								{#if vehicle.smartcarOdometer != null}
									<div class="flex flex-col gap-1">
										<dt class="flex items-center gap-1 text-xs text-muted-foreground">
											<GaugeIcon class="h-3 w-3" />
											Odomètre
										</dt>
										<dd class="text-sm font-semibold tabular-nums">
											{vehicle.smartcarOdometer.toLocaleString('fr-FR')} km
										</dd>
									</div>
								{/if}

								{#if vehicle.smartcarBatteryPercent != null}
									<div class="flex flex-col gap-1">
										<dt class="flex items-center gap-1 text-xs text-muted-foreground">
											<BatteryChargingIcon class="h-3 w-3" />
											Batterie
										</dt>
										<dd class="flex items-center gap-1.5 text-sm font-semibold">
											<span
												class={vehicle.smartcarBatteryPercent < 20
													? 'text-destructive'
													: 'text-emerald-600 dark:text-emerald-400'}
											>
												{vehicle.smartcarBatteryPercent}%
											</span>
											{#if vehicle.smartcarBatteryRange != null}
												<span class="text-xs font-normal text-muted-foreground"
													>({vehicle.smartcarBatteryRange} km)</span
												>
											{/if}
										</dd>
									</div>
								{/if}

								{#if vehicle.smartcarLatitude != null && vehicle.smartcarLongitude != null}
									<div class="col-span-2 flex flex-col gap-1">
										<dt class="flex items-center gap-1 text-xs text-muted-foreground">
											<MapPinIcon class="h-3 w-3" />
											Dernière position
										</dt>
										<dd>
											<a
												href="https://www.openstreetmap.org/?mlat={vehicle.smartcarLatitude}&mlon={vehicle.smartcarLongitude}&zoom=15"
												target="_blank"
												rel="noopener noreferrer"
												class="text-sm text-muted-foreground tabular-nums underline-offset-2 transition-colors hover:text-foreground hover:underline"
											>
												{vehicle.smartcarLatitude.toFixed(5)}, {vehicle.smartcarLongitude.toFixed(
													5
												)}
											</a>
										</dd>
									</div>
								{/if}

								{#if vehicle.smartcarOdometer == null && vehicle.smartcarBatteryPercent == null}
									<div class="col-span-4 text-xs text-muted-foreground">
										Synchronisation initiale en cours…
									</div>
								{/if}
							</dl>
						</Card.Content>
					</Card.Root>
				{/if}
			</Tabs.Content>

			<!-- Onglet Historique -->
			<Tabs.Content value="history" class="mt-4">
				<div
					class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 py-20 text-center"
				>
					<p class="text-sm font-medium">Historique des reservations</p>
					<p class="max-w-xs text-xs text-muted-foreground">
						L'historique des reservations sera disponible en S5, apres l'implementation du module de
						calendrier et de gestion des reservations.
					</p>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	{/if}
</div>
