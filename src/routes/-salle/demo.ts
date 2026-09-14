import type { ComponentType } from 'react';
import type { RegisteredRouter, RouteIds } from '@tanstack/react-router';
import type { Lecture } from '../../ui';

/** Les états qu'on vient regarder. `vide` n'existe que pour les écrans qui en ont un. */
export type EtatDemo = 'pret' | 'vide' | 'attente' | 'erreur';

export interface EcranDuProduit {
	/**
	 * La route, écrite exactement comme `createFileRoute` la déclare.
	 *
	 * ⚠️ TYPÉE PAR LE ROUTEUR, ET BORNÉE AUX ÉCRANS DE `/app/`. Une faute de
	 * frappe, ou l'identifiant d'une page qui n'est pas un écran du produit
	 * (`/connexion`, `/showroom`, la coquille `/app`), échoue à `bun run check`
	 * au lieu d'attendre la barrière de la salle.
	 */
	readonly route: Extract<RouteIds<RegisteredRouter['routeTree']>, `/app/${string}`>;
	readonly libelle: string;
	/** Vrai si l'écran a une forme vide à regarder. Voir `lectureDemo`. */
	readonly vide: boolean;
	/**
	 * Des formes prêtes supplémentaires, nommées : ce que l'écran montre selon ses
	 * données (des relances suspendues, un litige tranché, une pyramide complète).
	 * La salle les offre dans l'état prêt, et chacune doit rendre autre chose que
	 * la forme principale.
	 */
	readonly variantes?: readonly string[];
	/**
	 * La démonstration de l'écran, dans un état donné.
	 *
	 * Un COMPOSANT, pas une fonction appelée : la salle le rend avec une `key`, et
	 * passer d'un écran à l'autre le remonte comme un changement de route. La
	 * coquille, elle, est posée une fois par la salle, comme en production.
	 */
	readonly Demo: ComponentType<{ etat: EtatDemo; variante?: string }>;
}

/**
 * La lecture d'un état de démonstration.
 *
 * ⚠️ UN VIDE SANS VALEUR VIDE LÈVE. Retomber sur la valeur prête ferait regarder,
 * sous le bouton « sans données », l'écran prêt : le regard validerait un état
 * vide qu'il n'a jamais vu.
 */
export function lectureDemo<T>(etat: EtatDemo, pret: T, vide?: T): Lecture<T> {
	if (etat === 'attente' || etat === 'erreur') return { etat };
	if (etat === 'pret') return { etat: 'pret', valeur: pret };
	if (vide === undefined) {
		throw new Error(
			'Démonstration incomplète : cet écran est inscrit avec un état vide, et ne fournit pas de valeur vide.'
		);
	}
	return { etat: 'pret', valeur: vide };
}
