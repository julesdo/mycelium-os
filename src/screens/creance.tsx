import { useState } from 'react';
import { SECTIONS_CREANCE, type SectionCreance } from './sections-creance';
import { SectionTitle } from '@cladd-ui/react';
import { FileDownIcon, InfoIcon } from 'lucide-react';
import type { FicheParametre } from '../lib/verticales/recouvrement/referentiel';
import {
	ApercuDuSuivi,
	Avatar,
	BandeauDossierClasse,
	SuiviEcheancier,
	choixDeLAccord,
	type EcheancierAffiche,
	BoutonDeReponse,
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	CeQuiBloque,
	ChiffreHero,
	Courriers,
	Decompte,
	EtatDuDossier,
	FeuilleVoie,
	LiensDePaiement,
	LigneAnalyse,
	LigneBouton,
	ListeAnalyses,
	ListeDeRangees,
	PageEcran,
	PanneauDuGeste,
	ParcoursProfessionnels,
	Pieces,
	RangeeDepliable,
	RangeeLien,
	RefusEnQuatreParties,
	SectionsDepliables,
	TableauDeBord,
	ZoneDuTableau,
	Solidite,
	SuiviDuDossier,
	SuiviProcedure,
	Tableau,
	TableauCellule,
	TableauConditions,
	TableauCorps,
	TableauEntete,
	TableauLigne,
	TableauTitre,
	dateCourte,
	eurosCentimes,
	pluriel,
	useDeuxVolets,
	useSectionOuverte,
	type AlerteDossier,
	type CourriersDuDossier,
	type DecompteAffiche,
	type FicheIntervenant,
	type AnnuaireDuParcours,
	type Lecture,
	type LectureEtapesAffichee,
	type LiensDePaiementAffiches,
	type LigneConditionAffichee,
	type NiveauAffiche,
	type OptionTypePiece,
	type OrdreImputationAffichee,
	type PieceAffichee,
	type QuestionLitige,
	type ReponseFait,
	type SituationAffichee,
	type SoliditeAffichee,
	type SuiviAffiche,
	type SuiviDossierAffiche,
	type VoieAffichee,
	type EtapeAVenir,
	NOM_DU_PILOTE,
	Plume,
	PlumeSurLeDossier,
	RangeeDeReponses,
	SuiteDuPlan,
	TexteQuiMene,
	dateRelative,
	type HumeurPlume
} from '../ui';
import { TITRE_ECRAN } from './titres';
import type { DossierDuGuide, GestesDuGuide } from './dossier-guide/commun';
import {
	ConversationDuDossier,
	estGuidee,
	menerHorsConversation,
	type SortiesDeLaConversation
} from './dossier-guide/conversation';
import type { DossierPourLesIntentions, IntentionDuDossier } from './dossier-guide/intentions';
import { voiesDeclarables } from './dossier-guide/fil-procedure';
import type { PromesseAVerifier } from './dossier-guide/fil-promesse';
import type { RappelDuJour } from './dossier-guide/fil-rappel-du-jour';

/**
 * UN DOSSIER — COMBIEN, OÙ ON EN EST, ET LE SEUL GESTE QUI COMPTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE REPROCHE DU 30/09/2026 AU SOIR, ET CE QU'IL MESURAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mot pour mot : « on doit cliquer partout, il n'y a rien de clair […] tu crois
 * qu'en mettant plein de boutons et de trucs cliquables on va prouver que c'est
 * une app bien et utile, alors que c'est totalement faux ! Less is more. »
 *
 * Relevé à 393 px, la largeur des captures de référence : VINGT cibles dans la
 * page, qui ne faisaient que QUATRE choses. « Préparer » (un disque),
 * « Préparer un courrier » (un bouton) et « Courriers » (une rangée) ouvraient le
 * même panneau ; « Les suites » s'écrivait trois fois, « Lui écrire » deux fois,
 * « Décompte » deux fois. Et les mots étaient ceux du logiciel : « Solidité 1 sur
 * 4 », « Les chiffres de la loi 42 sur 45 », « Supposé : … ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA RÈGLE : CHAQUE QUESTION A UNE RÉPONSE, À UN SEUL ENDROIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le code de Shop sur une commande (relevé sur Mobbin le même jour) : un
 * titre qui répond à la seule question, une barre fine, les trois derniers
 * événements puis « View all activity », et une seule carte d'actions rares. Le
 * reçu — le détail du montant — est à un appui, jamais à plat.
 *
 *   1. Combien, jusqu'à quand → le montant, et la date limite pour agir dessous.
 *   2. Ce qui change la donne → une ligne par situation ; le détail au toucher.
 *   3. Où on en est, que faire → l'état en toutes lettres, la barre, UN bouton.
 *   4. Ce qui s'est passé → les trois derniers faits, puis tout l'historique.
 *   5. Le reste → six rangées, et pas une de plus.
 *
 * ⚠️ UNE COLONNE, À TOUTES LES LARGEURS. Les deux colonnes de 1024 px séparaient
 * « le temps » de « la matière » : une taxonomie à apprendre, et un œil qui
 * zigzague. Shop, Apple et Revolut rendent le détail d'un objet en une colonne ;
 * au-delà de 1024 px les panneaux se déplient sur place, c'est tout ce qui change.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET ELLE NE RECOMMANDE TOUJOURS RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Troisième ligne rouge : le bouton unique ne doit pas devenir une
 * recommandation déguisée. Il nomme un geste de bureau — « Relancer », « Relire
 * le courrier », « Préparer un courrier » — et JAMAIS une voie de droit ; les
 * voies restent une rangée qui énumère sans classer. `page-dossier.test.ts` lit
 * les libellés de `gesteDuDossier` pour le vérifier.
 */
/** Une hypothèse du logiciel, adossée au fait qui l'a produite. */
export interface HypotheseAffichee {
	readonly cle: string;
	/** Ce que le logiciel a retenu, en toutes lettres. */
	readonly enonce: string;
	/** Le fait qui l'a produite : « le secteur du client n'est pas renseigné ». */
	readonly fait: string;
	/** Ce qui la lève, au constat. Jamais un conseil. */
	readonly ceQuiLaLeve: string;
}

/** Ce que le logiciel ne voit pas, chiffré quand c'est chiffrable. */
export interface AngleMortAffiche {
	readonly cle: string;
	readonly constat: string;
	/** Ce qui n'est pas surveillé, en euros. `null` : non chiffrable, et dit. */
	readonly montantEnJeu: bigint | null;
}

/** Un montant réclamé : daté quand un document l'a réclamé, et il ne change plus. */
export interface DecompteArreteAffiche {
	readonly id: string;
	readonly arreteAu: string;
	readonly total: bigint;
}

/** Un risque de la créance, tel que le score le constate. */
export interface RisqueAffiche {
	readonly type: string;
	readonly description: string;
	readonly gravite: string;
}

/**
 * LES PANNEAUX DE LA PAGE — CINQ RANGÉES, ET L'HISTORIQUE.
 *
 * ⚠️ IL Y EN AVAIT DIX. « Relances » est entrée dans « Courriers et e-mails » :
 * pour le gérant, un e-mail de relance et une lettre sont la même chose — lui
 * écrire —, et deux rangées l'obligeaient à savoir laquelle ouvrir. « Solidité »
 * est entrée dans « Documents », dont elle compte les pièces. « Les chiffres de
 * la loi » sont entrés dans « Pénalités et frais », qui les emploie. Et
 * l'historique n'a plus de rangée : ses trois derniers faits sont à plat, et
 * son bouton ouvre le reste (`PanneauDuGeste`).
 *
 * ⚠️ L'ÉTAT OUVERT RESTE UN ÉTAT, ADRESSABLE, ET UN SEUL. Une seule racine
 * d'accordéon pour la page, une seule liste d'ouvertes : le bouton de l'état du
 * dossier et la rangée qu'il ouvre ne peuvent pas se désaccorder.
 */
export { SECTIONS_CREANCE, type SectionCreance } from './sections-creance';

/**
 * CE QUE LA PAGE MONTRE, ET CE QU'ELLE DÉCLENCHE.
 *
 * ⚠️ TOUT ARRIVE EN PROPRIÉTÉS. Cet écran ne parle à aucune fonction Convex :
 * c'est ce qui permet de l'ouvrir aux quatre largeurs de référence depuis la
 * salle d'exposition, sans backend ni authentification.
 */
export interface CreanceOuverte {
	/** L'identifiant de la créance, pour les liens qui la prennent en paramètre. */
	readonly identifiant: string;
	readonly debiteur: string;
	readonly debiteurId: string;
	/**
	 * PRÉPARÉ PAR PLUME, PAS ENCORE DÉMARRÉ. La page le dit en tête, avec le seul
	 * geste qui compte alors : le démarrer, guidé par Plume. Rien ne part avant.
	 */
	readonly aDemarrer?: boolean;
	/** Ouvre le démarrage guidé de ce dossier. */
	readonly onDemarrer?: () => void;
	/** Le gérant a retiré ce client du pilote : Plume suit ses dates sans le relancer. */
	readonly horsPilote?: boolean;
	/** Le total des factures du dossier, et ce qui en est déjà rentré : « Récupéré ». */
	readonly totalFactures?: bigint;
	readonly dejaRecupere?: bigint;
	/** Ouvre la conversation de Plume sur ce dossier, une question prête dans le champ. */
	readonly onDemanderAPlume?: (question?: string) => void;
	/**
	 * LES GESTES DE LA CONVERSATION DU DOSSIER (22/10/2026) : sa promesse, un paiement
	 * en plusieurs fois, une contestation, une note, un rappel, le classement. Absents,
	 * la conversation ne propose que ce qui mène ailleurs.
	 */
	readonly gestesGuides?: GestesDuGuide;
	/** La fiche du client, sa feuille « Un virement reçu » ouverte. */
	readonly onNoterUnReglement?: () => void;
	/**
	 * L'adresse électronique du client, quand elle est connue.
	 *
	 * ⚠️ SANS ELLE, UN BROUILLON N'A PAS DE DESTINATAIRE. Elle voyage jusqu'ici
	 * pour que la section des relances puisse ouvrir la messagerie du gérant, ou
	 * dire ce qui l'en empêche et où le réparer.
	 */
	readonly debiteurEmail?: string;
	readonly santeDebiteur: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly nombreFactures: number;
	readonly principalRestantDu: bigint;

