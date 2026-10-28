import { describe, expect, it } from 'vitest';
import { CE_QUI_EST_INCLUS, FORMULES, GRILLE, LIMITES } from '../../lib/config/tarifs';
import { COMPARATIF, PRIX } from '../site/tarifs-demo';

/**
 * LES TARIFS DU SITE SONT CEUX DE LA GRILLE (28/10/2026). La maquette avait été dessinée sur
 * l'ancienne : ce test refuse qu'une étiquette dise un autre prix que `config/tarifs.ts`.
 */
const chiffres = (s: string) => Number(s.replace(/\D/g, ''));

describe('les tarifs du site', () => {
	it('affichent les prix de la grille, aux deux rythmes', () => {
		expect(PRIX.map((p) => p.formule)).toEqual([...FORMULES]);
		for (const p of PRIX) {
			expect(chiffres(p.annuel)).toBe(GRILLE[p.formule].annuel);
			expect(chiffres(p.mensuel)).toBe(GRILLE[p.formule].mensuel);
		}
	});

	it('disent les limites de chaque formule', () => {
		for (const p of PRIX) {
			const l = LIMITES[p.formule];
			const texte = JSON.stringify(p.lignes);
			expect(texte).toContain(l.clientsSuivis === null ? 'sans limite' : String(l.clientsSuivis));
			expect(texte).toContain(String(l.analysesParMois));
		}
	});

	it('comparent ce que dit `CE_QUI_EST_INCLUS`, ligne par ligne', () => {
		expect(COMPARATIF.lignes.map((l) => l.libelle)).toEqual(
			CE_QUI_EST_INCLUS.map((l) => l.libelle)
		);
	});
});
