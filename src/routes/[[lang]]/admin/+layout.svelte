<script lang="ts">
	import PostHogIdentify from '$lib/components/analytics/PostHogIdentify.svelte';
	import SupportTicketMigrationBootstrap from '$lib/components/customer-support/support-ticket-migration-bootstrap.svelte';
	import { AuthenticatedLayout, getAdminSidebarConfig } from '$lib/components/authenticated';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { browser } from '$app/environment';
	import WelcomeModal from '$lib/components/onboarding/WelcomeModal.svelte';
	import Tour, { type TourStep } from '$lib/components/onboarding/Tour.svelte';
	import CopilotFab from '$lib/components/copilot/copilot-fab.svelte';
	import CopilotPanel from '$lib/components/copilot/copilot-panel.svelte';
	import TrialBanner from '$lib/components/billing/TrialBanner.svelte';
	import PlanSelectionModal from '$lib/components/billing/PlanSelectionModal.svelte';

	interface Props {
		children?: Snippet;
		data: LayoutData;
	}

	let { children, data }: Props = $props();

	// Cast viewer to include role field from BetterAuth admin plugin
	const viewer = $derived(data.viewer as typeof data.viewer & { role?: string });

	// Generate sidebar config based on current page state
	const sidebarConfig = $derived(
		getAdminSidebarConfig({
			pathname: page.url.pathname,
			lang: page.params.lang
		})
	);

	// Full control mode for pages that manage their own scroll/padding
	const fullControl = $derived(
		page.url.pathname.endsWith('/admin/fleet') ||
			page.url.pathname.includes('/admin/finance/fiscal')
	);

	// --- Onboarding ---
	const storageKey = $derived(viewer?._id ? `mycelium:onboarding:admin:${viewer._id}` : null);

	let showWelcome = $state(false);
	let showTour = $state(false);

	$effect(() => {
		if (!browser || !storageKey) return;
		if (!localStorage.getItem(storageKey)) {
			showWelcome = true;
		}
	});

	function handleWelcomeDone() {
		showWelcome = false;
		showTour = true;
	}

	function persistOnboarding() {
		if (browser && storageKey) {
			localStorage.setItem(storageKey, 'done');
		}
	}

	function handleTourComplete() {
		showTour = false;
		persistOnboarding();
	}

	function handleTourSkip() {
		showTour = false;
		persistOnboarding();
	}

	const ADMIN_TOUR_STEPS: TourStep[] = [
		{
			selector: '[href*="/admin/dashboard"]',
			title: 'Tableau de bord',
			description:
				"Vue d'ensemble de votre flotte : taux d'utilisation, véhicules disponibles et réservations du jour.",
			placement: 'bottom'
		},
		{
			selector: '[href*="/admin/fleet"]',
			title: 'Gestion de la flotte',
			description:
				'Importez vos véhicules, gérez leur disponibilité et suivez leur état en temps réel.',
			placement: 'bottom'
		},
		{
			selector: '[href*="/admin/reservations"]',
			title: 'Réservations',
			description:
				"Toutes les réservations de vos équipes, avec la possibilité d'intervenir à tout moment.",
			placement: 'bottom'
		},
		{
			selector: '[href*="/admin/settings"]',
			title: 'Paramètres',
			description: 'Configurez votre organisation, les règles de réservation et les notifications.',
			placement: 'bottom'
		}
	];

	// Provide current user ID for child components (e.g., preventing self-modification in admin actions)
	// Context value is intentionally snapshot for layout lifetime.
	// svelte-ignore state_referenced_locally
	setContext('currentUserId', viewer?._id);

	// Keyboard shortcuts for admin sidebar navigation (⌃⇧1-4, ⌘.)
	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('input, textarea, [contenteditable]')) return;

		let url: string | undefined;

		// Ctrl+Shift+number for sidebar nav (avoids macOS ⌘⇧3/4 screenshot conflict)
		if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
			const shiftRoutes: Record<string, string> = {
				Digit1: localizedHref('/admin/dashboard'),
				Digit3: localizedHref('/admin/settings'),
				Digit4: localizedHref('/admin/reservations')
			};
			url = shiftRoutes[e.code];
		} else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === '.') {
			url = localizedHref('/app');
		}

		if (!url) return;

		e.preventDefault();
		goto(resolve(url));
	}
</script>

<svelte:document onkeydown={handleKeydown} />

<PostHogIdentify />
<SupportTicketMigrationBootstrap />

<AuthenticatedLayout
	{sidebarConfig}
	{fullControl}
	navMode="topbar"
	user={viewer
		? {
				name: viewer.name ?? 'Admin',
				email: viewer.email ?? '',
				image: viewer.image ?? undefined,
				role: viewer.role ?? 'admin'
			}
		: undefined}
	routePrefix="admin"
	rootLabel="Admin"
	sidebarOpen={data.sidebarOpen}
	showOrgSwitcher={true}
>
	<TrialBanner />
	{@render children?.()}
</AuthenticatedLayout>

<WelcomeModal
	bind:open={showWelcome}
	userName={viewer?.name ?? ''}
	mode="admin"
	onDone={handleWelcomeDone}
/>

<Tour
	steps={ADMIN_TOUR_STEPS}
	active={showTour}
	onComplete={handleTourComplete}
	onSkip={handleTourSkip}
/>

<PlanSelectionModal />
<CopilotFab defaultAgent="manager" />
<CopilotPanel />
