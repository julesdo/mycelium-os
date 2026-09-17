import type { HistoryState } from '@tanstack/react-router';
import { Checkbox, Chip, ListTitle, SectionTitle, Surface } from '@cladd-ui/react';
import { ScaleIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	ChiffreHero,
	ConstatRegistre,
	HabitudePaiement,
	IdentiteDebiteur,
	Lettrage,
	LigneAnalyse,
	ListeAnalyses,
	PageEcran,
	Pieces,
	TYPES_PIECE,
	dateCourte,
	eurosCentimes,
	pluriel,
	useProvenance,
	type ConstatRegistreAffiche,
	type EtablissementPropose,
	type EtatRecherche,
	type HabitudeAffichee,
	type Lecture,
	type OptionSecteur,
	type PieceAffichee,
	type PropositionLettrage,
	type PropositionTaux,
	type RuptureAffichee
} from '../ui';
import { ecartJours, estDateReelle } from '../lib/verticales/recouvrement/calendrier';
import { PREAVIS } from '../lib/verticales/recouvrement/surveillance';
import { TITRE_ECRAN } from './titres';

/**
 * UN DÉBITEUR : UNE PAGE, ET TOUT EST DESSUS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLE REMPLACE, ET POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il n'existait AUCUNE adresse pour un débiteur. Son détail vivait dans le
 * volet droit de la liste (`?d=<id>`), et deux morceaux de lui — son habitude
 * de paiement, ses pièces — avaient chacun leur sous-page. Trois endroits pour
 * un seul client, dont un qu'aucun lien ne pouvait désigner.
 *
 * Le reproche, mot pour mot : « Je te demande juste d'éviter les profondeurs de
 * pages. Un débiteur = une page de détail avec toutes ses infos dessus. »
 *
 * Alors : UNE adresse, UN défilement, des sections empilées. Aucun onglet —
 * un onglet est une sous-page qui ne dit pas son nom, et il cache la moitié de
 * ce qu'on vient lire. Aucune sous-route : le seul geste qui quitte cette page
 * est d'ouvrir une CRÉANCE, et c'est un seul niveau de plus.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ORDRE DES SECTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce qu'il doit d'abord — c'est la question qu'on se pose en ouvrant la fiche :
 * l'encours, puis ses créances déjà constituées, puis ses factures. Ensuite ce
 * que le gérant seul peut dire (identité, secteur, taux), ce que le registre
 * dit de sa solvabilité, comment il paie d'habitude, et enfin les pièces du
 * dossier — le plus long, donc le dernier.
 *
 * Ce fichier DESSINE et ne sait pas interroger Convex ; la route LIT et
 * traduit. C'est ce qui permet d'ouvrir la page aux quatre largeurs depuis la
 * salle d'exposition, sans backend ni authentification.
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
	/**
	 * L'adresse du siège, relevée au registre en même temps que le SIREN.
	 *
	 * ⚠️ JAMAIS SAISIE, DONC JAMAIS INVENTÉE. Elle ne vient que d'un
	 * établissement retenu au BODACC ; absente, elle ne s'affiche pas. Un champ
	 * d'adresse vide sur cette page serait exactement la saisie que la première
	 * règle d'écran interdit.
	 */
	readonly adresse?: string;
	readonly secteur?: string;
	readonly santeFinanciere: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly constatRegistre?: ConstatRegistreAffiche;
}

