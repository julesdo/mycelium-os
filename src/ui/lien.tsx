import { createContext, useContext, type ComponentProps } from 'react';
import { Link, type HistoryState } from '@tanstack/react-router';

/**
 * LE LIEN DU PRODUIT : IL EMPORTE LE NOM DE L'ÉCRAN QU'ON QUITTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN SEUL COMPOSANT, ET PAS UN `state` PASSÉ PAR CHAQUE ÉCRAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le retour d'une page poussée dit où il mène : « Vos débiteurs », « Accueil ».
 * Ce nom ne peut venir que de l'écran quitté, et le routeur ne le transmet pas
 * de lui-même : une navigation sans `state` pose un état vide. Passé à la main
 * dans chaque lien, il suffirait d'un oubli pour qu'un retour perde son nom, et
 * d'une faute de frappe pour qu'il en porte un faux, sans qu'aucun test tombe.
 *
 * Il se tient donc ici, à un seul endroit. `PageEcran` publie son titre, ce
 * lien le lit et l'écrit dans l'état de la navigation, et `EnteteDetail` le
 * relit. `bun run lint` refuse `Link` et `useNavigate` dans `src/ui` et
 * `src/screens` : un lien du produit ne peut pas contourner celui-ci.
 */

declare module '@tanstack/react-router' {
	interface HistoryState {
		/** Le titre de l'écran d'où l'on vient, tel que `PageEcran` le publie. */
		titreDeProvenance?: string;
	}
}

/**
 * Le titre de l'écran courant. `null` hors de toute `PageEcran` : la barre de
 * l'application, un écran de passage.
 */
export const TitreEcran = createContext<string | null>(null);

/**
 * L'état de navigation qui porte le titre de l'écran courant.
 *
 * Pour la seule navigation qui ne passe pas par un lien : celle qui suit une
 * écriture, comme l'ouverture de la créance qu'on vient de constituer.
 */
export function useProvenance(): HistoryState {
	const titre = useContext(TitreEcran);
	return titre === null ? {} : { titreDeProvenance: titre };
}

function LienAvecProvenance(props: ComponentProps<typeof Link>) {
	const provenance = useProvenance();
	return <Link {...props} state={provenance} />;
}

/**
 * `Link`, avec la provenance.
 *
 * ⚠️ UNE ASSERTION, À CET ENDROIT SEUL. `Link` est générique sur sa
 * destination ; une fonction qui l'enveloppe perd ce générique, et les
 * appelants ne seraient plus vérifiés contre l'arbre des routes. Le type de
 * `Link` est rendu tel quel : une destination inexistante reste une erreur de
 * compilation.
 */
export const Lien = LienAvecProvenance as typeof Link;
