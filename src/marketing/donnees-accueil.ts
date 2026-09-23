import type { FileAffichee, RangeeDeLaFile } from '../screens/file';
import type { TacheVeilleur } from '../ui';

/**
 * L'ÉCRAN D'ACCUEIL DU PRODUIT, EN DONNÉES DE DÉMONSTRATION.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ C'EST LE VRAI ÉCRAN, PAS UNE RECONSTITUTION — ET C'EST TOUT L'ENJEU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le premier écran du site montrait jusqu'ici une COMPOSITION : une barre
 * rejouée, un titre écrit à la main, et le seul composant réel était le flux
 * d'événements. Un visiteur voyait donc un écran qui n'existe nulle part dans
 * le produit — et il s'en apercevrait le jour de l'inscription, c'est-à-dire au
 * pire moment possible.
 *
 * Ce fichier alimente `EcranFile`, le composant que `/app` monte réellement.
 * La tête, les groupes par échéance, les rangées, le pli, le veilleur, les
 * hypothèses et les angles morts sont ceux du produit. Rien n'est redessiné :
 * seules les données sont fausses.
 *
 * ⚠️ ET ELLES SONT FAUSSES, PAS APPROXIMATIVES. Sur une page dont l'argument
 * entier est l'exactitude d'un décompte, un jeu de démonstration dont les
 * totaux ne tombent pas juste est une faute — un visiteur qui additionne les
 * trois parts et ne retrouve pas le total a toutes les raisons de douter du
 * reste. Les parts se somment donc au centime :
 *
 *   principal    54 210,00 €
 *   + intérêts    4 690,40 €
 *   + indemnités    440,00 €   (11 factures × 40 €)
 *   = total      59 340,40 €
 *
 * ⚠️ LA DATE EST FIGÉE, ET L'ÉCRAN N'EN LIT AUCUNE AUTRE. `EcranFile` range ses
 * rangées en trois groupes selon que la date du fait est passée, tombe
 * aujourd'hui ou vient. La lire sur l'horloge réelle ferait changer la page
 * d'accueil de forme selon le jour où on l'ouvre — et une démonstration qui
 * bouge toute seule ne se vérifie jamais.
 *
 * ⚠️ LE CAS LE PLUS DUR EST MONTRÉ EN PREMIER, et il est mauvais : une facture
 * DÉJÀ prescrite, c'est-à-dire de l'argent définitivement perdu. Un écran où
 * tout va bien vendrait le produit sur un mensonge et ne dirait rien de ce
 * qu'il sert à faire — c'est précisément ce qu'il repère qu'on vient voir.
 */

/** Le jour de la démonstration. Voir l'en-tête : il ne se lit sur aucune horloge. */
const AUJOURDHUI = '2026-09-23';

/**
 * ⚠️ AUCUN GESTE N'ABOUTIT, ET C'EST VOULU. L'aperçu est une IMAGE du produit :
 * le cadre porte `inert`, donc rien n'est cliquable ni atteignable au clavier.
 * Ces fonctions existent parce que le type les exige, pas parce qu'un visiteur
 * pourrait les déclencher.
 */
const SANS_EFFET = () => {};

