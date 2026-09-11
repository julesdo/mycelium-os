import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * AUCUN ÉCRAN N'EST ORPHELIN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUI A RENDU CE TEST NÉCESSAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `/app/creance/$id` — l'écran le plus riche du produit, celui qui porte le
 * score de solidité, les six pages d'analyse et le décompte — n'avait qu'UNE
 * seule entrée : la redirection qui suit `constituer()`, sur l'écran des
 * débiteurs. Aucun lien permanent, nulle part, ne ramenait à une créance.
 *
 * Autrement dit : on ne la voyait que dans les secondes suivant sa création.
 * On revenait le lendemain, et sept écrans avaient disparu de l'interface sans
 * que rien n'ait changé en base.
 *
 * ⚠️ ET LES SIX PAGES D'ANALYSE POINTAIENT BIEN VERS ELLE — en RETOUR. C'est
 * ce qui rend ce défaut si difficile à voir : le sous-arbre est parfaitement
 * relié EN DEDANS. Il faut seulement déjà y être. Un îlot fermé ne se distingue
 * d'un quartier que si l'on regarde les arêtes entrantes, et rien ne les
 * regardait.
 *
 * Le typage du routeur vérifie qu'une destination écrite existe ; il ne vérifie
 * pas qu'une route déclarée est atteignable. C'est la moitié manquante, et
 * c'est elle qui décrit ce que le produit était devenu : une collection de
 * grappes correctes, reliées par presque rien.
 *
 * ⚠️ CE TEST EST LA MOITIÉ MANQUANTE DE `destinations-existent.test.ts`. L'un
 * vérifie que tout lien mène à une route, l'autre que toute route reçoit un
 * lien. Ensemble ils tiennent le graphe dans les deux sens ; séparément,
 * chacun laisse passer la moitié des ruptures.
 */

const RACINE = join(import.meta.dirname, '..', '..');

/**
 * Les écrans qu'on atteint autrement que par un lien, et POURQUOI.
 *
 * ⚠️ CHAQUE ENTRÉE EST UNE DETTE, PAS UNE DISPENSE. Une exception qu'on ajoute
 * sans la justifier vide le test de son sens en trois ajouts — c'est pour ça
 * que la raison est obligatoire et lue à la revue.
 */
const ATTEINTS_AUTREMENT: Readonly<Record<string, string>> = {
	'/': 'La page publique. On y arrive par le domaine.',
	'/showroom': 'La salle d’exposition, en développement seulement. Aucun lien depuis le produit, et c’est voulu.',
	'/app': 'La coquille des écrans connectés. C’est une route de mise en page, pas un écran.',
	'/rejoindre/$token': 'Le lien d’invitation, reçu par courriel. Il ne peut PAS exister dans l’interface : le jeton est l’invitation.',
	'/nouveau-mot-de-passe': 'Le lien de réinitialisation, reçu par courriel, et porteur d’un jeton.',
	'/api/auth/$': 'Un point d’entrée serveur, pas un écran.'
};

/**
 * Les URL que le routeur sert, lues dans l'arbre généré.
 *
 * ⚠️ L'ARBRE DÉCLARE CHAQUE ROUTE DEUX FOIS, sous deux formes. `/app/creance/$id/litige`
 * est l'URL ; `/app/creance_/$id/litige` est son IDENTIFIANT interne, où le `_`
 * final de segment est l'échappement de TanStack — celui qui fait qu'une page
 * de détail ne s'imbrique pas dans la mise en page de son parent. Les deux
 * désignent le même écran, et seule la première est une adresse.
 *
 * Les confondre faisait déclarer orphelines dix-sept routes parfaitement
 * reliées : aucun auteur n'écrit jamais la forme à `_`, puisqu'elle n'est pas
 * une URL.
 */