	// ── 0. Où en est le dossier : les quatre étapes, déduites des faits ────────
	readonly etapes: LectureEtapesAffichee;
	/** Ce qui se pose par-dessus les étapes : contestation, procédure collective, paiement partiel, radiation. */
	readonly situations: readonly SituationAffichee[];
	/** Les courriers du dossier : préparés ici, validés par un administrateur, envoyés par le gérant. */
	readonly courriers: CourriersDuDossier;
	/** Les adresses publiques où le client peut payer, et ce qu'il faut pour en ouvrir une. */
	readonly liensDePaiement: LiensDePaiementAffiches;
	/**
	 * Ce qui s'est passé sur le dossier : le journal de la machine et les notes
	 * du gérant.
	 *
	 * ⚠️ PAS `suivi`, QUI EST DÉJÀ PRIS par le suivi de PROCÉDURE — la machine à
	 * états d'une injonction. Deux `suivi` sur le même objet se confondraient au
	 * premier coup d'œil, et ce ne sont pas du tout les mêmes faits.
	 */
	readonly suiviDuDossier: SuiviDossierAffiche;

	// ── 1. L'en-tête : de qui, combien, jusqu'à quand ───────────────────────
	/**
	 * L'échéance la plus ancienne des factures du dossier, ou `null` quand
	 * aucune n'en porte. Un dossier sans échéance lisible ne se tait pas : la
	 * rangée le dit, parce que c'est elle qui fait courir les intérêts.
	 */
	readonly echeanceLaPlusAncienne: string | null;
	/**
	 * LA SUITE DU PLAN, AU FUTUR : ce que le pilote fera, et quand. Vide pour un
	 * dossier réglé, au tribunal ou au bout du plan.
	 */
	readonly planAVenir?: readonly EtapeAVenir[];
	/**
	 * LA PAROLE DU CLIENT QUI FAIT TAIRE LE PLAN (08/10/2026) : une promesse en
	 * cours, un échéancier tenu, et jusqu'à quand (`verticales/recouvrement/parole.ts`).
	 */
	readonly pause?: {
		readonly raison: 'PROMESSE' | 'ECHEANCIER';
		readonly le: string;
		readonly jusquAu: string;
		readonly montant?: bigint;
	};
	/**
	 * LE DOSSIER CLASSÉ PAR LE GÉRANT (08/10/2026), et le geste qui le rouvre. Le
	 * classer se fait dans la conversation du dossier (`gestesGuides`).
	 */
	readonly classement?: { readonly libelle: string; readonly le: string; readonly note?: string };
	readonly onRouvrirLeDossier?: () => void;
	/**
	 * LA PAROLE DU CLIENT (08/10/2026) — ce qui reste dû (le montant proposé d'office,
	 * la somme d'un échéancier) et l'échéancier qui court. Ce qu'il a répondu se note
	 * dans la conversation du dossier (`gestesGuides`).
	 */
	readonly reponse?: {
		readonly resteDu: bigint;
		readonly echeancier: EcheancierAffiche | null;
		readonly onArreterEcheancier: (id: string) => void;
	};
	/** Le gérant a laissé le pilote relancer seul : le plan dit alors « le pilote l’envoie ». */
	readonly envoiAutomatique?: boolean;
	/** La prescription la plus proche, celle qui éteint la première. */
	readonly prescriptionLaPlusProche: string | null;

	// ── 2. Le décompte, décomposé ───────────────────────────────────────────
	/** Le calcul du jour. `null` quand il ne se fait pas : `refusDuMontant` dit pourquoi. */
	readonly montantDuJour: DecompteAffiche | null;
	/** Les quatre parties du refus, quand le montant ne se calcule pas. */
	readonly refusDuMontant: {
		readonly peutFaire: string;
		readonly constat: string;
		readonly blocages: readonly string[];
		readonly coutDeLAttente: string;
	} | null;
	/** Les valeurs juridiques employées, telles qu'elles vivent dans `parametres.ts`. */
	readonly fiches: readonly FicheParametre[];
	/** Ce qui a été RÉCLAMÉ sur ce dossier, daté : chaque montant reste tel qu'il est parti. */
	readonly decomptesArretes: readonly DecompteArreteAffiche[];
	/**
	 * Le calcul du jour en PDF : le montant se date au téléchargement, comme quand
	 * un courrier le réclame. `null` quand il ne se calcule pas.
	 */
	readonly onTelechargerLaPiece: (() => void) | null;

	// ── 3. Ce qui est supposé, et ce qui n'est pas vu ───────────────────────
	readonly hypotheses: readonly HypotheseAffichee[];
	readonly anglesMorts: readonly AngleMortAffiche[];

	// ── 4. Le litige, et ce que le gérant seul peut dire ────────────────────
	readonly litige: {
		readonly litigieux: boolean;
		readonly constats: readonly string[];
		readonly questions: readonly QuestionLitige[];
	};
	/** Ce que dit la loi, ce qu'il y a dans le dossier, ce que le gérant a répondu. */
	readonly lignesConditions: readonly LigneConditionAffichee[];
	readonly onDeclarerFait: (cle: string, reponse: ReponseFait) => void;
	readonly onRepondreCondition: (condition: string, reponse: 'ok' | 'ko') => void;
	/** Le gérant choisit l'ordre d'imputation de ses paiements, pour ce dossier. */
	readonly onChoisirImputation?: (ordre: OrdreImputationAffichee) => void;

	// ── 5. La solidité, et ce qui affaiblit le dossier ──────────────────────
	readonly solidite: SoliditeAffichee;
	readonly risques: readonly RisqueAffiche[];

	// ── 6. Les pièces ───────────────────────────────────────────────────────
	readonly pieces: readonly PieceAffichee[];
	readonly optionsTypePiece: readonly OptionTypePiece[];
	/** Ouvre le parcours de dépôt au coffre, le même partout. */
	readonly onAjouterPieces: () => void;
	/** Ouvre une pièce en plein écran dans la visionneuse du coffre. */
	readonly onOuvrirPiece: (pieceId: string) => void;
	readonly onClasser: (pieceId: string, type: string) => void;

	// ── 7. Les faits consignés et la voie ───────────────────────────────────
	/** Ce qui court depuis l'engagement, ou `null`. Vient de `suiviDeLaCreance`. */
	readonly suivi: SuiviAffiche | null;
	readonly voies: readonly VoieAffichee[];
	readonly carnet: readonly FicheIntervenant[];
	/**
	 * Les professionnels du dossier, relus PAR IDENTIFIANT (06/10/2026 : il peut
	 * y en avoir plusieurs). Vide : moi-même.
	 */
	readonly intervenantsChoisis: readonly string[];
	readonly nomsIntervenants: readonly string[];
	/** La date du FAIT, jamais celle de la saisie. */
	readonly onConsigner: (cle: string, survenuLe: string) => void;
	/**
	 * Les professionnels du dossier, tels que le parcours du choix les confirme :
	 * ceux qui manquent s'ajoutent, ceux qui n'y sont plus se retirent. Vide :
	 * « Moi-même ».
	 */
	readonly onNommer: (intervenantIds: readonly string[]) => void;
	/**
	 * L'annuaire du parcours du choix (12/10/2026) : le carnet en tête, puis les
	 * professionnels près du client ou de toute la France, page après page.
	 */
	readonly professionnels: AnnuaireDuParcours;

	// ── 8. Les brouillons de relance ────────────────────────────────────────
	readonly relances: readonly NiveauAffiche[];

	readonly enCours: boolean;
	readonly erreur: string | null;
	/** La date du jour, venue de la SEULE horloge de l'interface. */
	readonly aujourdHui: string;
}

/** Ce que le gérant seul peut encore dire : les faits du litige et les conditions à confirmer. */
function aConfirmer(creance: {
	readonly litige: { readonly questions: readonly unknown[] };
	readonly lignesConditions: readonly LigneConditionAffichee[];
}): number {
	return (
		creance.litige.questions.length +
		creance.lignesConditions.filter((l) => l.repondable && l.etatReponse !== 'CONFIRMEE').length
	);
}

/** La conversation du dossier : ouverte ou non, et ce qu'elle sait déjà en s'ouvrant. */
interface EtatDeConversation {
	readonly ouverte: boolean;
	/** Le geste déjà choisi, ou « Que voulez-vous faire ? ». */
	readonly depart: IntentionDuDossier | null;
	/** Le courrier à relire. */
	readonly envoi: string | null;
	/** La démarche déjà choisie (« Je l'ai engagée » sur sa fiche). */
	readonly voie: string | null;
	/** La réponse déjà donnée sur la carte de Plume (« Non », « Plus tard »). */
	readonly reponse: string | null;
	/** L'accord écrit, ouvert depuis l'échéancier qui court. */
	readonly accord: boolean;
	/** Remonte la conversation à chaque ouverture : elle repart de sa première question. */
	readonly jeton: number;
}

const CONVERSATION_FERMEE: EtatDeConversation = {
	ouverte: false,
	depart: null,
	envoi: null,
	voie: null,
	reponse: null,
	accord: false,
	jeton: 0
};

