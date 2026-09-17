import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
	Segmented,
	SegmentedButton,
	Toolbar,
	ToolbarButton,
	ToolbarSeparator
} from '@cladd-ui/react';
import { ChevronDownIcon, ChevronRightIcon, InfoIcon, UploadIcon } from 'lucide-react';
import { usePreference } from '../app/use-preference';
import { PREAVIS } from '../lib/verticales/recouvrement/surveillance';
import {
	Bandeau,
	BilanImport,
	BilanPertes,
	BoutonPrincipal,
	BoutonSecondaire,
	CeQuiManque,
	ChiffreHero,
	ChocRevelation,
	ChoixSecteur,
	CompositionDue,
	FacturesNonChiffrees,
	HabitudePaiement,
	Lettrage,
	PageEcran,
	PliDeLaFile,
	PorteDeTransition,
	RangeeFile,
	RechercheRegistre,
	SectionEcran,
	SourceDeRangees,
	Veilleur,
	ZoneDepot,
	eurosCentimes,
	pluriel,
	trierSelonLePli,
	type BilanPertesAffiche,
	type DepotAffiche,
	type EtablissementPropose,
	type EtatRecherche,
	type FaitsDuPli,
	type HabitudeAffichee,
	type Lecture,
	type OptionSecteur,
	type PartsDues,
	type PropositionDeRangee,
	type RevelationAffichee,
	type RuptureAffichee,
	type TacheVeilleur,
	type UrgenceRangee,
	type Verrou
} from '../ui';

/**
 * LA FILE — l'unique écran de travail, et ce qui remplace vingt-sept adresses.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE EST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Ce qui compte aujourd'hui », trié par `surveillance.ts`, l'échéance la plus
 * proche d'abord, la prescription en tête. C'est le tri par DÉFAUT, donc la
 * prescription passe de zéro écran sur vingt-sept à l'écran d'ouverture — et
 * c'est la seule des trois choses qu'on vend qui fasse perdre un droit sans que
 * personne n'ait rien fait.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUN APPEL MODÈLE, ET C'EST UNE RÈGLE DE DISPONIBILITÉ (D4, B1)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une seule route de travail est un seul point de panne. Un quota épuisé, une
 * action Convex tombée ou un radar de registre muet ne doivent pas rendre le
 * produit inutilisable : la file se rend ENTIÈREMENT sans modèle, et chaque
 * source de rangées est isolée par `SourceDeRangees`, qui laisse les autres
 * rangées à l'écran et NOMME celle qui manque. Jamais un écran blanc, jamais
 * une absence muette.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE COMPOSANT NE SAIT PAS INTERROGER CONVEX, ET C'EST VOULU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La route lui passe des données, la salle d'exposition lui en passe d'autres.
 * C'est ce qui permet de le VOIR aux quatre largeurs de référence sans backend
 * ni authentification. Les deux surfaces que seule l'application peut composer —
 * le sélecteur d'établissement et la palette de recherche — arrivent en
 * `ReactNode` : elles se réhébergent dans la `Toolbar` à la bascule (T15), et
 * l'écran ne fait que leur garder leur place.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE VOLET DE PREUVE EST UN ÉTAT, PAS UNE ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Taper une rangée pose `?ligne=<id>` dans l'adresse. L'écran ne navigue pas
 * lui-même — il reçoit `ligneOuverte`, `onOuvrirLigne` et `onFermerLigne`,
 * comme les débiteurs reçoivent leur `?d=` — et `preuve` est le volet que T8
 * écrit. Tant qu'il n'est pas branché, la file se rend en colonne.
 */

// ─────────────────────────────────────────────────────────────────────────
// LA VUE
// ─────────────────────────────────────────────────────────────────────────

/**
 * Par créance, ou par client (D9).
 *
 * ⚠️ UNE VUE GROUPE, UNE PORTÉE FILTRE, et la distinction est opposable : le
 * compte d'une puce de portée ne change pas quand on bascule, puisque ce sont
 * les mêmes rangées. Les deux se composent, et aucune adresse n'est ajoutée.
 */
export type VueFile = 'CREANCE' | 'CLIENT';

const VUES: readonly VueFile[] = ['CREANCE', 'CLIENT'];

/**
 * ⚠️ UNE PRÉFÉRENCE DE NAVIGATEUR, PAS UNE DONNÉE CLIENT. Elle ne porte aucun
 * `organizationId`, ne vit pas en base, et `purge-complete.test.ts` ne la
 * réclame donc pas. Corollaire : changer d'établissement rejoue la file entière
 * et ne remet PAS la vue à zéro — la vue dit comment ce gérant pense,
 * l'établissement dit ce qu'il lit.
 *
 * La clé suit la graphie du même magasin : `use-theme.ts` y pose déjà
 * `letikette-theme`.
 */
export const CLE_VUE_FILE = 'letikette-file-vue';

// ─────────────────────────────────────────────────────────────────────────
// LES PORTÉES
// ─────────────────────────────────────────────────────────────────────────

export type ClePortee =
	| 'AUJOURDHUI'
	| 'PRESCRIPTION'
	| 'A_TRANCHER'
	| 'DECOMPTES'
	| 'ENGAGES'
	| 'CONSEIL'
	| 'REVELATION'
	| 'TOUT';

/**
 * ⚠️ LA PUCE « DÉBITEURS » N'EST PAS DANS CETTE LISTE, ET C'EST D9 QUI L'EMPORTE.
 * Elle était une portée qui faisait en réalité un GROUPEMENT, c'est-à-dire la
 * vue Par client déguisée en filtre. Deux mécanismes pour la même chose auraient
 * divergé au premier ajout ; ce qu'elle portait est le `Segmented` de la
 * `Toolbar`, qui s'applique à TOUTES les portées au lieu d'être l'une d'elles.
 */
const LIBELLE_PORTEE: Record<ClePortee, string> = {
	AUJOURDHUI: 'Aujourd’hui',
	PRESCRIPTION: 'Prescription',
	A_TRANCHER: 'À trancher',
	DECOMPTES: 'Décomptes',
	ENGAGES: 'Engagés',
	CONSEIL: 'Chez le conseil',
	REVELATION: 'Ce que vos factures portent',
	TOUT: 'Tout'
};

const ORDRE_PORTEES: readonly ClePortee[] = [
	'AUJOURDHUI',
	'PRESCRIPTION',
	'A_TRANCHER',
	'DECOMPTES',
	'ENGAGES',
	'CONSEIL',
	'REVELATION',
	'TOUT'
];

// ─────────────────────────────────────────────────────────────────────────
// LES RANGÉES
// ─────────────────────────────────────────────────────────────────────────

