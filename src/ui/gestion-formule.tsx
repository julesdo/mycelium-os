import { useState } from 'react';
import { Spinner } from '@cladd-ui/react';
import { CheckIcon } from 'lucide-react';
import { GRILLE, montantDuRythme, type Formule, type Rythme } from '../lib/config/tarifs';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { CarteBouton, LigneDeReleve, ListeDeReleve } from './carte-rangee';
import { cn } from './cn';
import { VignetteRangee } from './familles';
import { FeuillePleinEcran } from './plein-ecran';
import { montantCourt, montantHT, prixHTetTTC, ttcAuMemeTaux } from './montants-abonnement';

/**
 * GÉRER SA FORMULE — les deux feuilles qui changent un abonnement (14/10/2026),
 * relevées sur Oportun et Natural AI.
 *
 * ⚠️ LE PRIX D'UN CHANGEMENT SE MONTRE AVANT LE GESTE. Paddle calcule le
 * prorata ; la feuille dit ce qui serait prélevé aujourd'hui et ensuite, et
 * seulement après, « Confirmer ».
 *
 * ⚠️ RÉSILIER EN DEUX GESTES, SANS PIÈGE. Une raison, facultative, puis la
 * confirmation qui dit ce qui se passe. Ni compte à rebours, ni offre « dernière
 * chance », ni bouton caché : c'est l'expérience « fiable, pas cheap » que le
 * fondateur demande. Une seule proposition, et seulement si la raison est le
 * prix : la formule du dessous.
 */

/** Ce que Paddle annonce pour un changement, en centimes : hors taxes, et TVA comprise. */
export type ApercuDeChangement =
	| { readonly etat: 'attente' }
	| {
			readonly etat: 'pret';
			readonly aujourdhui: number;
			readonly ensuite: number | null;
			readonly prochainLe: number | null;
			/** Les mêmes montants TVA comprise, tels que Paddle les calcule pour ce client. */
			readonly aujourdhuiTTC?: number | null;
			readonly ensuiteTTC?: number | null;
	  }
	| { readonly etat: 'erreur'; readonly message: string };

export function ConfirmationDeChangement({
	ouverte,
	onFermer,
	formule,
	rythme,
	aLEssai,
	apercu,
	enCours,
	erreur,
	onConfirmer,
	quittePrixFondateurs = false,
	contexte,
	libelleConfirmer = 'Confirmer',
	titre
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly formule: Formule;
	readonly rythme: Rythme;
	/** L'abonnement est au prix fondateurs : le changement le quitte, sans retour. */
	readonly quittePrixFondateurs?: boolean;
	/** L'abonnement est encore à l'essai : rien n'est facturé avant sa fin. */
	readonly aLEssai: boolean;
	readonly apercu: ApercuDeChangement;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onConfirmer: () => void;
	/** Pourquoi on change, en tête : « Pour inviter marie@… ». */
	readonly contexte?: string;
	/** Le titre de la page, quand elle sert un geste : « Suivre Garage Martin ». */
	readonly titre?: string;
	/** Ce que le bouton fait, quand « Confirmer » ne le dit pas assez. */
	readonly libelleConfirmer?: string;
}) {
	const nom = GRILLE[formule].nom;
	const cadence = rythme === 'annuel' ? 'par an' : 'par mois';
	const prixHT = montantDuRythme(formule, rythme) * 100;
	// Le TTC du prix, au rapport que Paddle a calculé sur le prochain prélèvement.
	const prixTTC =
		apercu.etat === 'pret' && apercu.ensuite !== null
			? ttcAuMemeTaux(prixHT, { ht: apercu.ensuite, ttc: apercu.ensuiteTTC ?? null })
			: undefined;
	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			retour
			titre={titre ?? `Passer à ${nom}`}
			pied={
				<>
					{erreur === null ? null : (
						<p className="text-center text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{erreur}
						</p>
					)}
					<BoutonPrincipal
						pleineLargeur
						loading={enCours}
						disabled={enCours || apercu.etat !== 'pret'}
						onClick={onConfirmer}
					>
						{libelleConfirmer}
					</BoutonPrincipal>
				</>
			}
		>
			{contexte === undefined ? null : (
				<p className="px-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">{contexte}</p>
			)}
			<p className="px-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">
				{nom}, {rythme === 'annuel' ? 'à l’année' : 'au mois'} :{' '}
				{prixHTetTTC(prixHT, prixTTC, cadence)}.
			</p>
			{apercu.etat === 'attente' ? (
				<div className="flex justify-center py-cladd-sm">
					<Spinner size="md" />
				</div>
			) : apercu.etat === 'erreur' ? (
				<p className="px-1 text-cladd-xs leading-relaxed text-cladd-fg-soft">{apercu.message}</p>
			) : (
				<ListeDeReleve>
					<LigneDeReleve
						titre="Aujourd’hui"
						ligne={
							apercu.aujourdhui !== 0
								? apercu.aujourdhuiTTC === undefined || apercu.aujourdhuiTTC === null
									? 'Au prorata de la période en cours'
									: `${montantHT(Math.abs(apercu.aujourdhui))}, au prorata de la période en cours`
								: aLEssai
									? 'Votre essai continue'
									: 'Rien à payer aujourd’hui'
						}
						montant={
							apercu.aujourdhui > 0
								? montantCourt(apercu.aujourdhui, apercu.aujourdhuiTTC)
								: apercu.aujourdhui < 0
									? `${montantCourt(
											-apercu.aujourdhui,
											apercu.aujourdhuiTTC === undefined || apercu.aujourdhuiTTC === null
												? null
												: -apercu.aujourdhuiTTC
										)} en votre faveur`
									: 'Rien'
						}
					/>
					{apercu.ensuite === null ? null : (
						<LigneDeReleve
							titre="Ensuite"
							{...ligneEnsuite(apercu.ensuite, apercu.ensuiteTTC, apercu.prochainLe)}
							montant={montantCourt(apercu.ensuite, apercu.ensuiteTTC)}
						/>
					)}
				</ListeDeReleve>
			)}
			{quittePrixFondateurs ? (
				<p className="px-1 text-cladd-xs leading-relaxed font-medium">
					Vous êtes au prix fondateurs, bloqué à vie. En changeant de formule, vous le quittez : il
					ne revient pas.
				</p>
			) : null}
			<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
				Montants calculés par Paddle pour votre compte : le TTC comprend la TVA de votre pays.
				Paddle envoie la facture.
			</p>
		</FeuillePleinEcran>
	);
}

