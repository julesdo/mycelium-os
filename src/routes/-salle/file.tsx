import { Button } from '@cladd-ui/react';
import { BuildingIcon, ChevronDownIcon } from 'lucide-react';
import { EcranFile, type FileAffichee, type RangeeDeLaFile } from '../../screens/file';
import { DEPOT_A_ECARTS_DEMO, DEPOT_PARFAIT_DEMO } from './depots';
import { REVELATION_DEMO, REVELATION_SANS_FACTURE_DEMO } from './revelation';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';
import { resumeDuPlafond } from '../../lib/verticales/recouvrement/compagnon/propositions';
import {
	Avatar,
	DeclencheurRecherche,
	VeilleurDeLaToolbar,
	travauxDuVeilleur,
	type TacheVeilleur
} from '../../ui';

/**
 * « AUJOURD'HUI », DANS LA SALLE — et c'est le SEUL endroit où il est monté.
 *
 * ⚠️ LES DONNÉES CHIFFRÉES VIENNENT DU DOMAINE, PAS D'UNE COPIE. La tête lit
 * `REVELATION_DEMO`, calculé par `verticales/recouvrement/revelation.ts` sur les
 * factures de la salle : écrire ici un total à la main en ferait une seconde
 * vérité sur le seul chiffre du produit qui coûte de l'argent réel.
 *
 * ⚠️ ET LA DATE EST FIGÉE. L'écran range ses rangées en trois groupes selon que
 * la date du fait est passée, tombe aujourd'hui, ou vient ; il reçoit ce jour de
 * sa route. Le lire sur l'horloge réelle ferait changer la démonstration de
 * forme selon le jour où on la regarde — et le regard validerait alors une
 * répartition qu'il n'a pas choisie.
 */
const AUJOURDHUI_DEMO = '2026-09-17';

/** Les trois clients, et le troisième n'a pas de numéro au registre. */
const DURAND = 'demo-debiteur-durand';
const MARTIN = 'demo-debiteur-martin';
const BELLIN = 'demo-debiteur-bellin';

/** Les créances vers lesquelles les rangées mènent. Les routes les prennent en paramètre. */
const CREANCE_DURAND = 'demo-creance-durand';
const CREANCE_MARTIN = 'demo-creance-martin';
const CREANCE_BELLIN = 'demo-creance-bellin';

/**
 * LES RANGÉES, ET CHACUNE EST LÀ POUR UNE RAISON.
 *
 * Le jeu couvre les quatre genres de rangée, les TROIS groupes, ET les trois
 * vetos du pli (B9) :
 *
 *   · une échéance de procédure DÉPASSÉE — le seul cas du groupe « En retard »,
 *     et c'est la démonstration qui dit si son accent rouge tient à côté d'une
 *     rangée critique ordinaire ;
 *   · une prescription dont le PLI porte une hypothèse retenue — elle reste
 *     pleine même quand rien n'est à trancher ;
 *   · une facture NON CHIFFRÉE — elle reste pleine, et le total de tête la nomme
 *     déjà au-dessus ;
 *   · un dépôt qui a ÉCARTÉ deux lignes — il reste plein, là où le dépôt parfait
 *     se replie.
 *
 * ⚠️ ET LA QUESTION DE LITIGE Y EST DEUX FOIS, dans ses DEUX états, parce
 * qu'ils ne coexistent plus sur une même rangée : sous une proposition, ce sont
 * ses deux appuis qui tranchent ; sans proposition — le cas ordinaire, et celui
 * où l'on retombe après un écart — ce sont les trois réponses. Une seule des
 * deux en salle laisserait l'autre ne se regarder à aucune largeur.
 */
