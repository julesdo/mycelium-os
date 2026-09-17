import { useState } from 'react';
import { Button, Chip, Segmented, SegmentedButton, Toolbar } from '@cladd-ui/react';
import { EyeOffIcon, InfoIcon, XIcon } from 'lucide-react';
import type { FicheParametre } from '../lib/verticales/recouvrement/referentiel';
import {
	BilanImport,
	BoutonSecondaire,
	ChoixIntervenant,
	Conversation,
	Decompte,
	FeuilleDeclaration,
	FeuilleVoie,
	Lien,
	LigneAnalyse,
	LigneBouton,
	ListeAnalyses,
	Pieces,
	QuestionnaireLitige,
	RechercheAvocat,
	RechercheCommissaire,
	RefusEnQuatreParties,
	Relances,
	SectionDepliable,
	SectionEcran,
	SectionsDepliables,
	Solidite,
	SuiviProcedure,
	Tableau,
	TableauCellule,
	TableauCorps,
	TableauEntete,
	TableauLigne,
	TableauTitre,
	dateCourte,
	eurosCentimes,
	pluriel,
	type AvocatAffiche,
	type ChoixDeclare,
	type ConversationAffichee,
	type DecompteAffiche,
	type DepotAffiche,
	type EtatRechercheAvocat,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type FicheASaisir,
	type FicheIntervenant,
	type Lecture,
	type NiveauAffiche,
	type OptionTypePiece,
	type PieceAffichee,
	type QuestionLitige,
	type RepertoireAffiche,
	type ReponseFait,
	type SoliditeAffichee,
	type SuiviAffiche,
	type VoieAffichee
} from '../ui';

/**
 * LE VOLET DE PREUVE — `?ligne=<id>`, UN ÉTAT DE LA FILE ET PAS UNE ROUTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL EST, ET CE QU'IL REMPLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * À droite au-delà de 1024 px, en feuille en dessous : c'est `TwoPane` qui le
 * pose, et la file qui le monte dans son volet `preuve`. Il est ADRESSABLE,
 * donc partageable, rechargeable et mettable en signet — la correction directe
 * du défaut le plus étrange du dépôt, l'écran le plus lourd du produit
 * (`debiteur-detail.tsx`, 568 lignes, atteint en deux gestes) qui n'avait pas
 * d'adresse.
 *
 * Il remplace `/app/creance/$id` et ses six analyses, les deux volets sans
 * adresse `?d=` et `?p=`, et les racines `Popup` en tant que PILE.
 *
 * ⚠️ IL SERA RICHE, ET C'EST ASSUMÉ PUBLIQUEMENT. La complexité du domaine ne
 * disparaît pas, elle se déplace. On supprime la navigation, pas le droit.
 * Prétendre l'inverse nous ramènerait dans six mois à des onglets dans le
 * volet, et pour de bonnes raisons.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN `Segmented` QUI BASCULE LE VOLET, ET AUCUN ONGLET SUR SES SECTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La spec se contredisait : « dix sections, jamais d'onglets » d'un côté, un
 * `Segmented` de trois positions de l'autre. Le plan tranche, et le voici
 * appliqué : les trois positions BASCULENT le volet, et les sections restent le
 * flux vertical de la position Pièce. Un onglet force à savoir sous quel
 * intitulé du domaine se range ce qu'on cherche, alors qu'on le cherchait pour
 * une raison qui ne porte pas ce nom.
 *
 *   · Pièce — ce qui établit la créance : les neuf sections, dans l'ordre de ce
 *     qui engage le plus.
 *   · Décompte — ce qui a été ARRÊTÉ, c'est-à-dire figé et daté. La question
 *     n'y est pas « combien réclame-t-on aujourd'hui » — la section 1 y répond —
 *     mais « qu'a-t-on réclamé le jour où on l'a réclamé ».
 *   · Conversation — le seul endroit du volet qui passe par un appel modèle.
 *     Chaque phrase de la réponse porte SA pastille ; ce qui ne se relie à
 *     aucune source s'affiche dégradé et marqué « non sourcé », et ne peut
 *     porter ni un montant ni un énoncé juridique. Quand le plafond de coût du
 *     mois a mordu, le champ disparaît et le refus en quatre parties prend sa
 *     place — le reste du volet ne dépend d'aucun appel et ne bouge pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DEUX SECTIONS NE SE REPLIENT JAMAIS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Ce que le logiciel a supposé » et « ce que le logiciel ne voit pas » se
 * rendent à plat, à leur place dans le flux. Une hypothèse repliée est une
 * hypothèse qu'on ne lit pas, et le doute ne profite jamais au produit : un
 * utilisateur qui croit sa prescription surveillée ne la surveille pas
 * lui-même.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ B5 SE TIENT PAR L'ABSENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aucun composant d'envoi au débiteur n'existe dans `src/ui/`, et ce volet n'en
 * introduit aucun. Les brouillons portent « Copier », jamais « Envoyer » : une
 * commande absente ne s'active jamais par accident ; une commande grisée, si.
 * On ne relance jamais le débiteur au nom du client.
 *
 * ⚠️ ET B10 : le brouillon de la section 9 reste produit par `relance.ts`, sans
 * aucun appel modèle. Ce volet ne fait que le RENDRE. Le seul garde-fou qui
 * empêche un débiteur de lire le nom d'un tiers est un test sur ce composeur
 * déterministe ; faire écrire la phrase par un modèle rendrait ce test vert et
 * le courrier faux.
 */

/** Les trois positions du `Segmented`. La troisième attend T14. */
export const POSITIONS_VOLET = ['PIECE', 'DECOMPTE', 'CONVERSATION'] as const;
export type PositionVolet = (typeof POSITIONS_VOLET)[number];

const LIBELLE_POSITION: Record<PositionVolet, string> = {
	PIECE: 'Pièce',
	DECOMPTE: 'Décompte',
	CONVERSATION: 'Conversation'
};

/**
 * Les sections REPLIABLES de la position Pièce, dans l'ordre du flux.
 *
 * Les deux qui ne se replient pas n'y sont pas : elles n'ont pas d'état ouvert
 * à porter dans l'adresse, parce qu'elles sont toujours ouvertes.
 */
export const SECTIONS_VOLET = [
	'montant',
	'acquis',
	'pieces',
	'voies',
	'journal',
	'depot',
	'brouillons'
] as const;
export type SectionVolet = (typeof SECTIONS_VOLET)[number];

