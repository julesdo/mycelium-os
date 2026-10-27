import { Input } from '@cladd-ui/react';
import { TicketIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonTexte,
	EnTeteDeGroupe,
	FeuilleDeReussite,
	FeuillePleinEcran,
	LigneDeReleve,
	ListeDeReleve,
	MessageErreur,
	VignetteRangee
} from '../../ui';
import { LONGUEUR_DES_CODES, MAX_ESSAIS } from '../../lib/paiement/codes-privilege';
import { GRILLE, type Formule } from '../../lib/config/tarifs';

/**
 * « CODE PRIVILÈGE », DANS LE COMPTE (27/10/2026). Relevé sur Mobbin : la rangée
 * « Redeem Gift Card or Code » de l'App Store et « Redeem a code » d'Ahead, le champ
 * unique de Duolingo et de Wolt, l'offre montrée AVANT d'être prise chez l'App Store et
 * Forest, le récapitulatif de Woolworths sur la coche.
 *
 * Deux temps : « Vérifier le code » montre ce qu'il offre et ce qu'il changera, sans le
 * consommer ; « Activer le code » le prend. Le champ se met en forme pendant la frappe
 * (`saisieDuCode`, par la route), en majuscules et par groupes de quatre, et accepte un
 * code collé tel quel.
 */

/** La valeur de la rangée : ce qu'un code a déjà offert, ou l'invitation à en saisir un. */
export function resumeDuCodePrivilege(
	abonnement:
		| {
				readonly accesOffert?: { readonly formule: Formule } | null;
				readonly remisePrivilege?: { readonly etat: 'EN_ATTENTE' | 'APPLIQUEE' } | null;
		  }
		| null
		| undefined
): string {
	if (abonnement?.accesOffert) return `${GRILLE[abonnement.accesOffert.formule].nom} offert à vie`;
	if (abonnement?.remisePrivilege?.etat === 'EN_ATTENTE') return 'Remise en attente';
	if (abonnement?.remisePrivilege?.etat === 'APPLIQUEE') return 'Remise appliquée';
	return 'Saisir un code';
}

export interface ExamenAffiche {
	/** « Accès Pro offert à vie », « −50 % pendant 3 mois ». */
	readonly titre: string;
	readonly consequences: readonly string[];
}

export interface CodePrivilegeAffiche {
	readonly saisie: string;
	readonly onSaisir: (valeur: string) => void;
	/** `examine` : le code est bon, rien n'est encore pris ; `active` : il l'est. */
	readonly etape: 'saisie' | 'examine' | 'active';
	readonly examen: ExamenAffiche | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onVerifier: () => void;
	readonly onModifier: () => void;
	readonly onActiver: () => void;
}

export function FeuilleCodePrivilege({
	ouverte,
	onFermer,
	code
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly code: CodePrivilegeAffiche;
}) {
	const complet = code.saisie.replace(/-/g, '').length === LONGUEUR_DES_CODES;
	const examine = code.etape === 'examine';
	const geste = examine ? code.onActiver : code.onVerifier;
	const pret = (examine || complet) && !code.enCours;

	if (code.etape === 'active' && code.examen !== null) {
		return (
			<FeuilleDeReussite
				ouverte={ouverte}
				titre="Code activé"
				pour={code.examen.titre}
				{...(code.examen.consequences[0] === undefined
					? {}
					: { detail: code.examen.consequences[0] })}
				principale={{ libelle: 'Terminé', onClick: onFermer }}
			/>
		);
	}

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Code privilège"
			pied={
				<BoutonPrincipal pleineLargeur disabled={!pret} onClick={geste}>
					{examine ? 'Activer le code' : 'Vérifier le code'}
				</BoutonPrincipal>
			}
		>
			<div className="flex flex-col gap-cladd-sm">
				<div className="flex flex-col items-center gap-cladd-3xs pt-cladd-2xs text-center">
					<VignetteRangee
						famille="ARGENT"
						picto={TicketIcon}
						className="size-14 rounded-cladd-lg"
						classePicto="size-7"
					/>
					<p className="mt-cladd-3xs text-cladd-md font-semibold">Vous avez reçu un code ?</p>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						Saisissez-le tel qu’on vous l’a donné. Il ne s’utilise qu’une fois.
					</p>
				</div>

				<div className="flex flex-col gap-cladd-3xs">
					<Input
						size="lg"
						value={code.saisie}
						onChange={code.onSaisir}
						placeholder="XXXX-XXXX-XXXX-XXXX"
						readOnly={examine}
						className="font-mono tracking-wider"
						inputComponentProps={{
							'aria-label': 'Votre code privilège',
							autoComplete: 'off',
							autoCapitalize: 'characters',
							autoCorrect: 'off',
							spellCheck: false,
							enterKeyHint: 'go',
							onKeyDown: (e) => {
								if (e.key === 'Enter' && pret) geste();
							}
						}}
					/>
					{examine ? (
						<BoutonTexte className="self-start" onClick={code.onModifier}>
							Modifier le code
						</BoutonTexte>
					) : null}
				</div>

				{code.erreur === null ? null : <MessageErreur>{code.erreur}</MessageErreur>}

				{examine && code.examen !== null ? (
					<section className="flex flex-col gap-cladd-3xs">
						<EnTeteDeGroupe libelle="Ce que ce code vous offre" />
						<ListeDeReleve>
							<LigneDeReleve titre={code.examen.titre} ligne="Code privilège, à usage unique" />
							{/* Des phrases entières : une ligne de relevé les couperait. */}
							{code.examen.consequences.map((c) => (
								<p key={c} className="px-3.5 py-2.5 text-cladd-xs leading-relaxed">
									{c}
								</p>
							))}
						</ListeDeReleve>
					</section>
				) : (
					<p className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-softer">
						Un code se reçoit de l’équipe de Letikette ou d’un partenaire. {MAX_ESSAIS} essais par
						quart d’heure.
					</p>
				)}
			</div>
		</FeuillePleinEcran>
	);
}
