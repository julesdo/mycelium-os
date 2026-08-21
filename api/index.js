/**
 * Le point d'entrée Vercel.
 *
 * TanStack Start 1.168 ne connaît pas Vercel, et n'a pas à le connaître : sa
 * construction rend un gestionnaire `fetch` standard — une requête Web entre,
 * une réponse Web sort. C'est exactement la signature qu'attend une fonction
 * Node sur Vercel, et c'est aussi celle de Cloudflare, de Deno et de Bun. Ce
 * fichier ne fait donc que le rebrancher, sans rien adapter.
 *
 * POURQUOI CE FICHIER EXISTE PLUTÔT QU'UNE DÉTECTION DE FRAMEWORK. Le
 * `vercel.json` déclarait « framework: sveltekit », héritage de la version
 * précédente : Vercel cherchait une sortie SvelteKit qui n'existe plus, sur un
 * projet qui n'est plus en Svelte. Plutôt que de faire deviner la plateforme,
 * on lui dit où est le serveur — c'est une ligne, et elle ne se périme pas au
 * prochain changement d'outillage.
 *
 * L'import est RELATIF et pointe dans `dist/`, produit par la commande de
 * construction avant que Vercel n'assemble les fonctions. L'ordre est garanti
 * par la plateforme : le build tourne d'abord, la fonction est tracée ensuite.
 */
import serveur from '../dist/server/server.js';

export default function handler(request) {
	return serveur.fetch(request);
}