export function EcranCreance({
	donnees,
	ouvrirAuDepart,
	faireAuDepart,
	envoiAuDepart
}: {
	donnees: Lecture<CreanceOuverte>;
	/**
	 * Le geste à ouvrir à l'arrivée (`?faire=`, 23/10/2026) : « La relire » sous le mot
	 * de Plume, une notification, mènent à la conversation déjà répondue.
	 */
	faireAuDepart?: IntentionDuDossier;
	/** Le courrier que le lien désigne, pour « Relire le courrier ». */
	envoiAuDepart?: string;
	/** La rubrique à ouvrir à l'arrivée (`?ouvrir=`) : un lien qui MÈNE, pas qui décrit. */
	ouvrirAuDepart?: SectionCreance;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;
	const deuxVolets = useDeuxVolets();
	/**
	 * LA CONVERSATION DU DOSSIER (22/10/2026) : ouverte, et le geste déjà choisi. Le
	 * jeton la remonte à chaque ouverture : elle repart de sa première question.
	 */
	const [conversation, setConversation] = useState<EtatDeConversation>(() =>
		faireAuDepart !== undefined
			? {
					...CONVERSATION_FERMEE,
					ouverte: true,
					depart: faireAuDepart,
					envoi: envoiAuDepart ?? null
				}
			: ouvrirAuDepart === 'litige'
				? { ...CONVERSATION_FERMEE, ouverte: true, depart: 'QUESTIONS' }
				: CONVERSATION_FERMEE
	);

	/**
	 * LES PANNEAUX OUVERTS — aucun à l'arrivée.
	 *
	 * ⚠️ RIEN NE S'OUVRE TOUT SEUL. Ce que l'ouverture automatique achetait, la
	 * VALEUR de la rangée le rend gratuitement : « 7 attendues » se lit rangée
	 * fermée. Et rien ne se synchronise dans un effet — un rendu de retard se
	 * voit comme un clignotement à l'arrivée des données.
	 */
	const [ouvertes, setChoisies] = useState<readonly SectionCreance[]>(
		ouvrirAuDepart === undefined || ouvrirAuDepart === 'litige' ? [] : [ouvrirAuDepart]
	);

	/** Remplace la liste des panneaux ouverts, en ne gardant que ceux de la page. */
	function changer(liste: readonly string[]) {
		setChoisies(
			liste.filter((cle): cle is SectionCreance =>
				(SECTIONS_CREANCE as readonly string[]).includes(cle)
			)
		);
	}

	/**
	 * Ouvre la rangée que le bouton de l'état désigne.
	 *
	 * ⚠️ ON NE FAIT DÉFILER QU'AU-DELÀ DE 1024 PX. En dessous, la rangée se
	 * présente en feuille par-dessus la page : faire défiler la page SOUS la
	 * feuille la déplaçait derrière le doigt, et on la retrouvait ailleurs en
	 * refermant.
	 */
	function ouvrir(cle: SectionCreance) {
		// « Vos réponses » n'est plus une rangée : ses questions se posent dans la conversation.
		if (cle === 'litige') {
			if (pret?.gestesGuides !== undefined) {
				setConversation((avant) => ({
					...CONVERSATION_FERMEE,
					ouverte: true,
					depart: 'QUESTIONS',
					jeton: avant.jeton + 1
				}));
			}
			return;
		}
		setChoisies([...ouvertes.filter((c) => c !== cle), cle]);
		if (!deuxVolets) return;
		requestAnimationFrame(() =>
			document
				.getElementById(`rangee-${cle}`)
				?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		);
	}

	const sorties: SortiesDeLaConversation | null =
		pret === null
			? null
			: {
					onOuvrirRubrique: ouvrir,
					onAjouterDocument: pret.onAjouterPieces,
					...(pret.onDemanderAPlume === undefined
						? {}
						: { onDemanderAPlume: () => pret.onDemanderAPlume?.() }),
					onNoterUnReglement: pret.onNoterUnReglement ?? (() => undefined)
				};

	/**
	 * Ouvre la conversation sur un geste (ou sur « Que voulez-vous faire ? »), ou mène
	 * le geste qui a déjà son parcours ailleurs.
	 */
	function demander(
		intention: IntentionDuDossier | null,
		envoi: string | null = null,
		voie: string | null = null,
		reponse: string | null = null
	) {
		if (sorties === null) return;
		if (intention !== null && (!estGuidee(intention) || pret?.gestesGuides === undefined)) {
			menerHorsConversation(intention, sorties);
			return;
		}
		setConversation((avant) => ({
			...CONVERSATION_FERMEE,
			ouverte: true,
			depart: intention,
			envoi,
			voie,
			reponse,
			jeton: avant.jeton + 1
		}));
	}

	/** L'accord écrit, depuis l'échéancier qui court : la lettre déjà choisie et remplie. */
	function preparerLAccord() {
		if (pret === null) return;
		pret.courriers.onChoisir(choixDeLAccord(pret.courriers));
		setConversation((avant) => ({
			...CONVERSATION_FERMEE,
			ouverte: true,
			depart: 'ECRIRE',
			accord: true,
			jeton: avant.jeton + 1
		}));
	}

	return (
		<PageEcran
			largeur="large"
			entete={{
				genre: 'poussee',
				/*
				  ⚠️ LE RETOUR VISE LA PAGE DU CLIENT DÈS QU'ON SAIT QUI IL EST, et la
				  liste seulement tant qu'on ne le sait pas encore. Une route à
				  paramètre ne se lie pas sans son paramètre : pendant l'attente, le
				  seul retour honnête est la liste.
				*/
				retour:
					pret === null
						? { vers: '/app/clients', libelle: TITRE_ECRAN.debiteurs }
						: {
								vers: '/app/clients/$id',
								parametres: { id: pret.debiteurId },
								libelle: TITRE_ECRAN.debiteurs
							},
				titre: pret?.debiteur ?? 'Dossier'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<SectionsDepliables ouvertes={ouvertes} onOuvertesChange={changer}>
					{/*
					  ⚠️ AU BUREAU, DEUX COLONNES (14/10/2026) : le dossier à gauche, Plume à
					  droite, collé pendant que la gauche défile. Au téléphone, ces
					  enveloppes n'existent pas : l'ordre ci-dessous reste celui de l'écran.
					*/}
					<TableauDeBord>
						<ZoneDuTableau place="tete">
							{pret.erreur === null ? null : (
								<p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p>
							)}

							<EnTeteCreance creance={pret} />

							{pret.classement === undefined ? null : (
								<BandeauDossierClasse
									libelle={pret.classement.libelle}
									le={pret.classement.le}
									{...(pret.classement.note === undefined ? {} : { note: pret.classement.note })}
									{...(pret.onRouvrirLeDossier === undefined
										? {}
										: { onRouvrir: pret.onRouvrirLeDossier })}
								/>
							)}

							{/*
					  ⚠️ CE QUI CHANGE LA DONNE PASSE AVANT L'ÉTAT. Une procédure
					  collective suspend les relances : lire « Relancer » avant de lire
					  qu'on ne peut plus relancer, c'est appuyer pour rien.
					*/}
							<CeQuiBloque alertes={alertesDuDossier(pret)} />
						</ZoneDuTableau>
						<ZoneDuTableau place="cote-collant">
							{/*
							  ⚠️ UN DOSSIER DONT LE PRINCIPAL EST RÉGLÉ NE SE « DÉMARRE » PLUS
							  (diagnostic UX du 27/10/2026) : réglé par un virement, il affichait
							  encore « Démarrer avec Plume ». Ce qu'il reste à réclamer (les pénalités)
							  se dit dans la carte de Plume.
							*/}
							{pret.aDemarrer === true &&
							pret.onDemarrer !== undefined &&
							pret.principalRestantDu > 0n ? (
								<PlumeADemarrer client={pret.debiteur} onDemarrer={pret.onDemarrer} />
							) : (
								<PlumeSurLeDossier
									{...ceQueFaitPlume(pret)}
									recupere={pret.dejaRecupere ?? 0n}
									total={pret.totalFactures ?? 0n}
									reponses={
										<ReponsesDuMoment
											creance={pret}
											onRubrique={ouvrir}
											onDemander={(intention, reponse) =>
												demander(intention, null, null, reponse ?? null)
											}
										/>
									}
								/>
							)}
						</ZoneDuTableau>
						<ZoneDuTableau place="principal">
							{/* L'ÉCHÉANCIER QUI COURT : c'est l'état du dossier tant qu'il court. */}
							{pret.reponse?.echeancier === null ||
							pret.reponse?.echeancier === undefined ||
							pret.reponse.echeancier.etat === 'ARRETE' ? null : (
								<SuiviEcheancier
									echeancier={pret.reponse.echeancier}
									onArreter={() => {
										const id = pret.reponse?.echeancier?.id;
										if (id !== undefined) pret.reponse?.onArreterEcheancier(id);
									}}
									{...(accordPossible(pret)
										? {
												onAccordEcrit: preparerLAccord
											}
										: {})}
								/>
							)}

							<CarteDeLEtat creance={pret} />

							{/* CE QUI VIENT, SOUS CE QUI EST : la frise continue après aujourd’hui. */}
							{pret.planAVenir === undefined ? null : (
								<SuiteDuPlan
									etapes={pret.planAVenir}
									aujourdHui={pret.aujourdHui}
									envoiAutomatique={pret.envoiAutomatique === true}
								/>
							)}

							<CarteDuSuivi creance={pret} />

							<ListeDeRangees titre="Le détail du dossier">
								<RangeeCourriers
									creance={pret}
									onEcrire={() => demander('ECRIRE')}
									onOuvrirCourrier={(id) => demander('RELIRE', id)}
								/>
								<RangeeDecompte creance={pret} />
								<RangeePieces creance={pret} />
								<RangeeVoies
									creance={pret}
									onDeclarer={(voie) => demander('PROCEDURE', null, voie)}
								/>
								<RangeeLien
									vers="/app/clients/$id"
									parametres={{ id: pret.debiteurId }}
									titre="Fiche du client"
									avatar={<Avatar nom={pret.debiteur} className="size-8" />}
								/>
							</ListeDeRangees>
						</ZoneDuTableau>
					</TableauDeBord>
				</SectionsDepliables>
			)}

			{pret === null || sorties === null || pret.gestesGuides === undefined ? null : (
				<ConversationDuDossier
					key={conversation.jeton}
					ouverte={conversation.ouverte}
					depart={conversation.depart}
					envoiDepart={conversation.envoi}
					voieDepart={conversation.voie}
					reponseDepart={conversation.reponse}
					lettreAuDepart={
						conversation.accord
							? {
									modele: 'ACCORD_ECHEANCIER',
									titre:
										pret.courriers.modeles.find((m) => m.cle === 'ACCORD_ECHEANCIER')?.titre ??
										'Accord d’échéancier'
								}
							: null
					}
					attentes={{ promesse: promesseAVerifier(pret), rappel: rappelDuJour(pret) }}
					procedure={{ voies: pret.voies, suivi: pret.suivi }}
					paiement={pret.liensDePaiement}
					onFermer={() => setConversation((avant) => ({ ...avant, ouverte: false }))}
					dossier={dossierDuGuide(pret)}
					gestes={pret.gestesGuides}
					questions={{ litige: pret.litige, conditions: pret.lignesConditions }}
					defense={{
						annuaire: pret.professionnels,
						carnet: pret.carnet,
						choisis: pret.intervenantsChoisis
					}}
					lettres={{
						courriers: pret.courriers,
						relances: pret.relances,
						debiteurId: pret.debiteurId,
						...(pret.debiteurEmail === undefined ? {} : { debiteurEmail: pret.debiteurEmail })
					}}
					sorties={sorties}
				/>
			)}
		</PageEcran>
	);
}

/**
 * L'accord écrit se propose quand son modèle s'applique : pas à un client en
 * procédure collective ou radié (`modelesProposables`).
 */
function accordPossible(creance: CreanceOuverte): boolean {
	return (
		creance.courriers.modeles.find((m) => m.cle === 'ACCORD_ECHEANCIER')?.indisponible === null
	);
}

/**
 * COMBIEN, ET JUSQU'À QUAND.
 *
 * C'est le moment d'usage le plus fréquent du produit : le client au téléphone,
 * qui veut un chiffre et une date à voix haute, en cinq secondes. Les deux sont
 * là, et rien d'autre — les quatre pastilles et la ligne « Supposé : … » sont
 * parties. Le nombre de factures est dans « Pénalités et frais » ; la supposition
 * du calcul aussi, là où on le contrôle.
 *
 * ⚠️ LE CHIFFRE NE MENT PAS SUR CE QU'IL EST. Quand le calcul du jour aboutit,
 * c'est le TOTAL — factures, pénalités, frais — et le surtitre le dit. Quand il
 * ne se fait pas, le chiffre retombe sur les factures seules, et le surtitre le
 * dit AUSSI.
 *
 * ⚠️ LA DATE LIMITE POUR AGIR PORTE SA DATE, PAS UN ADJECTIF. C'est la seule
 * échéance qui éteint une créance sans que personne n'ait rien fait. Quand elle
 * ne se calcule pas, ou qu'elle est passée, la ligne le DIT et se distingue —
 * sans couleur : le rouge, l'ambre et le vert ne disent que les seuils.
 */
function EnTeteCreance({ creance }: { creance: CreanceOuverte }) {
	const montant = creance.montantDuJour;
	const limite = creance.prescriptionLaPlusProche;

	return (
		<ChiffreHero
			className="py-cladd-3xs"
			centimes={montant?.total ?? creance.principalRestantDu}
			surTitre={
				montant === null ? 'Reste à payer, hors pénalités' : 'Dû aujourd’hui, pénalités comprises'
			}
			legende={
				limite === null ? (
					<span className="font-semibold text-cladd-fg">
						Date limite pour agir : non calculable
					</span>
				) : limite < creance.aujourdHui ? (
					<span className="font-semibold text-cladd-fg">
						Date limite pour agir dépassée le {dateCourte(limite)}
					</span>
				) : (
					`Date limite pour agir : ${dateCourte(limite)}`
				)
			}
		/>
	);
}

/**
 * L'ÉTAT DU DOSSIER, EN TOUTES LETTRES.
 *
 * ⚠️ « PRÊT » NE DISAIT RIEN. Prêt à quoi ? Le titre de l'étape était celui du
 * modèle, pas celui du gérant. Ce qu'on veut lire en ouvrant un dossier, c'est
 * ce qui a été FAIT : « Pas encore relancé », « Relancé ». La ligne dessous est
 * un fait, jamais un conseil — « Il devait payer le 1 mai 2026 ».
 */
function etatEnClair(creance: CreanceOuverte): { titre: string; sousTitre: string | null } {
	const echeance =
		creance.echeanceLaPlusAncienne === null
			? null
			: `Il devait payer le ${dateCourte(creance.echeanceLaPlusAncienne)}`;

	switch (creance.etapes.etape) {
		case 'PRET':
			return { titre: 'Pas encore relancé', sousTitre: echeance };
		case 'ON_LUI_ECRIT':
			return { titre: 'Relancé', sousTitre: creance.etapes.ceQuiSePasse };
		case 'TRIBUNAL':
			return creance.suivi === null
				? { titre: 'Confié à un professionnel', sousTitre: echeance }
				: { titre: 'Procédure en cours', sousTitre: creance.etapes.ceQuiSePasse };
		case 'REGLE':
			return { titre: 'Réglé', sousTitre: creance.etapes.ceQuiSePasse };
		default:
			return {
				titre: creance.etapes.etapes.find((e) => e.etat === 'EN_COURS')?.titre ?? 'Dossier',
				sousTitre: creance.etapes.ceQuiSePasse
			};
	}
}

/** Ce qu'ouvre la proposition du moment : un geste guidé (ou « Que voulez-vous faire ? »), ou une rubrique. */
type MeneLaProposition =
	| { readonly intention: IntentionDuDossier | null }
	| { readonly rubrique: SectionCreance };

/**
 * LA PROPOSITION DU MOMENT — le seul bouton plein de la page, sous la phrase de Plume.
 *
 * ⚠️ CE QUI ATTEND LE GÉRANT PASSE AVANT CE QU'IL POURRAIT FAIRE. Un courrier
 * préparé qui attend sa validation ne part pas tant qu'il n'est pas relu : c'est
 * lui, le travail du jour. Une relance que Plume va envoyer se regarde avant.
 *
 * ⚠️ « RELANCER » NE SE PROPOSE PAS À UN CLIENT EN PROCÉDURE COLLECTIVE, ni à une
 * entreprise radiée : les relances y sont suspendues. « Préparer un courrier » y
 * mène aux courriers que la situation permet — sans en nommer aucun, parce que les
 * nommer serait choisir.
 *
 * ⚠️ AU BOUT DU PLAN, « DÉCIDER DE LA SUITE » ouvre « Que voulez-vous faire ? » :
 * les suites s'y énumèrent au même rang (un professionnel, un rappel, classer),
 * aucune n'est mise en avant.
 *
 * ⚠️ AUCUN DE CES LIBELLÉS NE NOMME UNE VOIE DE DROIT (ligne rouge n° 3), et
 * `page-dossier.test.ts` lit ceux-ci pour le vérifier.
 */
function gesteDuDossier(
	creance: CreanceOuverte
): { readonly libelle: string; readonly mene: MeneLaProposition } | null {
	if (creance.classement !== undefined) return null;
	if (creance.etapes.etape === 'REGLE') {
		// Payé, et les pénalités ? Plume dit le chiffre ; réclamer ou classer reste au gérant.
		const restant = creance.montantDuJour?.total ?? 0n;
		return restant > 0n ? { libelle: 'Voir le calcul', mene: { rubrique: 'decompte' } } : null;
	}

	const aValider = creance.courriers.envois.filter((e) => e.etat === 'A_VALIDER').length;
	if (aValider > 0) {
		return {
			libelle: aValider > 1 ? 'Relire les courriers' : 'Relire le courrier',
			mene: { intention: 'RELIRE' }
		};
	}
	// Ce que le gérant s'était promis de vérifier, le jour venu : Plume pose la question.
	if (promesseAVerifier(creance) !== null) {
		return { libelle: 'Répondre', mene: { intention: 'PROMESSE' } };
	}
	if (rappelDuJour(creance) !== null) {
		return { libelle: 'Voir mon rappel', mene: { intention: 'RAPPEL_DU_JOUR' } };
	}
	if (creance.courriers.envois.some((e) => e.etat === 'PROGRAMME')) {
		return { libelle: 'Voir la relance', mene: { intention: 'RELIRE' } };
	}
	if (creance.etapes.etape === 'TRIBUNAL') {
		if (etapeANoter(creance)) return { libelle: 'Noter une étape', mene: { intention: 'ETAPE' } };
		return { libelle: 'Suivre le dossier', mene: { rubrique: 'voies' } };
	}
	// ⚠️ LE CLIENT A DONNÉ SA PAROLE (une promesse, un échéancier) : « Relancer » en
	// bouton plein contredirait ce que Plume dit juste au-dessus. La relance reste
	// possible par « Autre chose » ; la page n'en fait plus le geste mis en avant.
	if (creance.pause !== undefined) return null;
	if (creance.santeDebiteur === 'PROCEDURE_COLLECTIVE' || creance.santeDebiteur === 'RADIEE') {
		return { libelle: 'Préparer un courrier', mene: { intention: 'ECRIRE' } };
	}
	const prochaine = creance.planAVenir?.[0];
	if (prochaine !== undefined && !prochaine.automatique) {
		return { libelle: 'Décider de la suite', mene: { intention: null } };
	}
	return { libelle: 'Relancer', mene: { intention: 'ECRIRE' } };
}

/**
 * LES RÉPONSES DU MOMENT, SOUS LA PHRASE DE PLUME (22/10/2026) — la proposition en
 * bouton plein, puis « Il m'a répondu » et « Autre chose », comme les réponses du
 * démarrage. Chacune ouvre la conversation du dossier, déjà répondue.
 */
function ReponsesDuMoment({
	creance,
	onRubrique,
	onDemander
}: {
	readonly creance: CreanceOuverte;
	readonly onRubrique: (cle: SectionCreance) => void;
	readonly onDemander: (intention: IntentionDuDossier | null, reponse?: string) => void;
}) {
	const proposition = gesteDuDossier(creance);
	const peutRepondre =
		creance.gestesGuides !== undefined &&
		creance.etapes.etape !== 'REGLE' &&
		creance.classement === undefined;
	const [rayeEnCours, setRayeEnCours] = useState(false);
	const rappel = rappelDuJour(creance);
	const mene = proposition?.mene;
	/*
	  ⚠️ QUAND PLUME POSE UNE QUESTION, LA CARTE PORTE SES RÉPONSES (23/10/2026). « Il
	  l'a fait ? » se répond par Non ou Oui sur la carte même, et la conversation
	  s'ouvre à la question suivante ; un rappel se raye d'un toucher. Les deux réponses
	  ont le même poids : « tenue » reste le mot du gérant.
	*/
	const questionDirecte =
		creance.gestesGuides === undefined || mene === undefined || 'rubrique' in mene
			? null
			: mene.intention === 'PROMESSE'
				? 'PROMESSE'
				: mene.intention === 'RAPPEL_DU_JOUR' && rappel !== null
					? 'RAPPEL'
					: null;
	return (
		<>
			{questionDirecte === 'PROMESSE' ? (
				<RangeeDeReponses>
					<BoutonDeReponse libelle="Non" onClick={() => onDemander('PROMESSE', 'NON')} />
					<BoutonDeReponse libelle="Oui, il a payé" onClick={() => onDemander('PROMESSE', 'OUI')} />
				</RangeeDeReponses>
			) : questionDirecte === 'RAPPEL' && rappel !== null ? (
				<RangeeDeReponses>
					<BoutonDeReponse
						libelle="Plus tard"
						onClick={() => onDemander('RAPPEL_DU_JOUR', 'PLUS_TARD')}
					/>
					<BoutonDeReponse
						principal
						libelle="C’est fait"
						enCours={rayeEnCours}
						onClick={() => {
							setRayeEnCours(true);
							void creance.gestesGuides?.rappelFait(rappel.id).finally(() => setRayeEnCours(false));
						}}
					/>
				</RangeeDeReponses>
			) : proposition === null ? null : (
				<BoutonDeReponse
					principal
					libelle={proposition.libelle}
					onClick={() => {
						const mene = proposition.mene;
						if ('rubrique' in mene) onRubrique(mene.rubrique);
						else onDemander(mene.intention);
					}}
				/>
			)}
			<RangeeDeReponses>
				{peutRepondre ? (
					<BoutonDeReponse libelle="Il m’a répondu" onClick={() => onDemander('REPONSE')} />
				) : null}
				<BoutonDeReponse libelle="Autre chose" onClick={() => onDemander(null)} />
			</RangeeDeReponses>
		</>
	);
}

/** Sa promesse arrivée à son jour, que le gérant n'a pas encore tranchée : la plus récente. */
function promesseAVerifier(creance: CreanceOuverte): PromesseAVerifier | null {
	const note = creance.suiviDuDossier.notes
		.filter(
			(n) =>
				n.genre === 'PROMESSE' &&
				n.issue === undefined &&
				n.promisPourLe !== undefined &&
				n.promisPourLe <= creance.aujourdHui
		)
		.sort((a, b) => ((a.promisPourLe ?? '') < (b.promisPourLe ?? '') ? 1 : -1))[0];
	if (note === undefined || note.promisPourLe === undefined) return null;
	return {
		id: note._id,
		le: note.promisPourLe,
		montant: note.montantPromis ?? null,
		...(note.recuDepuis === undefined ? {} : { recuDepuis: note.recuDepuis })
	};
}

/** Le rappel arrivé à son jour, pas encore fait : le plus ancien. */
function rappelDuJour(creance: CreanceOuverte): RappelDuJour | null {
	const note = creance.suiviDuDossier.notes
		.filter(
			(n) =>
				n.genre === 'RAPPEL' &&
				n.faitLe === undefined &&
				n.rappelLe !== undefined &&
				n.rappelLe <= creance.aujourdHui
		)
		.sort((a, b) => ((a.rappelLe ?? '') < (b.rappelLe ?? '') ? -1 : 1))[0];
	if (note === undefined || note.rappelLe === undefined) return null;
	return { id: note._id, texte: note.texte, le: note.rappelLe };
}

/** Une démarche est engagée, et une suite peut s'y noter. */
function etapeANoter(creance: CreanceOuverte): boolean {
	return creance.suivi !== null && !creance.suivi.terminal && creance.suivi.suites.length > 0;
}

/** Ce que la conversation du dossier sait pour proposer ses réponses. */
function pourLesIntentions(creance: CreanceOuverte): DossierPourLesIntentions {
	const classe = creance.classement !== undefined;
	return {
		classe,
		regle: creance.etapes.etape === 'REGLE',
		auTribunal: creance.etapes.etape === 'TRIBUNAL',
		relancesSuspendues:
			creance.santeDebiteur === 'PROCEDURE_COLLECTIVE' || creance.santeDebiteur === 'RADIEE',
		questionsEnAttente: aConfirmer(creance),
		classable: !classe && creance.gestesGuides !== undefined,
		plumeJoignable: creance.onDemanderAPlume !== undefined,
		procedureDeclarable:
			!classe && creance.suivi === null && voiesDeclarables(creance.voies).length > 0,
		etapeANoter: !classe && etapeANoter(creance)
	};
}

/** Ce que la conversation du dossier sait du dossier. */
function dossierDuGuide(creance: CreanceOuverte): DossierDuGuide {
	const resteDu = creance.reponse?.resteDu ?? creance.principalRestantDu;
	const echeancier = creance.reponse?.echeancier;
	return {
		client: creance.debiteur,
		debiteurId: creance.debiteurId,
		aujourdHui: creance.aujourdHui,
		resteDu,
		echeancierPossible:
			resteDu > 0n && echeancier?.etat !== 'EN_COURS' && echeancier?.etat !== 'EN_RETARD',
		accordPossible: accordPossible(creance),
		prochaineEtape:
			creance.planAVenir?.[0] === undefined
				? null
				: { nom: creance.planAVenir[0].nom, le: creance.planAVenir[0].le },
		relanceParPlume:
			creance.horsPilote !== true &&
			creance.santeDebiteur !== 'PROCEDURE_COLLECTIVE' &&
			creance.santeDebiteur !== 'RADIEE',
		pourLesIntentions: pourLesIntentions(creance)
	};
}

/** « jeudi 10:00 » : le jour et l'heure d'un départ, chez le gérant. */
const DEPART = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	hour: '2-digit',
	minute: '2-digit'
});

