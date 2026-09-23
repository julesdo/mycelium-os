/**
 * Les primitives Letikette.
 *
 * C'est la SEULE zone du produit où des classes Tailwind s'écrivent. Une règle
 * ESLint interdit les valeurs arbitraires, les couleurs littérales et les
 * tailles de police partout ailleurs, en échec de build.
 *
 * Ce qui vit ici : ce que Cladd ne fournit pas et qui porte une décision de
 * conception du produit. Ce qui n'y vit pas : les contrôles (bouton, champ,
 * select, dialogue), qui viennent de `@cladd-ui/react` et ne sont jamais forkés.
 */

export { cn } from './cn';
export { IconeLetikette, LogoLetikette, MotLetikette } from './logo';
export { Tablette } from './tablette';
export { Page, PageHeader, PageBody, PageHero } from './page';
export {
	PageEcran,
	type Lecture,
	type EnteteEcran,
	type EtatEcran,
	type RetourEcran,
	type VideEcran,
	type VoletsEcran
} from './page-ecran';
export { Fond } from './fond';
export { Avatar, initiales, sourceImageAvatar, type ImageAvatar } from './avatar';
export {
	STYLES_AVATAR,
	LIBELLE_STYLE,
	GRAINES_DE_DEPART,
	imageAvatar,
	type StyleAvatar
} from './avatar-dicebear';
export { ChoixImage } from './choix-image';
export { aujourdHuiISO } from './horloge';
export { lirePourLeSujet, type PosePourUnSujet } from './etat-par-sujet';
export { ChiffreHero } from './chiffre';
export { RangeeActions, type ActionRonde } from './actions';
export { CarteListe, LigneValeur } from './carte-liste';
export { CarteDemarrage } from './carte-demarrage';
export { Faisceau } from './faisceau';
export { BoutonPrincipal, BoutonSecondaire } from './bouton';
export { CompositionDue, type PartsDues } from './composition';
export { TwoPane } from './two-pane';
export { MaitreDetail, useDeuxVolets } from './maitre-detail';
export { EmptyState } from './empty-state';
export { Facultatif, SourceDeRangees } from './facultatif';
export { CadreAuth, Champ, MessageErreur } from './cadre-auth';
export { Bandeau } from './bandeau';
export { SectionEcran } from './section';
export { SectionsDepliables, SectionDepliable } from './section-depliable';
export { RefusEnQuatreParties } from './refus';
export { ChampCopiable } from './champ-copiable';
export { ConfirmationParSaisie } from './confirmation-par-saisie';
export { ZoneDepot } from './zone-depot';
export { BilanImport, type DepotAffiche, type BilanDepotAffiche } from './bilan-import';
export {
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule
} from './tableau';
export { euros, eurosCentimes, partsEurosCentimes, dateCourte, pourcent, pluriel } from './format';

