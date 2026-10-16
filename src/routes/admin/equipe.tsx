import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { usePlumeDit } from '../../app/parole-de-plume';
import { permis, useRoleAdmin } from '../../app/coquille-admin';
import { EcranEquipe } from '../../screens/admin/equipe';
import { DESCRIPTIONS_DES_ROLES } from '../../lib/admin/acces';

/** L'équipe : inviter, changer un rôle, retirer. Fondateur seulement. */
export const Route = createFileRoute('/admin/equipe')({
	component: EquipeAdmin
});

function EquipeAdmin() {
	const role = useRoleAdmin();
	if (!permis(role, 'FONDATEUR')) return <Navigate to="/admin" replace />;
	return <EquipeDuFondateur />;
}

function EquipeDuFondateur() {
	const membres = useQuery(api.admin.equipe.membres, {});
	const inviter = useMutation(api.admin.equipe.inviter);
	const changerRole = useMutation(api.admin.equipe.changerRole);
	const retirer = useMutation(api.admin.equipe.retirer);
	const dire = usePlumeDit();
	return (
		<EcranEquipe
			lecture={membres === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: membres }}
			onInviter={async (email, r) => {
				await inviter({ email, role: r });
				dire({
					titre: 'Invitation envoyée',
					texte: `${email}, ${DESCRIPTIONS_DES_ROLES[r].libelle.toLowerCase()}.`
				});
			}}
			onChangerRole={async (email, r) => {
				await changerRole({ email, role: r });
				dire({ titre: 'Rôle changé', texte: `${email} : ${DESCRIPTIONS_DES_ROLES[r].libelle}.` });
			}}
			onRetirer={async (email) => {
				await retirer({ email });
				dire({ titre: 'Retiré de l’équipe', texte: email });
			}}
		/>
	);
}
