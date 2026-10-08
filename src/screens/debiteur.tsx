import { useState } from 'react';
import type { HistoryState } from '@tanstack/react-router';
import { Checkbox, Popup, PopupContent, Switch } from '@cladd-ui/react';
import { ArrowDownLeftIcon, FolderPlusIcon, MailIcon } from 'lucide-react';
import {
	NOM_DU_PILOTE,
	BoutonPrincipal,
	CeQuiBloque,
	ChiffreHero,
	ConstatRegistre,
	EnTeteDeGroupe,
	IdentiteDebiteur,
	ActionsRapides,
	Avatar,
	CarteLien,
	Lettrage,
	LigneBouton,
	LigneDeReleve,
	ListeAnalyses,
	ListeDeCartes,
	ListeDeRangees,
	ListeDeReleve,
	PageEcran,
	Pieces,
	RythmeDePaiement,
	RangeeDepliable,
	SectionsDepliables,
	TYPES_PIECE,
	VignetteRangee,
	dateCourte,
	eurosCentimes,
	pluriel,
	useProvenance,
	type AlerteDossier,
	type ConstatRegistreAffiche,
	type EtablissementPropose,
	type EtatRecherche,
	type HabitudeAffichee,
	type Lecture,
	type OptionSecteur,
	type PaiementAffiche,
	type PieceAffichee,
	type PropositionLettrage,
	type PropositionTaux,
	type RetardEnCours,
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
 * L'ORDRE — ET CE QUI S'EST REPLIÉ LE 30/09/2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce qu'il doit d'abord — c'est la question qu'on se pose en ouvrant la fiche —,
 * puis le seul geste (« Lancer un dossier »), ce qui est grave, ses dossiers et
 * ses factures à régler. Tout le reste — identité, solvabilité, habitude,
 * documents, virement, factures réglées — tient en rangées qui portent leur
 * valeur et s'ouvrent en feuille : c'est la fiche de Splitwise et de Revolut
 * Business, relevée sur Mobbin. Voir `CorpsDebiteur`.
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
	/**
	 * Son adresse électronique. C'est elle qui rend une relance envoyable.
	 *
	 * ⚠️ DEUX PROVENANCES, ET ELLES NE SE VALENT PAS : lue chez la banque, c'est
	 * l'adresse de FACTURATION ; saisie ici, c'est celle que le gérant a fini par
	 * trouver. L'écran les distingue, et la seconde n'est jamais écrasée.
	 */
	readonly email?: string;
	/** Vrai quand l'adresse vient d'une synchronisation bancaire, pas d'une saisie. */
	readonly emailVenuDeLaBanque?: boolean;
	/** Le gérant a retiré ce client du pilote : rien ne s'ouvre ni ne part seul. */
	readonly horsPilote?: boolean;
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
	/** Les règlements qui ont établi l'habitude, et les retards qui courent : le dessin. */
	readonly historique: readonly PaiementAffiche[];
	readonly enCours: readonly RetardEnCours[];
	readonly optionsSecteur: readonly OptionSecteur[];
	readonly etatRecherche: EtatRecherche;
	readonly erreurSiren: string | null;
	readonly erreurEmail: string | null;
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
	readonly onEnregistrerEmail: (saisi: string) => void;
	/** Retirer ce client du pilote, ou le lui rendre. */
	readonly onReglerPilote?: (horsPilote: boolean) => void;
	readonly onChoisirSecteur: (cle: string) => void;
	readonly onEnregistrerTaux: (pourcentage: string | null) => void;
	readonly onChercherLettrage: (montant: string, date: string) => void;
	readonly onAppliquerLettrage: (
		references: readonly string[],
		total: bigint,
		date: string
	) => void;
	/** Confirme la répartition d'un versement que prévoit la loi (1342-10). */
	readonly onRepartirLettrage?: (date: string) => void;
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
 * LA DATE LIMITE POUR AGIR, SOUS LE MONTANT, AU PRÉSENT DE CONSTAT.
 *
 * ⚠️ AUCUN VERBE D'ACTION, ET C'EST LA TROISIÈME LIGNE ROUGE. « Engagez une
 * procédure avant le … » serait du conseil juridique. Le produit énonce la
 * date et le nombre de jours ; la décision d'agir reste celle du gérant.
 *
 * ⚠️ COURTE, ET SANS LA RÉFÉRENCE DE LA FACTURE. « FA-2024-114 : la date limite
 * pour agir en justice tombe le 27 oct. 2026, dans 41 jours » courait sur trois
 * lignes sous le chiffre, à 393 px. La date est ce qu'on dit au téléphone ; la
 * facture qui la porte se lit dans la liste, juste dessous (« agir avant le … »).
 * Même phrase que sur la page d'un dossier.
 */
function phrasePrescription(proche: PrescriptionLaPlusProche): string {
	if (proche.jours < 0) return `Date limite pour agir dépassée le ${dateCourte(proche.date)}`;
	if (proche.jours === 0) return 'Date limite pour agir : aujourd’hui';
	return `Date limite pour agir : ${dateCourte(proche.date)}, dans ${proche.jours} jour${pluriel(proche.jours)}`;
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
				 * Un retour y mènerait à ce qui est affiché juste à côté. Sous 1024 px,
				 * la page occupe l'écran entier et le retour est le seul chemin vers la
				 * liste : il reste.
				 */
				retour: {
					vers: '/app/clients',
					recherche: { d: identifiant },
					libelle: TITRE_ECRAN.debiteurs,
					masqueEnVolets: true
				},
				titre: pret?.denomination ?? 'Ce client',
				/*
				  L'ADRESSE DU SIÈGE SOUS LE NOM, EN PETIT, DANS LA BARRE. C'est ce qui
				  distingue « Ateliers Martin » d'« Ateliers Martin Fils » avant même de
				  lire un numéro — et sur cette page, se tromper de client fait
				  constituer un dossier contre le mauvais tiers.
				*/
				sousTitre: pret?.debiteur.adresse
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <CorpsDebiteur {...pret} />}
		</PageEcran>
	);
}