/**
 * CE QUE PLUME DIT DU DOSSIER, À LA PREMIÈRE PERSONNE — et ce qui arrive si rien
 * ne bouge.
 *
 * ⚠️ DES FAITS ET DES DATES, JAMAIS UN CONSEIL (ligne rouge n° 3). « Prochaine
 * étape : deuxième rappel, dans 6 j » est le plan ; « si Durand ne paie pas d'ici
 * là, je l'envoie » est la règle qu'a choisie le gérant en activant les relances.
 * La remise au conseil ne s'annonce jamais comme une suite : « c'est vous qui la
 * décidez ».
 *
 * ⚠️ L'ORDRE EST CELUI DE CE QUI PRESSE LE GÉRANT : ce qui part bientôt (et se
 * retient encore), ce qui attend sa relecture, puis le plan.
 */
function ceQueFaitPlume(creance: CreanceOuverte): {
	humeur: HumeurPlume;
	phrase: string;
	siRienNeBouge: string | null;
} {
	const client = creance.debiteur;
	const quand = (le: string) =>
		le <= creance.aujourdHui ? 'aujourd’hui' : dateRelative(le, creance.aujourdHui);
	if (creance.classement !== undefined) {
		return {
			humeur: 'repos',
			phrase: 'Vous avez classé ce dossier : je ne le relance plus.',
			siRienNeBouge: null
		};
	}
	if (creance.etapes.etape === 'REGLE') {
		/*
		  ⚠️ PAYÉ, ET LES PÉNALITÉS ? (analyse des parcours du 08/10/2026). Un client
		  qui solde ses factures en retard laisse des pénalités et des frais que le
		  calcul du jour chiffre encore, et que personne ne disait : le dossier se
		  taisait sur « tout est payé ». Plume dit le chiffre — un fait du calcul — et
		  mène au détail ; réclamer ou classer reste le choix du gérant.
		*/
		const restant = creance.montantDuJour?.total ?? 0n;
		if (restant > 0n) {
			return {
				humeur: 'content',
				phrase: `Les factures sont payées. Les pénalités de retard et les frais calculés au jour d’aujourd’hui font ${eurosCentimes(restant)}.`,
				siRienNeBouge: 'Vous pouvez les réclamer, ou classer le dossier.'
			};
		}
		return { humeur: 'content', phrase: 'C’est réglé : tout est payé.', siRienNeBouge: null };
	}
	if (creance.etapes.etape === 'TRIBUNAL') {
		return {
			humeur: 'repos',
			phrase: 'Le dossier est entre les mains de votre conseil. Je surveille ses délais.',
			siRienNeBouge: null
		};
	}
	if (creance.santeDebiteur === 'PROCEDURE_COLLECTIVE' || creance.santeDebiteur === 'RADIEE') {
		return {
			humeur: 'attention',
			phrase: `${client} est en procédure collective ou radié : je ne le relance pas.`,
			siRienNeBouge: 'Je surveille ses dates, et ce qui le concerne au registre.'
		};
	}
	/*
	  ⚠️ CE QUI ATTEND LE GÉRANT, LE JOUR VENU (23/10/2026) : sa promesse, un rappel. Ces
	  deux-là se lisaient au bouton « Tout l'historique · 2 à vérifier » ; Plume pose la
	  question, et « Tenue » reste le mot du gérant.
	*/
	const promesse = promesseAVerifier(creance);
	if (promesse !== null) {
		return {
			humeur: 'attention',
			phrase: `${client} avait promis de payer${promesse.montant === null ? '' : ` ${eurosCentimes(promesse.montant)}`} le ${dateCourte(promesse.le)}. Il l’a fait ?`,
			siRienNeBouge:
				'Dites-le-moi : c’est vous qui le constatez. S’il n’a pas payé, je reprends le plan.'
		};
	}
	const rappel = rappelDuJour(creance);
	if (rappel !== null) {
		return {
			humeur: 'attention',
			phrase: 'Vous m’aviez demandé de revenir sur ce dossier aujourd’hui.',
			siRienNeBouge: `« ${rappel.texte} »`
		};
	}
	const programme = creance.courriers.envois.find((e) => e.etat === 'PROGRAMME');
	if (programme !== undefined) {
		return {
			humeur: 'travaille',
			phrase:
				programme.partiraLe === undefined
					? `Je relance ${client} très bientôt, à votre nom.`
					: `Je relance ${client} ${DEPART.format(new Date(programme.partiraLe))}, à votre nom.`,
			siRienNeBouge: 'Vous pouvez encore retenir l’envoi.'
		};
	}
	if (creance.courriers.envois.some((e) => e.etat === 'A_VALIDER')) {
		return {
			humeur: 'attention',
			phrase: 'J’ai préparé une relance : elle attend votre relecture.',
			siRienNeBouge: null
		};
	}
	if (creance.horsPilote === true) {
		return {
			humeur: 'repos',
			phrase: 'Vous gardez ce client en main : je suis ses dates, sans le relancer.',
			siRienNeBouge: null
		};
	}
	const prochaine = creance.planAVenir?.[0];
	/*
	  ⚠️ LA PAROLE DU CLIENT PASSE AVANT LE PLAN. Il a dit quand il paierait : Plume
	  le répète, dit qu'il se tait jusque-là, et ce qui reprend si rien n'arrive.
	*/
	if (creance.pause !== undefined) {
		const combien =
			creance.pause.montant === undefined ? '' : `${eurosCentimes(creance.pause.montant)} `;
		const reprise =
			prochaine === undefined
				? null
				: `Si rien n’arrive, je reprends le ${dateCourte(prochaine.le)} : ${prochaine.nom.toLowerCase()}.`;
		return creance.pause.raison === 'PROMESSE'
			? {
					humeur: 'repos',
					phrase: `${client} a promis de payer ${combien}le ${dateCourte(creance.pause.le)}. Je ne le relance pas d’ici là.`,
					siRienNeBouge: reprise
				}
			: {
					humeur: 'repos',
					phrase: `${client} paie en plusieurs fois. Prochain versement : ${combien}le ${dateCourte(creance.pause.le)}.`,
					siRienNeBouge: reprise
				};
	}
	if (prochaine === undefined) {
		return {
			humeur: 'repos',
			phrase: 'Je surveille ce dossier et ses dates.',
			siRienNeBouge: null
		};
	}
	if (!prochaine.automatique) {
		/*
		  ⚠️ LA FIN DU PLAN MÈNE QUELQUE PART (analyse des parcours du 08/10/2026).
		  « C'est vous qui la décidez », sans un geste, laissait le gérant devant une
		  phrase. Le bouton ouvre les suites possibles — sans en nommer aucune : le
		  geste mis en avant ne nomme jamais une voie de droit.
		*/
		return {
			humeur: 'attention',
			phrase: 'J’ai fait tout ce que prévoit le plan de relance.',
			siRienNeBouge:
				'La suite, c’est vous qui la décidez : la confier à un professionnel, lui laisser du temps, ou classer le dossier.'
		};
	}
	return creance.envoiAutomatique === true
		? {
				humeur: 'repos',
				phrase: `Je m’occupe de ce dossier. Prochaine étape : ${prochaine.nom.toLowerCase()}, ${quand(prochaine.le)}.`,
				siRienNeBouge: `Si ${client} ne paie pas d’ici là, je l’envoie à votre nom. Un paiement arrête tout.`
			}
		: {
				humeur: 'repos',
				phrase: `Prochaine étape : ${prochaine.nom.toLowerCase()}, ${quand(prochaine.le)}.`,
				siRienNeBouge:
					'Je la préparerai, et vous la relirez avant qu’elle parte. Un paiement arrête tout.'
			};
}

