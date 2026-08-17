<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { toast } from 'svelte-sonner';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import SuperAdminConfirmModal from '$lib/components/concierge/super-admin-confirm-modal.svelte';
	import ConciergeOrgAccessDialog from '$lib/components/concierge/ConciergeOrgAccessDialog.svelte';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import MoreHorizontalIcon from '@lucide/svelte/icons/ellipsis';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CheckIcon from '@lucide/svelte/icons/check';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import LinkIcon from '@lucide/svelte/icons/link';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import BuildingIcon from '@lucide/svelte/icons/building-2';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const staff = useQuery(api['concierge/staff'].listMyceliumStaff, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const myProfile = useQuery((api as any)['concierge/staff'].getMyStaffProfile, {});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const pendingInvites = useQuery((api as any)['concierge/staff'].listStaffInvitations, {});

	const addMember = useMutation(api['concierge/staff'].addStaffMember);
	const updateRole = useMutation(api['concierge/staff'].updateStaffRole);
	const removeMember = useMutation(api['concierge/staff'].removeStaffMember);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const updateMyProfile = useMutation((api as any)['concierge/staff'].updateMyProfile);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const generateAvatarUploadUrl = useMutation((api as any)['concierge/staff'].generateAvatarUploadUrl);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const saveAvatarUrl = useMutation((api as any)['concierge/staff'].saveAvatarUrl);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const createInvitation = useMutation((api as any)['concierge/staff'].createStaffInvitation);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const revokeInvitation = useMutation((api as any)['concierge/staff'].revokeStaffInvitation);

	// ── Mon profil ─────────────────────────────────────────────────────────────
	let editingProfile = $state(false);
	let profileBio = $state('');
	let profileSaving = $state(false);
	let avatarUploading = $state(false);

	const AVAILABILITY_OPTIONS = [
		{ value: 'online',  label: 'En ligne',   dot: 'bg-emerald-500', desc: 'Visible et disponible immédiatement' },
		{ value: 'busy',    label: 'Occupé',     dot: 'bg-amber-400',   desc: 'Visible mais réponse dans l\'heure' },
		{ value: 'offline', label: 'Hors ligne', dot: 'bg-muted-foreground/30', desc: 'Non visible côté clients' }
	] as const;

	function startEditProfile() {
		profileBio = myProfile.data?.bio ?? '';
		editingProfile = true;
	}

	async function saveProfile() {
		profileSaving = true;
		try {
			await updateMyProfile({
				bio: profileBio.trim() || undefined
			});
			toast.success('Profil mis à jour.');
			editingProfile = false;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		} finally {
			profileSaving = false;
		}
	}

	async function toggleAvailability(status: 'online' | 'busy' | 'offline') {
		try {
			await updateMyProfile({ availabilityStatus: status });
			toast.success(`Statut mis à jour : ${AVAILABILITY_OPTIONS.find((o) => o.value === status)?.label}.`);
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		}
	}

	async function handleAvatarUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			toast.error('Photo trop lourde (max 2 Mo).');
			return;
		}

		avatarUploading = true;
		try {
			const uploadUrl = await generateAvatarUploadUrl({});
			const uploadRes = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!uploadRes.ok) throw new Error('Upload échoué');
			const { storageId } = await uploadRes.json() as { storageId: string };
			await saveAvatarUrl({ storageId });
			toast.success('Photo de profil mise à jour.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload.");
		} finally {
			avatarUploading = false;
		}
	}

	// ── Génération de lien d'invitation ────────────────────────────────────────
	let showInviteDialog = $state(false);
	let inviteRole = $state<'SUPER_ADMIN' | 'OPERATOR'>('OPERATOR');
	let inviteEmail = $state('');
	let inviteGenerating = $state(false);
	let generatedToken = $state<string | null>(null);
	let copiedToken = $state(false);

	function resetInviteDialog() {
		showInviteDialog = false;
		inviteRole = 'OPERATOR';
		inviteEmail = '';
		inviteGenerating = false;
		generatedToken = null;
		copiedToken = false;
	}

	async function generateInviteLink() {
		if (inviteGenerating) return;
		inviteGenerating = true;
		try {
			const result = await createInvitation({
				staffRole: inviteRole,
				invitedEmail: inviteEmail.trim() || undefined
			}) as { token: string };
			generatedToken = result.token;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération.');
		} finally {
			inviteGenerating = false;
		}
	}

	function getInviteUrl(token: string): string {
		const path = resolve(localizedHref(`/staff-join/${token}`));
		return `${page.url.origin}${path}`;
	}

	async function copyInviteLink(token: string) {
		try {
			await navigator.clipboard.writeText(getInviteUrl(token));
			copiedToken = true;
			setTimeout(() => (copiedToken = false), 2000);
		} catch {
			toast.error('Impossible de copier — copiez le lien manuellement.');
		}
	}

	async function handleRevoke(invitationId: string) {
		try {
			await revokeInvitation({ invitationId });
			toast.success('Invitation révoquée.');
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Erreur.');
		}
	}

	function formatExpiry(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	// ── Ajout membre ────────────────────────────────────────────────────────────
	let showAddDialog = $state(false);
	let newEmail = $state('');
	let newRole = $state<'SUPER_ADMIN' | 'OPERATOR'>('OPERATOR');
	let addLoading = $state(false);

	function resetAddDialog() {
		newEmail = '';
		newRole = 'OPERATOR';
		showAddDialog = false;
	}

	function handleAddIntent() {
		if (!newEmail.trim()) return;
		if (newRole === 'SUPER_ADMIN') {
			pendingAction = { type: 'add', email: newEmail.trim(), name: newEmail.trim() };
			showAddDialog = false;
			modalOpen = true;
		} else {
			executeAdd(newEmail.trim(), 'OPERATOR');
		}
	}

	async function executeAdd(email: string, staffRole: 'SUPER_ADMIN' | 'OPERATOR') {
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

	// ── Changement de rôle ──────────────────────────────────────────────────────
	let changingRoleId = $state<string | null>(null);

	async function handleRoleChange(userId: string, staffRole: 'SUPER_ADMIN' | 'OPERATOR') {
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

	// ── Suppression ────────────────────────────────────────────────────────────
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

	// ── Confirmation promotion super_admin ─────────────────────────────────────
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
			await executeAdd(pendingAction.email, 'SUPER_ADMIN');
		} else {
			changingRoleId = pendingAction.userId;
			try {
				await updateRole({ userId: pendingAction.userId, staffRole: 'SUPER_ADMIN' });
				toast.success(`${pendingAction.name} est maintenant Super Admin.`);
			} catch (err: unknown) {
				toast.error(err instanceof Error ? err.message : 'Erreur.');
			} finally {
				changingRoleId = null;
			}
		}
		pendingAction = null;
	}

	// ── Gestion accès orgs par concierge ───────────────────────────────────────
	let orgAccessTarget = $state<{ userId: string; name: string } | null>(null);

	const roleConfig = {
		SUPER_ADMIN: { label: 'Super Admin', icon: ShieldIcon },
		OPERATOR: { label: 'Opérateur', icon: HeadphonesIcon }
	};

	function getInitials(name: string): string {
		return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Équipe Mycelium — Fleet Care</title>
</svelte:head>

{#if orgAccessTarget}
	<ConciergeOrgAccessDialog
		open={!!orgAccessTarget}
		conciergeUserId={orgAccessTarget.userId}
		conciergeName={orgAccessTarget.name}
		onclose={() => (orgAccessTarget = null)}
	/>
{/if}

<SuperAdminConfirmModal
	open={modalOpen}
	targetName={pendingAction?.name ?? ''}
	targetEmail={pendingAction?.type === 'add' ? pendingAction.email : (pendingAction?.email ?? '')}
	action={pendingAction?.type === 'add' ? 'add' : 'promote'}
	onconfirm={handleModalConfirm}
	oncancel={() => { modalOpen = false; pendingAction = null; }}
/>

<div class="flex flex-col gap-6 px-4 pt-5 pb-8 md:pt-7 lg:px-6 xl:px-8 2xl:px-16">

	<!-- ── Mon profil ──────────────────────────────────────────────────────── -->
	{#if myProfile.data}
		{@const me = myProfile.data}
		{@const currentStatus = AVAILABILITY_OPTIONS.find((o) => o.value === (me.availabilityStatus ?? 'offline'))}

		<div class="relative overflow-hidden rounded-2xl border border-border bg-card shadow-glass-card">
			<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/14"></div>
			<div class="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[var(--brand)]/6 to-transparent"></div>

			<div class="relative p-5">
				<div class="mb-4 flex items-start justify-between gap-3">
					<h2 class="text-sm font-semibold">Mon profil concierge</h2>
					{#if !editingProfile}
						<Button variant="ghost" size="sm" onclick={startEditProfile} class="h-7 gap-1.5 text-xs">
							<PencilIcon class="size-3" />
							Modifier
						</Button>
					{/if}
				</div>

				<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
					<!-- Avatar upload -->
					<div class="flex shrink-0 flex-col items-center gap-2">
						<label class="group relative cursor-pointer" title="Changer la photo">
							<div class="size-20 overflow-hidden rounded-2xl ring-2 ring-border transition-shadow group-hover:ring-ring">
								{#if me.avatarUrl}
									<img src={me.avatarUrl} alt={me.name} class="h-full w-full object-cover" />
								{:else}
									<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-xl font-bold text-white">
										{getInitials(me.name)}
									</div>
								{/if}
								<!-- Overlay upload -->
								<div class="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
									{#if avatarUploading}
										<LoaderCircleIcon class="size-5 text-white motion-safe:animate-spin" />
									{:else}
										<CameraIcon class="size-5 text-white" />
									{/if}
								</div>
							</div>
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp"
								class="sr-only"
								onchange={handleAvatarUpload}
								disabled={avatarUploading}
							/>
						</label>
						<p class="text-center text-[10px] text-muted-foreground">JPEG · PNG · 2 Mo max</p>
					</div>

					<!-- Infos + disponibilité -->
					<div class="flex min-w-0 flex-1 flex-col gap-4">
						<div>
							<p class="text-base font-bold leading-tight">{me.name}</p>
							<p class="text-xs text-muted-foreground">{me.email}</p>
						</div>

						<!-- Statut de disponibilité -->
						<div class="flex flex-col gap-1.5">
							<p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Disponibilité</p>
							<div class="flex gap-2">
								{#each AVAILABILITY_OPTIONS as opt (opt.value)}
									<button
										type="button"
										onclick={() => toggleAvailability(opt.value)}
										class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-semibold transition-all {(me.availabilityStatus ?? 'offline') === opt.value
											? 'border-border bg-muted text-foreground shadow-glass-card'
											: 'border-border/40 text-muted-foreground hover:border-border hover:bg-muted/40'}"
									>
										<span class="size-2 rounded-full {opt.dot}"></span>
										{opt.label}
									</button>
								{/each}
							</div>
							{#if currentStatus}
								<p class="text-[11px] text-muted-foreground">{currentStatus.desc}</p>
							{/if}
						</div>

						{#if !editingProfile}
							<!-- Aperçu profil -->
							{#if me.bio}
								<div class="flex flex-col gap-1">
									<p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bio</p>
									<p class="text-sm">{me.bio}</p>
								</div>
							{/if}
						{:else}
							<!-- Édition profil -->
							<div class="flex flex-col gap-3">
								<div class="flex flex-col gap-1.5">
									<Label for="bio-input" class="text-[11px] uppercase tracking-wide text-muted-foreground">Bio (1 ligne)</Label>
									<Input
										id="bio-input"
										bind:value={profileBio}
										placeholder="Ex : Spécialiste maintenance & conformité UK"
										class="text-sm"
										maxlength={80}
									/>
									<p class="text-right text-[10px] text-muted-foreground/50">{profileBio.length}/80</p>
								</div>

								<div class="flex justify-end gap-2">
									<Button variant="outline" size="sm" onclick={() => (editingProfile = false)} disabled={profileSaving}>
										Annuler
									</Button>
									<Button size="sm" onclick={saveProfile} disabled={profileSaving}>
										{#if profileSaving}
											<LoaderCircleIcon class="size-3.5 motion-safe:animate-spin" />
										{:else}
											<CheckIcon class="size-3.5" />
										{/if}
										Enregistrer
									</Button>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Header équipe ──────────────────────────────────────────────────── -->
	<div class="flex items-center justify-between gap-3">
		<div>
			<h1 class="text-base font-semibold tracking-tight">Équipe Mycelium</h1>
			<p class="mt-0.5 text-[13px] text-muted-foreground">
				Accès à l'espace interne Fleet Care — réservé aux super admins.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button size="sm" variant="outline" onclick={() => (showAddDialog = true)} class="gap-1.5">
				<UserPlusIcon class="size-3.5" />
				<span class="hidden sm:inline">Ajouter (inscrit)</span>
			</Button>
			<Button size="sm" onclick={() => (showInviteDialog = true)} class="gap-1.5">
				<LinkIcon class="size-3.5" />
				Lien d'invitation
			</Button>
		</div>
	</div>

	<!-- ── Table membres ──────────────────────────────────────────────────── -->
	<Card.Root>
		<Card.Content class="p-0">
			{#if staff.isLoading}
				<div class="divide-y divide-border">
					{#each { length: 3 } as _, i (i)}
						<div class="flex items-center gap-3 px-4 py-3">
							<Skeleton class="size-10 shrink-0 rounded-full" />
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
							<Table.Head class="hidden sm:table-cell">Disponibilité</Table.Head>
							<Table.Head class="hidden md:table-cell">Ajouté le</Table.Head>
							<Table.Head class="w-10 pr-3">
								<span class="sr-only">Actions</span>
							</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each staff.data as member (member.userId)}
							{@const cfg = roleConfig[member.staffRole]}
							{@const isMe = member.userId === myProfile.data?.userId}
							<Table.Row>
								<Table.Cell class="pl-4">
									<div class="flex items-center gap-3">
										<!-- Avatar avec disponibilité -->
										<div class="relative shrink-0">
											<div class="size-9 overflow-hidden rounded-full ring-1 ring-border">
												{#if member.avatarUrl}
													<img src={member.avatarUrl} alt={member.name} class="h-full w-full object-cover" />
												{:else}
													<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-[11px] font-bold text-white">
														{getInitials(member.name)}
													</div>
												{/if}
											</div>
											{#if member.availabilityStatus}
												<span class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background {
													member.availabilityStatus === 'online' ? 'bg-emerald-500' :
													member.availabilityStatus === 'busy' ? 'bg-amber-400' :
													'bg-muted-foreground/30'
												}"></span>
											{/if}
										</div>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium leading-tight">
												{member.name}
												{#if isMe}
													<span class="ml-1 text-[10px] font-normal text-muted-foreground">(moi)</span>
												{/if}
											</p>
											<p class="truncate text-xs text-muted-foreground">{member.email}</p>
											{#if member.bio}
												<p class="truncate text-[11px] text-muted-foreground/60">{member.bio}</p>
											{/if}
										</div>
									</div>
								</Table.Cell>

								<Table.Cell>
									{#if member.staffRole === 'SUPER_ADMIN'}
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

								<Table.Cell class="hidden sm:table-cell">
									{#if member.availabilityStatus}
										<div class="flex items-center gap-1.5">
											<span class="size-2 rounded-full {
												member.availabilityStatus === 'online' ? 'bg-emerald-500' :
												member.availabilityStatus === 'busy' ? 'bg-amber-400' :
												'bg-muted-foreground/30'
											}"></span>
											<span class="text-xs text-muted-foreground capitalize">
												{member.availabilityStatus === 'online' ? 'En ligne' :
												 member.availabilityStatus === 'busy' ? 'Occupé' : 'Hors ligne'}
											</span>
										</div>
									{:else}
										<span class="text-xs text-muted-foreground/40">Non défini</span>
									{/if}
								</Table.Cell>

								<Table.Cell class="hidden text-sm text-muted-foreground md:table-cell">
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
												disabled={member.staffRole === 'OPERATOR'}
												onclick={() => handleRoleChange(member.userId, 'OPERATOR')}
											>
												<HeadphonesIcon class="size-3.5" />
												Concierge
												{#if member.staffRole === 'OPERATOR'}
													<CheckIcon class="ml-auto size-3.5 opacity-50" />
												{/if}
											</DropdownMenu.Item>
											<DropdownMenu.Item
												class="gap-2"
												disabled={member.staffRole === 'SUPER_ADMIN'}
												onclick={() => handlePromoteIntent(member.userId, member.name, member.email)}
											>
												<ShieldIcon class="size-3.5 text-amber-500" />
												Super Admin
												{#if member.staffRole === 'SUPER_ADMIN'}
													<CheckIcon class="ml-auto size-3.5 opacity-50" />
												{/if}
											</DropdownMenu.Item>
											{#if member.staffRole === 'OPERATOR'}
											<DropdownMenu.Separator />
											<DropdownMenu.Item
												class="gap-2"
												onclick={() => (orgAccessTarget = { userId: member.userId, name: member.name })}
											>
												<BuildingIcon class="size-3.5" />
												Gérer l'accès aux orgs
											</DropdownMenu.Item>
										{/if}
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

	<p class="text-xs text-muted-foreground">
		<span class="font-semibold text-foreground">Sécurité :</span>
		Chaque membre a le rôle
		<code class="rounded bg-muted px-1 font-mono text-[10px]">admin</code>
		dans Better Auth + une fiche en base. Double verrou — les clients ORG_ADMIN n'ont jamais accès.
	</p>

	<!-- ── Invitations en attente ─────────────────────────────────────────── -->
	{#if pendingInvites.data && pendingInvites.data.length > 0}
		<div class="flex flex-col gap-3">
			<h2 class="text-sm font-semibold">Invitations en attente</h2>
			<div class="flex flex-col gap-2">
				{#each pendingInvites.data as inv (inv._id)}
					{@const cfg = roleConfig[inv.staffRole as 'SUPER_ADMIN' | 'OPERATOR']}
					<div class="relative overflow-hidden rounded-xl border border-border bg-card px-4 py-3">
						<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"></div>
						<div class="flex items-center justify-between gap-3">
							<div class="flex items-center gap-3 min-w-0">
								<div class="flex size-8 shrink-0 items-center justify-center rounded-lg {inv.staffRole === 'SUPER_ADMIN' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-violet-50 dark:bg-violet-950/30'}">
									{#if inv.staffRole === 'SUPER_ADMIN'}
										<ShieldIcon class="size-4 text-amber-500" />
									{:else}
										<HeadphonesIcon class="size-4 text-violet-500" />
									{/if}
								</div>
								<div class="min-w-0">
									<p class="text-sm font-medium leading-tight">{cfg.label}</p>
									<p class="text-[11px] text-muted-foreground">
										{#if inv.invitedEmail}
											<span class="font-medium">{inv.invitedEmail}</span> ·{' '}
										{/if}
										Expire le {formatExpiry(inv.expiresAt)}
									</p>
								</div>
							</div>
							<div class="flex shrink-0 items-center gap-1.5">
								<Button
									size="sm"
									variant="outline"
									onclick={() => copyInviteLink(inv.token)}
									class="h-7 gap-1.5 text-xs"
								>
									{#if copiedToken}
										<CheckIcon class="size-3 text-emerald-500" />
										Copié
									{:else}
										<CopyIcon class="size-3" />
										Copier
									{/if}
								</Button>
								<Button
									size="icon-sm"
									variant="ghost"
									onclick={() => handleRevoke(inv._id)}
									class="size-7 text-muted-foreground hover:text-destructive"
									title="Révoquer"
								>
									<Trash2Icon class="size-3.5" />
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Dialog génération lien d'invitation -->
<Dialog.Root
	open={showInviteDialog}
	onOpenChange={(v) => { if (!v) resetInviteDialog(); }}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Générer un lien d'invitation</Dialog.Title>
			<Dialog.Description>
				Le lien est valide 7 jours, à usage unique. La personne peut créer son compte ou s'y connecter.
			</Dialog.Description>
		</Dialog.Header>

		{#if generatedToken}
			<!-- Lien généré -->
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lien d'invitation</p>
					<div class="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
						<p class="min-w-0 flex-1 truncate text-xs font-mono text-foreground/80">
							{getInviteUrl(generatedToken)}
						</p>
						<button
							type="button"
							onclick={() => copyInviteLink(generatedToken!)}
							class="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-muted"
						>
							{#if copiedToken}
								<CheckIcon class="size-4 text-emerald-500" />
							{:else}
								<CopyIcon class="size-4 text-muted-foreground" />
							{/if}
						</button>
					</div>
				</div>
				<Button onclick={() => copyInviteLink(generatedToken!)} class="w-full gap-2">
					{#if copiedToken}
						<CheckIcon class="size-4" />
						Lien copié !
					{:else}
						<CopyIcon class="size-4" />
						Copier le lien d'invitation
					{/if}
				</Button>
				<p class="text-center text-[11px] text-muted-foreground/50">
					Envoyez ce lien à la personne concernée. Il expire dans 7 jours.
				</p>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={resetInviteDialog}>Fermer</Button>
				<Button variant="ghost" onclick={() => { generatedToken = null; copiedToken = false; }} class="gap-1.5 text-xs">
					<LinkIcon class="size-3.5" />
					Nouveau lien
				</Button>
			</Dialog.Footer>
		{:else}
			<!-- Formulaire de configuration -->
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-1.5">
					<Label>Rôle</Label>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => (inviteRole = 'OPERATOR')}
							class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all {inviteRole === 'OPERATOR'
								? 'border-[var(--brand)]/60 bg-[var(--brand)]/8 text-foreground'
								: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
						>
							<HeadphonesIcon class="size-4" />
							Concierge
						</button>
						<button
							type="button"
							onclick={() => (inviteRole = 'SUPER_ADMIN')}
							class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all {inviteRole === 'SUPER_ADMIN'
								? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
								: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
						>
							<ShieldIcon class="size-4" />
							Super Admin
						</button>
					</div>
					<p class="text-xs text-muted-foreground">
						{inviteRole === 'SUPER_ADMIN'
							? 'Accès complet à toutes les organisations.'
							: 'File de tâches clients et assistance humaine.'}
					</p>
				</div>

				<div class="flex flex-col gap-1.5">
					<Label for="invite-email">Email autorisé <span class="text-muted-foreground/50">(optionnel)</span></Label>
					<Input
						id="invite-email"
						type="email"
						placeholder="prenom@mycelium.io"
						bind:value={inviteEmail}
					/>
					<p class="text-[11px] text-muted-foreground/60">
						Si renseigné, seul ce compte pourra utiliser le lien.
					</p>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={resetInviteDialog} disabled={inviteGenerating}>Annuler</Button>
				<Button onclick={generateInviteLink} disabled={inviteGenerating} class="gap-2">
					{#if inviteGenerating}
						<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
						Génération…
					{:else}
						<LinkIcon class="size-4" />
						Générer le lien
					{/if}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

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
						onclick={() => (newRole = 'OPERATOR')}
						class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all {newRole === 'OPERATOR'
							? 'border-[var(--brand)]/60 bg-[var(--brand)]/8 text-foreground'
							: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
					>
						<HeadphonesIcon class="size-4" />
						Concierge
					</button>
					<button
						type="button"
						onclick={() => (newRole = 'SUPER_ADMIN')}
						class="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all {newRole === 'SUPER_ADMIN'
							? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
							: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
					>
						<ShieldIcon class="size-4" />
						Super Admin
					</button>
				</div>
				<p class="text-xs text-muted-foreground">
					{newRole === 'SUPER_ADMIN'
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
				class={newRole === 'SUPER_ADMIN' ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400' : ''}
				variant={newRole === 'SUPER_ADMIN' ? 'outline' : 'default'}
			>
				{#if addLoading}
					<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
				{:else if newRole === 'SUPER_ADMIN'}
					<ShieldIcon class="size-4" />
				{/if}
				{addLoading ? 'Ajout…' : newRole === 'SUPER_ADMIN' ? 'Continuer…' : 'Ajouter'}
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
