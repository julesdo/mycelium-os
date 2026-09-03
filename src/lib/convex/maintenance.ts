import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

/**
 * LE NETTOYAGE DES DOCUMENTS HÉRITÉS D'EGALIM.
 *
 * POURQUOI CE FICHIER EXISTE. Convex ne valide pas seulement le code qu'on lui
 * pousse : il valide les documents DÉJÀ EN BASE contre le nouveau schéma, et
 * refuse le déploiement entier si l'un d'eux ne correspond pas. Retirer
 * `couvertsJour` du schéma a donc bloqué la production sur une ligne de
 * démonstration écrite du temps de la cantine.
 *
 * LE CYCLE EST NÉCESSAIREMENT EN DEUX TEMPS, et ce n'est pas un raccourci : le
 * nettoyage est du code, et ce code ne peut tourner que sur un déploiement qui
 * a réussi. Le schéma déclare donc les deux champs facultatifs, cette mutation
 * les efface, et une tâche planifiée l'appelle chaque jour. Le jour où elle
 * rapporte 0 deux fois de suite, on retire les deux lignes du schéma, la tâche,
 * et ce fichier.
 *
 * ON EFFACE LA CLÉ, PAS LA VALEUR. `patch` avec `undefined` retire bien le
 * champ chez Convex, mais la nuance est invisible à la lecture et c'est
 * précisément elle qui décide si le prochain déploiement passe : le test la
 * vérifie avec `in`, pas avec `=== undefined`.
 */
export const purgerHeritageEgalim = internalMutation({
	args: {},
	returns: v.object({ organisationsNettoyees: v.number() }),
	handler: async (ctx) => {
		const organisations = await ctx.db.query('organizations').collect();

		let organisationsNettoyees = 0;
		for (const organisation of organisations) {
			const porteUnHeritage =
				'couvertsJour' in organisation || 'etablissementType' in organisation;

			// Une écriture par établissement et par jour pour ne rien changer serait
			// le prix d'une tâche planifiée qu'on oublie de retirer.
			if (!porteUnHeritage) continue;

			await ctx.db.patch(organisation._id, {
				couvertsJour: undefined,
				etablissementType: undefined
			});
			organisationsNettoyees += 1;
		}

		return { organisationsNettoyees };
	}
});
