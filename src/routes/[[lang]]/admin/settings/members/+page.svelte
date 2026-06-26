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
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import MailIcon from '@lucide/svelte/icons/mail';
	import XIcon from '@lucide/svelte/icons/x';
	import CheckIcon from '@lucide/svelte/icons/check';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import MailWarningIcon from '@lucide/svelte/icons/mail-warning';
	import Link2Icon from '@lucide/svelte/icons/link-2';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';

	const client = useConvexClient();
	const currentUserId = getContext<string>('currentUserId');

	 
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
		emailVerified: boolean;
	};

	type Invitation = {
		_id: string;
		email: string;
		role: OrgRole;
		createdAt: number;
		expiresAt: number;
		token: string;
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
		if (name)
			return name
				.split(' ')
				.map((w) => w[0])
				.slice(0, 2)
				.join('')
				.toUpperCase();
		return (email?.[0] ?? '?').toUpperCase();
	}

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// --- Verify email ---
	let memberToVerify = $state<Member | null>(null);
	let verifying = $state(false);

	async function confirmVerifyEmail() {
		if (!memberToVerify || verifying) return;
		verifying = true;
		try {
			await client.mutation(anyApi.organizations.verifyMemberEmail, {
				memberId: memberToVerify._id
			});
			toast.success(`Email de ${memberToVerify.name ?? memberToVerify.email} vérifié`);
			memberToVerify = null;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la vérification');
		} finally {
			verifying = false;
		}
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
			toast.success("Membre retiré de l'organisation");
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

	// --- Accept invitation directly (force-accept for user who already has account) ---
	let validatingInvitation = $state<string | null>(null);

	async function handleAcceptDirect(invitationId: string, email: string) {
		if (validatingInvitation) return;
		validatingInvitation = invitationId;
		try {
			await client.mutation(anyApi.organizations.acceptInvitationDirect, { invitationId });
			toast.success(`${email} a été ajouté à l'organisation`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la validation directe');
		} finally {
			validatingInvitation = null;
		}
	}

	function copyInviteLink(token: string) {
		navigator.clipboard.writeText(`${window.location.origin}/join/${token}`);
		toast.success('Lien copié');
	}

	// --- Invite dialog ---
	let showInviteDialog = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state<OrgRole>('ORG_MEMBER');
	let inviting = $state(false);
	let inviteToken = $state<string | null>(null);
	let inviteSendEmail = $state(true);

	async function handleInvite() {
		if (!inviteEmail.trim()) return;
		inviting = true;
		try {
			const result = await client.mutation(anyApi.organizations.inviteOrganizationMember, {
				email: inviteEmail.trim().toLowerCase(),
				role: inviteRole,
				skipEmail: !inviteSendEmail
			});
			inviteToken = result.token;
			toast.success(inviteSendEmail ? 'Invitation envoyée par email' : "Lien d'invitation généré");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Erreur lors de la création de l'invitation"
			);
		} finally {
			inviting = false;
		}
	}

	function resetInviteDialog() {
		inviteEmail = '';
		inviteRole = 'ORG_MEMBER';
		inviteToken = null;
		inviteSendEmail = true;
		showInviteDialog = false;
	}

	// --- Bulk invite dialog ---
	type ParsedRow = { email: string; role: OrgRole; invalid?: boolean };
	type BulkResult = { email: string; success: boolean; token?: string; error?: string };

	let showBulkDialog = $state(false);
	let csvText = $state('');
	let parsedRows = $state<ParsedRow[]>([]);
	let bulkSendEmail = $state(true);
	let bulkInviting = $state(false);
	let bulkResults = $state<BulkResult[] | null>(null);

	$effect(() => {
		parsedRows = parseCsv(csvText);
		bulkResults = null;
	});

	function parseCsv(input: string): ParsedRow[] {
		const lines = input
			.trim()
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		if (!lines.length) return [];
		// Skip header if first line looks like a header
		const firstLower = lines[0].toLowerCase();
		const dataLines =
			firstLower.startsWith('email') || firstLower === 'mail' ? lines.slice(1) : lines;
		return dataLines.map((line): ParsedRow => {
			const [rawEmail, rawRole] = line.split(/[,;]/).map((p) => p.trim());
			const email = rawEmail?.toLowerCase() ?? '';
			const invalid = !email.includes('@') || !email.includes('.');
			let role: OrgRole = 'ORG_MEMBER';
			const r = rawRole?.toLowerCase() ?? '';
			if (r === 'admin' || r === 'org_admin' || r === 'administrateur') role = 'ORG_ADMIN';
			else if (r === 'manager' || r === 'org_manager' || r === 'gestionnaire') role = 'ORG_MANAGER';
			return { email, role, invalid };
		});
	}

	function setRowRole(index: number, role: OrgRole) {
		parsedRows = parsedRows.map((r, i) => (i === index ? { ...r, role } : r));
	}

	async function handleBulkInvite() {
		const valid = parsedRows.filter((r) => !r.invalid);
		if (!valid.length) return;
		bulkInviting = true;
		try {
			const result = await client.mutation(anyApi.organizations.bulkInviteOrganizationMembers, {
				invites: valid.map(({ email, role }) => ({ email, role })),
				skipEmail: !bulkSendEmail
			});
			bulkResults = result.results as BulkResult[];
			const successCount = bulkResults.filter((r) => r.success).length;
			const failCount = bulkResults.filter((r) => !r.success).length;
			if (failCount === 0) toast.success(`${successCount} invitation(s) créée(s)`);
			else toast.warning(`${successCount} succès, ${failCount} erreur(s)`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Erreur lors de l'import");
		} finally {
			bulkInviting = false;
		}
	}

	function resetBulkDialog() {
		csvText = '';
		parsedRows = [];
		bulkSendEmail = true;
		bulkInviting = false;
		bulkResults = null;
		showBulkDialog = false;
	}

	function handleCsvFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			csvText = (ev.target?.result as string) ?? '';
		};
		reader.readAsText(file);
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
			<div class="flex items-center gap-2">
				<Button size="sm" variant="outline" onclick={() => (showBulkDialog = true)}>
					<UploadIcon class="size-4" />
					Importer CSV
				</Button>
				<Button size="sm" onclick={() => (showInviteDialog = true)}>
					<UserPlusIcon class="size-4" />
					Inviter un membre
				</Button>
			</div>
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
							<!-- eslint-disable local/no-hardcoded-sr-only --><Table.Head class="w-10 pr-3"
								><span class="sr-only">Actions</span></Table.Head
							><!-- eslint-enable local/no-hardcoded-sr-only -->
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
											<p class="truncate text-sm leading-tight font-medium">
												{displayName}{isSelf ? ' (vous)' : ''}
											</p>
											{#if member.name && member.email}
												<p class="truncate text-xs text-muted-foreground">{member.email}</p>
											{/if}
											{#if !member.emailVerified}
												<span
													class="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400"
												>
													<MailWarningIcon class="size-2.5" />Email non vérifié
												</span>
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
												{#if !member.emailVerified}
													<DropdownMenu.Separator />
													<DropdownMenu.Item
														class="gap-2"
														onclick={() => (memberToVerify = member)}
													>
														<ShieldCheckIcon class="size-3.5 text-amber-500" />
														Vérifier l'email
													</DropdownMenu.Item>
												{/if}
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
			<Card.Header class="pt-4 pb-3">
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
							<!-- eslint-disable local/no-hardcoded-sr-only --><Table.Head class="w-10 pr-3"
								><span class="sr-only">Annuler</span></Table.Head
							><!-- eslint-enable local/no-hardcoded-sr-only -->
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
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<!-- eslint-disable local/no-hardcoded-aria-label -->
												<Button
													variant="ghost"
													size="icon-sm"
													{...props}
													disabled={validatingInvitation === inv._id}
													aria-label="Actions invitation"
													><!-- eslint-enable local/no-hardcoded-aria-label -->
													{#if validatingInvitation === inv._id}
														<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
													{:else}
														<MoreHorizontalIcon class="size-4" />
													{/if}
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Item class="gap-2" onclick={() => copyInviteLink(inv.token)}>
												<Link2Icon class="size-3.5" />
												Copier le lien
											</DropdownMenu.Item>
											<DropdownMenu.Item
												class="gap-2"
												onclick={() => handleAcceptDirect(inv._id, inv.email)}
											>
												<UserCheckIcon class="size-3.5 text-emerald-500" />
												Valider directement
											</DropdownMenu.Item>
											<DropdownMenu.Separator />
											<DropdownMenu.Item
												class="gap-2 text-destructive focus:text-destructive"
												onclick={() => handleCancelInvitation(inv._id)}
											>
												<XIcon class="size-3.5" />
												Annuler l'invitation
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Verify email confirmation dialog -->
<Dialog.Root
	open={!!memberToVerify}
	onOpenChange={(v) => {
		if (!v) memberToVerify = null;
	}}
>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Vérifier l'email manuellement ?</Dialog.Title>
			<Dialog.Description>
				<span>
					Vous allez marquer l'email de
					<strong>{memberToVerify?.name ?? memberToVerify?.email ?? 'ce membre'}</strong>
					comme vérifié sans que la personne ait cliqué sur le lien d'activation.
				</span>
			</Dialog.Description>
		</Dialog.Header>
		<div
			class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10"
		>
			<p class="text-xs text-amber-700 dark:text-amber-400">
				N'effectuez cette action que si vous avez confirmé l'identité de cette personne par un autre
				canal (téléphone, en présentiel, etc.). Cette action est irréversible et non traçable par
				l'utilisateur.
			</p>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (memberToVerify = null)} disabled={verifying}>
				Annuler
			</Button>
			<Button onclick={confirmVerifyEmail} disabled={verifying} class="gap-1.5">
				{#if verifying}
					<LoaderCircleIcon class="size-4 motion-safe:animate-spin" />
				{:else}
					<ShieldCheckIcon class="size-4" />
				{/if}
				Confirmer la vérification
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

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
				<strong>{memberToRemove?.name ?? memberToRemove?.email ?? 'Ce membre'}</strong> sera retiré de
				l'organisation. Vous pourrez l'inviter à nouveau ultérieurement.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (memberToRemove = null)} disabled={removing}>
				Annuler
			</Button>
			<Button variant="destructive" onclick={confirmRemoveMember} disabled={removing}>
				{#if removing}
					<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />
				{/if}
				Retirer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Bulk invite dialog -->
<Dialog.Root
	open={showBulkDialog}
	onOpenChange={(v) => {
		if (!v) resetBulkDialog();
	}}
>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Importer des membres via CSV</Dialog.Title>
			<Dialog.Description>
				Une ligne par personne : <code class="text-xs">email</code> ou
				<code class="text-xs">email,rôle</code>. Rôles : <code class="text-xs">admin</code>,
				<code class="text-xs">manager</code>, <code class="text-xs">member</code> (défaut).
			</Dialog.Description>
		</Dialog.Header>

		{#if bulkResults}
			<!-- Results view -->
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-3 text-sm">
					<span class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
						<CircleCheckIcon class="size-4" />
						{bulkResults.filter((r) => r.success).length} créée(s)
					</span>
					{#if bulkResults.some((r) => !r.success)}
						<span class="flex items-center gap-1.5 text-destructive">
							<AlertCircleIcon class="size-4" />
							{bulkResults.filter((r) => !r.success).length} erreur(s)
						</span>
					{/if}
				</div>
				<div class="max-h-72 overflow-y-auto rounded-lg border border-border">
					{#each bulkResults as result (result.email)}
						<div
							class="flex items-center justify-between border-b border-border px-3 py-2 last:border-0"
						>
							<span class="text-sm">{result.email}</span>
							{#if result.success}
								<span
									class="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
								>
									<CircleCheckIcon class="size-3.5" /> Créée
								</span>
							{:else}
								<span class="flex items-center gap-1 text-xs text-destructive">
									<AlertCircleIcon class="size-3.5" />
									{result.error}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
			<Dialog.Footer>
				<Button onclick={resetBulkDialog}>Fermer</Button>
			</Dialog.Footer>
		{:else}
			<!-- Input view -->
			<div class="flex flex-col gap-4">
				<!-- File input -->
				<div class="flex items-center gap-2">
					<label
						class="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
					>
						<UploadIcon class="size-4" />
						Importer un fichier .csv
						<input type="file" accept=".csv,.txt" class="sr-only" onchange={handleCsvFile} />
					</label>
					<span class="text-xs text-muted-foreground">ou collez ci-dessous</span>
				</div>

				<!-- CSV textarea -->
				<Textarea
					placeholder={`alice@entreprise.com
bob@entreprise.com,admin
charlie@entreprise.com,manager`}
					bind:value={csvText}
					rows={5}
					class="font-mono text-sm"
				/>

				<!-- Preview table -->
				{#if parsedRows.length > 0}
					<div class="flex flex-col gap-1.5">
						<p class="text-xs text-muted-foreground">
							{parsedRows.filter((r) => !r.invalid).length} valide(s)
							{#if parsedRows.some((r) => r.invalid)}
								· <span class="text-destructive"
									>{parsedRows.filter((r) => r.invalid).length} invalide(s)</span
								>
							{/if}
						</p>
						<div class="max-h-48 overflow-y-auto rounded-lg border border-border">
							{#each parsedRows as row, i (i)}
								<div
									class="flex items-center gap-3 border-b border-border px-3 py-1.5 last:border-0 {row.invalid
										? 'opacity-50'
										: ''}"
								>
									<span
										class="min-w-0 flex-1 truncate text-sm {row.invalid ? 'text-destructive' : ''}"
									>
										{row.email || '(vide)'}
										{#if row.invalid}<span class="ml-1 text-xs">✕ invalide</span>{/if}
									</span>
									{#if !row.invalid}
										<select
											class="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground"
											value={row.role}
											onchange={(e) =>
												setRowRole(i, (e.target as HTMLSelectElement).value as OrgRole)}
										>
											<option value="ORG_MEMBER">Membre</option>
											<option value="ORG_MANAGER">Gestionnaire</option>
											<option value="ORG_ADMIN">Admin</option>
										</select>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Skip email toggle -->
				<div class="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
					<div class="flex flex-col gap-0.5">
						<span class="text-sm font-medium">Envoyer les emails d'invitation</span>
						<span class="text-xs text-muted-foreground">
							{bulkSendEmail
								? 'Un email sera envoyé à chaque adresse'
								: 'Aucun email — partagez les liens manuellement'}
						</span>
					</div>
					<Switch bind:checked={bulkSendEmail} />
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={resetBulkDialog} disabled={bulkInviting}>Annuler</Button>
				<Button
					onclick={handleBulkInvite}
					disabled={bulkInviting || parsedRows.filter((r) => !r.invalid).length === 0}
				>
					{#if bulkInviting}
						<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />
					{/if}
					{bulkInviting
						? 'Import en cours...'
						: `Inviter ${parsedRows.filter((r) => !r.invalid).length} membre(s)`}
				</Button>
			</Dialog.Footer>
		{/if}
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
				<div
					class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10"
				>
					<p class="mb-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
						{inviteSendEmail ? 'Invitation envoyée' : 'Lien généré'}
					</p>
					<p class="text-xs text-emerald-600/80 dark:text-emerald-400/70">
						{#if inviteSendEmail}
							Un email a été envoyé à <strong>{inviteEmail}</strong> avec le lien pour rejoindre l'organisation.
						{:else}
							Partagez ce lien directement avec <strong>{inviteEmail}</strong>.
						{/if}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<Input
						value="{window.location.origin}/join/{inviteToken}"
						readonly
						class="text-xs text-muted-foreground"
					/>
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
				<div class="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
					<div class="flex flex-col gap-0.5">
						<span class="text-sm font-medium">Envoyer par email</span>
						<span class="text-xs text-muted-foreground">
							{inviteSendEmail
								? "Un email d'invitation sera envoyé"
								: 'Vous partagerez le lien manuellement'}
						</span>
					</div>
					<Switch bind:checked={inviteSendEmail} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={resetInviteDialog} disabled={inviting}>Annuler</Button>
				<Button onclick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
					{#if inviting}
						<LoaderCircleIcon class="mr-2 size-4 motion-safe:animate-spin" />
					{/if}
					{inviting ? 'Création...' : inviteSendEmail ? "Envoyer l'invitation" : 'Générer le lien'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
