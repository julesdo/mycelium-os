import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { Page, PageHeader, PageBody } from '../../ui';
import {
	Equipe,
	type MembreEquipe,
	type InvitationEnAttente,
	type RoleEquipe
} from '../../screens/equipe/equipe';
import type { Id } from '../../lib/convex/_generated/dataModel';

export const Route = createFileRoute('/app/equipe')({ component: EcranEquipe });

/**
 * L'écran d'équipe.
 *
 * IL BRANCHE ONZE FONCTIONS QUI N'ÉTAIENT APPELÉES PAR RIEN. Inviter, accepter,
 * annuler, changer un rôle, retirer, vérifier une adresse : tout existait côté
 * serveur, et la seule façon d'ajouter un collègue était d'écrire une mutation à
 * la main. Dans une cantine, celui qui dépose les factures et celui qui signe la
 * déclaration sont rarement la même personne — à une seule place, le produit ne
 * sert qu'à moitié.
 *
 * IL S'OUVRE AUX MEMBRES AUSSI, PAS SEULEMENT AUX ADMINISTRATEURS. Un membre y
 * lit qui travaille sur les mêmes factures et à qui demander un accès ; il n'y
 * voit ni les invitations en attente — elles portent l'adresse personnelle d'un
 * tiers — ni aucune action.
 */
function EcranEquipe() {
	const membres = useQuery(api.organizations.listOrganizationMembers, {});
	const invitations = useQuery(api.organizations.listOrgInvitations, {});
	const monRole = useQuery(api.organizations.getMyOrgMembership, {});
	const facturation = useQuery(api.billing.getBillingStatus, {});

	const inviter = useMutation(api.organizations.inviteOrganizationMember);
	const changerRole = useMutation(api.organizations.updateMemberRole);
	const retirer = useMutation(api.organizations.removeOrganizationMember);
	const annuler = useMutation(api.organizations.cancelInvitation);
	const verifierAdresse = useMutation(api.organizations.verifyMemberEmail);

	const enAttente = membres === undefined || invitations === undefined || monRole === undefined;

	return (
		<Page>
			<PageHeader
				titre="Équipe"
				sousTitre="Qui accède aux factures et aux taux de cet établissement."
			/>
			<PageBody>
				{enAttente ? (
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
				) : (
					<Equipe
						membres={membres.map(versMembre)}
						invitations={invitations.map(versInvitation)}
						estAdmin={monRole?.role === 'ORG_ADMIN'}
						siegesUtilises={membres.length}
						siegesAutorises={facturation?.seatsAllowed ?? membres.length}
						onInviter={async (email, role) => {
							await inviter({ email, role });
						}}
						onChangerRole={async (membreId, role) => {
							await changerRole({ memberId: membreId as Id<'organizationMembers'>, role });
						}}
						onRetirer={async (membreId) => {
							await retirer({ memberId: membreId as Id<'organizationMembers'> });
						}}
						onAnnulerInvitation={async (invitationId) => {
							await annuler({
								invitationId: invitationId as Id<'organizationInvitations'>
							});
						}}
						onVerifierAdresse={async (membreId) => {
							await verifierAdresse({ memberId: membreId as Id<'organizationMembers'> });
						}}
					/>
				)}
			</PageBody>
		</Page>
	);
}

type MembreServeur = {
	_id: string;
	role: RoleEquipe;
	joinedAt: number;
	name: string | null;
	email: string | null;
	emailVerified: boolean;
	estMoi: boolean;
};

function versMembre(m: MembreServeur): MembreEquipe {
	return {
		id: m._id,
		nom: m.name,
		email: m.email,
		role: m.role,
		arriveLe: m.joinedAt,
		adresseVerifiee: m.emailVerified,
		estMoi: m.estMoi
	};
}

type InvitationServeur = {
	_id: string;
	email: string;
	role: RoleEquipe;
	token: string;
	expiresAt: number;
};

/**
 * Le lien est reconstruit ICI, dans le navigateur, à partir de l'origine
 * courante — jamais renvoyé par le serveur. Une origine posée en variable
 * d'environnement se désynchronise du domaine réellement servi, et le symptôme
 * est un lien d'invitation qui pointe vers l'ancien nom de domaine.
 */
function versInvitation(i: InvitationServeur): InvitationEnAttente {
	const origine = typeof window === 'undefined' ? '' : window.location.origin;
	return {
		id: i._id,
		email: i.email,
		role: i.role,
		lien: `${origine}/rejoindre/${i.token}`,
		expireLe: i.expiresAt
	};
}