const RANGEES_DEMO: readonly RangeeDeLaFile[] = [
	{
		genre: 'OBSTACLE',
		id: 'r-echeance-martin',
		debiteur: 'Ateliers Martin',
		destination: { vers: '/app/creance/$id', parametres: { id: CREANCE_MARTIN } },
		obstacle:
			'Signification de l’ordonnance : la date limite du 12 septembre 2026 est dépassée, l’ordonnance est caduque.',
		urgence: 'CRITIQUE',
		montant: 1_845_000n,
		// Passée : c'est elle, et elle seule, qui remplit le groupe « En retard ».
		dateDuFait: '2026-09-12',
		pli: {
			libelle: { un: 'échéance de procédure', plusieurs: 'échéances de procédure' },
			rienATrancher: false
		}
	},
	{
		genre: 'OBSTACLE',
		id: 'r-prescription-durand',
		debiteur: 'Fournitures Durand',
		destination: { vers: '/app/creance/$id', parametres: { id: CREANCE_DURAND } },
		obstacle: 'Prescription dans 41 jours : passé le 27/10/2026, cette créance ne se réclame plus.',
		urgence: 'CRITIQUE',
		montant: 3_120_050n,
		dateDuFait: '2026-10-27',
		/*
		  ⚠️ CRITIQUE ET DATÉE PLUS TARD : elle va dans « Aujourd'hui ». C'est la
		  règle de rangement mise à l'épreuve — une prescription proche est la seule
		  chose que ce produit vend qui fasse perdre un droit sans que personne n'ait
		  rien fait, et l'enterrer sous « à venir » serait la perdre.

		  L'hypothèse retenue est couverte au PLI, juste dessous, qui est l'endroit
		  où B9 la fait compter.
		*/
		pli: {
			libelle: { un: 'prescription proche', plusieurs: 'prescriptions proches' },
			// Rien à trancher, et pourtant elle reste PLEINE : l'hypothèse la retient.
			rienATrancher: true,
			hypothese: 'secteur indéterminé'
		}
	},
	{
		genre: 'LITIGE',
		id: 'r-litige-durand',
		debiteur: 'Fournitures Durand',
		destination: { vers: '/app/creance/$id', parametres: { id: CREANCE_DURAND } },
		question:
			'Ce client vous a-t-il écrit pour contester cette facture : courrier, e-mail, ou réserve portée sur un bon de livraison ?',
		urgence: 'HAUTE',
		montant: 24_990n,
		/*
		  ⚠️ LA PROPOSITION PORTE SES DEUX APPUIS, ET ELLE EST SEULE À LES PORTER.
		  Tant qu'une proposition est affichée, elle EST la question — la retenir
		  vaut y répondre, l'écarter la rouvre. Le champ de motif s'ouvre en place
		  sur « Écarter », et c'est la seule saisie libre de tout l'écran : c'est aux
		  quatre largeurs qu'elle se regarde.
		*/
		proposition: {
			valeur: 'oui',
			source: 'réserve lue sur BL-2024-77, page 1',
			date: '2026-08-14',
			onRetenir: () => {},
			onEcarter: () => {}
		},
		onRepondre: () => {},
		pli: {
			libelle: { un: 'question de litige', plusieurs: 'questions de litige' },
			rienATrancher: false
		}
	},
	{
		genre: 'OBSTACLE',
		id: 'r-decompte-martin',
		debiteur: 'Ateliers Martin',
		destination: { vers: '/app/creance/$id', parametres: { id: CREANCE_MARTIN } },
		obstacle: 'Décompte arrêtable, dont 1 240,33 € d’intérêts courus.',
		urgence: 'HAUTE',
		montant: 1_248_033n,
		/*
		  ⚠️ NI DATE NI PUCE DE DATE : une créance mûre est un ÉTAT, pas une
		  échéance. C'est donc le mot d'urgence qui s'affiche sur sa puce, et c'est
		  le seul cas où il le fait. Sans cette rangée, cette moitié de la règle ne
		  se regarderait à aucune largeur.

		  Et sa proposition est sourcée avec ses deux appuis : c'est la rangée la
		  plus chargée de l'écran — une phrase d'obstacle, un montant, une
		  provenance et deux appuis — donc c'est elle qui dit si la carte tient à
		  375 px.
		*/
		proposition: {
			valeur: 'taux stipulé de 12 %',
			source: 'Pièce du dossier : CG-2024-03, page 4',
			date: '2026-09-17',
			onRetenir: () => {},
			onEcarter: () => {}
		},
		pli: {
			libelle: { un: 'décompte arrêtable', plusieurs: 'décomptes arrêtables' },
			rienATrancher: false
		}
	},
	{
		/*
		  ⚠️ LA MÊME RANGÉE SANS PROPOSITION, ET C'EST LE CAS ORDINAIRE. Le
		  logiciel n'a presque jamais rien lu à proposer : la question se pose alors
		  nue, avec ses trois réponses. C'est aussi l'état où retombe la rangée
		  ci-dessus dès qu'on écarte sa proposition.

		  Sans cette seconde rangée, l'état le plus fréquent ne se regarderait à
		  aucune largeur : trois boutons de 48 px sur une ligne, c'est à 375 px que
		  ça se vérifie.
		*/
		genre: 'LITIGE',
		id: 'r-litige-bellin',
		debiteur: 'Transports Bellin',
		destination: { vers: '/app/creance/$id', parametres: { id: CREANCE_BELLIN } },
		question:
			'Cette facture a-t-elle été émise entre professionnels, dans le cadre de votre activité et de la sienne ?',
		urgence: 'NORMALE',
		montant: 486_200n,
		onRepondre: () => {},
		pli: {
			libelle: { un: 'question de litige', plusieurs: 'questions de litige' },
			rienATrancher: false
		}
	},
	{
		/*
		  ⚠️ UNE RANGÉE QUI MÈNE À UN CLIENT, ET PAS À UNE CRÉANCE. Une santé
		  dégradée au registre vise un DÉBITEUR : sous le volet de preuve, qui était
		  par créance, elle n'était pas ouvrable du tout. Sa page existe maintenant,
		  et c'est le gain de la bascule qu'on vient regarder ici.
		*/
		genre: 'OBSTACLE',
		id: 'r-degrade-bellin',
		debiteur: 'Transports Bellin',
		destination: { vers: '/app/debiteurs/$id', parametres: { id: BELLIN } },
		obstacle:
			'Une procédure collective est annoncée au registre contre ce client depuis le dernier passage du radar.',
		urgence: 'HAUTE',
		montant: 412_000n,
		pli: {
			libelle: {
				un: 'client dégradé au registre',
				plusieurs: 'clients dégradés au registre'
			},
			rienATrancher: false
		}
	},
	{
		genre: 'OBSTACLE',
		id: 'r-non-chiffree-bellin',
		debiteur: 'Transports Bellin',
		destination: { vers: '/app/debiteurs/$id', parametres: { id: BELLIN } },
		obstacle:
			'Date d’exigibilité inexploitable sur F-2024-114 : le retard ne peut pas être établi.',
		urgence: 'NORMALE',
		montant: null,
		pli: {
			libelle: { un: 'facture non chiffrée', plusieurs: 'factures non chiffrées' },
			// Rien à trancher au sens strict, et pourtant elle reste PLEINE.
			rienATrancher: true,
			nonChiffree: true
		}
	},
	{
		/*
		  ⚠️ UNE SEULE RANGÉE POUR L'ÉTABLISSEMENT, ET SON CLIENT SE CHOISIT.
		  `ui/lettrage.tsx` se rend replié, en une ligne « Rapprocher un virement » :
		  une rangée par client donnerait quarante lignes identiques que rien ne
		  distingue sans les ouvrir. Et le produit n'a AUCUNE source qui dise de qui
		  vient un virement — un règlement que l'import ne sait rattacher est compté
		  puis jeté — donc la liste des clients est fermée par le logiciel et le
		  gérant ne confirme que lequel.
		*/
		genre: 'LETTRAGE',
		id: 'r-lettrage',
		debiteur: 'Rapprocher un virement',
		lettrage: {
			proposition: null,
			enCours: false,
			erreur: null,
			onChercher: () => {},
			onAppliquer: () => {},
			debiteurs: [
				{
					id: DURAND,
					denomination: 'Fournitures Durand',
					facturesOuvertes: 3,
					encours: 3_120_050n
				},
				{ id: MARTIN, denomination: 'Ateliers Martin', facturesOuvertes: 6, encours: 1_845_000n },
				{ id: BELLIN, denomination: 'Transports Bellin', facturesOuvertes: 1, encours: 24_990n }
			],
			debiteurChoisi: null,
			onDebiteur: () => {}
		},
		pli: {
			libelle: { un: 'rapprochement possible', plusieurs: 'rapprochements possibles' },
			rienATrancher: false
		}
	},
	{
		genre: 'DEPOT',
		id: 'r-depot-ecarts',
		debiteur: 'Dépôt du 09/09',
		depot: DEPOT_A_ECARTS_DEMO,
		pli: {
			libelle: { un: 'dépôt terminé', plusieurs: 'dépôts terminés' },
			// Rien à trancher, et pourtant il reste PLEIN : deux lignes écartées.
			rienATrancher: true,
			lignesEcartees: 2
		}
	},
	{
		genre: 'DEPOT',
		id: 'r-depot-parfait',
		debiteur: 'Dépôt du 08/09',
		depot: DEPOT_PARFAIT_DEMO,
		// Rien d'écarté : c'est le SEUL dépôt qui a le droit de se replier.
		pli: {
			libelle: {
				un: 'dépôt terminé sans rien d’écarté',
				plusieurs: 'dépôts terminés sans rien d’écarté'
			},
			rienATrancher: true,
			lignesEcartees: 0
		}
	},
	...Array.from({ length: 142 }, (_, rang): RangeeDeLaFile => {
		const numero = `${rang + 1}`.padStart(3, '0');
		return {
			genre: 'OBSTACLE',
			id: `r-payee-${numero}`,
			debiteur: 'Fournitures Durand',
			destination: { vers: '/app/debiteurs/$id', parametres: { id: DURAND } },
			obstacle: `La facture FA-2026-1${numero} a été payée dans les délais.`,
			urgence: 'NORMALE',
			montant: null,
			pli: {
				libelle: {
					un: 'facture payée dans les délais',
					plusieurs: 'factures payées dans les délais'
				},
				rienATrancher: true
			}
		};
	})
];

