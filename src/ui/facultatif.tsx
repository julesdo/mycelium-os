import type { ReactNode } from 'react';
import { CatchBoundary } from '@tanstack/react-router';
import { AlertTriangleIcon } from 'lucide-react';
import { Bandeau } from './bandeau';

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

/**
 * UNE SOURCE DE RANGÉES DE LA FILE, ET SON NOM QUAND ELLE LÈVE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE N'EST PAS `Facultatif`, ALORS QUE C'EST LE MÊME MÉCANISME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `Facultatif` fait DISPARAÎTRE ce qui lève, sans un mot. C'est le bon
 * traitement d'un ornement : une pastille absente ne fait croire à personne
 * qu'il n'y a rien à voir.
 *
 * Une source de rangées n'est pas un ornement. La file remplace vingt-sept
 * adresses : si la surveillance ne répond pas et que ses rangées s'évaporent en
 * silence, le gérant lit une file plus courte et en conclut qu'il a moins de
 * travail — sur le seul écran qui dit ce qui va s'éteindre. C'est le pire état
 * possible du produit, et il ressemble à un bon jour.
 *
 * B1 tranche donc en deux temps : une source qui lève laisse TOUTES les autres
 * rangées à l'écran, et elle est NOMMÉE à sa place. Jamais un écran blanc,
 * jamais une absence muette.
 *
 * ⚠️ UNE SOURCE, UNE BORNE — la règle de `Facultatif` vaut ici mot pour mot :
 * l'isolement vient du NOMBRE de bornes montées, jamais de la clé. Deux sources
 * réunies sous un seul `SourceDeRangees` se contaminent, et la première qui lève
 * emporte la seconde.
 */
export function SourceDeRangees({ nom, children }: { nom: string; children: ReactNode }) {
	return (
		<CatchBoundary
			getResetKey={() => 'source-de-rangees'}
			errorComponent={() => <SourceRompue nom={nom} />}
		>
			{children}
		</CatchBoundary>
	);
}

/**
 * Ce qui s'affiche à la place des rangées d'une source qui n'a pas répondu.
 *
 * ⚠️ IL DIT AUSSI QUE LE RESTE TIENT. « La surveillance ne répond pas » seul
 * laisse croire que l'écran entier est faux ; la seconde phrase dit ce qui est
 * à jour, ce qui est la moitié utile du constat.
 */
function SourceRompue({ nom }: { nom: string }) {
	return (
		<Bandeau ton="alerte" icone={<AlertTriangleIcon size={18} />}>
			{nom} ne s’affiche pas : cette source n’a pas répondu. Les autres rangées de la file sont à
			jour.
		</Bandeau>
	);
}
