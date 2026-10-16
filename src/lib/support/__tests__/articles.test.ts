import { describe, it, expect } from 'vitest';
import { ARTICLES, ECRANS_D_AIDE, chercherArticles, connaissanceDeLAide } from '../articles';
import { SUJETS } from '../sujets';
import { questionsDuCompte } from '../questions';
import { GRILLE, DUREE_ESSAI_JOURS } from '../../config/tarifs';

describe('la base d’aide de Plume support', () => {
	it('a des clés uniques, un sujet connu, et mène à un écran de la liste fermée', () => {
		const cles = ARTICLES.map((a) => a.cle);
		expect(new Set(cles).size).toBe(cles.length);
		for (const a of ARTICLES) {
			expect(SUJETS, a.cle).toContain(a.sujet);
			if (a.ecran !== undefined) expect(Object.keys(ECRANS_D_AIDE), a.cle).toContain(a.ecran);
			expect(a.reponse.length, a.cle).toBeGreaterThan(40);
		}
	});

	it('lit ses chiffres sur les constantes, jamais tapés', () => {
		const abonnement = ARTICLES.find((a) => a.cle === 'formules');
		expect(abonnement?.reponse).toContain(String(GRILLE.solo.mensuel));
		expect(abonnement?.reponse).toContain(String(GRILLE.pro.mensuel));
		expect(ARTICLES.find((a) => a.cle === 'essai')?.reponse).toContain(String(DUREE_ESSAI_JOURS));
	});

	it('ne parle jamais de droit : aucun article n’emploie les mots d’une voie de justice', () => {
		for (const a of ARTICLES) {
			expect(a.reponse, a.cle).not.toMatch(/\b(?:injonction|assignation|tribunal|huissier|prescription|mise en demeure)\b/i);
		}
	});

	it('trouve un article par ses mots, sans accents ni casse', () => {
		expect(chercherArticles('resilier')[0]?.cle).toBe('resilier');
		expect(chercherArticles('mot de passe oublié')[0]?.cle).toBe('mot-de-passe');
		expect(chercherArticles('')).toEqual([]);
	});

	it('se lit en un texte stable, que le prompt met en cache', () => {
		expect(connaissanceDeLAide()).toBe(connaissanceDeLAide());
		expect(connaissanceDeLAide()).toContain('[formules]');
	});
});

describe('questionsDuCompte', () => {
	const calme = {
		relancesActivees: true,
		essaiEnCours: false,
		connexionEnErreur: null,
		documentsEnEchec: 0,
		estAdministrateur: true
	};

	it('fait monter ce qui ne va pas, trois questions au plus', () => {
		const q = questionsDuCompte({
			...calme,
			relancesActivees: false,
			connexionEnErreur: 'Pennylane',
			documentsEnEchec: 2,
			essaiEnCours: true
		});
		expect(q).toHaveLength(3);
		expect(q[0]).toEqual({ cle: 'connexion-erreur', question: 'Ma connexion à Pennylane ne lit plus rien' });
		expect(q.map((x) => x.cle)).toEqual(['connexion-erreur', 'document-pas-entre', 'relances-rien-parti']);
	});

	it('ne parle d’argent qu’à un administrateur', () => {
		const q = questionsDuCompte({ ...calme, essaiEnCours: true, estAdministrateur: false });
		expect(q.map((x) => x.cle)).not.toContain('essai');
	});

	it('propose des questions de départ quand tout va bien', () => {
		expect(questionsDuCompte(calme)).toHaveLength(3);
	});
});
