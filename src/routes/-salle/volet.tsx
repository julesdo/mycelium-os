import { useState } from 'react';
import {
	EcranVolet,
	sectionsParDefaut,
	type LigneOuverte,
	type PositionVolet,
	type SectionVolet
} from '../../screens/volet';
import { additionner, depuisCentimes, soustraire } from '../../lib/socle/montants';
import {
	libelleEvenement,
	suivreProcedure,
	type EvenementSurvenu
} from '../../lib/verticales/recouvrement/apres-procedure';
import {
	decompterCreance,
	type FacturePourDecompte,
	type Reglement
} from '../../lib/verticales/recouvrement/decompte';
import type { ConditionsDeduites } from '../../lib/verticales/recouvrement/deduction';
import {
	lireLitige,
	proposerFaits,
	questionsRestantes,
	type PropositionFait,
	type Reponses
} from '../../lib/verticales/recouvrement/litige';
import {
	ANGLE_MORT_PRESCRIPTION,
	regimePrescription
} from '../../lib/verticales/recouvrement/pays/france/prescription';
import { periodesDeTauxParDefaut } from '../../lib/verticales/recouvrement/pays/france/taux';
import { PROCEDURES } from '../../lib/verticales/recouvrement/procedures';
import { etatDuReferentiel } from '../../lib/verticales/recouvrement/referentiel';
import {
	NIVEAUX_RELANCE,
	composerRelance,
	type ElementsRelance
} from '../../lib/verticales/recouvrement/relance';
import { pyramideDePreuves } from '../../lib/verticales/recouvrement/solidite';
import {
	TYPES_PIECE,
	type DecompteAffiche,
	type EtatRechercheCommissaire,
	type NiveauAffiche,
	type PieceAffichee,
	type SoliditeAffichee
} from '../../ui';
import {
	AVOCATS_DEMO,
	BARREAUX_DEMO,
	CARNET_DEMO,
	ETABLISSEMENT_DEMO,
	ETUDES_DEMO,
	voieDeLaCreance
} from './communes';
import { DEPOT_A_ECARTS_DEMO } from './depots';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * LE VOLET DE PREUVE, DANS LA SALLE D'EXPOSITION.
 *
 * ⚠️ IL PARTAGE SON ADRESSE AVEC LA FILE, ET C'EST LE SUJET. Le volet est un
 * ÉTAT de `/app`, ouvert par `?ligne=<id>`, pas une route : deux entrées de la
 * salle portent donc `route: '/app/'`. C'est pour ça que la salle se choisit
 * désormais par son LIBELLÉ (voir `demo.ts`).
 *
 * ⚠️ ET TOUT CE QUI S'AFFICHE ICI SE CALCULE PAR LES FONCTIONS DU DOMAINE, comme
 * dans les autres familles. Écrire « 1 143,27 € » à la main ferait regarder une
 * géométrie sur un total que le produit ne rendrait jamais — et le montant est
 * précisément ce qu'on vient regarder.
 *
 * Ne restent écrits que les faits qu'aucune fonction ne produit : un nom de
 * client, deux factures, les pièces déposées, les faits du journal, et le jour
 * de la démonstration.
 */

/** Le débiteur de cette famille. Un nom qu'aucune autre famille de la salle ne montre. */
const DEBITEUR_DEMO = 'Toiture Vasseur';

const CREANCIER_DEMO = ETABLISSEMENT_DEMO.nom;

/** Le jour de la démonstration, figé : un « dans N jours » qui bouge ne se compare plus. */
const AUJOURD_HUI_DEMO = '2026-09-03';

/**
 * Les quatre conditions, ACQUISES.
 *
 * C'est ce qui rend une voie envisageable, donc ce qui met la section 6 à
 * l'épreuve : sans elles, la feuille d'une voie n'offre pas « Je l'ai engagée »,
 * et le geste qui rebranche `engagerProcedure` ne se regarde nulle part.
 */
const CONDITIONS_DEMO: ConditionsDeduites = {
	certaine: 'ok',
	liquide: 'ok',
	exigible: 'ok',
	entreCommercants: 'ok'
};

interface ReglementDemo {
	readonly date: string;
	readonly montant: bigint;
	readonly nature: Reglement['nature'];
}

