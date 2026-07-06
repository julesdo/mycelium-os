<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { cn } from '$lib/utils.js';
	import { toast } from 'svelte-sonner';
	import SuperAdminConfirmModal from '$lib/components/concierge/super-admin-confirm-modal.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
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

	let showAddForm = $state(false);
	let newEmail = $state('');
	let newRole = $state<'super_admin' | 'concierge'>('concierge');
	let addLoading = $state(false);

	type PendingAction =
		| { type: 'add'; email: string; name: string }
		| { type: 'promote'; userId: string; name: string; email: string };

	let pendingAction = $state<PendingAction | null>(null);
	let modalOpen = $state(false);
	let confirmRemoveId = $state<string | null>(null);

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

	function handlePromoteIntent(userId: string, name: string, email: string) {
		pendingAction = { type: 'promote', userId, name, email };
		modalOpen = true;
	}

	async function handleRoleChange(userId: string, staffRole: 'super_admin' | 'concierge') {
		if (staffRole === 'super_admin') return;
		try {
			await updateRole({ userId, staffRole });
			toast.success('Rôle mis à jour.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		}
	}

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
			icon: ShieldIcon
		},
		concierge: {
			label: 'Concierge',
			description: 'File de tâches clients, actions rapides',
			icon: HeadphonesIcon
		}
	};
</script>

<svelte:head>
	<title>Équipe Mycelium — Fleet Care</title>
</svelte:head>

<SuperAdminConfirmModal
	open={modalOpen}
	targetName={pendingAction?.name ?? ''}
	targetEmail={pendingAction?.type === 'add' ? pendingAction.email : (pendingAction?.email ?? '')}
	action={pendingAction?.type === 'add' ? 'add' : 'promote'}
	onconfirm={handleModalConfirm}
	oncancel={handleModalCancel}
/>

