import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { authClient } from '../../lib/client/auth';
import { messageDErreur } from '../../screens/equipe/equipe';
import { EcranSupprimerCompte } from '../../screens/donnees/supprimer-compte';

export const Route = createFileRoute('/app/donnees_/supprimer-compte')({
	component: PageSupprimerCompte,
	errorComponent: SupprimerCompteEnErreur
});

function SupprimerCompteEnErreur() {
	return <EcranSupprimerCompte donnees={{ etat: 'erreur' }} />;
}

/**
 * La suppression du compte, branchée sur la base ; le dessin vit dans
 * `screens/donnees/supprimer-compte.tsx`.
 *
 * ⚠️ APRÈS LA SUPPRESSION, ON DÉCONNECTE. La session reste cryptographiquement
 * valide quelques instants après que l'identité a disparu : sans déconnexion
 * explicite, l'utilisateur se retrouve dans une application qui lui répond
 * « accès refusé » partout, ce qui se lit comme une panne plutôt que comme le
 * résultat qu'il a demandé.
 */
function PageSupprimerCompte() {
	const navigate = useNavigate();
	const compte = useQuery(api.auth.getCurrentUser, {});
	const supprimer = useMutation(api.rgpd.supprimerMonCompte);
	const [erreur, setErreur] = useState<string | null>(null);

	const email = compte?.email ?? '';

	// La page attend le compte : rendue avant lui, elle ouvrait une confirmation
	// qui demandait de saisir une adresse vide.
	return (
		<EcranSupprimerCompte
			donnees={
				compte === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								email,
								erreur,
								onConfirmer: () => {
									setErreur(null);
									void supprimer({ confirmation: email })
										.then(async () => {
											await authClient.signOut();
											await navigate({ to: '/' });
										})
										.catch((e: unknown) => setErreur(messageDErreur(e)));
								}
							}
						}
			}
		/>
	);
}