interface FactureDemo {
	readonly reference: string;
	readonly montantTTC: bigint;
	readonly dateEcheance: string;
	readonly dateExigibilite: string;
	readonly reglements: readonly ReglementDemo[];
}

/**
 * Les deux factures de la créance.
 *
 * ⚠️ UNE RÉGLÉE EN PARTIE EN COURS DE ROUTE, et c'est délibéré : le décompte en
 * tire deux périodes à taux différents sur deux principaux, donc un tableau à
 * sept colonnes dans un volet de 40 % de largeur. C'est le seul endroit du
 * produit où l'auditabilité se voit — base, taux, jours, base annuelle — et
 * c'est là qu'elle doit tenir à 375 px comme à 1280.
 */
const FACTURES_DEMO: readonly FactureDemo[] = [
	{
		reference: 'FA-2026-0214',
		montantTTC: 1_480_000n,
		dateEcheance: '2026-03-12',
		dateExigibilite: '2026-03-12',
		reglements: [{ date: '2026-06-18', montant: 500_000n, nature: 'PAIEMENT' }]
	},
	{
		reference: 'FA-2026-0261',
		montantTTC: 620_000n,
		dateEcheance: '2026-04-30',
		dateExigibilite: '2026-04-30',
		reglements: []
	}
];

/** Ce qui reste dû sur une facture, comme `resteDu` le calcule (`lecture.ts`). */
function resteDu(facture: FactureDemo) {
	return soustraire(
		depuisCentimes(facture.montantTTC),
		additionner(...facture.reglements.map((reglement) => depuisCentimes(reglement.montant)))
	);
}

const PRINCIPAL_RESTANT_DU_DEMO = additionner(...FACTURES_DEMO.map(resteDu));

/** Une facture, telle que `figerDecompte` la passe au calcul. */
function versDecompte(facture: FactureDemo, arreteAu: string): FacturePourDecompte {
	return {
		reference: facture.reference,
		montantExigible: depuisCentimes(facture.montantTTC),
		dateExigibilite: facture.dateExigibilite,
		reglements: facture.reglements.map((reglement) => ({
			date: reglement.date,
			montant: depuisCentimes(reglement.montant),
			nature: reglement.nature
		})),
		taux: periodesDeTauxParDefaut(facture.dateExigibilite, arreteAu)
	};
}

/** Le calcul du JOUR : ce que la section 1 montre, et il bouge chaque matin. */
const MONTANT_DU_JOUR_DEMO: DecompteAffiche = decompterCreance(
	FACTURES_DEMO.map((facture) => versDecompte(facture, AUJOURD_HUI_DEMO)),
	AUJOURD_HUI_DEMO,
	'ACT_365'
);

/** Le décompte ARRÊTÉ dix-huit jours plus tôt : la position « Décompte » le porte. */
const ARRETE_LE_DEMO = '2026-08-16';
const DECOMPTE_ARRETE_DEMO: DecompteAffiche = decompterCreance(
	FACTURES_DEMO.map((facture) => versDecompte(facture, ARRETE_LE_DEMO)),
	ARRETE_LE_DEMO,
	'ACT_365'
);

/**
 * Les pièces du dossier. Écrites : aucune fonction du domaine ne produit un
 * dépôt, et leur `statut` est celui que `listerPieces` rend.
 */
const PIECES_DEMO: readonly PieceAffichee[] = [
	{
		_id: 'demo-piece-bc',
		type: 'BON_DE_COMMANDE',
		statut: 'LUE',
		filename: 'BC-2026-0214.pdf',
		reference: 'BC-2026-0214',
		dateDocument: '2026-02-04',
		constat: 'Commande signée par le client, pour les deux factures du dossier.'
	},
	{
		_id: 'demo-piece-bl',
		type: 'BON_DE_LIVRAISON',
		statut: 'LUE',
		filename: 'BL-2026-0214.pdf',
		reference: 'BL-2026-0214',
		dateDocument: '2026-02-27',
		reserves: 'Deux tuiles cassées, signalées à la livraison.',
		constat: 'Réception émargée, avec une réserve.'
	},
	{
		_id: 'demo-piece-scan',
		type: 'INDETERMINE',
		statut: 'A_CLASSER',
		filename: 'scan_20260610.jpg',
		constat: 'La lecture n’a rien conclu : ce document attend son classement.'
	}
];

