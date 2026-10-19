/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import limiteur from '@convex-dev/rate-limiter/test';
import schema from '../schema';
import { api } from '../_generated/api';

/**
 * UNE OFFRE DEMANDÉE SUR LE SITE (lot 6) : le prospect naît au CRM avec le parcours de
 * l'offre, la demande s'inscrit à son historique, une tâche pose la réponse ; une
 * seconde demande de la même adresse retrouve le prospect au lieu d'en créer un autre.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;

describe('la demande d’une offre', () => {
	it(
		'crée le prospect avec son parcours, note la demande et pose une tâche',
		async () => {
			const t = convexTest(schema, modules);
			limiteur.register(t);
			const demande = {
				offre: 'reclamation',
				nom: 'Karim Benali',
				entreprise: 'Nettoyage du Val',
				email: 'Karim@nettoyage-du-val.fr',
				message: 'Trois hôpitaux, des retards depuis 2023.'
			};
			expect(await t.mutation(api.demandes.demanderUneOffre, demande)).toEqual({ ok: true });
			expect(await t.mutation(api.demandes.demanderUneOffre, demande)).toEqual({ ok: true });

			const etat = await t.run(async (ctx) => ({
				prospects: await ctx.db.query('prospects').take(10),
				evenements: await ctx.db.query('evenementsCrm').take(10),
				taches: await ctx.db.query('tachesCrm').take(10)
			}));
			expect(etat.prospects).toHaveLength(1);
			const p = etat.prospects[0]!;
			expect(p.parcours).toBe('FOURNISSEUR_PUBLIC');
			expect(p.email).toBe('karim@nettoyage-du-val.fr');
			expect(p.statut).toBe('A_REPONDU');
			expect(p.emailBase).toBe('INFORMEE');
			expect(etat.evenements).toHaveLength(2);
			expect(etat.evenements[0]!.texte).toContain('Réclamation clé en main');
			expect(etat.taches).toHaveLength(2);
		},
		DELAI_CONVEX
	);

	it(
		'répond la même chose à un robot, sans rien écrire',
		async () => {
			const t = convexTest(schema, modules);
			limiteur.register(t);
			expect(
				await t.mutation(api.demandes.demanderUneOffre, {
					offre: 'pilote',
					entreprise: 'Robot',
					email: 'robot@exemple.fr',
					piege: 'http://spam'
				})
			).toEqual({ ok: true });
			expect(await t.run((ctx) => ctx.db.query('prospects').take(5))).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'refuse une adresse sans forme, en le disant',
		async () => {
			const t = convexTest(schema, modules);
			limiteur.register(t);
			const r = await t.mutation(api.demandes.demanderUneOffre, {
				offre: 'pilote',
				entreprise: 'Atelier',
				email: 'pas-une-adresse'
			});
			expect(r.ok).toBe(false);
		},
		DELAI_CONVEX
	);
});
