<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import SuperAdminConfirmModal from '$lib/components/concierge/super-admin-confirm-modal.svelte';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';

	const staff = useQuery(api['concierge/staff'].listMyceliumStaff, {});
	const addMember = useMutation(api['concierge/staff'].addStaffMember);
	const updateRole = useMutation(api['concierge/staff'].updateStaffRole);
	const removeMember = useMutation(api['concierge/staff'].removeStaffMember);

	// ── Formulaire ajout ──────────────────────────────────────────────────────
	let showAddForm = $state(false);
	let newEmail = $state('');
	let newRole = $state<'super_admin' | 'concierge'>('concierge');
	let addLoading = $state(false);

	// ── Modal confirmation super_admin ────────────────────────────────────────
	type PendingAction =
		| { type: 'add'; email: string; name: string }
		| { type: 'promote'; userId: string; name: string; email: string };

	let pendingAction = $state<PendingAction | null>(null);
	let modalOpen = $state(false);

	// ── Suppression ───────────────────────────────────────────────────────────
	let confirmRemoveId = $state<string | null>(null);

	// ── Ajout : si super_admin → modale, sinon direct ─────────────────────────
	function handleAddIntent() {
		if (!newEmail.trim()) return;
		if (newRole === 'super_admin') {
			pendingAction = { type: 'add', email: newEmail.trim(), name: newEmail.trim() };
			modalOpen = true;
		} else {
			executeAdd(newEmail.trim(), 'concierge');
		}
	}

	async function executeAdd(email: string, staffRole: 'super_admin' | 'concierge') {
		addLoading = true;
		try {
			await addMember({ email, staffRole });
			toast.success(
				`${email} ajouté(e) en tant que ${staffRole === 'super_admin' ? 'Super Admin' : 'Concierge'}.`
			);
			newEmail = '';
			showAddForm = false;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
		} finally {
			addLoading = false;
		}
	}

	// ── Promotion concierge → super_admin ─────────────────────────────────────
	function handlePromoteIntent(userId: string, name: string, email: string) {
		pendingAction = { type: 'promote', userId, name, email };
		modalOpen = true;
	}

	async function handleRoleChange(userId: string, staffRole: 'super_admin' | 'concierge') {
		// La rétrogradation (super_admin → concierge) n'a pas besoin de modale
		if (staffRole === 'super_admin') return; // géré via handlePromoteIntent
		try {
			await updateRole({ userId, staffRole });
			toast.success('Rôle mis à jour.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		}
	}

	// ── Callback modale : confirmer ───────────────────────────────────────────
	async function handleModalConfirm() {
		modalOpen = false;
		if (!pendingAction) return;

		if (pendingAction.type === 'add') {
			await executeAdd(pendingAction.email, 'super_admin');
		} else if (pendingAction.type === 'promote') {
			try {
				await updateRole({ userId: pendingAction.userId, staffRole: 'super_admin' });
				toast.success(`${pendingAction.name} est maintenant Super Admin.`);
			} catch (err: unknown) {
				toast.error(err instanceof Error ? err.message : 'Erreur.');
			}
		}
		pendingAction = null;
	}

	function handleModalCancel() {
		modalOpen = false;
		pendingAction = null;
	}

	async function handleRemove(userId: string) {
		try {
			await removeMember({ userId });
			toast.success('Membre retiré du staff Mycelium.');
			confirmRemoveId = null;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		}
	}

	const roleConfig = {
		super_admin: {
			label: 'Super Admin',
			description: 'Accès complet — toutes orgs, billing, gestion équipe',
			icon: ShieldIcon,
			badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
		},
		concierge: {
			label: 'Concierge',
			description: 'File de tâches clients, actions rapides',
			icon: HeadphonesIcon,
			badgeClass: 'border-border bg-muted text-muted-foreground'
		}
	};
</script>

<svelte:head>
	<title>Équipe Mycelium — Fleet Care</title>
</svelte:head>

<!-- Modale de confirmation pour les actions super_admin -->
<SuperAdminConfirmModal
	open={modalOpen}
	targetName={pendingAction?.name ?? ''}
	targetEmail={pendingAction?.type === 'add' ? pendingAction.email : (pendingAction?.email ?? '')}
	action={pendingAction?.type === 'add' ? 'add' : 'promote'}
	onconfirm={handleModalConfirm}
	oncancel={handleModalCancel}
/>

<main class="mx-auto max-w-screen-lg px-6 py-8">
	<!-- En-tête page -->
	<div class="mb-8 flex items-start justify-between">
		<div>
			<h1 class="text-lg font-bold text-foreground">Équipe Mycelium</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				Gérez qui a accès à l'espace interne Fleet Care. Réservé aux super admins.
			</p>
		</div>
		<button
			type="button"
			onclick={() => {
				showAddForm = !showAddForm;
			}}
			class="flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-[var(--brand-foreground)] transition-opacity hover:opacity-90"
		>
			<PlusIcon class="size-3.5" />
			Ajouter un membre
		</button>
	</div>

	<!-- Formulaire ajout -->
	{#if showAddForm}
		<div
			class="relative mb-6 overflow-hidden rounded-2xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-5"
		>
			<div
				class="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.9),transparent)] dark:bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.2),transparent)]"
			></div>
			<p class="mb-3 text-sm font-semibold text-foreground">Ajouter un membre staff</p>
			<p class="mb-4 text-xs text-muted-foreground">
				L'utilisateur doit déjà avoir créé son compte sur Mycelium. Entrez son email exact.
			</p>

			<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
				<input
					type="email"
					placeholder="prenom@mycelium.io"
					bind:value={newEmail}
					class="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-[var(--brand)]/40 focus:outline-none"
					onkeydown={(e) => {
						if (e.key === 'Enter') handleAddIntent();
					}}
				/>

				<!-- Sélecteur rôle -->
				<div class="flex items-center gap-2">
					{#each ['concierge', 'super_admin'] as const as role (role)}
						{@const cfg = roleConfig[role]}
						<button
							type="button"
							onclick={() => {
								newRole = role;
							}}
							class={cn(
								'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
								newRole === role
									? role === 'super_admin'
										? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
										: 'border-[var(--brand)] bg-[var(--brand)]/10 text-foreground'
									: 'border-border bg-background text-muted-foreground hover:text-foreground'
							)}
						>
							<cfg.icon class="size-3.5" />
							{cfg.label}
						</button>
					{/each}
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={handleAddIntent}
						disabled={addLoading || !newEmail.trim()}
						class="flex items-center gap-1 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-40"
					>
						{#if newRole === 'super_admin'}
							<ShieldIcon class="size-3.5 text-amber-400" />
						{:else}
							<CheckIcon class="size-3.5" />
						{/if}
						{newRole === 'super_admin' ? 'Continuer…' : 'Confirmer'}
					</button>
					<button
						type="button"
						onclick={() => {
							showAddForm = false;
							newEmail = '';
						}}
						class="flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
					>
						<XIcon class="size-3.5" />
						Annuler
					</button>
				</div>
			</div>

			<!-- Description du rôle sélectionné -->
			<p class="mt-3 text-[11px] text-muted-foreground">
				<span class="font-semibold">{roleConfig[newRole].label} :</span>
				{roleConfig[newRole].description}
				{#if newRole === 'super_admin'}
					<span class="ml-1 font-semibold text-amber-600 dark:text-amber-400">
						— Une confirmation supplémentaire sera demandée.
					</span>
				{/if}
			</p>
		</div>
	{/if}

	<!-- Liste membres -->
	{#if staff.isLoading}
		<div class="space-y-3">
			{#each { length: 3 } as _, i (i)}
				<div class="h-16 animate-pulse rounded-2xl bg-muted"></div>
			{/each}
		</div>
	{:else if !staff.data || staff.data.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center"
		>
			<ShieldIcon class="mb-3 size-8 text-muted-foreground/40" />
			<p class="text-sm font-medium text-muted-foreground">Aucun membre staff enregistré</p>
			<p class="mt-1 text-xs text-muted-foreground/60">
				Mode bootstrap — vous êtes super admin par défaut en tant que premier admin.
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each staff.data as member (member.userId)}
				{@const cfg = roleConfig[member.staffRole]}
				<div
					class="group relative overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-sm"
				>
					<div
						class="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.9),transparent)] dark:bg-[linear-gradient(to_right,transparent,rgb(255_255_255_/_0.2),transparent)]"
					></div>

					<div class="flex items-center gap-4 px-5 py-4">
						<!-- Avatar initiales -->
						<div
							class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground"
						>
							{member.name.charAt(0).toUpperCase()}
						</div>

						<!-- Infos -->
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-foreground">{member.name}</p>
							<p class="truncate text-xs text-muted-foreground">{member.email}</p>
						</div>

						<!-- Badge rôle -->
						<span
							class={cn(
								'shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
								cfg.badgeClass
							)}
						>
							{cfg.label}
						</span>

						<!-- Boutons changement de rôle (hover) -->
						<div
							class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
						>
							{#if member.staffRole === 'concierge'}
								<button
									type="button"
									onclick={() => handlePromoteIntent(member.userId, member.name, member.email)}
									title="Promouvoir Super Admin"
									class="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
								>
									<ShieldIcon class="size-3" />
									Super Admin
								</button>
							{:else}
								<button
									type="button"
									onclick={() => handleRoleChange(member.userId, 'concierge')}
									title="Rétrograder Concierge"
									class="flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									<HeadphonesIcon class="size-3" />
									Concierge
								</button>
							{/if}
						</div>

						<!-- Date ajout -->
						<p class="hidden shrink-0 text-[10px] text-muted-foreground sm:block">
							{new Date(member.addedAt).toLocaleDateString('fr-FR')}
						</p>

						<!-- Suppression avec confirmation inline -->
						{#if confirmRemoveId === member.userId}
							<div class="flex items-center gap-1">
								<span class="text-[11px] text-destructive">Confirmer ?</span>
								<button
									type="button"
									onclick={() => handleRemove(member.userId)}
									class="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive text-white hover:opacity-80"
								>
									<CheckIcon class="size-3.5" />
								</button>
								<button
									type="button"
									onclick={() => {
										confirmRemoveId = null;
									}}
									class="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground"
								>
									<XIcon class="size-3.5" />
								</button>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => {
									confirmRemoveId = member.userId;
								}}
								title="Retirer du staff"
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
							>
								<Trash2Icon class="size-3.5" />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Note de sécurité -->
	<div class="mt-8 rounded-xl border border-border bg-muted/40 px-4 py-3">
		<p class="text-[11px] text-muted-foreground">
			<span class="font-semibold text-foreground">Sécurité :</span>
			Les membres listés ici ont le rôle
			<code class="rounded bg-muted px-1 font-mono text-[10px]">admin</code> dans Better Auth (premier
			filtre JWT) et une fiche staff en base (deuxième filtre). Les clients ORG_ADMIN n'ont jamais accès
			à ces routes — ils utilisent un système de rôles distinct.
		</p>
	</div>
</main>
