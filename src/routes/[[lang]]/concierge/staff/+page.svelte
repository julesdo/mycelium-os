<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import SuperAdminConfirmModal from '$lib/components/concierge/super-admin-confirm-modal.svelte';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import MoreHorizontalIcon from '@lucide/svelte/icons/ellipsis';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CheckIcon from '@lucide/svelte/icons/check';

	const staff = useQuery(api['concierge/staff'].listMyceliumStaff, {});
	const addMember = useMutation(api['concierge/staff'].addStaffMember);
	const updateRole = useMutation(api['concierge/staff'].updateStaffRole);
	const removeMember = useMutation(api['concierge/staff'].removeStaffMember);

	// --- Ajout ---
	let showAddDialog = $state(false);
	let newEmail = $state('');
	let newRole = $state<'super_admin' | 'concierge'>('concierge');
	let addLoading = $state(false);

	function resetAddDialog() {
		newEmail = '';
		newRole = 'concierge';
		showAddDialog = false;
	}

	function handleAddIntent() {
		if (!newEmail.trim()) return;
		if (newRole === 'super_admin') {
			pendingAction = { type: 'add', email: newEmail.trim(), name: newEmail.trim() };
			showAddDialog = false;
			modalOpen = true;
		} else {
			executeAdd(newEmail.trim(), 'concierge');
		}
	}

	async function executeAdd(email: string, staffRole: 'super_admin' | 'concierge') {
		addLoading = true;
		try {
			await addMember({ email, staffRole });
			toast.success(`${email} ajouté(e) en tant que ${roleConfig[staffRole].label}.`);
			resetAddDialog();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
		} finally {
			addLoading = false;
		}
	}

	// --- Changement de rôle ---
	let changingRoleId = $state<string | null>(null);

	async function handleRoleChange(userId: string, staffRole: 'super_admin' | 'concierge') {
		changingRoleId = userId;
		try {
			await updateRole({ userId, staffRole });
			toast.success('Rôle mis à jour.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		} finally {
			changingRoleId = null;
		}
	}

	// --- Suppression ---
	let memberToRemove = $state<{ userId: string; name: string } | null>(null);
	let removing = $state(false);

	async function confirmRemove() {
		if (!memberToRemove || removing) return;
		removing = true;
		try {
			await removeMember({ userId: memberToRemove.userId });
			toast.success('Membre retiré du staff Mycelium.');
			memberToRemove = null;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		} finally {
			removing = false;
		}
	}

	// --- Confirmation promotion super_admin ---
	type PendingAction =
		| { type: 'add'; email: string; name: string }
		| { type: 'promote'; userId: string; name: string; email: string };

	let pendingAction = $state<PendingAction | null>(null);
	let modalOpen = $state(false);

	function handlePromoteIntent(userId: string, name: string, email: string) {
		pendingAction = { type: 'promote', userId, name, email };
		modalOpen = true;
	}

	async function handleModalConfirm() {
		modalOpen = false;
		if (!pendingAction) return;
		if (pendingAction.type === 'add') {
			await executeAdd(pendingAction.email, 'super_admin');
		} else {
			changingRoleId = pendingAction.userId;
			try {
				await updateRole({ userId: pendingAction.userId, staffRole: 'super_admin' });
				toast.success(`${pendingAction.name} est maintenant Super Admin.`);
			} catch (err: unknown) {
				toast.error(err instanceof Error ? err.message : 'Erreur.');
			} finally {
				changingRoleId = null;
			}
		}
		pendingAction = null;
	}

	// --- Config rôles ---
	const roleConfig = {
		super_admin: { label: 'Super Admin', icon: ShieldIcon },
		concierge: { label: 'Concierge', icon: HeadphonesIcon }
	};

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}
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
	oncancel={() => { modalOpen = false; pendingAction = null; }}
/>

