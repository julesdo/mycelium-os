import { useState } from 'react';
import {
	EcranFile,
	type CeQueVosFacturesPortent,
	type DebiteurSansIdentifiant,
	type FileAffichee,
	type RangeeClient,
	type RangeeDeLaFile
} from '../../screens/file';
import { SECTEURS_DEMO } from './communes';
import { DEPOT_A_ECARTS_DEMO, DEPOT_PARFAIT_DEMO } from './depots';
import {
	BILAN_DEMO,
	BILAN_SANS_FACTURE_DEMO,
	REVELATION_DEMO,
	REVELATION_SANS_FACTURE_DEMO
} from './revelation';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';
import type { EtatRecherche } from '../../ui';

/**
 * LA FILE, DANS LA SALLE — et c'est le SEUL endroit où elle est montée.
 *
 * ⚠️ ELLE NE REMPLACE PAS ENCORE `/app/`. La bascule est une tâche séparée et
 * volontairement révocable (T15) : `routes/app/index.tsx`, `src/app/barre.tsx`
 * et `src/screens/accueil.tsx` ne bougent pas d'ici là. Les deux entrées visent
 * donc la même adresse dans la salle — l'accueil sous sa clé de route, la file
 * sous la clé `file` — et c'est la seule façon de vérifier au regard que la
 * seconde rend ce que la première rendait.
 *
 * ⚠️ LES DONNÉES CHIFFRÉES VIENNENT DU DOMAINE, PAS D'UNE COPIE. La tête lit
 * `REVELATION_DEMO`, calculé par `verticales/recouvrement/revelation.ts` sur les
 * factures de la salle : écrire ici un total à la main en ferait une seconde
 * vérité sur le seul chiffre du produit qui coûte de l'argent réel.
 */

/** Les trois clients de la file, et le troisième n'a pas de numéro au registre. */
const DURAND = 'demo-debiteur-durand';
const MARTIN = 'demo-debiteur-martin';
const BELLIN = 'demo-debiteur-bellin';

/**
 * LES RANGÉES, ET CHACUNE EST LÀ POUR UNE RAISON.
 *
 * Le jeu couvre les quatre genres de rangée ET les trois vetos du pli (B9) :
 *
 *   · une prescription qui porte une HYPOTHÈSE retenue — elle reste pleine même
 *     quand rien n'est à trancher ;
 *   · une facture NON CHIFFRÉE — elle reste pleine, et le total de tête la nomme
 *     déjà au-dessus ;
 *   · un dépôt qui a ÉCARTÉ deux lignes — il reste plein, là où le dépôt parfait
 *     se replie.
 *
 * Sans ces trois-là côte à côte, on regarderait un pli qui a l'air juste parce
 * qu'il n'a jamais eu l'occasion de se tromper.
 */