/**
 * CE QUE LE LOGICIEL A SUPPOSÉ, ET CE QU'IL NE SURVEILLE PAS.
 *
 * ⚠️ UNE HYPOTHÈSE N'EST PAS UN ANGLE MORT. Celle-ci se LÈVE — en précisant le
 * secteur du client — alors qu'aucun des deux angles morts ci-dessous ne se lève
 * depuis l'interface. Les regarder l'un sous l'autre est la seule façon de
 * vérifier que les deux blocs ne se ressemblent pas.
 */
const HYPOTHESES_DEMO: readonly string[] = [
	'Le secteur d’Ateliers Martin n’est pas déterminé : la prescription est calculée sur le délai le plus court. Préciser le secteur lèvera cette hypothèse.'
];

const ANGLES_MORTS_DEMO: readonly string[] = [
	'Un délai d’opposition court depuis la signification de l’ordonnance d’Ateliers Martin. Sa durée n’est pas relevée dans le référentiel juridique de ce logiciel : cette échéance-là n’est pas surveillée, et reste à vérifier auprès de l’acte signifié, qui la porte.',
	// ⚠️ UN, PARCE QU'IL Y EN A UN. La salle porte un seul débiteur sans
	// identifiant ; en annoncer deux ferait mentir la démonstration sur le
	// chiffre exact qu'on vient y vérifier.
	'Un débiteur n’a aucun numéro au registre : sa solvabilité n’est pas interrogée, et une procédure collective ouverte contre lui passerait inaperçue.'
];

