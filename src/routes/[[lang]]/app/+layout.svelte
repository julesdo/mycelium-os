<script lang="ts">
	import PostHogIdentify from '$lib/components/analytics/PostHogIdentify.svelte';
	import { AuthenticatedLayout, getAppSidebarConfig } from '$lib/components/authenticated';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import { localizedHref } from '$lib/utils/i18n';
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import WelcomeModal from '$lib/components/onboarding/WelcomeModal.svelte';
	import { previewAsEmployee } from '$lib/stores/preview-as-employee.svelte';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	interface Props {
		children?: Snippet;
		data: LayoutData;
	}

	let { children, data }: Props = $props();

	const viewer = $derived(data.viewer as typeof data.viewer & { role?: string });

	// Guard: staff Mycelium (role='admin') → portail concierge, sauf mode preview explicite
	$effect(() => {
		if (viewer?.role === 'admin' && !previewAsEmployee.active) {
			goto(resolve(localizedHref('/concierge')));
		}
	});

	// Guard: redirect to onboarding if user has no organization
	const myOrgQuery = useQuery(api.organizations.getMyOrg, {});
	$effect(() => {
		if (viewer?.role === 'admin') return; // géré ci-dessus
		if (myOrgQuery.data === null) {
			goto(resolve(localizedHref('/onboarding/organization')));
		}
	});

	const isPlatformAdmin = $derived(viewer?.role === 'admin');

	function exitPreview() {
		previewAsEmployee.exit();
		goto(resolve(localizedHref('/concierge')));
	}

	// Pages that manage their own scroll container (fullscreen, no outer padding/scroll)
	const fullControl = $derived(
		/\/app\/reservations\/new\/?$/.test(page.url.pathname)
	);

	// Keyboard shortcuts: Cmd+. → Admin, Cmd+, → Settings
	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('input, textarea, [contenteditable]')) return;

		let url: string | undefined;

		if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
			const plainRoutes: Record<string, string> = {
				'.': localizedHref('/admin'),
				',': localizedHref('/app/settings')
			};
			url = plainRoutes[e.key];
		}

		if (!url) return;

		e.preventDefault();
		goto(resolve(url)).then(() => {
			tick().then(() => document.querySelector<HTMLTextAreaElement>('textarea')?.focus());
		});
	}

	const sidebarConfig = $derived(
		getAppSidebarConfig(
			{ pathname: page.url.pathname, lang: page.params.lang },
			viewer?.role
		)
	);

	// --- Onboarding salarié ---
	const appStorageKey = $derived(
		viewer?._id ? `mycelium:onboarding:app:${viewer._id}` : null
	);

	let showAppWelcome = $state(false);

	$effect(() => {
		if (!browser || !appStorageKey) return;
		if (!localStorage.getItem(appStorageKey)) {
			showAppWelcome = true;
		}
	});

	function handleAppWelcomeDone() {
		showAppWelcome = false;
		if (browser && appStorageKey) {
			localStorage.setItem(appStorageKey, 'done');
		}
	}
</script>

<svelte:document onkeydown={handleKeydown} />

<PostHogIdentify />

<AuthenticatedLayout
	{sidebarConfig}
	navMode="app-topbar"
	user={viewer
		? {
				name: viewer.name ?? 'User',
				email: viewer.email ?? '',
				image: viewer.image ?? undefined,
				role: viewer.role ?? 'user'
			}
		: undefined}
	routePrefix="app"
	rootLabel="App"
	{fullControl}
>
	{@render children?.()}
</AuthenticatedLayout>

<WelcomeModal
	bind:open={showAppWelcome}
	userName={viewer?.name ?? ''}
	mode="app"
	onDone={handleAppWelcomeDone}
/>

{#if isPlatformAdmin && previewAsEmployee.active}
	<div class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 lg:bottom-6">
		<button
			type="button"
			onclick={exitPreview}
			class="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-600 shadow-lg backdrop-blur-md transition-all hover:bg-amber-500/20 dark:text-amber-400"
			style="box-shadow: 0 4px 20px oklch(0.75 0.18 85 / 0.20), 0 1px 3px oklch(0 0 0 / 0.12)"
		>
			<EyeOffIcon class="size-4 shrink-0" />
			Quitter l'aperçu salarié
		</button>
	</div>
{/if}