/** Un fait du journal : ce que la machine a fait, ou ce que le gérant a dit. */
export interface FaitDuJournal {
	readonly id: string;
	readonly libelle: string;
	/** L'état AVANT, en toutes lettres. Absent quand le fait n'en a pas. */
	readonly avant?: string;
	readonly apres?: string;
	/** D'où vient le fait, en toutes lettres : « BODACC du 16/09 ». */
	readonly source?: string;
	readonly auteur: 'MACHINE' | 'GERANT';
	/** Horodatage en millisecondes. */
	readonly consigneLe: number;
}

/**
 * Une hypothèse du logiciel, adossée au fait qui l'a produite.
 *
 * ⚠️ `geste` EST FACULTATIF ET `corrigeable` NE L'EST PAS. Une hypothèse qui
 * n'offre aucun geste est une hypothèse qu'on SUBIT : elle s'affiche quand
 * même, et la rangée dit pourquoi elle ne se corrige pas d'ici.
 */
export interface HypotheseAffichee {
	readonly cle: string;
	/** Ce que le logiciel a retenu, en toutes lettres. */
	readonly enonce: string;
	/** Le fait qui l'a produite : « le secteur du client n'est pas renseigné ». */
	readonly fait: string;
	/** Ce qui la lève, au constat. Le geste, quand il y en a un, vit à côté. */
	readonly ceQuiLaLeve: string;
	readonly geste?: { readonly libelle: string; readonly onGeste: () => void };
}

/** Ce que le logiciel ne voit pas, chiffré quand c'est chiffrable. */
export interface AngleMortAffiche {
	readonly cle: string;
	readonly constat: string;
	/** Ce qui n'est pas surveillé, en euros. `null` : non chiffrable, et dit. */
	readonly montantEnJeu: bigint | null;
}

/** Un décompte déjà arrêté : figé, daté, et il ne change plus. */
export interface DecompteArreteAffiche {
	readonly id: string;
	readonly arreteAu: string;
	readonly total: bigint;
}

/**
 * CE QUE LE VOLET MONTRE, ET CE QU'IL DÉCLENCHE.
 *
 * ⚠️ LES QUATRE FONCTIONS DE `apresProcedure` SE REBRANCHENT PAR LA SECTION 6,
 * ET C'EST LE DÉFAUT FONDATEUR QUE CETTE TRANCHE RÉPARE. `engagerProcedure`,
 * `consignerEvenement`, `suiviDeLaCreance` et `rattacherIntervenant` n'avaient
 * pour seule surface que `/app/creance/$id/procedure`, un écran que la refonte
 * supprime. Sans elles :
 *
 *   · aucune créance ne passe à `ENGAGEE` ;
 *   · donc `suiviDeLaCreance` rend toujours `null` ;
 *   · donc la machine à états post-procédure ne démarre jamais ;
 *   · donc aucun `ECHEANCE_PROCEDURE` ne survient ;
 *   · donc la portée « Engagés » de la file naît VIDE, pour toujours.
 *
 * C'est ce que `fonctions-appelees.test.ts` a nommé le 12 septembre 2026. Le
 * refaire maintenant serait le refaire en connaissance de cause : `suivi`,
 * `onConsigner`, `onDeclarer` et `onRattacher` ci-dessous sont le point où
 * elles se rebranchent.
 */
export interface LigneOuverte {
	readonly debiteur: string;
	readonly debiteurId: string;
	readonly creanceId: string;
	readonly nombreFactures: number;
	readonly principalRestantDu: bigint;
	/** Toutes conditions établies, aucun risque bloquant. Un état, jamais une note. */
	readonly eligible: boolean;

	// ── 1. Le montant, décomposé en place ──────────────────────────────────
	/** Le calcul du jour. `null` quand il ne se fait pas : `refusDuMontant` dit pourquoi. */
	readonly montantDuJour: DecompteAffiche | null;
	/** Les quatre parties du refus (B14), quand le montant ne se calcule pas. */
	readonly refusDuMontant: {
		readonly peutFaire: string;
		readonly constat: string;
		readonly blocages: readonly string[];
		readonly coutDeLAttente: string;
	} | null;
	/** Les valeurs juridiques employées, telles qu'elles vivent dans `parametres.ts`. */
	readonly fiches: readonly FicheParametre[];

	// ── 2. Ce qui est ACQUIS et ce qui reste À CONFIRMER ───────────────────
	readonly solidite: SoliditeAffichee;
	readonly litige: {
		readonly litigieux: boolean;
		readonly constats: readonly string[];
		readonly questions: readonly QuestionLitige[];
	};
	readonly onRepondre: (cle: string, reponse: ReponseFait) => void;

	// ── 3 et 4. Ce qui est supposé, et ce qui n'est pas vu ─────────────────
	readonly hypotheses: readonly HypotheseAffichee[];
	readonly anglesMorts: readonly AngleMortAffiche[];

	// ── 5. Les pièces ──────────────────────────────────────────────────────
	readonly pieces: readonly PieceAffichee[];
	readonly optionsTypePiece: readonly OptionTypePiece[];
	readonly onDeposer: (fichiers: File[]) => void;
	readonly onClasser: (pieceId: string, type: string) => void;
	readonly onRetirer: (pieceId: string) => void;

	// ── 6. Les voies, et ce qui court ──────────────────────────────────────
	/** Ce qui court depuis l'engagement, ou `null`. Vient de `suiviDeLaCreance`. */
	readonly suivi: SuiviAffiche | null;
	readonly voies: readonly VoieAffichee[];
	readonly carnet: readonly FicheIntervenant[];
	/** L'intervenant rattaché, relu PAR IDENTIFIANT. `null` : moi-même. */
	readonly intervenantChoisi: string | null;
	readonly nomIntervenant: string | null;
	/** `apresProcedure.consignerEvenement` — la date du FAIT, jamais celle de la saisie. */
	readonly onConsigner: (cle: string, survenuLe: string) => void;
	/** `apresProcedure.engagerProcedure`, puis `rattacherIntervenant` si le choix a été dit. */
	readonly onDeclarer: (procedure: string, engageeLe: string, choix: ChoixDeclare) => void;
	/** `apresProcedure.rattacherIntervenant`, après coup. */
	readonly onRattacher: (intervenantId: string | null) => void;
	readonly onAjouterFiche: (fiche: FicheASaisir) => void;
	readonly onOublierFiche: (intervenantId: string) => void;