/**
 * LE TRAVAIL DE FOND, COMPOSÉ PAR LA FONCTION DE PRODUCTION.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL ÉTAIT VIDE, ET SON BLOC NE SE REGARDAIT DONC NULLE PART
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La démonstration passait `travaux: []`, en renvoyant à « l'entrée accueil, qui
 * la monte avec ses deux régimes ». Cette entrée est morte avec l'accueil, et
 * `Veilleur` rend `null` sur une liste vide : le bloc n'apparaissait donc à
 * AUCUNE largeur, dans aucune entrée de la salle — alors que la production le
 * monte sur cet écran-ci, tous les jours. C'est le défaut que la salle existe
 * pour attraper, et elle l'a laissé passer parce qu'on l'avait renvoyé ailleurs.
 *
 * ⚠️ ET C'EST `travauxDuVeilleur` QUI LE COMPOSE, pas une liste écrite à la
 * main. Elle décide de l'ordre, des libellés et des états à partir du relevé de
 * la nuit et des dépôts en machine : une copie ici dériverait de la vraie au
 * premier ajout, et on regarderait un bloc que personne ne verra.
 *
 * Le jeu couvre les trois choses qui coexistent un matin ordinaire : un dépôt
 * qui TOURNE (la seule ligne qui bouge sous les yeux), le relevé de la nuit, et
 * une trouvaille non lue — rare par construction, parce que seul ce qui fait
 * perdre un droit sans qu'on ait rien fait en produit une.
 */
