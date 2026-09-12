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
export { LogoLetikette, MotLetikette } from './logo';
export { Tablette } from './tablette';
export { Page, PageHeader, PageBody, PageHero } from './page';
export { Fond } from './fond';
export { Avatar, initiales } from './avatar';
export { aujourdHuiISO } from './horloge';
export { ChiffreHero } from './chiffre';
export { RangeeActions, type ActionRonde } from './actions';
export { CarteListe, LigneValeur } from './carte-liste';
export { CarteDemarrage } from './carte-demarrage';
export { Faisceau } from './faisceau';
export { BoutonPrincipal, BoutonSecondaire } from './bouton';
export { CompositionDue, type PartsDues } from './composition';
export { TwoPane } from './two-pane';
export { EmptyState } from './empty-state';
export { CadreAuth, Champ, MessageErreur } from './cadre-auth';
export { Bandeau } from './bandeau';
export { SectionEcran } from './section';
export { ChampCopiable } from './champ-copiable';
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
	type DecompteAffiche,
	type LigneDecompteAffichee,
	type SegmentAffiche
} from './decompte';
export { FluxEvenements, type EvenementAffiche, type UrgenceEvenement } from './flux-evenements';
export {
	ChocRevelation,
	BilanPertes,
	type RevelationAffichee,
	type LigneRevelationAffichee,
	type BilanPertesAffiche
} from './revelation';
export { IdentiteDebiteur, type OptionSecteur } from './identite-debiteur';
export { HabitudePaiement, type HabitudeAffichee, type RuptureAffichee } from './habitude';
export { ConstatRegistre, type ConstatRegistreAffiche } from './identite-debiteur';
export { QuestionnaireLitige, type QuestionLitige, type ReponseFait } from './questionnaire-litige';
export { SuiviProcedure, type SuiviAffiche, type EcheanceAffichee } from './suivi-procedure';
export { RailProcedure, type EtapeAffichee, type StatutEtapeAffiche } from './rail-procedure';
export { Pieces, type PieceAffichee, type OptionTypePiece } from './pieces';
export { ListeAnalyses, LigneAnalyse, LigneBouton, EnteteDetail } from './navigation';
export { FeuilleVoie, type VoieAffichee } from './feuille-voie';
export {
	ChoixIntervenant,
	type FicheIntervenant,
	type FicheASaisir,
	type RoleIntervenant
} from './choix-intervenant';
export { rangeeDuDebiteur } from './identite-debiteur';
export { CeQuiManque, ceQuiManque, RangeeFranchie, type Verrou } from './ce-qui-manque';
export { VeilleurAvatar, type EtatVeilleur } from './veilleur-avatar';
export {
	RechercheRegistre,
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
	Veilleur,
	travauxDuVeilleur,
	type TacheVeilleur,
	type EtatTravail,
	type DepotEnCours
} from './veilleur';
export { Solidite, type SoliditeAffichee, type EtageAffiche } from './solidite';
export { Relances, type NiveauAffiche } from './relances';
export { Lettrage, type PropositionLettrage, type CombinaisonAffichee } from './lettrage';
