/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * LA PURGE DES CHAMPS HÉRITÉS D'EGALIM.
 *
 * POURQUOI CE CODE EXISTE. Convex valide les documents DÉJÀ EN BASE contre le
 * schéma qu'on lui pousse. Le déploiement de production a donc été refusé, non
 * pas à cause du code, mais à cause d'une ligne de démonstration écrite du temps
 * de la cantine :
 *
 *     Document ... in table "organizations" does not match the schema:
 *     Object contains extra field `couvertsJour` that is not in the validator.
 *
 * On ne peut pas supprimer le champ du schéma et nettoyer la base dans le même
 * déploiement : le nettoyage est du code, et ce code ne peut être déployé que si
 * le schéma passe. Les deux champs sont donc déclarés facultatifs le temps d'un
 * cycle, et cette mutation les retire.
 *
 * CE QU'ON VÉRIFIE. Qu'elle retire vraiment le champ du document — pas qu'elle
 * le met à `undefined`, ce qui laisserait le document intact en base et ferait
 * échouer le déploiement suivant exactement de la même façon. La distinction est
 * invisible à la lecture du code et c'est tout l'objet du test.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

describe('purgerHeritageEgalim', () => {
	it(
		'retire les champs de cantine du document, et pas seulement leur valeur',
		async () => {
			const t = convexTest(schema, modules);

			const id = await t.run(async (ctx) =>
				ctx.db.insert('organizations', {
					name: 'Chez Fernand',
					createdAt: Date.now(),
					couvertsJour: 1250,
					etablissementType: 'RIE'
				})
			);

			const rapport = await t.mutation(internal.maintenance.purgerHeritageEgalim, {});
			expect(rapport.organisationsNettoyees).toBe(1);

			const apres = await t.run(async (ctx) => ctx.db.get(id));
			expect(apres).not.toBeNull();
			// `in` et non `=== undefined` : c'est la présence de la CLÉ que Convex
			// refuse, pas sa valeur.
			expect('couvertsJour' in apres!).toBe(false);
			expect('etablissementType' in apres!).toBe(false);
			// Le reste du document survit : une purge qui perd le nom de
			// l'établissement serait pire que le problème qu'elle règle.
			expect(apres!.name).toBe('Chez Fernand');
		},
		DELAI_CONVEX
	);

	it(
		'ne touche pas aux établissements déjà propres, et peut donc tourner en boucle',
		async () => {
			// Elle est appelée par une tâche planifiée : si elle réécrivait chaque
			// document à chaque passage, elle générerait une écriture par
			// établissement et par jour pour ne rien changer.
			const t = convexTest(schema, modules);

			await t.run(async (ctx) =>
				ctx.db.insert('organizations', { name: 'Ateliers Martin', createdAt: Date.now() })
			);

			const rapport = await t.mutation(internal.maintenance.purgerHeritageEgalim, {});
			expect(rapport.organisationsNettoyees).toBe(0);
		},
		DELAI_CONVEX
	);
});