const TRAVAUX_DEMO: readonly TacheVeilleur[] = travauxDuVeilleur({
	battement: {
		jour: AUJOURDHUI_DEMO,
		statut: 'PARLE',
		raison:
			'198 factures lues, 17 créances entrent dans la surveillance, 1 prescription passe sous le préavis.',
		// Un horodatage figé : l'heure affichée ne doit pas changer selon le
		// moment où l'on regarde la salle.
		termineLe: Date.UTC(2026, 8, 17, 3, 12)
	},
	depotsEnCours: [{ id: 'depot-en-machine', filename: 'FEC-2026-T3.txt', etape: 'Extraction' }],
	trouvailles: [
		{
			id: 'trouvaille-durand',
			titre: 'Prescription sous 41 jours',
			message:
				'Fournitures Durand : passé le 27/10/2026, 31 200,50 € ne se réclament plus.',
			lien: '/app/creance/demo-creance-durand'
		}
	],
	onLire: () => {},
	aujourdHui: AUJOURDHUI_DEMO
});

/**
 * LES QUATRE SURFACES DE LA RANGÉE DU HAUT, SANS CONVEX.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SANS ELLES, ON REGARDE UNE RANGÉE QUE PERSONNE NE VERRA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'avatar, le veilleur, le sélecteur d'établissement et la palette de
 * recherche INTERROGENT Convex : montés dans la salle, `Facultatif` les avale et
 * la rangée se rend vide. On regarderait alors une rangée à un élément alors que
 * le gérant en voit cinq, et son pire défaut — le passage à la ligne à 375 px —
 * ne se verrait jamais.
 *
 * Les trois premiers sont donc les VRAIES primitives de `src/ui/`, montées avec
 * des données de démonstration ; seul le sélecteur d'établissement est approché,
 * parce que son dessin vit dans `src/app/` avec sa requête. Ce qu'on vérifie ici
 * est la géométrie de la rangée, et sa pastille a la même.
 */
const RANGEE_DU_HAUT_DEMO = {
	avatar: <Avatar nom="Camille Doré" />,
	// Deux non lues : la pastille rare, et le seul signal du produit qui annonce
	// une perte sèche. À zéro, on ne verrait pas qu'elle tient dans la rangée.
	veilleur: <VeilleurDeLaToolbar etat="VEILLE" nonLues={2} />,
	/*
	  ⚠️ LA MÊME GÉOMÉTRIE QUE LA PRODUCTION, AU PIXEL. `app/selecteur-etablissement.tsx`
	  rend un `Button rounded` à `min-w-cladd-md` portant la pastille ET un chevron :
	  68 px. La salle l'approchait par une `Chip` de 26 px, et on y mesurait donc une
	  rangée 42 px plus courte que celle du gérant — c'est-à-dire qu'on validait au
	  regard un passage à la ligne qui ne tombait pas au même endroit.
	*/
	selecteur: (
		<Button rounded className="min-w-cladd-md shrink-0" aria-label="Établissement : Boulangerie Doré">
			<BuildingIcon />
			<ChevronDownIcon />
		</Button>
	),
	palette: <DeclencheurRecherche onOuvrir={() => {}} />
};