/** Ce que la page affiche une fois tout arrivé. */
export interface DebiteurComplet {
	/** Le nom du débiteur, tel qu'il est venu de la facture. */
	readonly denomination: string;
	readonly debiteur: DebiteurAffiche;
	/** Ce qui reste dû, toutes factures non soldées confondues. */
	readonly encours: bigint;
	/**
	 * Le jour de lecture, en argument.
	 *
	 * ⚠️ IL NE SE LIT PAS ICI. La prescription la plus proche se compte à partir
	 * de lui, et la salle d'exposition fige son jour : un « aujourd'hui » relu
	 * dans l'écran ferait diverger cette page de l'habitude, qui reçoit déjà le
	 * sien, et changerait les captures d'un matin à l'autre.
	 */
	readonly aujourdHui: string;
	readonly factures: readonly FactureAffichee[];
	readonly creances: readonly CreanceDuDebiteur[];
	readonly pieces: readonly PieceAffichee[];
	readonly habitude: HabitudeAffichee;
	readonly ruptures: readonly RuptureAffichee[];
	readonly optionsSecteur: readonly OptionSecteur[];
	readonly etatRecherche: EtatRecherche;
	readonly erreurSiren: string | null;
	readonly tauxStipule: string | undefined;
	readonly constatTaux: string | null;
	readonly propositionLettrage: PropositionLettrage | null;
	readonly lettrageEnCours: boolean;
	readonly erreurLettrage: string | null;
	readonly selection: ReadonlySet<string>;
	readonly erreur: string | null;
	readonly depotEnCours: boolean;
	readonly erreurDepot: string | null;
	readonly onChercherAuRegistre: () => void;
	readonly onRetenirEtablissement: (etablissement: EtablissementPropose) => void;
	readonly onEnregistrerSiren: (saisi: string) => void;
	readonly onChoisirSecteur: (cle: string) => void;
	readonly onEnregistrerTaux: (pourcentage: string | null) => void;
	readonly onChercherLettrage: (montant: string, date: string) => void;
	readonly onAppliquerLettrage: (
		references: readonly string[],
		total: bigint,
		date: string
	) => void;
	readonly onBasculerFacture: (factureId: string) => void;
	/** `provenance` : ce que la créance ouverte ensuite relira pour revenir ici. Voir `useProvenance`. */
	readonly onConstituer: (provenance: HistoryState) => void;
	readonly onDeposerPieces: (fichiers: File[]) => void;
	readonly onClasserPiece: (pieceId: string, type: string) => void;
	readonly onRetirerPiece: (pieceId: string) => void;
}

/** La facture dont la prescription tombe le plus tôt, et dans combien de jours. */
interface PrescriptionLaPlusProche {
	readonly reference: string;
	readonly date: string;
	readonly jours: number;
}

/**
 * LA PRESCRIPTION LA PLUS PROCHE, ET SEULEMENT SI ELLE APPROCHE.
 *
 * ⚠️ LE SEUIL VIENT DE `PREAVIS.PRESCRIPTION`, IL N'EST PAS ÉCRIT ICI. C'est le
 * même préavis que la surveillance applique pour faire remonter un
 * `PRESCRIPTION_PROCHE` : deux seuils écrits à deux endroits diraient deux
 * choses différentes du même dossier, et l'écran finirait par se taire là où le
 * radar crie.
 *
 * ⚠️ UNE FACTURE DÉJÀ PRESCRITE COMPTE ENCORE. Le pire moment pour se taire est
 * celui où l'argent vient d'être perdu, parce que c'est aussi celui où l'on
 * continuerait à dépenser dessus.
 *
 * ⚠️ ET LES FACTURES SANS DATE DE PRESCRIPTION SONT ABSENTES, JAMAIS
 * FAVORABLES. Le doute ne profite pas au produit : elles ne font pas dire
 * « rien n'approche », elles ne disent rien du tout.
 */
function prescriptionLaPlusProche(
	factures: readonly FactureAffichee[],
	aujourdHui: string
): PrescriptionLaPlusProche | null {
	let plusProche: PrescriptionLaPlusProche | null = null;
	for (const facture of factures) {
		if (facture.datePrescription === undefined) continue;
		if (!estDateReelle(facture.datePrescription)) continue;
		if (facture.resteDu <= 0n) continue;
		const jours = ecartJours(aujourdHui, facture.datePrescription);
		if (jours > PREAVIS.PRESCRIPTION) continue;
		if (plusProche !== null && plusProche.jours <= jours) continue;
		plusProche = { reference: facture.reference, date: facture.datePrescription, jours };
	}
	return plusProche;
}

/**
 * CE QUE LA PRESCRIPTION LA PLUS PROCHE DIT, AU PRÉSENT DE CONSTAT.
 *
 * ⚠️ AUCUN VERBE D'ACTION, ET C'EST LA TROISIÈME LIGNE ROUGE. « Engagez une
 * procédure avant le … » serait du conseil juridique. Le produit énonce la
 * date et le nombre de jours ; la décision d'agir reste celle du gérant.
 */
function phrasePrescription(proche: PrescriptionLaPlusProche): string {
	if (proche.jours < 0) {
		return `${proche.reference} est prescrite depuis le ${dateCourte(proche.date)}.`;
	}
	if (proche.jours === 0) {
		return `${proche.reference} se prescrit aujourd’hui.`;
	}
	return `${proche.reference} se prescrit le ${dateCourte(proche.date)}, dans ${proche.jours} jour${pluriel(proche.jours)}.`;
}

