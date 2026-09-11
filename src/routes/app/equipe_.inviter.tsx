import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EnteteDetail, Page, PageBody } from '../../ui';
import { FormulaireInvitation, type RoleEquipe } from '../../screens/equipe/equipe';

export const Route = createFileRoute('/app/equipe_/inviter')({ component: PageInviter });

/**
 * INVITER UN COLLÈGUE — un formulaire, sur sa propre page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN FORMULAIRE NE TIENT PAS EN BAS D'UN ÉCRAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il vivait sous deux listes : celle des membres et celle des invitations en
 * attente. Sur un téléphone, il fallait donc faire défiler pour l'atteindre —
 * et une fois le champ touché, le clavier qui s'ouvre repousse le bouton
 * d'envoi hors de l'écran. C'est le cas typique où une carte de plus rend un
 * geste simplement impraticable.
 *
 * ⚠️ LE RÔLE EST UN CHOIX EXPLICITE, AVEC SA CONSÉQUENCE SOUS L'OPTION. Un
 * administrateur peut inviter, retirer et supprimer l'établissement : le dire
 * au moment du choix vaut mieux qu'un réglage qu'on découvre en le subissant.
 *
 * ⚠️ ET LA GARDE EST CÔTÉ SERVEUR. Cet écran n'affiche le formulaire qu'à un
 * administrateur, mais c'est la mutation qui refuse — un écran peut demander,
 * seul le serveur peut exiger.
 */
function PageInviter() {
	const membres = useQuery(api.organizations.listOrganizationMembers, {});
	const invitations = useQuery(api.organizations.listOrgInvitations, {});
	const monRole = useQuery(api.organizations.getMyOrgMembership, {});
	const facturation = useQuery(api.billing.getBillingStatus, {});
	const inviter = useMutation(api.organizations.inviteOrganizationMember);

	const chargement = membres === undefined || invitations === undefined || monRole === undefined;
	const estAdmin = monRole?.role === 'ORG_ADMIN';
	const siegesUtilises = membres?.length ?? 0;
	const siegesAutorises = facturation?.seatsAllowed ?? siegesUtilises;
	const enAttente = invitations?.length ?? 0;

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/equipe"
				retourLibelle="Votre équipe"
				titre="Inviter un collègue"
				sousTitre="Il recevra un lien valable sept jours, et créera son mot de passe lui-même."
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					{chargement ? (
						<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
					) : estAdmin ? (
						<FormulaireInvitation
							onInviter={async (email, role: RoleEquipe) => {
								await inviter({ email, role });
							}}
							complet={siegesUtilises + enAttente >= siegesAutorises}
							places={siegesAutorises}
						/>
					) : (
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							Seul un administrateur de l’établissement peut inviter quelqu’un. Demandez-le à l’une
							des personnes marquées « Administrateur » sur l’écran précédent.
						</p>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
