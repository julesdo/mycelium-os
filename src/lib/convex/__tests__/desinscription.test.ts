/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { api } from '../_generated/api';

/**
 * LA DÉSINSCRIPTION PAR LE LIEN DES E-MAILS : elle arrête le prospect comme « Stop »
 * sur sa fiche (coordonnées effacées, empreinte d'opposition), et répond la même
 * chose pour un jeton inconnu.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;

describe('la désinscription d’un prospect', () => {
	it(
		'efface ses coordonnées, met son adresse en opposition, et ne dit rien d’un jeton inconnu',
		async () => {
			const t = convexTest(schema, modules);
			const prospectId = await t.run((ctx) =>
				ctx.db.insert('prospects', {
					entreprise: 'Transports Moreau',
					cible: 'PME',
					statut: 'CONTACTE',
					dirigeant: 'Claire Moreau',
					email: 'claire@transports-moreau.fr',
					telephone: '01 48 00 00 00',
					jetonDesinscription: 'jeton-moreau',
					creePar: 'jules@exemple.fr',
					creeLe: Date.now() - 86_400_000
				})
			);

			expect(await t.mutation(api.desinscription.seDesinscrire, { jeton: 'inconnu' })).toBeNull();
			expect(
				await t.mutation(api.desinscription.seDesinscrire, { jeton: 'jeton-moreau' })
			).toBeNull();
			// Une seconde fois : la même réponse, rien ne casse.
			expect(
				await t.mutation(api.desinscription.seDesinscrire, { jeton: 'jeton-moreau' })
			).toBeNull();

			const etat = await t.run(async (ctx) => ({
				prospect: await ctx.db.get(prospectId),
				oppositions: await ctx.db.query('oppositions').take(10)
			}));
			expect(etat.prospect?.statut).toBe('STOP');
			expect(etat.prospect?.email).toBeUndefined();
			expect(etat.prospect?.telephone).toBeUndefined();
			expect(etat.prospect?.dirigeant).toBeUndefined();
			expect(etat.prospect?.dernierContactDuProspectLe).toBeTypeOf('number');
			expect(etat.oppositions).toHaveLength(1);
		},
		DELAI_CONVEX
	);
});
