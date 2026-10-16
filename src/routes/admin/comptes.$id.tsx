import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import {
	permis,
	useCocherTache,
	useGesteAdmin,
	useHorlogeAdmin,
	useRoleAdmin
} from '../../app/coquille-admin';
import { EcranFicheCompte } from '../../screens/admin/fiche-compte';

/**
 * La fiche d'un compte. Son ouverture s'inscrit au journal de l'équipe : on sait qui
 * a regardé quel client, et quand.
 */
export const Route = createFileRoute('/admin/comptes/$id')({
	component: FicheCompteAdmin
});

function FicheCompteAdmin() {
	const { id } = Route.useParams();
	const organizationId = id as Id<'organizations'>;
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const fiche = useQuery(api.admin.comptes.fiche, { organizationId });
	const historique = useQuery(api.admin.historique.deLaFiche, {
		cible: { compte: organizationId }
	});
	const taches = useQuery(api.admin.taches.liste, { fiche: { compte: organizationId } });
	const ouvrirFiche = useMutation(api.admin.comptes.ouvrirFiche);
	const noter = useMutation(api.admin.historique.noter);
	const creerTache = useMutation(api.admin.taches.creer);
	const cocher = useCocherTache();
	const faire = useGesteAdmin();

	// Une écriture vers le journal du serveur, une fois par fiche ouverte.
	useEffect(() => {
		void ouvrirFiche({ organizationId }).catch(() => undefined);
	}, [organizationId, ouvrirFiche]);

	const pret =
		fiche !== undefined && historique !== undefined && taches !== undefined && horloge !== null;
	return (
		<EcranFicheCompte
			lecture={
				!pret
					? { etat: 'attente' }
					: { etat: 'pret', valeur: fiche === null ? null : { fiche, historique, taches } }
			}
			maintenant={horloge?.maintenant ?? 0}
			finDuJour={horloge?.finDuJour ?? 0}
			{...(permis(role, 'SUPPORT')
				? {
						gestes: {
							onNoter: (type, texte) =>
								faire(
									() =>
										noter({ cible: { compte: organizationId }, type, ...(texte ? { texte } : {}) }),
									{
										titre: 'Noté',
										texte: 'C’est dans l’historique.'
									}
								),
							onCreerTache: (titre, pour) =>
								faire(() => creerTache({ titre, pour, fiche: { compte: organizationId } }), {
									titre: 'Tâche créée',
									texte: titre
								}),
							onCocher: cocher
						}
					}
				: {})}
		/>
	);
}
