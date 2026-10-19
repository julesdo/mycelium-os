import { describe, expect, it } from 'vitest';
import { depuisCentimes, enCentimes, fraction } from '../../../../../socle/montants';
import { decompterFacture } from '../../../decompte';
import { PARAMETRES, exiger } from '../../../parametres';
import {
	categorieAcheteurPublic,
	dateLimitePaiementDesAccessoires,
	echeanceLegalePublique,
	estPersonnePublique,
	periodesDeTauxPublics,
	premierJourDInterets,
	tauxInteretsMoratoires
} from '../commande-publique';
import { datePrescriptionQuadriennale } from '../prescription';
import { periodesDeTauxParDefaut } from '../taux';

/**
 * Le barème public. Chaque attendu est calculé à la main dans son commentaire, sur les
 * valeurs relues le 19/10/2026 (R2192-31 : BCE + 8 points ; BCE 2,15 % au 1er janvier
 * 2026, 2,40 % au 1er juillet 2026).
 */

describe('le taux des intérêts moratoires', () => {
	it('vaut BCE + 8 points du semestre où les intérêts commencent', () => {
		// 2,15 + 8 = 10,15 % ; 2,40 + 8 = 10,40 %.
		expect(tauxInteretsMoratoires('2026-03-15')).toEqual(fraction(1015n, 10000n));
		expect(tauxInteretsMoratoires('2026-09-01')).toEqual(fraction(1040n, 10000n));
	});

	it('s’ancre sur le LENDEMAIN de l’échéance : un délai qui expire le 30 juin court au taux de juillet', () => {
		expect(premierJourDInterets('2026-06-30')).toBe('2026-07-01');
		const [seule] = periodesDeTauxPublics('2026-06-30');
		expect(seule?.taux).toEqual(fraction(1040n, 10000n));
	});

	it('ne pose qu’UNE période, là où le barème commercial en pose une par semestre', () => {
		expect(periodesDeTauxPublics('2025-02-01')).toHaveLength(1);
		// Le même retard au barème commercial traverse 2025-S1, 2025-S2, 2026-S1, 2026-S2.
		expect(periodesDeTauxParDefaut('2025-02-01', '2026-08-01')).toHaveLength(4);
	});

	it('lève en nommant le semestre que la série ne connaît pas, sans extrapoler', () => {
		expect(() => tauxInteretsMoratoires('2031-02-01')).toThrowError(/2031-S1/);
	});
});

describe('le décompte au barème public', () => {
	it('chiffre une facture payée 60 jours en retard, avec l’indemnité publique', () => {
		// 10 000,00 € échus le 30/06/2026, payés le 29/08/2026 : du 30/06 inclus au
		// 29/08 exclu, 60 jours (1 + 31 + 28). Taux 10,40 %.
		// 1 000 000 c × 1040/10000 × 60/365 = 17 095,89 c → 17 096 c (arrondi au plus proche).
		const ligne = decompterFacture(
			{
				reference: 'CH-1',
				bareme: 'COMMANDE_PUBLIQUE',
				montantExigible: depuisCentimes(1_000_000n),
				dateExigibilite: '2026-06-30',
				reglements: [
					{ date: '2026-08-29', montant: depuisCentimes(1_000_000n), nature: 'PAIEMENT' }
				],
				taux: periodesDeTauxPublics('2026-06-30')
			},
			'2026-10-19',
			'ACT_365',
			'PRINCIPAL_DABORD'
		);
		expect(ligne.bareme).toBe('COMMANDE_PUBLIQUE');
		// Le paiement coupe la période : après lui, le principal est nul et rien ne court.
		expect(ligne.segments[0]?.jours).toBe(60);
		expect(ligne.segments.slice(1).every((s) => enCentimes(s.interets) === 0n)).toBe(true);
		// Un seul taux, d'un bout à l'autre.
		expect(
			new Set(ligne.segments.map((s) => `${s.taux.numerateur}/${s.taux.denominateur}`)).size
		).toBe(1);
		expect(enCentimes(ligne.interets)).toBe(17_096n);
		expect(enCentimes(ligne.indemniteForfaitaire)).toBe(
			exiger(PARAMETRES.indemniteForfaitairePublique)
		);
		expect(enCentimes(ligne.principalRestantDu)).toBe(0n);
	});

	it('garde le barème commercial quand rien n’est dit', () => {
		const ligne = decompterFacture(
			{
				reference: 'F-1',
				montantExigible: depuisCentimes(100_000n),
				dateExigibilite: '2026-06-30',
				reglements: [],
				taux: periodesDeTauxParDefaut('2026-06-30', '2026-10-19')
			},
			'2026-10-19',
			'ACT_365',
			'PRINCIPAL_DABORD'
		);
		expect(ligne.bareme).toBe('COMMERCIAL');
	});
});

describe('l’acheteur public', () => {
	it('range l’hôpital public à cinquante jours, la commune à trente', () => {
		expect(categorieAcheteurPublic('7364')).toBe('SANTE');
		expect(categorieAcheteurPublic('7210')).toBe('POUVOIR_ADJUDICATEUR');
		expect(categorieAcheteurPublic('7346')).toBe('POUVOIR_ADJUDICATEUR');
		// 30/09 + 50 j = 19/11 ; 30/09 + 30 j = 30/10.
		expect(echeanceLegalePublique('2026-09-30', 'SANTE')).toBe('2026-11-19');
		expect(echeanceLegalePublique('2026-09-30', 'POUVOIR_ADJUDICATEUR')).toBe('2026-10-30');
	});

	it('ne devine pas : un code non relevé ne rend aucune catégorie, ni aucune échéance', () => {
		expect(categorieAcheteurPublic('7470')).toBeNull();
		expect(categorieAcheteurPublic('5710')).toBeNull();
		expect(categorieAcheteurPublic(undefined)).toBeNull();
		expect(echeanceLegalePublique('2026-09-30', null)).toBeNull();
	});

	it('reconnaît une personne publique au premier chiffre de sa catégorie', () => {
		expect(estPersonnePublique('7364')).toBe(true);
		expect(estPersonnePublique('5710')).toBe(false);
	});

	it('laisse 45 jours pour payer les intérêts après le principal', () => {
		// 29/08 + 45 j = 13/10.
		expect(dateLimitePaiementDesAccessoires('2026-08-29')).toBe('2026-10-13');
	});
});

describe('la prescription quadriennale', () => {
	it('part du 1er janvier qui suit l’année des droits : droits de 2022, dernier jour le 31/12/2026', () => {
		expect(datePrescriptionQuadriennale(2022)).toEqual({
			premierJourPrescrit: '2027-01-01',
			dernierJourPourAgir: '2026-12-31'
		});
	});

	it('recourt quatre ans après le 1er janvier qui suit une réclamation écrite', () => {
		// Réclamation en 2026 : nouveau délai du 01/01/2027 au 31/12/2030.
		expect(datePrescriptionQuadriennale(2022, 2026)).toEqual({
			premierJourPrescrit: '2031-01-01',
			dernierJourPourAgir: '2030-12-31'
		});
	});

	it('ignore une interruption antérieure à l’année des droits', () => {
		expect(datePrescriptionQuadriennale(2023, 2021).premierJourPrescrit).toBe('2028-01-01');
	});
});
