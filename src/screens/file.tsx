import { useState, type ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { InfoIcon, UploadIcon } from 'lucide-react';
import { PREAVIS } from '../lib/verticales/recouvrement/surveillance';
import {
	Bandeau,
	BilanImport,
	BoutonPrincipal,
	BoutonSecondaire,
	CeQuiManque,
	ChiffreHero,
	CompositionDue,
	FacturesNonChiffrees,
	GroupeDeFile,
	Lettrage,
	PageEcran,
	PliDeLaFile,
	PorteDeTransition,
	RangeeFile,
	SectionEcran,
	SourceDeRangees,
	Veilleur,
	ZoneDepot,
	eurosCentimes,
	pluriel,
	trierSelonLePli,
	type DepotAffiche,
	type DestinationRangee,
	type FaitsDuPli,
	type Lecture,
	type PartsDues,
	type PropositionDeRangee,
	type TacheVeilleur,
	type UrgenceRangee,
	type Verrou
} from '../ui';

/**
 * « AUJOURD'HUI » — le premier onglet de la barre, et l'écran qu'on ouvre le
 * matin.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL ÉTAIT, ET LE REPROCHE QUI L'A DÉFAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il portait TOUT le produit : une rangée d'outils, une bascule « Par créance /
 * Par client », une rangée de huit puces de portée qui filtraient la liste, et
 * un troisième panneau à droite — le volet de preuve — avec sa PROPRE rangée de
 * trois positions et ses sept sections. Le terrain, mot pour mot : « ces tabs
 * qui s'empilent de partout », « je te demande juste d'éviter les profondeurs de
 * pages ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE VOLET DE PREUVE A DISPARU, ET C'EST LA DÉCISION STRUCTURANTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `?ligne=` existait parce qu'aucune VRAIE page n'existait : un client et une
 * créance vivaient chacun dans un volet sans adresse. Les deux ont maintenant la
 * leur — `/app/debiteurs/$id` et `/app/creance/$id`, une page, un seul
 * défilement — et taper une rangée y MÈNE. Deux niveaux, pas trois : liste →
 * détail, jamais détail → sous-détail.
 *
 * Ce que le volet rendait vit ailleurs : la pièce, le décompte, le litige, la
 * solidité, les voies et les brouillons sur `/app/creance/$id` ; l'identité, la
 * solvabilité, l'habitude de paiement et le lettrage d'un client sur
 * `/app/debiteurs/$id`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES HUIT PUCES DE PORTÉE SONT DEVENUES TROIS GROUPES PAR URGENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une puce FILTRAIT : en ouvrir une fermait les sept autres, et ce qu'on ne
 * regardait pas cessait d'exister — au point qu'il a fallu une rangée « la ligne
 * ouverte n'est pas dans cette portée » pour rattraper le cas. Et quatre d'entre
 * elles doublaient une destination de la barre du bas : « Engagés » et « Chez le
 * conseil » sont `/app/procedures`, la vue « Par client » est `/app/debiteurs`.
 * Un choix qui change tout l'écran est une destination, pas un onglet de plus.
 *
 * Restent trois GROUPES, tous à l'écran en même temps, dans un seul défilement,
 * et chacun repliable :
 *
 *   · **En retard** — la date du fait est déjà passée. Le délai court contre
 *     vous, et c'est le seul groupe qui porte un accent.
 *   · **Aujourd'hui** — urgence critique ou haute, ou une date qui tombe
 *     aujourd'hui. Ce qui presse.
 *   · **À venir** — le reste.
 *
 * Un groupe vide ne se rend pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUN APPEL MODÈLE, ET C'EST UNE RÈGLE DE DISPONIBILITÉ (D4, B1)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une seule route de travail est un seul point de panne. Un quota épuisé, une
 * action Convex tombée ou un radar de registre muet ne doivent pas rendre le
 * produit inutilisable : l'écran se rend ENTIÈREMENT sans modèle, et chaque
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
 * ni authentification. Les quatre surfaces que seule l'application peut composer
 * — l'avatar, le veilleur, le sélecteur d'établissement et la palette de
 * recherche — arrivent en `ReactNode` : l'écran ne fait que leur garder leur
 * place dans la rangée du haut.
 */

// ─────────────────────────────────────────────────────────────────────────
// LES GROUPES
// ─────────────────────────────────────────────────────────────────────────

export type GroupeFile = 'RETARD' | 'AUJOURDHUI' | 'AVENIR';

const ORDRE_GROUPES: readonly GroupeFile[] = ['RETARD', 'AUJOURDHUI', 'AVENIR'];

/**
 * ⚠️ « EN RETARD » DIT LE FAIT, PAS LE REPROCHE. Une facture échue depuis
 * quarante jours et une ordonnance dont la date limite est dépassée sont deux
 * choses dont la date est PASSÉE : c'est un constat vérifiable sur un
 * calendrier, jamais un jugement sur ce que le gérant aurait dû faire.
 */
const LIBELLE_GROUPE: Record<GroupeFile, string> = {
	RETARD: 'En retard',
	AUJOURDHUI: 'Aujourd’hui',
	AVENIR: 'À venir'
};

/**
 * CE QUE CHAQUE GROUPE DIT DE LUI-MÊME, sous son intitulé une fois ouvert.
 *
 * ⚠️ UNE RÈGLE, PAS UN SLOGAN. Le gérant doit pouvoir vérifier qu'une rangée est
 * au bon endroit : sans la règle écrite, un groupe est un rangement qu'on subit,
 * et on cesse de croire au compte qu'il affiche.
 */
const REGLE_GROUPE: Record<GroupeFile, string> = {
	RETARD: 'La date de ces faits est passée.',
	AUJOURDHUI: 'Ce qui se décide maintenant : une échéance du jour, ou une urgence relevée.',
	AVENIR: 'Une date à venir, ou un fait qui n’en porte aucune.'
};

/**
 * LE GROUPE D'UNE RANGÉE — la seule règle de rangement de l'écran.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE NE CALCULE AUCUN DROIT, ET C'EST POUR ÇA QU'ELLE PEUT VIVRE ICI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle ne lit que deux choses que `verticales/recouvrement/surveillance.ts` a
 * DÉJÀ décidées — l'urgence et la date du fait — et les compare au jour de
 * l'interface. Aucun délai, aucun taux, aucun article : rien ici n'est une
 * valeur juridique, et rien ne se devine.
 *
 * ⚠️ LA DATE PASSÉE L'EMPORTE SUR L'URGENCE, et l'inverse serait faux. Une
 * ordonnance dont la date limite est dépassée reste « critique » au sens du
 * domaine : la ranger sous « aujourd'hui » à côté d'une prescription qui tombe
 * dans quarante jours laisserait croire qu'il reste le même temps pour les deux.
 *
 * ⚠️ ET L'URGENCE L'EMPORTE SUR UNE DATE À VENIR. Une prescription proche est
 * critique ET datée de quarante jours ; la ranger sous « à venir » pour cette
 * raison enterrerait la seule chose que ce produit vend qui fasse perdre un
 * droit sans que personne n'ait rien fait. `surveillance.ts` ne la relève
 * d'ailleurs qu'à l'intérieur de son préavis : elle est déjà proche.
 */
function groupeDe(
	rangee: { readonly urgence: UrgenceRangee; readonly dateDuFait?: string },
	aujourdHui: string
): GroupeFile {
	const date = rangee.dateDuFait;
	// Des dates ISO `AAAA-MM-JJ` se comparent comme des chaînes, exactement :
	// le format est à largeur fixe et ordonné du plus significatif au moins.
	if (date !== undefined && date < aujourdHui) return 'RETARD';
	if (date === aujourdHui) return 'AUJOURDHUI';
	return rangee.urgence === 'NORMALE' ? 'AVENIR' : 'AUJOURDHUI';
}

// ─────────────────────────────────────────────────────────────────────────
// LES RANGÉES
// ─────────────────────────────────────────────────────────────────────────

/** Ce que toute rangée porte, quel que soit son genre. */
interface CommunDeRangee {
	/** L'identité de la rangée. Elle ne voyage plus dans l'adresse : elle sert de clé. */
	readonly id: string;
	/** Le débiteur, en titre. */
	readonly debiteur: string;
	/**
	 * LA PAGE QUE CETTE RANGÉE OUVRE. Absente, elle ne mène nulle part.
	 *
	 * ⚠️ C'EST LA ROUTE QUI LA COMPOSE, ET C'EST LA BONNE FRONTIÈRE.
	 * `surveillance.ts` dit de QUOI il parle — un client, une créance — et jamais
	 * où ça se trouve : « un identifiant, jamais une route », dit `CibleEvenement`.
	 * L'écran ne traduit donc pas ; il reçoit la destination déjà résolue.
	 */
	readonly destination?: DestinationRangee;
	/** Ce qu'elle dit d'elle-même au pli. Voir `FaitsDuPli` : B9 s'y tient. */
	readonly pli: FaitsDuPli;
}

/**
 * UN OBSTACLE : ce que la surveillance a relevé, et ce qu'elle en sait.
 *
 * ⚠️ D6 TIENT ICI : UNE RANGÉE, UNE DÉCISION. « 3 factures, 31 200,50 €, la
 * facture a-t-elle été contestée ? » plus Oui / Non ferait emporter par un tap
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
	readonly proposition?: PropositionDeRangee;
}

/**
 * UNE QUESTION DE LITIGE, ET SA PROPOSITION À SA PLACE.
 *
 * ⚠️ « JE NE SAIS PAS » EST UNE VRAIE RÉPONSE, au même rang que les deux autres.
 * Elle laisse le critère ouvert, ce qui est l'issue juste : `lireLitige()` traite
 * `INCONNU` comme une abstention, et le doute ne profite jamais au produit. Une
 * proposition non confirmée retombe sur `unknown`, jamais sur `ok`.
 *
 * ⚠️ ET LES DEUX NE S'AFFICHENT JAMAIS ENSEMBLE. Une proposition affichée EST la
 * question du moment : on la retient — ce qui écrit le fait — ou on l'écarte
 * avec son motif, ce qui rouvre la question et rend les trois réponses. Les
 * offrir en même temps donnait deux chemins d'écriture pour le même fait, dont
 * un qui laissait la proposition ouverte à vie.
 */
export interface RangeeLitige extends CommunDeRangee {
	readonly genre: 'LITIGE';
	readonly question: string;
	readonly urgence: UrgenceRangee;
	readonly montant: bigint | null;
	/** Présente, elle porte les appuis de la rangée — et les trois réponses cèdent. */
	readonly proposition?: PropositionDeRangee;
	readonly onRepondre: (reponse: 'OUI' | 'NON' | 'INCONNU') => void;
	readonly enCours?: boolean;
}

/**
 * LE RAPPROCHEMENT D'UN RÈGLEMENT, à deux boutons de même poids.
 *
 * ⚠️ IL N'EST PAS DANS LES GROUPES, ET IL N'A PAS D'URGENCE. Ce n'est pas une
 * alerte : c'est l'OUTIL qui empêche de relancer un client qui a déjà payé, et
 * il est disponible tous les jours de la même façon. Lui fabriquer une urgence
 * pour le faire entrer dans un groupe ferait dire à un rangement une chose que
 * le domaine ne dit pas.
 *
 * ⚠️ ET LA PROPOSITION AUTOMATIQUE N'A PAS DE SOURCE — un règlement orphelin est
 * compté puis JETÉ à l'import — donc la surface reste MANUELLE, et elle reste :
 * sans elle, on relance un client qui a déjà payé, la pire erreur d'un logiciel
 * de recouvrement.
 */
export interface RangeeLettrage extends CommunDeRangee {
	readonly genre: 'LETTRAGE';
	readonly lettrage: React.ComponentProps<typeof Lettrage>;
}

/**
 * UN DÉPÔT, EN COURS OU TERMINÉ — et il reste une rangée DATÉE, jamais un
 * bandeau refermable.
 *
 * ⚠️ IL N'EST PAS DANS LES GROUPES NON PLUS, et pour une autre raison : c'est un
 * TRAITEMENT, et la règle d'écran n° 2 veut qu'il se voie sans qu'on le demande.
 * Rangé sous « à venir » et replié, un dépôt en cours de lecture disparaîtrait
 * exactement pendant les secondes où il change sous les yeux.
 *
 * ⚠️ `ui/bilan-import.tsx` porte la règle mot pour mot : « un import qui annonce
 * 198 factures sans mentionner les deux lignes écartées ment par omission, et
 * l'omission porte sur l'argent qu'on ne réclamera pas ». La rangée se replie le
 * jour où RIEN n'a été écarté ; dès qu'une ligne l'a été, elle reste pleine (B9).
 */
export interface RangeeDepot extends CommunDeRangee {
	readonly genre: 'DEPOT';
	readonly depot: DepotAffiche;
}

export type RangeeDeLaFile = RangeeObstacle | RangeeLitige | RangeeLettrage | RangeeDepot;

/** Les deux genres que la règle d'urgence sait ranger. Les deux autres vivent hors des groupes. */
type RangeeGroupee = RangeeObstacle | RangeeLitige;

function estGroupee(rangee: RangeeDeLaFile): rangee is RangeeGroupee {
	return rangee.genre === 'OBSTACLE' || rangee.genre === 'LITIGE';
}

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
	/** Le second nombre : ce dont la prescription tombe sous le préavis, en euros. */
	readonly prescriptionSousPreavis: bigint;
}

