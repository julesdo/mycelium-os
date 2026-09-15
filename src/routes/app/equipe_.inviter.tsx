import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranInviter } from '../../screens/equipe/inviter';

export const Route = createFileRoute('/app/equipe_/inviter')({
	component: PageInviter,
	errorComponent: InviterEnErreur
});

function InviterEnErreur() {
	return <EcranInviter donnees={{ etat: 'erreur' }} />;
}

/** L'invitation d'un collègue, branchée sur la base ; le dessin vit dans `screens/equipe/inviter.tsx`. */
function PageInviter() {
	const membres = useQuery(api.organizations.listOrganizationMembers, {});
	const invitations = useQuery(api.organizations.listOrgInvitations, {});
	const monRole = useQuery(api.organizations.getMyOrgMembership, {});
	const facturation = useQuery(api.billing.getBillingStatus, {});
	const inviter = useMutation(api.organizations.inviteOrganizationMember);

	// La page attend aussi la facturation : tant qu'elle se lit, les places se
	// replient sur le nombre de membres, et le formulaire refuse d'inviter à tort.
	const chargement =
		membres === undefined ||
		invitations === undefined ||
		monRole === undefined ||
		facturation === undefined;
	const estAdmin = monRole?.role === 'ORG_ADMIN';
	const siegesUtilises = membres?.length ?? 0;
	const siegesAutorises = facturation?.seatsAllowed ?? siegesUtilises;
	const enAttente = invitations?.length ?? 0;

	return (
		<EcranInviter
			donnees={
				chargement
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								estAdmin,
								complet: siegesUtilises + enAttente >= siegesAutorises,
								places: siegesAutorises,
								onInviter: async (email, role) => {
									await inviter({ email, role });
								}
							}
						}
			}
		/>
	);
}