const GARNIE: FileAffichee = {
	aujourdHui: AUJOURDHUI_DEMO,
	tete: {
		total: REVELATION_DEMO.total,
		nombreFactures: REVELATION_DEMO.nombreFactures,
		parts: {
			principal: REVELATION_DEMO.principal,
			interets: REVELATION_DEMO.interets,
			indemnites: REVELATION_DEMO.indemnites
		},
		nonChiffrees: REVELATION_DEMO.nonChiffrees,
		prescriptionSousPreavis: 3_120_050n
	},
	rangees: RANGEES_DEMO,
	travaux: TRAVAUX_DEMO,
	hypotheses: HYPOTHESES_DEMO,
	anglesMorts: ANGLES_MORTS_DEMO,
	/**
	 * ⚠️ IL ANNONCE, IL NE PORTE AUCUN CHIFFRE ÉCARTÉ. « 2 illisibles » et « 3
	 * déjà connues » vivent sur la rangée datée du dépôt, qui ne se referme pas :
	 * un bandeau qui serait leur seul support les ferait disparaître d'un geste de
	 * fermeture, et l'omission porterait sur l'argent qu'on ne réclamera pas.
	 */
	annonce: '198 factures lues cette nuit, 17 créances entrent dans la surveillance.',
	/*
	  ⚠️ LE RESTE EST COMPTÉ ET NOMMÉ, JAMAIS TRONQUÉ (D13). Sept par jour et par
	  établissement ; ce qui dépasse se dit, sur cette ligne, et la phrase vient du
	  domaine — `resumeDuPlafond()` — pour qu'on regarde ici le texte exact que le
	  produit rendra.
	*/
	resumeDuPlafond: resumeDuPlafond(7, 12),
	verrous: [],
	onFichiers: () => {},
	accepteFichiers: '.csv,.txt,.pdf,image/*',
	...RANGEE_DU_HAUT_DEMO
};

/** Le premier jour : aucune facture, donc aucune rangée — et le chemin, pas un cadran à zéro. */
const VIERGE: FileAffichee = {
	...GARNIE,
	tete: {
		total: 0n,
		nombreFactures: 0,
		parts: { principal: 0n, interets: 0n, indemnites: 0n },
		nonChiffrees: [],
		prescriptionSousPreavis: 0n
	},
	rangees: [],
	hypotheses: [],
	anglesMorts: []
};

/**
 * « rien à trancher » : des factures, un total, et aucune rangée.
 *
 * ⚠️ CE N'EST PAS L'ÉTAT VIDE, et les confondre serait le pire des deux. Le
 * premier jour n'a rien à compter et montre le chemin en grand ; celui-ci a tout
 * compté et n'a rien trouvé à trancher — le total est là, les hypothèses aussi,
 * et c'est le seul état où AUCUN groupe ne se rend. Sans lui, on ne verrait
 * jamais ce que l'écran dit un bon jour.
 */
const RIEN_A_TRANCHER: FileAffichee = {
	...GARNIE,
	rangees: RANGEES_DEMO.filter((r) => r.genre === 'DEPOT' || r.genre === 'LETTRAGE'),
	annonce: undefined,
	resumeDuPlafond: null
};

const FORMES_FILE: Readonly<Record<string, FileAffichee>> = {
	'rien à trancher': RIEN_A_TRANCHER
};

function FileDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	return (
		<EcranFile donnees={lectureDemo(etat, formeDemo(variante, GARNIE, FORMES_FILE), VIERGE)} />
	);
}

export const ECRANS_FILE: readonly EcranDuProduit[] = [
	{
		route: '/app/',
		libelle: 'aujourd’hui',
		vide: true,
		variantes: Object.keys(FORMES_FILE),
		Demo: FileDemo
	}
];