/**
 * CE DOSSIER ATTEND D'ÊTRE DÉMARRÉ — Plume l'a préparé, le gérant le démarre.
 *
 * ⚠️ C'EST LE SEUL BOUTON PLEIN DE LA PAGE QUAND IL EST LÀ : la carte de l'état
 * perd alors le sien (« Relancer » n'a pas de sens sur un dossier qu'on n'a pas
 * encore démarré).
 */
function PlumeADemarrer({ client, onDemarrer }: { client: string; onDemarrer: () => void }) {
	return (
		<div className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs">
			<div className="flex items-start gap-3">
				<Plume humeur="attention" taille={44} />
				<p className="text-cladd-xs leading-snug">
					J’ai préparé le dossier de {client}. Je ne le relance pas tant que vous ne l’avez pas
					démarré : trois questions, et c’est parti.
				</p>
			</div>
			<BoutonPrincipal pleineLargeur onClick={onDemarrer}>
				Démarrer avec {NOM_DU_PILOTE}
			</BoutonPrincipal>
		</div>
	);
}

/**
 * OÙ EN EST LE DOSSIER — l'état en toutes lettres et ses quatre étapes. Son bouton
 * est passé chez Plume le 22/10/2026 : la proposition du moment est une réponse.
 */
function CarteDeLEtat({ creance }: { creance: CreanceOuverte }) {
	const { titre, sousTitre } = etatEnClair(creance);
	return (
		<EtatDuDossier
			etapes={creance.etapes.etapes}
			titre={titre}
			sousTitre={sousTitre}
			classe={creance.etapes.classe}
		/>
	);
}

