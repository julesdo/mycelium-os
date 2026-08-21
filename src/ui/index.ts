/**
 * Les primitives Mycelium.
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
export { LogoMycelium } from './logo';
export { Page, PageHeader, PageBody } from './page';
export { TwoPane } from './two-pane';
export { EmptyState } from './empty-state';
export { CadreAuth, Champ, MessageErreur } from './cadre-auth';
export { Bandeau } from './bandeau';
export { ZoneDepot } from './zone-depot';
export { TauxEGalim, TauxCompact } from './taux-egalim';
export { Illustration, type TailleVignette } from './illustration';
export { illustrer, jetons, EMOJI_FAMILLE } from './lexique';
export { Verdict, estBio } from './verdict';
export { CarteProduit, type Proposition } from './carte-produit';
export { OuAgir, type PisteAction } from './ou-agir';
export { Repartition, type LigneFamille } from './repartition';
export { FilTravail, type Decision, type DocumentEnCours } from './fil-travail';
export {
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule
} from './tableau';
export { euros, pourcent, pluriel, FAMILLES, type Famille } from './format';