/** Ce que toute rangée porte, quel que soit son genre. */
interface CommunDeRangee {
	/** Ce que `?ligne=` porte. C'est lui qui ouvre le volet de preuve. */
	readonly id: string;
	/** Le client de cette rangée, pour que la vue Par client la range. `null` si inconnu. */
	readonly debiteurId: string | null;
	/** Le débiteur, en titre. */
	readonly debiteur: string;
	/** Les portées qui la laissent passer. `TOUT` est ajouté par l'écran. */
	readonly portees: readonly ClePortee[];
	/**
	 * VRAI QUAND `?ligne=<id>` MÈNE À UNE PREUVE. Absent, il vaut vrai.
	 *
	 * ⚠️ LE VOLET EST PAR CRÉANCE, ET TOUTE RANGÉE N'EN PORTE PAS UNE. Une
	 * dégradation au registre et une rupture d'habitude visent un CLIENT ; si ce
	 * client n'a encore aucune créance constituée, il n'y a pas de dossier à
	 * ouvrir. La rangée s'affiche alors sans être tapable — et n'en a pas l'air —
	 * plutôt que d'ouvrir un volet qui dirait « ce dossier ne s'est pas lu », ce
	 * qui serait faux : il n'existe pas.
	 */
	readonly ouvrable?: boolean;
	/** Ce qu'elle dit d'elle-même au pli. Voir `FaitsDuPli` : B9 s'y tient. */
	readonly pli: FaitsDuPli;
}

/**
 * UN OBSTACLE, ET SON VERBE.
 *
 * ⚠️ LE VERBE NE CONFIRME QU'UNE CHOSE (D6). « 3 factures, 31 200,50 €, la
 * facture a-t-elle été contestée ? » plus Oui / Non fait emporter par un tap
 * unique la COMPOSITION de la créance, la RÉPONSE de litige et par ricochet la
 * qualité de commerçant. C'est un lot sur une qualification juridique, et la
 * piste d'audit qu'il produit ne distingue plus ce que le gérant a confirmé de
 * ce qu'il a subi. La composition et le litige sont donc DEUX rangées.
 */
export interface RangeeObstacle extends CommunDeRangee {
	readonly genre: 'OBSTACLE';
	/** L'obstacle en UNE phrase au singulier. */
	readonly obstacle: string;
	readonly urgence: UrgenceRangee;
	readonly montant: bigint | null;
	readonly dateDuFait?: string;
	/** L'hypothèse retenue. Affichée sur la rangée, jamais repliée (B9). */
	readonly hypothese?: string;
	readonly proposition?: PropositionDeRangee;
	/** Le verbe. Son libellé nomme ce qu'il confirme, et rien d'autre. */
	readonly verbe?: { readonly libelle: string; readonly onPresser: () => void };
}

/**
 * UNE QUESTION DE LITIGE, ET SA PROPOSITION SOUS ELLE.
 *
 * ⚠️ « JE NE SAIS PAS » EST UNE VRAIE RÉPONSE, au même rang que les deux autres.
 * Elle laisse le critère ouvert, ce qui est l'issue juste : `lireLitige()` traite
 * `INCONNU` comme une abstention, et le doute ne profite jamais au produit. Une
 * proposition non confirmée retombe sur `unknown`, jamais sur `ok`.
 */
export interface RangeeLitige extends CommunDeRangee {
	readonly genre: 'LITIGE';
	readonly question: string;
	readonly urgence: UrgenceRangee;
	readonly montant: bigint | null;
	readonly proposition?: PropositionDeRangee;
	readonly onRepondre: (reponse: 'OUI' | 'NON' | 'INCONNU') => void;
	readonly enCours?: boolean;
}

/**
 * LE RAPPROCHEMENT D'UN RÈGLEMENT, à deux boutons de même poids.
 *
 * ⚠️ C'EST LE SEUL LOT LÉGITIME DE D6 : homogène, réversible, non engageant.
 * La proposition AUTOMATIQUE, elle, n'a pas de source — un règlement orphelin
 * est compté puis JETÉ à l'import — donc la surface reste MANUELLE, et elle
 * reste : sans elle, on relance un client qui a déjà payé, la pire erreur d'un
 * logiciel de recouvrement.
 */
export interface RangeeLettrage extends CommunDeRangee {
	readonly genre: 'LETTRAGE';
	readonly lettrage: React.ComponentProps<typeof Lettrage>;
}

/**
 * UN DÉPÔT, EN COURS OU TERMINÉ — et il reste une rangée DATÉE, jamais un
 * bandeau refermable.
 *
 * ⚠️ `ui/bilan-import.tsx` porte la règle mot pour mot : « un import qui annonce
 * 198 factures sans mentionner les deux lignes écartées ment par omission, et
 * l'omission porte sur l'argent qu'on ne réclamera pas ». Un bandeau donnerait à
 * ces cinq chiffres une durée de vie d'un geste. La rangée se replie le jour où
 * RIEN n'a été écarté ; dès qu'une ligne l'a été, elle reste pleine (B9).
 */
export interface RangeeDepot extends CommunDeRangee {
	readonly genre: 'DEPOT';
	readonly depot: DepotAffiche;
}

export type RangeeDeLaFile = RangeeObstacle | RangeeLitige | RangeeLettrage | RangeeDepot;

// ─────────────────────────────────────────────────────────────────────────
// LA TÊTE
// ─────────────────────────────────────────────────────────────────────────

/**
 * EN TÊTE, DEUX NOMBRES ET PAS QUATRE.
 *
 * ⚠️ LE PREMIER SORT DE `revelation.total`, JAMAIS DE `montantIdentifie`. Les
 * deux comptent les mêmes factures et rendent deux nombres différents :
 * `montantIdentifie` est le principal TTC des seules factures échues, hors
 * intérêts et hors indemnité forfaitaire. Sur un produit dont l'argument entier
 * est l'exactitude au centime, poser le second sous le libellé « ce qu'on vous
 * doit » serait un chiffre juste sous une étiquette fausse.
 */
export interface TeteDeFile {
	/** `revelation.total` : principal, intérêts et indemnités compris. */
	readonly total: bigint;
	readonly nombreFactures: number;
	/** Les TROIS parts, jamais quatre : `supplement` est déjà la somme des deux dernières. */
	readonly parts: PartsDues;
	/**
	 * CE QUE LE CALCUL N'A PAS SU CHIFFRER, avec sa raison en toutes lettres.
	 *
	 * ⚠️ AFFICHÉ SOUS LES DEUX NOMBRES, TOUJOURS VISIBLE, JAMAIS REPLIÉ. C'est la
	 * règle d'amputation de `verticales/recouvrement/revelation.ts` : « un total
	 * silencieusement amputé est pire qu'un total incomplet annoncé », parce que
	 * le premier se croit exact.
	 */
	readonly nonChiffrees: readonly { readonly reference: string; readonly raison: string }[];
	/** Vue Par créance : ce dont la prescription tombe sous le préavis, en euros. */
	readonly prescriptionSousPreavis: bigint;
	/** Vue Par client : sur combien de clients, et combien portent une échéance sous le préavis. */
	readonly clientsConcernes: number;
	readonly clientsSousPreavis: number;
}

// ─────────────────────────────────────────────────────────────────────────
// LA VUE PAR CLIENT
// ─────────────────────────────────────────────────────────────────────────

/** Ce qu'un décompte en cours laisserait dehors, au sens de `controle.ts`. */
export interface PortefeuilleDuClient {
	readonly facturesConnues: number;
	readonly auDecompte: number;
	/** Ce qui serait hors décompte. Le titre exécutoire ne porte que ce qu'il chiffre. */
	readonly horsDecompte: bigint;
}

