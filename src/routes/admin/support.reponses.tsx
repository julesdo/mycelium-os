import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import { permis, useGesteAdmin, useRoleAdmin } from '../../app/coquille-admin';
import { EcranReponsesEnregistrees } from '../../screens/admin/support';

export const Route = createFileRoute('/admin/support/reponses')({ component: ReponsesEnregistrees });

/** Les réponses enregistrées de l'équipe, relues par les mêmes filtres qu'une réponse. */
function ReponsesEnregistrees() {
	const role = useRoleAdmin();
	const reponses = useQuery(api.admin.support.reponses, permis(role, 'SUPPORT') ? {} : 'skip');
	const enregistrer = useMutation(api.admin.support.enregistrerReponse);
	const supprimer = useMutation(api.admin.support.supprimerReponse);
	const faire = useGesteAdmin();
	return (
		<EcranReponsesEnregistrees
			lecture={
				!permis(role, 'SUPPORT')
					? { etat: 'erreur' }
					: reponses === undefined
						? { etat: 'attente' }
						: { etat: 'pret', valeur: reponses }
			}
			{...(permis(role, 'SUPPORT')
				? {
						onEnregistrer: ({ id, titre, texte }) =>
							faire(
								() =>
									enregistrer({
										...(id === undefined ? {} : { id: id as Id<'reponsesEnregistrees'> }),
										titre,
										texte
									}),
								{ titre: 'Réponse enregistrée', texte: titre }
							),
						onSupprimer: (id) =>
							void faire(() => supprimer({ id: id as Id<'reponsesEnregistrees'> }), {
								titre: 'Réponse supprimée',
								texte: 'Elle ne se propose plus dans le compositeur.'
							})
					}
				: {})}
		/>
	);
}
