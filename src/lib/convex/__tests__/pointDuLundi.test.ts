/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import { pointDuLundiHtml, pointDuLundiTexte } from '../emails/modeles/pointDuLundi';
import { SITE_UMAMI_MESURE } from '../croissance/umami';
import { SITE_UMAMI } from '../../../app/analytique';

/**
 * LE POINT DU LUNDI — ce qu'il compte dans la base, et ce qu'il écrit.
 *
 * Il ne porte que des noms d'établissements, des étapes, des scores et des
 * comptes : jamais un montant ni un débiteur.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
const JOUR = 86_400_000;
const MAINTENANT = Date.UTC(2026, 9, 19, 5, 0);

describe('le point du lundi', () => {
	it('lit le trafic du même site Umami que le traceur', () => {
		expect(SITE_UMAMI_MESURE).toBe(SITE_UMAMI);
	});

	it(
		'compte les étapes de la semaine et des 28 jours, et classe les comptes à appeler',
		async () => {
			const t = convexTest(schema, modules);
			await t.run(async (ctx) => {
				const a = await ctx.db.insert('organizations', {
					name: 'Transports Martin',
					createdAt: MAINTENANT - 2 * JOUR
				});
				const b = await ctx.db.insert('organizations', {
					name: 'Garnier Bâtiment',
					createdAt: MAINTENANT - 20 * JOUR
				});
				await ctx.db.insert('parcoursComptes', {
					organizationId: a,
					source: {
						canal: 'campagne',
						pageEntree: '/',
						utmSource: 'manuel',
						utmCampaign: 'transport'
					},
					etapes: { INSCRIT: MAINTENANT - 2 * JOUR, FACTURES_DEPOSEES: MAINTENANT - JOUR },
					score: 40
				});
				await ctx.db.insert('parcoursComptes', {
					organizationId: b,
					source: { canal: 'recherche', pageEntree: '/' },
					etapes: { INSCRIT: MAINTENANT - 20 * JOUR, RELANCES_ACTIVEES: MAINTENANT - 3 * JOUR },
					score: 72
				});
			});

			const chiffres = await t.query(internal.croissance.point.chiffresDeLaSemaine, {
				maintenant: MAINTENANT
			});
			const inscrits = chiffres.totaux.find((l) => l.etape === 'INSCRIT');
			expect(inscrits).toMatchObject({ semaine: 1, mois: 2 });
			expect(chiffres.sources.find((s) => s.source === 'manuel · transport')?.semaine.INSCRIT).toBe(
				1
			);
			expect(chiffres.aAppeler.map((c) => c.nom)).toEqual([
				'Garnier Bâtiment',
				'Transports Martin'
			]);
		},
		DELAI_CONVEX
	);

	it('écrit les chiffres reçus dans les deux versions, et dit quand Umami manque', () => {
		const donnees = {
			periode: 'du 12 au 18 octobre 2026',
			visiteurs: null,
			totaux: [{ libelle: 'Inscrits', semaine: 3, mois: 9 }],
			sources: ['Recherche : 2 inscrits, 1 factures déposées'],
			aAppeler: ['Garnier Bâtiment, 72, relances activées']
		};
		const html = pointDuLundiHtml(donnees);
		const texte = pointDuLundiTexte(donnees);
		for (const morceau of [
			'3 · 28 jours : 9',
			'Recherche : 2 inscrits',
			'Garnier Bâtiment, 72',
			'UMAMI_API_KEY'
		]) {
			expect(html).toContain(morceau);
			expect(texte).toContain(morceau);
		}
		expect(html).not.toMatch(/€/);
	});
});
