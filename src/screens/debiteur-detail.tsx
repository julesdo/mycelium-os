import { Checkbox, Chip, Surface } from '@cladd-ui/react';
import {
	BoutonPrincipal,
	ConstatRegistre,
	HabitudePaiement,
	IdentiteDebiteur,
	Lettrage,
	Pieces,
	SectionEcran,
	dateCourte,
	eurosCentimes,
	pluriel,
	type ConstatRegistreAffiche,
	type HabitudeAffichee,
	type OptionSecteur,
	type OptionTypePiece,
	type PieceAffichee,
	type PropositionLettrage,
	type RuptureAffichee
} from '../ui';

/**
 * LE VOLET DE PREUVE D'UN DÉBITEUR — ce qu'il doit, facture par facture.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL VIT ICI ET PLUS DANS SA ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est l'écran où le gérant passe le plus de temps, et il n'était pas
 * ouvrable : il tenait dans `routes/app/debiteurs.tsx`, mêlé aux requêtes
 * Convex. Ses COMPOSANTS étaient tous à la salle d'exposition — identité,
 * habitude, lettrage, pièces — mais jamais leur ASSEMBLAGE, qui est
 * précisément ce qui peut devenir trop long.
 *
 * La règle du projet est explicite : « chaque écran s'ouvre dans le navigateur
 * intégré aux quatre largeurs de référence AVANT d'être déclaré fini ». Vérifier
 * les briques ne vérifie pas le mur.
 *
 * Même découpage que `screens/accueil.tsx` et `screens/creance.tsx` : ce
 * fichier DESSINE et ne sait pas interroger Convex ; la route LIT et traduit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ORDRE : QUI EST CE CLIENT, COMMENT IL PAIE, CE QU'IL DOIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On lit d'abord ce que le gérant seul peut dire — SIREN, secteur, taux
 * stipulé. Puis les pièces qui portent le dossier. Puis comment ce client paie
 * d'habitude. Puis on rapproche un virement. Les factures viennent en dernier
 * parce qu'on y revient une fois qu'on sait quoi en faire.
 */

export interface FactureAffichee {
	readonly _id: string;
	readonly reference: string;
	readonly montantTTC: bigint;
	readonly resteDu: bigint;
	readonly dateEcheance?: string;
	readonly exigibiliteDeduite: boolean;
	readonly datePrescription?: string;
	readonly dansUneCreance: boolean;
}

export interface DebiteurAffiche {
	readonly siren?: string;
	readonly secteur?: string;
	readonly santeFinanciere: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly constatRegistre?: ConstatRegistreAffiche;
}

