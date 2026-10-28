import { describe, expect, it } from 'vitest';
import { PARAMETRES } from '../../lib/verticales/recouvrement/parametres';
import { regimePrescription } from '../../lib/verticales/recouvrement/pays/france/prescription';
import { SCENES_DES_METIERS } from '../scenes-metiers';
import { SECTEURS_PUBLICS } from '../secteurs';
import { METIERS } from '../site/metiers-demo';

/**
 * LA RÈGLE DE CHAQUE MÉTIER EST CELLE DU REGISTRE (28/10/2026).
 *
 * La section l'écrit en grand sur une étiquette : si le registre change, le test tombe et
 * l'étiquette se corrige avec lui.
 */
const sansEspace = (s: string) => s.replace(/[\s\u00a0\u202f]/g, ' ');

describe('les métiers de la section', () => {
	it('portent chacun un métier qui a sa page', () => {
		expect(Object.keys(METIERS)).toEqual([...SECTEURS_PUBLICS]);
	});

	it('écrivent la règle du registre', () => {
		const frais = Number(PARAMETRES.indemniteForfaitaire.valeur) / 100;
		expect(sansEspace(METIERS['transport-routier'].regle.chiffre)).toBe(
			`${regimePrescription('TRANSPORT_MARCHANDISES').dureeAnnees} an`
		);
		expect(sansEspace(METIERS.batiment.regle.chiffre)).toBe(`${frais} €`);
		expect(sansEspace(METIERS['services-aux-entreprises'].regle.chiffre)).toBe(`${12 * frais} €`);
		expect(sansEspace(METIERS['fournisseurs-publics'].regle.chiffre)).toBe(
			`${PARAMETRES.delaisPaiementPublics.valeur.SANTE} jours`
		);
	});

	it('posent la carte mise en avant de la scène du métier', () => {
		for (const m of Object.values(METIERS)) {
			const scene = SCENES_DES_METIERS[m.secteur];
			expect(m.carte.client).toBe(scene.cartes[scene.enAvant]?.client);
		}
	});
});
