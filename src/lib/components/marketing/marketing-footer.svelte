<script lang="ts">
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import Logo from '$lib/components/icons/logo.svelte';
	import { LEGAL_CONFIG } from '$lib/config/legal';

	const year = new Date().getFullYear();

	const links = [
		{ label: 'Tarifs', href: localizedHref('/pricing') },
		{ label: 'À propos', href: localizedHref('/about') },
		{ label: 'Confidentialité', href: localizedHref('/privacy') },
		{ label: 'CGU', href: localizedHref('/terms') }
	];
</script>

<footer class="border-t border-border bg-background">
	<div class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
		<!-- Logo -->
		<a
			href={resolve(localizedHref('/'))}
			class="flex items-center gap-2.5 transition-opacity hover:opacity-75"
			aria-label="Mycelium"
		>
			<span
				class="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.35);"
			>
				<Logo class="size-5 text-[var(--brand-foreground)]" />
			</span>
			<span class="text-sm font-semibold text-foreground">Mycelium</span>
		</a>

		<!-- Links + copyright -->
		<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
			{#each links as link (link.label)}
				<a
					href={resolve(link.href)}
					class="text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					{link.label}
				</a>
			{/each}
			<span class="text-xs text-muted-foreground/50">© {year} {LEGAL_CONFIG.companyName}</span>
		</div>
	</div>
</footer>