/** Ce qui manque à son identité, le plus lourd d'abord — ou « complète ». */
function identiteCourte(debiteur: DebiteurAffiche): string {
	if (debiteur.siren === undefined || debiteur.siren === '') return 'SIREN à trouver';
	if (debiteur.secteur === undefined || debiteur.secteur === 'INDETERMINE')
		return 'secteur à préciser';
	if (debiteur.email === undefined || debiteur.email === '') return 'e-mail à ajouter';
	return 'complète';
}

/**
 * CE QUI CHANGE LA DONNE SUR CE CLIENT — le registre, et lui seul.
 *
 * ⚠️ UN CONSTAT, CITÉ, JAMAIS UNE CONDUITE À TENIR. Le titre dit ce qui EST ;
 * la citation renvoie à l'annonce. « Déclarez votre créance » serait un conseil
 * juridique : troisième ligne rouge.
 */
function alertesDuClient(debiteur: DebiteurAffiche): readonly AlerteDossier[] {
	if (
		debiteur.santeFinanciere !== 'PROCEDURE_COLLECTIVE' &&
		debiteur.santeFinanciere !== 'RADIEE'
	) {
		return [];
	}
	const constat = debiteur.constatRegistre;
	return [
		{
			cle: `sante-${debiteur.santeFinanciere}`,
			titre:
				debiteur.santeFinanciere === 'RADIEE'
					? 'Votre client est radié du registre'
					: 'Votre client est en procédure collective',
			phrases:
				constat === undefined
					? ['Le registre public l’a signalé au dernier passage du radar.']
					: [
							`Annonce parue le ${dateCourte(constat.dateParution)}${
								constat.tribunal === undefined ? '' : `, ${constat.tribunal}`
							}.`
						],
			echeance: null,
			options: [],
			citation:
				constat === undefined
					? null
					: { texte: constat.nature, source: 'L’annonce au registre public', url: constat.url }
		}
	];
}

