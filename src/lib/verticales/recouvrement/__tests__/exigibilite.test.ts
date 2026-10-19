import { describe, it, expect } from 'vitest';
import { departDuRetard, estEchue } from '../exigibilite';

/**
 * D'OÙ COURT LE RETARD (19/10/2026) : une seule lecture pour tout ce qui MESURE
 * (la révélation, le diagnostic, le relevé des étapes, le conseil « ce qui vous est
 * dû »). Le pilote et le plan, qui AGISSENT vers le client, exigent toujours une
 * échéance connue.
 */
describe('le départ du retard', () => {
	it('prend l’exigibilité, puis l’échéance', () => {
		expect(
			departDuRetard({
				dateExigibilite: '2026-03-10',
				dateEcheance: '2026-03-01',
				dateEmission: '2026-02-01'
			})
		).toEqual({ depart: '2026-03-10', supposee: false });
		expect(departDuRetard({ dateEcheance: '2026-03-01', dateEmission: '2026-02-01' })).toEqual({
			depart: '2026-03-01',
			supposee: false
		});
	});

	it('suppose trente jours après la date de la facture quand rien d’autre n’est connu', () => {
		expect(departDuRetard({ dateEmission: '2026-08-01' })).toEqual({
			depart: '2026-08-31',
			supposee: true
		});
	});

	it('rend une date d’émission illisible telle quelle, pour que le calcul la nomme', () => {
		expect(departDuRetard({ dateEmission: '2026-02-30' })).toEqual({
			depart: '2026-02-30',
			supposee: true
		});
	});

	it('dit échue une facture non soldée dont le retard a commencé', () => {
		const sansEcheance = { dateEmission: '2026-08-01', statutPaiement: 'IMPAYEE' as const };
		expect(estEchue(sansEcheance, '2026-08-31')).toBe(false);
		expect(estEchue(sansEcheance, '2026-09-01')).toBe(true);
		expect(estEchue({ ...sansEcheance, statutPaiement: 'SOLDEE' }, '2026-12-01')).toBe(false);
	});
});

describe('le départ du retard d’un client public (lot 1 bis)', () => {
	it('suppose le délai de sa catégorie à la place du délai commercial', () => {
		expect(departDuRetard({ dateEmission: '2026-08-01' }, { delaiSupposeJours: 50 })).toEqual({
			depart: '2026-09-20',
			supposee: true
		});
		// Une échéance connue l'emporte toujours.
		expect(
			departDuRetard(
				{ dateEcheance: '2026-08-31', dateEmission: '2026-08-01' },
				{ delaiSupposeJours: 50 }
			)
		).toEqual({ depart: '2026-08-31', supposee: false });
	});
});