export function DetailDebiteur({
	debiteur,
	factures,
	optionsSecteur,
	erreurSiren,
	tauxStipule,
	constatTaux,
	pieces,
	optionsTypePiece,
	depotEnCours,
	habitude,
	ruptures,
	propositionLettrage,
	lettrageEnCours,
	erreurLettrage,
	selection,
	erreur,
	onEnregistrerSiren,
	onChoisirSecteur,
	onEnregistrerTaux,
	onDeposerPieces,
	onClasserPiece,
	onRetirerPiece,
	onChercherLettrage,
	onAppliquerLettrage,
	onBasculerFacture,
	onConstituer
}: {
	/** `null` quand aucun débiteur n'est choisi, ou que ses factures chargent. */
	debiteur: DebiteurAffiche | null;
	factures: readonly FactureAffichee[] | null;
	optionsSecteur: readonly OptionSecteur[];
	erreurSiren: string | null;
	tauxStipule: string | undefined;
	constatTaux: string | null;
	pieces: readonly PieceAffichee[];
	optionsTypePiece: readonly OptionTypePiece[];
	depotEnCours: boolean;
	habitude: HabitudeAffichee | null;
	ruptures: readonly RuptureAffichee[];
	propositionLettrage: PropositionLettrage | null;
	lettrageEnCours: boolean;
	erreurLettrage: string | null;
	selection: ReadonlySet<string>;
	erreur: string | null;
	onEnregistrerSiren: (saisi: string) => void;
	onChoisirSecteur: (cle: string) => void;
	onEnregistrerTaux: (pourcentage: string | null) => void;
	onDeposerPieces: (fichiers: File[]) => void;
	onClasserPiece: (pieceId: string, type: string) => void;
	onRetirerPiece: (pieceId: string) => void;
	onChercherLettrage: (montant: string, date: string) => void;
	onAppliquerLettrage: (references: readonly string[], total: bigint) => void;
	onBasculerFacture: (factureId: string) => void;
	onConstituer: () => void;
}) {
	if (debiteur === null || factures === null) {
		return (
			<div className="p-cladd-2xs">
				<p className="text-cladd-xs text-cladd-fg-soft">
					Choisissez un débiteur pour voir ce qu’il doit, facture par facture.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-cladd-2xs p-cladd-2xs">
			{/* CE QUE LE GÉRANT SEUL PEUT DIRE, EN TÊTE DE LA PREUVE.
			    L'écran affichait « Secteur à préciser » sur la liste depuis des mois —
			    et il n'existait AUCUN moyen de le préciser. Une consigne impossible à
			    suivre est pire qu'aucune consigne : le gérant cherche, ne trouve pas,
			    et cesse de croire les autres. */}
			<IdentiteDebiteur
				siren={debiteur.siren}
				secteur={debiteur.secteur}
				optionsSecteur={optionsSecteur}
				erreurSiren={erreurSiren}
				onEnregistrerSiren={onEnregistrerSiren}
				onChoisirSecteur={onChoisirSecteur}
				tauxContractuel={tauxStipule}
				constatTaux={constatTaux}
				onEnregistrerTaux={onEnregistrerTaux}
			/>

			{/* LES PIÈCES, JUSTE APRÈS L'IDENTITÉ. Elles valent pour toutes les
			    factures du client — des CGV ou un contrat-cadre ne se redéposent pas
			    par dossier. */}
			{/* ⚠️ `pluriel` PLUTÔT QUE « document(s) ». Le produit écrit du français,
			    pas une notation de formulaire administratif — et « 1 document(s) »
			    se lit sur chaque dossier qui n’en porte qu’un, c’est-à-dire souvent. */}
			<SectionEcran
				titre="Les pièces du dossier"
				legende={`${pieces.length} document${pluriel(pieces.length)}`}
			>
				<Pieces
					pieces={pieces}
					optionsType={optionsTypePiece}
					enCours={depotEnCours}
					onDeposer={onDeposerPieces}
					onClasser={onClasserPiece}
					onRetirer={onRetirerPiece}
				/>
			</SectionEcran>

			{/* L'HABITUDE, ENTRE L'IDENTITÉ ET LE LETTRAGE. L'ordre n'est pas neutre :
			    on lit qui est ce client, puis comment il paie, puis on rapproche un
			    virement. C'est la chronologie du geste réel. */}
			{habitude === null ? null : <HabitudePaiement habitude={habitude} ruptures={ruptures} />}

			<Lettrage
				proposition={propositionLettrage}
				enCours={lettrageEnCours}
				erreur={erreurLettrage}
				onChercher={onChercherLettrage}
				onAppliquer={onAppliquerLettrage}
			/>

			{debiteur.constatRegistre === undefined ? null : (
				<ConstatRegistre constat={debiteur.constatRegistre} sante={debiteur.santeFinanciere} />
			)}

			{factures.map((facture) => (
				<Surface
					key={facture._id}
					// En verre comme toutes les cartes du produit.
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex gap-cladd-3xs p-cladd-2xs"
				>
					<Checkbox
						checked={selection.has(facture._id)}
						onChange={() => onBasculerFacture(facture._id)}
						disabled={facture.dansUneCreance}
						aria-label={`Sélectionner ${facture.reference}`}
					/>
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
							<span className="text-cladd-sm font-semibold">{facture.reference}</span>
							<span className="shrink-0 text-cladd-sm tabular-nums">
								{eurosCentimes(facture.resteDu)}
							</span>
						</div>

						{facture.dateEcheance ? (
							<p className="text-cladd-2xs text-cladd-fg-softer">
								Échue le {dateCourte(facture.dateEcheance)}
							</p>
						) : null}

						{facture.exigibiliteDeduite ? (
							<p className="text-cladd-2xs text-cladd-fg-softest">
								Exigibilité déduite de l’échéance — à confirmer si vos conditions contractuelles
								disent autre chose.
							</p>
						) : null}

						<div className="flex flex-wrap items-center gap-1.5">
							{facture.dansUneCreance ? (
								<Chip size="md" color="neutral">
									Déjà dans une créance
								</Chip>
							) : null}
							{facture.datePrescription ? (
								<Chip size="md" color="neutral">
									Prescription le {dateCourte(facture.datePrescription)}
								</Chip>
							) : null}
						</div>
					</div>
				</Surface>
			))}

			{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

			{selection.size > 0 ? (
				<BoutonPrincipal onClick={onConstituer}>
					Constituer une créance de {selection.size} facture{pluriel(selection.size)}
				</BoutonPrincipal>
			) : null}
		</div>
	);
}