/** Les quatre étages de preuve, par `pyramideDePreuves` : jamais un pourcentage. */
const PYRAMIDE_DEMO = pyramideDePreuves(['FACTURE', 'BON_DE_COMMANDE', 'BON_DE_LIVRAISON']);

const SOLIDITE_DEMO: SoliditeAffichee = {
	constat: PYRAMIDE_DEMO.constat,
	etablies: PYRAMIDE_DEMO.etablies,
	attendues: PYRAMIDE_DEMO.attendues,
	prochaine: PYRAMIDE_DEMO.prochaine?.cle ?? null,
	etages: PYRAMIDE_DEMO.etages.map((etage) => ({
		cle: etage.cle,
		fait: etage.fait,
		etat: etage.etat,
		presente: etage.presente,
		poids: etage.poids
	}))
};

/**
 * Le questionnaire : AUCUNE réponse en base, et deux propositions composées par
 * `proposerFaits`. C'est la seule situation où les questions que le logiciel
 * sait déjà remplir sont encore posées — donc la seule où la proposition se
 * regarde.
 */
const REPONSES_DEMO: Reponses = {};

const PROPOSITIONS_DEMO: readonly PropositionFait[] = proposerFaits({
	reserves: [
		{
			texte: 'Deux tuiles cassées, signalées à la livraison.',
			piece: 'BL-2026-0214',
			date: 'document du 27/02/2026'
		}
	],
	declarationsAnterieures: []
});

/** Le litige, par `lireLitige` et `questionsRestantes` : jamais des phrases recopiées. */
function litigeDemo() {
	const lecture = lireLitige(REPONSES_DEMO);
	return {
		litigieux: lecture.litigieux,
		constats: [...lecture.constats],
		questions: questionsRestantes(REPONSES_DEMO).map((question) => {
			const proposition = PROPOSITIONS_DEMO.find((p) => p.cle === question.cle);
			return {
				cle: question.cle,
				question: question.question,
				portee: question.portee,
				...(proposition === undefined
					? {}
					: {
							proposition: {
								reponse: proposition.reponse,
								source: proposition.source,
								date: proposition.date
							}
						})
			};
		})
	};
}

/** Les voies, toutes, évaluées sur les seules conditions. Énumérées, jamais classées. */
const VOIES_DEMO = Object.values(PROCEDURES).map((procedure) =>
	voieDeLaCreance(procedure, CONDITIONS_DEMO)
);

/** La voie déclarée engagée dans la variante, et le jour déclaré. */
const PROCEDURE_ENGAGEE_DEMO = 'injonction-de-payer';
const ENGAGEE_LE_DEMO = '2026-06-02';

/** L'ordonnance rendue, pas encore signifiée : l'état où court la caducité. */
const JOURNAL_PROCEDURE_DEMO: readonly EvenementSurvenu[] = [
	{ cle: 'ordonnance-rendue', survenuLe: '2026-07-14' }
];

/** Le suivi, tel que `lireSuivi` le rend : le journal rejoué par `suivreProcedure`. */
function suiviDemo() {
	const journal = [...JOURNAL_PROCEDURE_DEMO].sort((a, b) =>
		a.survenuLe < b.survenuLe ? -1 : a.survenuLe > b.survenuLe ? 1 : 0
	);
	const suivi = suivreProcedure(PROCEDURE_ENGAGEE_DEMO, journal, ENGAGEE_LE_DEMO);
	return {
		libelle: suivi.libelle,
		constat: suivi.constat,
		depuisLe: suivi.depuisLe,
		echeances: suivi.echeances.map((echeance) => ({ ...echeance })),
		anglesMorts: [...suivi.anglesMorts],
		suites: suivi.suites.map((suite) => ({ ...suite })),
		terminal: suivi.terminal,
		journal: journal.map((evenement) => ({
			...evenement,
			libelle: libelleEvenement(PROCEDURE_ENGAGEE_DEMO, evenement.cle) ?? evenement.cle
		}))
	};
}