function routesDeclarees(): readonly string[] {
	const genere = readFileSync(join(RACINE, 'routeTree.gen.ts'), 'utf8');
	const chemins = new Set<string>();
	for (const [, chemin] of genere.matchAll(/^\s+'(\/[^']*)':\s*typeof/gm)) {
		if (chemin === undefined) continue;
		// Le `_` d'échappement tombe : `/app/creance_/$id` EST `/app/creance/$id`.
		const url = chemin.replace(/_(?=\/)/g, '');
		chemins.add(url.length > 1 ? url.replace(/\/$/, '') : url);
	}
	return [...chemins];
}

function fichiersDuProduit(dossier: string, trouves: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		if (entree === '__tests__' || entree === '_generated' || entree === 'node_modules') continue;
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) fichiersDuProduit(chemin, trouves);
		else if (/\.tsx?$/.test(entree) && !entree.endsWith('routeTree.gen.ts')) trouves.push(chemin);
	}
	return trouves;
}

/**
 * Toutes les façons d'ENTRER dans un écran, écrites en littéral.
 *
 * ⚠️ `retourVers` NE COMPTE PAS, ET C'EST LE CŒUR DE CE TEST. Un bouton de
 * retour mène du détail vers son parent : il ne rend pas ce parent atteignable,
 * puisqu'il faut déjà être dans le détail pour le voir. Compter les retours
 * rendait ce test complaisant au point d'être inutile — six pages d'analyse
 * pointant en arrière vers `/app/creance/$id` le déclaraient relié, alors que
 * les sept écrans formaient un îlot fermé où aucun lien n'entrait.
 *
 * Un sous-arbre qui ne s'atteint que par ses propres retours est orphelin tout
 * entier. C'est précisément la forme qu'avait pris ce produit : des grappes
 * d'écrans corrects, cohérentes en dedans, reliées à rien en dehors.
 *
 * ⚠️ ON LIT EN REVANCHE `navigate({ to: … })`. Un écran atteint par une
 * navigation programmée — au terme d'un formulaire — est réellement atteint.
 * L'ignorer produirait de faux orphelins, et un test qui crie à tort s'éteint
 * aussi sûrement qu'un test absent.
 */
function destinationsEcrites(): ReadonlySet<string> {
	const vues = new Set<string>();
	for (const fichier of fichiersDuProduit(RACINE)) {
		const source = readFileSync(fichier, 'utf8');
		// `to=` et `vers=`, mais surtout PAS `retourVers=`. C'est ce que fait
		// `(?<![A-Za-z])` : il refuse toute lettre avant, donc le `Vers` de
		// `retourVers` — précédé d'un `r` — ne peut pas passer pour un `vers`.
		for (const [, destination] of source.matchAll(/(?<![A-Za-z])(?:to|vers)=["'](\/[^"']*)["']/g)) {
			if (destination !== undefined) vues.add(destination);
		}
		for (const [, destination] of source.matchAll(/\bto:\s*["'](\/[^"']*)["']/g)) {
			if (destination !== undefined) vues.add(destination);
		}
	}
	return vues;
}

describe('le graphe des écrans', () => {
	it('ne laisse aucune route sans un chemin pour y arriver', () => {
		const ecrites = destinationsEcrites();

		const orphelines = routesDeclarees().filter(
			(route) => !(route in ATTEINTS_AUTREMENT) && !ecrites.has(route)
		);

		expect(
			orphelines,
			[
				'Routes déclarées que RIEN ne permet d’atteindre :',
				...orphelines.map((r) => `  ${r}`),
				'',
				'Soit on y mène depuis un écran, soit on l’inscrit dans',
				'ATTEINTS_AUTREMENT avec la raison — jamais sans.'
			].join('\n')
		).toEqual([]);
	});

	it('n’excuse rien qui n’existe plus', () => {
		// Une exception qui survit à la route qu'elle excusait devient un
		// commentaire faux dans un test vert. C'est ce qui transforme
		// lentement une barrière en décor.
		const declarees = new Set(routesDeclarees());
		const perimees = Object.keys(ATTEINTS_AUTREMENT).filter((r) => !declarees.has(r));
		expect(perimees, `Exceptions qui ne correspondent à aucune route : ${perimees.join(', ')}`).toEqual(
			[]
		);
	});
});
