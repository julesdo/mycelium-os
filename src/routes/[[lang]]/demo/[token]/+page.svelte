<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Logo from '$lib/components/icons/logo.svelte';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import type { PageData } from './$types';
	import { page } from '$app/state';

	let { data }: { data: PageData } = $props();

	const expiryDateLabel = $derived(
		new Date(data.expiresAt).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);

	const lang = $derived(page.params.lang ?? '');
	const base = $derived(lang ? `/${lang}` : '');
	const returnTo = $derived(`${base}/admin/dashboard`);

	const signupUrl = $derived(`${base}/signup?demo_token=${data.token}&return_to=${encodeURIComponent(returnTo)}`);
	const signinUrl = $derived(`${base}/signin?demo_token=${data.token}&return_to=${encodeURIComponent(returnTo)}`);
</script>

<svelte:head>
	<title>Démo Mycelium · {data.orgName}</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-6">
	<div class="w-full max-w-sm space-y-6">
		<!-- Logo + titre -->
		<div class="text-center space-y-3">
			<div class="mx-auto flex size-12 items-center justify-center">
				<Logo class="size-10" />
			</div>
			<div>
				<h1 class="text-xl font-semibold">Votre démo Mycelium</h1>
				<p class="text-sm text-muted-foreground mt-1">
					{data.orgName} · Expire le {expiryDateLabel}
				</p>
			</div>
		</div>

		<!-- Card principale -->
		<div
			class="relative overflow-hidden rounded-2xl border border-border bg-card p-6 space-y-4"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 4px 24px oklch(0 0 0 / 0.08)"
		>
			<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

			<div class="space-y-1">
				<p class="text-sm font-medium">Accédez à votre espace démo</p>
				<p class="text-xs text-muted-foreground">
					Explorez Fleet OS avec des données réalistes sur votre secteur.
				</p>
			</div>

			<Button
				href={signupUrl}
				class="w-full bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
			>
				Créer mon accès &amp; découvrir
			</Button>

			<p class="text-center text-xs text-muted-foreground">
				Déjà un compte ?
				<a href={signinUrl} class="underline underline-offset-2 hover:text-foreground">
					Se connecter
				</a>
			</p>
		</div>

		<!-- Contact commercial -->
		<div
			class="relative overflow-hidden rounded-2xl border border-border bg-card p-4 space-y-3"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
		>
			<div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
			<p class="text-xs font-medium text-muted-foreground">Une question ?</p>
			<div class="flex flex-col gap-2">
				<a
					href="tel:{data.commercialPhone}"
					class="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors"
				>
					<PhoneIcon class="size-4 shrink-0" />
					{data.commercialName} · {data.commercialPhone}
				</a>
				{#if data.commercialCalendlyUrl}
					<a
						href={data.commercialCalendlyUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors"
					>
						<CalendarIcon class="size-4 shrink-0" />
						Prendre un rendez-vous
					</a>
				{/if}
			</div>
		</div>

		<p class="text-center text-xs text-muted-foreground/60">
			Cet environnement contient des données fictives à titre de démonstration.
		</p>
	</div>
</div>
