<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { api } from '$lib/convex/_generated/api';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import { localizedHref } from '$lib/utils/i18n';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { watch } from 'runed';
	import { getTranslate } from '@tolgee/svelte';
	import { useQuery } from '@mmailaender/convex-svelte';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CornerDownLeftIcon from '@lucide/svelte/icons/corner-down-left';
	import CarIcon from '@lucide/svelte/icons/car';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import PlusCircleIcon from '@lucide/svelte/icons/plus-circle';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import CommandMenuItem from './command-menu-item.svelte';
	import {
		SEARCH_ROUTES,
		titleizeRouteFromHref,
		type SearchRouteEntry,
		type SearchRouteGroup
	} from './search-routes';
	import { haptic } from '$lib/hooks/use-haptic.svelte';
	import { useGlobalSearchContext } from './context.svelte';

	type MenuRouteItem = SearchRouteEntry & {
		id: string;
		label: string;
		localizedUrl: string;
		value: string;
		keywords: string[];
	};

	type MenuGroup = {
		group: SearchRouteGroup;
		heading: string;
		items: MenuRouteItem[];
	};

	type EffectiveAuthState = {
		isAuthenticated: boolean;
		role: string | null;
	};

	const { t } = getTranslate();

	const globalSearch = useGlobalSearchContext();
	const auth = useAuth();
	const viewer = useQuery(api.auth.getCurrentUser, {});

	let lastStableAuth = $state<EffectiveAuthState>({
		isAuthenticated: auth.isAuthenticated,
		role: auth.isAuthenticated ? (viewer.data?.role ?? null) : null
	});

	// Only update stable auth snapshot when auth finishes loading
	watch(
		() => ({
			isLoading: auth.isLoading,
			isAuthenticated: auth.isAuthenticated,
			role: viewer.data?.role ?? null
		}),
		({ isLoading, isAuthenticated, role }) => {
			if (isLoading) return;

			lastStableAuth = {
				isAuthenticated,
				role: isAuthenticated ? role : null
			};
		}
	);

	const effectiveAuth = $derived.by<EffectiveAuthState>(() => {
		if (auth.isLoading) return lastStableAuth;

		return {
			isAuthenticated: auth.isAuthenticated,
			role: auth.isAuthenticated ? (viewer.data?.role ?? null) : null
		};
	});

	let searchValue = $state('');

	const vehiclesQuery = useQuery(api.vehicles.listVehicles, {});
	const recentReservationsQuery = useQuery(api.reservations.getRecentForSearch, {});

	const isAdmin = $derived(
		effectiveAuth.isAuthenticated && effectiveAuth.role?.toLowerCase() === 'admin'
	);

	const filteredVehicles = $derived.by(() => {
		if (!searchValue.trim() || !vehiclesQuery.data) return [];
		const q = searchValue.toLowerCase();
		return vehiclesQuery.data
			.filter(
				(v) =>
					v.brand.toLowerCase().includes(q) ||
					v.model.toLowerCase().includes(q) ||
					v.registration.toLowerCase().includes(q)
			)
			.slice(0, 5);
	});

	const filteredReservations = $derived.by(() => {
		if (!searchValue.trim() || !recentReservationsQuery.data) return [];
		const q = searchValue.toLowerCase();
		return recentReservationsQuery.data
			.filter(
				(r) =>
					r.purpose.toLowerCase().includes(q) ||
					r.brand.toLowerCase().includes(q) ||
					r.model.toLowerCase().includes(q)
			)
			.slice(0, 5);
	});

	const groupOrder: SearchRouteGroup[] = ['public', 'authentication', 'app', 'admin'];
	const groupKeyMap: Record<SearchRouteGroup, string> = {
		public: 'search.command.groups.public',
		authentication: 'search.command.groups.authentication',
		app: 'search.command.groups.app',
		admin: 'search.command.groups.admin'
	};

	function hasAccess(access: SearchRouteEntry['access']): boolean {
		if (access === 'public') return true;
		if (access === 'authenticated') return effectiveAuth.isAuthenticated;
		return effectiveAuth.isAuthenticated && effectiveAuth.role?.toLowerCase() === 'admin';
	}

	function isVisibleRoute(route: SearchRouteEntry): boolean {
		if (route.group === 'authentication' && effectiveAuth.isAuthenticated) return false;
		return hasAccess(route.access);
	}

	function isTypingTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;

		return (
			target.isContentEditable ||
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			target instanceof HTMLSelectElement
		);
	}

	function getTranslatedIfExists(key: string): string | null {
		const translated = $t(key);
		if (!translated || translated === key) return null;
		return translated;
	}

	function getRouteLabel(route: SearchRouteEntry): string {
		if (route.titleKey) {
			const title = getTranslatedIfExists(route.titleKey);
			if (title) return title;
		}

		return titleizeRouteFromHref(route.href);
	}

	const groupedRoutes = $derived.by(() => {
		const visibleRoutes = SEARCH_ROUTES.filter(isVisibleRoute);
		const menuGroups: MenuGroup[] = [];

		for (const group of groupOrder) {
			const heading = $t(groupKeyMap[group]);
			const items = visibleRoutes
				.filter((route) => route.group === group)
				.map((route) => {
					const label = getRouteLabel(route);
					const localizedUrl = localizedHref(route.href);
					const segmentKeywords = route.href.split('/').filter(Boolean);
					const keywords = [...new Set([...(route.keywords ?? []), ...segmentKeywords])];

					return {
						...route,
						id: `${group}:${route.href}`,
						label,
						localizedUrl,
						value: `${heading} ${label} ${route.href}`,
						keywords
					};
				});

			if (items.length > 0) {
				menuGroups.push({
					group,
					heading,
					items
				});
			}
		}

		return menuGroups;
	});

	function runCommand(command: () => unknown): void {
		haptic.trigger('light');
		globalSearch.closeMenu();
		command();
	}

	function openCommandMenu(): void {
		haptic.trigger('light');
		globalSearch.openMenu();
	}

	function handleKeydown(e: KeyboardEvent): void {
		if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
			if (isTypingTarget(e.target)) {
				return;
			}

			e.preventDefault();
			if (globalSearch.open) {
				globalSearch.closeMenu();
			} else {
				openCommandMenu();
			}
		}
	}
