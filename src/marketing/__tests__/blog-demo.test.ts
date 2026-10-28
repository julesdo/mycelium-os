import { allResumes } from 'content-collections';
import { describe, expect, it } from 'vitest';
import { articlesDuSite, prochainArticle, valeurDuRegistre } from '../site/blog-demo';

/**
 * LE BLOG DE L'ACCUEIL NE PEND QUE DES VALEURS DU REGISTRE (28/10/2026).
 *
 * Chaque article porte son étiquette ; sa valeur en grand est une clé du registre, lue au rendu,
 * ou un mot. Une clé qui ne se lit plus (renommée, devenue un texte) fait tomber ce test avant
 * l'accueil.
 */
const LE_28_OCTOBRE_A_MIDI = Date.UTC(2026, 9, 28, 11);

describe('le blog de l’accueil', () => {
	it('donne à chaque article une étiquette qui se lit', () => {
		for (const a of allResumes) {
			expect(a.etiquette, a.adresse).toBeDefined();
			if (a.etiquette?.registre !== undefined)
				expect(valeurDuRegistre(a.etiquette.registre), a.adresse).toMatch(
					/^\d+\u00a0(jours|mois|ans?|€)$/
				);
		}
	});

	it('lit les valeurs au registre', () => {
		expect(valeurDuRegistre('delaisPaiementPublics.SANTE')).toBe('50\u00a0jours');
		expect(valeurDuRegistre('indemniteForfaitaire')).toBe('40\u00a0€');
		expect(valeurDuRegistre('prescription.TRANSPORT_MARCHANDISES')).toBe('1\u00a0an');
		expect(() => valeurDuRegistre('mentionCertificationSincerite')).toThrow();
	});

	it('montre les quatre derniers articles sortis, et annonce le suivant', () => {
		const articles = articlesDuSite(LE_28_OCTOBRE_A_MIDI);
		expect(articles).toHaveLength(4);
		expect(articles[0]?.adresse).toBe('hopital-qui-paie-en-retard');
		expect(articles.every((a) => a.date.endsWith('oct.'))).toBe(true);
		expect(prochainArticle(LE_28_OCTOBRE_A_MIDI)).toEqual({
			jour: 'Jeudi 29 octobre',
			titre: 'Bâtiment, chaque situation payée en retard vous doit des frais en plus'
		});
	});
});
