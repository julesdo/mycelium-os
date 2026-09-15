import { Button, Dialog, DialogRoot, DialogTrigger } from '@cladd-ui/react';
import { UserXIcon } from 'lucide-react';
import { PageEcran, type Lecture } from '../../ui';

/** Ce que la page affiche : l'adresse à saisir, le refus du serveur, et la confirmation que la route pilote. */
export interface SuppressionDuCompte {
	/** L'adresse à saisir pour confirmer. Vide si le compte n'en porte pas. */
	readonly email: string;
	readonly erreur: string | null;
	readonly onConfirmer: () => void;
}

/**
 * SUPPRIMER MON COMPTE.
 *
 * ⚠️ ET LE REFUS EST EXPLIQUÉ AVANT LE GESTE. Un seul administrateur d'un
 * établissement qui compte d'autres personnes ne peut pas partir : sinon plus
 * personne ne pourrait le gérer. Le dire après coup, dans un message d'erreur,
 * ferait passer une règle de sauvegarde pour une panne.
 */
export function EcranSupprimerCompte({ donnees }: { donnees: Lecture<SuppressionDuCompte> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/donnees', libelle: 'Vos données' },
				titre: 'Supprimer mon compte',
				sousTitre: pret !== null && pret.email.length > 0 ? pret.email : undefined
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<div className="flex flex-col gap-cladd-2xs">
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

					{pret.erreur ? (
						<p className="text-cladd-xs leading-relaxed" role="alert">
							{pret.erreur}
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
							text={`Cette action est définitive. Saisissez ${pret.email} pour confirmer.`}
							requireConfirmText={pret.email}
							cancelButtonText="Annuler"
							confirmButtonText="Supprimer mon compte"
							confirmButtonColor="red"
							onConfirm={pret.onConfirmer}
						/>
					</DialogRoot>
				</div>
			)}
		</PageEcran>
	);
}
