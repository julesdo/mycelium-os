import { describe, expect, it } from 'vitest';
import { rangeeDuDebiteur } from '../identite-debiteur';

/**
 * LA CRÉANCE DOIT POUVOIR ATTEINDRE SON DÉBITEUR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ L'ARÊTE QUI MANQUAIT, ET CE QU'ELLE COÛTAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran d'une créance affiche le nom du débiteur — c'est son TITRE — et
 * n'offrait aucun moyen de l'atteindre. `creanceComplete` ne rendait même pas
 * son identifiant : seulement `debiteur: v.string()`, la dénomination.
 *
 * Ce n'est pas qu'un défaut de navigation. Le radar de solvabilité tourne
 * chaque nuit à quatre heures et écrit son verdict SUR LE DÉBITEUR —
 * `santeFinanciere`, et le constat du registre cité mot pour mot. La créance
 * porte l'argent. Les deux ne se rencontraient jamais à l'écran.
 *
 * Pire : le handler de `creanceComplete` LIT DÉJÀ cette santé — il la passe à
 * `qualifier()` pour calculer le score — et la jette ensuite. Un débiteur en
 * procédure collective faisait donc baisser la note sans que l'écran dise
 * pourquoi. C'est la même famille de défaut que « déclaré, lu, jamais
 * alimenté » : ici la donnée est lue, elle sert, et elle n'arrive pas à l'œil.
 *
 * ⚠️ AUCUN VERBE DE RECOMMANDATION, ET AUCUNE COULEUR DE SEUIL. Le produit
 * énonce un constat — « procédure collective au registre » — jamais « déclarez
 * votre créance ». Et le vert, l'ambre et le rouge restent réservés à
 * `--color-seuil-*` : une rangée qui appelle l'attention porte un POINT.
 */
describe('la rangée du débiteur, sur l’écran d’une créance', () => {
	it('dit la procédure collective, parce qu’elle change ce que la créance vaut', () => {
		const rangee = rangeeDuDebiteur({ sante: 'PROCEDURE_COLLECTIVE' });

		expect(rangee.valeur).toBe('Procédure collective');
		// Le point, pas une couleur : c'est la convention de tout l'écran.
		expect(rangee.attention).toBe(true);
	});

	it('dit la radiation', () => {
		expect(rangeeDuDebiteur({ sante: 'RADIEE' })).toMatchObject({
			valeur: 'Radiée du registre',
			attention: true
		});
	});

	it('ne confond pas « rien su » avec « tout va bien »', () => {
		// ⚠️ C'EST LA DISTINCTION QUE LE SCHÉMA IMPOSE, et elle est écrite dans la
		// table : « ne rien savoir n'est pas la même chose que savoir que tout va
		// bien, et c'est la confusion qui ferait engager des frais sur un débiteur
		// déjà radié ». La rangée doit donc distinguer les deux MOTS, sans quoi la
		// distinction gardée en base se perd au dernier mètre.
		expect(rangeeDuDebiteur({ sante: 'INCONNUE' }).valeur).toBe('Non vérifiée');
		expect(rangeeDuDebiteur({ sante: 'SAINE' }).valeur).toBe('Rien au registre');
	});

	it('n’appelle l’attention que sur ce qui l’exige', () => {
		// Un point sur chaque rangée ne désigne plus rien.
		expect(rangeeDuDebiteur({ sante: 'INCONNUE' }).attention).toBe(false);
		expect(rangeeDuDebiteur({ sante: 'SAINE' }).attention).toBe(false);
	});

	it('ne recommande jamais une conduite à tenir', () => {
		// La troisième ligne rouge du projet : on énonce des CONSTATS. Un
		// « déclarez », « engagez » ou « vous devriez » sur cette rangée serait du
		// conseil juridique, sur l'écran le plus lu du produit.
		const INTERDITS = /d[ée]clarez|engagez|vous devriez|il faut|saisissez|mettez en demeure/i;
		for (const sante of ['INCONNUE', 'SAINE', 'PROCEDURE_COLLECTIVE', 'RADIEE'] as const) {
			const { valeur, precision } = rangeeDuDebiteur({ sante });
			expect(valeur).not.toMatch(INTERDITS);
			expect(precision ?? '').not.toMatch(INTERDITS);
		}
	});
});