/** Les trois niveaux, composés par `composerRelance`, avec ou sans décompte arrêté. */
function relancesDemo(avecDecompteArrete: boolean): readonly NiveauAffiche[] {
	const elements: ElementsRelance = {
		creancier: CREANCIER_DEMO,
		debiteur: DEBITEUR_DEMO,
		factures: FACTURES_DEMO.map((facture) => ({
			reference: facture.reference,
			montantTTC: depuisCentimes(facture.montantTTC),
			dateEcheance: facture.dateEcheance
		})),
		principalRestantDu: PRINCIPAL_RESTANT_DU_DEMO,
		...(avecDecompteArrete
			? {
					decompte: {
						arreteAu: DECOMPTE_ARRETE_DEMO.arreteAu,
						interets: depuisCentimes(DECOMPTE_ARRETE_DEMO.interets),
						indemniteForfaitaire: depuisCentimes(DECOMPTE_ARRETE_DEMO.indemniteForfaitaire),
						total: depuisCentimes(DECOMPTE_ARRETE_DEMO.total)
					}
				}
			: {}),
		santeDebiteur: 'INCONNUE',
		aujourdHui: AUJOURD_HUI_DEMO
	};

	return NIVEAUX_RELANCE.map((description) => {
		const relance = composerRelance(description.niveau, elements);
		return {
			niveau: description.niveau,
			nom: description.nom,
			intention: description.intention,
			disponible: relance.disponible,
			objet: relance.disponible ? relance.objet : undefined,
			corps: relance.disponible ? relance.corps : undefined,
			peutFaire: relance.disponible ? undefined : relance.peutFaire,
			constat: relance.disponible ? undefined : relance.constat,
			blocages: relance.disponible ? undefined : [...relance.blocages],
			coutDeLAttente: relance.disponible ? undefined : relance.coutDeLAttente,
			geste: relance.disponible ? undefined : relance.geste
		};
	});
}

/**
 * L'hypothèse du logiciel, par `regimePrescription('INDETERMINE')`.
 *
 * ⚠️ SA PHRASE VIENT DU DOMAINE. Le délai le plus court connu y est calculé, pas
 * recopié : une démonstration qui écrirait « un an » en dur deviendrait fausse
 * le jour où un régime plus court entre au référentiel, sans qu'aucun test ne
 * tombe.
 */
const REGIME_INDETERMINE_DEMO = regimePrescription('INDETERMINE');

/** Les faits du journal. Écrits : aucune fonction ne produit un historique. */
const JOURNAL_DEMO = [
	{
		id: 'demo-journal-registre',
		libelle: 'Qualité relevée au registre',
		avant: 'indéterminée',
		apres: 'commerçant, forme SAS',
		source: 'BODACC du 16/09/2026',
		auteur: 'MACHINE' as const,
		consigneLe: Date.parse('2026-09-16T04:12:00Z')
	},
	{
		id: 'demo-journal-piece',
		libelle: 'Bon de livraison déposé et classé',
		apres: 'BL-2026-0214',
		auteur: 'GERANT' as const,
		consigneLe: Date.parse('2026-06-10T09:15:00Z')
	},
	{
		id: 'demo-journal-reglement',
		libelle: 'Règlement partiel rapproché',
		avant: '14 800,00 €',
		apres: '9 800,00 €',
		source: 'Dépôt FEC-2026-exercice.txt',
		auteur: 'MACHINE' as const,
		consigneLe: Date.parse('2026-06-18T07:40:00Z')
	}
];

/** Le refus de la section 1, en quatre parties, pour la variante qui le montre. */
const REFUS_DU_MONTANT_DEMO = {
	peutFaire:
		'Les deux factures, leurs échéances et leur reste dû s’affichent, et la prescription ' +
		'continue d’être comptée sur celle dont la date de départ est lisible.',
	constat:
		'Le montant ne se décompose pas : la facture FA-2026-0261 porte une date d’exigibilité qui ' +
		'n’existe pas au calendrier (« 2026-02-30 »), venue d’un export tiers.',
	blocages: [
		'Corriger la date d’exigibilité de FA-2026-0261 rend son calcul possible, et le total avec.'
	],
	coutDeLAttente:
		'Tant qu’elle n’est pas corrigée, les intérêts de cette facture ne sont comptés nulle part, ' +
		'et sa prescription n’est pas surveillée.'
};

/**
 * Ce que la démonstration partage entre toutes ses formes.
 *
 * Tout ce qui dépend d'un état d'écran — les deux recherches de répertoire — en
 * est exclu et vit dans le composant : ce bloc-ci est de la donnée, pas du
 * comportement.
 */
