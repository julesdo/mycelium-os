import { describe, it, expect } from 'vitest';
import {
	corpsDeLaRemise,
	ETIQUETTE_FONDATEURS,
	offreDeBienvenue,
	placesFondateurs,
	prixFondateursAttendu
} from '../offres';
import { catalogueAttendu } from '../paddle';
import { JOURS_OFFRE_DE_BIENVENUE, OFFRES } from '../../config/tarifs';

/**
 * LES OFFRES PADDLE (19/10/2026, audit, lot 8) : le prix fondateurs, compté et daté,
 * jamais migré ; la remise de bienvenue, à usage unique, sur les premiers mois au mois.
 */
const JOUR = 24 * 60 * 60 * 1000;

describe('le prix fondateurs', () => {
	it('est un prix à part du produit Pro, à l’année, sans essai, et sans version de grille', () => {
		const p = prixFondateursAttendu();
		expect(p).toMatchObject({
			etiquette: ETIQUETTE_FONDATEURS,
			formule: 'pro',
			rythme: 'annuel',
			essai: false,
			essaiJours: null,
			montant: String(OFFRES.fondateurs.prixCentimes),
			fondateurs: true
		});
		// Jamais migré : une nouvelle version de la grille ne le recrée pas.
		expect(p.etiquette).not.toContain('@');
		const pro = catalogueAttendu().find((produit) => produit.etiquette === 'pro');
		expect(pro?.prix.some((prix) => prix.etiquette === ETIQUETTE_FONDATEURS)).toBe(true);
	});

	it('compte ses places et s’arrête le dernier jour, à Paris', () => {
		expect(placesFondateurs(OFFRES.fondateurs.jusquAu, 0)).toEqual({
			ouverte: true,
			restantes: OFFRES.fondateurs.places
		});
		expect(placesFondateurs('2027-01-01', 0).ouverte).toBe(false);
		expect(placesFondateurs('2026-11-02', OFFRES.fondateurs.places)).toEqual({
			ouverte: false,
			restantes: 0
		});
	});
});

describe('l’offre de bienvenue', () => {
	const rendu = Date.UTC(2026, 9, 19, 10);

	it('vaut jusqu’au dernier jour de l’offre, à Paris', () => {
		const o = offreDeBienvenue({ DIAGNOSTIC_RENDU: rendu }, rendu + JOUR);
		expect(o).toMatchObject({
			pourcent: OFFRES.diagnosticComplet.remiseBienvenuePourcent,
			mois: OFFRES.diagnosticComplet.remiseBienvenueMois,
			dernierJour: '2026-11-01'
		});
		// Elle expire à minuit, heure de Paris, à la fin de son dernier jour.
		expect(o?.expireLe).toBe(Date.UTC(2026, 10, 1, 23));
		expect(
			offreDeBienvenue({ DIAGNOSTIC_RENDU: rendu }, rendu + JOURS_OFFRE_DE_BIENVENUE * JOUR)
		).toBeNull();
	});

	it('n’existe pas sans diagnostic, ni après un essai ou un abonnement', () => {
		expect(offreDeBienvenue({}, rendu)).toBeNull();
		expect(
			offreDeBienvenue({ DIAGNOSTIC_RENDU: rendu, ESSAI: rendu + 1 }, rendu + JOUR)
		).toBeNull();
		expect(
			offreDeBienvenue({ DIAGNOSTIC_RENDU: rendu, ABONNE: rendu + 1 }, rendu + JOUR)
		).toBeNull();
	});

	it('se crée chez Paddle à usage unique, sur les premiers mois des prix au mois', () => {
		const corps = corpsDeLaRemise({
			organisationId: 'org_1',
			nomEtablissement: 'Menuiserie Dupont',
			prixIds: ['pri_a', 'pri_b'],
			expireLe: Date.UTC(2026, 10, 1, 23)
		});
		expect(corps).toMatchObject({
			amount: String(OFFRES.diagnosticComplet.remiseBienvenuePourcent),
			type: 'percentage',
			enabled_for_checkout: true,
			recur: true,
			maximum_recurring_intervals: OFFRES.diagnosticComplet.remiseBienvenueMois,
			usage_limit: 1,
			restrict_to: ['pri_a', 'pri_b'],
			expires_at: '2026-11-01T23:00:00.000Z',
			custom_data: { letikette_organisation: 'org_1' }
		});
	});
});