/**
 * LE CORPS DE LA FICHE — ce qu'il doit, le seul geste, puis le reste en rangées.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLE ÉTAIT, ET LE CODE QU'ELLE REPREND (30/09/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le montant, quatre pastilles, les dossiers, chaque facture dans une carte
 * avec sa case et deux pastilles, les factures réglées en cartes, le
 * rapprochement, puis quatre sections à plat — identité, solvabilité, habitude,
 * documents — et une barre qui surgissait en bas dès la première case cochée.
 * La page la plus chargée du produit, pour la question la plus simple : « il me
 * doit combien, et je fais quoi ? ».
 *
 * Relevé sur Mobbin : Splitwise, sur la fiche de quelqu'un qui vous doit — le
 * solde, UN bouton plein, puis la liste datée ; Revolut Business, sur la fiche
 * d'un client — le nom, un bouton, et des cartes courtes. D'où :
 *
 *   1. Ce qu'il doit, et la date limite pour agir.
 *   2. UN bouton, « Lancer un dossier » : il ouvre une feuille où les factures
 *      échues sont déjà cochées — le logiciel propose, le gérant confirme (règle
 *      d'écran n° 1). Les cases ont quitté la liste : elle se LIT.
 *   3. Ce qui est grave (procédure collective, radiation) monte en une ligne.
 *   4. Ses dossiers, puis ses factures à régler, en rangées.
 *   5. Le reste en rangées qui portent leur valeur : identité, solvabilité,
 *      habitude, documents, virement, factures réglées.
 */
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
	historique,
	enCours,
	optionsSecteur,
	etatRecherche,
	erreurSiren,
	erreurEmail,
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
	onEnregistrerEmail,
	onReglerPilote,
	onChoisirSecteur,
	onEnregistrerTaux,
	onChercherLettrage,
	onAppliquerLettrage,
	onRepartirLettrage,
	onBasculerFacture,
	onConstituer,
	onDeposerPieces,
	onClasserPiece,
	onRetirerPiece
}: DebiteurComplet) {
	const provenance = useProvenance();
	/** Les rangées ouvertes. Aucune à l'arrivée : leur valeur se lit fermée. */
	const [ouvertes, setOuvertes] = useState<readonly string[]>([]);
	/** La feuille « Lancer un dossier ». */
	const [feuilleOuverte, setFeuilleOuverte] = useState(false);
	/** La feuille « Un virement reçu », ouverte par son action rapide. */
	const [virementOuvert, setVirementOuvert] = useState(false);

	const proche = prescriptionLaPlusProche(factures, aujourdHui);

	/**
	 * ⚠️ DEUX LISTES, PARCE QU'UNE FACTURE RÉGLÉE N'APPELLE PLUS RIEN. Mêlée aux
	 * autres, elle affichait « 0,00 € » et une date limite pour agir sur une somme
	 * déjà encaissée. Dérivé au rendu, jamais posé dans un état : `factures`
	 * change à chaque rapprochement de virement.
	 */
	const aRegler = factures.filter((facture) => facture.resteDu > 0n);
	const reglees = factures.filter((facture) => facture.resteDu <= 0n);
	/** Ce qui peut entrer dans un dossier : dû, et dans aucun autre. */
	const eligibles = aRegler.filter((facture) => !facture.dansUneCreance);

	/**
	 * LE TAUX DE RETARD RELEVÉ SUR UNE PIÈCE, s'il y en a un. La plus récente
	 * d'abord — `listerPiecesDuDebiteur` les trie ainsi. Une seule proposition à
	 * la fois : en montrer deux reviendrait à demander laquelle des deux clauses
	 * gouverne la relation, ce qu'aucune pièce ne dit.
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
	// chaîne : un `Number` sur des centimes autoriserait un demi-centime.
	const restesDusSelectionnes = factures.reduce(
		(somme, facture) => (selection.has(facture._id) ? somme + facture.resteDu : somme),
		0n
	);

	/**
	 * OUVRIR LA FEUILLE, LES FACTURES ÉCHUES DÉJÀ COCHÉES.
	 *
	 * ⚠️ SEULEMENT SI RIEN N'EST ENCORE COCHÉ. Une sélection commencée — puis la
	 * feuille refermée — se retrouve telle quelle ; la recocher d'office
	 * défairait ce que le gérant vient de décocher. Et s'il n'y a aucune facture
	 * échue, rien n'est proposé : cocher une facture pas encore due serait
	 * choisir à sa place.
	 */
	function ouvrirLaFeuille() {
		if (selection.size === 0) {
			for (const facture of eligibles) {
				if (facture.dateEcheance !== undefined && facture.dateEcheance < aujourdHui) {
					onBasculerFacture(facture._id);
				}
			}
		}
		setFeuilleOuverte(true);
	}

	/** L'échéance d'une facture, en une ligne : la gauche de sa seconde ligne. */
	function echeanceDe(facture: FactureAffichee): string | undefined {
		if (facture.dateEcheance === undefined) return undefined;
		return facture.dateEcheance < aujourdHui
			? `Échue le ${dateCourte(facture.dateEcheance)}`
			: `À payer le ${dateCourte(facture.dateEcheance)}`;
	}

	/**
	 * LA DROITE DE SA SECONDE LIGNE : où elle en est, ou jusqu'à quand agir.
	 *
	 * ⚠️ « DANS UN DOSSIER » PASSE DEVANT LA DATE LIMITE, ET ELLE NE SE PERD PAS : le
	 * dossier la suit et l'affiche en tête de sa page. Pour une facture qu'aucun
	 * dossier ne suit, c'est la date limite qui compte — c'est elle qui éteint le
	 * droit, et elle a ici sa place à part, qu'aucune troncature ne mange. Collée à
	 * l'échéance sur une ligne coupée, elle passait sur deux lignes à 375 px et
	 * faisait de chaque facture un paragraphe.
	 */
	function etatDeFacture(facture: FactureAffichee): string | undefined {
		if (facture.dansUneCreance) return 'Dans un dossier';
		return facture.datePrescription === undefined
			? undefined
			: `Agir avant le ${dateCourte(facture.datePrescription)}`;
	}

	return (
		<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={setOuvertes}>
			{/*
			  ⚠️ PAS DE CADRAN À ZÉRO (règle d'écran n° 4). Un client à jour ne mérite
			  pas un « 0,00 € » en corps de titre : on le dit en toutes lettres, et la
			  page sert quand même à déposer une pièce ou à préciser son secteur.
			*/}
			{/*
			  ⚠️ L'AVATAR AU-DESSUS DU MONTANT, PUIS LES ACTIONS RAPIDES (07/10/2026).
			  Toutes les fiches de contact relevées sur Mobbin (Telegram, Apple, Quo)
			  posent l'identité, puis une rangée de boutons ronds ; notre page de
			  paiement pose déjà les initiales du créancier au-dessus de son montant.
			  La barre porte le nom et l'adresse : l'avatar ne les redit pas.
			*/}
			<div className="flex flex-col items-center gap-cladd-3xs">
				<Avatar nom={denomination} grand surCarte />
				{encours > 0n ? (
					<ChiffreHero
						className="py-cladd-3xs"
						centimes={encours}
						surTitre="Ce qu’il vous doit"
						legende={
							proche === null
								? `${aRegler.length} facture${pluriel(aRegler.length)} à régler`
								: phrasePrescription(proche)
						}
					/>
				) : (
					<p className="text-center text-cladd-xs text-cladd-fg-soft">
						Ce client ne vous doit rien aujourd’hui.
					</p>
				)}
			</div>

			{/*
			  LES ACTIONS RAPIDES. Chacune en remplace une : « Lancer un dossier »
			  était le bouton pleine largeur, « Virement reçu » la rangée du même nom au
			  bas de la page. « E-mail » ouvre la messagerie du gérant — c'est lui qui
			  écrit et qui envoie, rien ne part d'ici (première ligne rouge) ; sans
			  adresse, il ouvre son identité pour la renseigner.
			*/}
			<ActionsRapides
				actions={[
					...(eligibles.length === 0
						? []
						: [
								{
									cle: 'dossier',
									libelle: 'Lancer un dossier',
									icone: <FolderPlusIcon />,
									principale: true,
									onClick: ouvrirLaFeuille
								}
							]),
					debiteur.email === undefined || debiteur.email === ''
						? {
								cle: 'email',
								libelle: 'E-mail',
								icone: <MailIcon />,
								nomComplet: 'Renseigner son adresse électronique',
								onClick: () =>
									setOuvertes((avant) =>
										avant.includes('identite') ? avant : [...avant, 'identite']
									)
							}
						: {
								cle: 'email',
								libelle: 'E-mail',
								icone: <MailIcon />,
								nomComplet: `Écrire à ${debiteur.email}`,
								href: `mailto:${debiteur.email}`
							},
					{
						cle: 'virement',
						libelle: 'Virement reçu',
						icone: <ArrowDownLeftIcon />,
						nomComplet: 'Rapprocher un virement reçu de ce client',
						onClick: () => setVirementOuvert(true)
					}
				]}
			/>

			<CeQuiBloque alertes={alertesDuClient(debiteur)} />

			{/* SES DOSSIERS — le chemin vers la page où l'on agit. */}
			{creances.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe
						libelle="Ses dossiers"
						nombre={creances.length}
						total={creances.reduce((somme, c) => somme + c.principalRestantDu, 0n)}
					/>
					{/*
					  ⚠️ DES CARTES, PARCE QU'ILS S'OUVRENT — et une vignette de dossier au
					  lieu de l'avatar : tous ces dossiers sont du même client, et ses
					  initiales répétées ne distingueraient rien.
					*/}
					<ListeDeCartes>
						{creances.map((creance) => (
							<CarteLien
								key={creance._id}
								vers="/app/dossier/$id"
								parametres={{ id: creance._id }}
								icone={<VignetteRangee famille="ARGENT" className="size-10" />}
								// « Dossier de » est dit par l'en-tête et la vignette ; il coupait le titre.
								titre={`${creance.nombreFactures} facture${pluriel(creance.nombreFactures)}`}
								// Un brouillon n'est pas encore qualifié : le dire évite d'ouvrir
								// un dossier en croyant qu'il est prêt.
								{...(creance.statut === 'BROUILLON' ? { ligne: 'Brouillon' } : {})}
								montant={eurosCentimes(creance.principalRestantDu)}
							/>
						))}
					</ListeDeCartes>
				</section>
			)}

			{/* SES FACTURES À RÉGLER — elles se LISENT ; on les choisit dans la feuille. */}
			{factures.length === 0 ? (
				<p className="px-1 text-cladd-xs text-cladd-fg-soft">
					Aucune facture de ce client n’a encore été importée.
				</p>
			) : aRegler.length === 0 ? (
				<p className="px-1 text-cladd-xs text-cladd-fg-soft">Toutes ses factures sont réglées.</p>
			) : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe
						libelle="À régler"
						nombre={aRegler.length}
						total={aRegler.reduce((somme, facture) => somme + facture.resteDu, 0n)}
					/>
					{/* UN RELEVÉ, PARCE QU'ELLES SE LISENT : une facture n'a pas de page. */}
					<ListeDeReleve>
						{aRegler.map((facture) => {
							const echeance = echeanceDe(facture);
							const etat = etatDeFacture(facture);
							return (
								<LigneDeReleve
									key={facture._id}
									titre={facture.reference}
									montant={eurosCentimes(facture.resteDu)}
									{...(echeance === undefined ? {} : { ligne: echeance })}
									{...(etat === undefined ? {} : { date: etat })}
								/>
							);
						})}
					</ListeDeReleve>
					{/*
					  ⚠️ DIT UNE FOIS, SOUS LA LISTE, PAS SOUS CHAQUE LIGNE (audit du
					  29/09/2026, F4). L'honnêteté du produit ne demande pas qu'on répète
					  l'avertissement : elle demande qu'il soit dit, à sa place.
					*/}
					{aRegler.some((facture) => facture.exigibiliteDeduite) ? (
						<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							La date à laquelle le paiement devenait exigible est déduite de l’échéance de chaque
							facture — à confirmer si vos conditions contractuelles disent autre chose.
						</p>
					) : null}
				</section>
			)}

			{/*
			  SES PAIEMENTS, DESSINÉS SUR LA PAGE — et plus une rangée qui ouvrait une
			  phrase (07/10/2026). Une barre par règlement, une barre pleine par facture
			  encore due, la ligne de son habitude : la facture qui sort du rythme se
			  voit sans rien ouvrir. Voir `RythmeDePaiement`.
			*/}
			<section className="flex flex-col gap-cladd-3xs">
				<EnTeteDeGroupe libelle="Ses paiements" />
				<RythmeDePaiement
					habitude={habitude}
					ruptures={ruptures}
					historique={historique}
					enCours={enCours}
				/>
			</section>

			{/* LE RESTE, EN RANGÉES QUI PORTENT LEUR VALEUR. */}
			<ListeDeRangees>
				{/*
				  LE PILOTE ET CE CLIENT — le seul réglage par client, facultatif.

				  ⚠️ PAR DÉFAUT, LE PILOTE S'EN OCCUPE : il ouvre le dossier dès qu'une
				  facture passe son échéance et suit le plan de relance. Un client à
				  ménager se retire d'un geste ; rien n'est effacé, et tout reste
				  possible à la main.
				*/}
				{onReglerPilote === undefined ? null : (
					<RangeeDepliable
						cle="pilote"
						famille="ENVOI"
						titre={NOM_DU_PILOTE}
						valeur={debiteur.horsPilote === true ? 'retiré' : 's’en occupe'}
					>
						<label className="flex items-center justify-between gap-cladd-3xs">
							<span className="text-cladd-xs font-medium">
								Laisser le pilote s’occuper de ce client
							</span>
							<Switch
								as="div"
								checked={debiteur.horsPilote !== true}
								onChange={(actif: boolean) => onReglerPilote(!actif)}
							/>
						</label>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{debiteur.horsPilote === true
								? 'Retiré : aucun dossier ne s’ouvre et aucune relance ne part seule pour ce client. Vous gardez la main, et tout reste possible depuis ses dossiers.'
								: 'Il ouvre son dossier dès qu’une facture passe son échéance, et suit le plan de relance. Un paiement arrête tout.'}
						</p>
					</RangeeDepliable>
				)}

				{/*
				  SON IDENTITÉ — ce que le gérant seul peut dire. Le SIREN se cherche au
				  registre PAR NOM, et le produit propose sans jamais choisir : un SIREN
				  d'homonyme désignerait une AUTRE entreprise. Sans lui, la solvabilité
				  n'est pas surveillée et le délai le plus court est retenu.
				*/}
				<RangeeDepliable
					cle="identite"
					famille="QUESTION"
					titre="Son identité"
					glose="SIREN, ce que vous lui vendez, son adresse électronique et votre taux de retard."
					valeur={identiteCourte(debiteur)}
				>
					<IdentiteDebiteur
						denomination={denomination}
						siren={debiteur.siren}
						formeJuridique={debiteur.formeJuridique}
						etatRecherche={etatRecherche}
						onChercherAuRegistre={onChercherAuRegistre}
						onRetenirEtablissement={onRetenirEtablissement}
						secteur={debiteur.secteur}
						optionsSecteur={optionsSecteur}
						email={debiteur.email}
						emailVenuDeLaBanque={debiteur.emailVenuDeLaBanque ?? false}
						erreurEmail={erreurEmail}
						onEnregistrerEmail={onEnregistrerEmail}
						erreurSiren={erreurSiren}
						onEnregistrerSiren={onEnregistrerSiren}
						onChoisirSecteur={onChoisirSecteur}
						tauxContractuel={tauxStipule}
						propositionTaux={propositionTaux}
						constatTaux={constatTaux}
						onEnregistrerTaux={onEnregistrerTaux}
					/>
				</RangeeDepliable>

				{/*
				  SA SOLVABILITÉ — le registre, cité mot pour mot. ⚠️ L'ABSENCE DE
				  CONSTAT N'EST PAS UNE BONNE NOUVELLE, et la valeur le dit : sans SIREN,
				  « non surveillée », jamais « rien au registre ».
				*/}
				<RangeeDepliable
					cle="solvabilite"
					famille="MACHINE"
					titre="Solvabilité"
					valeur={
						debiteur.santeFinanciere === 'RADIEE'
							? 'radié'
							: debiteur.santeFinanciere === 'PROCEDURE_COLLECTIVE'
								? 'procédure collective'
								: debiteur.siren === undefined || debiteur.siren === ''
									? 'non surveillée'
									: 'rien au registre'
					}
				>
					{debiteur.constatRegistre === undefined ? (
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							{debiteur.siren === undefined || debiteur.siren === ''
								? 'Sans SIREN, sa solvabilité n’est pas surveillée : aucun registre n’est interrogé à son nom.'
								: 'Aucune annonce de greffe relevée à son nom au dernier passage du radar.'}
						</p>
					) : (
						<ConstatRegistre constat={debiteur.constatRegistre} sante={debiteur.santeFinanciere} />
					)}
				</RangeeDepliable>

				{/*
				  SES DOCUMENTS. ⚠️ LE DÉPÔT N'IMPOSE AUCUN TYPE : la pièce entre « à
				  classer », la lecture part en tâche de fond, et le gérant ne corrige
				  que si elle s'est trompée.
				*/}
				<RangeeDepliable
					cle="documents"
					famille="PAPIERS"
					titre="Documents"
					glose="Déposés ici, lus et classés tout seuls."
					valeur={pieces.length === 0 ? 'aucun' : `${pieces.length}`}
				>
					<Pieces
						pieces={pieces}
						optionsType={TYPES_PIECE}
						enCours={depotEnCours}
						onDeposer={onDeposerPieces}
						onClasser={onClasserPiece}
						onRetirer={onRetirerPiece}
					/>
					{erreurDepot ? <p className="text-cladd-xs text-cladd-fg">{erreurDepot}</p> : null}
				</RangeeDepliable>

				{/*
				  LES FACTURES RÉGLÉES — l'historique du client, qui sert à mesurer son
				  habitude. À part, sans montant trompeur et sans date limite.
				*/}
				{reglees.length === 0 ? null : (
					<RangeeDepliable
						cle="reglees"
						famille="PAPIERS"
						titre="Factures réglées"
						valeur={`${reglees.length}`}
					>
						<ListeDeReleve>
							{reglees.map((facture) => (
								<LigneDeReleve
									key={facture._id}
									titre={facture.reference}
									{...(facture.dateEcheance === undefined
										? {}
										: { ligne: `Échue le ${dateCourte(facture.dateEcheance)}` })}
									montant={eurosCentimes(facture.montantTTC)}
								/>
							))}
						</ListeDeReleve>
					</RangeeDepliable>
				)}
			</ListeDeRangees>

			{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

			{/*
			  LA FEUILLE « UN VIREMENT REÇU » — ouverte par son action rapide.
			  ⚠️ LA DATE ARRIVE AVEC LE GESTE : la date d'un règlement est le point
			  d'arrêt des pénalités, et la relire ailleurs enregistrait un montant faux.
			*/}
			<Popup
				open={virementOuvert}
				onOpenChange={(o) => {
					if (!o) setVirementOuvert(false);
				}}
				headerLeft={<span className="px-2 pb-1 text-cladd-xs font-semibold">Un virement reçu</span>}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<div className="flex flex-col gap-cladd-2xs">
						<p className="text-cladd-2xs leading-snug text-cladd-fg-softer">
							Dites-le ici : le logiciel solde les bonnes factures, et personne n’est relancé pour
							ce qu’il a déjà payé.
						</p>
						<ListeAnalyses>
							<Lettrage
								proposition={propositionLettrage}
								enCours={lettrageEnCours}
								erreur={erreurLettrage}
								onChercher={onChercherLettrage}
								onAppliquer={onAppliquerLettrage}
								{...(onRepartirLettrage === undefined ? {} : { onRepartir: onRepartirLettrage })}
							/>
						</ListeAnalyses>
					</div>
				</PopupContent>
			</Popup>

			{/*
			  LA FEUILLE « LANCER UN DOSSIER » — le choix des factures, puis le geste.

			  ⚠️ « RESTES DUS », JAMAIS « MONTANT RÉCLAMÉ ». Ce total est la somme des
			  `resteDu` cochés. Le principal du dossier est RECALCULÉ par le serveur à
			  sa constitution, et le calcul y ajoute pénalités et frais : donner à ce
			  chiffre le nom de ce qu'on réclame en ferait une promesse que la page
			  suivante dément.
			*/}
			<Popup
				open={feuilleOuverte}
				onOpenChange={(o) => {
					if (!o) setFeuilleOuverte(false);
				}}
				headerLeft={
					<span className="px-2 pb-1 text-cladd-xs font-semibold">Lancer un dossier</span>
				}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<div className="flex flex-col gap-cladd-2xs">
						<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
							Les factures échues sont cochées. Le dossier calculera ce qu’il vous doit, pénalités
							et frais compris.
						</p>
						<ListeAnalyses>
							{eligibles.map((facture) => (
								<LigneBouton
									key={facture._id}
									genre="contenu"
									titre={facture.reference}
									{...(echeanceDe(facture) === undefined ? {} : { precision: echeanceDe(facture) })}
									valeur={eurosCentimes(facture.resteDu)}
									icone={
										<Checkbox
											as="span"
											size="md"
											checked={selection.has(facture._id)}
											aria-label={`Sélectionner ${facture.reference}`}
										/>
									}
									onClick={() => onBasculerFacture(facture._id)}
								/>
							))}
						</ListeAnalyses>
						<div className="flex flex-col gap-cladd-3xs">
							<p className="text-center text-cladd-2xs text-cladd-fg-soft tabular-nums">
								{selection.size} facture{pluriel(selection.size)} · restes dus{' '}
								{eurosCentimes(restesDusSelectionnes)}
							</p>
							<BoutonPrincipal
								pleineLargeur
								disabled={selection.size === 0}
								onClick={() => {
									setFeuilleOuverte(false);
									onConstituer(provenance);
								}}
							>
								Lancer le dossier
							</BoutonPrincipal>
						</div>
					</div>
				</PopupContent>
			</Popup>
		</SectionsDepliables>
	);
}
