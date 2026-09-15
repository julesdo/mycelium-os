import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { messageDErreur } from '../../screens/equipe/equipe';
import { EcranSupprimerEtablissement } from '../../screens/donnees/supprimer-etablissement';

export const Route = createFileRoute('/app/donnees_/supprimer-etablissement')({
	component: PageSupprimerEtablissement,
	errorComponent: SupprimerEtablissementEnErreur
});

function SupprimerEtablissementEnErreur() {
	return <EcranSupprimerEtablissement donnees={{ etat: 'erreur' }} />;
}

/** La suppression de l'établissement, branchée sur la base ; le dessin vit dans `screens/donnees/supprimer-etablissement.tsx`. */
function PageSupprimerEtablissement() {
	const navigate = useNavigate();
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});
	const supprimer = useMutation(api.rgpd.supprimerEtablissement);
	const [erreur, setErreur] = useState<string | null>(null);

	return (
		<EcranSupprimerEtablissement
			donnees={
				apercu === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur:
								apercu === null
									? null
									: {
											apercu,
											erreur,
											onConfirmer: () => {
												setErreur(null);
												void supprimer({ confirmation: apercu.nomEtablissement })
													.then(() => navigate({ to: '/bienvenue' }))
													.catch((e: unknown) => setErreur(messageDErreur(e)));
											}
										}
						}
			}
		/>
	);
}
