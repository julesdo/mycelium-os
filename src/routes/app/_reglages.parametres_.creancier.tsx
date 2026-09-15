import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranCreancier } from '../../screens/parametres/creancier';

export const Route = createFileRoute('/app/_reglages/parametres_/creancier')({
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
 * ⚠️ LA `key` SUIT L'ÉTABLISSEMENT, JAMAIS LE PROFIL. Le formulaire se remonte
 * quand le gérant change d'établissement, pas quand il enregistre. Posée sur la
 * dénomination, elle changeait au premier enregistrement et à chaque changement
 * de nom : Convex met à jour la lecture du profil avant de résoudre
 * l'enregistrement, le formulaire se remontait donc en pleine sauvegarde.
 * « Enregistré » ne s'affichait jamais, et ce qui avait été tapé pendant
 * l'enregistrement était perdu.
 *
 * Le prix de ce choix : un nom changé depuis une autre session ne rafraîchit pas
 * un formulaire ouvert. Il s'y lit en rouvrant la page.
 */
function PageCreancier() {
	const org = useQuery(api.organizations.getMyOrg, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const enregistrer = useMutation(api.recouvrement.profil.enregistrer);

	/*
	  La page attend les deux lectures. Le formulaire s'initialise une fois par
	  montage, sur l'une et l'autre : sans profil enregistré, la dénomination se
	  replie sur le nom de l'établissement. Et la `key`, qui ne suit que
	  l'établissement, ne le remonterait pas à l'arrivée d'une lecture en retard.
	*/
	return (
		<EcranCreancier
			donnees={
				org === undefined || profil === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								cle: org?._id ?? 'aucun',
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
