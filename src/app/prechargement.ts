import type { FunctionArgs, FunctionReference } from 'convex/server';
import { getFunctionName } from 'convex/server';
import { convexToJson } from 'convex/values';
import { convex } from '../lib/client/convex';

/**
 * PRÉCHARGER UNE REQUÊTE — l'ouvrir dès que le doigt se pose sur ce qui y mène.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE ÇA CHANGE (09/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le routeur précharge le CODE d'une page au toucher (`defaultPreload: 'intent'`,
 * `router.tsx`) : il appelle aussi le `loader` de sa route. Ce loader ouvre ici
 * les abonnements Convex que la page lira. Entre le toucher et le relâcher, puis
 * le temps de l'animation, une centaine de millisecondes suffisent souvent : la
 * page arrive avec ses données, sans passer par son squelette.
 *
 * ⚠️ C'EST UN VRAI ABONNEMENT, PAS UNE COPIE. Le même client Convex le porte que
 * celui des écrans : quand la page monte, son `useQuery` trouve le résultat
 * déjà là, et il reste en temps réel. Celui-ci se ferme seul après une demi-
 * minute ; le cache des écrans (`donnees.ts`) prend le relais s'ils l'ouvrent.
 *
 * ⚠️ JAMAIS SUR LE SERVEUR : le rendu serveur n'a pas de session Convex.
 */
const DUREE_MS = 30_000;
const ouverts = new Map<string, { fin: () => void; minuteur: ReturnType<typeof setTimeout> }>();

function fermer(cle: string): void {
	ouverts.get(cle)?.fin();
	ouverts.delete(cle);
}

export function precharger<Q extends FunctionReference<'query'>>(
	requete: Q,
	args: FunctionArgs<Q>
): void {
	if (typeof window === 'undefined') return;
	const cle = JSON.stringify([getFunctionName(requete), convexToJson(args)]);
	const deja = ouverts.get(cle);
	if (deja !== undefined) {
		clearTimeout(deja.minuteur);
		deja.minuteur = setTimeout(() => fermer(cle), DUREE_MS);
		return;
	}
	const fin = convex.watchQuery(requete, args).onUpdate(() => undefined);
	ouverts.set(cle, { fin, minuteur: setTimeout(() => fermer(cle), DUREE_MS) });
}