	// Les deux recherches de répertoire : leur état vit hors du volet, parce que
	// leurs requêtes sont SAUTÉES tant que la feuille est fermée.
	readonly rechercheCommissaireOuverte: boolean;
	readonly etatRechercheCommissaire: EtatRechercheCommissaire;
	readonly onOuvrirRechercheCommissaire: () => void;
	readonly onFermerRechercheCommissaire: () => void;
	readonly onChercherCommissaire: (departement: string) => void;
	readonly onRetenirEtude: (etude: EtudeAffichee) => void;
	readonly rechercheAvocatOuverte: boolean;
	readonly repertoire: RepertoireAffiche | null;
	readonly barreau: string;
	readonly specialite: string;
	readonly etatRechercheAvocat: EtatRechercheAvocat;
	readonly onOuvrirRechercheAvocat: () => void;
	readonly onFermerRechercheAvocat: () => void;
	readonly onChoisirBarreau: (barreau: string) => void;
	readonly onChoisirSpecialite: (specialite: string) => void;
	readonly onRetenirAvocat: (avocat: AvocatAffiche) => void;

	// ── 7. Le journal unique ───────────────────────────────────────────────
	readonly journal: readonly FaitDuJournal[];

	// ── 8. Le bilan du dépôt d'où viennent ces factures ────────────────────
	readonly depot: DepotAffiche | null;

	// ── 9. Les brouillons de courrier ──────────────────────────────────────
	readonly relances: readonly NiveauAffiche[];

	// ── La position « Décompte » ───────────────────────────────────────────
	readonly decomptesArretes: readonly DecompteArreteAffiche[];

	// ── La position « Conversation » ───────────────────────────────────────
	/**
	 * LE FIL DU DOSSIER, SON COMPTEUR DE COÛT ET SON REFUS ÉVENTUEL.
	 *
	 * ⚠️ IL ARRIVE EN PROPRIÉTÉS, COMME TOUT LE RESTE DE CE VOLET. L'écran ne
	 * parle à aucune fonction Convex : c'est ce qui permet à la salle
	 * d'exposition de le rendre aux quatre largeurs sans backend ni compte, et
	 * c'est aussi ce qui rendra la bascule (T15) révocable en trois fichiers.
	 */
	readonly conversation: ConversationAffichee;

	readonly enCours: boolean;
	readonly erreur: string | null;
	/** La date du jour, venue de la SEULE horloge de l'interface. */
	readonly aujourdHui: string;
}

/** Ce qui attend une réponse du gérant, et rien d'autre. */
function aConfirmer(ligne: LigneOuverte): number {
	return ligne.litige.questions.length;
}

/**
 * LES SECTIONS QUI S'OUVRENT QUAND L'ADRESSE N'EN NOMME AUCUNE.
 *
 * Le montant, toujours : c'est le chiffre qu'on vient chercher. Et la section
 * qui attend une réponse quand il y en a une — la seule qui BLOQUE.
 *
 * ⚠️ UNE SEULE FONCTION POUR LA FILE ET POUR LE VOLET. La file construit
 * l'adresse `?ligne=…` ; ce volet l'applique. Deux règles écrites séparément
 * finiraient par ouvrir une section et en désigner une autre.
 */
export function sectionsParDefaut(ligne: LigneOuverte): readonly SectionVolet[] {
	return aConfirmer(ligne) > 0 ? ['montant', 'acquis'] : ['montant'];
}

export function EcranVolet({
	ligneId,
	donnees,
	position,
	onPosition,
	sectionsOuvertes,
	onSectionsOuvertes,
	onFermer
}: {
	/**
	 * L'IDENTIFIANT QUE L'ADRESSE PORTE, tel quel.
	 *
	 * ⚠️ C'est la seule chose que le volet reçoit de la file, et c'est
	 * volontairement une chaîne : la file et le volet se branchent l'un à
	 * l'autre par une ADRESSE, pas par un objet partagé.
	 */
	readonly ligneId: string;
	readonly donnees: Lecture<LigneOuverte>;
	readonly position: PositionVolet;
	readonly onPosition: (position: PositionVolet) => void;
	readonly sectionsOuvertes: readonly SectionVolet[];
	readonly onSectionsOuvertes: (sections: readonly SectionVolet[]) => void;
	/** Fermer le volet, c'est retirer `?ligne=` de l'adresse. La file le fait. */
	readonly onFermer: () => void;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<EnteteVolet ligne={pret} onFermer={onFermer} />

			{/*
			  LE `Segmented` DANS UNE `Toolbar`, comme le kit le prescrit : c'est
			  elle qui donne sa taille et son accent aux segments, et sans elle ce
			  sont trois boutons qui flottent dans leur parent.
			*/}
			<div className="shrink-0 overflow-x-auto px-cladd-2xs pb-cladd-3xs">
				<Toolbar>
					<Segmented activeColor="brand" activeVariant="solid">
						{POSITIONS_VOLET.map((p) => (
							<SegmentedButton key={p} active={p === position} onClick={() => onPosition(p)}>
								{LIBELLE_POSITION[p]}
							</SegmentedButton>
						))}
					</Segmented>
				</Toolbar>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-cladd-2xs pb-cladd-xs">
				{donnees.etat === 'attente' ? (
					<p className="text-cladd-2xs text-cladd-fg-softer" role="status">
						Lecture du dossier…
					</p>
				) : null}

				{donnees.etat === 'erreur' ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Ce dossier ne s’est pas lu. Les autres rangées de la file restent à l’écran : seule
						celle-ci manque, et elle se recharge en la rouvrant.
					</p>
				) : null}

				{pret === null ? null : (
					<CorpsVolet
						ligneId={ligneId}
						ligne={pret}
						position={position}
						sectionsOuvertes={sectionsOuvertes}
						onSectionsOuvertes={onSectionsOuvertes}
					/>
				)}
			</div>
		</div>
	);
}

/**
 * L'EN-TÊTE DU VOLET : DE QUI ON PARLE, ET LA SORTIE.
 *
 * ⚠️ LA CROIX N'APPARAÎT QU'À PARTIR DE 1024 PX. En dessous, `TwoPane` rend le
 * volet en feuille et pose déjà la sienne en haut à gauche : deux croix sur la
 * même feuille se lisent comme deux sorties différentes.
 */