const RAISONS = [
	{ cle: 'prix', libelle: 'C’est trop cher pour moi' },
	{ cle: 'plus-d-impayes', libelle: 'Je n’ai plus d’impayés à suivre' },
	{ cle: 'manque', libelle: 'Il me manque quelque chose' },
	{ cle: 'autre', libelle: 'Une autre raison' }
] as const;

export function FeuilleDeResiliation({
	ouverte,
	onFermer,
	formule,
	finLe,
	enCours,
	erreur,
	onResilier,
	onFormuleDuDessous,
	reference
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly formule: Formule;
	/** Le jour où l'accès s'arrête : fin de l'essai ou de la période payée. */
	readonly finLe: number | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onResilier: (raison: string | undefined) => void;
	/** Passer à la formule du dessous, quand la raison est le prix. */
	readonly onFormuleDuDessous?: (formule: Formule) => void;
	/** Le prochain prélèvement, HT et TTC : son rapport donne le TTC des autres prix. */
	readonly reference?: { readonly ht: number | null; readonly ttc: number | null } | null;
}) {
	const [raison, setRaison] = useState<string | undefined>(undefined);
	const dessous: Formule | null =
		formule === 'pro' ? 'equipe' : formule === 'equipe' ? 'solo' : null;
	const fin = finLe === null ? 'à la fin de la période en cours' : `le ${dateEnLettres(finLe)}`;

	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Résilier"
			pied={
				<>
					{erreur === null ? null : (
						<p className="text-center text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{erreur}
						</p>
					)}
					<BoutonPrincipal
						pleineLargeur
						loading={enCours}
						disabled={enCours}
						onClick={() => onResilier(raison)}
					>
						Résilier
					</BoutonPrincipal>
					<BoutonTexte className="self-center" onClick={onFermer}>
						Garder ma formule
					</BoutonTexte>
				</>
			}
		>
			<ListeDeReleve>
				<LigneDeReleve titre="Les relances s’arrêtent" montant={fin} retour />
				<LigneDeReleve titre="Rien ne sera plus prélevé" montant="Dès maintenant" retour />
				<LigneDeReleve
					titre="Vos factures, clients et calculs"
					ligne="Ils restent, et vous voyez toujours ce qu’on vous doit"
					montant="Conservés"
					retour
				/>
			</ListeDeReleve>

			<div className="flex flex-col gap-2">
				<p className="px-1 text-cladd-xs font-semibold">Pourquoi partez-vous ? (facultatif)</p>
				<div role="radiogroup" aria-label="Pourquoi partez-vous" className="flex flex-col gap-2">
					{RAISONS.map((r) => {
						const choisie = raison === r.cle;
						return (
							<button
								key={r.cle}
								type="button"
								role="radio"
								aria-checked={choisie}
								onClick={() => setRaison(choisie ? undefined : r.cle)}
								className={cn(
									'verre-carte verre-bouton flex min-h-12 w-full items-center gap-3 rounded-cladd-xl px-3.5 py-2 text-left',
									choisie && 'outline-2 outline-cladd-primary'
								)}
							>
								<span className="flex-1 text-cladd-xs">{r.libelle}</span>
								<span
									aria-hidden
									className={cn(
										'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
										choisie
											? 'border-cladd-primary bg-cladd-primary text-white'
											: 'border-cladd-fg/25'
									)}
								>
									{choisie ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{raison === 'prix' && dessous !== null && onFormuleDuDessous !== undefined ? (
				<CarteBouton
					icone={<VignetteRangee famille="ARGENT" className="size-10" />}
					titre={`Passer à ${GRILLE[dessous].nom}`}
					ligne={`${prixHTetTTC(GRILLE[dessous].mensuel * 100, ttcAuMemeTaux(GRILLE[dessous].mensuel * 100, reference), 'par mois')}, ${GRILLE[dessous].pour.toLowerCase()}`}
					onClick={() => onFormuleDuDessous(dessous)}
				/>
			) : null}
		</FeuillePleinEcran>
	);
}

/** La ligne sous « Ensuite » : le hors taxes quand le TTC est en montant, puis la date. */
function ligneEnsuite(
	ht: number,
	ttc: number | null | undefined,
	prochainLe: number | null
): { ligne?: string } {
	const morceaux = [
		ttc === undefined || ttc === null ? null : montantHT(ht),
		prochainLe === null ? null : `à partir du ${dateEnLettres(prochainLe)}`
	].filter((m): m is string => m !== null);
	if (morceaux.length === 0) return {};
	const ligne = morceaux.join(', ');
	return { ligne: ligne.charAt(0).toUpperCase() + ligne.slice(1) };
}

function dateEnLettres(ms: number): string {
	return new Date(ms).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}
