/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';

/**
 * LE VERRE EST UNE BARRIÈRE, PAS UNE CONVENTION.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE CE TEST EMPÊCHE, ET POURQUOI RIEN D'AUTRE NE LE PEUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit est posé sur un fond animé. Toute sa lisibilité tient à une seule
 * propriété : les cartes sont TRANSLUCIDES et laissent voir ce fond au travers.
 *
 * Or `Surface`, le conteneur du kit, peint par défaut un fond OPAQUE dans une
 * couche interne, sous le contenu. Une carte écrite sans `variant="transparent"`
 * redevient donc un aplat gris — et c'est un défaut :
 *
 *   · SILENCIEUX : rien ne casse, aucun type ne se plaint, aucun autre test ne
 *     tombe. La carte s'affiche, elle est juste laide ;
 *   · INVISIBLE À CELUI QUI L'ÉCRIT : sur un écran, un aplat parmi des verres
 *     ne saute pas aux yeux — il faut les voir côte à côte ;
 *   · CONTAGIEUX : le prochain qui ajoute une carte copie la précédente.
 *
 * Vingt-huit surfaces opaques ont été trouvées et converties en une passe. Une
 * convention tenue à vingt-huit endroits se perd au vingt-neuvième ; une règle
 * exécutable, non. C'est le même dispositif que `socle/__tests__/frontiere.test.ts`
 * et que le balayage de `currentOrganizationId` : elle échoue si quelqu'un la
 * contourne, même de bonne foi.
 *
 * ⚠️ SI CE TEST ÉCHOUE, LA CORRECTION N'EST PAS DE L'ASSOUPLIR. C'est d'ajouter
 * `variant="transparent" outline={false}` et la classe `verre-carte` — ou, si
 * la surface doit vraiment rester opaque, de l'inscrire nommément dans les
 * exceptions ci-dessous, avec sa raison.
 */

/**
 * Les surfaces qui ont le DROIT de rester opaques.
 *
 * Vide aujourd'hui, et c'est volontaire : aucun écran du produit n'en a besoin.
 * Cette liste existe pour que l'exception, le jour où elle arrive, soit ÉCRITE
 * et justifiée plutôt que glissée en silence.
 */
const EXCEPTIONS: readonly string[] = [];

describe('toutes les cartes du produit laissent voir le fond', () => {
	it('aucune Surface n’est rendue opaque', () => {
		const fichiers = import.meta.glob('../../{routes,screens,ui}/**/*.tsx', {
			query: '?raw',
			import: 'default',
			eager: true
		}) as Record<string, string>;

		const opaques: string[] = [];

		for (const [chemin, source] of Object.entries(fichiers)) {
			if (/__tests__\//.test(chemin)) continue;
			if (EXCEPTIONS.some((e) => chemin.includes(e))) continue;

			const lignes = source.split('\n');
			lignes.forEach((ligne, rang) => {
				// `<SurfaceCut` est exclu : c'est un CREUX, et il a sa propre règle de
				// verre sombre dans `app.css`. Seul `<Surface` est concerné.
				if (!/<Surface(\s|$)/.test(ligne)) return;

				// On lit l'ÉLÉMENT, pas la ligne : les props s'étalent souvent sur
				// plusieurs lignes, et chercher sur une seule donnerait un faux
				// positif à chaque balise multiligne.
				const bloc = lignes.slice(rang, rang + 12).join('\n');
				const fin = bloc.indexOf('>');
				const element = fin === -1 ? bloc : bloc.slice(0, fin);

				if (/variant="transparent"/.test(element)) return;
				opaques.push(`${chemin}:${rang + 1}`);
			});
		}

		expect(opaques).toEqual([]);
	});
});
