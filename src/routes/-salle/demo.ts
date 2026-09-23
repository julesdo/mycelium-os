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
	 *
	 * ⚠️ ET `/bienvenue` EST ADMISE À CÔTÉ, NOMMÉMENT. C'est le seul écran de
	 * travail qui ne vit pas sous `/app/` — il s'ouvre avant que l'établissement
	 * existe —, et il est resté hors de la salle pendant des mois pour cette
	 * seule raison de typage : la règle des quatre largeurs n'était pas outillée
	 * pour lui. Une exception écrite en toutes lettres garde la barrière (une
	 * faute de frappe échoue toujours) sans exclure une page réelle du regard.
	 *
	 * ⚠️ ET `/` EST ADMISE DEPUIS LE 23 SEPTEMBRE 2026, pour la même raison et
	 * au prix du même défaut. La page d'accueil n'avait jamais été regardée aux
	 * quatre largeurs : sa tablette rendait son texte à 3,9 px au téléphone, et
	 * rien ne le signalait parce qu'elle n'entrait pas dans la salle.
	 */
	readonly route: Extract<
		RouteIds<RegisteredRouter['routeTree']>,
		`/app/${string}` | '/bienvenue' | '/'
	>;
	/**
	 * L'IDENTITÉ DE L'ENTRÉE DANS LA SALLE, quand la route ne suffit pas.
	 *
	 * ⚠️ DEUX ÉCRANS PEUVENT VISER LA MÊME ADRESSE PENDANT UNE BASCULE, et c'est
	 * exactement l'état du lot 2 : la file REMPLACE l'accueil à `/app/`, mais la
	 * bascule est une tâche séparée et volontairement révocable (T15). Les deux
	 * cohabitent donc dans la salle le temps qu'on les regarde côte à côte — ce
	 * qui est même la seule façon de vérifier au regard que la file rend ce que
	 * l'accueil rendait.
	 *
	 * Sans clé, la seconde entrée serait injoignable : la salle choisit par
	 * `route` et ne rendrait jamais que la première. Absente, l'identité reste la
	 * route, et rien ne change pour les vingt-sept autres.
	 */
	readonly cle?: string;
	readonly libelle: string;
	/** Vrai si l'écran a une forme vide à regarder. Voir `lectureDemo`. */
	readonly vide: boolean;
	/**
	 * Des formes prêtes supplémentaires, nommées : ce que l'écran montre selon ses
	 * données (des relances suspendues, un litige déclaré, une pyramide complète).
	 * La salle les offre dans l'état prêt, et chacune doit rendre autre chose que
	 * la forme principale. Voir `formeDemo`.
	 */
	readonly variantes?: readonly string[];
	/**
	 * La démonstration de l'écran, dans un état donné.
	 *
	 * Un COMPOSANT, pas une fonction appelée : la salle le rend avec une `key`, et
	 * passer d'un écran, d'un état ou d'une variante à l'autre le remonte comme un
	 * changement de route. La coquille, elle, est posée une fois par la salle,
	 * comme en production.
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

/**
 * La forme d'une démonstration pour une variante nommée, ou sa forme principale.
 *
 * ⚠️ UNE VARIANTE INCONNUE LÈVE. Retomber sur la forme principale ferait regarder,
 * sous un nom mal orthographié, l'écran principal : le regard validerait une
 * variante qu'il n'a jamais vue. Les noms ne s'écrivent donc qu'une fois, en clés
 * des formes, et l'entrée déclare `variantes: Object.keys(formes)`.
 */
export function formeDemo<T>(
	variante: string | undefined,
	principale: T,
	formes: Readonly<Record<string, T>>
): T {
	if (variante === undefined) return principale;
	// `Object.hasOwn` exclut les noms hérités du prototype (`constructor`,
	// `toString`, `__proto__`) : sans lui, une variante mal orthographiée qui
	// porte l'un de ces noms rendait la valeur héritée au lieu de lever.
	if (!Object.hasOwn(formes, variante))
		throw new Error(`Démonstration incomplète : aucune variante « ${variante} ».`);
	// `noUncheckedIndexedAccess` type quand même l'accès comme possiblement
	// absent : `hasOwn` prouve que la clé existe, pas au compilateur.
	const forme = formes[variante];
	if (forme === undefined)
		throw new Error(`Démonstration incomplète : aucune variante « ${variante} ».`);
	return forme;
}

/**
 * Ce qui identifie une entrée dans la salle : sa clé, ou sa route à défaut.
 *
 * Écrit une fois, parce que la salle s'en sert à quatre endroits — la sélection
 * initiale, la recherche de l'entrée choisie, la clé React de son bouton et
 * celle de sa démonstration — et qu'un seul oubli rendrait une entrée
 * injoignable sans qu'aucun test ne tombe.
 */
export function cleDeLEcran(ecran: EcranDuProduit): string {
	return ecran.cle ?? ecran.route;
}