/**
 * CE QUI S'EST PASSÉ, ET LE BOUTON QUI OUVRE TOUT.
 *
 * ⚠️ LE BOUTON COMPTE CE QUI ATTEND. Une promesse arrivée à son jour sans qu'on
 * sache si elle a été tenue, un rappel qu'on s'était posé : ce sont les seules
 * entrées de l'historique qui appellent le gérant, et elles se lisent sur le
 * bouton sans l'ouvrir.
 */
function CarteDuSuivi({ creance }: { creance: CreanceOuverte }) {
	const { ouverte, basculer } = useSectionOuverte('suivi');
	const deuxVolets = useDeuxVolets();
	const suivi = creance.suiviDuDossier;
	const enAttente = suivi.notes.filter(
		(note) =>
			(note.genre === 'PROMESSE' && note.issue === undefined) ||
			(note.genre === 'RAPPEL' && note.faitLe === undefined)
	).length;

	const libelle =
		deuxVolets && ouverte
			? 'Masquer l’historique'
			: enAttente > 0
				? `Tout l’historique · ${enAttente} à vérifier`
				: suivi.frise.length === 0
					? 'Noter quelque chose'
					: 'Tout l’historique';

	return (
		<ApercuDuSuivi
			frise={suivi.frise}
			geste={
				<BoutonSecondaire pleineLargeur aria-expanded={ouverte} onClick={basculer}>
					{libelle}
				</BoutonSecondaire>
			}
		>
			<PanneauDuGeste cle="suivi" titre="Historique">
				<SuiviDuDossier {...suivi} />
			</PanneauDuGeste>
		</ApercuDuSuivi>
	);
}

/**
 * LA SITUATION QUI COUVRE DÉJÀ UN RISQUE.
 *
 * ⚠️ SANS ÇA, LA PROCÉDURE COLLECTIVE S'ÉCRIRAIT DEUX FOIS DANS LE MÊME CADRE.
 * Elle est à la fois une SITUATION (ce qui se passe, la date limite, les choix)
 * et un RISQUE relevé par le score. Les deux blocs vivaient à deux écrans l'un
 * de l'autre, ce qui masquait la répétition ; réunis en tête de page, elle
 * saute aux yeux.
 *
 * Les quatre clés de situation sont CONTESTATION, PROCEDURE_COLLECTIVE,
 * PAIEMENT_PARTIEL et RADIEE. Les types de risque sont PROCEDURE_COLLECTIVE,
 * DEBITEUR_RADIE, RETARDS_REPETES, et tous les signaux de contestation — d'où
 * les deux seules traductions nécessaires.
 */
function situationQuiCouvre(type: string): string {
	if (type === 'DEBITEUR_RADIE') return 'RADIEE';
	if (type === 'PROCEDURE_COLLECTIVE' || type === 'RETARDS_REPETES') return type;
	return 'CONTESTATION';
}

/**
 * CE QUI BLOQUE : les situations, puis les risques qu'aucune ne couvre, puis
 * les angles morts.
 *
 * ⚠️ L'ORDRE N'EST PAS UN CLASSEMENT DE GRAVITÉ, c'est un ordre de NATURE : ce
 * qui se passe, ce qui a été relevé, ce qui n'est pas vu. Trier par gravité
 * reviendrait à dire lequel traiter d'abord, et personne ici n'a le droit de le
 * dire.
 */
