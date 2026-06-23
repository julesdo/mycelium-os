<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { localizedHref } from '$lib/utils/i18n';
	import Logo from '$lib/components/icons/logo.svelte';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import ClockIcon from '@lucide/svelte/icons/clock';

	let { data } = $props();

	const token = $derived(page.params.token as string);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyApi = api as any;

	const invitationQuery = useQuery(anyApi.organizations.getInvitationByToken, () => ({ token }));
	const invitation = $derived(invitationQuery.data);
	const isLoading = $derived(invitationQuery.isLoading);

	const client = useConvexClient();
	let accepting = $state(false);

	const ROLE_LABELS: Record<string, string> = {
		ORG_ADMIN: 'Administrateur',
		ORG_MANAGER: 'Gestionnaire',
		ORG_MEMBER: 'Membre'
	};

	async function handleAccept() {
		if (accepting) return;
		accepting = true;
		try {
			await client.mutation(anyApi.organizations.acceptInvitation, { token });
			toast.success('Bienvenue dans l\'organisation !');
			goto(localizedHref('/admin'));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
		} finally {
			accepting = false;
		}
	}

	function getSigninUrl(): string {
		const redirectTo = encodeURIComponent(page.url.pathname);
		return localizedHref(`/signin?redirectTo=${redirectTo}`);
	}
</script>

<svelte:head>
	<title>Rejoindre l'organisation — Mycelium</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-16">
	<div class="w-full max-w-sm">
		<!-- Logo -->
		<div class="mb-8 flex items-center justify-center gap-2.5">
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] shadow-sm ring-1 ring-[var(--brand-foreground)]/10"
				style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
			>
				<Logo class="size-8 text-[var(--brand-foreground)]" />
			</span>
			<span class="text-sm font-semibold tracking-tight">Mycelium</span>
		</div>

		<!-- Card -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">

			{#if isLoading}
				<div class="flex flex-col gap-4">
					<Skeleton class="h-5 w-40" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-3/4" />
					<Skeleton class="mt-2 h-9 w-full rounded-lg" />
				</div>

			{:else if !invitation}
				<div class="flex flex-col items-center gap-3 py-2 text-center">
					<XCircleIcon class="size-10 text-muted-foreground" />
					<div>
						<p class="font-semibold">Invitation introuvable</p>
						<p class="mt-1 text-sm text-muted-foreground">Ce lien d'invitation est invalide ou a déjà été utilisé.</p>
					</div>
					<Button variant="outline" href={localizedHref('/')} class="mt-2 w-full">
						Retour à l'accueil
					</Button>
				</div>

			{:else if invitation.isExpired}
				<div class="flex flex-col items-center gap-3 py-2 text-center">
					<ClockIcon class="size-10 text-muted-foreground" />
					<div>
						<p class="font-semibold">Invitation expirée</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Ce lien a expiré. Demandez à l'administrateur de vous envoyer une nouvelle invitation.
						</p>
					</div>
					<Button variant="outline" href={localizedHref('/')} class="mt-2 w-full">
						Retour à l'accueil
					</Button>
				</div>

			{:else if invitation.isAccepted}
				<div class="flex flex-col items-center gap-3 py-2 text-center">
					<CheckCircle2Icon class="size-10 text-emerald-500" />
					<div>
						<p class="font-semibold">Invitation déjà acceptée</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Vous avez déjà rejoint cette organisation.
						</p>
					</div>
					<Button href={localizedHref('/admin')} class="mt-2 w-full">
						Accéder à l'espace admin
					</Button>
				</div>

			{:else}
				<!-- Valid invitation -->
				<div class="flex flex-col gap-5">
					<div>
						<p class="text-sm text-muted-foreground">Vous avez été invité à rejoindre</p>
						<h1 class="mt-0.5 text-lg font-semibold tracking-tight">{invitation.orgName}</h1>
					</div>

					<div class="flex items-center gap-2">
						<span class="text-sm text-muted-foreground">Rôle attribué :</span>
						<Badge variant="secondary">{ROLE_LABELS[invitation.role] ?? invitation.role}</Badge>
					</div>

					<div class="border-t border-border pt-4">
						{#if data.isLoggedIn}
							<Button class="w-full" onclick={handleAccept} disabled={accepting}>
								{#if accepting}
									<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
									Validation...
								{:else}
									Rejoindre {invitation.orgName}
								{/if}
							</Button>
							<p class="mt-3 text-center text-xs text-muted-foreground">
								L'invitation est liée à <strong>{invitation.email}</strong>.
								Assurez-vous d'être connecté avec ce compte.
							</p>
						{:else}
							<Button class="w-full" href={getSigninUrl()}>
								Se connecter pour rejoindre
							</Button>
							<p class="mt-3 text-center text-xs text-muted-foreground">
								Pas encore de compte ?
								<a href={localizedHref(`/signup?redirectTo=${encodeURIComponent(page.url.pathname)}`)} class="underline underline-offset-2 hover:text-foreground">
									Créer un compte
								</a>
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-muted-foreground">
			Mycelium Fleet OS &mdash; Plateforme de gestion de flotte pour PME
		</p>
	</div>
</div>
