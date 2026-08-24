/**
 * Le point d'entrée Vercel.
 *
 * TanStack Start rend un gestionnaire `fetch` standard : une requête Web entre,
 * une réponse Web sort. Ce fichier ne fait que l'exposer sous le nom que Vercel
 * cherche.
 *
 * POURQUOI UN EXPORT NOMMÉ `fetch`, ET SURTOUT PAS UN `export default`.
 * Ce fichier a d'abord exporté `export default function handler(request)`, et
 * chaque requête est morte en `TypeError: Invalid URL, input: '/'`. La raison
 * est dans le code de la plateforme, `@vercel/node/dist/bundling-handler.js` :
 *
 *     const isWebHandler =
 *       HTTP_METHODS.some(m => typeof listener[m] === 'function') ||
 *       typeof listener.fetch === 'function';
 *
 * Une fonction nue n'a pas de `.fetch`. Vercel la range donc en gestionnaire
 * Node et l'appelle en `(req, res)`, où `req` est un `IncomingMessage` dont
 * `.url` vaut le chemin seul — `/`. Le serveur, lui, attend une `Request` Web
 * et fait `new URL(request.url)` : un chemin relatif n'est pas une URL.
 *
 * Dès qu'un `fetch` est exposé, la plateforme prend l'autre branche et
 * construit elle-même la requête, à partir du chemin ET de l'hôte :
 *
 *     const url = new URL(req.url || '/', `${proto}://${host}`);
 *
 * C'est l'URL absolue qui manquait. Elle relit ensuite la `Response` retournée
 * vers la réponse Node, en-tête par en-tête et par morceaux, ce qui préserve
 * les `Set-Cookie` multiples et le flux de rendu.
 *
 * Pas d'`export default` ici, même pas en plus : la plateforme déballe `.default`
 * jusqu'à cinq fois avant de chercher `.fetch`, et on ne veut pas dépendre de ce
 * qu'un objet exporté par le regroupeur porte ou non comme propriété `default`.
 *
 * L'import est RELATIF et pointe dans `dist/`, produit par la commande de
 * construction avant que Vercel n'assemble les fonctions. L'ordre est garanti
 * par la plateforme : le build tourne d'abord, la fonction est tracée ensuite.
 */
import serveur from '../dist/server/server.js';

export const fetch = (request) => serveur.fetch(request);
