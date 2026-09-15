import { useState, type ReactElement } from 'react';
import { Button, Dialog, DialogClose, DialogRoot, DialogTrigger, Input } from '@cladd-ui/react';

/**
 * LA CONFIRMATION D'UN GESTE IRRÉVERSIBLE, PAR LA SAISIE DE CE QU'IL EFFACE.
 *
 * ⚠️ POURQUOI ELLE N'EST PAS `requireConfirmText`. Le `Dialog` du kit sait exiger
 * une saisie, mais son champ s'annonce en anglais (« Type … to confirm »), et
 * aucune prop ne change ce texte : ni celles du `Dialog`, ni `CladdProvider`, qui
 * n'a ni langue ni messages. L'interface est en français uniquement. Le même
 * garde-fou est donc bâti ici sur les emplacements documentés du `Dialog` :
 * `children` pour le champ, `buttons` pour la rangée.
 *
 * ⚠️ LA SAISIE DOIT ÊTRE EXACTE, À LA CASSE ET À L'ESPACE PRÈS. Une comparaison
 * tolérante accepterait une saisie approchée, et c'est précisément la saisie
 * approchée, faite sans lire, que ce garde-fou existe pour refuser.
 *
 * ⚠️ ELLE REPART VIDE À CHAQUE OUVERTURE. Sans quoi une saisie exacte suivie
 * d'« Annuler » laisserait la confirmation active à la réouverture : ouvrir puis
 * cliquer suffirait. La remise à zéro se fait dans le gestionnaire d'ouverture,
 * jamais dans un effet.
 */
export function ConfirmationParSaisie({
	titre,
	texte,
	valeurAttendue,
	invite,
	intituleConfirmation,
	onConfirmer,
	declencheur
}: {
	titre: string;
	texte: string;
	/** Ce qu'il faut saisir, à l'identique. */
	valeurAttendue: string;
	/** Ce que le champ demande, en quelques mots : « Votre adresse e-mail ». Sans répéter le texte. */
	invite: string;
	intituleConfirmation: string;
	onConfirmer: () => void;
	/** Le bouton qui ouvre la confirmation : `DialogTrigger` lui attache son `onClick`. */
	declencheur: ReactElement;
}) {
	const [saisie, setSaisie] = useState('');
	const exacte = saisie === valeurAttendue;

	return (
		<DialogRoot
			onOpenChange={(ouverte) => {
				if (ouverte) setSaisie('');
			}}
		>
			<DialogTrigger>{declencheur}</DialogTrigger>
			<Dialog
				title={titre}
				text={texte}
				buttons={
					<>
						<DialogClose>
							<Button rounded size="lg" variant="transparent">
								Annuler
							</Button>
						</DialogClose>
						<DialogClose>
							{/* Désactivé, le bouton ne reçoit aucun clic : ni la confirmation, ni la fermeture. */}
							<Button rounded size="lg" color="red" disabled={!exacte} onClick={onConfirmer}>
								{intituleConfirmation}
							</Button>
						</DialogClose>
					</>
				}
			>
				<Input
					value={saisie}
					onChange={setSaisie}
					placeholder={invite}
					// Une invite ne nomme pas un champ pour un lecteur d'écran : elle
					// disparaît dès la première lettre. Le nom accessible la reprend.
					inputComponentProps={{ 'aria-label': invite }}
				/>
			</Dialog>
		</DialogRoot>
	);
}