export interface RangeeClient {
	readonly debiteurId: string;
	/** La dénomination retenue, ou le libellé brut quand le SIREN n'est pas confirmé. */
	readonly denomination: string;
	/** Faux : la rangée le DIT, et ne fait pas passer un libellé brut pour un nom retenu. */
	readonly identifiantConfirme: boolean;
	readonly encours: bigint;
	readonly parts: PartsDues;
	/** L'échéance la plus proche parmi ses lignes, nommée avec son fait et sa date. */
	readonly prochaineEcheance: { readonly fait: string; readonly date: string } | null;
	/** Vrai si cette échéance tombe sous le préavis de prescription. */
	readonly sousPreavis: boolean;
	/** Le compte de ses obstacles, TYPÉ : « 3 à trancher », « 1 décompte arrêtable ». */
	readonly obstacles: readonly { readonly libelle: string; readonly compte: number }[];
	/**
	 * SON HABITUDE DE PAIEMENT, ET SA RUPTURE.
	 *
	 * ⚠️ C'EST LE CAS QUI PROUVE LA NÉCESSITÉ DE LA VUE. Une rupture d'habitude
	 * n'a PAS d'échéance : elle ne peut pas être triée par `surveillance.ts` au
	 * milieu des prescriptions, et n'a aucune place naturelle dans la vue Par
	 * créance. C'est pourtant, dit `comportement.ts` lui-même, « le signal le plus
	 * fort qu'un produit de recouvrement puisse donner ».
	 */
	readonly habitude?: {
		readonly habitude: HabitudeAffichee;
		readonly ruptures: readonly RuptureAffichee[];
	};
	readonly portefeuille?: PortefeuilleDuClient;
}

/**
 * UN DÉBITEUR SANS IDENTIFIANT PUBLIC, ET SON GESTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ SANS CE GESTE, UN DÉBITEUR NON IDENTIFIÉ DEVIENT NON IDENTIFIABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le radar des registres rapproche par identifiant, jamais par raison sociale :
 * sans SIREN, une procédure collective ouverte contre ce client passe inaperçue.
 * Et un secteur indéterminé fait retenir le délai de prescription LE PLUS COURT.
 * Un pli qui se contenterait de NOMMER ces débiteurs déclarerait deux hypothèses
 * sans donner le moyen de les lever : le BODACC se cherche PAR NOM, et c'est
 * exactement ce que `debiteurs.chercherAuRegistre` fait.
 */