<main class="mx-auto max-w-screen-lg px-6 py-8">
	<!-- En-tête -->
	<div class="mb-8 flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Équipe Mycelium</h1>
			<p class="text-sm text-muted-foreground">
				Gérez qui a accès à l'espace interne Fleet Care. Réservé aux super admins.
			</p>
		</div>
		<Button onclick={() => { showAddForm = !showAddForm; }}>
			<PlusIcon class="size-4" />
			Ajouter un membre
		</Button>
	</div>

	<!-- Formulaire ajout -->
	{#if showAddForm}
		<div class="relative mb-6 overflow-hidden rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/5 p-5">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"></div>
			<p class="mb-1 text-sm font-semibold text-foreground">Ajouter un membre staff</p>
			<p class="mb-4 text-xs text-muted-foreground">
				L'utilisateur doit déjà avoir créé son compte sur Mycelium. Entrez son email exact.
			</p>

			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Input
					type="email"
					placeholder="prenom@mycelium.io"
					bind:value={newEmail}
					class="flex-1"
					onkeydown={(e) => { if (e.key === 'Enter') handleAddIntent(); }}
				/>

				<!-- Sélecteur rôle — toggle pattern validé -->
				<div class="flex gap-2">
					{#each ['concierge', 'super_admin'] as const as role (role)}
						{@const cfg = roleConfig[role]}
						<button
							type="button"
							onclick={() => { newRole = role; }}
							class={cn(
								'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-all',
								newRole === role
									? role === 'super_admin'
										? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
										: 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand-foreground)]'
									: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
							)}
						>
							<cfg.icon class="size-3.5" />
							{cfg.label}
						</button>
					{/each}
				</div>

				<div class="flex items-center gap-2">
					<Button onclick={handleAddIntent} disabled={addLoading || !newEmail.trim()}>
						{#if newRole === 'super_admin'}
							<ShieldIcon class="size-4 text-amber-400" />
						{:else}
							<CheckIcon class="size-4" />
						{/if}
						{newRole === 'super_admin' ? 'Continuer…' : 'Confirmer'}
					</Button>
					<Button variant="outline" onclick={() => { showAddForm = false; newEmail = ''; }}>
						<XIcon class="size-4" />
						Annuler
					</Button>
				</div>
			</div>

			<p class="mt-3 text-xs text-muted-foreground">
				<span class="font-semibold">{roleConfig[newRole].label} :</span>
				{roleConfig[newRole].description}
				{#if newRole === 'super_admin'}
					<span class="ml-1 font-semibold text-amber-600 dark:text-amber-400">
						Une confirmation supplémentaire sera demandée.
					</span>
				{/if}
			</p>
		</div>
	{/if}

	<!-- Liste membres -->
	{#if staff.isLoading}
		<div class="space-y-3">
			{#each { length: 3 } as _, i (i)}
				<Skeleton class="h-16 rounded-xl" />
			{/each}
		</div>
	{:else if !staff.data || staff.data.length === 0}
		<div class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
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
				<div class="group relative overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-sm">
					<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"></div>

					<div class="flex items-center gap-4 px-5 py-4">
						<!-- Avatar initiales -->
						<div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground">
							{member.name.charAt(0).toUpperCase()}
						</div>

						<!-- Infos -->
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-foreground">{member.name}</p>
							<p class="truncate text-xs text-muted-foreground">{member.email}</p>
						</div>

						<!-- Badge rôle -->
						{#if member.staffRole === 'super_admin'}
							<Badge class="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
								<ShieldIcon class="size-3" />
								{cfg.label}
							</Badge>
						{:else}
							<Badge variant="secondary" class="shrink-0">
								<HeadphonesIcon class="size-3" />
								{cfg.label}
							</Badge>
						{/if}

						<!-- Boutons changement de rôle (hover) -->
						<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
							{#if member.staffRole === 'concierge'}
								<Button
									variant="ghost"
									size="xs"
									onclick={() => handlePromoteIntent(member.userId, member.name, member.email)}
									class="border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
								>
									<ShieldIcon class="size-3" />
									Super Admin
								</Button>
							{:else}
								<Button
									variant="ghost"
									size="xs"
									onclick={() => handleRoleChange(member.userId, 'concierge')}
								>
									<HeadphonesIcon class="size-3" />
									Concierge
								</Button>
							{/if}
						</div>

						<!-- Date ajout -->
						<p class="hidden shrink-0 text-[10px] text-muted-foreground sm:block">
							{new Date(member.addedAt).toLocaleDateString('fr-FR')}
						</p>

						<!-- Suppression -->
						{#if confirmRemoveId === member.userId}
							<div class="flex items-center gap-1.5">
								<span class="text-xs text-destructive">Confirmer ?</span>
								<Button variant="danger" size="icon-xs" onclick={() => handleRemove(member.userId)}>
									<CheckIcon class="size-3.5" />
								</Button>
								<Button variant="outline" size="icon-xs" onclick={() => { confirmRemoveId = null; }}>
									<XIcon class="size-3.5" />
								</Button>
							</div>
						{:else}
							<Button
								variant="ghost"
								size="icon-sm"
								onclick={() => { confirmRemoveId = member.userId; }}
								class="shrink-0 opacity-0 transition-all group-hover:opacity-100 hover:text-destructive"
							>
								<Trash2Icon class="size-3.5" />
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Note de sécurité -->
	<div class="mt-8 rounded-xl border border-border bg-muted/40 px-4 py-3">
		<p class="text-xs text-muted-foreground">
			<span class="font-semibold text-foreground">Sécurité :</span>
			Les membres listés ici ont le rôle
			<code class="rounded bg-muted px-1 font-mono text-[10px]">admin</code> dans Better Auth (premier
			filtre JWT) et une fiche staff en base (deuxième filtre). Les clients ORG_ADMIN n'ont jamais
			accès à ces routes.
		</p>
	</div>
</main>