// ── Recouvrement ────────────────────────────────────────────────────────────
export {
	Decompte,
	PeriodesDInterets,
	type DecompteAffiche,
	type LigneDecompteAffichee,
	type SegmentAffiche
} from './decompte';
export {
	RemiseAuConseil,
	type EcartAffiche,
	type EtatRemise,
	type FicheDuCarnet,
	type RemiseAffichee,
	type SuiviConseilAffiche
} from './remise-conseil';
export { FluxEvenements, type EvenementAffiche, type UrgenceEvenement } from './flux-evenements';
export {
	RangeeFile,
	GroupeDeFile,
	PliDeLaFile,
	trierSelonLePli,
	type UrgenceRangee,
	type PropositionDeRangee,
	type DestinationRangee,
	type FaitsDuPli
} from './rangee-file';
export {
	ChocRevelation,
	BilanPertes,
	FacturesNonChiffrees,
	type RevelationAffichee,
	type LigneRevelationAffichee,
	type BilanPertesAffiche
} from './revelation';
export {
	IdentiteDebiteur,
	ChoixSecteur,
	type OptionSecteur,
	type PropositionTaux
} from './identite-debiteur';
export { HabitudePaiement, type HabitudeAffichee, type RuptureAffichee } from './habitude';
export { ConstatRegistre, type ConstatRegistreAffiche } from './identite-debiteur';
export {
	QuestionnaireLitige,
	type PropositionReponse,
	type QuestionLitige,
	type ReponseFait
} from './questionnaire-litige';
export { SuiviProcedure, type SuiviAffiche, type EcheanceAffichee } from './suivi-procedure';
export { RailProcedure, type EtapeAffichee, type StatutEtapeAffiche } from './rail-procedure';
export { Pieces, TYPES_PIECE, type PieceAffichee, type OptionTypePiece } from './pieces';
export { ListeAnalyses, LigneAnalyse, LigneBouton, EnteteDetail } from './navigation';
export { Lien, useProvenance } from './lien';
export { FeuilleVoie, type VoieAffichee } from './feuille-voie';
export { FeuilleDeclaration, type ChoixDeclare } from './feuille-declaration';
export {
	ChoixIntervenant,
	SaisirUneFiche,
	precisionDeLaFiche,
	type FicheIntervenant,
	type FicheASaisir,
	type RoleIntervenant
} from './choix-intervenant';
export { rangeeDuDebiteur, secteursProposes } from './identite-debiteur';
export { CeQuiManque, ceQuiManque, RangeeFranchie, type Verrou } from './ce-qui-manque';
/** ⚠️ TEMPORAIRE, ET DATÉ : la porte de la bascule. Elle part avec T16. */
export { PorteDeTransition, FERMETURE_DE_LA_PORTE } from './porte-de-transition';
export { VeilleurAvatar, type EtatVeilleur } from './veilleur-avatar';
export {
	RechercheRegistre,
	ListeCandidatsRegistre,
	sousLigneDuCandidat,
	sirenLisible,
	type EtatRecherche,
	type EtablissementPropose
} from './recherche-registre';
export {
	RechercheCommissaire,
	type EtatRechercheCommissaire,
	type EtudeAffichee,
	type ResultatAnnuaireAffiche
} from './recherche-commissaire';
export {
	RechercheAvocat,
	type EtatRechercheAvocat,
	type AvocatAffiche,
	type ResultatAvocatsAffiche,
	type RepertoireAffiche
} from './recherche-avocat';
export {
	PaletteRecherche,
	DeclencheurRecherche,
	bougesDuFlux,
	PREMIERS_PAR_FAMILLE,
	type FamilleRecherche,
	type ResultatRechercheAffiche,
	type RecentAffiche,
	type DestinationRecherche,
	type DebiteurTrouveAffiche,
	type FactureTrouveeAffichee,
	type ProcedureTrouveeAffichee
} from './palette-recherche';
export {
	Veilleur,
	travauxDuVeilleur,
	type TacheVeilleur,
	type EtatTravail,
	type DepotEnCours
} from './veilleur';
export { Solidite, type SoliditeAffichee, type EtageAffiche } from './solidite';
export { Relances, type NiveauAffiche } from './relances';
export {
	Lettrage,
	type PropositionLettrage,
	type CombinaisonAffichee,
	type DebiteurRapprochable
} from './lettrage';
export {
	Conversation,
	moisLisible,
	type CompteurConversation,
	type ConversationAffichee,
	type GenreSourcePhrase,
	type PhraseAffichee,
	type RefusAffiche,
	type TourAffiche
} from './conversation';

/* ── LA BARRE DU BAS ET LE COMPAGNON FLOTTANT (refonte/barre-et-compagnon) ──
 *
 * Les deux objets qui flottent au-dessus de tous les écrans de `/app`. Ils sont
 * montés une seule fois, dans la coquille (`app/shell.tsx`), et branchés par
 * `app/barre.tsx` et `app/compagnon.tsx` — eux ne dessinent rien. */
export { BarreDuBas, PastilleDeRappel, type DestinationBarre } from './barre-du-bas';
export { CompagnonFlottant, type EtatCompagnon } from './compagnon-flottant';

/* ── LE SOMMAIRE D'UNE LISTE (ecran/clients) ──────────────────────────────
 *
 * Le total d'une liste et ce qu'il recouvre, posé au-dessus d'elle. Écrit pour
 * la liste des clients ; il ne sait rien d'elle et tiendra pour la prochaine.
 * Voir le fichier : il dit pourquoi ce n'est pas `ChiffreHero`. */
export { SommaireEncours } from './sommaire-encours';
/* ── LES DOSSIERS ENGAGÉS ET « CE QUI EST DÛ » (ecran/dossiers) ─────────────
 *
 * Les deux écrans refaits sur références : `/app/procedures`, la liste des
 * dossiers rangée par l'échéance qui approche, et `/app/revelation`, le chiffre
 * qui justifie l'abonnement. Aucun des deux ne redessine un montant qu'un autre
 * composant rend déjà — voir l'en-tête de `ce-qui-est-du.tsx`. */
export {
	CarteDossier,
	ListeDesDossiers,
	VoletDuDossier,
	grouperParEcheance,
	joursDici,
	rangDuDossier,
	type DossierEngage,
	type EcheanceDuDossier,
	type GroupeDeDossiers,
	type RangDuDossier
} from './dossier';
export { CeQuiEstDu } from './ce-qui-est-du';

/* ── CE QUE LES DÉCOMPTES LAISSENT DE CÔTÉ (rebranche/abandons) ────────────
 *
 * Le contrôle de complétude, à l'échelle de l'établissement : ce qu'un décompte
 * déjà arrêté ne chiffrerait pas, et que l'acte qu'il fonde ne couvrirait donc
 * pas. Il complète « Ce qui est dû » par l'autre bout, et porte sa propre
 * lecture — voir l'en-tête du fichier. */
export {
	CeQueLesDecomptesLaissentDeCote,
	type AbandonAffiche,
	type AbandonsAffiches
} from './abandons-etablissement';

export {
	CarteConnexion,
	LogoConnexion,
	MonogrammeConnexion,
	type EtatConnexion
} from './carte-connexion';
export { Brume } from './brume';
