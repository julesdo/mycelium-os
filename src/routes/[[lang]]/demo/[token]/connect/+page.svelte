<script lang="ts">
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { api } from '$lib/convex/_generated/api';
	import { localizedHref } from '$lib/utils/i18n';
	import { page } from '$app/state';
	import Logo from '$lib/components/icons/logo.svelte';

	const auth = useAuth();
	const convexClient = useConvexClient();

	const token = $derived(page.params.token as string);

	let errorMsg = $state('');
	let connecting = $state(false);

	$effect(() => {
		if (auth.isLoading) return;

		if (!auth.isAuthenticated) {
			const returnUrl = localizedHref(`/demo/${token}/connect`);
			window.location.href = `${localizedHref('/signin')}?redirectTo=${encodeURIComponent(returnUrl)}`;
			return;
		}

		if (connecting || errorMsg) return;
		connecting = true;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		convexClient.mutation((api as any)['demo/connectUser'].connectUserToDemoOrg, { token })
			.then(() => {
				window.location.href = localizedHref('/admin/dashboard');
			})
			.catch((e: Error) => {
				connecting = false;
				errorMsg = e.message || 'Une erreur est survenue';
			});
	});
</script>

<svelte:head>
	<title>Connexion à la démo · Mycelium</title>
</svelte:head>

<div class="min-h-screen bg-background flex items-center justify-center p-6">
	<div class="text-center space-y-4 max-w-xs w-full">
		<div class="mx-auto flex size-12 items-center justify-center">
			<Logo class="size-10" />
		</div>

		{#if errorMsg}
			<div
				class="relative overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3"
			>
				<p class="text-sm font-medium text-destructive">{errorMsg}</p>
				<a
					href={localizedHref('/')}
					class="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
				>
					Retour à l'accueil
				</a>
			</div>
		{:else}
			<div
				class="relative overflow-hidden rounded-2xl border border-border bg-card p-5"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
			>
				<div
					class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
				></div>
				<div class="flex items-center justify-center gap-2">
					<div class="size-4 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin"></div>
					<p class="text-sm text-muted-foreground">Connexion à votre espace démo…</p>
				</div>
			</div>
		{/if}
	</div>
</div>