const RANGEES_DEMO: readonly RangeeDeLaFile[] = [
	{
		genre: 'OBSTACLE',
		id: 'r-prescription-durand',
		debiteurId: DURAND,
		debiteur: 'Fournitures Durand',
		portees: ['AUJOURDHUI', 'PRESCRIPTION'],
		obstacle:
			'Prescription dans 41 jours : passé le 27/10/2026, cette créance ne se réclame plus.',
		urgence: 'CRITIQUE',
		montant: 3_120_050n,
		dateDuFait: '2026-10-27',
		hypothese:
			'Le secteur de ce client n’est pas déterminé : la prescription est calculée sur le délai le plus court. Préciser le secteur lèvera cette hypothèse.',
		verbe: { libelle: 'Retenir la créance', onPresser: () => {} },
		pli: {
			libelle: 'prescriptions proches',
			// Rien à trancher, et pourtant elle reste PLEINE : l'hypothèse la retient.
			rienATrancher: true,
			hypothese: 'secteur indéterminé'
		}
	},
	{
		genre: 'LITIGE',
		id: 'r-litige-durand',
		debiteurId: DURAND,
		debiteur: 'Fournitures Durand',
		portees: ['AUJOURDHUI', 'A_TRANCHER'],
		question: 'La facture FA-2026-0311 a-t-elle été contestée par écrit ?',
		urgence: 'HAUTE',
		montant: 24_990n,
		proposition: {
			valeur: 'oui',
			source: 'réserve lue sur BL-2024-77, page 1',
			date: '2026-08-14'
		},
		onRepondre: () => {},
		pli: { libelle: 'questions de litige', rienATrancher: false }
	},
	{
		genre: 'OBSTACLE',
		id: 'r-decompte-martin',
		debiteurId: MARTIN,
		debiteur: 'Ateliers Martin',
		portees: ['AUJOURDHUI', 'DECOMPTES'],
		obstacle: 'Décompte arrêtable, dont 1 240,33 € d’intérêts courus.',
		urgence: 'HAUTE',
		montant: 1_248_033n,
		verbe: { libelle: 'Arrêter le décompte', onPresser: () => {} },
		pli: { libelle: 'décomptes arrêtables', rienATrancher: false }
	},
	{
		genre: 'OBSTACLE',
		id: 'r-echeance-martin',
		debiteurId: MARTIN,
		debiteur: 'Ateliers Martin',
		portees: ['AUJOURDHUI', 'ENGAGES'],
		obstacle:
			'Signification de l’ordonnance : il reste 9 jours avant le 12 septembre 2026, après quoi l’ordonnance est caduque.',
		urgence: 'CRITIQUE',
		montant: 1_845_000n,
		dateDuFait: '2026-09-12',
		pli: { libelle: 'échéances de procédure', rienATrancher: false }
	},
	{
		genre: 'OBSTACLE',
		id: 'r-non-chiffree-bellin',
		debiteurId: BELLIN,
		debiteur: 'Transports Bellin',
		portees: ['AUJOURDHUI', 'A_TRANCHER'],
		obstacle: 'Date d’exigibilité inexploitable sur F-2024-114 : le retard ne peut pas être établi.',
		urgence: 'HAUTE',
		montant: null,
		verbe: { libelle: 'Relever l’échéance', onPresser: () => {} },
		pli: {
			libelle: 'factures non chiffrées',
			// Rien à trancher au sens strict, et pourtant elle reste PLEINE.
			rienATrancher: true,
			nonChiffree: true
		}
	},
	{
		genre: 'LETTRAGE',
		id: 'r-lettrage',
		debiteurId: DURAND,
		debiteur: 'Fournitures Durand',
		portees: ['AUJOURDHUI', 'A_TRANCHER'],
		lettrage: {
			proposition: null,
			enCours: false,
			erreur: null,
			onChercher: () => {},
			onAppliquer: () => {}
		},
		pli: { libelle: 'rapprochements en attente', rienATrancher: false }
	},
	{
		genre: 'DEPOT',
		id: 'r-depot-ecarts',
		debiteurId: null,
		debiteur: 'Dépôt du 09/09',
		portees: ['AUJOURDHUI'],
		depot: DEPOT_A_ECARTS_DEMO,
		pli: {
			libelle: 'dépôts terminés',
			// Rien à trancher, et pourtant il reste PLEIN : deux lignes écartées.
			rienATrancher: true,
			lignesEcartees: 2
		}
	},
	{
		genre: 'DEPOT',
		id: 'r-depot-parfait',
		debiteurId: null,
		debiteur: 'Dépôt du 08/09',
		portees: ['AUJOURDHUI'],
		depot: DEPOT_PARFAIT_DEMO,
		// Rien d'écarté : c'est le SEUL dépôt qui a le droit de se replier.
		pli: { libelle: 'dépôts terminés sans rien d’écarté', rienATrancher: true, lignesEcartees: 0 }
	},
	...Array.from({ length: 142 }, (_, rang): RangeeDeLaFile => {
		const numero = `${rang + 1}`.padStart(3, '0');
		return {
			genre: 'OBSTACLE',
			id: `r-payee-${numero}`,
			debiteurId: DURAND,
			debiteur: 'Fournitures Durand',
			portees: ['AUJOURDHUI'],
			obstacle: `La facture FA-2026-1${numero} a été payée dans les délais.`,
			urgence: 'NORMALE',
			montant: null,
			pli: { libelle: 'factures payées dans les délais', rienATrancher: true }
		};
	})
];

/**
 * LES CLIENTS, ET CE QUE LA VUE PAR CLIENT REND POSSIBLE.
 *
 * Trois faits que la vue Par créance ne rend nulle part : l'encours agrégé, ce
 * qu'un décompte abandonnerait au sens de `controle.ts`, et l'habitude de
 * paiement — qui n'a PAS d'échéance, donc aucune place dans un tri d'échéances.
 */
