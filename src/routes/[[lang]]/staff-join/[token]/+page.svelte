<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import Logo from '$lib/components/icons/logo.svelte';
	import { Button } from '$lib/components/ui/button';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import LogInIcon from '@lucide/svelte/icons/log-in';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';

	interface Props { data: PageData; }
	let { data }: Props = $props();

	const token = $derived(page.params.token as string);
	const viewer = $derived(data.viewer as (typeof data.viewer & { role?: string }) | null);
	const isLoggedIn = $derived(!!viewer);

	// Query publique — pas besoin d'être connecté
	const inviteQ = useQuery(api.concierge.staff.getStaffInvitationByToken, { token });

	// Mutation d'acceptation (authed)
	const accept = useMutation(api.concierge.staff.acceptStaffInvitation);

	let accepting = $state(false);
	let accepted = $state(false);

	const ROLE_CONFIG = {
		SUPER_ADMIN: {
			label: 'Super Admin',
			description: 'Accès complet à toutes les organisations et à la gestion de l\'équipe Mycelium.',
			Icon: ShieldIcon,
			color: 'text-amber-600 dark:text-amber-400',
			bg: 'bg-amber-50 dark:bg-amber-950/30',
			border: 'border-amber-200/60 dark:border-amber-800/40'
		},
		OPERATOR: {
			label: 'Opérateur',
			description: 'Suivi des cantines clientes, inbox tickets et assistance humaine.',
			Icon: HeadphonesIcon,
			color: 'text-violet-600 dark:text-violet-400',
			bg: 'bg-violet-50 dark:bg-violet-950/30',
			border: 'border-violet-200/60 dark:border-violet-800/40'
		}
	};

	function formatExpiry(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', {
			day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	async function handleAccept() {
		if (accepting) return;
		accepting = true;
		try {
			await accept({ token });
			accepted = true;
			toast.success('Bienvenue dans l\'équipe Mycelium !');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'activation.');
		} finally {
			accepting = false;
		}
	}

	function goToConcierge() {
		goto(resolve(localizedHref('/ops')));
	}

	const redirectTo = $derived(encodeURIComponent(`/${page.params.lang ?? 'fr'}/staff-join/${token}`));
</script>

