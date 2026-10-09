/**
 * LES REQUÊTES DE L'APPLICATION — vivantes, et qui survivent à l'écran qui les lit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI PAS LE `useQuery` DE `convex/react` (09/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Celui de Convex ferme son abonnement quand l'écran se démonte. Revenir sur
 * « Aujourd'hui » après avoir ouvert un dossier relançait donc ses vingt
 * requêtes depuis zéro, et l'écran repassait par son squelette, alors que rien
 * n'avait changé. Une application native garde ses écrans en mémoire.
 *
 * Celui de `convex-helpers` (`ConvexQueryCacheProvider`, posé dans
 * `providers.tsx`) garde l'abonnement ouvert cinq minutes après le départ de
 * l'écran : au retour, les données sont là au premier rendu, et elles restent
 * EN TEMPS RÉEL — c'est toujours un abonnement Convex, qui reçoit chaque
 * changement, pas une copie figée. Même signature, même `'skip'`.
 *
 * ⚠️ UN SEUL ENDROIT. `donnees-vivantes.test.ts` refuse un `useQuery` importé de
 * `convex/react` ailleurs dans l'interface.
 */
export { useQuery } from 'convex-helpers/react/cache/hooks';

/**
 * L'ABONNEMENT ÉPHÉMÈRE — pour une requête dont l'argument change à chaque frappe
 * (la palette de recherche). Gardés cinq minutes par le cache, six lettres
 * tapées laisseraient six abonnements ouverts, recalculés à chaque changement de
 * la base, pour des termes que personne ne relira.
 */
export { useQuery as useRequeteEphemere } from 'convex/react';
