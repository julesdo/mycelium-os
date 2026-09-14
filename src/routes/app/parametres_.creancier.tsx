import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranCreancier } from '../../screens/parametres/creancier';

export const Route = createFileRoute('/app/parametres_/creancier')({
	component: PageCreancier,
	errorComponent: CreancierEnErreur
});

function CreancierEnErreur() {
	return <EcranCreancier donnees={{ etat: 'erreur' }} />;
}

/**
 * VOTRE ENTREPRISE, TELLE QU'ELLE APPARAÎT SUR UN DÉCOMPTE.
 *
 * ⚠️ C'EST LE PROFIL QUI BLOQUAIT L'ÉLIGIBILITÉ, et il mesure à lui seul 2,99
 * écrans de défilement à 375 px : dénomination, SIREN, adresse, qualité de
 * commerçant, chacun avec ce qu'il change. Déplié au milieu des réglages, il en
 * faisait l'essentiel de la hauteur.
 *
 * ⚠️ ET LA `key` SUR LA DÉNOMINATION RESTE. Le formulaire s'initialise sur ce
 * que dit le serveur ; sans elle, les champs partiraient vides au premier rendu
 * et y resteraient — React ne ré-initialise pas un `useState` sur un changement
 * de prop.
 */
function PageCreancier() {
	const org = useQuery(api.organizations.getMyOrg, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const enregistrer = useMutation(api.recouvrement.profil.enregistrer);

	/*
	  La page attend aussi l'établissement. Sans profil enregistré, la dénomination
	  initiale se replie sur son nom : si le profil répondait le premier, le champ
	  partait vide, et la `key`, qui suit la dénomination du profil, ne remontait
	  pas le formulaire à l'arrivée de l'établissement.
	*/
	return (
		<EcranCreancier
			donnees={
				org === undefined || profil === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								cle: profil?.denomination ?? 'vide',
								initial: {
									denomination: profil?.denomination ?? org?.name ?? '',
									siren: profil?.siren ?? '',
									adresse: profil?.adresse ?? '',
									estCommercant: profil?.estCommercant ?? 'unknown'
								},
								onEnregistrer: enregistrer
							}
						}
			}
		/>
	);
}
