import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import {
	permis,
	useGesteAdmin,
	useHorlogeAdmin,
	useRoleAdmin,
	useSignataireAdmin
} from '../../app/coquille-admin';
import { EcranAppels } from '../../screens/admin/appels';

/** Les appels du jour : la file, et la feuille d'appel de chacun. */
export const Route = createFileRoute('/admin/appels')({
	component: AppelsAdmin
});

function AppelsAdmin() {
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const signataire = useSignataireAdmin();
	const file = useQuery(api.admin.appels.fileDAppels, {});
	const noterUnAppel = useMutation(api.admin.appels.noterUnAppel);
	const faire = useGesteAdmin();
	return (
		<EcranAppels
			lecture={
				file === undefined || horloge === null
					? { etat: 'attente' }
					: { etat: 'pret', valeur: file }
			}
			maintenant={horloge?.maintenant ?? 0}
			{...(permis(role, 'SUPPORT') && signataire !== undefined
				? {
						appelant: signataire.prenom,
						onNoter: (id, issue, texte, dansJours) =>
							faire(
								() =>
									noterUnAppel({
										prospectId: id as Id<'prospects'>,
										issue,
										...(texte.trim() === '' ? {} : { texte }),
										...(dansJours === undefined ? {} : { dansJours })
									}),
								{
									titre: 'Appel noté',
									texte:
										issue === 'STOP'
											? 'Ses coordonnées sont effacées.'
											: 'La suite est dans « Prochaine action ».'
								}
							)
					}
				: {})}
		/>
	);
}