const CLIENTS_DEMO: readonly RangeeClient[] = [
	{
		debiteurId: DURAND,
		denomination: 'Fournitures Durand',
		identifiantConfirme: true,
		encours: 3_145_040n,
		parts: { principal: 2_812_000n, interets: 273_040n, indemnites: 60_000n },
		prochaineEcheance: {
			fait: 'Prescription dans 41 jours, passé le 27/10/2026 cette créance ne se réclame plus',
			date: '2026-10-27'
		},
		sousPreavis: true,
		obstacles: [
			{ libelle: 'à trancher', compte: 2 },
			{ libelle: 'décompte arrêtable', compte: 0 }
		],
		habitude: {
			habitude: { connue: true, delaiMedianJours: 5, echantillon: 23, dispersionJours: 3 },
			ruptures: [
				{
					reference: 'FA-2026-0311',
					habituelJours: 5,
					ecartJours: 27,
					constat:
						'Ce client règle habituellement à 5 jours de son échéance, sur 23 règlements observés. Cette facture en est à 32, soit 27 de plus que son habitude.'
				}
			]
		},
		portefeuille: { facturesConnues: 5, auDecompte: 3, horsDecompte: 124_000n }
	},
	{
		debiteurId: MARTIN,
		denomination: 'Ateliers Martin',
		identifiantConfirme: true,
		encours: 3_093_033n,
		parts: { principal: 2_845_000n, interets: 208_033n, indemnites: 40_000n },
		prochaineEcheance: {
			fait: 'Signification de l’ordonnance, passé le 12/09/2026 l’ordonnance est caduque',
			date: '2026-09-12'
		},
		sousPreavis: true,
		obstacles: [
			{ libelle: 'décompte arrêtable', compte: 1 },
			{ libelle: 'échéance de procédure', compte: 1 }
		],
		habitude: {
			habitude: {
				connue: false,
				raison:
					'Moins de 4 règlements observés sur ce client : son habitude n’est pas mesurable, et l’absence de rupture ne veut donc rien dire.'
			},
			ruptures: []
		},
		portefeuille: { facturesConnues: 4, auDecompte: 4, horsDecompte: 0n }
	},
	{
		debiteurId: BELLIN,
		/**
		 * ⚠️ LE LIBELLÉ BRUT, ET LA RANGÉE LE DIT. Son numéro au registre n'est pas
		 * confirmé : ce nom est celui que ses factures portent, et le faire passer
		 * pour une dénomination retenue serait exactement ce que A11 corrige.
		 */
		denomination: 'TRANSPORTS BELLIN',
		identifiantConfirme: false,
		encours: 412_000n,
		parts: { principal: 400_000n, interets: 8_000n, indemnites: 4_000n },
		prochaineEcheance: null,
		sousPreavis: false,
		obstacles: [{ libelle: 'facture non chiffrée', compte: 1 }],
		portefeuille: { facturesConnues: 1, auDecompte: 0, horsDecompte: 412_000n }
	}
];

/**
 * Trois candidats au registre, tels que le BODACC les rend sur une recherche par
 * nom : des homonymes proches, et c'est le gérant qui reconnaît le sien.
 */
const CANDIDATS_BELLIN: EtatRecherche = {
	phase: 'TROUVE',
	candidats: [
		{
			siren: '421931452',
			denomination: 'TRANSPORTS BELLIN',
			formeJuridique: 'Société à responsabilité limitée',
			ville: 'LILLE',
			adresse: '14 RUE DU MOLINEL 59800 LILLE'
		},
		{
			siren: '804712339',
			denomination: 'BELLIN TRANSPORTS ET LOGISTIQUE',
			formeJuridique: 'Société par actions simplifiée',
			ville: 'ROUBAIX',
			adresse: '3 AVENUE JEAN LEBAS 59100 ROUBAIX'
		}
	]
};

/** Ce que les factures portent : le supplément, le bilan des pertes, et les angles morts. */
const FACTURES_PORTENT_DEMO: CeQueVosFacturesPortent = {
	revelation: REVELATION_DEMO,
	bilan: BILAN_DEMO,
	anglesMorts: [
		'Un délai d’opposition court depuis la signification de l’ordonnance d’Ateliers Martin. Sa durée n’est pas relevée dans le référentiel juridique de ce logiciel : cette échéance-là n’est pas surveillée, et reste à vérifier auprès de l’acte signifié, qui la porte.',
		'Deux débiteurs n’ont aucun numéro au registre : leur solvabilité n’est pas interrogée, et une procédure collective ouverte contre eux passerait inaperçue.'
	]
};

const FACTURES_PORTENT_VIDE: CeQueVosFacturesPortent = {
	revelation: REVELATION_SANS_FACTURE_DEMO,
	bilan: BILAN_SANS_FACTURE_DEMO,
	anglesMorts: []
};

