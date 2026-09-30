import { useState, type ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { InfoIcon, UploadIcon, XIcon } from 'lucide-react';
import { PREAVIS } from '../lib/verticales/recouvrement/surveillance';
import {
	Bandeau,
	BilanImport,
	BoutonPrincipal,
	BoutonSecondaire,
	CeQuiManque,
	ChiffreHero,
	LigneAnalyse,
	ListeAnalyses,
	CompositionDue,
	FaitsDuDossier,
	ListeDeRangees,
	RangeeDepliable,
	dateCourte,
	dateLongue,
	FERMETURE_DE_LA_PORTE,
	type FaitDuDossier,
	FacturesNonChiffrees,
	GroupeDeFile,
	Lettrage,
	PageEcran,
	PliDeLaFile,
	PorteDeTransition,
	RangeeFile,
	SectionEcran,
	SectionsDepliables,
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
 * ni authentification. Les trois surfaces que seule l’application peut composer
 * — l'avatar, le sélecteur d'établissement et la palette de
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
	/** Le sélecteur d'établissement, monté par l'application. Permanent. */
	readonly selecteur?: ReactNode;
	/** La palette de recherche (D16). */
	readonly palette?: ReactNode;
	/**
	 * LA CONNEXION À UN LOGICIEL DE FACTURATION, composée par l'application.
	 * Absente quand aucune connexion n'est activée : l'import redevient alors le
	 * geste principal.
	 */
	readonly connexion?: ReactNode;
}

/**
 * ⚠️ `onglet`, ET PLUS `aucun` — LE REGARD AU NAVIGATEUR L'A IMPOSÉ.
 *
 * L'écran se rendait sans en-tête, et sa rangée d'outils défilait avec la
 * liste. Deux défauts en sont sortis, mesurés :
 *
 *   · `PageEcran` dégage 64 px en haut de l'ATTENTE et de l'ERREUR quand l'écran
 *     n'a pas d'en-tête, et rien du tout quand il est prêt. Le contenu
 *     descendait puis remontait de 48 px à chaque chargement — le genre de saut
 *     qu'aucun test ne voit ;
 *   · la recherche, le dépôt et le compte partaient vers le haut
 *     dès la deuxième rangée lue. Sur un écran qui porte cent cinquante rangées,
 *     c'est-à-dire : introuvables.
 *
 * Un en-tête d'onglet règle les deux — il ne défile pas, et il pose le même
 * rythme haut que `/app/creance/$id` et `/app/debiteurs/$id`, qui sont les
 * écrans d'à côté dans la barre du bas.
 *
 * ⚠️ MAIS IL NE NOMME PLUS L'ÉCRAN. Le titre « Aujourd'hui » a été retiré : la
 * barre du bas dit déjà où l'on est, et le répéter en gros coûtait 64px de
 * dégagement plus la hauteur du titre — c'est-à-dire la première rangée, celle
 * qu'on regarde en ouvrant l'application. La rangée d'outils occupe désormais la
 * barre seule, tout en haut, et le reste glisse dessous derrière son verre.
 */

export function EcranFile({ donnees }: { donnees: Lecture<FileAffichee> }) {
	if (donnees.etat !== 'pret') {
		return <PageEcran entete={{ genre: 'onglet' }} etat={donnees.etat} />;
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
		selecteur,
		palette,
		connexion
	} = valeur;

	/** La zone de dépôt, dépliée par la rangée du haut. Elle est permanente dans l'état vide. */
	const [depotOuvert, setDepotOuvert] = useState(false);
	/** Le bandeau d'annonce, refermé d'un geste. Il ne porte aucun chiffre : voir `annonce`. */
	const [annonceFermee, setAnnonceFermee] = useState(false);
	/**
	 * LES RANGÉES DÉPLIÉES — LA TÊTE ET LE TRAVAIL DE FOND, DANS UNE SEULE LISTE.
	 *
	 * ⚠️ UNE SEULE RACINE POUR L'ÉCRAN. Sous 1024 px, chacune de ces rangées
	 * s'ouvre en FEUILLE plutôt que de pousser la file vers le bas ; la feuille
	 * a besoin de savoir si elle est ouverte, et c'est cette liste qui le dit.
	 */
	const [depliees, setDepliees] = useState<readonly string[]>([]);
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

	/*
	  ⚠️ CE QUI TRAVAILLE RESTE À L'ÉCRAN ; CE QUI A FINI DEVIENT UNE RANGÉE.

	  C'est la règle d'écran n° 2 du produit — « tout traitement se voit sans
	  qu'on le demande » — appliquée à la lettre, et c'est ce qui permet de
	  gagner les 464 px que le bilan d'un dépôt TERMINÉ occupait chaque matin en
	  tête de file. Un dépôt qui lit encore, ou qui a échoué, ne se replie pas :
	  le premier change sous les yeux, le second demande un geste.
	*/
	const depotsVivants = depots.filter((rangee) => rangee.depot.statut !== 'TERMINE');
	const depotsFinis = depots.filter((rangee) => rangee.depot.statut === 'TERMINE');
	const veilleurTravaille = travaux.some((tache) => tache.etat === 'EN_COURS');

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
		<PageEcran
			entete={{
				genre: 'onglet',
				/*
				  ⚠️ LE GRAND TITRE EST REVENU LE 30/09/2026. L'écran n'en portait
				  aucun : seule la barre du bas disait où l'on était, et rien n'ancrait
				  le défilement. C'est la signature d'une application iOS — Asana,
				  Craft et Numo posent tous le leur DANS le flux, au-dessus de la
				  liste — et c'est aussi ce qui donne à la date sa place, qui est la
				  première chose qu'on regarde sur un écran qui s'appelle
				  « Aujourd'hui ».
				*/
				titre: 'Aujourd’hui',
				sousTitre: dateLongue(aujourdHui),
				actions: (
					<RangeeDuHaut
						selecteur={selecteur}
						palette={palette}
						avatar={avatar}
						depotOuvert={depotOuvert}
						onDepot={() => setDepotOuvert(!depotOuvert)}
						/* Le premier jour, la zone de dépôt est déjà en grand au milieu de
						   l'écran : un second bouton qui ouvre ce qui est déjà ouvert se lit
						   comme une panne. */
						avecDepot={!debute}
					/>
				)
			}}
		>
			{debute ? (
				<>
					<FileVide
						onFichiers={onFichiers}
						accepteFichiers={accepteFichiers}
						connexion={connexion}
					/>
					<PorteDeTransition />
				</>
			) : (
				<SectionsDepliables ouvertes={depliees} onOuvertesChange={setDepliees}>
					{/* LE BANDEAU, EN TÊTE ET REFERMABLE (§ 5.2). Il ANNONCE ce qui s'est
					    terminé pendant que le gérant était ailleurs ; ce qui est chiffré vit
					    dans la rangée datée du dépôt, qui ne se referme pas. */}
					{annonce === undefined || annonceFermee ? null : (
						<Bandeau
							icone={<InfoIcon size={18} />}
							/*
							  ⚠️ UNE CROIX, PAS LE MOT « FERMER ». Le mot poussait la commande
							  sur une ligne à elle et portait le bandeau à 174 px pour douze
							  mots, en tête de l'écran du matin. La croix garde les 48 px du
							  doigt et tient à droite du texte — c'est la forme d'une
							  notification iOS, et `aria-label` dit ce que le glyphe ne dit pas.
							*/
							action={
								<BoutonSecondaire
									aria-label="Fermer cette annonce"
									onClick={() => setAnnonceFermee(true)}
								>
									<XIcon size={18} />
								</BoutonSecondaire>
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

					{/* CE QUI TRAVAILLE, OU CE QUI A ÉCHOUÉ. Jamais replié : un dépôt qui
					    lit change sous les yeux, et un dépôt échoué demande un geste. */}
					{depotsVivants.length === 0 ? null : (
						<SourceDeRangees nom="Vos dépôts">
							<div className="flex flex-col gap-cladd-3xs">
								{depotsVivants.map((rangee) => (
									<BilanImport key={rangee.id} depot={rangee.depot} />
								))}
							</div>
						</SourceDeRangees>
					)}

					{/* CE QUI TOURNE À L'INSTANT, ET RIEN D'AUTRE. L'histoire du veilleur
					    est une rangée du travail de fond ; ce qui travaille reste sous les
					    yeux, parce qu'un traitement en cours qu'il faut aller chercher est
					    un traitement qu'on croit arrêté. */}
					{veilleurTravaille ? (
						<SourceDeRangees nom="Le travail de fond">
							<Veilleur travaux={travaux} seulementCeQuiTravaille />
						</SourceDeRangees>
					) : null}

					{/* CE QUI VOUS MANQUE MONTE AVANT LA FILE : c'est ce qui empêche, et ce
					    qui empêche ne se cherche pas. */}
					<SourceDeRangees nom="Ce qui vous manque">
						<CeQuiManque verrous={verrous} />
					</SourceDeRangees>

					{/* ── LA FILE, ET ELLE COMMENCE ICI ────────────────────────────── */}
					<SourceDeRangees nom="Les rangées de la surveillance">
						{resumeDuPlafond === null ? null : (
							<p className="text-cladd-2xs text-cladd-fg-softer">{resumeDuPlafond}</p>
						)}

						{groupes.length === 0 ? (
							<p className="text-cladd-xs text-cladd-fg-soft">
								Rien à trancher aujourd’hui. La surveillance continue de tourner sur vos échéances
								et sur les dates limites pour agir en justice.
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

					{/* ── LE TRAVAIL DE FOND ───────────────────────────────────────────
					    Tout ce qui n'est pas la file du jour, en rangées qui portent leur
					    compte. Ces cinq blocs tenaient 1 462 px APRÈS la file — soit près
					    de deux écrans de défilement, chaque matin, pour des choses dont
					    aucune n'est un geste du jour. */}
					<ListeDeRangees titre="Le travail de fond">
						{depotsFinis.length === 0 ? null : (
							<RangeeDepliable
								cle="depots"
								titre="Vos dépôts"
								glose="Ce qui est entré, ce qui n’est pas entré, et pourquoi."
								valeur={`${depotsFinis.length} lu${pluriel(depotsFinis.length)}`}
							>
								{depotsFinis.map((rangee) => (
									<BilanImport key={rangee.id} depot={rangee.depot} />
								))}
							</RangeeDepliable>
						)}

						{lettrages.map((rangee) => (
							<RangeeDepliable
								key={rangee.id}
								cle={`lettrage-${rangee.id}`}
								titre="Rapprocher un virement"
								glose="Ce qui empêche de relancer un client qui a déjà payé."
								valeur="à faire"
							>
								<Lettrage {...rangee.lettrage} />
							</RangeeDepliable>
						))}

						{/* LE VEILLEUR NE DISPARAÎT JAMAIS : un bloc qui n'apparaît que les
						    jours où il s'est passé quelque chose apprend que son absence est
						    normale, et le jour où il manque parce que la machine est tombée,
						    plus rien ne le distingue d'un jour calme. Il ne se replie pas non
						    plus quand il TRAVAILLE — règle d'écran n° 2. */}
						{travaux.length === 0 ? null : (
							<RangeeDepliable
								cle="veilleur"
								titre="Le veilleur"
								glose="Ce que la machine a fait cette nuit, et ce qu’elle fait en ce moment."
								valeur={`${travaux.length} passage${pluriel(travaux.length)}`}
							>
								<Veilleur travaux={travaux} />
							</RangeeDepliable>
						)}

						<LimitesDuCalcul hypotheses={hypotheses} anglesMorts={anglesMorts} />

						{/* L'ANCIEN ARBRE, EN UNE RANGÉE. Il tenait 513 px en bas de l'écran
						    du matin, tous les jours, pour un échafaudage qui ferme le
						    17 octobre. Les liens restent écrits ici, littéralement, donc
						    `aucun-ecran-orphelin.test.ts` continue de les lire. */}
						{/* ⚠️ AUCUNE GLOSE ICI : `PorteDeTransition` porte déjà son intitulé
						    et sa date de fermeture. En ajouter une écrivait la même phrase
						    deux fois dans la même feuille, à deux centimètres d'écart. */}
						<RangeeDepliable
							cle="ancienne-version"
							titre="L’ancienne version"
							valeur={`jusqu’au ${dateCourte(FERMETURE_DE_LA_PORTE)}`}
						>
							<PorteDeTransition />
						</RangeeDepliable>
					</ListeDeRangees>

					<PliDeLaFile faits={repliees.map((r) => r.pli)} />
				</SectionsDepliables>
			)}
		</PageEcran>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA RANGÉE DU HAUT
// ─────────────────────────────────────────────────────────────────────────

/**
 * LES CINQ CIBLES DE L'EN-TÊTE, ET DES BOUTONS RONDS.
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
 * ⚠️ ET ELLE NE DÉFILE PLUS. Elle vit dans l'en-tête de `PageEcran`, qui reste
 * en place pendant que la liste défile : sur un écran qui porte cent cinquante
 * rangées, une recherche qui part vers le haut à la deuxième rangée lue est une
 * recherche qu'on n'a plus.
 *
 * ⚠️ ET LE SÉLECTEUR EST PERMANENT, y compris sur un compte mono-site. Le
 * cloisonnement est strict par établissement, et un gérant qui reprend sa
 * tablette après une réunion doit lire sur LEQUEL il travaille sans cliquer.
 */
function RangeeDuHaut({
	selecteur,
	palette,
	avatar,
	depotOuvert,
	onDepot,
	avecDepot
}: {
	selecteur?: ReactNode;
	palette?: ReactNode;
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

		  `gap-2` et non `gap-cladd-3xs` : seize pixels entre quatre boutons ronds
		  coûtent quarante-huit pixels de rangée, soit une cible entière. Huit
		  suffisent à les séparer, et c'est ce que fait la référence.
		*/
		<div className="flex w-full flex-wrap items-center justify-between gap-2">
			<div className="flex min-w-0 shrink-0 items-center gap-2">{selecteur}</div>

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
				{avatar}
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA TÊTE, RENDUE
// ─────────────────────────────────────────────────────────────────────────

/**
 * LA TÊTE — LE CHIFFRE, PUIS CE QUI LE QUALIFIE, ET RIEN DE PLUS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE FAISAIT 891 PX, SOIT UN ÉCRAN ENTIER AVANT LE PREMIER GESTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle portait le chiffre, puis sa décomposition en trois lignes, puis une
 * phrase sur les dates limites, puis un paragraphe de quarante-cinq mots sur la
 * facture qui n'entre pas dans le total, puis une rangée. Relevé au navigateur
 * le 30/09/2026 : 891 px et 117 mots, avant la première chose à faire.
 *
 * Or on ouvre cet écran le matin pour AGIR. Ce qui reste ici est ce qui se lit
 * d'un coup d'œil — le chiffre, et les trois faits qui le qualifient, en
 * pastilles. La décomposition et la facture non chiffrée descendent dans une
 * rangée qui porte leur compte : elles ne sont pas perdues, elles ne sont plus
 * sur le chemin.
 *
 * ⚠️ « CE QUI VOUS EST DÛ ET N'A JAMAIS ÉTÉ CALCULÉ » RESTE UNE RANGÉE, et ce
 * n'est pas négociable : c'est le seul chiffre qui justifie l'abonnement au
 * douzième mois, et son écran n'est atteignable que par ce lien.
 */
function Tete({ tete }: { tete: TeteDeFile }) {
	const faits: FaitDuDossier[] = [];
	if (tete.nombreFactures > 0) {
		faits.push({
			cle: 'factures',
			texte: `${tete.nombreFactures} facture${pluriel(tete.nombreFactures)} en retard`
		});
	}
	if (tete.prescriptionSousPreavis > 0n) {
		faits.push({
			cle: 'preavis',
			texte: `${eurosCentimes(tete.prescriptionSousPreavis)} sous ${PREAVIS.PRESCRIPTION} jours`,
			marquant: true
		});
	}
	/*
	  ⚠️ LA FACTURE NON CHIFFRÉE EST UNE PASTILLE MARQUANTE, PAS UN PARAGRAPHE.
	  Elle n'est jamais absorbée par un total qui ne la compte pas — c'est la
	  règle d'amputation du produit —, mais la dire en quarante-cinq mots au
	  milieu du chemin la faisait sauter des yeux. Comptée ici, expliquée dans la
	  rangée juste en dessous.
	*/
	if (tete.nonChiffrees.length > 0) {
		const n = tete.nonChiffrees.length;
		faits.push({
			cle: 'non-chiffrees',
			texte: `${n} facture${pluriel(n)} non chiffrée${pluriel(n)}`,
			marquant: true
		});
	}

	const jamaisCalcule = tete.parts.interets + tete.parts.indemnites;

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<ChiffreHero centimes={tete.total} surTitre="Ce qu’on vous doit" />

			<FaitsDuDossier faits={faits} />

			<ListeDeRangees>
				<RangeeDepliable
					cle="composition"
					titre="De quoi c’est fait"
					glose="Un montant qu’on ne peut pas décomposer est un montant qu’on demande de croire. Le client qui le conteste refera le calcul."
					valeur={eurosCentimes(tete.total)}
				>
					<CompositionDue parts={tete.parts} />
					<FacturesNonChiffrees lignes={tete.nonChiffrees} />
				</RangeeDepliable>
			</ListeDeRangees>

			{/*
			  ⚠️ ELLE NE S'AFFICHE QUE QUAND IL Y A QUELQUE CHOSE À MONTRER. Une
			  rangée « 0,00 € jamais calculés » est un cadran à zéro, et le vide
			  montre le chemin au lieu d'afficher un zéro.
			*/}
			{jamaisCalcule > 0n ? (
				<ListeAnalyses>
					<LigneAnalyse
						vers="/app/revelation"
						titre="Jamais calculé"
						valeur={eurosCentimes(jamaisCalcule)}
						precision="Pénalités de retard et frais de recouvrement, dus de plein droit"
					/>
				</ListeAnalyses>
			) : null}
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
 * ⚠️ ET ELLES RESTENT DEUX BLOCS SOUS LE MÊME PLI. Une hypothèse se LÈVE —
 * préciser le secteur d'un client change la date à laquelle son dossier
 * s'éteint — un angle mort ne se lève pas depuis l'interface. Les fondre en un
 * seul paragraphe ferait croire que les seconds se corrigent, ou que les
 * premières ne se corrigent pas : ils gardent donc chacun leur intitulé, et
 * partagent seulement la rangée qui les compte.
 */
/**
 * LES LIMITES DU CALCUL — ce qui a été supposé, et ce qui n'est pas vu.
 *
 * ⚠️ REPLIÉE, MAIS COMPTÉE SUR SA RANGÉE — ET C'EST LA NUANCE QUI COMPTE.
 *
 * Ces deux blocs tenaient 571 px en bas de l'écran du matin (audit du
 * 29/09/2026, F4 et D5) : c'est le produit qui parle de lui-même, à l'endroit
 * où le gérant vient voir ce qu'il a à faire. Les replier n'est pas les
 * cacher : la rangée DIT combien il y a d'hypothèses et combien d'angles morts,
 * et un chiffre sur une rangée fermée se voit mieux qu'un paragraphe quatre
 * écrans plus bas.
 *
 * ⚠️ CE QUI SERAIT INTERDIT, C'EST DE LES RETIRER. « Un utilisateur qui croit
 * sa prescription surveillée ne la surveille pas lui-même » : le compte reste à
 * l'écran, toujours, et il s'ouvre d'un doigt.
 *
 * ⚠️ ELLE N'A PLUS DE RACINE À ELLE. Elle vit dans la liste « Le travail de
 * fond », donc dans la même racine d'accordéon que les autres rangées — c'est
 * ce qui lui donne, sous 1024 px, la feuille au lieu du dépliage sur place.
 */
function LimitesDuCalcul({
	hypotheses,
	anglesMorts
}: {
	hypotheses: readonly string[];
	anglesMorts: readonly string[];
}) {
	if (hypotheses.length === 0 && anglesMorts.length === 0) return null;

	const parties = [];
	if (hypotheses.length > 0) {
		parties.push(`${hypotheses.length} hypothèse${pluriel(hypotheses.length)}`);
	}
	if (anglesMorts.length > 0) {
		parties.push(
			`${anglesMorts.length} angle${pluriel(anglesMorts.length)} mort${pluriel(anglesMorts.length)}`
		);
	}

	return (
		<RangeeDepliable
			cle="limites"
			titre="Les limites du calcul"
			glose="Ce que le logiciel a supposé faute de donnée, et ce qu’il ne surveille pas du tout."
			valeur={parties.join(' · ')}
		>
			{hypotheses.length === 0 ? null : (
				<div className="flex flex-col gap-cladd-3xs">
					<p className="text-cladd-2xs font-semibold text-cladd-fg-soft">
						Ce qu’il a supposé — un calcul fait sur une donnée absente. Renseigner la donnée lève
						l’hypothèse.
					</p>
					{hypotheses.map((hypothese) => (
						<p key={hypothese} className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							{hypothese}
						</p>
					))}
				</div>
			)}

			{anglesMorts.length === 0 ? null : (
				<div className="flex flex-col gap-cladd-3xs">
					<p className="text-cladd-2xs font-semibold text-cladd-fg-soft">
						Ce qu’il ne surveille pas — un calcul qui n’est pas fait du tout. Rien à l’écran ne le
						lèvera.
					</p>
					{anglesMorts.map((angle) => (
						<p key={angle} className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							{angle}
						</p>
					))}
				</div>
			)}
		</RangeeDepliable>
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
	accepteFichiers,
	connexion
}: {
	onFichiers: (fichiers: File[]) => void;
	accepteFichiers: string;
	connexion?: ReactNode;
}) {
	/*
	  ⚠️ CONNECTER D'ABORD, IMPORTER ENSUITE — l'ordre de Shop. Une connexion
	  alimente le produit pour toujours ; un fichier, une fois. Quand aucune
	  connexion n'est activée, l'import reprend la place principale.
	*/
	const Bouton = connexion === undefined ? BoutonPrincipal : BoutonSecondaire;
	return (
		<SectionEcran
			titre="Rien à trancher aujourd’hui"
			legende="Le logiciel surveille les échéances et les dates limites pour agir en justice dès qu’il a de quoi compter."
		>
			{connexion}
			<ZoneDepot
				accept={accepteFichiers}
				onFichiers={onFichiers}
				libellePhoto="Photographier une facture"
				discret={connexion !== undefined}
			>
				<Bouton pleineLargeur>
					<UploadIcon />
					Importer des fichiers
				</Bouton>
			</ZoneDepot>
			{/* Aucun choix à faire : le dépôt reconnaît seul un FEC, un export CSV, un
			    PDF ou une photo. Le dire évite qu'on se demande lequel déposer. */}
			<p className="text-cladd-2xs text-cladd-fg-soft">
				Export comptable, FEC, factures PDF ou photos : le format est reconnu seul.
			</p>

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
		obstacle:
			'Date limite pour agir en justice dans 41 jours : passé cette date, le tribunal ne peut plus être saisi.',
		urgence: 'CRITIQUE',
		montant: 3_120_050n,
		dateDuFait: '2026-10-27'
	},
	{
		titre: 'Un autre de vos clients',
		obstacle: 'Calcul prêt, pénalités de retard et frais de recouvrement compris.',
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
