import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import {
	permis,
	useCocherTache,
	useGesteAdmin,
	useHorlogeAdmin,
	useRoleAdmin
} from '../../app/coquille-admin';
import { EcranTaches } from '../../screens/admin/taches';

/** Les tâches de l'équipe, groupées. */
export const Route = createFileRoute('/admin/taches')({
	component: TachesAdmin
});

function TachesAdmin() {
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const taches = useQuery(api.admin.taches.liste, {});
	const creer = useMutation(api.admin.taches.creer);
	const cocher = useCocherTache();
	const faire = useGesteAdmin();
	return (
		<EcranTaches
			lecture={
				taches === undefined || horloge === null
					? { etat: 'attente' }
					: { etat: 'pret', valeur: taches }
			}
			maintenant={horloge?.maintenant ?? 0}
			debutDuJour={horloge?.debutDuJour ?? 0}
			finDuJour={horloge?.finDuJour ?? 0}
			onCocher={cocher}
			{...(permis(role, 'SUPPORT')
				? {
						onCreer: (titre: string, pour: number) =>
							faire(() => creer({ titre, pour }), { titre: 'Tâche créée', texte: titre })
					}
				: {})}
		/>
	);
}
