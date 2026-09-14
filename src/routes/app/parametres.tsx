import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { authClient } from '../../lib/client/auth';
import { useTheme } from '../../app/use-theme';
import { EcranReglages } from '../../screens/parametres/reglages';

export const Route = createFileRoute('/app/parametres')({
	component: Parametres,
	errorComponent: ReglagesEnErreur
});

function ReglagesEnErreur() {
	return <EcranReglages donnees={{ etat: 'erreur' }} />;
}

/**
 * Les réglages, branchés sur la base ; le dessin vit dans `screens/parametres/reglages.tsx`.
 *
 * ⚠️ LA PAGE ATTEND AUSSI LE PROFIL. La rangée du créancier en tire sa valeur :
 * rendue avant lui, elle montrait un tiret puis « SIREN manquant », à chaque
 * ouverture. L'attendre ne mène à aucune erreur : `monProfil` ne lève que sans
 * établissement, et la coquille `/app` renvoie vers `/bienvenue` avant d'ouvrir
 * une page.
 */
function Parametres() {
	const navigate = useNavigate();
	const org = useQuery(api.organizations.getMyOrg, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const { theme, setTheme } = useTheme();

	return (
		<EcranReglages
			donnees={
				org === undefined || profil === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								org,
								profil,
								theme,
								onChoisirTheme: setTheme,
								onSeDeconnecter: () =>
									void authClient.signOut().then(() => navigate({ to: '/connexion' }))
							}
						}
			}
		/>
	);
}
