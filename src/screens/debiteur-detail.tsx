import { Checkbox, Chip, ListTitle, Surface } from '@cladd-ui/react';
import { FileTextIcon, HistoryIcon, ScaleIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	ConstatRegistre,
	IdentiteDebiteur,
	Lettrage,
	LigneAnalyse,
	ListeAnalyses,
	dateCourte,
	eurosCentimes,
	pluriel,
	type ConstatRegistreAffiche,
	type HabitudeAffichee,
	type OptionSecteur,
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

/**
 * Les natures de pièce, et ce que chacune ÉTABLIT.
 *
 * ⚠️ L'APPORT SOUS CHAQUE OPTION, PAS LE NOM SEUL. Un gérant ne classe pas un
 * document pour le plaisir de la nomenclature : il le classe parce que ça
 * change la solidité de son dossier. « Bon de livraison » ne dit rien ;
 * « prouve que la marchandise a été remise » dit pourquoi ça compte.
 *
 * `INDETERMINE` y figure délibérément : c'est un état légitime — un document
 * déposé dont la lecture n'a rien conclu — et le masquer empêcherait de revenir
 * en arrière après un classement erroné.
 */
export const TYPES_PIECE = [
	{ cle: 'INDETERMINE', libelle: 'À classer', apport: 'Ne compte dans aucun critère' },
	{
		cle: 'BON_DE_COMMANDE',
		libelle: 'Bon de commande',
		apport: 'Établit que le client a commandé'
	},
	{ cle: 'DEVIS_SIGNE', libelle: 'Devis signé', apport: 'Établit que le client a commandé' },
	{
		cle: 'BON_DE_LIVRAISON',
		libelle: 'Bon de livraison',
		apport: 'Établit que la prestation a été reçue'
	},
	{ cle: 'CGV', libelle: 'Conditions générales', apport: 'Établit les conditions de paiement' },
	{ cle: 'CONTRAT', libelle: 'Contrat', apport: 'Établit les conditions de paiement' },
	{
		cle: 'MISE_EN_DEMEURE',
		libelle: 'Mise en demeure',
		apport: 'Établit l’interpellation préalable'
	},
	{ cle: 'ECHANGES', libelle: 'Échanges', apport: 'Documente la relation, sans critère propre' },
	{ cle: 'FACTURE', libelle: 'Facture', apport: 'La facture elle-même' }
] as const;

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

/** Une créance de ce débiteur, telle que la rangée l'affiche. */
export interface CreanceDuDebiteur {
	readonly _id: string;
	readonly statut: string;
	readonly principalRestantDu: bigint;
	readonly nombreFactures: number;
}

export interface DebiteurAffiche {
	readonly siren?: string;
	readonly secteur?: string;
	readonly santeFinanciere: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly constatRegistre?: ConstatRegistreAffiche;
}

export function DetailDebiteur({
	debiteurId,
	debiteur,
	factures,
	creances,
	optionsSecteur,
	erreurSiren,
	tauxStipule,
	constatTaux,
	pieces,
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
	onChercherLettrage,
	onAppliquerLettrage,
	onBasculerFacture,
	onConstituer
}: {
	/** L'identifiant, pour construire les liens vers les pages de détail. */
	debiteurId: string;
	/** `null` quand aucun débiteur n'est choisi, ou que ses factures chargent. */
	debiteur: DebiteurAffiche | null;
	factures: readonly FactureAffichee[] | null;
	/**
	 * Les créances déjà constituées pour ce débiteur.
	 *
	 * ⚠️ C'EST LA SEULE PORTE VERS L'ÉCRAN DE CRÉANCE, une fois passée la
	 * redirection qui suit sa constitution. Voir la note devant la liste.
	 */
	creances: readonly CreanceDuDebiteur[];
	optionsSecteur: readonly OptionSecteur[];
	erreurSiren: string | null;
	tauxStipule: string | undefined;
	constatTaux: string | null;
	/**
	 * ⚠️ LE VOLET NE PORTE PLUS QUE LE COMPTE. Le dépôt, le classement et le
	 * retrait vivent sur `/app/debiteurs/$id/pieces` : ce sont des gestes, et
	 * un geste a besoin de place. Les garder ici obligeait à passer les cinq
	 * props correspondantes à travers un écran qui ne s'en sert plus.
	 */
	pieces: readonly PieceAffichee[];
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
	onChercherLettrage: (montant: string, date: string) => void;
	onAppliquerLettrage: (references: readonly string[], total: bigint) => void;
	onBasculerFacture: (factureId: string) => void;
	onConstituer: () => void;
}) {
	// Une pièce « à classer » est une pièce déposée dont la lecture n'a rien
	// conclu. Elle existe, elle se voit, et elle ne compte dans aucun critère.
	const aClasser = pieces.filter(
		(piece) => piece.statut === 'A_CLASSER' || piece.statut === 'ECHEC'
	).length;

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

			{/*
			  LES PIÈCES ET L’HABITUDE DEVIENNENT DES RANGÉES.

			  ⚠️ ELLES OCCUPAIENT LE VOLET À ELLES DEUX. Les pièces disent, par
			  document, leur nature, leur numéro, leur date, le constat de leur lecture
			  et la réserve qu’elles portent : cinq lignes chacune, sur un dossier qui
			  en compte dix. Le reste du volet — les factures, c’est-à-dire ce qu’on
			  vient y chercher — passait sous l’horizon.

			  Une rangée dit le compte, la page dit le détail. Même geste que sur
			  l’écran de créance, et pour la même raison.
			*/}
			{/*
			  SES CRÉANCES — l'arête qui manquait, et la plus coûteuse du produit.

			  ═══════════════════════════════════════════════════════════════════
			  ⚠️ UNE CRÉANCE NE SE REVOYAIT PAS
			  ═══════════════════════════════════════════════════════════════════

			  L'écran d'une créance porte le score de solidité, six pages d'analyse
			  et le décompte : c'est le plus riche du produit. On n'y entrait que
			  d'UNE façon — la redirection qui suit `constituer()`, sur cet écran-ci.
			  Une fois qu'on en était sorti, plus aucun lien n'y menait : ni la
			  liste des débiteurs, ni ce volet, ni l'accueil, ni le détail. Elle
			  n'était visible que dans les secondes qui suivaient sa création.

			  Les six pages d'analyse pointaient bien vers elle, mais en RETOUR — ce
			  qui ne l'atteint pas : il faut déjà y être pour les voir. Les sept
			  écrans formaient un îlot fermé, cohérent en dedans, relié à rien en
			  dehors.

			  ⚠️ ET LA REQUÊTE EXISTAIT DÉJÀ. `listerCreances` est complète et
			  testée, et n'était appelée par personne — il lui manquait seulement de
			  rendre `debiteurId`, sans quoi on ne pouvait pas montrer à un débiteur
			  LES SIENNES.

			  La valeur de la rangée est le montant : c'est ce qu'on vient chercher.
			  Le compte de factures va en précision, et le score reste sur l'écran
			  de la créance — une rangée porte un chiffre, pas deux.
			*/}
			{creances.length === 0 ? null : (
				<ListeAnalyses>
					{/*
					  ⚠️ LE MOT « CRÉANCE » EST DANS LE TITRE DU GROUPE, PAS SUR CHAQUE
					  RANGÉE — et c'est une mesure. « Créance · 2 factures » disputait sa
					  largeur au montant et repassait à la ligne à 375 px, sur les deux
					  rangées. Répété à l'identique en tête de chacune, il ne distinguait
					  d'ailleurs rien : ce qui sépare deux créances d'un même débiteur,
					  c'est leur montant et ce qu'elles couvrent.

					  `ListTitle` est la réponse du kit pour nommer un groupe de rangées,
					  et il nomme ici une fois ce qui était écrit deux fois.
					*/}
					<ListTitle>Ses créances</ListTitle>
					{creances.map((creance) => (
						<LigneAnalyse
							key={creance._id}
							vers="/app/creance/$id"
							parametres={{ id: creance._id }}
							icone={<ScaleIcon />}
							titre={`${creance.nombreFactures} facture${pluriel(creance.nombreFactures)}`}
							// Un brouillon n'est pas encore qualifié : le dire évite d'ouvrir
							// une créance en croyant qu'elle est prête, et de lire un score
							// qui ne porte encore sur rien.
							precision={creance.statut === 'BROUILLON' ? 'Brouillon' : undefined}
							valeur={eurosCentimes(creance.principalRestantDu)}
						/>
					))}
				</ListeAnalyses>
			)}

			<ListeAnalyses>
				<LigneAnalyse
					vers="/app/debiteurs/$id/pieces"
					parametres={{ id: debiteurId }}
					icone={<FileTextIcon />}
					titre="Les pièces du dossier"
					precision={aClasser > 0 ? `${aClasser} à classer` : undefined}
					valeur={
						pieces.length === 0 ? 'Aucune' : `${pieces.length} document${pluriel(pieces.length)}`
					}
					// ⚠️ Une pièce que la lecture n’a pas su classer ne compte dans AUCUN
					// critère de solidité : tant que personne ne la classe, elle est là
					// sans rien porter, et rien ne le dirait.
					attention={aClasser > 0}
				/>

				{habitude === null ? null : (
					<LigneAnalyse
						vers="/app/debiteurs/$id/habitude"
						parametres={{ id: debiteurId }}
						icone={<HistoryIcon />}
						titre="Comment il paie d’habitude"
						precision={
							ruptures.length > 0
								? `${ruptures.length} rupture${pluriel(ruptures.length)}`
								: undefined
						}
						valeur={habitude.connue ? `${habitude.delaiMedianJours} j` : 'Pas d’historique'}
						attention={ruptures.length > 0}
					/>
				)}
			</ListeAnalyses>

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
