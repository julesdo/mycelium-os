import { describe, it, expect } from 'vitest';
import {
	rapportHtml,
	rapportTexte,
	OBJET_DU_RAPPORT,
	type DonneesRapport
} from '../modeles/diagnostic';

/**
 * LE RAPPORT DU DIAGNOSTIC (19/10/2026, audit, lot 7) : un e-mail transactionnel, la
 * réponse au geste du gérant. Il porte les chiffres reçus du moteur, aucun verdict, et
 * pas de lien de désinscription : ce n'est pas un conseil.
 */
const D: DonneesRapport = {
	prenom: 'Camille',
	nomEtablissement: 'Menuiserie Dupont',
	site: 'https://www.letikette.com',
	periode: 'Factures depuis le 19 juillet 2026',
	compteAu: '19 octobre 2026',
	enJeu: '1 284,50 €',
	encoreDues: { factures: 4, montant: '8 420,00 €' },
	payeesEnRetard: 7,
	nonChiffrees: 2,
	hypotheses: [
		'3 factures sans échéance dans le fichier : le calcul suppose un règlement à 30 jours.'
	],
	avertissement: 'Ce rapport mesure ce que la loi ajoute à vos factures.'
};

describe('le rapport du diagnostic', () => {
	it('porte la somme en jeu, la période et le lien vers le détail', () => {
		const html = rapportHtml(D);
		expect(OBJET_DU_RAPPORT.length).toBeGreaterThan(5);
		expect(html).toContain('1 284,50 €');
		expect(html).toContain('factures depuis le 19 juillet 2026');
		expect(html).toContain('https://www.letikette.com/app/diagnostic');
		expect(html).toContain('Camille');
	});

	it('dit ses hypothèses et ce qui n’est pas chiffré', () => {
		const texte = rapportTexte(D);
		expect(texte).toContain('sans échéance');
		expect(texte).toMatch(/2 factures? non chiffrées?/);
	});

	it('ne porte ni lien de désinscription, ni verdict, ni offre', () => {
		const html = rapportHtml(D);
		expect(html).not.toMatch(/desinscription|Ne plus recevoir/i);
		expect(html).not.toMatch(/vous devriez|garanti|vous allez récupérer/i);
		// Aucune remise dans un message transactionnel.
		expect(rapportTexte(D)).not.toMatch(/%/);
	});
});