const RANGEES: readonly RangeeDeLaFile[] = [
	{
		genre: 'OBSTACLE',
		id: 'demo-prescription-bellin',
		debiteur: 'Bellin & Fils',
		obstacle: 'La facture FA-2021-0087 est prescrite depuis le 14 août 2026.',
		urgence: 'CRITIQUE',
		montant: 924_000n,
		// Passée : elle tombe dans le groupe « En retard », en tête d'écran.
		dateDuFait: '2026-08-14',
		pli: {
			libelle: { un: '1 prescription acquise', plusieurs: '2 prescriptions acquises' },
			rienATrancher: false
		}
	},
	{
		genre: 'OBSTACLE',
		id: 'demo-echeance-martin',
		debiteur: 'Ateliers Martin',
		// ⚠️ LA PERTE SE DIT, L'ACTE NE SE COMMANDE PAS. « Faire signifier sans
		// délai » serait un impératif sur un acte de procédure, c'est-à-dire du
		// conseil juridique sur la page la plus lue du site. Le constat reste
		// entier ; le geste reste celui du gérant.
		obstacle:
			'Signification de l’ordonnance : il reste 9 jours avant le 2 octobre. Passée cette date, ' +
			'le droit est perdu et 18 450,00 € cessent d’être couverts.',
		urgence: 'CRITIQUE',
		montant: 1_845_000n,
		dateDuFait: '2026-10-02',
		pli: {
			libelle: { un: '1 échéance de procédure', plusieurs: '2 échéances de procédure' },
			rienATrancher: false
		}
	},
	{
		genre: 'LITIGE',
		id: 'demo-litige-durand',
		debiteur: 'Fournitures Durand',
		question: 'La facture FA-2026-0142 a-t-elle été contestée par écrit ?',
		urgence: 'HAUTE',
		montant: 3_120_050n,
		onRepondre: SANS_EFFET,
		pli: {
			libelle: { un: '1 question ouverte', plusieurs: '2 questions ouvertes' },
			rienATrancher: false
		}
	}
];

/**
 * LE TRAVAIL DE FOND, TEL QUE LE VEILLEUR LE RAPPORTE.
 *
 * Il dit ce que la machine a fait pendant que le gérant était ailleurs — c'est
 * la seule chose qui justifie un abonnement mensuel pour une obligation qu'on
 * ne traite que deux fois par an. `dit` porte le raisonnement exact de la nuit,
 * jamais une reformulation.
 */
const TRAVAUX: readonly TacheVeilleur[] = [
	{
		cle: 'demo-registre',
		titre: 'Veille au registre',
		dit: '47 débiteurs relevés au BODACC cette nuit. Aucune procédure collective ouverte.',
		quand: '2026-09-23T04:12:00.000Z',
		etat: 'TOURNE'
	},
	{
		cle: 'demo-prescription',
		titre: 'Prescription',
		dit: '312 factures repassées. 2 entrent dans le préavis de prescription.',
		quand: '2026-09-23T04:14:00.000Z',
		etat: 'TOURNE'
	}
];

export const ACCUEIL_DEMO: FileAffichee = {
	aujourdHui: AUJOURDHUI,
	tete: {
		total: 5_934_040n,
		nombreFactures: 312,
		parts: {
			principal: 5_421_000n,
			interets: 469_040n,
			indemnites: 44_000n
		},
		/**
		 * ⚠️ CE QUE LE CALCUL N'A PAS SU CHIFFRER S'AFFICHE AUSSI, ET C'EST LA
		 * RÈGLE DU PRODUIT : « un total silencieusement amputé est pire qu'un
		 * total incomplet annoncé », parce que le premier se croit exact. Un
		 * aperçu qui passerait un tableau vide montrerait un logiciel qui ne rate
		 * jamais rien — c'est-à-dire la promesse qu'on refuse de faire.
		 */
		nonChiffrees: [
			{ reference: 'FA-2026-0218', raison: 'Date d’échéance absente de l’export comptable.' }
		],
		prescriptionSousPreavis: 1_284_000n
	},
	rangees: RANGEES,
	travaux: TRAVAUX,
	hypotheses: [
		'Secteur indéterminé pour 3 débiteurs : le délai de prescription le plus court est retenu.'
	],
	anglesMorts: [
		'Les factures antérieures à votre premier import ne sont pas surveillées.',
		'Un règlement encaissé hors banque connectée n’est pas rapproché.'
	],
	/** `null` veut dire « on ne sait pas », jamais « rien en attente ». */
	resumeDuPlafond: null,
	verrous: [],
	onFichiers: SANS_EFFET,
	accepteFichiers: '.csv,.xlsx,.pdf,.xml'
};
