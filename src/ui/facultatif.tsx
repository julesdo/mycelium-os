import type { ReactNode } from 'react';
import { CatchBoundary } from '@tanstack/react-router';

/**
 * CE QUI, EN ÉCHOUANT, NE DOIT RIEN EMPORTER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA RÈGLE, ET POURQUOI ELLE VIT ICI ET PLUS DANS LA BARRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un écran de travail est un point de panne unique : tout ce qu'il affiche
 * passe par lui. Une source qui lève — une requête Convex sans session, un
 * radar de registre qui ne répond pas, un ornement qui interroge la base —
 * emporte alors l'écran ENTIER et renvoie le gérant sur une page d'erreur,
 * alors qu'il lui suffisait de ne pas voir une pastille.
 *
 * Le motif s'isole donc PAR SOURCE : une source enveloppée, une source qui
 * s'éteint seule, et tout le reste qui reste à l'écran.
 *
 * ⚠️ IL A ÉTÉ ÉCRIT DANS `src/app/barre.tsx`, ET C'ÉTAIT L'ENDROIT LE PLUS
 * FRAGILE POSSIBLE. C'est le fichier que la file remplace : livrer la file en
 * supprimant la barre aurait emporté le seul isolement du produit avec elle,
 * en silence, et l'écran qui remplace vingt-sept adresses se serait rendu sans
 * aucune protection — le défaut exact que ce motif existe pour empêcher. Il
 * sort donc AVANT toute suppression, et la barre l'importe d'ici jusqu'à sa
 * propre disparition.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX DÉTAILS QUI SE DÉCIDENT UNE FOIS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ L'ISOLEMENT VIENT DU NOMBRE DE BORNES, JAMAIS DE LA CLÉ. Chaque
 * `<Facultatif>` monté est une borne indépendante, avec son propre état
 * d'erreur : deux sources voisines ne se contaminent pas, même si elles
 * portent la même clé. Envelopper DEUX sources dans un seul `Facultatif` les
 * réunirait en revanche sous une seule borne, et la première qui lève
 * emporterait la seconde. Une source, une borne.
 *
 * ⚠️ LA CLÉ DE REPRISE EST CONSTANTE, ET C'EST DÉLIBÉRÉ. `getResetKey` remet
 * la borne à zéro quand sa valeur CHANGE ; une constante ne change jamais,
 * donc une source éteinte le reste jusqu'au prochain montage. C'est ce qu'on
 * veut d'un ornement : réessayer en boucle une requête qui lève ferait
 * clignoter l'écran sans jamais rien afficher de plus.
 *
 * ⚠️ ET IL NE RÉPARE RIEN. Une source qui s'éteint disparaît sans un mot :
 * c'est acceptable d'un ornement, jamais d'une rangée qui porte une échéance.
 * Ce qui manque au produit se dit ailleurs, nommément, et la file nomme la
 * source qui a levé au lieu de la taire.
 */
export function Facultatif({ children }: { children: ReactNode }) {
	return (
		<CatchBoundary getResetKey={() => 'facultatif'} errorComponent={() => null}>
			{children}
		</CatchBoundary>
	);
}
