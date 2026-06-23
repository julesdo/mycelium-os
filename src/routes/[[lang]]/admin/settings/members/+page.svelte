<script lang="ts">
	import { getContext } from 'svelte';
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge, type BadgeVariant } from '$lib/components/ui/badge/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import MailIcon from '@lucide/svelte/icons/mail';
	import XIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	const client = useConvexClient();
	const currentUserId = getContext<string>('currentUserId');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyApi = api as any;

	const membersQuery = useQuery(anyApi.organizations.listOrganizationMembers, {});
	const invitationsQuery = useQuery(anyApi.organizations.listOrgInvitations, {});
	const myMembershipQuery = useQuery(api.organizations.getMyOrgMembership, {});

	type OrgRole = 'ORG_ADMIN' | 'ORG_MANAGER' | 'ORG_MEMBER';

	type Member = {
		_id: string;
		userId: string;
		role: OrgRole;
		joinedAt: number;
		name: string | null;
		email: string | null;
		image: string | null;
	};

	type Invitation = {
		_id: string;
		email: string;
		role: OrgRole;
		createdAt: number;
		expiresAt: number;
	};

	const members = $derived((membersQuery.data as Member[]) ?? []);
	const invitations = $derived((invitationsQuery.data as Invitation[]) ?? []);
	const isOrgAdmin = $derived(myMembershipQuery.data?.role === 'ORG_ADMIN');

	const ROLE_LABELS: Record<OrgRole, string> = {
		ORG_ADMIN: 'Administrateur',
		ORG_MANAGER: 'Gestionnaire',
		ORG_MEMBER: 'Membre'
	};

	const ROLE_VARIANTS: Record<OrgRole, BadgeVariant> = {
		ORG_ADMIN: 'default',
		ORG_MANAGER: 'secondary',
		ORG_MEMBER: 'ghost'
	};

	function getInitials(name: string | null, email: string | null): string {
		if (name) return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
		return (email?.[0] ?? '?').toUpperCase();
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// --- Role change ---
	let changingRole = $state<string | null>(null);

	async function handleChangeRole(memberId: string, newRole: OrgRole) {
		if (changingRole) return;
		changingRole = memberId;
		try {
			await client.mutation(anyApi.organizations.updateMemberRole, { memberId, role: newRole });
			toast.success('Rôle mis à jour');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de rôle');
		} finally {
			changingRole = null;
		}
	}

	// --- Remove member ---
	let memberToRemove = $state<Member | null>(null);
	let removing = $state(false);

	async function confirmRemoveMember() {
		if (!memberToRemove || removing) return;
		removing = true;
		try {
			await client.mutation(anyApi.organizations.removeOrganizationMember, {
				memberId: memberToRemove._id
			});
			toast.success('Membre retiré de l\'organisation');
			memberToRemove = null;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors du retrait');
		} finally {
			removing = false;
		}
	}

	// --- Cancel invitation ---
	async function handleCancelInvitation(invitationId: string) {
		try {
			await client.mutation(anyApi.organizations.cancelInvitation, { invitationId });
			toast.success('Invitation annulée');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de l'annulation");
		}
	}

	// --- Invite dialog ---
	let showInviteDialog = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state<OrgRole>('ORG_MEMBER');
	let inviting = $state(false);
	let inviteToken = $state<string | null>(null);

	async function handleInvite() {
		if (!inviteEmail.trim()) return;
		inviting = true;
		try {
			const result = await client.mutation(anyApi.organizations.inviteOrganizationMember, {
				email: inviteEmail.trim().toLowerCase(),
				role: inviteRole
			});
			inviteToken = result.token;
			toast.success('Invitation créée');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de la création de l'invitation");
		} finally {
			inviting = false;
		}
	}

	function resetInviteDialog() {
		inviteEmail = '';
		inviteRole = 'ORG_MEMBER';
		inviteToken = null;
		showInviteDialog = false;
	}
</script>

<div class="flex flex-col gap-6">
	<!-- Header -->
	<div class="flex items-center justify-between gap-3">
		<div>
			<h2 class="text-base font-semibold">Membres & invitations</h2>
			<p class="text-sm text-muted-foreground">Gérez les accès à votre espace organisation</p>
		</div>
		{#if isOrgAdmin}
			<Button size="sm" onclick={() => (showInviteDialog = true)}>
				<UserPlusIcon class="size-4" />
				Inviter un membre
			</Button>
		{/if}
	</div>

	<!-- Members table -->
	<Card.Root>
		<Card.Content class="p-0">
			{#if membersQuery.isLoading}
				<div class="divide-y divide-border">
					{#each { length: 4 } as _, i (i)}
						<div class="flex items-center gap-3 px-4 py-3">
							<Skeleton class="size-8 shrink-0 rounded-full" />
							<div class="flex flex-1 flex-col gap-1.5">
								<Skeleton class="h-4 w-32" />
								<Skeleton class="h-3 w-48" />
							</div>
							<Skeleton class="h-5 w-24 rounded-full" />
							<Skeleton class="h-4 w-20" />
						</div>
					{/each}
				</div>
			{:else if !members.length}
				<p class="py-10 text-center text-sm text-muted-foreground">Aucun membre trouvé.</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="pl-4">Membre</Table.Head>
							<Table.Head>Rôle</Table.Head>
							<Table.Head class="hidden sm:table-cell">Rejoint le</Table.Head>
							<Table.Head class="w-10 pr-3"><span class="sr-only">Actions</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each members as member (member._id)}
							{@const displayName = member.name ?? member.email ?? 'Utilisateur'}
							{@const isSelf = member.userId === currentUserId}
							<Table.Row>
								<Table.Cell class="pl-4">
									<div class="flex items-center gap-3">
										<Avatar.Root class="size-8 shrink-0">
											{#if member.image}
												<Avatar.Image
													src={member.image}
													alt={displayName}
													referrerpolicy="no-referrer"
												/>
											{/if}
											<Avatar.Fallback class="text-xs">
												{getInitials(member.name, member.email)}
											</Avatar.Fallback>
										</Avatar.Root>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium leading-tight">
												{displayName}{isSelf ? ' (vous)' : ''}
											</p>
											{#if member.name && member.email}
												<p class="truncate text-xs text-muted-foreground">{member.email}</p>
											{/if}
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={ROLE_VARIANTS[member.role]}>{ROLE_LABELS[member.role]}</Badge>
								</Table.Cell>
								<Table.Cell class="hidden text-sm text-muted-foreground sm:table-cell">
									{formatDate(member.joinedAt)}
								</Table.Cell>
								<Table.Cell class="pr-3">
									{#if isOrgAdmin && !isSelf}
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<Button
														variant="ghost"
														size="icon-sm"
														{...props}
														disabled={changingRole === member._id}
													>
														{#if changingRole === member._id}
															<LoaderCircleIcon class="size-4 animate-spin" />
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
												{#each ['ORG_ADMIN', 'ORG_MANAGER', 'ORG_MEMBER'] as role (role)}
													<DropdownMenu.Item
														onclick={() => handleChangeRole(member._id, role as OrgRole)}
														disabled={member.role === role}
														class="gap-2"
													>
														{ROLE_LABELS[role as OrgRole]}
														{#if member.role === role}
															<CheckIcon class="ml-auto size-3.5 opacity-50" />
														{/if}
													</DropdownMenu.Item>
												{/each}
												<DropdownMenu.Separator />
												<DropdownMenu.Item
													class="text-destructive focus:text-destructive"
													onclick={() => (memberToRemove = member)}
												>
													Retirer de l'organisation
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Pending invitations -->
	{#if isOrgAdmin && invitations.length > 0}
		<Card.Root>
			<Card.Header class="pb-3 pt-4">
				<Card.Title class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<MailIcon class="size-4" />
					Invitations en attente
					<span class="tabular-nums">({invitations.length})</span>
				</Card.Title>
			</Card.Header>
			<Card.Content class="p-0 pb-2">
				<Table.Root>
					<Table.Header>
						<Table.Row class="hover:bg-transparent">
							<Table.Head class="pl-4">Email</Table.Head>
							<Table.Head>Rôle</Table.Head>
							<Table.Head class="hidden sm:table-cell">Expire le</Table.Head>
							<Table.Head class="w-10 pr-3"><span class="sr-only">Annuler</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each invitations as inv (inv._id)}
							<Table.Row>
								<Table.Cell class="pl-4 text-sm">{inv.email}</Table.Cell>
								<Table.Cell>
									<Badge variant={ROLE_VARIANTS[inv.role]}>{ROLE_LABELS[inv.role]}</Badge>
								</Table.Cell>
								<Table.Cell class="hidden text-sm text-muted-foreground sm:table-cell">
									{formatDate(inv.expiresAt)}
								</Table.Cell>
								<Table.Cell class="pr-3">
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => handleCancelInvitation(inv._id)}
										aria-label="Annuler l'invitation"
									>
										<XIcon class="size-4 text-muted-foreground" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Remove member confirmation dialog -->
<Dialog.Root
	open={!!memberToRemove}
	onOpenChange={(v) => {
		if (!v) memberToRemove = null;
	}}
>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Retirer ce membre ?</Dialog.Title>
			<Dialog.Description>
				<strong>{memberToRemove?.name ?? memberToRemove?.email ?? 'Ce membre'}</strong> sera retiré
				de l'organisation. Vous pourrez l'inviter à nouveau ultérieurement.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (memberToRemove = null)} disabled={removing}>
				Annuler
			</Button>
			<Button variant="destructive" onclick={confirmRemoveMember} disabled={removing}>
				{#if removing}
					<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
				{/if}
				Retirer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Invite dialog -->
<Dialog.Root
	open={showInviteDialog}
	onOpenChange={(v) => {
		if (!v) resetInviteDialog();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Inviter un membre</Dialog.Title>
			<Dialog.Description>L'invitation sera valide 7 jours.</Dialog.Description>
		</Dialog.Header>

		{#if inviteToken}
			<div class="flex flex-col gap-4">
				<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
					<p class="mb-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
						Invitation envoyée
					</p>
					<p class="text-xs text-emerald-600/80 dark:text-emerald-400/70">
						Un email a été envoyé à <strong>{inviteEmail}</strong> avec le lien pour rejoindre l'organisation.
					</p>
				</div>
				<div class="flex items-center gap-2">
					<Input value="{window.location.origin}/join/{inviteToken}" readonly class="text-xs text-muted-foreground" />
					<Button
						size="sm"
						variant="outline"
						onclick={() => {
							navigator.clipboard.writeText(`${window.location.origin}/join/${inviteToken}`);
							toast.success('Lien copié');
						}}
					>
						Copier
					</Button>
				</div>
				<Button onclick={resetInviteDialog}>Fermer</Button>
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label for="invite-email">Adresse email</Label>
					<Input
						id="invite-email"
						type="email"
						placeholder="collaborateur@entreprise.com"
						bind:value={inviteEmail}
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label>Rôle</Label>
					<div class="flex gap-2">
						{#each ['ORG_MEMBER', 'ORG_MANAGER', 'ORG_ADMIN'] as role (role)}
							<button
								type="button"
								class="flex flex-1 items-center justify-center rounded-md border px-3 py-2 text-xs font-medium transition-colors {inviteRole ===
								role
									? 'border-primary bg-primary/10 text-primary'
									: 'border-border bg-background text-muted-foreground hover:border-primary/50'}"
								onclick={() => (inviteRole = role as OrgRole)}
							>
								{ROLE_LABELS[role as OrgRole]}
							</button>
						{/each}
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={resetInviteDialog} disabled={inviting}>Annuler</Button>
				<Button onclick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
					{#if inviting}
						<LoaderCircleIcon class="mr-2 size-4 animate-spin" />
					{/if}
					{inviting ? 'Création...' : "Créer l'invitation"}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