function EnteteVolet({ ligne, onFermer }: { ligne: LigneOuverte | null; onFermer: () => void }) {
	return (
		<div className="flex shrink-0 items-start justify-between gap-cladd-3xs p-cladd-2xs">
			<div className="flex min-w-0 flex-col gap-1">
				<h2 className="truncate text-letikette-titre font-bold tracking-tight">
					{ligne?.debiteur ?? 'Dossier'}
				</h2>
				{ligne === null ? null : (
					<>
						<p className="text-cladd-2xs text-cladd-fg-softer">
							{ligne.nombreFactures} facture{pluriel(ligne.nombreFactures)} ·{' '}
							{eurosCentimes(ligne.principalRestantDu)} restant dû
						</p>
						{/*
						  ⚠️ UNE PUCE NEUTRE, JAMAIS VERTE. Le vert, le rouge et l'ambre ne
						  disent qu'une chose dans ce produit — au-dessus du seuil, tout
						  près, en dessous. Un vert sur « Mûre pour une procédure » ferait
						  lire un seuil là où on vient précisément d'en retirer un.
						*/}
						<Chip className="self-start" size="md" color="neutral">
							{ligne.eligible ? 'Mûre pour une procédure' : 'Pas encore mûre'}
						</Chip>
					</>
				)}
			</div>

			<Button
				square
				rounded
				variant="transparent"
				outline={false}
				aria-label="Fermer le volet"
				className="hidden shrink-0 lg:flex"
				onClick={onFermer}
			>
				<XIcon />
			</Button>
		</div>
	);
}

function CorpsVolet({
	ligneId,
	ligne,
	position,
	sectionsOuvertes,
	onSectionsOuvertes
}: {
	ligneId: string;
	ligne: LigneOuverte;
	position: PositionVolet;
	sectionsOuvertes: readonly SectionVolet[];
	onSectionsOuvertes: (sections: readonly SectionVolet[]) => void;
}) {
	if (position === 'CONVERSATION') return <PositionConversation conversation={ligne.conversation} />;
	if (position === 'DECOMPTE') return <PositionDecompte ligne={ligne} />;
	return (
		<PositionPiece
			ligneId={ligneId}
			ligne={ligne}
			sectionsOuvertes={sectionsOuvertes}
			onSectionsOuvertes={onSectionsOuvertes}
		/>
	);
}

/**
 * LA POSITION CONVERSATION — le seul endroit du volet qui passe par un modèle.
 *
 * ⚠️ AUCUN BOUTON MORT, ET AUCUN CHAMP GRISÉ. Un champ de saisie désactivé se
 * lit comme une panne. Quand le plafond de coût du mois a mordu, le champ
 * DISPARAÎT et le refus en quatre parties prend sa place — en commençant par
 * ce que le produit continue de faire, qui est presque tout.
 *
 * ⚠️ ET LE RESTE DU VOLET NE DÉPEND PAS D'ELLE. Les huit autres sections, le
 * décompte et ses segments, les hypothèses et les angles morts sont calculés :
 * une conversation arrêtée ne retire rien de ce qui s'affiche à côté.
 */
function PositionConversation({ conversation }: { conversation: ConversationAffichee }) {
	return <Conversation conversation={conversation} />;
}

/**
 * LA POSITION DÉCOMPTE — ce qui a été ARRÊTÉ, et rien d'autre.
 *
 * ⚠️ ELLE NE REDIT PAS LA SECTION 1, ET LA DIFFÉRENCE EST TOUT LE SUJET. La
 * section 1 répond à « combien réclame-t-on aujourd'hui » ; cette position
 * répond à « qu'a-t-on réclamé le jour où on l'a réclamé ». Un décompte arrêté
 * est figé, définitivement : rejouer produit un NOUVEAU décompte daté.
 */
function PositionDecompte({ ligne }: { ligne: LigneOuverte }) {
	return (
		<div className="flex flex-col gap-cladd-2xs">
			<SectionEcran
				titre="Ce qui a été arrêté"
				legende={
					ligne.decomptesArretes.length === 0
						? 'Aucun décompte arrêté'
						: `${ligne.decomptesArretes.length} pièce${pluriel(ligne.decomptesArretes.length)}, figée${pluriel(ligne.decomptesArretes.length)} et datée${pluriel(ligne.decomptesArretes.length)}`
				}
			>
				{ligne.decomptesArretes.length === 0 ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Rien n’a encore été arrêté sur ce dossier. Un décompte arrêté est figé
						définitivement : c’est le chiffre qu’un tiers refera à la main, et il ne change plus
						après.
					</p>
				) : (
					<ListeAnalyses>
						{ligne.decomptesArretes.map((arrete) => (
							<LigneAnalyseDecompte key={arrete.id} arrete={arrete} />
						))}
					</ListeAnalyses>
				)}

				<div className="flex flex-wrap gap-cladd-3xs">
					<BoutonSecondaire as={Lien} to="/app/arret/$id" params={{ id: ligne.creanceId } as never}>
						Arrêter un décompte
					</BoutonSecondaire>
				</div>

				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
					L’arrêt est le seul geste irréversible de ce produit, et il a son écran à lui : le
					contrôle de complétude y chiffre ce qui serait abandonné avant que le bouton ne soit
					atteignable.
				</p>
			</SectionEcran>
		</div>
	);
}

/**
 * Une pièce arrêtée, en rangée : sa date et son total, et elle s'ouvre à son
 * adresse.
 *
 * ⚠️ LA DESTINATION EST TYPÉE PAR LE ROUTEUR, sans assertion : la pièce arrêtée
 * a une adresse à elle, et une route supprimée deviendrait une erreur de
 * compilation au lieu d'un lien mort découvert au doigt.
 */
function LigneAnalyseDecompte({ arrete }: { arrete: DecompteArreteAffiche }) {
	return (
		<LigneAnalyse
			vers="/app/decompte/$id"
			parametres={{ id: arrete.id }}
			titre={`Arrêté au ${dateCourte(arrete.arreteAu)}`}
			precision="Figé, daté, il ne change plus"
			valeur={eurosCentimes(arrete.total)}
		/>
	);
}

