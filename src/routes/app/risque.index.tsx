import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { precharger } from '../../app/prechargement';
import { messageDeRefus } from '../../app/televerser';
import { api } from '../../lib/convex/_generated/api';
import type { MissionAffichee } from '../../ui';
import { EcranSanteClients } from '../../screens/sante';

/**
 * `/app/risque` — LA SANTÉ DE VOS CLIENTS : le portefeuille, ses missions, ce qui
 * a changé, ceux à regarder. Voir `screens/sante.tsx`.
 */
export const Route = createFileRoute('/app/risque/')({
	loader: () => {
		precharger(api.risque.donnees.santeDesClients, {});
	},
	component: PageSanteDesClients,
	errorComponent: SanteEnErreur
});

function SanteEnErreur() {
	return <EcranSanteClients donnees={{ etat: 'erreur' }} />;
}

function PageSanteDesClients() {
	const navigate = useNavigate();
	const donnees = useQuery(api.risque.donnees.santeDesClients, {});
	const role = useQuery(api.organizations.getMyOrgMembership, {});
	const analyserLesClients = useAction(api.risque.analyse.analyserLesClients);
	const [message, setMessage] = useState<string | null>(null);

	if (donnees === undefined) return <EcranSanteClients donnees={{ etat: 'attente' }} />;
	const { sante } = donnees;
	const admin = role?.role === 'ORG_ADMIN';

	const missions: MissionAffichee[] = sante.missions.map((m) => {
		const prochain = m.prochain;
		const geste =
			prochain === null
				? undefined
				: m.cle === 'SIREN'
					? {
							libelle: `Retrouver celui de ${prochain.nom}`,
							onClick: () => void navigate({ to: '/app/clients/$id', params: { id: prochain.id } })
						}
					: m.cle === 'PLAFOND'
						? {
								libelle: `Fixer celui de ${prochain.nom}`,
								onClick: () => void navigate({ to: '/app/risque/$id', params: { id: prochain.id } })
							}
						: admin
							? {
									libelle:
										m.total - m.faits > 1
											? `Analyser les ${m.total - m.faits} restants`
											: `Analyser ${prochain.nom}`,
									onClick: () => {
										setMessage('Les analyses partent une à une ; les résultats arrivent ici.');
										analyserLesClients({})
											.then(({ lancees }) =>
												setMessage(
													lancees === 0
														? 'Aucun client à analyser pour l’instant.'
														: `${lancees} analyse${lancees > 1 ? 's' : ''} lancée${lancees > 1 ? 's' : ''} : les résultats arrivent ici, un à un.`
												)
											)
											.catch((e: unknown) => setMessage(messageDeRefus(e)));
									}
								}
							: {
									libelle: `Analyser ${prochain.nom}`,
									onClick: () =>
										void navigate({ to: '/app/risque/$id', params: { id: prochain.id } })
								};
		return {
			cle: m.cle,
			titre: m.titre,
			detail: m.detail,
			faits: m.faits,
			total: m.total,
			...(geste === undefined ? {} : { geste })
		};
	});

	return (
		<EcranSanteClients
			donnees={{
				etat: 'pret',
				valeur: {
					disponible: donnees.disponible,
					indice: sante.indice,
					niveau: sante.niveau,
					encoursTotal: sante.encoursTotal,
					encoursAnalyse: sante.encoursAnalyse,
					repartition: sante.repartition,
					couverture: sante.couverture,
					missions,
					aRegarder: sante.aRegarder,
					changements: sante.changements,
					message:
						message ??
						(donnees.budgetRestant === 0
							? 'Le nombre d’analyses du mois est atteint : elles reprennent le mois prochain.'
							: null)
				}
			}}
		/>
	);
}
