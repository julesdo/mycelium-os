import { describe, expect, it } from 'vitest';
import { JOURS_DE_GRACE } from '../../lib/verticales/recouvrement/parole';
import { HEURES_D_ENVOI } from '../../lib/verticales/recouvrement/plan-relance';
import { FACTURE_DE_LA_LOI } from '../site/loi-demo';
import {
	CALENDRIER_VIDAL,
	HEURE_DU_RAPPEL,
	PLUME,
	PROMESSE,
	RESTE_DURAND,
	VIDAL,
	initiales
} from '../site/plume-demo';

/**
 * LES SCÈNES DE PLUME DISENT CE QUE LE PRODUIT FAIT (28/10/2026).
 *
 * Chaque promesse de la section tient à une règle du produit : si la règle change, le test tombe
 * et la scène se corrige, au lieu de promettre ce que le pilote ne fait plus.
 */
describe('les scènes de Plume', () => {
	it('retiennent une relance pendant le délai du produit', () => {
		expect(PLUME.compteARebours).toBe('59:59');
		expect(PLUME.retenir).toBe('une heure');
	});

	it('font partir le rappel dans les heures d’envoi', () => {
		const heure = Number(HEURE_DU_RAPPEL.slice(0, 2));
		expect(heure).toBeGreaterThanOrEqual(HEURES_D_ENVOI.de);
		expect(heure).toBeLessThan(HEURES_D_ENVOI.a);
	});

	it('taisent les relances jusqu’au jour promis, plus la grâce', () => {
		const jour = Number(PROMESSE.slice(8, 10)) + JOURS_DE_GRACE;
		expect(PLUME.scenario.reponses.promesse.sous).toBe(`Les relances se taisent jusqu’au ${jour}`);
	});

	it('répartissent le paiement en trois fois au centime, le reliquat sur le dernier', () => {
		expect(CALENDRIER_VIDAL.reduce((s, v) => s + v.montant, 0n)).toBe(BigInt(VIDAL.du));
		expect(CALENDRIER_VIDAL.map((v) => v.date)).toEqual(['2026-11-05', '2026-12-05', '2027-01-05']);
	});

	it('déduisent le paiement de Durand de sa facture', () => {
		expect(RESTE_DURAND).toBe(FACTURE_DE_LA_LOI.ttc - 400_000);
		expect(PLUME.scenario.fin).toContain('8\u00a0400,00\u00a0€');
	});

	it('nomment les avatars par leurs initiales', () => {
		expect(initiales('Menuiserie Laurent')).toBe('ML');
		expect(initiales('Transports Vidal')).toBe('TV');
	});
});