// ─────────────────────────────────────────────────────────────────────────
// L'ÉCRAN
// ─────────────────────────────────────────────────────────────────────────

export interface FileAffichee {
	/**
	 * LE JOUR DE L'INTERFACE, EN `AAAA-MM-JJ` — celui qui range les groupes.
	 *
	 * ⚠️ IL VIENT DE LA ROUTE, ET L'ÉCRAN NE LIT AUCUNE HORLOGE. C'est la même
	 * date que celle de l'arrêté et du bilan : deux lectures différentes feraient
	 * diverger les groupes des totaux autour de minuit. Et c'est ce qui rend la
	 * salle d'exposition stable — une démonstration datée ne change pas de forme
	 * selon le jour où on la regarde.
	 */
	readonly aujourdHui: string;
	readonly tete: TeteDeFile;
	readonly rangees: readonly RangeeDeLaFile[];
	/** Le travail de fond, en une rangée unique et comptée (§ 5.2). */
	readonly travaux: readonly TacheVeilleur[];
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
	 * ⚠️ ET LES DEUX SE RENDENT À PLAT, JAMAIS REPLIÉS. Une hypothèse repliée est
	 * une hypothèse qu'on ne lit pas, et un utilisateur qui croit sa prescription
	 * surveillée ne la surveille pas lui-même. Elles vivaient derrière une puce de
	 * portée qu'il fallait aller chercher : c'est-à-dire nulle part.
	 */
	readonly hypotheses: readonly string[];
	/** Le texte complet. Une puce sous une facture n'est pas un angle mort déclaré. */
	readonly anglesMorts: readonly string[];
	/**
	 * CE QUI S'EST TERMINÉ PENDANT QUE LE GÉRANT ÉTAIT AILLEURS.
	 *
	 * « 812 factures lues, 17 créances entrent dans la surveillance. »
	 *
	 * ⚠️ IL ANNONCE, IL NE PORTE PAS. Il est refermable, donc RIEN DE CHIFFRÉ ne
	 * peut vivre là et nulle part ailleurs : le bilan d'un dépôt — doublons, hors
	 * périmètre, orphelins, illisibles — vit dans sa rangée permanente et datée.
	 * Un bandeau qui serait le seul support d'un chiffre écarté ferait exactement
	 * ce que `ui/bilan-import.tsx` interdit : mentir par omission, d'un geste de
	 * fermeture.
	 */
	readonly annonce?: string;
	/**
	 * CE QUE LE PLAFOND A DIFFÉRÉ, COMPTÉ ET NOMMÉ (D13).
	 *
	 * « 7 propositions aujourd’hui, 12 autres en attente. » Sept par jour et par
	 * établissement, et ce qui dépasse se DIT.
	 *
	 * ⚠️ `null` VEUT DIRE « ON NE SAIT PAS », JAMAIS « RIEN EN ATTENTE ». Un
	 * battement qui n'a pas tourné ne dit pas combien il a différé : annoncer
	 * « rien en attente » serait un repli silencieux sur le seul compte qui dit
	 * ce qu'on ne voit pas.
	 */
	readonly resumeDuPlafond: string | null;
	readonly verrous: readonly Verrou[];
	/** Le dépôt de fichiers. Il vit ici : cet écran est la porte d'entrée des factures. */
	readonly onFichiers: (fichiers: File[]) => void;
	readonly accepteFichiers: string;
	/**
	 * QUI EST CONNECTÉ, ET LE CHEMIN VERS SON COMPTE.
	 *
	 * ⚠️ IL EST LA SEULE ENTRÉE DE `/app/compte`. La barre du bas y mène aussi
	 * depuis son quatrième onglet ; le laisser tomber ne casserait donc rien, et
	 * on le garde quand même : c'est lui qui dit QUI travaille, ce qu'un onglet
	 * nommé « Compte » ne dit pas.
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
	/** Le sélecteur d'établissement, monté par l'application. Permanent. */
	readonly selecteur?: ReactNode;
	/** La palette de recherche (D16). */
	readonly palette?: ReactNode;
}

