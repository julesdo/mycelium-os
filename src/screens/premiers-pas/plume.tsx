import { Input } from '@cladd-ui/react';
import { ClockIcon, LandmarkIcon, SendIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	CadrePremiersPas,
	Champ,
	EnTeteDEtape,
	ListeDePromesses,
	NOM_DU_PILOTE,
	Plume,
	type ProgressionPremiersPas
} from '../../ui';

/**
 * PLUME SE PRÉSENTE — le premier écran d'un compte neuf (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE MOTIF DE CLAUDE ET DE COPILOT : celui qui va travailler pour vous dit
 * qui il est, puis vous demande votre nom
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Hello, I'm Claude », puis « Nice to meet you, I'm… » ; « Nice to meet you,
 * Sam » chez Copilot. Le produit avait un personnage (Plume, 08/10) et le
 * cachait jusqu'au premier dossier : on entrait par un formulaire d'entreprise,
 * sans savoir qui allait faire le travail.
 *
 * ⚠️ TROIS LIGNES, ET CHACUNE EST UNE RÈGLE DU PRODUIT, pas une promesse :
 * les relances partent à votre nom une fois que vous l'avez décidé (ligne
 * rouge n° 1), chacune s'affiche une heure avant de partir, et rien ne part vers
 * un tribunal. Ce sont les trois choses qu'un gérant veut savoir avant de
 * laisser un logiciel écrire à ses clients.
 */
export function EcranPlumeSePresente({
	progression,
	nom,
	onNom,
	enCours,
	onContinuer
}: {
	readonly progression: ProgressionPremiersPas;
	readonly nom: string;
	readonly onNom: (valeur: string) => void;
	readonly enCours: boolean;
	readonly onContinuer: () => void;
}) {
	return (
		<CadrePremiersPas
			progression={progression}
			cle="plume"
			pied={
				<BoutonPrincipal
					type="submit"
					form="premiers-pas-plume"
					pleineLargeur
					loading={enCours}
					readOnly={enCours}
					disabled={nom.trim() === ''}
				>
					Continuer
				</BoutonPrincipal>
			}
		>
			<EnTeteDEtape
				personnage={<Plume humeur="content" taille={88} sol />}
				titre={`Bonjour, je suis ${NOM_DU_PILOTE}.`}
				explication="Je lis vos factures, je compte ce que vos clients vous doivent, pénalités comprises, et je surveille vos dates limites pour agir."
			/>

			<ListeDePromesses
				promesses={[
					{
						icone: <SendIcon />,
						titre: 'Je relance à votre nom, quand vous l’avez décidé',
						precision: 'Par e-mail, et les réponses arrivent chez vous.'
					},
					{
						icone: <ClockIcon />,
						titre: 'Chaque relance s’affiche une heure avant de partir',
						precision: 'Vous la retenez d’un geste.'
					},
					{
						icone: <LandmarkIcon />,
						titre: 'Rien ne part vers un tribunal',
						precision: 'Ce qui va devant un juge passe par l’avocat que vous choisissez.'
					}
				]}
			/>

			<form
				id="premiers-pas-plume"
				onSubmit={(e) => {
					e.preventDefault();
					if (nom.trim() !== '') onContinuer();
				}}
			>
				<Champ etiquette="Et vous, comment vous appelez-vous ?">
					<Input
						value={nom}
						onChange={onNom}
						name="name"
						placeholder="Votre prénom et votre nom"
						inputComponentProps={{ autoComplete: 'name' }}
						required
					/>
				</Champ>
			</form>
		</CadrePremiersPas>
	);
}