<svelte:head>
	<title>Invitation Mycelium Fleet OS</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
	<!-- Logo -->
	<a href={resolve(localizedHref('/'))} class="mb-10 flex items-center gap-2.5 transition-opacity hover:opacity-80">
		<span class="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)]"
			style="box-shadow: 0 2px 8px oklch(0.92 0.23 103 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.4)">
			<Logo class="size-9 text-black" />
		</span>
		<span class="text-lg font-bold tracking-tight">Mycelium</span>
	</a>

	<!-- Card principale -->
	<div class="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
		<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/15"></div>
		<div class="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[var(--brand)]/5 to-transparent"></div>

		<div class="relative p-8">

			<!-- État : chargement -->
			{#if inviteQ.isLoading}
				<div class="flex flex-col items-center gap-3 py-6 text-center">
					<LoaderCircleIcon class="size-8 text-muted-foreground motion-safe:animate-spin" />
					<p class="text-sm text-muted-foreground">Vérification de l'invitation…</p>
				</div>

			<!-- État : invalide / introuvable -->
			{:else if !inviteQ.data}
				<div class="flex flex-col items-center gap-4 py-4 text-center">
					<div class="flex size-14 items-center justify-center rounded-2xl bg-muted">
						<XCircleIcon class="size-7 text-muted-foreground" />
					</div>
					<div>
						<h1 class="text-lg font-bold">Invitation introuvable</h1>
						<p class="mt-1 text-sm text-muted-foreground">
							Ce lien n'existe pas ou a été révoqué par un administrateur.
						</p>
					</div>
				</div>

			<!-- État : déjà utilisée -->
			{:else if inviteQ.data.status === 'used'}
				<div class="flex flex-col items-center gap-4 py-4 text-center">
					<div class="flex size-14 items-center justify-center rounded-2xl bg-muted">
						<CheckCircleIcon class="size-7 text-muted-foreground" />
					</div>
					<div>
						<h1 class="text-lg font-bold">Invitation déjà utilisée</h1>
						<p class="mt-1 text-sm text-muted-foreground">
							Ce lien a déjà été accepté. Si vous avez déjà rejoint l'équipe,
							connectez-vous directement.
						</p>
					</div>
					<Button href={resolve(localizedHref('/signin'))} class="mt-2 w-full">
						Se connecter
					</Button>
				</div>

			<!-- État : expirée -->
			{:else if inviteQ.data.status === 'expired'}
				<div class="flex flex-col items-center gap-4 py-4 text-center">
					<div class="flex size-14 items-center justify-center rounded-2xl bg-muted">
						<ClockIcon class="size-7 text-muted-foreground" />
					</div>
					<div>
						<h1 class="text-lg font-bold">Invitation expirée</h1>
						<p class="mt-1 text-sm text-muted-foreground">
							Ce lien n'est plus valide (durée de vie : 7 jours). Demandez
							un nouveau lien à votre responsable d'équipe.
						</p>
					</div>
				</div>

			<!-- État : acceptée avec succès -->
			{:else if accepted}
				<div class="flex flex-col items-center gap-4 py-4 text-center">
					<div class="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
						<CheckCircleIcon class="size-7 text-emerald-500" />
					</div>
					<div>
						<h1 class="text-lg font-bold">Bienvenue dans l'équipe !</h1>
						<p class="mt-1 text-sm text-muted-foreground">
							Votre compte a été activé. Vous avez accès à votre espace
							<strong>{inviteQ.data.staffRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Opérateur'}</strong>.
						</p>
						<p class="mt-2 text-xs text-muted-foreground/60">
							Rechargez la page si vous ne voyez pas votre nouvel espace.
						</p>
					</div>
					<Button onclick={goToConcierge} class="mt-2 w-full">
						Accéder à mon espace →
					</Button>
				</div>

			<!-- État : invitation valide -->
			{:else}
				{@const inv = inviteQ.data}
				{@const roleCfg = ROLE_CONFIG[inv.staffRole]}

				<div class="flex flex-col gap-6">
					<!-- En-tête -->
					<div class="text-center">
						<p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Invitation de {inv.invitedByName}
						</p>
						<h1 class="text-xl font-bold leading-tight">
							Rejoindre l'équipe Mycelium
						</h1>
						<p class="mt-1.5 text-sm text-muted-foreground">
							Vous avez été invité(e) à accéder à la plateforme interne Mycelium Fleet OS.
						</p>
					</div>

					<!-- Badge rôle -->
					<div class="flex items-start gap-3 rounded-xl border {roleCfg.border} {roleCfg.bg} p-4">
						<div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/60 dark:bg-black/20">
							<roleCfg.Icon class="size-5 {roleCfg.color}" />
						</div>
						<div>
							<p class="text-[13px] font-semibold {roleCfg.color}">Rôle : {roleCfg.label}</p>
							<p class="mt-0.5 text-[12px] text-muted-foreground">{roleCfg.description}</p>
						</div>
					</div>

					<!-- Email restreint -->
					{#if inv.invitedEmail}
						<div class="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
							<p class="text-[12px] text-muted-foreground">
								<span class="font-semibold text-foreground">Email requis :</span>
								{inv.invitedEmail}
							</p>
						</div>
					{/if}

					<!-- Expiration -->
					<p class="text-center text-[11px] text-muted-foreground/50">
						<ClockIcon class="mr-1 inline size-3" />
						Expire le {formatExpiry(inv.expiresAt)}
					</p>

					<!-- Actions selon état de connexion -->
					{#if !isLoggedIn}
						<div class="flex flex-col gap-2.5">
							<p class="text-center text-[12px] text-muted-foreground">
								Connectez-vous ou créez un compte pour accepter cette invitation.
							</p>
							<Button href={resolve(localizedHref(`/signup?redirectTo=${redirectTo}`))} class="w-full gap-2">
								<UserPlusIcon class="size-4" />
								Créer un compte
							</Button>
							<Button variant="outline" href={resolve(localizedHref(`/signin?redirectTo=${redirectTo}`))} class="w-full gap-2">
								<LogInIcon class="size-4" />
								J'ai déjà un compte
							</Button>
						</div>
					{:else}
						<!-- Connecté : accepter en 1 clic -->
						<div class="flex flex-col gap-3">
							<div class="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-center">
								<p class="text-[12px] text-muted-foreground">
									Connecté en tant que <span class="font-semibold text-foreground">{viewer?.name ?? viewer?.email}</span>
								</p>
								{#if inv.invitedEmail && viewer?.email?.toLowerCase() !== inv.invitedEmail}
									<p class="mt-1 text-[11px] text-destructive">
										⚠ Ce compte ne correspond pas à l'email requis ({inv.invitedEmail})
									</p>
								{/if}
							</div>

							<Button
								onclick={handleAccept}
								disabled={accepting || (!!inv.invitedEmail && viewer?.email?.toLowerCase() !== inv.invitedEmail)}
								class="w-full gap-2"
							>
								{#if accepting}
									<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
									Activation en cours…
								{:else}
									<CheckCircleIcon class="size-4" />
									Rejoindre l'équipe Mycelium
								{/if}
							</Button>

							<p class="text-center text-[11px] text-muted-foreground/50">
								Ce lien est à usage unique et ne peut être accepté qu'une fois.
							</p>
						</div>
					{/if}
				</div>
			{/if}

		</div>
	</div>

	<p class="mt-8 text-center text-xs text-muted-foreground/40">
		Mycelium Fleet OS — Plateforme interne réservée au staff
	</p>
</div>
