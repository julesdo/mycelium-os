import { describe, expect, it } from 'vitest';
import { semaineHtml, semaineTexte, type SemaineData } from '../modeles/semaine';
import { repartirLeLundi } from '../../../verticales/recouvrement/votre-semaine';

/**
 * L'E-MAIL DU LUNDI (21/10/2026, le parcours de l'habitude) : « Votre semaine » remplace
 * le point du matin pour qui la reçoit. Un seul e-mail, jamais les deux.
 */

const DONNEES: SemaineData = {
	nomEntreprise: 'Garnier Bâtiment',
	periode: 'la semaine du 12 oct. 2026',
	rentreLisible: '4 120 €',
	meilleure: 'Votre meilleure semaine depuis le 24 août 2026.',
	rangees: [
		{ libelle: 'Relances parties', valeur: '6' },
		{ libelle: 'Clients qui ont payé', valeur: '3' }
	],
	url: 'https://www.letikette.com/app/semaine'
};

describe('l’e-mail « Votre semaine »', () => {
	it('dit ce qui est rentré et mène à l’écran', () => {
		const html = semaineHtml(DONNEES);
		const texte = semaineTexte(DONNEES);
		for (const rendu of [html, texte]) {
			expect(rendu).toContain('Votre semaine');
			expect(rendu).toContain('4 120 €');
			expect(rendu).toContain('https://www.letikette.com/app/semaine');
			expect(rendu).not.toMatch(/garanti|grâce à/i);
		}
	});

	it('ne montre pas de montant à zéro', () => {
		const html = semaineHtml({ ...DONNEES, rentreLisible: null, meilleure: null });
		expect(html).not.toContain('Rentré');
	});
});

describe('un seul e-mail le lundi', () => {
	const MEMBRE = { pointDuMatin: true, semaineCoupee: false, paroleAccordee: true };

	it('envoie « Votre semaine » et pas le point du matin', () => {
		expect(repartirLeLundi([{ userId: 'gerant', ...MEMBRE }], false)).toEqual({
			semaine: ['gerant'],
			pointDuMatin: []
		});
	});

	it('envoie le point du matin à qui a coupé « Votre semaine »', () => {
		expect(
			repartirLeLundi([{ userId: 'associe', ...MEMBRE, semaineCoupee: true }], false)
		).toEqual({ semaine: [], pointDuMatin: ['associe'] });
	});

	it('envoie le point du matin quand la semaine est vide ou le budget dit non', () => {
		expect(repartirLeLundi([{ userId: 'gerant', ...MEMBRE }], true)).toEqual({
			semaine: [],
			pointDuMatin: ['gerant']
		});
		expect(
			repartirLeLundi([{ userId: 'gerant', ...MEMBRE, paroleAccordee: false }], false)
		).toEqual({ semaine: [], pointDuMatin: ['gerant'] });
	});

	it('n’envoie rien à qui a coupé les e-mails du matin', () => {
		expect(repartirLeLundi([{ userId: 'gerant', ...MEMBRE, pointDuMatin: false }], false)).toEqual(
			{ semaine: [], pointDuMatin: [] }
		);
	});
});
