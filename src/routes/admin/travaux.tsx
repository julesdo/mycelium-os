import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import { permis, useRoleAdmin } from '../../app/coquille-admin';
import { EcranTravaux } from '../../screens/admin/travaux';

/** La file des travaux de l'équipe : les recherches longues, en arrière-plan (20/10/2026). */
export const Route = createFileRoute('/admin/travaux')({
	component: TravauxAdmin
});

function TravauxAdmin() {
	const role = useRoleAdmin();
	const travaux = useQuery(api.admin.travaux.fileDAttente, {});
	const marquerVu = useMutation(api.admin.travaux.marquerVu);
	const retirer = useMutation(api.admin.travaux.retirer);
	return (
		<EcranTravaux
			lecture={travaux === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: travaux }}
			onOuvrir={(id) => void marquerVu({ id: id as Id<'travauxEquipe'> })}
			{...(permis(role, 'SUPPORT')
				? {
						onRetirerLesFinis: (ids: readonly string[]) => {
							for (const id of ids) void retirer({ id: id as Id<'travauxEquipe'> });
						}
					}
				: {})}
		/>
	);
}
