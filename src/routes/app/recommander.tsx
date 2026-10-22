import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { precharger } from '../../app/prechargement';
import { api } from '../../lib/convex/_generated/api';
import { lienDInvitation } from '../../lib/croissance/parrainage';
import { EcranRecommander } from '../../screens/recommander';

export const Route = createFileRoute('/app/recommander')({
	// La page part au toucher de la carte du compte (`app/prechargement.ts`).
	loader: () => {
		precharger(api.croissance.parrainage.mesRecommandations, {});
	},
	component: PageRecommander,
	errorComponent: () => <EcranRecommander donnees={{ etat: 'erreur' }} />
});

/**
 * `/app/recommander` — « RECOMMANDER LETIKETTE » (22/10/2026), poussée depuis la carte du
 * compte, la célébration d'une réussite ou une notification. Le lien personnel se crée à
 * la première visite (`monLienDeRecommandation`), puis reste le même.
 */
function PageRecommander() {
	const lecture = useQuery(api.croissance.parrainage.mesRecommandations, {});
	const creerMonLien = useMutation(api.croissance.parrainage.monLienDeRecommandation);
	const lienAPreparer = lecture?.ouvert === true && lecture.code === null;
	useEffect(() => {
		if (lienAPreparer) void creerMonLien({}).catch(() => undefined);
	}, [lienAPreparer, creerMonLien]);

	if (lecture === undefined) return <EcranRecommander donnees={{ etat: 'attente' }} />;
	if (lecture === null) return <EcranRecommander donnees={{ etat: 'erreur' }} />;
	if (!lecture.ouvert) return <EcranRecommander donnees={{ etat: 'pret', valeur: 'fermee' }} />;
	return (
		<EcranRecommander
			donnees={{
				etat: 'pret',
				valeur: {
					lien:
						lecture.code === null || typeof window === 'undefined'
							? null
							: lienDInvitation(window.location.origin, lecture.code),
					nomEtablissement: lecture.nomEtablissement,
					moisOfferts: lecture.moisOfferts,
					moisEnAttente: lecture.moisEnAttente,
					moisCetteAnnee: lecture.moisCetteAnnee,
					moisParAn: lecture.moisParAn,
					valeurDuMois: lecture.valeurDuMois,
					invitations: lecture.invitations,
					aujourdHui: lecture.aujourdHui
				}
			}}
		/>
	);
}