function alertesDuDossier(creance: CreanceOuverte): readonly AlerteDossier[] {
	const couvertes = new Set(creance.situations.map((situation) => situation.cle));

	const desSituations: AlerteDossier[] = creance.situations.map((situation) => ({
		cle: `situation-${situation.cle}`,
		titre: situation.titre,
		phrases: situation.ceQuiSePasse,
		echeance:
			situation.dateLimite === null
				? null
				: {
						libelle: situation.dateLimite.libelle,
						date: situation.dateLimite.date,
						precisions: [
							...(situation.dateLimite.reporteeDe === null
								? []
								: [
										`Le délai finissait le ${dateCourte(situation.dateLimite.reporteeDe)}, un jour non ouvrable : il est reporté au premier jour ouvrable suivant.`
									]),
							...(situation.dateLimite.departNonPrecise === null
								? []
								: [situation.dateLimite.departNonPrecise])
						],
						source: situation.dateLimite.source
					},
		options: situation.options,
		citation: situation.citation
	}));

	/*
	  ⚠️ UN RISQUE BLOQUANT FERME TOUTES LES VOIES QUE CE LOGICIEL ÉVALUE : elles
	  se déroulent sans débat contradictoire, et une contestation, même infondée,
	  y met fin. Le dossier peut être parfait par ailleurs, il ne passera pas.
	  C'est la seule phrase que le risque ajoute, et elle ne s'écrit que pour un
	  risque bloquant.
	*/
	const desRisques: AlerteDossier[] = creance.risques
		.filter((risque) => !couvertes.has(situationQuiCouvre(risque.type)))
		.map((risque) => ({
			cle: `risque-${risque.type}`,
			titre: risque.description,
			phrases:
				risque.gravite === 'BLOQUANTE'
					? [
							'Le dossier continue : relances, décompte et remise à votre conseil restent possibles. Seules les démarches sans débat (demander au tribunal de le faire payer, passer par un commissaire de justice) prennent fin sur une contestation.'
						]
					: [],
			echeance: null,
			options: [],
			citation: null
		}));

	/*
	  ⚠️ « 0,00 € HORS SURVEILLANCE » NE S'ÉCRIT JAMAIS. Un angle mort dont le
	  montant n'est pas chiffrable porte `null`, et le dire en euros le lirait
	  « sans enjeu » alors qu'il veut dire « on n'a pas su compter ».
	*/
	const desAnglesMorts: AlerteDossier[] = creance.anglesMorts.map((angle) => ({
		cle: `angle-${angle.cle}`,
		titre: 'Ce que le logiciel ne voit pas',
		phrases: [
			angle.montantEnJeu === null
				? `${angle.constat} (montant non chiffrable)`
				: `${angle.constat} (${eurosCentimes(angle.montantEnJeu)})`
		],
		echeance: null,
		options: [],
		citation: null
	}));

	return [...desSituations, ...desRisques, ...desAnglesMorts];
}

/**
 * COURRIERS ET E-MAILS — tout ce qu'on lui écrit, au même endroit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DEUX RANGÉES SONT DEVENUES UNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Courriers » (la lettre de relance officielle, l'accord d'échéancier, la
 * déclaration, ce qui part vers un avocat) et « Relances » (les e-mails) étaient
 * deux rangées sœurs. Pour le gérant, c'est la même chose : lui écrire. Deux
 * rangées l'obligeaient à connaître la différence AVANT d'ouvrir.
 *
 * ⚠️ PRÉPARER N'EST PLUS ICI (22/10/2026). Les e-mails par niveau et les six
 * modèles de lettre vivaient dans cette rangée ; « Le relancer » est désormais une
 * conversation avec Plume (`dossier-guide/fil-ecrire.tsx`), et la rangée garde ce
 * qui a été préparé, validé, envoyé — avec un bouton qui ouvre la conversation.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RIEN NE PART D'ICI, ET C'EST UNE LIGNE ROUGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les courriers sont préparés ici, validés par le gérant, envoyés par lui. Les
 * e-mails portent « Copier », jamais « Envoyer » : aucun composant d'envoi au
 * débiteur n'existe dans `src/ui/`. Une commande absente ne s'active jamais par
 * accident ; une commande grisée, si.
 */
function RangeeCourriers({
	creance,
	onEcrire,
	onOuvrirCourrier
}: {
	creance: CreanceOuverte;
	/** Ouvre « Le relancer » dans la conversation du dossier. */
	onEcrire?: () => void;
	/** Ouvre un courrier dans « Relire le courrier ». */
	onOuvrirCourrier?: (envoiId: string) => void;
}) {
	const envois = creance.courriers.envois;
	const aValider = envois.filter((e) => e.etat === 'A_VALIDER').length;
	const faits = envois.filter((e) => e.etat === 'VALIDE' || e.etat === 'PARTI').length;

	return (
		<RangeeDepliable
			cle="courriers"
			famille="ENVOI"
			titre="Courriers et e-mails"
			valeur={
				aValider > 0
					? `${aValider} à valider`
					: faits > 0
						? `${faits} préparé${pluriel(faits)}`
						: 'aucun'
			}
		>
			<Courriers
				courriers={creance.courriers}
				{...(onEcrire === undefined ? {} : { onNouveau: onEcrire })}
				{...(onOuvrirCourrier === undefined || creance.gestesGuides === undefined
					? {}
					: { onOuvrir: onOuvrirCourrier })}
			/>
		</RangeeDepliable>
	);
}

/**
 * PÉNALITÉS ET FRAIS — LE REÇU. C'EST LE CŒUR DU PRODUIT.
 *
 * Principal, indemnité forfaitaire par facture, puis un SEGMENT par période de
 * taux, chacun rendant ses quatre termes : base, taux, jours, base annuelle. Un
 * total qu'on ne peut pas décomposer est un chiffre qu'on demande de croire ;
 * décomposé, il se refait à la main — ce que fera le débiteur qui le conteste.
 *
 * ⚠️ « DÉCOMPTE · 6 373,50 € » RÉPÉTAIT LE CHIFFRE ÉCRIT EN GRAND quatre cents
 * pixels plus haut. C'est le « Order receipt » de Shop : le total est en tête de
 * page, et son détail est à un appui. La rangée dit donc ce que le produit
 * APPORTE — les pénalités et l'indemnité, dues de plein droit et presque jamais
 * réclamées —, et elle s'ouvre sur le calcul entier. « Détail du montant ·
 * 373,50 € de pénalités » revenait à la ligne des deux côtés à 393 px ; mesuré.
 *
 * ⚠️ TROIS RANGÉES Y SONT ENTRÉES, parce qu'elles parlent toutes du calcul :
 * les décomptes arrêtés, la supposition du calcul (qui était une ligne grise
 * sous le montant, « Supposé : … »), et les chiffres de la loi — repliés derrière
 * un mot, parce que c'est un tableau de référentiel qu'on contrôle et qu'on ne
 * lit pas.
 *
 * ⚠️ PLUS RIEN NE S'Y « ARRÊTE » (09/10/2026). Les pénalités courent jusqu'au
 * paiement ; chaque document qui réclame le montant le date au jour où il part,
 * et ce montant-là reste figé. La rangée liste ce qui a été réclamé, et le calcul
 * du jour se télécharge daté. Le bouton « Arrêter un décompte » et son écran ont
 * disparu : un geste de plus pour un chiffre que le logiciel connaît.
 */
function RangeeDecompte({ creance }: { creance: CreanceOuverte }) {
	const montant = creance.montantDuJour;

	return (
		<RangeeDepliable
			cle="decompte"
			famille="ARGENT"
			titre="Pénalités et frais"
			glose="Le montant entier, facture par facture et période par période."
			valeur={
				montant === null
					? 'non calculées'
					: eurosCentimes(montant.interets + montant.indemniteForfaitaire)
			}
		>
			{montant === null ? (
				creance.refusDuMontant === null ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Le montant ne se calcule pas, et la raison n’a pas été rendue. C’est un défaut : un
						refus sans ses quatre parties est un mur.
					</p>
				) : (
					<RefusEnQuatreParties
						peutFaire={creance.refusDuMontant.peutFaire}
						constat={creance.refusDuMontant.constat}
						blocages={creance.refusDuMontant.blocages}
						coutDeLAttente={creance.refusDuMontant.coutDeLAttente}
					/>
				)
			) : (
				<>
					<Decompte decompte={montant} onChoisirImputation={creance.onChoisirImputation} />
					<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						Ce montant augmente chaque jour : les pénalités courent jusqu’au paiement. Chaque
						courrier et chaque lien de paiement le datent au jour où ils partent, et ce chiffre-là
						ne bouge plus.
					</p>
				</>
			)}

			<section className="flex flex-col gap-cladd-3xs">
				<SectionTitle>Montants réclamés</SectionTitle>
				{creance.decomptesArretes.length === 0 ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Aucun courrier ni lien de paiement n’a encore réclamé de montant daté.
					</p>
				) : (
					<ListeAnalyses>
						{creance.decomptesArretes.map((arrete) => (
							<LigneAnalyse
								key={arrete.id}
								// ⚠️ TYPÉE PAR LE ROUTEUR, sans assertion : une route supprimée
								// deviendrait une erreur de compilation au lieu d'un lien mort.
								vers="/app/decompte/$id"
								parametres={{ id: arrete.id }}
								titre={`Au ${dateCourte(arrete.arreteAu)}`}
								valeur={eurosCentimes(arrete.total)}
							/>
						))}
					</ListeAnalyses>
				)}

				{creance.onTelechargerLaPiece === null ? null : (
					<BoutonSecondaire className="self-start" onClick={creance.onTelechargerLaPiece}>
						<FileDownIcon />
						Télécharger le calcul du jour
					</BoutonSecondaire>
				)}
			</section>

			{/*
			  ⚠️ LE LIEN DE PAIEMENT EST ICI, SOUS LE MONTANT, ET PAS DANS LES
			  COURRIERS : il montre ce montant, daté à son ouverture.
			*/}
			<LiensDePaiement {...creance.liensDePaiement} />

			{creance.hypotheses.length === 0 ? null : (
				<section className="flex flex-col gap-cladd-3xs">
					<SectionTitle>Suppositions du calcul</SectionTitle>
					{creance.hypotheses.map((hypothese) => (
						<p key={hypothese.cle} className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{hypothese.fait}{' '}
							<TexteQuiMene texte={hypothese.ceQuiLaLeve} debiteurId={creance.debiteurId} />
						</p>
					))}
				</section>
			)}

			<ChiffresDeLaLoi fiches={creance.fiches} />
		</RangeeDepliable>
	);
}

/**
 * LES VALEURS JURIDIQUES EMPLOYÉES, telles qu'un tiers doit pouvoir les
 * contrôler : leur source, leur date de relevé, et les deux booléens qui disent
 * ce qu'on a le droit d'en faire.
 *
 * ⚠️ REPLIÉES DERRIÈRE UN MOT, ET C'EST UNE MESURE. Le tableau faisait 2 711 px
 * relevés à 1280 px : dépliée par défaut, la décomposition qu'on venait lire
 * passait sous la ligne de flottaison. Il n'est pas caché — son compte se lit sur
 * le mot qui l'ouvre.
 *
 * ⚠️ ET « RELEVÉE » N'EST PAS « CONTRÔLÉE ». `verifie` suffit à CALCULER ;
 * `valideParAvocat` suffit à produire un ACTE. Les deux colonnes restent
 * distinctes pour cette seule raison.
 */