/** LA POSITION PIÈCE : un seul flux vertical, dans l'ordre de ce qui engage le plus. */
function PositionPiece({
	ligneId,
	ligne,
	sectionsOuvertes,
	onSectionsOuvertes
}: {
	ligneId: string;
	ligne: LigneOuverte;
	sectionsOuvertes: readonly SectionVolet[];
	onSectionsOuvertes: (sections: readonly SectionVolet[]) => void;
}) {
	const aDemander = aConfirmer(ligne);

	return (
		<div className="flex flex-col gap-cladd-2xs">
			{ligne.erreur === null ? null : (
				<p className="text-cladd-xs text-cladd-fg">{ligne.erreur}</p>
			)}

			{/*
			  ⚠️ UN SEUL CONTENEUR, ET C'EST UN DÉFAUT CORRIGÉ AU NAVIGATEUR. Les
			  sections repliables étaient réparties sur DEUX conteneurs, de part et
			  d'autre des deux sections qui ne se replient pas. Chacun ne connaît que
			  ses propres clés : ouvrir « Les brouillons » renvoyait donc la liste des
			  ouvertes du SECOND conteneur seul, ce qui refermait « Le montant » du
			  premier. Deux sections ne pouvaient jamais être ouvertes ensemble — le
			  contraire exact de ce que `multiple` achète.
			  `AccordionRoot` ne rend aucun DOM : les deux sections à plat vivent donc
			  DANS le conteneur, à leur place dans le flux, sans en être des items.
			*/}
			<SectionsDepliables
				ouvertes={sectionsOuvertes}
				onOuvertesChange={(ouvertes) =>
					onSectionsOuvertes(
						// Le kit rend des chaînes libres ; seules celles que ce volet
						// déclare entrent dans l'adresse. Une clé inconnue viendrait d'un
						// signet écrit à la main, et ouvrirait une section qui n'existe pas.
						ouvertes.filter((cle): cle is SectionVolet =>
							(SECTIONS_VOLET as readonly string[]).includes(cle)
						)
					)
				}
			>
				<SectionMontant ligne={ligne} />
				<SectionAcquis ligne={ligne} aDemander={aDemander} />
				<SectionHypotheses ligne={ligne} />
				<SectionAnglesMorts ligne={ligne} />
				<SectionPieces ligne={ligne} />
				<SectionVoies ligne={ligne} />
				<SectionJournal ligne={ligne} />
				<SectionDepot ligne={ligne} />
				<SectionBrouillons ligne={ligne} ligneId={ligneId} />
			</SectionsDepliables>
		</div>
	);
}

/**
 * SECTION 1 — LE MONTANT, DÉCOMPOSÉ EN PLACE.
 *
 * Principal, indemnité forfaitaire par facture, puis un segment par période de
 * taux, chacun rendant ses quatre termes : base, taux, jours, base annuelle.
 * Un total qu'on ne peut pas décomposer est un chiffre qu'on demande de croire ;
 * décomposé, il se refait à la main — ce que fera le débiteur qui le conteste.
 *
 * ⚠️ LA FICHE DU PARAMÈTRE SE REND UNE FOIS PAR SURFACE, PAS UN « (i) » PAR
 * SEGMENT, ET C'EST UN ÉCART ASSUMÉ AVEC LA LETTRE DE LA SPEC. La fiche est
 * attachée à un PARAMÈTRE, pas à un segment : les quinze paramètres portent le
 * même état, et douze segments d'une même créance renverraient douze fois aux
 * deux mêmes fiches. `referentiel.ts` a déjà tranché cette question pour la
 * mention d'en-tête, dans ces termes : « le répéter à chaque segment serait du
 * bruit, et le bruit s'apprend ». Le tableau ci-dessous porte exactement ce que
 * le « (i) » aurait ouvert : valeur, source, date de relevé, `verifie`,
 * `valideParAvocat`.
 */
function SectionMontant({ ligne }: { ligne: LigneOuverte }) {
	const montant = ligne.montantDuJour;

	return (
		<SectionDepliable
			cle="montant"
			titre="Le montant, décomposé"
			legende="Au jour d’aujourd’hui, et il bouge chaque jour"
			valeur={montant === null ? 'non calculé' : eurosCentimes(montant.total)}
		>
			{montant === null ? (
				ligne.refusDuMontant === null ? (
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Le montant ne se calcule pas, et la raison n’a pas été rendue. C’est un défaut : un
						refus sans ses quatre parties est un mur.
					</p>
				) : (
					<RefusEnQuatreParties
						peutFaire={ligne.refusDuMontant.peutFaire}
						constat={ligne.refusDuMontant.constat}
						blocages={ligne.refusDuMontant.blocages}
						coutDeLAttente={ligne.refusDuMontant.coutDeLAttente}
					/>
				)
			) : (
				<>
					<Decompte decompte={montant} />
					{/* ⚠️ CETTE PHRASE NE SE REND QU'AVEC UN MONTANT. Sous un refus, elle
					    disait « ce montant se recalcule » à propos d'un montant qui ne se
					    calcule pas. */}
					<p className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						Ce montant n’est pas arrêté : il se recalcule à chaque lecture, et il augmente tant
						que la facture n’est pas réglée. Ce qui s’oppose à un tiers est un décompte arrêté,
						daté et figé.
					</p>
				</>
			)}

			<FichesDesParametres fiches={ligne.fiches} />
		</SectionDepliable>
	);
}

/** Les valeurs juridiques employées, telles qu'un tiers doit pouvoir les contrôler. */
function FichesDesParametres({ fiches }: { fiches: readonly FicheParametre[] }) {
	if (fiches.length === 0) return null;

	const verifiees = fiches.filter((fiche) => fiche.verifie).length;
	const controlees = fiches.filter((fiche) => fiche.valideParAvocat).length;

	return (
		<>
			<p className="text-cladd-2xs text-cladd-fg-softer">
				Les valeurs juridiques employées : {verifiees} relevée{pluriel(verifiees)} sur{' '}
				{fiches.length} sur une source publique citable, {controlees} contrôlée
				{pluriel(controlees)} par un juriste.
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
	);
}

/**
 * SECTION 2 — CE QUI EST ACQUIS, ET CE QUI RESTE À CONFIRMER.
 *
 * ⚠️ JAMAIS UN POURCENTAGE (D8, B8). Un pourcentage sur un critère juridique
 * invente une nuance que le droit n'a pas : une condition est établie ou elle
 * ne l'est pas. « 2 sur 4 » se vérifie ; « 62 % de solidité » ne se vérifie pas,
 * et ne dit pas ce qui le ferait monter.
 */
