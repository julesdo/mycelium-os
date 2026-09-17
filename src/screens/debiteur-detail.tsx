import type { HistoryState } from '@tanstack/react-router';
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
	useProvenance,
	type ConstatRegistreAffiche,
	type HabitudeAffichee,
	type OptionSecteur,
	type PieceAffichee,
	type PropositionLettrage,
	type PropositionTaux,
	type RuptureAffichee,
	type EtatRecherche,
	type EtablissementPropose
} from '../ui';
import { secteursProposes } from '../ui';

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
 * ⚠️ ELLE VIENT DE `src/ui/`, ET PLUS D'ICI. Elle était définie dans ce
 * fichier, c'est-à-dire dans un écran que T16 supprime, alors que la file — qui
 * reste — en a besoin pour proposer un secteur à un client non classé. La
 * laisser ici aurait emporté le choix du régime de prescription le jour du
 * ménage, en silence. Même traitement que `Facultatif`, qui vivait dans la
 * barre morte. Le ré-export tient ses deux appelants jusqu'à leur disparition.
 */
export { secteursProposes };

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
	/** Ce que le registre dit de sa forme, relevé en même temps que le SIREN. */
	readonly formeJuridique?: string;
	readonly secteur?: string;
	readonly santeFinanciere: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly constatRegistre?: ConstatRegistreAffiche;
}