function ChiffresDeLaLoi({ fiches }: { fiches: readonly FicheParametre[] }) {
	const [vus, setVus] = useState(false);
	if (fiches.length === 0) return null;

	const verifiees = fiches.filter((fiche) => fiche.verifie).length;
	const controlees = fiches.filter((fiche) => fiche.valideParAvocat).length;

	return (
		<section className="flex flex-col gap-cladd-3xs">
			<BoutonTexte className="self-start" aria-expanded={vus} onClick={() => setVus(!vus)}>
				{vus
					? 'Masquer les chiffres de la loi'
					: `Les chiffres de la loi · ${verifiees} sur ${fiches.length} relevés`}
			</BoutonTexte>
			{vus ? (
				<>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						{verifiees} relevée{pluriel(verifiees)} sur {fiches.length} sur une source publique
						citable, {controlees} contrôlée{pluriel(controlees)} par un juriste. Une valeur relevée
						suffit à calculer ; seule une valeur contrôlée suffit à produire un acte.
					</p>
					<Tableau legende="Valeurs juridiques, leur source et leur état">
						<TableauEntete>
							<TableauTitre>Valeur</TableauTitre>
							<TableauTitre>Source</TableauTitre>
							<TableauTitre>Relevée le</TableauTitre>
							<TableauTitre>Relevée</TableauTitre>
							<TableauTitre>Contrôlée par un juriste</TableauTitre>
						</TableauEntete>
						<TableauCorps>
							{fiches.map((fiche) => (
								<TableauLigne key={fiche.cle}>
									<TableauCellule>{fiche.cle}</TableauCellule>
									<TableauCellule>{fiche.source}</TableauCellule>
									<TableauCellule>{dateCourte(fiche.verifieLe)}</TableauCellule>
									<TableauCellule>{fiche.verifie ? 'oui' : 'non'}</TableauCellule>
									<TableauCellule>{fiche.valideParAvocat ? 'oui' : 'non'}</TableauCellule>
								</TableauLigne>
							))}
						</TableauCorps>
					</Tableau>
				</>
			) : null}
		</section>
	);
}

/**
 * DOCUMENTS — le dépôt au coffre, le classement, la relecture, et ce qu'ils
 * établissent.
 *
 * ⚠️ « SOLIDITÉ » EST ENTRÉE ICI. C'était une rangée sœur, « 1 sur 4 », qui
 * comptait… les documents. Deux rangées pour la même matière, dont l'une portait
 * un mot du logiciel qu'aucun gérant n'emploie. Son constat reste un COMPTE,
 * jamais un verdict : « trois des quatre pièces attendues sont absentes » se
 * vérifie ; « ce dossier est trop faible » serait une appréciation juridique.
 */
function RangeePieces({ creance }: { creance: CreanceOuverte }) {
	return (
		<RangeeDepliable
			cle="pieces"
			famille="PAPIERS"
			titre="Documents"
			glose="Chiffrés au coffre, lus et classés tout seuls."
			valeur={`${creance.pieces.length}`}
		>
			<Pieces
				pieces={creance.pieces}
				optionsType={creance.optionsTypePiece}
				enCours={creance.enCours}
				onAjouter={creance.onAjouterPieces}
				onOuvrir={creance.onOuvrirPiece}
				onClasser={creance.onClasser}
			/>
			<Solidite solidite={creance.solidite} />
		</RangeeDepliable>
	);
}

/**
 * SECTION 7 — LES FAITS CONSIGNÉS ET LA VOIE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI COURT PASSE AVANT CE QU'ON POURRAIT FAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une procédure déjà engagée fait courir des délais dont un À PEINE DE
 * CADUCITÉ : passé, l'ordonnance est perdue et tout est à reprendre pendant que
 * la prescription court. Dès qu'une voie est engagée, la liste des voies cède
 * donc toute la place — ce qui retire du même coup le geste qui permettait d'en
 * déclarer une seconde par-dessus la première, écrasant la date de la première
 * sans rien dire.
 *
 * `SuiviProcedure` porte la frise des étapes cochées, la prochaine échéance et
 * les faits déjà consignés.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ÉNUMÉRÉES, JAMAIS CLASSÉES, ET JAMAIS RECOMMANDÉES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Troisième ligne rouge. Aucune voie n'est mise en avant, et les indisponibles
 * s'affichent AVEC leur motif : un écran qui masquerait une voie laisserait
 * croire qu'elle n'existe pas, alors que ce qui manque est une valeur juridique.
 *
 * ⚠️ ET LE LOGICIEL N'ENGAGE PAS, IL ENREGISTRE. Le gérant dit ce qu'il a fait ;
 * le produit se met à compter les délais qui en découlent, et c'est tout ce
 * qu'il fait. La date saisie est celle du FAIT, pas celle de la saisie : un
 * gérant qui enregistre le 20 mars une ordonnance signifiée le 3 verrait ses
 * trois mois partir du 20, soit dix-sept jours offerts en silence sur
 * l'échéance la plus dangereuse du produit.
 */
function RangeeVoies({
	creance,
	onDeclarer
}: {
	creance: CreanceOuverte;
	/** « Je l'ai engagée » : la conversation du dossier, cette voie déjà choisie. */
	onDeclarer: (voie: string) => void;
}) {
	/*
	  ⚠️ LES FEUILLES SONT UN ÉTAT D'ÉCRAN, PAS UN ÉTAT D'ADRESSE. On ne met pas
	  en signet une feuille ouverte. L'annuaire, lui, vit dans la route : ses
	  lectures ne partent qu'au geste qui ouvre le parcours (`onDemander`).
	*/
	const [voieOuverte, setVoieOuverte] = useState<string | null>(null);
	const [carnetOuvert, setCarnetOuvert] = useState(false);

	// Tout se DÉRIVE du rendu : aucune de ces valeurs n'est un état, donc aucune
	// ne peut être en retard d'un rendu sur la donnée qui la porte.
	const voie = creance.voies.find((v) => v.cle === voieOuverte) ?? null;
	const envisageables = creance.voies.filter((v) => v.disponible).length;

	return (
		<RangeeDepliable
			cle="voies"
			famille="TEMPS"
			titre={creance.suivi === null ? 'Les suites possibles' : 'Procédure'}
			glose={
				creance.suivi === null
					? 'Énumérées, jamais classées. Aucune n’est mise en avant.'
					: 'Les faits consignés, et les délais qui en découlent.'
			}
			valeur={
				creance.suivi !== null
					? 'engagée'
					: envisageables > 0
						? `${envisageables} voie${pluriel(envisageables)}`
						: 'aucune voie'
			}
		>
			{creance.suivi === null ? (
				<>
					<ListeAnalyses>
						{creance.voies.map((v) => (
							<LigneBouton
								key={v.cle}
								titre={v.nom}
								precision={
									v.etapes.length === 0
										? 'aucun délai n’en découle'
										: `${v.etapes.length} étapes · ${v.conditionsEchec.length} façons d’échouer`
								}
								valeur={v.disponible ? 'Envisageable' : 'Indisponible'}
								onClick={() => setVoieOuverte(v.cle)}
							/>
						))}
					</ListeAnalyses>
					{/*
				  CE QUE DIT LA LOI, EN FACE DE VOTRE DOSSIER — le tableau était dans « Vos
				  réponses » ; ses conditions sont celles des voies, il vit avec elles depuis
				  que les questions se posent dans la conversation du dossier (22/10/2026).
				*/}
					{creance.lignesConditions.length === 0 ? null : (
						<section className="flex flex-col gap-cladd-3xs">
							<SectionTitle>Ce que dit la loi, en face de votre dossier</SectionTitle>
							<TableauConditions
								lignes={creance.lignesConditions}
								enCours={creance.enCours}
								onRepondre={creance.onRepondreCondition}
							/>
						</section>
					)}
				</>
			) : (
				<>
					<SuiviProcedure
						suivi={creance.suivi}
						aujourdHui={creance.aujourdHui}
						enCours={creance.enCours}
						onConsigner={creance.onConsigner}
					/>
					{/* ⚠️ LA QUESTION SE POSE APRÈS COUP AUSSI. Un gérant qui a déclaré
					    sans le dire doit pouvoir nommer son intervenant plus tard : sans
					    cette rangée, « je le dirai plus tard » serait un mensonge. */}
					<ListeAnalyses>
						<LigneBouton
							titre="Qui fait l’acte"
							valeur={
								creance.nomsIntervenants.length === 0
									? 'Moi-même'
									: creance.nomsIntervenants.length === 1
										? creance.nomsIntervenants[0]
										: `${creance.nomsIntervenants.length} personnes`
							}
							onClick={() => {
								creance.professionnels.onDemander();
								setCarnetOuvert(true);
							}}
						/>
					</ListeAnalyses>
				</>
			)}

			<FeuilleVoie
				voie={voie}
				ouverte={voie !== null}
				onFermer={() => setVoieOuverte(null)}
				onDeclarer={() => {
					if (voie === null) return;
					setVoieOuverte(null);
					onDeclarer(voie.cle);
				}}
			/>

			{/*
			  LE PARCOURS DU CHOIX (12/10/2026) : une page pleine, une profession par
			  étape, puis le résumé. Rien ne s'écrit avant « Confirmer » — ni le carnet,
			  ni le dossier.
			*/}
			<ParcoursProfessionnels
				ouvert={carnetOuvert}
				titre="Qui fait l’acte"
				but="DOSSIER"
				professions={['AVOCAT', 'COMMISSAIRE_DE_JUSTICE']}
				sansPersonne={{ titre: 'Moi-même', precision: 'Aucun professionnel' }}
				equipe={creance.carnet}
				dejaChoisis={creance.intervenantsChoisis}
				annuaire={creance.professionnels}
				onFermer={() => setCarnetOuvert(false)}
				onConfirmer={(ids) => {
					creance.onNommer(ids);
					setCarnetOuvert(false);
				}}
			/>
		</RangeeDepliable>
	);
}