export function EcranDebiteur({
	identifiant,
	donnees
}: {
	/** L'identifiant du débiteur, pour que le retour rende la liste sur lui. */
	identifiant: string;
	donnees: Lecture<DebiteurComplet>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				/**
				 * ⚠️ `masqueEnVolets` : À PARTIR DE 1024 px, LA LISTE EST DÉJÀ À GAUCHE.
				 * Une pastille « Vos débiteurs » y mènerait à ce qui est affiché juste à
				 * côté. Sous 1024 px, la page occupe l'écran entier et le retour est le
				 * seul chemin vers la liste : il reste.
				 */
				retour: {
					vers: '/app/debiteurs',
					recherche: { d: identifiant },
					libelle: TITRE_ECRAN.debiteurs,
					masqueEnVolets: true
				},
				titre: pret?.denomination ?? 'Ce client',
				/*
				  L'ADRESSE DU SIÈGE SOUS LE NOM, ET NULLE PART AILLEURS.

				  C'est ce qui distingue « Ateliers Martin » d'« Ateliers Martin Fils »
				  avant même de lire un numéro — et sur cette page, se tromper de client
				  fait constituer une créance contre le mauvais tiers. Elle ne s'affiche
				  que si le registre l'a donnée.
				*/
				sousTitre: pret?.debiteur.adresse
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <CorpsDebiteur {...pret} />}
		</PageEcran>
	);
}

