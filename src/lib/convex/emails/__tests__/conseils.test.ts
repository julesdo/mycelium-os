import { describe, it, expect } from 'vitest';
import {
	conseilHtml,
	conseilTexte,
	objetDuConseil,
	type DonneesConseil
} from '../modeles/conseils';
import { CLES_CONSEILS_ENVOYES } from '../../../croissance/conseils';

/**
 * Les conseils de Plume. La coquille (échappement, couleurs) est vérifiée par
 * `produit.test.ts` ; ici, ce qui est propre aux conseils : chacun a son objet et
 * son bouton, porte le lien de désinscription dans les deux versions, et ce qui
 * est dû se dit avec les chiffres reçus, jamais avec un verdict.
 */

const BASE = {
	nomEtablissement: 'Menuiserie Dupont',
	site: 'https://www.letikette.com',
	desinscription: 'https://exemple.convex.site/conseils/desinscription?j=abc'
};
const DU = { montant: '2 462,40 €', factures: 2, indemnite: '40,00 €', indemniteTotale: '80,00 €' };
const OFFRE = { pourcent: 20, mois: 3, jusquAu: '2 novembre 2026' };
const PLAN = ['Un rappel, 3 jours après l’échéance', 'Un deuxième rappel, 10 jours plus tard'];

function donnees(cle: DonneesConseil['cle']): DonneesConseil {
	return { ...BASE, cle, du: DU, plan: PLAN, offre: OFFRE };
}

describe('les conseils de Plume', () => {
	it('chacun a un objet, un bouton vers l’application, et le lien de désinscription', () => {
		for (const cle of CLES_CONSEILS_ENVOYES) {
			const html = conseilHtml(donnees(cle));
			const texte = conseilTexte(donnees(cle));
			expect(objetDuConseil(cle).length).toBeGreaterThan(5);
			expect(html).toContain(BASE.desinscription);
			expect(texte).toContain(BASE.desinscription);
			expect(html).toContain(`${BASE.site}/app`);
		}
	});

	it('ce qui est dû porte les chiffres reçus, et aucun verdict', () => {
		const html = conseilHtml(donnees('ce-qui-vous-est-du'));
		expect(html).toContain('2 462,40 €');
		expect(html).toContain('80,00 €');
		expect(html).not.toMatch(/vous devriez|garanti|vous allez récupérer/i);
	});

	it('ce qui partirait reprend le plan reçu, ligne à ligne', () => {
		const texte = conseilTexte(donnees('ce-qui-partirait'));
		for (const ligne of PLAN) expect(texte).toContain(ligne);
	});

	it('l’offre de bienvenue dit sa remise et sa date en clair, sans compte à rebours', () => {
		for (const cle of ['offre-de-bienvenue', 'offre-de-bienvenue-fin'] as const) {
			const html = conseilHtml(donnees(cle));
			expect(html).toContain('20 %');
			expect(html).toContain('2 novembre 2026');
			expect(html).toContain(`${BASE.site}/app/compte?ouvrir=facturation`);
			expect(html).not.toMatch(/garanti|éligible|plus que \d|dernière chance/i);
		}
		expect(objetDuConseil('offre-de-bienvenue-fin')).not.toBe(objetDuConseil('offre-de-bienvenue'));
	});

	it('salue par le prénom quand il est connu', () => {
		expect(conseilHtml({ ...donnees('bienvenue'), prenom: 'Camille' })).toContain('Camille');
	});
});