</script>

<svelte:document onkeydown={handleKeydown} />

<Dialog.Root open={globalSearch.open} onOpenChange={globalSearch.setOpen}>
	<Dialog.Content
		showCloseButton={false}
		class="rounded-xl border-none bg-popover bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-foreground/5 dark:ring-foreground/10"
	>
		<Dialog.Header class="sr-only">
			<Dialog.Title>{$t('search.command.dialog_title')}</Dialog.Title>
			<Dialog.Description>{$t('search.command.dialog_description')}</Dialog.Description>
		</Dialog.Header>
		<Command.Root class="rounded-none bg-transparent">
			<Command.Input
				placeholder={$t('search.command.input_placeholder')}
				oninput={(e) => {
					searchValue = (e.currentTarget as HTMLInputElement).value;
				}}
			/>
			<Command.List tabindex={-1} class="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
				<Command.Empty class="py-12 text-center text-sm text-muted-foreground">
					{$t('search.command.no_results')}
				</Command.Empty>

				<!-- Navigation routes -->
				{#each groupedRoutes as group (group.group)}
					<Command.Group
						heading={group.heading}
						class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
					>
						{#each group.items as item (item.id)}
							<CommandMenuItem
								value={item.value}
								keywords={item.keywords}
								onSelect={() => {
									runCommand(() => {
										void goto(resolve(item.localizedUrl));
									});
								}}
							>
								<ArrowRightIcon />
								{item.label}
							</CommandMenuItem>
						{/each}
					</Command.Group>
				{/each}

				<!-- Véhicules (admin, résultats live) -->
				{#if isAdmin && filteredVehicles.length > 0}
					<Command.Group
						heading="Véhicules"
						class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
					>
						{#each filteredVehicles as vehicle (vehicle._id)}
							<CommandMenuItem
								value="{vehicle.brand} {vehicle.model} {vehicle.registration}"
								onSelect={() =>
									runCommand(() => void goto(resolve(localizedHref('/admin/fleet'))))}
							>
								<CarIcon class="size-4 shrink-0" />
								<span class="flex-1 truncate"
									>{vehicle.brand}
									{vehicle.model}</span
								>
								<span class="text-xs text-muted-foreground">{vehicle.registration}</span>
							</CommandMenuItem>
						{/each}
					</Command.Group>
				{/if}

				<!-- Réservations récentes (authenticated, résultats live) -->
				{#if effectiveAuth.isAuthenticated && filteredReservations.length > 0}
					<Command.Group
						heading="Réservations"
						class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
					>
						{#each filteredReservations as res (res._id)}
							<CommandMenuItem
								value="{res.purpose} {res.brand} {res.model} {res.registration}"
								onSelect={() =>
									runCommand(() =>
										void goto(
											resolve(
												localizedHref(
													isAdmin ? `/admin/reservations/${res._id}` : '/app/reservations'
												)
											)
										)
									)}
							>
								<CalendarIcon class="size-4 shrink-0" />
								<span class="flex-1 truncate">{res.purpose}</span>
								<span class="text-xs text-muted-foreground"
									>{res.brand}
									{res.model}</span
								>
							</CommandMenuItem>
						{/each}
					</Command.Group>
				{/if}

				<!-- Actions rapides (pas de recherche active) -->
				{#if effectiveAuth.isAuthenticated && !searchValue.trim()}
					<Command.Group
						heading="Actions rapides"
						class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
					>
						<CommandMenuItem
							value="nouvelle réservation créer réserver véhicule"
							onSelect={() =>
								runCommand(() => void goto(resolve(localizedHref('/app/reservations'))))}
						>
							<PlusCircleIcon class="size-4 shrink-0" />
							Nouvelle réservation
						</CommandMenuItem>
						{#if isAdmin}
							<CommandMenuItem
								value="inviter membre équipe collaborateur utilisateur"
								onSelect={() =>
									runCommand(() =>
										void goto(resolve(localizedHref('/admin/settings/members')))
									)}
							>
								<UserPlusIcon class="size-4 shrink-0" />
								Inviter un membre
							</CommandMenuItem>
							<CommandMenuItem
								value="importer véhicules flotte csv fichier"
								onSelect={() =>
									runCommand(() => void goto(resolve(localizedHref('/admin/fleet'))))}
							>
								<UploadIcon class="size-4 shrink-0" />
								Importer des véhicules
							</CommandMenuItem>
						{/if}
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
		<div
			class="absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 rounded-b-xl border-t border-border bg-muted/50 px-4 text-xs font-medium text-muted-foreground"
		>
			<div class="flex items-center gap-2">
				<Kbd.Root class="border bg-background"><CornerDownLeftIcon /></Kbd.Root>
				{$t('search.command.footer.go_to_page')}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
