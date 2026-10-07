import { useState, type ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { UploadIcon } from 'lucide-react';
import {
	BandeDAnciennete,
	BilanImport,
	BoutonPrincipal,
	BoutonSecondaire,
	CarteBouton,
	CarteLien,
	CeQuiManque,
	ChiffreHero,
	EnTeteDeGroupe,
	FeuilleDeDecision,
	ListeDeCartes,
	ListeDeRangees,
	RangeeDepliable,
	RangeeLien,
	dateCourte,
	Lettrage,
	PageEcran,
	PliDeLaFile,
	SectionEcran,
	SectionsDepliables,
	SourceDeRangees,
	TravailEnCours,
	Veilleur,
	VignetteRangee,
	ZoneDepot,
	eurosCentimes,
	pluriel,
	trierSelonLePli,
	type DepotAffiche,
	type DestinationRangee,
	type FaitsDuPli,
	type FamilleRangee,
	type LigneDAnciennete,
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
 * et aucun ne se replie — un en-tête est un intitulé, pas une commande :
 *
 *   · **En retard** — la date du fait est déjà passée. Le délai court contre
 *     vous.
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
 * ni authentification. Les deux surfaces que seule l’application peut composer
 * — le sélecteur d'établissement et la palette de
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

/*
  ⚠️ LA PHRASE QUI JUSTIFIAIT CHAQUE GROUPE EST PARTIE LE 30/09/2026. « La date
  de ces faits est passée », « Ce qui se décide maintenant : une échéance du
  jour, ou une urgence relevée » : trente mots sous trois intitulés qui disent
  déjà la même chose. La règle de rangement reste écrite — dans `groupeDe`, juste
  en dessous — et chaque rangée porte sa date en tête de ligne : c'est elle qui
  permet de vérifier qu'une rangée est au bon endroit.
*/

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
	/** L'obstacle en UNE phrase au singulier. La feuille la rend en entier. */
	readonly obstacle: string;
	/**
	 * CE QUI SE PASSE, EN CINQ MOTS AU PLUS : la ligne de la carte.
	 *
	 * ⚠️ ELLE NE RÉSUME PAS LA PHRASE, ELLE LA NOMME. « Date limite pour agir »,
	 * « Facture échue ». La carte coupait `obstacle` à deux lignes — « Date
	 * limite pour agir en justice dans 41… » — et ce qui restait n'était ni un
	 * titre ni une phrase. Le nom se lit d'un coup d'œil ; la phrase entière, avec
	 * ses réserves, reste dans la feuille et sur la page du dossier.
	 */
	readonly libelle: string;
	/** La famille de ce qui arrive : la pastille posée sur l'avatar. */
	readonly famille: FamilleRangee;
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
	/**
	 * Chaque facture comptée dans `total`, avec le jour d'où court son retard :
	 * la bande d'ancienneté sous le montant héros (`BandeDAnciennete`).
	 */
	readonly anciennete: readonly LigneDAnciennete[];
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
 * Sans en-tête, la rangée d'outils défilait avec la liste, et la recherche et le
 * dépôt partaient vers le haut dès la deuxième rangée lue. Un en-tête d'onglet
 * ne défile pas, et il pose le même rythme haut que les écrans voisins de la
 * barre du bas.
 */
export function EcranFile({ donnees }: { donnees: Lecture<FileAffichee> }) {
	if (donnees.etat !== 'pret') {
		return <PageEcran entete={{ genre: 'onglet', titre: 'Aujourd’hui' }} etat={donnees.etat} />;
	}

	return <FilePrete valeur={donnees.valeur} />;
}

/** Ce qui attend une réponse du gérant : une question de litige, ou une proposition à trancher. */
function aTrancher(rangee: RangeeGroupee): boolean {
	if (rangee.genre === 'LITIGE') return true;
	const proposition = rangee.proposition;
	return (
		proposition !== undefined &&
		(proposition.onRetenir !== undefined || proposition.onEcarter !== undefined)
	);
}

/** Le total d'un groupe, quand au moins une rangée porte un montant. */
function totalDe(rangees: readonly RangeeGroupee[]): bigint | null {
	const montants = rangees.flatMap((rangee) => (rangee.montant === null ? [] : [rangee.montant]));
	return montants.length === 0 ? null : montants.reduce((total, montant) => total + montant, 0n);
}

/**
 * « AUJOURD'HUI », UNE FOIS LES DONNÉES LÀ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE REPROCHE DU 30/09/2026 AU SOIR, ET CE QU'IL MESURAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « On doit cliquer partout, il n'y a rien de clair […] Less is more. » Relevé à
 * 393 px sur cet écran : VINGT-NEUF cibles, 391 mots, 3 001 px. Le montant dû
 * s'écrivait deux fois (le chiffre, puis « De quoi c'est fait · 66 704,82 € »),
 * le détail de ce montant vivait à la fois dans une rangée d'ici et sur la page
 * « Ce qui est dû », trois groupes portaient chacun un chevron pour se replier
 * et une phrase pour se justifier, et la file mêlait quatre formes de carte dont
 * deux portaient leurs boutons — « Retenir », « Écarter », « Oui », « Non »,
 * « Je ne sais pas ». Les mots étaient ceux du logiciel : « Le veilleur »,
 * « Extraction », « Décompte arrêtable », « angles morts ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA RÈGLE : CHAQUE QUESTION DU MATIN A UNE RÉPONSE, À UN SEUL ENDROIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. Combien on me doit → le chiffre, une ligne dessous, et UNE rangée vers
 *      « Ce qui est dû », qui porte déjà tout le détail.
 *   2. Qu'est-ce que je fais → la file, en rangées TOUTES pareilles — avatar,
 *      client, deux lignes, montant —, groupées avec leur compte et leur total,
 *      comme l'écran des dossiers. Ce qui attend une réponse porte un point et
 *      s'ouvre dans une feuille ; le reste mène à son dossier.
 *   3. Ce que fait le logiciel → en bas, en silence, sauf ce qui TRAVAILLE : un
 *      dépôt qui lit, un veilleur qui tourne restent sous les yeux (règle n° 2).
 *
 * C'est le code de Remote et de Wise sur une file d'approbations, relevé sur
 * Mobbin le même jour : aucune rangée n'y porte de bouton.
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
		selecteur,
		palette,
		connexion
	} = valeur;

	/** La zone de dépôt, dépliée par le bouton rond de l'en-tête. */
	const [depotOuvert, setDepotOuvert] = useState(false);
	/**
	 * LES RANGÉES DÉPLIÉES — le travail de fond et les rapprochements.
	 *
	 * ⚠️ UNE SEULE RACINE POUR L'ÉCRAN. Sous 1024 px, chacune s'ouvre en FEUILLE
	 * plutôt que de pousser la file vers le bas ; la feuille a besoin de savoir si
	 * elle est ouverte, et c'est cette liste qui le dit.
	 */
	const [depliees, setDepliees] = useState<readonly string[]>([]);
	/** La rangée dont la feuille de décision est ouverte, par son identité. */
	const [enDecision, setEnDecision] = useState<string | null>(null);

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
	const decision =
		[...parGroupe.values()].flat().find((rangee) => rangee.id === enDecision) ?? null;

	/*
	  ⚠️ CE QUI TRAVAILLE RESTE À L'ÉCRAN ; CE QUI A FINI DEVIENT UNE RANGÉE.
	  C'est la règle d'écran n° 2 — « tout traitement se voit sans qu'on le
	  demande ». Un dépôt qui lit encore, ou qui a échoué, ne se replie pas : le
	  premier change sous les yeux, le second demande un geste.
	*/
	const depotsVivants = depots.filter((rangee) => rangee.depot.statut !== 'TERMINE');
	const depotsFinis = depots.filter((rangee) => rangee.depot.statut === 'TERMINE');
	const veilleurTravaille = travaux.some((tache) => tache.etat === 'EN_COURS');

	/**
	 * LE PREMIER JOUR — et il ne montre AUCUN nombre.
	 *
	 * ⚠️ « 0,00 € » EST UN CADRAN À ZÉRO, que la règle d'écran n° 4 interdit.
	 * Sans factures, le produit ne peut littéralement rien mesurer : tout l'écran
	 * attend ce geste, donc le dépôt est le seul à avoir le droit d'être en grand.
	 */
	const debute = tete.nombreFactures === 0 && rangees.length === 0;

	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				/*
				  ⚠️ LE TITRE EST PUBLIÉ, PAS AFFICHÉ. Les actions occupent la barre seules
				  (`PageHeader`) ; le titre, lui, nomme le retour de la page suivante. Il
				  avait été retiré avec son affichage, et un dossier ouvert d'ici revenait
				  alors vers « Vos clients » au lieu d'« Aujourd'hui ».
				*/
				titre: 'Aujourd’hui',
				/*
				  ⚠️ PAS DE GRAND TITRE, ET PAS DE DATE EN SOUS-TITRE. Verdict du
				  fondateur, le 30/09/2026 au soir : « enlève-moi le Aujourd'hui et la
				  date en dessous, on s'en fout […] et fais un vrai sticky header en
				  haut ». La barre du bas dit déjà où l'on est ; le grand titre et la date
				  coûtaient 78 px au-dessus du seul chiffre qu'on vient lire, et
				  repoussaient la barre d'outils sur une deuxième ligne.

				  Il reste une barre collante compacte — l'établissement, la recherche, le
				  dépôt —, celle de Revolut au-dessus de son solde. La date n'est pas
				  perdue : elle DATE le montant, sous le chiffre, parce que les pénalités
				  courent chaque jour. C'est le seul endroit où elle dit quelque chose.
				*/
				actions: (
					<RangeeDuHaut
						selecteur={selecteur}
						palette={palette}
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
				<FileVide onFichiers={onFichiers} accepteFichiers={accepteFichiers} connexion={connexion} />
			) : (
				<SectionsDepliables ouvertes={depliees} onOuvertesChange={setDepliees}>
					<Tete tete={tete} aujourdHui={aujourdHui} />

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

					{/* CE QUI TRAVAILLE, OU CE QUI A ÉCHOUÉ. Jamais replié. */}
					{depotsVivants.length === 0 ? null : (
						<SourceDeRangees nom="Vos dépôts">
							<div className="flex flex-col gap-cladd-3xs">
								{depotsVivants.map((rangee) => (
									<BilanImport key={rangee.id} depot={rangee.depot} />
								))}
							</div>
						</SourceDeRangees>
					)}
					{veilleurTravaille ? (
						<SourceDeRangees nom="Le travail de fond">
							<TravailEnCours travaux={travaux} />
						</SourceDeRangees>
					) : null}

					{/* CE QUI VOUS MANQUE MONTE AVANT LA FILE : c'est ce qui empêche, et ce
					    qui empêche ne se cherche pas. */}
					<SourceDeRangees nom="Ce qui vous manque">
						<CeQuiManque verrous={verrous} />
					</SourceDeRangees>

					{/* ── LA FILE ───────────────────────────────────────────────────── */}
					<SourceDeRangees nom="Les rangées de la surveillance">
						{groupes.length === 0 ? (
							<p className="px-1 text-cladd-xs text-cladd-fg-soft">
								Rien à trancher aujourd’hui. La surveillance continue sur vos échéances et sur les
								dates limites pour agir en justice.
							</p>
						) : (
							groupes.map(({ cle, rangees: siennes }) => (
								<section key={cle} className="flex flex-col gap-cladd-3xs">
									<EnTeteDeGroupe
										libelle={LIBELLE_GROUPE[cle]}
										nombre={siennes.length}
										total={totalDe(siennes)}
									/>
									<ListeDeCartes>
										{siennes.map((rangee) => (
											<LigneDeFile
												key={rangee.id}
												rangee={rangee}
												onTrancher={() => setEnDecision(rangee.id)}
											/>
										))}
									</ListeDeCartes>
								</section>
							))
						)}

						{/*
						  ⚠️ CE QUE LE PLAFOND A DIFFÉRÉ SE DIT, SOUS LA FILE (D13). Sept
						  propositions par jour, et ce qui dépasse est COMPTÉ : un rangement
						  qui tairait ce qu'il n'a pas montré serait un repli silencieux.
						*/}
						{resumeDuPlafond === null ? null : (
							<p className="px-1 text-cladd-2xs text-cladd-fg-softer">{resumeDuPlafond}</p>
						)}
					</SourceDeRangees>

					{/*
					  ⚠️ LE RAPPROCHEMENT EST UNE TÂCHE, PAS DU TRAVAIL DE FOND. Il vivait
					  parmi les rangées de la machine, alors que c'est un geste du gérant —
					  celui qui empêche de relancer un client qui a déjà payé, la pire erreur
					  d'un logiciel de recouvrement. Il a son groupe, sans urgence inventée :
					  ce n'est pas une alerte, c'est un outil disponible tous les jours.
					*/}
					{lettrages.length === 0 ? null : (
						<section className="flex flex-col gap-cladd-3xs">
							<EnTeteDeGroupe libelle="À rapprocher" nombre={lettrages.length} total={null} />
							<ListeDeRangees>
								{lettrages.map((rangee) => (
									<RangeeDepliable
										key={rangee.id}
										cle={`lettrage-${rangee.id}`}
										famille="ARGENT"
										titre="Un virement reçu"
										glose="Dites de qui il vient : le logiciel solde les bonnes factures, et personne n’est relancé pour ce qu’il a déjà payé."
										// Pas « à rapprocher » : l'en-tête du groupe le dit déjà, et le
										// doublon revenait à la ligne à 375 px. La valeur dit ce qu'on
										// vous demande en ouvrant.
										valeur="De qui ?"
									>
										<Lettrage {...rangee.lettrage} />
									</RangeeDepliable>
								))}
							</ListeDeRangees>
						</section>
					)}

					{/* ── LE TRAVAIL DE FOND ─────────────────────────────────────────── */}
					<ListeDeRangees titre="Le travail de fond">
						{/*
						  ⚠️ ELLE MÈNE À L'ÉCRAN DES DÉPÔTS, ELLE NE LE REDIT PLUS (01/10/2026).
						  Elle ouvrait une feuille où chaque dépôt lu reprenait sa carte de
						  bilan : la même réponse qu'à l'écran « Vos dépôts », à deux endroits.
						  Chaque question a sa réponse à un seul endroit.
						*/}
						{depotsFinis.length === 0 ? null : (
							<RangeeLien
								vers="/app/import-factures"
								famille="PAPIERS"
								titre="Vos dépôts"
								valeur={`${depotsFinis.length} lu${pluriel(depotsFinis.length)}`}
							/>
						)}

						{/* LE VEILLEUR NE DISPARAÎT JAMAIS : un bloc qui n'apparaît que les
						    jours où il s'est passé quelque chose apprend que son absence est
						    normale, et le jour où il manque parce que la machine est tombée,
						    plus rien ne le distingue d'un jour calme. */}
						{travaux.length === 0 ? null : (
							<RangeeDepliable
								cle="veilleur"
								famille="MACHINE"
								titre="Surveillance"
								glose="Ce que le logiciel a relu cette nuit, et ce qu’il relit en ce moment."
								valeur={`${travaux.length} passage${pluriel(travaux.length)}`}
							>
								<Veilleur travaux={travaux} />
							</RangeeDepliable>
						)}

						<LimitesDuCalcul hypotheses={hypotheses} anglesMorts={anglesMorts} />

						{/*
						  ⚠️ « LES ÉCRANS DE L'ANCIENNE VERSION » SONT PARTIS LE 30/09/2026, avant
						  leur date de fermeture du 17 octobre. Verdict du fondateur : « on s'en
						  fout aussi ». Ses quatre liens menaient à des écrans que le produit
						  atteint déjà ailleurs — la barre du bas pour les clients et les
						  dossiers, le bouton de dépôt pour les imports, « Jamais réclamé » pour
						  ce qui est dû. `/app/procedures` n'était plus qu'une redirection ; il
						  rejoint les anciennes adresses d'`aucun-ecran-orphelin.test.ts`.
						*/}
					</ListeDeRangees>

					{/*
					  ⚠️ L'ANNONCE DE LA NUIT EST UNE LIGNE, PLUS UN BANDEAU. Elle ouvrait
					  l'écran du matin, en tête, avec sa croix : une cible de plus et trois
					  lignes pour dire ce que la machine a fait pendant que le gérant dormait.
					  Elle ne porte rien de chiffré qui ne vive ailleurs (le bilan daté du
					  dépôt) : sa place est avec ce qui n'appelle aucune décision.
					*/}
					{annonce === undefined ? null : (
						<p className="px-1 text-cladd-2xs text-cladd-fg-softer">{annonce}</p>
					)}
					<PliDeLaFile faits={repliees.map((r) => r.pli)} />

					{decision === null ? null : (
						<FeuilleDeDecision
							ouverte
							onFermer={() => setEnDecision(null)}
							titre={decision.debiteur}
							enonce={decision.genre === 'LITIGE' ? decision.question : decision.obstacle}
							montant={decision.montant}
							{...(decision.proposition === undefined ? {} : { proposition: decision.proposition })}
							{...(decision.genre === 'LITIGE'
								? {
										reponses: {
											onRepondre: decision.onRepondre,
											enCours: decision.enCours === true
										}
									}
								: {})}
							{...(decision.destination === undefined ? {} : { destination: decision.destination })}
						/>
					)}
				</SectionsDepliables>
			)}
		</PageEcran>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA RANGÉE DU HAUT
// ─────────────────────────────────────────────────────────────────────────

/**
 * L'ÉTABLISSEMENT, LA RECHERCHE ET LE DÉPÔT — trois cibles, et plus quatre.
 *
 * ⚠️ L'AVATAR EST PARTI LE 30/09/2026. Il menait au compte, que le quatrième
 * onglet de la barre du bas ouvre déjà : deux chemins vers le même écran, à
 * vingt centimètres l'un de l'autre. Son propre commentaire l'admettait — « le
 * laisser tomber ne casserait rien ».
 *
 * ⚠️ ET ELLE NE DÉFILE PAS. Elle vit dans l'en-tête de `PageEcran` : sur un
 * écran qui porte cent cinquante rangées, une recherche qui part vers le haut à
 * la deuxième rangée lue est une recherche qu'on n'a plus.
 *
 * ⚠️ LE SÉLECTEUR EST PERMANENT, y compris sur un compte mono-site. Le
 * cloisonnement est strict par établissement.
 */
function RangeeDuHaut({
	selecteur,
	palette,
	depotOuvert,
	onDepot,
	avecDepot
}: {
	selecteur?: ReactNode;
	palette?: ReactNode;
	depotOuvert: boolean;
	onDepot: () => void;
	avecDepot: boolean;
}) {
	return (
		<div className="flex w-full flex-wrap items-center justify-between gap-2">
			<div className="flex min-w-0 shrink-0 items-center gap-2">{selecteur}</div>

			<div className="ml-auto flex shrink-0 items-center gap-2">
				{palette}
				{avecDepot ? (
					/*
					  LE DÉPÔT, EN BOUTON ROND. Il OUVRE la zone, il ne la remplace pas :
					  `ZoneDepot` porte les quatre gestes qu'un gérant fait selon d'où il
					  vient — photographier, parcourir, glisser, coller. `square` : sans
					  lui, la largeur suit l'icône et la cible tombe sous le doigt.
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
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA TÊTE, RENDUE
// ─────────────────────────────────────────────────────────────────────────

/**
 * COMBIEN ON ME DOIT — le chiffre, une ligne, et le chemin vers le détail.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE MONTANT S'ÉCRIVAIT DEUX FOIS, ET SON DÉTAIL AUSSI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sous le chiffre : trois pastilles, puis « De quoi c'est fait · 66 704,82 € »
 * — le même montant, cent pixels plus bas —, dont la feuille rendait la
 * décomposition et les factures non chiffrées. La page « Ce qui est dû » rend
 * EXACTEMENT les mêmes choses, facture par facture. Il ne reste donc qu'un
 * chemin : la rangée « Jamais réclamé », qui porte le seul chiffre que la
 * comptabilité du gérant ne lui donne pas — et le reçu entier derrière, comme
 * « Order receipt » chez Shop.
 *
 * ⚠️ LA FACTURE NON COMPTÉE RESTE SOUS LE CHIFFRE, TOUJOURS. C'est la règle
 * d'amputation de `revelation.ts` : « un total silencieusement amputé est pire
 * qu'un total incomplet annoncé ». Elle se distingue par la graisse, pas par une
 * couleur de seuil.
 *
 * ⚠️ LE MONTANT SOUS PRÉAVIS DE PRESCRIPTION N'EST PLUS UNE PASTILLE ICI : chaque
 * dossier concerné est une rangée de la file, dans le groupe du jour, avec sa
 * date. La pastille orange disait la même chose en agrégé, cent pixels au-dessus.
 */
function Tete({ tete, aujourdHui }: { tete: TeteDeFile; aujourdHui: string }) {
	const enRetard = tete.nombreFactures;
	const nonComptees = tete.nonChiffrees.length;
	const jamaisReclame = tete.parts.interets + tete.parts.indemnites;

	return (
		<div className="flex flex-col gap-cladd-2xs">
			{/*
			  ⚠️ CENTRÉ, À LA DEMANDE DU FONDATEUR (30/09/2026). Sans grand titre au-dessus,
			  rien n'impose plus le bord gauche : c'est le solde de Revolut sous sa barre
			  compacte. La page dossier, elle, garde le sien à gauche, sous le nom du
			  client — là, le titre donne le bord.
			*/}
			<ChiffreHero
				className="py-cladd-3xs"
				centimes={tete.total}
				// La date du jour vit ICI, et plus en sous-titre d'écran : elle date le
				// chiffre, qui monte chaque jour avec les pénalités.
				surTitre={`Ce qu’on vous doit au ${dateCourte(aujourdHui)}`}
				legende={
					<>
						{enRetard === 0 ? null : `${enRetard} facture${pluriel(enRetard)} en retard`}
						{nonComptees === 0 ? null : (
							<span className="font-semibold text-cladd-fg">
								{enRetard === 0
									? `${nonComptees} facture${pluriel(nonComptees)} non comptée${pluriel(nonComptees)}`
									: ` · ${nonComptees} non comptée${pluriel(nonComptees)}`}
							</span>
						)}
					</>
				}
			/>

			{/* DEPUIS COMBIEN DE TEMPS : la forme sous le nombre (Afterpay). */}
			<BandeDAnciennete lignes={tete.anciennete} aujourdHui={aujourdHui} />

			{/*
			  ⚠️ ELLE NE S'AFFICHE QUE QUAND IL Y A QUELQUE CHOSE À MONTRER. Une rangée
			  « 0,00 € jamais réclamés » est un cadran à zéro.
			*/}
			{jamaisReclame > 0n ? (
				<CarteLien
					vers="/app/revelation"
					icone={<VignetteRangee famille="ARGENT" className="size-10" />}
					titre="Jamais réclamé"
					ligne="Pénalités et frais, dus de plein droit"
					montant={eurosCentimes(jamaisReclame)}
				/>
			) : null}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// UNE RANGÉE DE LA FILE
// ─────────────────────────────────────────────────────────────────────────

/**
 * UNE CARTE DE LA FILE — la même, quel que soit ce qu'elle porte.
 *
 * ⚠️ LA CARTE DES DOSSIERS ET DES CLIENTS (`carte-rangee.tsx`), et c'est voulu :
 * un gérant apprend UNE carte pour tout le produit. Le client et son montant
 * sur la première ligne ; ce qui se passe, nommé en cinq mots, et sa date sur
 * la seconde.
 *
 * ⚠️ CE QUI ATTEND UNE RÉPONSE PORTE LA PASTILLE DES QUESTIONS, ET S'OUVRE EN
 * FEUILLE ; le reste MÈNE à son dossier. Deux comportements, un seul signe pour
 * les distinguer. Il était un point de six pixels devant le nom, qui décalait
 * le nom et qu'on prenait pour une puce de liste.
 */
function LigneDeFile({
	rangee,
	onTrancher
}: {
	readonly rangee: RangeeGroupee;
	readonly onTrancher: () => void;
}) {
	const date = rangee.genre === 'OBSTACLE' ? rangee.dateDuFait : undefined;
	const decision = aTrancher(rangee);
	const contenu = {
		titre: rangee.debiteur,
		/*
		  ⚠️ UNE QUESTION DE LITIGE N'A PAS DE NOM PROPRE : elle est toujours la
		  même chose pour le gérant, une réponse qu'on lui demande. Sa phrase
		  entière — « ce client vous a-t-il écrit pour contester… » — est dans la
		  feuille, où l'on répond.
		*/
		ligne: rangee.genre === 'LITIGE' ? 'Une question pour vous' : rangee.libelle,
		// CE QUI ATTEND UNE RÉPONSE PORTE LA PASTILLE DES QUESTIONS, quelle que soit
		// sa famille : c'est elle, et non un point devant le nom, qui distingue ce
		// qui s'ouvre en feuille de ce qui mène au dossier.
		famille: rangee.genre === 'OBSTACLE' && !decision ? rangee.famille : ('QUESTION' as const),
		...(rangee.montant === null ? {} : { montant: eurosCentimes(rangee.montant) }),
		...(date === undefined ? {} : { date: dateCourte(date) })
	};

	if (decision) return <CarteBouton {...contenu} attention onClick={onTrancher} />;

	/*
	  ⚠️ UNE RANGÉE SANS DESTINATION S'OUVRE QUAND MÊME : sur la feuille, qui rend
	  la phrase entière. Une carte qui ne mènerait nulle part laisserait sa phrase
	  illisible.
	*/
	if (rangee.destination === undefined) return <CarteBouton {...contenu} onClick={onTrancher} />;

	return (
		<CarteLien
			{...contenu}
			vers={rangee.destination.vers}
			parametres={rangee.destination.parametres}
		/>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// CE QUE LE LOGICIEL SUPPOSE, ET CE QU'IL NE VOIT PAS
// ─────────────────────────────────────────────────────────────────────────

/**
 * LES LIMITES DU CALCUL — ce qui a été supposé, et ce qui n'est pas vu.
 *
 * ⚠️ REPLIÉE, MAIS COMPTÉE SUR SA RANGÉE. Les replier n'est pas les cacher : la
 * rangée DIT combien il y en a, et un chiffre sur une rangée fermée se voit
 * mieux qu'un paragraphe quatre écrans plus bas. Ce qui serait interdit, c'est
 * de les retirer : « un utilisateur qui croit sa prescription surveillée ne la
 * surveille pas lui-même ».
 *
 * ⚠️ « HYPOTHÈSE » ET « ANGLE MORT » NE S'ÉCRIVENT PLUS SUR LA RANGÉE. Ce sont
 * les mots du logiciel ; la feuille dit, elle, « ce qu'il a supposé » et « ce
 * qu'il ne surveille pas », et la rangée n'en porte que le total.
 *
 * ⚠️ ET LES DEUX RESTENT DISTINCTS DANS LA FEUILLE. Une supposition se LÈVE en
 * renseignant la donnée ; ce qui n'est pas surveillé ne se lève pas depuis
 * l'interface. Les fondre ferait croire l'un ou l'autre faux.
 */
function LimitesDuCalcul({
	hypotheses,
	anglesMorts
}: {
	hypotheses: readonly string[];
	anglesMorts: readonly string[];
}) {
	if (hypotheses.length === 0 && anglesMorts.length === 0) return null;

	/*
	  ⚠️ UN SEUL COMPTE SUR LA RANGÉE, LES DEUX DANS LA FEUILLE. « 1 hypothèse ·
	  2 angles morts » revenait à la ligne des deux côtés à 393 px, titre et
	  valeur : trois lignes pour une rangée. Le total reste à l'écran — c'est ce
	  que la règle protège : que le compte ne disparaisse jamais — et la feuille
	  sépare ce qui se lève de ce qui ne se lève pas.
	*/
	const compte = hypotheses.length + anglesMorts.length;

	return (
		<RangeeDepliable
			cle="limites"
			famille="MACHINE"
			titre="Limites du calcul"
			glose="Ce que le logiciel a supposé faute de donnée, et ce qu’il ne surveille pas du tout."
			valeur={`${compte}`}
		>
			{hypotheses.length === 0 ? null : (
				<div className="flex flex-col gap-cladd-3xs">
					<p className="text-cladd-2xs font-semibold text-cladd-fg-soft">
						Ce qu’il a supposé — un calcul fait sur une donnée absente. Renseigner la donnée lève la
						supposition.
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
			  TROIS RANGÉES FANTÔMES, ESTOMPÉES — la forme exacte des vraies.

			  ⚠️ ELLES MONTRENT LE CHEMIN, ELLES NE COMPTENT RIEN. Un écran vide qui
			  ne dit pas à quoi il ressemblera une fois plein oblige à déposer pour
			  savoir ce qu'on achète. Ce sont des exemples PLAUSIBLES, jamais des
			  chiffres du gérant : `aria-hidden`, estompées, inertes — une rangée qui
			  a l'air cliquable et ne fait rien est pire qu'une rangée qui n'en a pas
			  l'air.
			*/}
			<div aria-hidden className="pointer-events-none opacity-40" inert>
				<ListeDeCartes>
					{FANTOMES.map((fantome) => (
						<CarteBouton
							key={fantome.libelle}
							titre={fantome.titre}
							ligne={fantome.libelle}
							famille={fantome.famille}
							date={dateCourte(fantome.dateDuFait)}
							montant={eurosCentimes(fantome.montant)}
							onClick={() => undefined}
						/>
					))}
				</ListeDeCartes>
			</div>
		</SectionEcran>
	);
}

/**
 * Les trois rangées que le gérant lira une fois ses factures déposées.
 *
 * Une par argument de vente, dans l'ordre où le produit les vend : la
 * prescription qui éteint un droit sans que personne n'ait rien fait, les
 * pénalités que personne n'a calculées, et l'échéance illisible qu'il faut
 * relever. Trois, parce que c'est assez pour lire la forme d'une rangée et
 * trop peu pour qu'on les prenne pour des données.
 */
const FANTOMES: readonly {
	readonly titre: string;
	readonly libelle: string;
	readonly famille: FamilleRangee;
	readonly montant: bigint;
	readonly dateDuFait: string;
}[] = [
	{
		titre: 'Un de vos clients',
		libelle: 'Date limite pour agir',
		famille: 'TEMPS',
		montant: 3_120_050n,
		dateDuFait: '2026-10-27'
	},
	{
		titre: 'Un autre de vos clients',
		libelle: 'Pénalités et frais calculés',
		famille: 'ARGENT',
		montant: 1_248_033n,
		dateDuFait: '2026-11-12'
	},
	{
		titre: 'Un troisième',
		libelle: 'Échéance illisible',
		famille: 'PAPIERS',
		montant: 41_200n,
		dateDuFait: '2026-12-02'
	}
];