/**
 * LA FILE GARNIE.
 *
 * `ligneOuverte` et les gestes du registre sont posés par le composant : ce sont
 * les deux seules choses qui bougent sous le doigt, et une fixture figée
 * empêcherait de les regarder.
 */
function FileDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [ligneOuverte, setLigneOuverte] = useState<string | null>(null);
	const [registre, setRegistre] = useState<EtatRecherche>({ phase: 'REPOS' });

	const sansIdentifiant: readonly DebiteurSansIdentifiant[] = [
		{
			debiteurId: BELLIN,
			denomination: 'TRANSPORTS BELLIN',
			encours: 412_000n,
			registre,
			erreurSaisie: null,
			onChercher: () => setRegistre(CANDIDATS_BELLIN),
			onRetenir: () => setRegistre({ phase: 'REPOS' }),
			onSaisir: () => setRegistre({ phase: 'REPOS' }),
			secteur: undefined,
			onChoisirSecteur: () => {}
		}
	];

	const garnie: FileAffichee = {
		tete: {
			total: REVELATION_DEMO.total,
			nombreFactures: REVELATION_DEMO.nombreFactures,
			parts: {
				principal: REVELATION_DEMO.principal,
				interets: REVELATION_DEMO.interets,
				indemnites: REVELATION_DEMO.indemnites
			},
			nonChiffrees: REVELATION_DEMO.nonChiffrees,
			prescriptionSousPreavis: 3_120_050n,
			clientsConcernes: CLIENTS_DEMO.length,
			clientsSousPreavis: CLIENTS_DEMO.filter((c) => c.sousPreavis).length
		},
		rangees: RANGEES_DEMO,
		clients: CLIENTS_DEMO,
		sansIdentifiant,
		optionsSecteur: SECTEURS_DEMO,
		facturesPortent: FACTURES_PORTENT_DEMO,
		/**
		 * ⚠️ LE VEILLEUR RESTE VIDE ICI, ET C'EST DÉLIBÉRÉ. Sa rangée se regarde sous
		 * l'entrée « accueil », qui la monte avec ses deux régimes. La reprendre ici
		 * ferait deux jeux de démonstration pour le même composant, et ils
		 * divergeraient au premier ajout.
		 */
		travaux: [],
		verrous: [],
		ligneOuverte,
		onOuvrirLigne: (id) => setLigneOuverte(id === ligneOuverte ? null : id),
		onFermerLigne: () => setLigneOuverte(null),
		onFichiers: () => {},
		accepteFichiers: '.csv,.txt,.pdf,image/*'
	};

	/** Le premier jour : aucune facture, donc aucune rangée — et le chemin, pas un cadran à zéro. */
	const vierge: FileAffichee = {
		...garnie,
		tete: {
			total: 0n,
			nombreFactures: 0,
			parts: { principal: 0n, interets: 0n, indemnites: 0n },
			nonChiffrees: [],
			prescriptionSousPreavis: 0n,
			clientsConcernes: 0,
			clientsSousPreavis: 0
		},
		rangees: [],
		clients: [],
		sansIdentifiant: [],
		facturesPortent: FACTURES_PORTENT_VIDE
	};

	const forme = formeDemo(variante, garnie, FORMES_FILE(garnie));

	return <EcranFile donnees={lectureDemo(etat, forme, vierge)} />;
}

/**
 * « ligne ouverte » : la preuve d'une rangée est ouverte d'emblée.
 *
 * ⚠️ C'EST LA VARIANTE QUI MET LA BASCULE À L'ÉPREUVE. On passe en vue Par
 * client avec une ligne ouverte : sa rangée client doit s'ouvrir, défiler à
 * l'écran, et la ligne y être surlignée en teinte neutre. C'est aussi là qu'on
 * vérifie la rangée « la ligne ouverte n'est pas dans cette portée », en
 * changeant de puce.
 */
function FORMES_FILE(garnie: FileAffichee): Readonly<Record<string, FileAffichee>> {
	return {
		'ligne ouverte': { ...garnie, ligneOuverte: 'r-prescription-durand' }
	};
}

export const ECRANS_FILE: readonly EcranDuProduit[] = [
	{
		route: '/app/',
		/**
		 * ⚠️ UNE CLÉ, PARCE QUE L'ACCUEIL TIENT ENCORE `/app/`. La bascule est une
		 * tâche séparée (T15) : les deux écrans visent la même adresse, et sans clé
		 * la file serait injoignable dans la salle. La clé part avec l'accueil.
		 */
		cle: 'file',
		libelle: 'la file',
		vide: true,
		variantes: ['ligne ouverte'],
		Demo: FileDemo
	}
];
