import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Dialog, DialogRoot, DialogTrigger } from '@cladd-ui/react';
import { UserXIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { authClient } from '../../lib/client/auth';
import { EnteteDetail, Page, PageBody } from '../../ui';
import { messageDErreur } from '../../screens/equipe/equipe';

export const Route = createFileRoute('/app/donnees_/supprimer-compte')({
	component: PageSupprimerCompte
});

/**
 * SUPPRIMER MON COMPTE.
 *
 * ⚠️ APRÈS LA SUPPRESSION, ON DÉCONNECTE. La session reste cryptographiquement
 * valide quelques instants après que l'identité a disparu : sans déconnexion
 * explicite, l'utilisateur se retrouve dans une application qui lui répond
 * « accès refusé » partout, ce qui se lit comme une panne plutôt que comme le
 * résultat qu'il a demandé.
 *
 * ⚠️ ET LE REFUS EST EXPLIQUÉ AVANT LE GESTE. Un seul administrateur d'un
 * établissement qui compte d'autres personnes ne peut pas partir : sinon plus
 * personne ne pourrait le gérer. Le dire après coup, dans un message d'erreur,
 * ferait passer une règle de sauvegarde pour une panne.
 */
function PageSupprimerCompte() {
	const navigate = useNavigate();
	const compte = useQuery(api.auth.getCurrentUser, {});
	const supprimer = useMutation(api.rgpd.supprimerMonCompte);
	const [erreur, setErreur] = useState<string | null>(null);

	const email = compte?.email ?? '';

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/donnees"
				retourLibelle="Vos données"
				titre="Supprimer mon compte"
				sousTitre={email.length > 0 ? email : undefined}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Votre compte, votre profil et vos notifications sont effacés, et votre identité est
						retirée du service d’authentification. Les établissements dont vous êtes le seul membre
						sont supprimés avec vous ; ceux que vous partagez restent à leurs autres membres.
					</p>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Si vous êtes le seul administrateur d’un établissement qui compte d’autres personnes, la
						suppression est refusée : nommez d’abord un autre administrateur, sinon plus personne ne
						pourrait le gérer.
					</p>

					{erreur ? (
						<p className="text-cladd-xs leading-relaxed" role="alert">
							{erreur}
						</p>
					) : null}

					<DialogRoot>
						<DialogTrigger>
							<Button className="self-start" color="red" variant="transparent" size="lg">
								<UserXIcon />
								Supprimer mon compte
							</Button>
						</DialogTrigger>
						<Dialog
							title="Supprimer votre compte ?"
							text={`Cette action est définitive. Saisissez ${email} pour confirmer.`}
							requireConfirmText={email}
							cancelButtonText="Annuler"
							confirmButtonText="Supprimer mon compte"
							confirmButtonColor="red"
							onConfirm={() => {
								setErreur(null);
								void supprimer({ confirmation: email })
									.then(async () => {
										await authClient.signOut();
										await navigate({ to: '/' });
									})
									.catch((e: unknown) => setErreur(messageDErreur(e)));
							}}
						/>
					</DialogRoot>
				</div>
			</PageBody>
		</Page>
	);
}