export interface DebiteurSansIdentifiant {
	readonly debiteurId: string;
	readonly denomination: string;
	readonly encours: bigint;
	readonly registre: EtatRecherche;
	/** Le refus du serveur sur une saisie manuelle, mot pour mot. */
	readonly erreurSaisie: string | null;
	readonly onChercher: () => void;
	/** Retenir un établissement proposé : son numéro ET sa forme juridique. */
	readonly onRetenir: (etablissement: EtablissementPropose) => void;
	readonly onSaisir: (siren: string) => void;
	readonly secteur: string | undefined;
	readonly onChoisirSecteur: (cle: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────
// CE QUE VOS FACTURES PORTENT
// ─────────────────────────────────────────────────────────────────────────

/**
 * LA RÉVÉLATION, DEVENUE UNE PORTÉE — et pas un second total en tête.
 *
 * ⚠️ `/app/revelation` NE SE SUPPRIME PAS « SANS RIEN PERDRE », et l'écran qu'on
 * retire l'argumente lui-même : deux totaux sur le même écran coûtent plus
 * qu'ils n'apportent sur un produit dont l'argument entier est l'exactitude.
 * Trois choses n'ont pas d'autre place : le SUPPLÉMENT — le livrable vendu du
 * « Premier bilan », que le dépliement d'un total ne montre pas puisqu'il
 * n'existait pas avant d'être calculé — le bilan de ce qui s'est ÉTEINT, et le
 * texte COMPLET des angles morts. La tête garde ses deux nombres ; ceci reste un
 * récit à part, atteint par une puce.
 */
export interface CeQueVosFacturesPortent {
	readonly revelation: RevelationAffichee;
	readonly bilan: BilanPertesAffiche;
	/**
	 * CE QUE LE LOGICIEL A SUPPOSÉ, faute de donnée — et c'est UNE AUTRE CHOSE
	 * qu'un angle mort.
	 *
	 * ⚠️ LES DEUX NE SE CONFONDENT PAS, ET LES FONDRE SERAIT UN MENSONGE PAR
	 * RANGEMENT. Une hypothèse est un calcul FAIT sur une donnée absente — « le
	 * secteur n'est pas déterminé, donc on retient le délai de prescription le
	 * plus court » — et elle se LÈVE en renseignant la donnée. Un angle mort est
	 * un calcul qui n'est PAS fait du tout, et rien à l'écran ne le lèvera.
	 *
	 * Elles vivaient sur l'accueil, que la bascule supprime ; sans cette liste,
	 * la surveillance cesserait de déclarer ses hypothèses le jour de la bascule,
	 * en silence.
	 */
	readonly hypotheses: readonly string[];
	/** Le texte complet. Une puce sous une facture n'est pas un angle mort déclaré. */
	readonly anglesMorts: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────
// L'ÉCRAN
// ─────────────────────────────────────────────────────────────────────────

export interface FileAffichee {
	readonly tete: TeteDeFile;
	readonly rangees: readonly RangeeDeLaFile[];
	readonly clients: readonly RangeeClient[];
	readonly sansIdentifiant: readonly DebiteurSansIdentifiant[];
	readonly optionsSecteur: readonly OptionSecteur[];
	readonly facturesPortent: CeQueVosFacturesPortent;
	/** Le travail de fond, en une rangée unique et comptée (§ 5.2). */
	readonly travaux: readonly TacheVeilleur[];
	/**
	 * CE QUI S'EST TERMINÉ PENDANT QUE LE GÉRANT ÉTAIT AILLEURS.
	 *
	 * « 812 factures lues, 17 créances entrent dans la surveillance. »
	 *
	 * ⚠️ IL ANNONCE, IL NE PORTE PAS. Il est refermable, donc RIEN DE CHIFFRÉ ne
	 * peut vivre là et nulle part ailleurs : le bilan d'un dépôt — doublons, hors
	 * périmètre, orphelins, illisibles — vit dans sa rangée permanente et datée,
	 * et dans la section 8 du volet. Un bandeau qui serait le seul support d'un
	 * chiffre écarté ferait exactement ce que `ui/bilan-import.tsx` interdit :
	 * mentir par omission, d'un geste de fermeture.
	 */
	readonly annonce?: string;
	readonly verrous: readonly Verrou[];
	/** La ligne dont la preuve est ouverte, lue dans l'adresse (`?ligne=`). */
	readonly ligneOuverte: string | null;
	readonly onOuvrirLigne: (id: string) => void;
	readonly onFermerLigne: () => void;
	/** Le dépôt de fichiers. Il vit ici : la file est la porte d'entrée des factures. */
	readonly onFichiers: (fichiers: File[]) => void;
	readonly accepteFichiers: string;
	/**
	 * QUI EST CONNECTÉ, ET LE CHEMIN VERS SON COMPTE.
	 *
	 * ⚠️ IL VIENT DE LA BARRE MORTE (T15), ET IL EST LA SEULE ENTRÉE DE
	 * `/app/compte`. La barre haute portait l'avatar à gauche ; la file n'a plus
	 * de barre, donc la `Toolbar` le réhéberge. Le laisser tomber rendrait
	 * l'abonnement, l'équipe, les données et l'identité du créancier
	 * inatteignables le jour de la bascule.
	 */
	readonly avatar?: ReactNode;
	/**
	 * LE VEILLEUR ET SA PASTILLE — la machine est là, et elle a trouvé.
	 *
	 * ⚠️ CE N'EST PAS LA RANGÉE « LE TRAVAIL DE FOND », qui dit ce qu'il a FAIT.
	 * Celui-ci dit qu'il TOURNE, et porte le compte des notifications non lues :
	 * la seule chose du produit qui annonce une perte sèche.
	 */
	readonly veilleur?: ReactNode;
	/** Le sélecteur d'établissement, monté par l'application (T15). Permanent. */
	readonly selecteur?: ReactNode;
	/** La palette de recherche (D16), réhébergée dans la `Toolbar` à la bascule. */
	readonly palette?: ReactNode;
	/** Le volet de preuve (T8). Absent, la file se rend en colonne. */
	readonly preuve?: ReactNode;
}

const ENTETE_FILE = { genre: 'aucun', titre: 'Votre file' } as const;

export function EcranFile({ donnees }: { donnees: Lecture<FileAffichee> }) {
	/**
	 * ⚠️ LA PRÉFÉRENCE EST LUE ICI, PAS DANS LA ROUTE. `usePreference` est un
	 * `useSyncExternalStore` sur `localStorage` : il ne touche ni Convex ni
	 * session, donc la salle d'exposition en hérite telle quelle, et deux onglets
	 * ouverts sur Letikette restent d'accord sur la vue.
	 */
	const [vue, setVue] = usePreference<VueFile>(CLE_VUE_FILE, 'CREANCE', VUES);
	const [portee, setPortee] = useState<ClePortee>('AUJOURDHUI');

	if (donnees.etat !== 'pret') {
		return <PageEcran entete={ENTETE_FILE} etat={donnees.etat} />;
	}

	return (
		<FilePrete
			vue={vue}
			onVue={setVue}
			portee={portee}
			onPortee={setPortee}
			valeur={donnees.valeur}
		/>
	);
}

/**
 * Le corps, une fois les données là.
 *
 * Séparé parce que les crochets se déclarent avant tout retour anticipé : la
 * défilée vers la rangée du client ouvert n'a de sens qu'ici, et la déclarer
 * au-dessus du `if` de chargement la ferait vivre dans les trois états.
 */
function FilePrete({
	vue,
	onVue,
	portee,
	onPortee,
	valeur
}: {
	vue: VueFile;
	onVue: (v: VueFile) => void;
	portee: ClePortee;
	onPortee: (p: ClePortee) => void;
	valeur: FileAffichee;
}) {
	const {
		tete,
		rangees,
		clients,
		sansIdentifiant,
		optionsSecteur,
		facturesPortent,
		travaux,
		annonce,
		verrous,
		ligneOuverte,
		onOuvrirLigne,
		onFermerLigne,
		onFichiers,
		accepteFichiers,
		avatar,
		veilleur,
		selecteur,
		palette,
		preuve
	} = valeur;

	/** Le client déplié quand le gérant l'a décidé lui-même ; `null` tant qu'il n'a rien dit. */
	const [clientDeplie, setClientDeplie] = useState<string | null>(null);
	/** La zone de dépôt, dépliée par la `Toolbar`. Elle est permanente dans l'état vide. */
	const [depotOuvert, setDepotOuvert] = useState(false);
	/** Le bandeau d'annonce, refermé d'un geste. Il ne porte aucun chiffre : voir `annonce`. */
	const [annonceFermee, setAnnonceFermee] = useState(false);

	const rangeeOuverte = rangees.find((r) => r.id === ligneOuverte) ?? null;
	const clientDeLaLigne = rangeeOuverte?.debiteurId ?? null;

	/**
	 * ⚠️ DÉRIVÉ AU RENDU, JAMAIS POSÉ DANS UN EFFET. En basculant vers la vue Par
	 * client avec une ligne ouverte, la rangée de son client est ouverte d'office
	 * — sans quoi le volet montrerait une preuve dont la liste ne dit plus d'où
	 * elle vient.
	 */
	const clientOuvert = clientDeplie ?? clientDeLaLigne;

	const ancre = useRef<HTMLDivElement | null>(null);

	/**
	 * ⚠️ ET ELLE DÉFILE À L'ÉCRAN. Une rangée ouverte hors du champ de vision est
	 * une rangée fermée, du point de vue de celui qui regarde. L'effet ne pose
	 * aucun état : il ne fait que du DOM, ce que la règle React du projet permet.
	 */
	useEffect(() => {
		if (vue !== 'CLIENT' || clientOuvert === null) return;
		ancre.current?.scrollIntoView({ block: 'nearest' });
	}, [vue, clientOuvert]);

	const retenues = rangees.filter((r) => portee === 'TOUT' || r.portees.includes(portee));
	const { pleines, repliees } = trierSelonLePli(retenues);

	const portees = comptesDePortees(rangees, facturesPortent);

	/**
	 * ⚠️ JAMAIS UN VOLET ORPHELIN SANS EXPLICATION. Une ligne ouverte que la
	 * portée courante ne contient pas — elle a été traitée, la portée a changé —
	 * laisse le volet ouvert et pose une rangée qui le dit et qui reprend la
	 * portée qui la contient.
	 */
	const porteeQuiLaContient =
		rangeeOuverte === null || retenues.some((r) => r.id === rangeeOuverte.id)
			? null
			: (rangeeOuverte.portees[0] ?? 'TOUT');

	const barre = (
		<Toolbar className="w-full overflow-x-auto" contentClassName="flex items-center gap-cladd-3xs">
			{/*
			  L'IDENTITÉ D'ABORD — qui regarde, et si la machine tourne.

			  ⚠️ LES DEUX VIENNENT DE LA BARRE, QUI MEURT AVEC CET ÉCRAN (T15). La
			  barre les tenait sur tous les écrans ; il n'y a plus qu'un écran, donc
			  ils tiennent ici. L'avatar est la SEULE entrée de `/app/compte`.
			*/}
			{avatar}
			{veilleur}
			{avatar === undefined && veilleur === undefined ? null : <ToolbarSeparator />}

			{/* LE SÉLECTEUR D'ÉTABLISSEMENT, PERMANENT — y compris sur un compte
			    mono-site. Le cloisonnement est strict par établissement, et un gérant
			    qui reprend sa tablette après une réunion doit lire sur LEQUEL il
			    travaille sans avoir à cliquer. */}
			{selecteur}
			{selecteur === undefined ? null : <ToolbarSeparator />}

			<Segmented activeColor="brand" activeVariant="solid">
				<SegmentedButton active={vue === 'CREANCE'} onClick={() => onVue('CREANCE')}>
					Par créance
				</SegmentedButton>
				<SegmentedButton active={vue === 'CLIENT'} onClick={() => onVue('CLIENT')}>
					Par client
				</SegmentedButton>
			</Segmented>

			<ToolbarSeparator />
			{palette}
			{/*
			  LE DÉPÔT, PERMANENT DANS LA `Toolbar` QUAND LA FILE EST PLEINE.

			  ⚠️ IL OUVRE LA ZONE, IL NE LA REMPLACE PAS. `ZoneDepot` porte les quatre
			  gestes qu'un gérant fait selon d'où il vient — photographier sur la
			  tablette, parcourir, glisser, coller — et un bouton de barre qui
			  n'ouvrirait qu'un sélecteur de fichiers en perdrait trois. Le bouton
			  DÉPLIE donc la vraie zone en tête de liste.
			*/}
			<ToolbarButton onClick={() => setDepotOuvert(!depotOuvert)} aria-pressed={depotOuvert}>
				<UploadIcon />
				Déposer
			</ToolbarButton>
		</Toolbar>
	);

	/**
	 * LE PREMIER JOUR — et il ne montre AUCUN des deux nombres.
	 *
	 * ⚠️ « 0,00 € » ET « RÉPARTIS SUR 0 CLIENT » SONT DES CADRANS À ZÉRO, que la
	 * règle d'écran n° 4 interdit. Ils n'apprennent rien — le gérant sait qu'il
	 * n'a rien déposé — et ils lui apprennent surtout à sauter la tête des yeux,
	 * c'est-à-dire l'endroit où la prescription de son portefeuille s'écrira
	 * demain. Sans factures, le produit ne peut littéralement rien mesurer : tout
	 * l'écran attend ce geste, donc le dépôt est le seul à avoir le droit d'être
	 * en grand.
	 */
	const debute = tete.nombreFactures === 0 && rangees.length === 0;

	/**
	 * LA PORTE DE TRANSITION, EN BAS ET DANS LES DEUX ÉTATS.
	 *
	 * ⚠️ Y COMPRIS LE PREMIER JOUR. Un gérant qui vient de basculer et qui ne
	 * trouve pas ce qu'il cherche le cherche d'abord sur un écran vide : c'est
	 * précisément le moment où l'ancien arbre doit rester ouvert. Elle est
	 * DERNIÈRE, jamais en tête — la file est ce qu'on vient lire.
	 */
	const porte = <PorteDeTransition />;

	const liste = debute ? (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-cladd-2xs">
			<FileVide onFichiers={onFichiers} accepteFichiers={accepteFichiers} />
			{porte}
		</div>
	) : (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-cladd-2xs">
			{/* LE BANDEAU, EN TÊTE ET REFERMABLE (§ 5.2). Il ANNONCE ce qui s'est
			    terminé pendant que le gérant était ailleurs ; ce qui est chiffré vit
			    dans la rangée datée du dépôt, qui ne se referme pas. */}
			{annonce === undefined || annonceFermee ? null : (
				<Bandeau
					icone={<InfoIcon size={18} />}
					action={
						<BoutonSecondaire onClick={() => setAnnonceFermee(true)}>Fermer</BoutonSecondaire>
					}
				>
					{annonce}
				</Bandeau>
			)}

			<Tete tete={tete} vue={vue} />

			{depotOuvert ? (
				<ZoneDepot
					accept={accepteFichiers}
					onFichiers={onFichiers}
					libellePhoto="Photographier une facture"
				>
					<p className="text-cladd-xs text-cladd-fg-soft">
						Un export comptable est le plus complet : il porte vos factures, vos règlements et vos
						clients d’un coup.
					</p>
				</ZoneDepot>
			) : null}

			{/* LES PUCES DE PORTÉE — elles refiltrent la même liste, et n'ouvrent
			    jamais de destination. Une portée dont le compte vaut zéro ne se rend
			    pas : une puce qui affiche 0 est un cadran à zéro. */}
			<div className="overflow-x-auto">
				<Segmented activeColor="neutral" activeVariant="solid">
					{portees.map(({ cle, compte }) => (
						<SegmentedButton key={cle} active={portee === cle} onClick={() => onPortee(cle)}>
							{LIBELLE_PORTEE[cle]} · {compte}
						</SegmentedButton>
					))}
				</Segmented>
			</div>

			{/* LE VEILLEUR, EN UNE RANGÉE UNIQUE ET COMPTÉE. Il ne disparaît jamais :
			    un bloc qui n'apparaît que les jours où il s'est passé quelque chose
			    apprend que son absence est normale, et le jour où il manque parce que
			    la machine est tombée, plus rien ne le distingue d'un jour calme. */}
			<SourceDeRangees nom="Le travail de fond">
				<Veilleur travaux={travaux} />
			</SourceDeRangees>

			<SourceDeRangees nom="Ce qui vous manque">
				<CeQuiManque verrous={verrous} />
			</SourceDeRangees>

			{porteeQuiLaContient === null ? null : (
				<RangeeHorsPortee
					portee={porteeQuiLaContient}
					onAfficher={() => onPortee(porteeQuiLaContient)}
				/>
			)}

			{portee === 'REVELATION' ? (
				<SourceDeRangees nom="Ce que vos factures portent">
					<CeQueLesFacturesPortent contenu={facturesPortent} />
				</SourceDeRangees>
			) : (
				<SourceDeRangees nom="Les rangées de la surveillance">
					{vue === 'CREANCE' ? (
						<ListeParCreance
							rangees={pleines}
							ligneOuverte={ligneOuverte}
							onOuvrirLigne={onOuvrirLigne}
						/>
					) : (
						<ListeParClient
							clients={clients}
							rangees={pleines}
							clientOuvert={clientOuvert}
							onDeplier={(id) => setClientDeplie(clientOuvert === id ? null : id)}
							ancre={ancre}
							ligneOuverte={ligneOuverte}
							onOuvrirLigne={onOuvrirLigne}
						/>
					)}
				</SourceDeRangees>
			)}

			{vue === 'CLIENT' ? (
				<SourceDeRangees nom="Les débiteurs sans identifiant">
					<PliSansIdentifiant debiteurs={sansIdentifiant} optionsSecteur={optionsSecteur} />
				</SourceDeRangees>
			) : null}

			<PliDeLaFile faits={repliees.map((r) => r.pli)} />

			{porte}
		</div>
	);

	/**
	 * ⚠️ PLUS AUCUN `pt-barre-app`, ET C'EST LA BASCULE QUI L'A RETIRÉ (T15).
	 *
	 * Ce rembourrage dégageait la barre haute flottante, qui recouvrait sinon la
	 * `Toolbar` et rendait le sélecteur, la bascule de vue et le dépôt intapables.
	 * `src/app/barre.tsx` est mort avec la bascule : le garder ferait une bande
	 * vide de soixante-quatre pixels en tête du seul écran de travail, et c'est le
	 * genre de défaut que seul le regard au navigateur attrape.
	 */
	const corps = (
		<div className="flex flex-col gap-cladd-2xs p-cladd-3xs">
			{barre}
			{liste}
		</div>
	);

	/**
	 * ⚠️ DEUX VOLETS AU-DELÀ DE 1024 px (règle d'écran n° 3), et le volet n'arrive
	 * qu'à la fusion : T8 l'écrit en parallèle. Sans lui, la file se rend en
	 * colonne — pas en deux volets dont le droit serait vide, ce qui serait un
	 * cadran à zéro de plus.
	 */
	if (preuve === undefined) return <PageEcran entete={ENTETE_FILE}>{corps}</PageEcran>;

	return (
		<PageEcran
			entete={ENTETE_FILE}
			volets={{
				liste: corps,
				preuve,
				preuveOuverte: ligneOuverte !== null,
				onFermerPreuve: onFermerLigne
			}}
		/>
	);
}

/**
 * Le compte de chaque portée, et la règle qui en retire les vides.
 *
 * ⚠️ `TOUT` COMPTE TOUTES LES RANGÉES, et `REVELATION` compte des FACTURES, pas
 * des rangées : c'est un récit, et son compte dit combien de factures il porte.
 * Une portée à zéro ne se rend pas du tout.
 */
function comptesDePortees(
	rangees: readonly RangeeDeLaFile[],
	facturesPortent: CeQueVosFacturesPortent
): readonly { readonly cle: ClePortee; readonly compte: number }[] {
	const comptes = ORDRE_PORTEES.map((cle) => {
		if (cle === 'TOUT') return { cle, compte: rangees.length };
		if (cle === 'REVELATION') {
			return {
				cle,
				compte:
					facturesPortent.revelation.nombreFactures + facturesPortent.revelation.nonChiffrees.length
			};
		}
		return { cle, compte: rangees.filter((r) => r.portees.includes(cle)).length };
	});

	return comptes.filter((p) => p.compte > 0);
}

// ─────────────────────────────────────────────────────────────────────────
// LA TÊTE, RENDUE
// ─────────────────────────────────────────────────────────────────────────

function Tete({ tete, vue }: { tete: TeteDeFile; vue: VueFile }) {
	return (
		<div className="flex flex-col gap-cladd-2xs">
			<ChiffreHero
				centimes={tete.total}
				surTitre="Ce qu’on vous doit"
				legende={
					tete.nombreFactures === 0 ? undefined : (
						<span>
							sur {tete.nombreFactures} facture{pluriel(tete.nombreFactures)} en retard
						</span>
					)
				}
			/>

			{/* LE TOTAL SE DÉPLIE SUR PLACE, ET SANS CLIC. Un montant qu'on ne peut
			    pas décomposer est un montant qu'on demande de croire ; le débiteur
			    qui le conteste refera le calcul, le gérant doit pouvoir le refaire
			    avant lui. */}
			<CompositionDue parts={tete.parts} />

			{/*
			  LE SECOND NOMBRE CHANGE DE GRAIN AVEC LA VUE, JAMAIS LE PREMIER.
			  « Ce qu'on vous doit » est le même argent des deux côtés, et deux totaux
			  différents selon la vue seraient le défaut que `revelation.ts` interdit.
			  C'est le second qui dit « où faut-il regarder ».
			*/}
			<p className="text-cladd-xs text-cladd-fg-soft">
				{vue === 'CREANCE' ? (
					<>
						Dont{' '}
						<span className="font-semibold tabular-nums">
							{eurosCentimes(tete.prescriptionSousPreavis)}
						</span>{' '}
						dont la prescription tombe sous {PREAVIS.PRESCRIPTION} jours.
					</>
				) : (
					<>
						Répartis sur <span className="font-semibold tabular-nums">{tete.clientsConcernes}</span>{' '}
						client
						{pluriel(tete.clientsConcernes)}, dont{' '}
						<span className="font-semibold tabular-nums">{tete.clientsSousPreavis}</span>{' '}
						{/* « portent », pas « porte » plus un `s` : le verbe s'accorde, il ne
						    se suffixe pas. Un accord faux sur le seul chiffre de tête se lit
						    comme un chiffre mal fait. */}
						{tete.clientsSousPreavis > 1 ? 'portent' : 'porte'} une échéance sous{' '}
						{PREAVIS.PRESCRIPTION} jours.
					</>
				)}
			</p>

			{/* LA RÈGLE D'AMPUTATION, SOUS LES DEUX NOMBRES ET JAMAIS REPLIÉE. Elle
			    tient identiquement dans les deux vues : une facture non chiffrée est
			    nommée ici ET comptée sur la rangée de son client ; elle n'est jamais
			    absorbée par un encours qui ne la compte pas. */}
			<FacturesNonChiffrees lignes={tete.nonChiffrees} />
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA VUE PAR CRÉANCE
// ─────────────────────────────────────────────────────────────────────────

function ListeParCreance({
	rangees,
	ligneOuverte,
	onOuvrirLigne
}: {
	rangees: readonly RangeeDeLaFile[];
	ligneOuverte: string | null;
	onOuvrirLigne: (id: string) => void;
}) {
	/**
	 * ⚠️ CE N'EST PAS L'ÉTAT VIDE DU PRODUIT, c'est une portée que ce qu'on a
	 * traité vient de vider sous les doigts. Le premier jour se rend ailleurs,
	 * avec sa zone de dépôt ; ici il n'y a rien à montrer, et le dire est déjà
	 * tout ce qu'il y a à dire.
	 */
	if (rangees.length === 0) {
		return (
			<p className="text-cladd-xs text-cladd-fg-soft">
				Plus rien à trancher dans cette portée. Les autres puces en portent encore.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-cladd-3xs">
			{rangees.map((rangee) => (
				<Rangee
					key={rangee.id}
					rangee={rangee}
					ouverte={ligneOuverte === rangee.id}
					{...(rangee.ouvrable === false ? {} : { onOuvrir: () => onOuvrirLigne(rangee.id) })}
				/>
			))}
		</div>
	);
}

function Rangee({
	rangee,
	ouverte,
	onOuvrir
}: {
	rangee: RangeeDeLaFile;
	ouverte: boolean;
	/** Absent, la rangée ne s'ouvre pas — et n'en a pas l'air. Voir `ouvrable`. */
	onOuvrir?: () => void;
}) {
	if (rangee.genre === 'LETTRAGE') return <Lettrage {...rangee.lettrage} />;

	if (rangee.genre === 'DEPOT') return <BilanImport depot={rangee.depot} />;

	if (rangee.genre === 'LITIGE') {
		return (
			<RangeeFile
				titre={rangee.debiteur}
				obstacle={rangee.question}
				urgence={rangee.urgence}
				montant={rangee.montant}
				{...(rangee.proposition === undefined ? {} : { proposition: rangee.proposition })}
				ouverte={ouverte}
				{...(onOuvrir === undefined ? {} : { onOuvrir })}
			>
				{/* TROIS RÉPONSES DE MÊME POIDS, et aucune n'est présélectionnée : une
				    pilule blanche sur la réponse proposée ferait de l'appui une
				    formalité, sur une déclaration qui décide de l'éligibilité. */}
				<BoutonSecondaire
					disabled={rangee.enCours === true}
					onClick={() => rangee.onRepondre('OUI')}
				>
					Oui
				</BoutonSecondaire>
				<BoutonSecondaire
					disabled={rangee.enCours === true}
					onClick={() => rangee.onRepondre('NON')}
				>
					Non
				</BoutonSecondaire>
				<BoutonSecondaire
					disabled={rangee.enCours === true}
					onClick={() => rangee.onRepondre('INCONNU')}
				>
					Je ne sais pas
				</BoutonSecondaire>
			</RangeeFile>
		);
	}

	return (
		<RangeeFile
			titre={rangee.debiteur}
			obstacle={rangee.obstacle}
			urgence={rangee.urgence}
			montant={rangee.montant}
			{...(rangee.dateDuFait === undefined ? {} : { dateDuFait: rangee.dateDuFait })}
			{...(rangee.hypothese === undefined ? {} : { hypothese: rangee.hypothese })}
			{...(rangee.proposition === undefined ? {} : { proposition: rangee.proposition })}
			ouverte={ouverte}
			{...(onOuvrir === undefined ? {} : { onOuvrir })}
		>
			{rangee.verbe === undefined ? undefined : (
				<BoutonPrincipal onClick={rangee.verbe.onPresser}>{rangee.verbe.libelle}</BoutonPrincipal>
			)}
		</RangeeFile>
	);
}

/**
 * LE VIDE MONTRE LE CHEMIN, jamais des cadrans à zéro.
 *
 * ⚠️ ET LE DÉPÔT VIT ICI. Sans factures, le produit ne peut littéralement rien
 * mesurer : tout l'écran attend ce geste, donc il est le seul à avoir le droit
 * d'être en grand.
 */
function FileVide({
	onFichiers,
	accepteFichiers
}: {
	onFichiers: (fichiers: File[]) => void;
	accepteFichiers: string;
}) {
	return (
		<SectionEcran
			titre="Rien à trancher aujourd’hui"
			legende="Le logiciel surveille les échéances et la prescription dès qu’il a de quoi compter."
		>
			<ZoneDepot
				accept={accepteFichiers}
				onFichiers={onFichiers}
				libellePhoto="Photographier une facture"
			>
				<BoutonPrincipal pleineLargeur>
					<UploadIcon />
					Déposer un export comptable ou des factures
				</BoutonPrincipal>
			</ZoneDepot>

			{/*
			  TROIS RANGÉES FANTÔMES, ESTOMPÉES.

			  ⚠️ ELLES MONTRENT LE CHEMIN, ELLES NE COMPTENT RIEN. Un écran vide qui
			  ne dit pas à quoi il ressemblera une fois plein oblige à déposer pour
			  savoir ce qu'on achète. Ce sont des exemples PLAUSIBLES, jamais des
			  chiffres du gérant : `aria-hidden`, estompées, et aucune n'est tapable
			  — une rangée qui a l'air cliquable et ne fait rien est pire qu'une
			  rangée qui n'en a pas l'air.
			*/}
			<div aria-hidden className="pointer-events-none flex flex-col gap-cladd-3xs opacity-40">
				{FANTOMES.map((fantome) => (
					<RangeeFile
						key={fantome.obstacle}
						titre={fantome.titre}
						obstacle={fantome.obstacle}
						urgence={fantome.urgence}
						montant={fantome.montant}
					/>
				))}
			</div>
		</SectionEcran>
	);
}

/**
 * Les trois rangées que le gérant lira une fois ses factures déposées.
 *
 * Une par argument de vente, dans l'ordre où le produit les vend : la
 * prescription qui éteint un droit sans que personne n'ait rien fait, les
 * intérêts que personne n'a calculés, et l'échéance illisible qu'il faut
 * relever. Trois, parce que c'est assez pour lire la forme d'une rangée et
 * trop peu pour qu'on les prenne pour des données.
 */
const FANTOMES: readonly {
	readonly titre: string;
	readonly obstacle: string;
	readonly urgence: UrgenceRangee;
	readonly montant: bigint;
}[] = [
	{
		titre: 'Un de vos clients',
		obstacle: 'Prescription dans 41 jours : passé cette date, la créance ne se réclame plus.',
		urgence: 'CRITIQUE',
		montant: 3_120_050n
	},
	{
		titre: 'Un autre de vos clients',
		obstacle: 'Décompte arrêtable, intérêts de retard et indemnité forfaitaire compris.',
		urgence: 'HAUTE',
		montant: 1_248_033n
	},
	{
		titre: 'Un troisième',
		obstacle: 'Échéance illisible sur 3 factures : le retard ne peut pas être établi.',
		urgence: 'NORMALE',
		montant: 41_200n
	}
];

/** La ligne ouverte n'est pas dans cette portée. Jamais un volet orphelin sans explication. */
function RangeeHorsPortee({ portee, onAfficher }: { portee: ClePortee; onAfficher: () => void }) {
	return (
		<RangeeFile
			titre="La ligne ouverte n’est pas dans cette portée"
			obstacle={`Elle se lit dans « ${LIBELLE_PORTEE[portee]} ».`}
			urgence="NORMALE"
			montant={null}
		>
			<BoutonSecondaire onClick={onAfficher}>
				Afficher « {LIBELLE_PORTEE[portee]} »
			</BoutonSecondaire>
		</RangeeFile>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA VUE PAR CLIENT
// ─────────────────────────────────────────────────────────────────────────

function ListeParClient({
	clients,
	rangees,
	clientOuvert,
	onDeplier,
	ancre,
	ligneOuverte,
	onOuvrirLigne
}: {
	clients: readonly RangeeClient[];
	rangees: readonly RangeeDeLaFile[];
	clientOuvert: string | null;
	onDeplier: (debiteurId: string) => void;
	ancre: React.RefObject<HTMLDivElement | null>;
	ligneOuverte: string | null;
	onOuvrirLigne: (id: string) => void;
}) {
	/**
	 * ⚠️ UN CLIENT SANS RIEN À TRAITER N'APPARAÎT PAS. Il est dans le pli compté :
	 * une rangée de client vide est un cadran à zéro, et elle apprendrait au
	 * gérant à sauter la liste des yeux.
	 */
	const avecRangees = clients.filter((client) =>
		rangees.some((rangee) => rangee.debiteurId === client.debiteurId)
	);

	if (avecRangees.length === 0) {
		return (
			<p className="text-cladd-xs text-cladd-fg-soft">
				Aucun client ne porte de rangée dans cette portée.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-cladd-3xs">
			{avecRangees.map((client) => {
				const ouvert = clientOuvert === client.debiteurId;
				const siennes = rangees.filter((r) => r.debiteurId === client.debiteurId);

				return (
					<div
						key={client.debiteurId}
						ref={ouvert ? ancre : undefined}
						className="flex flex-col gap-cladd-3xs"
					>
						<ClientEnTete
							client={client}
							ouvert={ouvert}
							onDeplier={() => onDeplier(client.debiteurId)}
						/>

						{/* ELLE S'OUVRE EN PLACE SUR SES RANGÉES, qui sont EXACTEMENT
						    celles de la vue Par créance, inchangées, avec leur verbe.
						    Rien n'est reformulé pour la vue : un obstacle a une seule
						    phrase dans tout le produit. */}
						{ouvert ? (
							<div className="flex flex-col gap-cladd-3xs pl-cladd-2xs">
								{siennes.map((rangee) => (
									<Rangee
										key={rangee.id}
										rangee={rangee}
										ouverte={ligneOuverte === rangee.id}
										{...(rangee.ouvrable === false
											? {}
											: { onOuvrir: () => onOuvrirLigne(rangee.id) })}
									/>
								))}
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}

function ClientEnTete({
	client,
	ouvert,
	onDeplier
}: {
	client: RangeeClient;
	ouvert: boolean;
	onDeplier: () => void;
}) {
	/**
	 * ⚠️ ELLE TRIE PAR ENCOURS, ET ELLE LE DIT. Elle ne classe pas les clients par
	 * risque, ne pose aucun score de débiteur et ne dit pas « ce client va faire
	 * défaut » : `comportement.ts` refuse déjà explicitement cette prédiction,
	 * « invérifiable posée sur une douzaine d'observations ».
	 */
	const obstacles = client.obstacles
		.filter((o) => o.compte > 0)
		.map((o) => `${o.compte} ${o.libelle}`)
		.join(', ');

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<RangeeFile
				titre={client.denomination}
				obstacle={
					client.prochaineEcheance === null
						? obstacles === ''
							? 'Aucune échéance relevée.'
							: obstacles
						: `${client.prochaineEcheance.fait}${obstacles === '' ? '' : ` · ${obstacles}`}`
				}
				urgence={client.sousPreavis ? 'CRITIQUE' : 'NORMALE'}
				montant={client.encours}
				{...(client.prochaineEcheance === null
					? {}
					: { dateDuFait: client.prochaineEcheance.date })}
				{...(client.identifiantConfirme
					? {}
					: {
							hypothese:
								'Le numéro au registre de ce client n’est pas confirmé : ce nom est le libellé lu sur ses factures, et sa solvabilité n’est pas surveillée.'
						})}
				ouverte={ouvert}
			>
				{/* UN SEUL GESTE, ET IL OUVRE EN PLACE. La rangée n'est pas tapable en
				    plus du bouton : deux chemins vers la même chose se réapprennent à
				    chaque visite, et la preuve d'un client n'est pas une preuve — ce
				    sont ses rangées qui portent les leurs. */}
				<BoutonSecondaire onClick={onDeplier}>
					{ouvert ? <ChevronDownIcon /> : <ChevronRightIcon />}
					{ouvert ? 'Replier ce client' : 'Ouvrir ses rangées'}
				</BoutonSecondaire>
			</RangeeFile>

			{ouvert ? (
				<div className="flex flex-col gap-cladd-3xs pl-cladd-2xs">
					{/* L'ENCOURS, DÉPLIÉ SUR PLACE. La somme de ce qu'un client doit
					    n'est agrégée nulle part ailleurs dans le produit. */}
					<CompositionDue parts={client.parts} />

					{client.portefeuille === undefined ? null : (
						<p className="text-cladd-xs text-cladd-fg-soft">
							{client.portefeuille.facturesConnues} facture
							{pluriel(client.portefeuille.facturesConnues)} connue
							{pluriel(client.portefeuille.facturesConnues)}, {client.portefeuille.auDecompte} au
							décompte en cours,{' '}
							<span className="font-semibold tabular-nums">
								{eurosCentimes(client.portefeuille.horsDecompte)}
							</span>{' '}
							hors décompte.
						</p>
					)}

					{client.habitude === undefined ? null : (
						<HabitudePaiement
							habitude={client.habitude.habitude}
							ruptures={client.habitude.ruptures}
						/>
					)}
				</div>
			) : null}
		</div>
	);
}

/**
 * LE PLI DES DÉBITEURS SANS IDENTIFIANT, ET SON GESTE.
 *
 * ⚠️ IL N'EST JAMAIS SILENCIEUSEMENT OMIS. Une vue qui ferait disparaître un
 * client dont on ne sait pas confirmer l'identité est exactement le mur que D0
 * interdit — et l'hypothèse de prescription la plus courte deviendrait
 * incorrigible.
 */
function PliSansIdentifiant({
	debiteurs,
	optionsSecteur
}: {
	debiteurs: readonly DebiteurSansIdentifiant[];
	optionsSecteur: readonly OptionSecteur[];
}) {
	if (debiteurs.length === 0) return null;

	return (
		<SectionEcran
			titre={`${debiteurs.length} débiteur${pluriel(debiteurs.length)} sans identifiant`}
			legende="Le radar des registres rapproche par identifiant, jamais par raison sociale : sans lui, une procédure collective ouverte contre ce client passe inaperçue."
		>
			<div className="flex flex-col gap-cladd-2xs">
				{debiteurs.map((debiteur) => (
					<div key={debiteur.debiteurId} className="flex flex-col gap-cladd-3xs">
						<p className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
							<span className="text-cladd-xs font-semibold">{debiteur.denomination}</span>
							<span className="text-cladd-xs font-bold tabular-nums">
								{eurosCentimes(debiteur.encours)}
							</span>
						</p>

						{/* LE BODACC SE CHERCHE PAR NOM, sans clé. Il propose, il ne
						    choisit pas : c'est au gérant de reconnaître son propre client
						    parmi ses homonymes. */}
						<RechercheRegistre
							denomination={debiteur.denomination}
							siren={undefined}
							formeJuridique={undefined}
							etat={debiteur.registre}
							erreurSaisie={debiteur.erreurSaisie}
							onChercher={debiteur.onChercher}
							onRetenir={debiteur.onRetenir}
							onSaisir={debiteur.onSaisir}
						/>

						{/* ET LE SECTEUR, ICI AUSSI : indéterminé, il fait retenir le délai
						    de prescription LE PLUS COURT. */}
						<ChoixSecteur
							secteur={debiteur.secteur}
							optionsSecteur={optionsSecteur}
							onChoisirSecteur={debiteur.onChoisirSecteur}
						/>
					</div>
				))}
			</div>
		</SectionEcran>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// CE QUE VOS FACTURES PORTENT
// ─────────────────────────────────────────────────────────────────────────

function CeQueLesFacturesPortent({ contenu }: { contenu: CeQueVosFacturesPortent }) {
	return (
		<div className="flex flex-col gap-cladd-2xs">
			<ChocRevelation revelation={contenu.revelation} />

			<SectionEcran titre="Ce qui s’est éteint">
				<BilanPertes bilan={contenu.bilan} />
			</SectionEcran>

			{/*
			  CE QUE LE LOGICIEL A SUPPOSÉ — à plat, jamais replié.

			  ⚠️ UNE HYPOTHÈSE REPLIÉE EST UNE HYPOTHÈSE QU'ON NE LIT PAS, et le
			  doute ne profite jamais au produit : un secteur indéterminé fait
			  retenir le délai de prescription LE PLUS COURT, ce qui change la date
			  à laquelle une créance s'éteint. Le gérant qui l'ignore croit avoir
			  plus de temps qu'il n'en a.
			*/}
			{contenu.hypotheses.length === 0 ? null : (
				<SectionEcran titre="Ce que le logiciel a supposé">
					<div className="flex flex-col gap-cladd-3xs">
						{contenu.hypotheses.map((hypothese) => (
							<p key={hypothese} className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
								{hypothese}
							</p>
						))}
					</div>
				</SectionEcran>
			)}

			{/*
			  LES ANGLES MORTS, EN TEXTE ET EN PLEINE LARGEUR.

			  ⚠️ CE QUE LE LOGICIEL NE VOIT PAS S'AFFICHE AUSSI. Un utilisateur qui
			  croit sa prescription surveillée ne la surveille pas lui-même. Ce sont
			  des chaînes libres sans identifiant : elles ne mènent nulle part, et
			  c'est la vérité — une rangée cliquable ouvrirait le mauvais dossier.
			*/}
			{contenu.anglesMorts.length === 0 ? null : (
				<SectionEcran titre="Ce que le logiciel ne surveille pas">
					<div className="flex flex-col gap-cladd-3xs">
						{contenu.anglesMorts.map((angle) => (
							<p key={angle} className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
								{angle}
							</p>
						))}
					</div>
				</SectionEcran>
			)}
		</div>
	);
}
