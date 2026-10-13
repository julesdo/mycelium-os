import { Input } from '@cladd-ui/react';
import {
	ApercuDeLettre,
	BoutonPrincipal,
	CadrePremiersPas,
	Champ,
	DirigeantsProposes,
	EnTeteDEtape,
	MessageErreur,
	type DirigeantPropose,
	type EtatDirigeants,
	type ProgressionPremiersPas
} from '../../ui';

/** Ce que l'étape saisit : les quatre valeurs de l'en-tête. */
export interface EnTeteSaisi {
	readonly signataireNom: string;
	readonly signataireQualite: string;
	readonly email: string;
	readonly iban: string;
}

/**
 * VOS LETTRES — qui signe, où l'on vous répond, où l'on vous paie (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI MANQUAIT : ON LE DÉCOUVRAIT LE JOUR OÙ L'ON VOULAIT ÉCRIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le signataire, l'adresse et l'IBAN s'impriment sur chaque lettre, et sans eux
 * la composition refuse (audit du 29/09, F6). Ils se demandaient dans le compte,
 * après coup, sous un verrou de l'accueil. Ils se demandent maintenant ici, au
 * moment où le gérant installe son outil, avec l'APERÇU de ce que verra son
 * client (Acctual, QuickBooks) : on remplit mieux un champ quand on voit où il
 * s'imprime.
 *
 * ⚠️ LE LOGICIEL PROPOSE, LE GÉRANT CONFIRME : les dirigeants publiés au
 * registre se proposent d'un toucher (`DirigeantsProposes`), l'adresse du compte
 * remplit déjà la sienne. Rien n'est retenu d'office.
 */
export function EcranLettres({
	progression,
	denomination,
	adresse,
	saisie,
	onSaisie,
	dirigeants,
	onDemanderDirigeants,
	enCours,
	erreur,
	onEnregistrer
}: {
	readonly progression: ProgressionPremiersPas;
	readonly denomination: string;
	readonly adresse?: string;
	readonly saisie: EnTeteSaisi;
	readonly onSaisie: (changement: Partial<EnTeteSaisi>) => void;
	/** Absent quand l'entreprise n'a pas de numéro : le registre n'a rien à proposer. */
	readonly dirigeants?: EtatDirigeants;
	readonly onDemanderDirigeants: () => void;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onEnregistrer: () => void;
}) {
	// Les trois sans lesquels une lettre refuse de se composer (`gabarits/commun.ts`).
	const pret =
		saisie.signataireNom.trim() !== '' &&
		saisie.signataireQualite.trim() !== '' &&
		saisie.email.trim() !== '';
	return (
		<CadrePremiersPas
			progression={progression}
			cle="lettres"
			pied={
				<>
					{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}
					<BoutonPrincipal
						type="submit"
						form="premiers-pas-lettres"
						pleineLargeur
						loading={enCours}
						readOnly={enCours}
						disabled={!pret}
					>
						Enregistrer
					</BoutonPrincipal>
				</>
			}
		>
			<EnTeteDEtape
				titre="À quel nom j’écris ?"
				explication="Vos relances partent à votre nom. Voici ce qui s’imprime sous chacune."
			/>

			<ApercuDeLettre
				denomination={denomination}
				{...(adresse === undefined ? {} : { adresse })}
				signataireNom={saisie.signataireNom}
				signataireQualite={saisie.signataireQualite}
				email={saisie.email}
				iban={saisie.iban}
			/>

			{/* Hors du formulaire : un bouton du kit posé dans un `<form>` l'envoie. */}
			{dirigeants === undefined ? null : (
				<DirigeantsProposes
					etat={dirigeants}
					onDemander={onDemanderDirigeants}
					onChoisir={(dirigeant: DirigeantPropose) =>
						onSaisie({ signataireNom: dirigeant.nom, signataireQualite: dirigeant.fonction })
					}
				/>
			)}
			<form
				id="premiers-pas-lettres"
				onSubmit={(e) => {
					e.preventDefault();
					if (pret) onEnregistrer();
				}}
				className="flex flex-col gap-cladd-2xs"
			>
				<Champ etiquette="Qui signe">
					<Input
						value={saisie.signataireNom}
						onChange={(signataireNom) => onSaisie({ signataireNom })}
						name="signataire"
						inputComponentProps={{ autoComplete: 'name' }}
						required
					/>
				</Champ>
				<Champ etiquette="Sa fonction" aide="Gérant, présidente, directeur administratif…">
					<Input
						value={saisie.signataireQualite}
						onChange={(signataireQualite) => onSaisie({ signataireQualite })}
						name="fonction"
						inputComponentProps={{ autoComplete: 'organization-title' }}
						required
					/>
				</Champ>
				<Champ
					etiquette="Où vos clients vous répondent"
					aide="Les réponses arrivent à cette adresse, pas chez nous."
				>
					<Input
						type="email"
						value={saisie.email}
						onChange={(email) => onSaisie({ email })}
						name="email"
						inputMode="email"
						inputComponentProps={{ autoComplete: 'email', autoCapitalize: 'none' }}
						required
					/>
				</Champ>
				<Champ
					etiquette="Où vos clients vous paient"
					aide="Il s’imprime sous la lettre officielle et sur la page où votre client paie. Vous pouvez le donner plus tard."
				>
					<Input
						value={saisie.iban}
						onChange={(iban) => onSaisie({ iban: iban.toUpperCase() })}
						name="iban"
						placeholder="FR76 …"
						inputComponentProps={{
							autoComplete: 'off',
							autoCapitalize: 'characters',
							spellCheck: false
						}}
					/>
				</Champ>
			</form>
		</CadrePremiersPas>
	);
}