<div class="flex flex-col gap-6 px-4 pt-5 pb-8 md:pt-7 lg:px-6 xl:px-8 2xl:px-16">

	<!-- Header -->
	<div class="flex items-center justify-between gap-3">
		<div>
			<h1 class="text-base font-semibold tracking-tight">Équipe Mycelium</h1>
			<p class="mt-0.5 text-[13px] text-muted-foreground">
				Accès à l'espace interne Fleet Care — réservé aux super admins.
			</p>
		</div>
		<Button size="sm" onclick={() => (showAddDialog = true)}>
			<UserPlusIcon class="size-4" />
			Ajouter un membre
		</Button>
	</div>

	<!-- Table membres -->
	<Card.Root>
		<Card.Content class="p-0">
			{#if staff.isLoading}
				<div class="divide-y divide-border">
					{#each { length: 3 } as _, i (i)}
						<div class="flex items-center gap-3 px-4 py-3">
							<Skeleton class="size-8 shrink-0 rounded-full" />
							<div class="flex flex-1 flex-col gap-1.5">
								<Skeleton class="h-4 w-28" />
								<Skeleton class="h-3 w-40" />
							</div>
							<Skeleton class="h-5 w-20 rounded-full" />
							<Skeleton class="h-4 w-16" />
						</div>
					{/each}
				</div>
			{:else if !staff.data || staff.data.length === 0}
				<div class="flex flex-col items-center justify-center py-14 text-center">
					<ShieldIcon class="mb-3 size-7 text-muted-foreground/30" />
					<p class="text-sm font-medium text-muted-foreground">Aucun membre staff enregistré</p>
					<p class="mt-1 text-xs text-muted-foreground/50">
						Mode bootstrap — vous êtes super admin implicite (table vide).
					</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="pl-4">Membre</Table.Head>
							<Table.Head>Rôle</Table.Head>
							<Table.Head class="hidden sm:table-cell">Ajouté le</Table.Head>
							<Table.Head class="w-10 pr-3">
								<span class="sr-only">Actions</span>
							</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each staff.data as member (member.userId)}
							{@const cfg = roleConfig[member.staffRole]}
							<Table.Row>
								<Table.Cell class="pl-4">
									<div class="flex items-center gap-3">
										<Avatar.Root class="size-8 shrink-0">
											<Avatar.Fallback class="text-xs">
												{getInitials(member.name)}
											</Avatar.Fallback>
										</Avatar.Root>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium leading-tight">{member.name}</p>
											<p class="truncate text-xs text-muted-foreground">{member.email}</p>
										</div>
									</div>
								</Table.Cell>

								<Table.Cell>
									{#if member.staffRole === 'super_admin'}
										<Badge class="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
											<ShieldIcon class="size-3" />
											{cfg.label}
										</Badge>
									{:else}
										<Badge variant="secondary">
											<HeadphonesIcon class="size-3" />
											{cfg.label}
										</Badge>
									{/if}
								</Table.Cell>

								<Table.Cell class="hidden text-sm text-muted-foreground sm:table-cell">
									{formatDate(member.addedAt)}
								</Table.Cell>

								<Table.Cell class="pr-3">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button
													variant="ghost"
													size="icon-sm"
													{...props}
													disabled={changingRoleId === member.userId}
												>
													{#if changingRoleId === member.userId}
														<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
													{:else}
														<MoreHorizontalIcon class="size-4" />
													{/if}
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Label class="text-xs font-medium text-muted-foreground">
												Changer le rôle
											</DropdownMenu.Label>
											<DropdownMenu.Item
												class="gap-2"
												disabled={member.staffRole === 'concierge'}
												onclick={() => handleRoleChange(member.userId, 'concierge')}
											>
												<HeadphonesIcon class="size-3.5" />
												Concierge
												{#if member.staffRole === 'concierge'}
													<CheckIcon class="ml-auto size-3.5 opacity-50" />
												{/if}
											</DropdownMenu.Item>
											<DropdownMenu.Item
												class="gap-2"
												disabled={member.staffRole === 'super_admin'}
												onclick={() => handlePromoteIntent(member.userId, member.name, member.email)}
											>
												<ShieldIcon class="size-3.5 text-amber-500" />
												Super Admin
												{#if member.staffRole === 'super_admin'}
													<CheckIcon class="ml-auto size-3.5 opacity-50" />
												{/if}
											</DropdownMenu.Item>
											<DropdownMenu.Separator />
											<DropdownMenu.Item
												class="text-destructive focus:text-destructive"
												onclick={() => (memberToRemove = { userId: member.userId, name: member.name })}
											>
												Retirer du staff
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Note sécurité -->
	<p class="text-xs text-muted-foreground">
		<span class="font-semibold text-foreground">Sécurité :</span>
		Chaque membre a le rôle
		<code class="rounded bg-muted px-1 font-mono text-[10px]">admin</code>
		dans Better Auth + une fiche en base. Double verrou — les clients ORG_ADMIN n'ont jamais accès.
	</p>
</div>

<!-- Dialog ajouter un membre -->
<Dialog.Root
	open={showAddDialog}
	onOpenChange={(v) => { if (!v) resetAddDialog(); }}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Ajouter un membre staff</Dialog.Title>
			<Dialog.Description>
				L'utilisateur doit déjà avoir créé son compte sur Mycelium.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<Label for="staff-email">Adresse email</Label>
				<Input
					id="staff-email"
					type="email"
					placeholder="prenom@mycelium.io"
					bind:value={newEmail}
					onkeydown={(e) => { if (e.key === 'Enter') handleAddIntent(); }}
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<Label>Rôle</Label>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => (newRole = 'concierge')}
						class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all {newRole === 'concierge'
							? 'border-[var(--brand)]/60 bg-[var(--brand)]/8 text-foreground'
							: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
					>
						<HeadphonesIcon class="size-4" />
						Concierge
					</button>
					<button
						type="button"
						onclick={() => (newRole = 'super_admin')}
						class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all {newRole === 'super_admin'
							? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
							: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
					>
						<ShieldIcon class="size-4" />
						Super Admin
					</button>
				</div>
				<p class="text-xs text-muted-foreground">
					{newRole === 'super_admin'
						? 'Accès complet — toutes orgs, billing, gestion équipe. Une confirmation sera demandée.'
						: 'File de tâches clients et actions rapides.'}
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={resetAddDialog} disabled={addLoading}>Annuler</Button>
			<Button
				onclick={handleAddIntent}
				disabled={addLoading || !newEmail.trim()}
				class={newRole === 'super_admin' ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400' : ''}
				variant={newRole === 'super_admin' ? 'outline' : 'default'}
			>
				{#if addLoading}
					<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
				{:else if newRole === 'super_admin'}
					<ShieldIcon class="size-4" />
				{/if}
				{addLoading ? 'Ajout…' : newRole === 'super_admin' ? 'Continuer…' : 'Ajouter'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Dialog confirmation suppression -->
<Dialog.Root
	open={!!memberToRemove}
	onOpenChange={(v) => { if (!v) memberToRemove = null; }}
>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Retirer ce membre ?</Dialog.Title>
			<Dialog.Description>
				<strong>{memberToRemove?.name ?? 'Ce membre'}</strong> perdra l'accès à l'espace concierge.
				Son compte Mycelium reste intact.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (memberToRemove = null)} disabled={removing}>
				Annuler
			</Button>
			<Button variant="destructive" onclick={confirmRemove} disabled={removing}>
				{#if removing}
					<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
				{/if}
				Retirer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