function SectionAcquis({ ligne, aDemander }: { ligne: LigneOuverte; aDemander: number }) {
	return (
		<SectionDepliable
			cle="acquis"
			titre="Ce qui est acquis, ce qui reste à confirmer"
			legende={
				aDemander > 0
					? 'Le seul point où le logiciel attend quelque chose de vous'
					: 'Des faits, pas du droit'
			}
			valeur={
				aDemander > 0
					? `${aDemander} à confirmer`
					: `${ligne.solidite.etablies} sur ${ligne.solidite.attendues}`
			}
		>
			<Solidite solidite={ligne.solidite} />
			<QuestionnaireLitige
				questions={ligne.litige.questions}
				constats={ligne.litige.constats}
				litigieux={ligne.litige.litigieux}
				enCours={ligne.enCours}
				onRepondre={ligne.onRepondre}
			/>
		</SectionDepliable>
	);
}

/**
 * SECTION 3 — CE QUE LE LOGICIEL A SUPPOSÉ. JAMAIS REPLIÉE.
 *
 * Chaque hypothèse est adossée au FAIT qui l'a produite et corrigeable en
 * place, la correction refaisant le total sous les yeux. Une hypothèse repliée
 * est une hypothèse qu'on ne lit pas : elle se rend donc hors de l'accordéon,
 * en `SectionEcran`, à sa place dans le flux.
 */
function SectionHypotheses({ ligne }: { ligne: LigneOuverte }) {
	return (
		<SectionEcran
			titre="Ce que le logiciel a supposé"
			legende={
				ligne.hypotheses.length === 0
					? 'Rien n’est supposé sur ce dossier'
					: `${ligne.hypotheses.length} hypothèse${pluriel(ligne.hypotheses.length)}, et chacune se lève`
			}
		>
			{ligne.hypotheses.length === 0 ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Tout ce qui entre dans ce dossier est relevé sur une donnée que vous avez fournie ou sur
					un registre public. Aucune valeur n’y est retenue par défaut.
				</p>
			) : (
				ligne.hypotheses.map((hypothese) => (
					<div key={hypothese.cle} className="flex flex-col gap-1">
						<p className="text-cladd-sm leading-relaxed font-medium text-balance">
							{hypothese.enonce}
						</p>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{hypothese.fait}</p>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">
							{hypothese.ceQuiLaLeve}
						</p>
						{hypothese.geste === undefined ? null : (
							<div className="flex flex-wrap gap-cladd-3xs">
								<BoutonSecondaire onClick={hypothese.geste.onGeste} disabled={ligne.enCours}>
									{hypothese.geste.libelle}
								</BoutonSecondaire>
							</div>
						)}
					</div>
				))
			)}
		</SectionEcran>
	);
}

/**
 * SECTION 4 — CE QUE LE LOGICIEL NE VOIT PAS, CHIFFRÉ. JAMAIS REPLIÉE.
 *
 * ⚠️ UN UTILISATEUR QUI CROIT SA PRESCRIPTION SURVEILLÉE NE LA SURVEILLE PAS
 * LUI-MÊME. C'est la seule échéance qui éteint définitivement une créance sans
 * que personne n'ait rien fait, et le silence du produit sur ce qu'il ne voit
 * pas est ce qui la rend dangereuse. Le reléguer sous ce qui rassure reviendrait
 * à le cacher.
 */
function SectionAnglesMorts({ ligne }: { ligne: LigneOuverte }) {
	const chiffrables = ligne.anglesMorts.filter((angle) => angle.montantEnJeu !== null);
	const total = chiffrables.reduce((somme, angle) => somme + (angle.montantEnJeu ?? 0n), 0n);
	const nonChiffrables = ligne.anglesMorts.length - chiffrables.length;

	return (
		<SectionEcran
			titre="Ce que le logiciel ne voit pas"
			legende={
				ligne.anglesMorts.length === 0
					? 'Aucun angle mort relevé sur ce dossier'
					: nonChiffrables === 0
						? `${eurosCentimes(total)} hors surveillance`
						: `${eurosCentimes(total)} hors surveillance, plus ${nonChiffrables} point${pluriel(nonChiffrables)} non chiffrable${pluriel(nonChiffrables)}`
			}
		>
			{ligne.anglesMorts.length === 0 ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Toutes les factures de ce dossier portent une date de départ exploitable, et son échéance
					se compte. Ce contrôle se refait à chaque lecture.
				</p>
			) : (
				ligne.anglesMorts.map((angle) => (
					<p
						key={angle.cle}
						className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft"
					>
						<EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						<span>
							{angle.constat}{' '}
							<span className="font-semibold tabular-nums">
								{angle.montantEnJeu === null
									? '(montant non chiffrable)'
									: `(${eurosCentimes(angle.montantEnJeu)})`}
							</span>
						</span>
					</p>
				))
			)}
		</SectionEcran>
	);
}

/** SECTION 5 — LES PIÈCES. Le dépôt, le classement, le retrait. */
function SectionPieces({ ligne }: { ligne: LigneOuverte }) {
	return (
		<SectionDepliable
			cle="pieces"
			titre="Les pièces"
			legende="Déposées ici, lues et classées toutes seules"
			valeur={`${ligne.pieces.length}`}
		>
			<Pieces
				pieces={ligne.pieces}
				optionsType={ligne.optionsTypePiece}
				enCours={ligne.enCours}
				onDeposer={ligne.onDeposer}
				onClasser={ligne.onClasser}
				onRetirer={ligne.onRetirer}
			/>
		</SectionDepliable>
	);
}

/**
 * SECTION 6 — LES VOIES ENVISAGEABLES, ÉNUMÉRÉES SANS ORDRE, ET CE QUI COURT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ÉNUMÉRÉES, JAMAIS CLASSÉES, ET JAMAIS RECOMMANDÉES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la troisième ligne rouge du projet. Le produit a le droit d'ÉNUMÉRER
 * sans ordre ce que du code écrit ; il n'a pas le droit d'en conseiller une.
 * Aucune n'est mise en avant, et les indisponibles s'affichent AVEC leur motif :
 * un écran qui masquerait une voie laisserait croire qu'elle n'existe pas,
 * alors que ce qui manque est une valeur juridique.
 *
 * ⚠️ ET ELLES SONT DISPONIBLES AVANT L'ARRÊT DU DÉCOMPTE, pas seulement dans le
 * PDF qui le suit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA SEULE SAISIE DE DATE QUE LE PRODUIT NE PEUT PAS DÉDUIRE EST ICI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est la date du FAIT, pas celle de la saisie. Un gérant qui enregistre le
 * 20 mars une ordonnance signifiée le 3 verrait ses trois mois partir du 20 :
 * dix-sept jours offerts en silence sur l'échéance la plus dangereuse du
 * produit. Elle part sur la date du jour et se corrige d'un geste. Elle vit
 * dans `SuiviProcedure` pour un fait de procédure, et dans `FeuilleDeclaration`
 * pour l'engagement lui-même.
 */
