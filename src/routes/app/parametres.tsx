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

/** Les réglages, branchés sur la base ; le dessin vit dans `screens/parametres/reglages.tsx`. */
function Parametres() {
	const navigate = useNavigate();
	const org = useQuery(api.organizations.getMyOrg, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const { theme, setTheme } = useTheme();

	return (
		<EcranReglages
			donnees={
				org === undefined
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
