<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { Button } from '$lib/components/ui/button';
	import NavUser from '../nav-user.svelte';
	import OrganizationSwitcher from '../layout/OrganizationSwitcher.svelte';
	import { cn } from '$lib/utils.js';
	import { onMount } from 'svelte';
	import type { SidebarConfig, User } from './types';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';

	interface Props {
		config: SidebarConfig;
		user?: User;
	}

	let { config, user }: Props = $props();

	const navItems = $derived(config.navItems.filter((item) => !item.divider && item.url));

	const CLE_ETAT = 'mycelium:rail:deplie';

	// L'état du rail survit au rechargement : un gérant qui l'a déplié ne veut
	// pas le replier à chaque visite.
	//
	// La lecture se fait au montage, pas à l'initialisation : `localStorage`
	// n'existe pas au rendu serveur, et le serveur rend donc toujours le rail
	// replié. `onMount` s'exécute après l'hydratation, ce qui garantit que le
	// dépliage est réellement appliqué au DOM au lieu d'être avalé par une
	// divergence entre le HTML serveur et l'état client.
	let deplie = $state(false);
	onMount(() => {
		deplie = localStorage.getItem(CLE_ETAT) === '1';
	});

	function basculer() {
		deplie = !deplie;
		localStorage.setItem(CLE_ETAT, deplie ? '1' : '0');
	}

	// Le dépliage ne prend effet qu'à partir de 1024 px. Entre 768 et 1023 px,
	// tablette en portrait, le rail reste figé à 72 px en icônes seules : céder
	// 240 px de largeur y coûte plus cher que le confort des libellés.
	const largeur = $derived(deplie ? 'w-[72px] lg:w-60' : 'w-[72px]');
	const alignement = $derived(deplie ? 'justify-center lg:justify-start' : 'justify-center');
	const libelle = $derived(deplie ? 'hidden truncate lg:inline' : 'hidden');
	const identite = $derived(deplie ? 'hidden lg:block' : 'hidden');
	const pastille = $derived(
		deplie ? 'absolute top-1 right-1 lg:static lg:ml-auto' : 'absolute top-1 right-1'
	);
</script>

<!--
	Sous 768 px, ce composant ne s'affiche pas : la navigation passe en barre
	basse (`app-bottom-nav.svelte`). Un rail à gauche sur un écran étroit
	consomme la dimension la plus rare et éloigne les cibles du pouce.
-->
<aside
	class={cn(
		'hidden shrink-0 flex-col gap-1 border-r border-border bg-card/40 p-2 transition-[width] duration-200 md:flex',
		largeur
	)}
>
	<!--
		Quelle cantine on regarde, avant tout le reste.

		Un gérant peut administrer plusieurs sites : sans ce repère, rien à
		l'écran ne dit sur lequel il agit, et un dépôt de factures peut partir
		dans le mauvais dossier. Replié, seule l'initiale reste visible ; c'est
		assez pour distinguer deux établissements d'un coup d'œil.
	-->
	<div class={cn('mb-1', deplie ? 'lg:px-1' : '')}>
		<OrganizationSwitcher compact={!deplie} />
	</div>

	<!-- Le geste de scan vit AU-DESSUS de la navigation, jamais dedans. -->
	<Button
		href={resolve(localizedHref('/app/factures'))}
		class={cn(
			'mb-2 h-auto min-h-12 gap-3 bg-[var(--brand)] px-3 font-semibold text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90',
			alignement
		)}
	>
		<CameraIcon class="size-5 shrink-0" />
		<span class={cn('text-sm', libelle)}>Scanner</span>
	</Button>

	<nav class="flex flex-col gap-1" aria-label="Navigation principale">
		{#each navItems as item (item.translationKey)}
			<a
				href={resolve(item.url ?? '/')}
				aria-current={item.isActive ? 'page' : undefined}
				class={cn(
					'relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors active:scale-95',
					alignement,
					item.isActive
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
				)}
			>
				{#if item.icon}<item.icon class="size-5 shrink-0" />{/if}
				<span class={libelle}>{item.shortLabel}</span>
				{#if item.badge}
					<span
						class={cn(
							'flex min-w-6 items-center justify-center rounded-full bg-[var(--brand)] px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-[var(--brand-foreground)]',
							pastille
						)}
					>
						{item.badge}
					</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="mt-auto flex flex-col gap-1">
		<!--
			La bascule n'existe qu'à partir de 1024 px, là où le dépliage a un effet :
			en tablette portrait, un bouton qui ne change rien serait un mensonge.
		-->
		<Button
			variant="ghost"
			onclick={basculer}
			aria-label={deplie ? 'Replier le menu' : 'Déplier le menu'}
			aria-expanded={deplie}
			class={cn(
				'hidden h-auto min-h-12 gap-3 px-3 text-muted-foreground lg:flex',
				deplie ? 'lg:justify-start' : 'lg:justify-center'
			)}
		>
			<PanelLeftIcon class="size-5 shrink-0" />
			<span class={cn('text-sm', libelle)}>Replier</span>
		</Button>

		<!--
			Le menu compte ferme le rail par le bas. C'est le seul accès à la
			déconnexion depuis `/app` : sans lui, le gérant serait enfermé dans
			l'application. Il porte aussi `#user-menu-trigger`, que `e2e/utils/auth.ts`
			attend pour considérer le shell applicatif prêt et authentifié.
		-->
		{#if user}
			<NavUser
				user={{ name: user.name, email: user.email, avatar: user.image ?? '' }}
				class={cn('h-auto min-h-12 px-2', alignement)}
				identityClass={identite}
				showEmail={false}
			/>
		{/if}
	</div>
</aside>
