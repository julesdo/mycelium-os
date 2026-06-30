<script lang="ts">
	import LightSwitch from '$lib/components/ui/light-switch/light-switch.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/icons/logo.svelte';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import { authClient } from '$lib/auth-client';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { T, getTranslate } from '@tolgee/svelte';
	import { cn } from '$lib/utils';
	const { t } = getTranslate();
	const auth = useAuth();
	const isAuthenticated = $derived(auth.isAuthenticated);

	const ssrAuthenticated = auth.isAuthenticated;
	const hasSessionCookie =
		typeof document !== 'undefined' && document.cookie.includes('better-auth.session_token');

	let sessionChecked = $state(false);
	$effect(() => {
		const unsub = authClient.useSession().subscribe((s) => {
			if (!s.isPending) sessionChecked = true;
		});
		return unsub;
	});

	const showAuthButtons = $derived(
		ssrAuthenticated || !hasSessionCookie || (sessionChecked && !auth.isLoading)
	);

	let menuOpen = $state(false);
	let scrollY = $state(0);
	const scrolled = $derived(scrollY > 40);

	type NavLink = { key: string; href: string; label?: string };
	const navLinks = $derived<NavLink[]>([
		{ key: 'nav.features', href: '/#features' },
		{ key: 'nav.agents', href: '/#agents' },
		{ key: 'nav.simulator', href: localizedHref('/simulator'), label: 'Simulateur TCO' },
		{ key: 'nav.pricing', href: localizedHref('/pricing') },
		{ key: 'nav.about', href: localizedHref('/about') }
	]);
</script>

<svelte:window bind:scrollY />

<header
	class={cn(
		'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300',
		scrolled &&
			'border-b border-border bg-background/90 shadow-[0_1px_12px_-4px_oklch(0_0_0/0.08)] backdrop-blur-md'
	)}
>
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 sm:px-8">
		<!-- Logo -->
		<a
			href={resolve(localizedHref('/'))}
			class="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-75"
		>
			<span
				class="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.35), inset 0 -1px 0 oklch(0 0 0 / 0.08);"
			>
				<Logo class="size-5 text-[var(--brand-foreground)]" />
			</span>
			Mycelium
		</a>

		<!-- Desktop nav -->
		<nav class="hidden items-center gap-1 lg:flex">
			{#each navLinks as link (link.key)}
				<a
					href={resolve(link.href)}
					class="inline-flex h-8 items-center rounded-full px-4 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
				>
					{link.label ?? $t(link.key)}
				</a>
			{/each}
		</nav>

		<!-- Desktop right -->
		<div class="hidden items-center gap-2 lg:flex">
			<LightSwitch variant="ghost" />
			<LanguageSwitcher variant="ghost" />
			<div class="mx-1 h-4 w-px bg-border"></div>

			{#if showAuthButtons}
				{#if isAuthenticated}
					<a
						href={resolve(localizedHref('/app'))}
						class="inline-flex h-9 items-center rounded-full bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
					>
						<T keyName="nav.dashboard" defaultValue="Tableau de bord" />
					</a>
				{:else}
					<a
						href={resolve(localizedHref('/signin'))}
						class="inline-flex h-9 items-center px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						<T keyName="nav.login" defaultValue="Se connecter" />
					</a>
					<a
						href={resolve(localizedHref('/signup'))}
						class="inline-flex h-9 items-center rounded-full bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
					>
						<T keyName="nav.signup" defaultValue="Tableau de bord" />
					</a>
				{/if}
			{/if}
		</div>

		<!-- Mobile right -->
		<div class="flex items-center gap-1 lg:hidden">
			<LightSwitch variant="ghost" />
			<LanguageSwitcher variant="ghost" />
			<button
				class="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
				onclick={() => (menuOpen = !menuOpen)}
				aria-label={menuOpen ? $t('nav.close_menu') : $t('nav.open_menu')}
				aria-expanded={menuOpen}
			>
				{#if menuOpen}
					<X class="size-5" />
				{:else}
					<Menu class="size-5" />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if menuOpen}
		<div
			class="mx-4 rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur-xl lg:hidden"
		>
			<nav>
				<ul class="mb-4 space-y-0.5">
					{#each navLinks as link (link.key)}
						<li>
							<a
								href={resolve(link.href)}
								onclick={() => (menuOpen = false)}
								class="flex h-10 items-center rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							>
								{link.label ?? $t(link.key)}
							</a>
						</li>
					{/each}
				</ul>
				<div class="mb-4 h-px bg-border"></div>
				{#if showAuthButtons}
					<div class="flex flex-col gap-2">
						{#if isAuthenticated}
							<a
								href={resolve(localizedHref('/app'))}
								onclick={() => (menuOpen = false)}
								class="flex h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-[var(--brand-foreground)]"
							>
								<T keyName="nav.dashboard" defaultValue="Tableau de bord" />
							</a>
						{:else}
							<a
								href={resolve(localizedHref('/signup'))}
								onclick={() => (menuOpen = false)}
								class="flex h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-[var(--brand-foreground)]"
							>
								<T keyName="nav.signup" defaultValue="Tableau de bord" />
							</a>
						{/if}
					</div>
				{/if}
			</nav>
		</div>
	{/if}
</header>