type LigneCommune = Omit<
	LigneOuverte,
	| 'montantDuJour'
	| 'refusDuMontant'
	| 'suivi'
	| 'relances'
	| 'decomptesArretes'
	| 'rechercheCommissaireOuverte'
	| 'etatRechercheCommissaire'
	| 'onOuvrirRechercheCommissaire'
	| 'onFermerRechercheCommissaire'
	| 'onChercherCommissaire'
	| 'onRetenirEtude'
	| 'rechercheAvocatOuverte'
	| 'barreau'
	| 'specialite'
	| 'etatRechercheAvocat'
	| 'onOuvrirRechercheAvocat'
	| 'onFermerRechercheAvocat'
	| 'onChoisirBarreau'
	| 'onChoisirSpecialite'
	| 'onRetenirAvocat'
>;

function ligneCommune(): LigneCommune {
	return {
		debiteur: DEBITEUR_DEMO,
		debiteurId: 'demo-debiteur-vasseur',
		creanceId: 'demo-creance-vasseur',
		nombreFactures: FACTURES_DEMO.length,
		principalRestantDu: PRINCIPAL_RESTANT_DU_DEMO,
		eligible: true,
		fiches: etatDuReferentiel().fiches,
		solidite: SOLIDITE_DEMO,
		litige: litigeDemo(),
		onRepondre: () => undefined,
		hypotheses: [
			{
				cle: 'secteur-indetermine',
				enonce: `Le délai de prescription retenu est de ${REGIME_INDETERMINE_DEMO.dureeAnnees} an.`,
				fait: 'Le secteur de ce client n’est pas renseigné sur sa fiche.',
				ceQuiLaLeve: REGIME_INDETERMINE_DEMO.note,
				geste: { libelle: 'Préciser le secteur', onGeste: () => undefined }
			},
			{
				cle: 'taux-legal',
				enonce: 'Le taux appliqué est le taux légal majoré, et non un taux contractuel.',
				fait: 'Aucune clause de pénalité n’a été relevée dans les pièces déposées.',
				ceQuiLaLeve:
					'Déposer les conditions générales ou le contrat permet de relever le taux stipulé, ' +
					'qui remplace alors le taux par défaut sur les factures à venir.'
			}
		],
		anglesMorts: [
			{
				cle: 'prescription-suspension',
				constat: ANGLE_MORT_PRESCRIPTION,
				montantEnJeu: null
			},
			{
				cle: 'facture-sans-echeance',
				constat:
					'Prescription non surveillée sur 1 facture du même client, hors de cette créance : ' +
					'FA-2025-0788, aucune date d’échéance ni d’exigibilité. Saisir l’échéance lève cet ' +
					'angle mort.',
				montantEnJeu: 312_000n
			}
		],
		pieces: PIECES_DEMO,
		optionsTypePiece: TYPES_PIECE,
		onDeposer: () => undefined,
		onClasser: () => undefined,
		onRetirer: () => undefined,
		voies: VOIES_DEMO,
		carnet: CARNET_DEMO,
		intervenantChoisi: null,
		nomIntervenant: null,
		onConsigner: () => undefined,
		onDeclarer: () => undefined,
		onRattacher: () => undefined,
		onAjouterFiche: () => undefined,
		onOublierFiche: () => undefined,
		repertoire: BARREAUX_DEMO,
		journal: JOURNAL_DEMO,
		depot: DEPOT_A_ECARTS_DEMO,
		enCours: false,
		erreur: null,
		aujourdHui: AUJOURD_HUI_DEMO
	};
}

/** Les formes nommées du volet. Chacune rend autre chose que la forme principale. */
const FORMES = {
	'voie engagée': 'ENGAGEE',
	'un décompte arrêté': 'ARRETE',
	'montant non calculé': 'SANS_MONTANT'
} as const;

type Forme = (typeof FORMES)[keyof typeof FORMES] | 'PRINCIPALE';

/**
 * ⚠️ LES FEUILLES ET LES RECHERCHES PARTENT TOUTES FERMÉES, comme la route.
 * C'est le passage au navigateur, aux quatre largeurs, qui attrape une feuille
 * qui ne s'ouvrirait pas — la `Popup` de Cladd ne rend rien côté serveur.
 *
 * ⚠️ LA POSITION ET LES SECTIONS OUVERTES SONT UN ÉTAT, ici comme en
 * production : l'adresse les porte. La salle n'a pas d'adresse, donc elle les
 * tient dans un `useState` — c'est la seule différence avec la route, et elle
 * est visible d'un coup d'œil.
 */
function VoletDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [position, setPosition] = useState<PositionVolet>('PIECE');
	const [rechercheCommissaireOuverte, setRechercheCommissaireOuverte] = useState(false);
	const [etatRechercheCommissaire, setEtatRechercheCommissaire] =
		useState<EtatRechercheCommissaire>({ phase: 'REPOS' });
	const [rechercheAvocatOuverte, setRechercheAvocatOuverte] = useState(false);
	const [barreau, setBarreau] = useState('');
	const [specialite, setSpecialite] = useState('');

	// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
	const forme: Forme = formeDemo<Forme>(variante, 'PRINCIPALE', FORMES);

	const ligne: LigneOuverte = {
		...ligneCommune(),
		montantDuJour: forme === 'SANS_MONTANT' ? null : MONTANT_DU_JOUR_DEMO,
		refusDuMontant: forme === 'SANS_MONTANT' ? REFUS_DU_MONTANT_DEMO : null,
		suivi: forme === 'ENGAGEE' ? suiviDemo() : null,
		relances: relancesDemo(forme === 'ARRETE'),
		decomptesArretes:
			forme === 'ARRETE'
				? [
						{
							id: 'demo-decompte-vasseur',
							arreteAu: DECOMPTE_ARRETE_DEMO.arreteAu,
							total: DECOMPTE_ARRETE_DEMO.total
						}
					]
				: [],
		rechercheCommissaireOuverte,
		etatRechercheCommissaire,
		onOuvrirRechercheCommissaire: () => setRechercheCommissaireOuverte(true),
		onFermerRechercheCommissaire: () => setRechercheCommissaireOuverte(false),
		onChercherCommissaire: () => setEtatRechercheCommissaire({ phase: 'TROUVE', resultat: ETUDES_DEMO }),
		onRetenirEtude: () => setRechercheCommissaireOuverte(false),
		rechercheAvocatOuverte,
		barreau,
		specialite,
		etatRechercheAvocat:
			barreau === '' ? { phase: 'AUCUN_BARREAU' } : { phase: 'TROUVE', resultat: AVOCATS_DEMO },
		onOuvrirRechercheAvocat: () => setRechercheAvocatOuverte(true),
		onFermerRechercheAvocat: () => setRechercheAvocatOuverte(false),
		onChoisirBarreau: (choisi) => {
			setBarreau(choisi);
			setSpecialite('');
		},
		onChoisirSpecialite: (choisie) => setSpecialite(choisie),
		onRetenirAvocat: () => setRechercheAvocatOuverte(false)
	};

	return (
		<VoletAvecSections ligne={ligne} etat={etat} position={position} onPosition={setPosition} />
	);
}

/**
 * Les sections ouvertes vivent ici, pour que `sectionsParDefaut` soit LU par la
 * salle comme la file le lira : une règle par défaut qu'aucune surface n'appelle
 * est une règle qu'on croit tenue.
 */
function VoletAvecSections({
	ligne,
	etat,
	position,
	onPosition
}: {
	ligne: LigneOuverte;
	etat: EtatDemo;
	position: PositionVolet;
	onPosition: (position: PositionVolet) => void;
}) {
	const [ouvertes, setOuvertes] = useState<readonly SectionVolet[]>(() => sectionsParDefaut(ligne));

	return (
		<EcranVolet
			ligneId={ligne.creanceId}
			donnees={lectureDemo(etat, ligne)}
			position={position}
			onPosition={onPosition}
			sectionsOuvertes={ouvertes}
			onSectionsOuvertes={setOuvertes}
			onFermer={() => undefined}
		/>
	);
}

export const ECRANS_VOLET: readonly EcranDuProduit[] = [
	{
		/*
		  ⚠️ LA MÊME ADRESSE QUE LA FILE, ET C'EST EXACT. Le volet s'ouvre par
		  `?ligne=<id>` sur `/app/` : il n'a pas de route à lui, et lui en inventer
		  une dans la salle ferait regarder un écran que le produit n'a pas.
		*/
		route: '/app/',
		libelle: 'volet de preuve',
		vide: false,
		variantes: Object.keys(FORMES),
		Demo: VoletDemo
	}
];