function SectionVoies({ ligne }: { ligne: LigneOuverte }) {
	/*
	  ⚠️ LES FEUILLES SONT UN ÉTAT D'ÉCRAN, PAS UN ÉTAT D'ADRESSE. Rien ici ne
	  survit à un rechargement, et c'est voulu : on ne met pas en signet une
	  feuille ouverte. Seules `?ligne=`, la position et les sections ouvertes
	  sont adressables.

	  Les DEUX recherches de répertoire font exception et vivent en props : leurs
	  requêtes sont sautées tant que la feuille est fermée, donc l'ouverture doit
	  être visible de la couche qui interroge la base.
	*/
	const [voieOuverte, setVoieOuverte] = useState<string | null>(null);
	const [voieDeclaree, setVoieDeclaree] = useState<string | null>(null);
	const [carnetOuvert, setCarnetOuvert] = useState(false);

	// Tout se DÉRIVE du rendu : aucune de ces valeurs n'est un état, donc aucune
	// ne peut être en retard d'un rendu sur la donnée qui la porte.
	const voie = ligne.voies.find((v) => v.cle === voieOuverte) ?? null;
	const declaree = ligne.voies.find((v) => v.cle === voieDeclaree) ?? null;
	const envisageables = ligne.voies.filter((v) => v.disponible).length;

	return (
		<SectionDepliable
			cle="voies"
			titre={ligne.suivi === null ? 'Les voies envisageables' : 'Ce qui court depuis l’engagement'}
			/*
			  ⚠️ LA LÉGENDE NE REDIT PAS LE LIBELLÉ DU SUIVI. Elle le reprenait, et
			  `SuiviProcedure` l'affiche deux lignes plus bas : la rangée dépliée
			  lisait « Ordonnance rendue » trois fois de suite.
			*/
			legende={
				ligne.suivi === null
					? 'Énumérées, jamais classées. Aucune n’est mise en avant.'
					: 'Ce qui court, et les délais qui en découlent'
			}
			valeur={
				ligne.suivi !== null
					? 'Engagée'
					: envisageables > 0
						? `${envisageables} voie${pluriel(envisageables)}`
						: 'Aucune voie'
			}
		>
			{ligne.suivi === null ? (
				<>
					<ListeAnalyses>
						{ligne.voies.map((v) => (
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
					{/* ⚠️ « Énumérées, jamais classées » NE SE DIT QU'UNE FOIS, et c'est
					    dans la légende — visible même repliée. Elle était répétée sous la
					    liste, ce qui faisait lire deux fois la même phrase à trente
					    centimètres d'écart. */}
				</>
			) : (
				<>
					<SuiviProcedure
						suivi={ligne.suivi}
						aujourdHui={ligne.aujourdHui}
						enCours={ligne.enCours}
						onConsigner={ligne.onConsigner}
					/>
					{/* ⚠️ LA QUESTION SE POSE APRÈS COUP AUSSI. Un gérant qui a déclaré
					    sans le dire doit pouvoir nommer son intervenant plus tard :
					    sans cette rangée, « je le dirai plus tard » serait un mensonge. */}
					<ListeAnalyses>
						<LigneBouton
							titre="Qui fait l’acte"
							valeur={ligne.nomIntervenant ?? 'Moi-même'}
							onClick={() => setCarnetOuvert(true)}
						/>
					</ListeAnalyses>
				</>
			)}

			<FeuilleVoie
				voie={voie}
				ouverte={voie !== null}
				onFermer={() => setVoieOuverte(null)}
				onDeclarer={() => setVoieDeclaree(voie?.cle ?? null)}
			/>

			{/*
			  ⚠️ LA FEUILLE DE DÉCLARATION SE REMONTE À CHAQUE VOIE, par sa `key` :
			  c'est ce qui remet la date à aujourd'hui et le choix à « rien dit »
			  sans le moindre effet. Ouvrir une voie, refermer, en ouvrir une autre
			  et retrouver la date de la première serait une erreur silencieuse sur
			  la seule donnée que ce geste enregistre.

			  ⚠️ ET C'EST ICI QUE `engagerProcedure` SE REBRANCHE. Voir l'en-tête de
			  `LigneOuverte`.
			*/}
			{declaree === null ? null : (
				<FeuilleDeclaration
					key={declaree.cle}
					carnet={ligne.carnet}
					enCours={ligne.enCours}
					aujourdHui={ligne.aujourdHui}
					onFermer={() => setVoieDeclaree(null)}
					onAjouter={ligne.onAjouterFiche}
					onOublier={ligne.onOublierFiche}
					onChercherUnCommissaire={ligne.onOuvrirRechercheCommissaire}
					onChercherUnAvocat={ligne.onOuvrirRechercheAvocat}
					onDeclarer={(engageeLe, choix) => {
						ligne.onDeclarer(declaree.cle, engageeLe, choix);
						setVoieDeclaree(null);
						setVoieOuverte(null);
					}}
				/>
			)}

			<ChoixIntervenant
				carnet={ligne.carnet}
				choisi={ligne.intervenantChoisi}
				ouverte={carnetOuvert}
				onFermer={() => setCarnetOuvert(false)}
				onChoisir={(intervenantId) => {
					ligne.onRattacher(intervenantId);
					setCarnetOuvert(false);
				}}
				onAjouter={ligne.onAjouterFiche}
				onOublier={ligne.onOublierFiche}
				onChercherUnCommissaire={ligne.onOuvrirRechercheCommissaire}
				onChercherUnAvocat={ligne.onOuvrirRechercheAvocat}
			/>

			{/*
			  LES DEUX RECHERCHES DE RÉPERTOIRE, SŒURS DES AUTRES DANS L'ARBRE.
			  Cladd les empile comme iOS : celle du dessous recule et garde son piège
			  à focus. Elles ne sont JAMAIS imbriquées.
			*/}
			<RechercheCommissaire
				ouverte={ligne.rechercheCommissaireOuverte}
				etat={ligne.etatRechercheCommissaire}
				onFermer={ligne.onFermerRechercheCommissaire}
				onChercher={ligne.onChercherCommissaire}
				onRetenir={ligne.onRetenirEtude}
			/>
			<RechercheAvocat
				ouverte={ligne.rechercheAvocatOuverte}
				repertoire={ligne.repertoire}
				barreau={ligne.barreau}
				specialite={ligne.specialite}
				etat={ligne.etatRechercheAvocat}
				onFermer={ligne.onFermerRechercheAvocat}
				onChoisirBarreau={ligne.onChoisirBarreau}
				onChoisirSpecialite={ligne.onChoisirSpecialite}
				onRetenir={ligne.onRetenirAvocat}
			/>
		</SectionDepliable>
	);
}

/**
 * SECTION 7 — LE JOURNAL UNIQUE.
 *
 * Ce que la machine a fait et ce que le gérant a dit s'y mêlent, avec l'état
 * avant et après : « Qualité passée de indéterminée à commerçant, forme SAS
 * relevée au registre, BODACC du 16/09 ».
 *
 * ⚠️ C'EST LE SEUL POINT D'ENTRÉE D'UNE CONTESTATION REÇUE HORS DU LOGICIEL, et
 * c'est ce qu'on relit à deux ans quand la question devient « qu'a-t-on fait,
 * et quand ».
 *
 * ⚠️ DEUX AUTEURS ET PAS TROIS. Le compagnon n'est pas un troisième auteur : ce
 * qu'il propose vit dans `propositions` tant que personne ne l'a retenu, et lui
 * inventer une signature ici ferait croire qu'un tiers a décidé quelque chose.
 */
function SectionJournal({ ligne }: { ligne: LigneOuverte }) {
	return (
		<SectionDepliable
			cle="journal"
			titre="Le journal"
			legende="Ce que la machine a fait, ce que vous avez dit"
			valeur={`${ligne.journal.length}`}
		>
			{ligne.journal.length === 0 ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Rien n’a encore été consigné sur ce dossier. Chaque relevé au registre, chaque réponse
					et chaque fait de procédure y entrera, daté, avec l’état d’avant et celui d’après.
				</p>
			) : (
				ligne.journal.map((fait) => (
					<div key={fait.id} className="flex flex-col gap-1">
						<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
							<span className="text-cladd-sm font-medium">{fait.libelle}</span>
							<span className="shrink-0 text-cladd-2xs text-cladd-fg-softer tabular-nums">
								{dateCourte(new Date(fait.consigneLe).toISOString().slice(0, 10))}
							</span>
						</div>
						{fait.avant === undefined && fait.apres === undefined ? null : (
							<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{fait.avant ?? 'non renseigné'} → {fait.apres ?? 'non renseigné'}
							</p>
						)}
						<p className="text-cladd-2xs text-cladd-fg-softest">
							{fait.auteur === 'MACHINE' ? 'Relevé par le logiciel' : 'Déclaré par vous'}
							{fait.source === undefined ? '' : ` · ${fait.source}`}
						</p>
					</div>
				))
			)}
		</SectionDepliable>
	);
}

/**
 * SECTION 8 — LE BILAN DU DÉPÔT D'OÙ VIENNENT CES FACTURES.
 *
 * Rendu par `BilanImport` tel qu'il existe : factures créées, règlements,
 * débiteurs, doublons, hors périmètre, orphelins, et les lignes illisibles une
 * par une avec leur raison. Une ligne qu'on n'a pas su lire est de l'argent
 * potentiellement perdu.
 */
function SectionDepot({ ligne }: { ligne: LigneOuverte }) {
	const depot = ligne.depot;

	return (
		<SectionDepliable
			cle="depot"
			titre="D’où viennent ces factures"
			legende={depot === null ? undefined : depot.filename}
			valeur={
				depot === null
					? 'saisie directe'
					: depot.bilan === undefined
						? 'en cours'
						: `${depot.bilan.ignoreesTotal} illisible${pluriel(depot.bilan.ignoreesTotal)}`
			}
		>
			{depot === null ? (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Ces factures ne viennent d’aucun dépôt de fichier : elles ont été saisies directement.
					Il n’y a donc pas de bilan de lecture à relire, ni de ligne écartée à rattraper.
				</p>
			) : (
				<BilanImport depot={depot} avecNom={false} />
			)}
		</SectionDepliable>
	);
}

/**
 * SECTION 9 — LES BROUILLONS DE COURRIER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RIEN NE PART D'ICI (B5), ET LES TROIS REFUS S'AFFICHENT (B12)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Relances` porte déjà les deux : aucune commande d'envoi, et les quatre
 * parties d'un refus quand `composerRelance()` a rendu `disponible: false`.
 * Les refus sont TROIS, pas deux :
 *
 *   1. la suspension sur un débiteur en procédure collective ou radié, citée
 *      mot pour mot depuis le registre ;
 *   2. la mise en demeure indisponible faute de mentions obligatoires relevées
 *      — une mise en demeure irrégulière est pire qu'aucune, parce que le
 *      créancier calcule la suite sur un délai qui n'a jamais couru ;
 *   3. le niveau 2 sans décompte arrêté, et c'est le SEUL qui se lève d'un
 *      geste. La rangée porte « Arrêter le décompte » vers `/app/arret/$id`.
 *
 * Un refus qui a un geste et qu'on rend sans le geste est le pire des deux
 * mondes.
 */
function SectionBrouillons({ ligne, ligneId }: { ligne: LigneOuverte; ligneId: string }) {
	const prets = ligne.relances.filter((niveau) => niveau.disponible).length;

	return (
		<SectionDepliable
			cle="brouillons"
			titre="Ce que vous pouvez lui écrire"
			legende="Visible par vous seul, non envoyé"
			valeur={prets > 0 ? `${prets} prêt${pluriel(prets)}` : 'Suspendues'}
		>
			{/*
			  ⚠️ L'IDENTIFIANT EST CELUI DE LA CRÉANCE, PAS CELUI DE LA LIGNE. Le
			  geste « Arrêter le décompte » mène à `/app/arret/$id`, dont le segment
			  est une créance. Les confondre ouvrirait l'arrêt d'un autre dossier le
			  jour où la file adressera ses rangées autrement qu'à la créance.
			*/}
			<Relances niveaux={ligne.relances} identifiant={ligne.creanceId} />
			{ligne.creanceId === ligneId ? null : (
				<p className="text-cladd-2xs text-cladd-fg-softest">
					Rangée {ligneId}, créance {ligne.creanceId}.
				</p>
			)}
		</SectionDepliable>
	);
}