export function DetailDebiteur({
	debiteurId,
	denomination,
	debiteur,
	etatRecherche,
	onChercherAuRegistre,
	onRetenirEtablissement,
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
	/** L'identifiant, pour construire les liens vers les pages de détail. Vide quand aucun débiteur n'est choisi. */
	debiteurId: string;
	/** Le nom du débiteur, tel qu'il est venu de la facture. */
	denomination: string;
	/** Où en est la recherche au registre public. */
	etatRecherche: EtatRecherche;
	onChercherAuRegistre: () => void;
	onRetenirEtablissement: (etablissement: EtablissementPropose) => void;
	/** `null` quand aucun débiteur n'est choisi, ou qu'il ne figure pas dans la liste. */
	debiteur: DebiteurAffiche | null;
	/** `null` quand aucun débiteur n'est choisi, ou que ses factures ou ses pièces chargent : le volet attend les deux. */
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
	/** `provenance` : ce que la créance ouverte ensuite relira pour revenir ici. Voir `useProvenance`. */
	onConstituer: (provenance: HistoryState) => void;
}) {
	const provenance = useProvenance();

	// Une pièce « à classer » est une pièce déposée dont la lecture n'a rien
	// conclu. Elle existe, elle se voit, et elle ne compte dans aucun critère.
	const aClasser = pieces.filter(
		(piece) => piece.statut === 'A_CLASSER' || piece.statut === 'ECHEC'
	).length;

	/**
	 * LE TAUX DE RETARD RELEVÉ SUR UNE PIÈCE, s'il y en a un.
	 *
	 * ⚠️ IL SE DÉRIVE ICI PARCE QUE LES PIÈCES SONT DÉJÀ LÀ. La rangée des
	 * pièces ne dit que leur compte, et le taux lu se perdait derrière elle :
	 * c'est sur cet écran-ci qu'il sert, puisque c'est ici qu'on le retient.
	 *
	 * La plus récente d'abord — `listerPiecesDuDebiteur` les trie ainsi — donc
	 * des conditions générales déposées ce matin l'emportent sur celles de l'an
	 * dernier. Une seule proposition à la fois : en montrer deux reviendrait à
	 * demander laquelle des deux clauses gouverne la relation, ce qu'aucune
	 * pièce ne dit.
	 */
	const pieceQuiPorteLeTaux = pieces.find((piece) => piece.tauxRetardStipule !== undefined);
	const propositionTaux: PropositionTaux | null =
		pieceQuiPorteLeTaux?.tauxRetardStipule === undefined
			? null
			: {
					pourcentage: pieceQuiPorteLeTaux.tauxRetardStipule,
					piece: pieceQuiPorteLeTaux.filename,
					reference: pieceQuiPorteLeTaux.reference
				};

	if (debiteur === null || factures === null) {
		return (
			<div className="p-cladd-2xs">
				{debiteurId === '' ? (
					<p className="text-cladd-xs text-cladd-fg-soft">
						Choisissez un débiteur pour voir ce qu’il doit, facture par facture.
					</p>
				) : (
					// Un débiteur est choisi, et la feuille plein écran le montre à 375 px : lui
					// dire « choisissez » serait faux. L'attente se lit, elle ne se devine pas.
					<p role="status" className="text-cladd-xs text-cladd-fg-soft">
						Lecture de la fiche…
					</p>
				)}
			</div>
		);
	}

	// La somme des restes dus des factures cochées. ⚠️ EN `bigint`, comme toute la
	// chaîne : un `Number` sur des centimes perd le dernier chiffre au-delà de
	// quatre-vingt-dix mille milliards, et surtout il autorise un demi-centime.
	const restesDusSelectionnes = factures.reduce(
		(somme, facture) => (selection.has(facture._id) ? somme + facture.resteDu : somme),
		0n
	);

	return (
		<div className="flex flex-col gap-cladd-2xs p-cladd-2xs">
			{/*
			  LE NOM DU CLIENT, EN TÊTE, ET SUR AUTANT DE LIGNES QU'IL EN FAUT.

			  ⚠️ IL N'APPARAISSAIT NULLE PART TANT QUE LE DÉBITEUR N'AVAIT PAS DE
			  SIREN. Sous 1024 px la fiche s'ouvre en feuille PLEIN ÉCRAN, par-dessus
			  la liste : le gérant cochait donc des factures sans voir de quel client
			  il s'agissait. C'est l'erreur la plus coûteuse de cet écran — constituer
			  une créance sur le mauvais débiteur.

			  ⚠️ ET IL NE SE TRONQUE PAS. « Ateliers Martin » et « Ateliers Martin
			  Fils » ne se distingueraient plus d'une ellipse : le nom passe à la
			  ligne plutôt que d'être coupé.
			*/}
			<h2 className="text-cladd-sm leading-snug font-semibold break-words">{denomination}</h2>

			{/* CE QUE LE GÉRANT SEUL PEUT DIRE, EN TÊTE DE LA PREUVE.
			    L'écran affichait « Secteur à préciser » sur la liste depuis des mois —
			    et il n'existait AUCUN moyen de le préciser. Une consigne impossible à
			    suivre est pire qu'aucune consigne : le gérant cherche, ne trouve pas,
			    et cesse de croire les autres. */}
			<IdentiteDebiteur
				denomination={denomination}
				siren={debiteur.siren}
				formeJuridique={debiteur.formeJuridique}
				etatRecherche={etatRecherche}
				onChercherAuRegistre={onChercherAuRegistre}
				onRetenirEtablissement={onRetenirEtablissement}
				secteur={debiteur.secteur}
				optionsSecteur={optionsSecteur}
				erreurSiren={erreurSiren}
				onEnregistrerSiren={onEnregistrerSiren}
				onChoisirSecteur={onChoisirSecteur}
				tauxContractuel={tauxStipule}
				propositionTaux={propositionTaux}
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
					// `true` garde la recherche courante, `?d=` compris : sans elle, la
					// page ouverte perdait le débiteur choisi dans la liste de gauche.
					recherche={true}
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
						recherche={true}
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

				{/*
				  LE RAPPROCHEMENT D'UN VIREMENT EST UNE RANGÉE DU MÊME GROUPE.

				  ⚠️ IL ÉTAIT DÉPLIÉ EN PERMANENCE, ENTRE CES RANGÉES ET LES FACTURES :
				  trois lignes de prose, deux champs et un bouton, pour une opération
				  occasionnelle. Il poussait les factures — donc la sélection, le geste
				  principal de cet écran — sous la ligne de flottaison.

				  Il se déplie tout seul dès qu'il a un résultat à montrer ; voir
				  `ui/lettrage.tsx`.
				*/}
				<Lettrage
					proposition={propositionLettrage}
					enCours={lettrageEnCours}
					erreur={erreurLettrage}
					onChercher={onChercherLettrage}
					onAppliquer={onAppliquerLettrage}
				/>
			</ListeAnalyses>

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
				>
					{/*
					  ⚠️ TOUTE LA CARTE EST L'ÉTIQUETTE DE SA CASE. Cocher des factures est le
					  geste principal de cet écran, et la case seule faisait vingt pixels, moins
					  de la moitié du plancher tactile de 48 px. La carte ne porte aucun autre
					  contrôle : un appui n'importe où la coche.

					  `as="span"` sur la case, comme le kit le demande dans une étiquette, et des
					  `span` dedans : une étiquette ne contient que du texte courant. Le nom
					  accessible reste sur l'étiquette, là où le kit le posait. Une facture déjà
					  dans une créance ne se coche toujours pas : sa case est désactivée, et une
					  étiquette ne coche pas une case désactivée.
					*/}
					<label
						aria-label={`Sélectionner ${facture.reference}`}
						className="flex gap-cladd-3xs p-cladd-2xs"
					>
						<Checkbox
							as="span"
							checked={selection.has(facture._id)}
							onChange={() => onBasculerFacture(facture._id)}
							disabled={facture.dansUneCreance}
						/>
						<span className="flex min-w-0 flex-1 flex-col gap-1.5">
							<span className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
								<span className="text-cladd-sm font-semibold">{facture.reference}</span>
								<span className="shrink-0 text-cladd-sm tabular-nums">
									{eurosCentimes(facture.resteDu)}
								</span>
							</span>

							{facture.dateEcheance ? (
								<span className="text-cladd-2xs text-cladd-fg-softer">
									Échue le {dateCourte(facture.dateEcheance)}
								</span>
							) : null}

							{facture.exigibiliteDeduite ? (
								<span className="text-cladd-2xs text-cladd-fg-softest">
									Exigibilité déduite de l’échéance — à confirmer si vos conditions contractuelles
									disent autre chose.
								</span>
							) : null}

							<span className="flex flex-wrap items-center gap-1.5">
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
							</span>
						</span>
					</label>
				</Surface>
			))}

			{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

			{/*
			  LA BARRE DE SÉLECTION, COLLÉE EN BAS DÈS LA PREMIÈRE CASE COCHÉE.

			  ═══════════════════════════════════════════════════════════════════
			  ⚠️ LE GESTE PRINCIPAL SE FAISAIT À L'AVEUGLE
			  ═══════════════════════════════════════════════════════════════════

			  Le bouton vivait après TOUTES les cartes de facture : sur un dossier
			  de vingt factures, il fallait dérouler l'écran entier pour découvrir
			  ce qu'on venait de composer. Et la somme cochée ne s'affichait nulle
			  part — on constituait une créance sans savoir combien elle pesait.

			  Collée en bas du volet comme de la feuille, elle suit la sélection.
			  Aucune marge basse à ajouter : la barre est le DERNIER élément du
			  flux, donc en fin de défilement elle reprend sa place et ne recouvre
			  plus la dernière facture, qui reste cochable.

			  ⚠️ « RESTES DUS », JAMAIS « MONTANT RÉCLAMÉ ». Ce total est la somme
			  des `resteDu` des factures cochées. Le principal de la créance est
			  RECALCULÉ par le serveur à sa constitution, et le décompte y ajoute
			  intérêts et indemnités : donner à ce chiffre le nom de ce qu'on
			  réclame en ferait une promesse que la page suivante dément.
			*/}
			{selection.size > 0 ? (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte sticky bottom-0 z-10 rounded-cladd-xl"
					contentClassName="flex flex-wrap items-center justify-between gap-cladd-3xs p-cladd-3xs"
				>
					<span className="flex min-w-0 flex-col">
						<span className="text-cladd-2xs text-cladd-fg-softer">
							{selection.size} facture{pluriel(selection.size)} · restes dus
						</span>
						<span className="text-cladd-sm font-semibold tabular-nums">
							{eurosCentimes(restesDusSelectionnes)}
						</span>
					</span>
					{/* `grow` SOUS 640 px SEULEMENT. À 375 px, « 1 facture · restes dus »
					    et le bouton manquent la même ligne de sept pixels : le bouton passe
					    dessous, et il y prend toute la largeur plutôt que d'y rester échoué
					    à gauche. Au-dessus, la ligne tient, et un bouton étiré sur cinq
					    cents pixels ne serait plus un bouton. */}
					<BoutonPrincipal className="grow sm:grow-0" onClick={() => onConstituer(provenance)}>
						Constituer une créance
					</BoutonPrincipal>
				</Surface>
			) : null}
		</div>
	);
}