const ENTETE_FILE = { genre: 'aucun', titre: 'Aujourd’hui' } as const;

export function EcranFile({ donnees }: { donnees: Lecture<FileAffichee> }) {
	if (donnees.etat !== 'pret') {
		return <PageEcran entete={ENTETE_FILE} etat={donnees.etat} />;
	}

	return <FilePrete valeur={donnees.valeur} />;
}

/**
 * Le corps, une fois les données là.
 *
 * Séparé parce que les crochets se déclarent avant tout retour anticipé : les
 * deux états d'affichage — la zone de dépôt et les groupes repliés — n'ont de
 * sens qu'ici, et les déclarer au-dessus du `if` de chargement les ferait vivre
 * dans les trois états.
 */
function FilePrete({ valeur }: { valeur: FileAffichee }) {
	const {
		aujourdHui,
		tete,
		rangees,
		travaux,
		hypotheses,
		anglesMorts,
		annonce,
		resumeDuPlafond,
		verrous,
		onFichiers,
		accepteFichiers,
		avatar,
		veilleur,
		selecteur,
		palette
	} = valeur;

	/** La zone de dépôt, dépliée par la rangée du haut. Elle est permanente dans l'état vide. */
	const [depotOuvert, setDepotOuvert] = useState(false);
	/** Le bandeau d'annonce, refermé d'un geste. Il ne porte aucun chiffre : voir `annonce`. */
	const [annonceFermee, setAnnonceFermee] = useState(false);
	/**
	 * LES GROUPES QUE LE GÉRANT A REPLIÉS LUI-MÊME.
	 *
	 * ⚠️ TOUS OUVERTS TANT QU'IL N'A RIEN DIT, et c'est le sens du mot « file ».
	 * Un groupe replié par défaut est un onglet fermé : ce qu'il contient cesse
	 * d'exister pour celui qui balaie l'écran, et c'est exactement le défaut que
	 * les trois groupes remplacent. On ne replie donc que ce qu'on a choisi de
	 * replier, et le compte reste sous les yeux dans les deux cas.
	 */
	const [replies, setReplies] = useState<readonly GroupeFile[]>([]);

	const { pleines, repliees } = trierSelonLePli(rangees);

	/*
	  LE PARTAGE, EN UN SEUL PARCOURS. Les rangées arrivent déjà triées par
	  `comparerEvenements` — le seul comparateur du produit — et le rangement en
	  groupes préserve cet ordre : on n'en refait aucun ici, sous peine de deux
	  règles de tri qui divergeraient au premier changement du domaine.
	*/
	const parGroupe = new Map<GroupeFile, RangeeGroupee[]>();
	const depots: RangeeDepot[] = [];
	const lettrages: RangeeLettrage[] = [];
	for (const rangee of pleines) {
		if (rangee.genre === 'DEPOT') depots.push(rangee);
		else if (rangee.genre === 'LETTRAGE') lettrages.push(rangee);
		else {
			const cle = groupeDe(rangee, aujourdHui);
			const deja = parGroupe.get(cle);
			if (deja === undefined) parGroupe.set(cle, [rangee]);
			else deja.push(rangee);
		}
	}

	const groupes = ORDRE_GROUPES.map((cle) => ({ cle, rangees: parGroupe.get(cle) ?? [] })).filter(
		(groupe) => groupe.rangees.length > 0
	);

	/**
	 * LE PREMIER JOUR — et il ne montre AUCUN des deux nombres.
	 *
	 * ⚠️ « 0,00 € » EST UN CADRAN À ZÉRO, que la règle d'écran n° 4 interdit. Il
	 * n'apprend rien — le gérant sait qu'il n'a rien déposé — et il lui apprend
	 * surtout à sauter la tête des yeux, c'est-à-dire l'endroit où la prescription
	 * de son portefeuille s'écrira demain. Sans factures, le produit ne peut
	 * littéralement rien mesurer : tout l'écran attend ce geste, donc le dépôt est
	 * le seul à avoir le droit d'être en grand.
	 */
	const debute = tete.nombreFactures === 0 && rangees.length === 0;

	return (
		<PageEcran entete={ENTETE_FILE}>
			<RangeeDuHaut
				selecteur={selecteur}
				palette={palette}
				veilleur={veilleur}
				avatar={avatar}
				depotOuvert={depotOuvert}
				onDepot={() => setDepotOuvert(!depotOuvert)}
				/* Le premier jour, la zone de dépôt est déjà en grand au milieu de
				   l'écran : un second bouton qui ouvre ce qui est déjà ouvert se lit
				   comme une panne. */
				avecDepot={!debute}
			/>

			{debute ? (
				<>
					<FileVide onFichiers={onFichiers} accepteFichiers={accepteFichiers} />
					<PorteDeTransition />
				</>
			) : (
				<>
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

					<Tete tete={tete} />

					{depotOuvert ? (
						<ZoneDepot
							accept={accepteFichiers}
							onFichiers={onFichiers}
							libellePhoto="Photographier une facture"
						>
							<p className="text-cladd-xs text-cladd-fg-soft">
								Un export comptable est le plus complet : il porte vos factures, vos règlements et
								vos clients d’un coup.
							</p>
						</ZoneDepot>
					) : null}

					{/* LES DÉPÔTS, HORS DES GROUPES ET JAMAIS REPLIÉS (règle d'écran n° 2).
					    Un dépôt qui travaille change sous les yeux ; le ranger sous un pli
					    reviendrait à cacher le seul traitement visible du produit. */}
					{depots.length === 0 ? null : (
						<SourceDeRangees nom="Vos dépôts">
							<div className="flex flex-col gap-cladd-3xs">
								{depots.map((rangee) => (
									<BilanImport key={rangee.id} depot={rangee.depot} />
								))}
							</div>
						</SourceDeRangees>
					)}

					<SourceDeRangees nom="Ce qui vous manque">
						<CeQuiManque verrous={verrous} />
					</SourceDeRangees>

					<SourceDeRangees nom="Les rangées de la surveillance">
						{resumeDuPlafond === null ? null : (
							<p className="text-cladd-2xs text-cladd-fg-softer">{resumeDuPlafond}</p>
						)}

						{groupes.length === 0 ? (
							<p className="text-cladd-xs text-cladd-fg-soft">
								Rien à trancher aujourd’hui. La surveillance continue de tourner sur vos échéances
								et sur la prescription.
							</p>
						) : (
							groupes.map(({ cle, rangees: siennes }) => (
								<GroupeDeFile
									key={cle}
									titre={LIBELLE_GROUPE[cle]}
									compte={siennes.length}
									ton={cle === 'RETARD' ? 'ALERTE' : 'NEUTRE'}
									ouvert={!replies.includes(cle)}
									onBasculer={() =>
										setReplies((deja) =>
											deja.includes(cle) ? deja.filter((autre) => autre !== cle) : [...deja, cle]
										)
									}
								>
									<p className="text-cladd-2xs text-cladd-fg-softer">{REGLE_GROUPE[cle]}</p>
									{siennes.map((rangee) => (
										<Rangee key={rangee.id} rangee={rangee} />
									))}
								</GroupeDeFile>
							))
						)}
					</SourceDeRangees>

					{/* LE RAPPROCHEMENT, APRÈS LES GROUPES ET HORS D'EUX. Ce n'est pas une
					    alerte, c'est l'outil qui empêche de relancer un client qui a déjà
					    payé — disponible tous les jours de la même façon. */}
					{lettrages.map((rangee) => (
						<SourceDeRangees key={rangee.id} nom="Le rapprochement d’un virement">
							<Lettrage {...rangee.lettrage} />
						</SourceDeRangees>
					))}

					{/* LE VEILLEUR, EN UNE RANGÉE UNIQUE ET COMPTÉE. Il ne disparaît jamais :
					    un bloc qui n'apparaît que les jours où il s'est passé quelque chose
					    apprend que son absence est normale, et le jour où il manque parce que
					    la machine est tombée, plus rien ne le distingue d'un jour calme. */}
					<SourceDeRangees nom="Le travail de fond">
						<Veilleur travaux={travaux} />
					</SourceDeRangees>

					<CeQueLeLogicielSuppose hypotheses={hypotheses} anglesMorts={anglesMorts} />

					<PliDeLaFile faits={repliees.map((r) => r.pli)} />

					<PorteDeTransition />
				</>
			)}
		</PageEcran>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA RANGÉE DU HAUT
// ─────────────────────────────────────────────────────────────────────────

/**
 * UNE SEULE RANGÉE EN HAUT, ET DES BOUTONS RONDS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLE N'EST PLUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle était une `Toolbar` à six cibles dont DEUX étaient des choix de vue —
 * « Par créance / Par client » — c'est-à-dire des onglets déguisés en outils.
 * La vue Par client est devenue une destination de la barre du bas
 * (`/app/debiteurs`), et ce qui reste est ce qui n'est PAS une navigation :
 * l'établissement sur lequel on travaille, et quatre gestes.
 *
 * ⚠️ L'ÉTABLISSEMENT À GAUCHE, LES GESTES À DROITE. C'est l'idiome relevé
 * (Deel, Notion, GitHub) : l'identité du contexte tient le bord gauche, les
 * gestes tiennent le bord droit, et rien entre les deux. Une rangée dont tout
 * est aligné au même bord oblige à lire chaque cible pour trouver la sienne.
 *
 * ⚠️ ET LE SÉLECTEUR EST PERMANENT, y compris sur un compte mono-site. Le
 * cloisonnement est strict par établissement, et un gérant qui reprend sa
 * tablette après une réunion doit lire sur LEQUEL il travaille sans cliquer.
 */
function RangeeDuHaut({
	selecteur,
	palette,
	veilleur,
	avatar,
	depotOuvert,
	onDepot,
	avecDepot
}: {
	selecteur?: ReactNode;
	palette?: ReactNode;
	veilleur?: ReactNode;
	avatar?: ReactNode;
	depotOuvert: boolean;
	onDepot: () => void;
	avecDepot: boolean;
}) {
	return (
		/*
		  ⚠️ `flex-wrap`, ET C'EST CE QUI REMPLACE LE DÉFILEMENT HORIZONTAL. La
		  `Toolbar` précédente défilait : à 375 px, la moitié de ses cibles étaient
		  hors champ et rien ne le disait — on ne les trouvait qu'en découvrant un
		  glissement. Une rangée qui passe à la ligne montre tout ce qu'elle porte,
		  ce qui est la seule façon d'être joignable au doigt.

		  ⚠️ ET ELLE PASSE À LA LIGNE PAR GROUPE, JAMAIS PAR CIBLE. Mesuré au
		  navigateur : à 375 px, l'établissement et les quatre gestes demandent
		  373 px pour 343 disponibles. Si les cinq cibles pouvaient se séparer, la
		  coupure tomberait au milieu des gestes et laisserait l'avatar seul sur une
		  ligne. Chaque groupe étant insécable, la coupure tombe entre les deux : une
		  ligne qui dit OÙ l'on travaille, une ligne qui porte ce qu'on peut faire.

		  `ml-auto` sur les gestes : ils tiennent le bord droit sur une ligne comme
		  sur deux. C'est l'idiome relevé (Deel, Notion, GitHub) — l'identité du
		  contexte à gauche, les gestes à droite, et rien entre les deux.
		*/
		<div className="flex flex-wrap items-center gap-2 pt-cladd-3xs">
			<div className="flex min-w-0 shrink-0 items-center gap-2">{selecteur}</div>

			{/* `gap-2` et non `gap-cladd-3xs` : seize pixels entre quatre boutons ronds
			    coûtent quarante-huit pixels de rangée, soit une cible entière. Huit
			    suffisent à les séparer, et c'est ce que fait la référence. */}
			<div className="ml-auto flex shrink-0 items-center gap-2">
				{palette}
				{avecDepot ? (
					/*
					  LE DÉPÔT, EN BOUTON ROND. Il OUVRE la zone, il ne la remplace pas :
					  `ZoneDepot` porte les quatre gestes qu'un gérant fait selon d'où il
					  vient — photographier sur la tablette, parcourir, glisser, coller —
					  et un bouton qui n'ouvrirait qu'un sélecteur de fichiers en perdrait
					  trois.
					*/
					/*
					  ⚠️ `square` : SANS LUI, LA CIBLE FAIT 36 px DE LARGE. `size` fixe la
					  HAUTEUR d'un bouton Cladd ; sa largeur suit son contenu, et une icône
					  seule n'en fait pas assez. Le plancher tactile du projet est de 48 px,
					  et il vaut sur les deux axes. Mesuré au navigateur — et c'est la prop
					  du kit qui le dit, pas une largeur écrite à la main.
					*/
					<Button
						size="md"
						square
						rounded
						variant={depotOuvert ? 'solid' : 'transparent'}
						outline={false}
						hoverable={false}
						aria-pressed={depotOuvert}
						aria-label="Déposer des factures"
						className="verre-bouton shrink-0"
						onClick={onDepot}
					>
						<UploadIcon aria-hidden />
					</Button>
				) : null}
				{veilleur}
				{avatar}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA TÊTE, RENDUE
// ─────────────────────────────────────────────────────────────────────────

function Tete({ tete }: { tete: TeteDeFile }) {
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

			{/* LE SECOND NOMBRE, ET C'EST CELUI QUI DIT OÙ REGARDER. Il ne change plus
			    avec une vue : il n'y a plus qu'une vue. */}
			<p className="text-cladd-xs text-cladd-fg-soft">
				Dont{' '}
				<span className="font-semibold tabular-nums">
					{eurosCentimes(tete.prescriptionSousPreavis)}
				</span>{' '}
				dont la prescription tombe sous {PREAVIS.PRESCRIPTION} jours.
			</p>

			{/* LA RÈGLE D'AMPUTATION, SOUS LES DEUX NOMBRES ET JAMAIS REPLIÉE. Une
			    facture non chiffrée est nommée ici ET comptée sur la rangée de son
			    client ; elle n'est jamais absorbée par un total qui ne la compte pas. */}
			<FacturesNonChiffrees lignes={tete.nonChiffrees} />
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LES RANGÉES, RENDUES
// ─────────────────────────────────────────────────────────────────────────

function Rangee({ rangee }: { rangee: RangeeGroupee }) {
	if (rangee.genre === 'LITIGE') {
		return (
			<RangeeFile
				titre={rangee.debiteur}
				obstacle={rangee.question}
				urgence={rangee.urgence}
				montant={rangee.montant}
				{...(rangee.proposition === undefined ? {} : { proposition: rangee.proposition })}
				{...(rangee.destination === undefined ? {} : { destination: rangee.destination })}
			>
				{/*
				  ═══════════════════════════════════════════════════════════════════
				  ⚠️ LES TROIS RÉPONSES NE S'AFFICHENT PAS SOUS UNE PROPOSITION
				  ═══════════════════════════════════════════════════════════════════

				  Elles s'affichaient EN PLUS de « Retenir » et « Écarter ». Les deux
				  écrivent le même fait sur la même créance, par deux chemins — et le
				  chemin des trois boutons ne touchait pas la proposition : le fait
				  écrit, la question tombait, la rangée disparaissait, et la
				  proposition restait `PROPOSEE` à vie, ses deux appuis injoignables.

				  Ce n'est pas qu'un résidu en base. Le taux de rétention et la
				  médiane du délai entre l'affichage et l'appui sont les deux mesures
				  qui doivent dire si « sept par jour » est le bon nombre : une
				  proposition tranchée ailleurs et jamais close les fausse toutes les
				  deux, sans qu'aucun test ne tombe.

				  Tant qu'une proposition est affichée, elle EST la question : la
				  retenir vaut y répondre — `propositions.retenir` écrit le fait par
				  `declarerFaitLitige`, le seul chemin d'écriture — et l'écarter la
				  refuse AVEC SON MOTIF, sans rien poser sur la créance. La question
				  reste alors ouverte et la rangée revient, avec ses trois réponses.
				*/}
				{rangee.proposition !== undefined ? undefined : (
					<>
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
					</>
				)}
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
			{...(rangee.proposition === undefined ? {} : { proposition: rangee.proposition })}
			{...(rangee.destination === undefined ? {} : { destination: rangee.destination })}
		/>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// CE QUE LE LOGICIEL SUPPOSE, ET CE QU'IL NE VOIT PAS
// ─────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ ELLES NE SE REPLIENT PAS, ET ELLES NE SONT PLUS DERRIÈRE UNE PUCE.
 *
 * Les deux vivaient dans la portée « Ce que vos factures portent » : il fallait
 * savoir qu'elle existait, la choisir, et accepter que toutes les rangées
 * disparaissent pendant qu'on les lisait. C'est-à-dire qu'elles ne se lisaient
 * pas. Elles sont maintenant en bas de l'écran, à plat, dans le même défilement.
 *
 * ⚠️ ET ELLES RESTENT DEUX BLOCS. Une hypothèse se LÈVE — préciser le secteur
 * d'un client change la date à laquelle sa créance s'éteint — un angle mort ne
 * se lève pas depuis l'interface. Les fondre ferait croire que les seconds se
 * corrigent, ou que les premières ne se corrigent pas.
 */
function CeQueLeLogicielSuppose({
	hypotheses,
	anglesMorts
}: {
	hypotheses: readonly string[];
	anglesMorts: readonly string[];
}) {
	if (hypotheses.length === 0 && anglesMorts.length === 0) return null;

	return (
		<>
			{hypotheses.length === 0 ? null : (
				<SectionEcran
					titre="Ce que le logiciel a supposé"
					legende="Un calcul fait sur une donnée absente. Renseigner la donnée lève l’hypothèse."
				>
					<div className="flex flex-col gap-cladd-3xs">
						{hypotheses.map((hypothese) => (
							<p key={hypothese} className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
								{hypothese}
							</p>
						))}
					</div>
				</SectionEcran>
			)}

			{anglesMorts.length === 0 ? null : (
				<SectionEcran
					titre="Ce que le logiciel ne surveille pas"
					legende="Un calcul qui n’est pas fait du tout. Rien à l’écran ne le lèvera."
				>
					<div className="flex flex-col gap-cladd-3xs">
						{anglesMorts.map((angle) => (
							<p key={angle} className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
								{angle}
							</p>
						))}
					</div>
				</SectionEcran>
			)}
		</>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LE PREMIER JOUR
// ─────────────────────────────────────────────────────────────────────────

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
			  chiffres du gérant : `aria-hidden`, estompées, et aucune ne mène nulle
			  part — une rangée qui a l'air cliquable et ne fait rien est pire qu'une
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
						dateDuFait={fantome.dateDuFait}
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
	readonly dateDuFait: string;
}[] = [
	{
		titre: 'Un de vos clients',
		obstacle: 'Prescription dans 41 jours : passé cette date, la créance ne se réclame plus.',
		urgence: 'CRITIQUE',
		montant: 3_120_050n,
		dateDuFait: '2026-10-27'
	},
	{
		titre: 'Un autre de vos clients',
		obstacle: 'Décompte arrêtable, intérêts de retard et indemnité forfaitaire compris.',
		urgence: 'HAUTE',
		montant: 1_248_033n,
		dateDuFait: '2026-11-12'
	},
	{
		titre: 'Un troisième',
		obstacle: 'Échéance illisible sur 3 factures : le retard ne peut pas être établi.',
		urgence: 'NORMALE',
		montant: 41_200n,
		dateDuFait: '2026-12-02'
	}
];