function CorpsDebiteur({
	denomination,
	debiteur,
	encours,
	aujourdHui,
	factures,
	creances,
	pieces,
	habitude,
	ruptures,
	optionsSecteur,
	etatRecherche,
	erreurSiren,
	tauxStipule,
	constatTaux,
	propositionLettrage,
	lettrageEnCours,
	erreurLettrage,
	selection,
	erreur,
	depotEnCours,
	erreurDepot,
	onChercherAuRegistre,
	onRetenirEtablissement,
	onEnregistrerSiren,
	onChoisirSecteur,
	onEnregistrerTaux,
	onChercherLettrage,
	onAppliquerLettrage,
	onBasculerFacture,
	onConstituer,
	onDeposerPieces,
	onClasserPiece,
	onRetirerPiece
}: DebiteurComplet) {
	const provenance = useProvenance();

	const proche = prescriptionLaPlusProche(factures, aujourdHui);
	const echues = factures.filter(
		(facture) =>
			facture.resteDu > 0n &&
			facture.dateEcheance !== undefined &&
			facture.dateEcheance < aujourdHui
	).length;
	const ouvertes = factures.filter((facture) => facture.resteDu > 0n).length;

	/**
	 * LE TAUX DE RETARD RELEVÉ SUR UNE PIÈCE, s'il y en a un.
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

	// La somme des restes dus des factures cochées. ⚠️ EN `bigint`, comme toute la
	// chaîne : un `Number` sur des centimes perd le dernier chiffre au-delà de
	// quatre-vingt-dix mille milliards, et surtout il autorise un demi-centime.
	const restesDusSelectionnes = factures.reduce(
		(somme, facture) => (selection.has(facture._id) ? somme + facture.resteDu : somme),
		0n
	);

	return (
		<>
			{/*
			  ═══════════════════════════════════════════════════════════════════
			  EN TÊTE : L'ENCOURS, ET CE QUI QUALIFIE CE CLIENT
			  ═══════════════════════════════════════════════════════════════════

			  ⚠️ PAS DE CADRAN À ZÉRO (règle d'écran n° 4). Un client à jour ne
			  mérite pas un « 0,00 € » en corps de titre : il mérite qu'on le dise
			  en toutes lettres, et que la page serve quand même à déposer une
			  pièce ou à préciser son secteur.
			*/}
			{encours > 0n ? (
				<ChiffreHero
					centimes={encours}
					surTitre="Ce qu’il vous doit"
					legende={
						proche === null
							? `${ouvertes} facture${pluriel(ouvertes)} ouverte${pluriel(ouvertes)}`
							: phrasePrescription(proche)
					}
				/>
			) : (
				<p className="text-center text-cladd-xs text-cladd-fg-soft">
					Ce client ne vous doit rien aujourd’hui.
				</p>
			)}

			{/*
			  LA RANGÉE DE PILULES, SOUS LE NOM : ce qui qualifie le client, jamais
			  une information de même niveau que son encours.

			  ⚠️ ELLES NE PORTENT AUCUNE COULEUR DE SEUIL INVENTÉE ICI : ce sont
			  exactement celles de la liste, pour qu'une fiche ouverte dise la même
			  chose que la rangée qu'on vient de toucher.
			*/}
			<div className="flex flex-wrap items-center justify-center gap-1.5">
				{echues > 0 ? (
					<Chip size="md" color="orange">
						{echues} échue{pluriel(echues)}
					</Chip>
				) : null}
				{debiteur.santeFinanciere === 'RADIEE' || // Deux états que le radar pose, et qui changent tout.
				debiteur.santeFinanciere === 'PROCEDURE_COLLECTIVE' ? (
					<Chip size="md" color="red">
						{debiteur.santeFinanciere === 'RADIEE' ? 'Radié' : 'Procédure collective'}
					</Chip>
				) : null}
				{/* Un secteur indéterminé fait retenir le délai de prescription le plus
				    court. Le dire ici évite que le gérant découvre l'hypothèse au moment
				    où une créance est annoncée prescrite — et le choix est trois
				    sections plus bas, sur cette même page. */}
				{debiteur.secteur === undefined || debiteur.secteur === 'INDETERMINE' ? (
					<Chip size="md" color="neutral">
						Secteur à préciser
					</Chip>
				) : null}
				{debiteur.siren === undefined || debiteur.siren === '' ? (
					<Chip size="md" color="neutral">
						Non identifié au registre
					</Chip>
				) : null}
			</div>

			{/*
			  ═══════════════════════════════════════════════════════════════════
			  SES CRÉANCES — le seul geste qui quitte cette page
			  ═══════════════════════════════════════════════════════════════════

			  Un niveau de plus, et c'est tout : `/app/creance/$id`. La valeur de la
			  rangée est le montant, parce que c'est ce qu'on vient chercher ; le
			  compte de factures va en précision.
			*/}
			{creances.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<SectionTitle>Ses créances</SectionTitle>
					<ListeAnalyses>
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
				</section>
			)}

			{/*
			  ═══════════════════════════════════════════════════════════════════
			  SES FACTURES — et le rapprochement d'un virement, juste à côté
			  ═══════════════════════════════════════════════════════════════════
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Ses factures</SectionTitle>

				{factures.length === 0 ? (
					<p className="text-cladd-xs text-cladd-fg-soft">
						Aucune facture de ce client n’a encore été importée.
					</p>
				) : null}

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
						  geste principal de cette page, et la case seule faisait vingt pixels, moins
						  de la moitié du plancher tactile de 48 px. La carte ne porte aucun autre
						  contrôle : un appui n'importe où la coche.
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

				{/*
				  LE RAPPROCHEMENT D'UN VIREMENT, REPLIÉ EN UNE RANGÉE.

				  ⚠️ IL EST SOUS LES FACTURES, PAS AU-DESSUS. Déplié en permanence, il
				  poussait la sélection — le geste principal de cette page — sous la
				  ligne de flottaison. Il se déplie tout seul dès qu'il a un résultat à
				  montrer ; voir `ui/lettrage.tsx`.

				  ⚠️ ET LA DATE ARRIVE AVEC LE GESTE, elle n'est pas relue dans un état
				  de l'écran. Le calendrier reste modifiable après la recherche : la
				  date d'un règlement est le point d'arrêt des intérêts, et la relire
				  ailleurs enregistrait un montant faux.
				*/}
				<ListeAnalyses>
					<Lettrage
						proposition={propositionLettrage}
						enCours={lettrageEnCours}
						erreur={erreurLettrage}
						onChercher={onChercherLettrage}
						onAppliquer={onAppliquerLettrage}
					/>
				</ListeAnalyses>
			</section>

			{/*
			  ═══════════════════════════════════════════════════════════════════
			  SON IDENTITÉ — ce que le gérant seul peut dire
			  ═══════════════════════════════════════════════════════════════════

			  Le SIREN se cherche au registre PAR NOM, sans clé, et le produit
			  propose sans jamais choisir : un SIREN d'homonyme, bien formé, désigne
			  une AUTRE entreprise, et le radar rendrait sur elle un « rien au
			  registre » faux et rassurant.

			  Sans SIREN, un débiteur non identifié devient définitivement
			  non identifiable : sa solvabilité n'est pas surveillée, et le produit
			  retient alors le délai de prescription le plus court.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Son identité</SectionTitle>
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
			</section>

			{/*
			  ═══════════════════════════════════════════════════════════════════
			  SA SOLVABILITÉ — le registre, cité mot pour mot
			  ═══════════════════════════════════════════════════════════════════

			  ⚠️ L'ABSENCE DE CONSTAT N'EST PAS UNE BONNE NOUVELLE, et la page le
			  dit. Un silence du registre sur un client identifié veut dire « aucune
			  annonce depuis le dernier passage » ; sur un client sans SIREN, il veut
			  dire « personne n'a rien regardé ». Les confondre ferait lire un feu
			  vert là où il n'y a que du noir.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Sa solvabilité</SectionTitle>
				{debiteur.constatRegistre === undefined ? (
					<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
						{debiteur.siren === undefined || debiteur.siren === ''
							? 'Sans SIREN, sa solvabilité n’est pas surveillée : aucun registre n’est interrogé à son nom.'
							: 'Aucune annonce de greffe relevée à son nom au dernier passage du radar.'}
					</p>
				) : (
					<ConstatRegistre constat={debiteur.constatRegistre} sante={debiteur.santeFinanciere} />
				)}
			</section>

			{/*
			  ═══════════════════════════════════════════════════════════════════
			  SON HABITUDE DE PAIEMENT — elle avait sa propre page, elle est ici
			  ═══════════════════════════════════════════════════════════════════

			  ⚠️ C'EST UNE STATISTIQUE, ET ELLE A BESOIN D'ÊTRE LUE. Le délai médian,
			  la taille de l'échantillon, puis chaque rupture avec son écart. Un
			  historique trop court se dit : le module est inopérant sur un client
			  nouveau, et le produit l'annonce au lieu de faire semblant.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Son habitude de paiement</SectionTitle>
				<HabitudePaiement habitude={habitude} ruptures={ruptures} />
			</section>

			{/*
			  ═══════════════════════════════════════════════════════════════════
			  SES PIÈCES — elles avaient leur propre page, elles sont ici
			  ═══════════════════════════════════════════════════════════════════

			  ⚠️ LE DÉPÔT N'IMPOSE AUCUN TYPE. La pièce entre « à classer », la
			  lecture part en tâche de fond, et le gérant ne corrige que si elle
			  s'est trompée. Demander la nature d'un PDF qui porte « BON DE
			  LIVRAISON » en en-tête est exactement le champ vide que la première
			  règle d'écran interdit.

			  En DERNIER parce que c'est la section la plus longue : une pièce dit sa
			  nature, son numéro, sa date, le constat de sa lecture et sa réserve
			  éventuelle. Au-dessus, elle repousserait les factures sous l'horizon.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>
					<span>Ses pièces</span>
					{/* « 0 document » serait un cadran à zéro : le vide se dit en toutes lettres. */}
					<span className="ml-auto text-cladd-2xs text-cladd-fg-softer normal-case">
						{pieces.length === 0
							? 'Aucun document'
							: `${pieces.length} document${pluriel(pieces.length)}`}
					</span>
				</SectionTitle>
				<Pieces
					pieces={pieces}
					optionsType={TYPES_PIECE}
					enCours={depotEnCours}
					onDeposer={onDeposerPieces}
					onClasser={onClasserPiece}
					onRetirer={onRetirerPiece}
				/>
				{erreurDepot ? <p className="text-cladd-xs text-cladd-fg">{erreurDepot}</p> : null}
			</section>

			{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

			{/*
			  LA BARRE DE SÉLECTION, COLLÉE EN BAS DÈS LA PREMIÈRE CASE COCHÉE.

			  ⚠️ ELLE EST LE DERNIER ÉLÉMENT DE LA PAGE, ET C'EST CE QUI LA FAIT
			  SUIVRE TOUT LE DÉFILEMENT. Un `sticky` ne colle que tant que son
			  conteneur est à l'écran : placée dans la section des factures, elle
			  disparaîtrait dès qu'on descend vers les pièces, en emportant le seul
			  geste qui transforme une sélection en créance. En fin de flux, elle
			  reprend sa place au bas du défilement et ne recouvre plus rien.

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
					    à gauche. */}
					<BoutonPrincipal className="grow sm:grow-0" onClick={() => onConstituer(provenance)}>
						Constituer une créance
					</BoutonPrincipal>
				</Surface>
			) : null}
		</>
	);
}
