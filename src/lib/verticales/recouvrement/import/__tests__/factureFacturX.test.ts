import { describe, expect, it } from 'vitest';
import { resultatDepuisFacturX } from '../factureFacturX';
import type { ChampsFacturX } from '../../../../socle/documents/facturx';

/**
 * LES SEPT REFUS, ET LE CAS NOMINAL.
 *
 * ⚠️ CE MAPPEUR NE LIT PAS DE XML. Il reçoit des champs déjà lus par le socle :
 * les fixtures sont donc des objets, et chaque cas ne fait varier QUE ce qu'il
 * teste. Un fixture qui porterait un XML entier ferait passer les erreurs du
 * lecteur pour des erreurs du mappeur.
 */

const NOMINAL: ChampsFacturX = {
	profil: 'urn:factur-x.eu:1p0:minimum',
	numero: 'FA-2026-0042',
	typeCode: '380',
	dateEmission: '20260715',
	formatDateEmission: '102',
	devise: 'EUR',
	totalTTC: '1200.00',
	netAPayer: '1200.00',
	acheteurNom: 'Imprimerie Martin',
	acheteurIdLegal: '77788899100018',
	vendeurNom: 'Fournitures Durand et Fils',
	vendeurIdLegal: '732829320'
};

const SIREN_CREANCIER = '732829320';

function lire(champs: Partial<ChampsFacturX>, siren: string | undefined = SIREN_CREANCIER) {
	return resultatDepuisFacturX({ ...NOMINAL, ...champs }, 'facture.pdf', siren);
}

/** La raison du refus, ou `null` si rien n'a été refusé. */
function raison(resultat: ReturnType<typeof lire>): string | null {
	return resultat.ignorees[0]?.raison ?? null;
}

describe('resultatDepuisFacturX', () => {
	it('lit une facture conforme, au centime', () => {
		const resultat = lire({});
		expect(resultat.format).toBe('FACTUR_X');
		expect(resultat.ignorees).toHaveLength(0);
		expect(resultat.factures).toHaveLength(1);

		const facture = resultat.factures[0];
		expect(facture?.reference).toBe('FA-2026-0042');
		expect(facture?.debiteur).toBe('Imprimerie Martin');
		expect(facture?.montantTTC).toBe(120_000n);
		expect(facture?.dateEmission).toBe('2026-07-15');
		expect(facture?.dateEcheance).toBeUndefined();
		// Le SIRET de 14 chiffres rend les neuf premiers, clé de contrôle vérifiée.
		expect(facture?.debiteurSiren).toBe('777888991');
	});

	it('lit l’échéance quand elle est là', () => {
		const facture = lire({ dateEcheance: '20260814', formatDateEcheance: '102' }).factures[0];
		expect(facture?.dateEcheance).toBe('2026-08-14');
	});

	it('refuse un avoir en le nommant, plutôt que de réclamer à l’envers', () => {
		expect(raison(lire({ typeCode: '381' }))).toMatch(/avoir/i);
		expect(lire({ typeCode: '381' }).factures).toHaveLength(0);
	});

	it('refuse une rectificative et un acompte, chacun nommé', () => {
		expect(raison(lire({ typeCode: '384' }))).toMatch(/384/);
		expect(raison(lire({ typeCode: '386' }))).toMatch(/386/);
	});

	it('refuse une devise qui n’est pas l’euro', () => {
		expect(raison(lire({ devise: 'CHF' }))).toMatch(/CHF/);
	});

	it('refuse un format de date qui n’est pas le jour', () => {
		// CII admet 610 (mois) et 616 (semaine) : supposer huit caractères ferait
		// lire « 202607 » comme le 15 juillet.
		expect(raison(lire({ dateEmission: '202607', formatDateEmission: '610' }))).toMatch(/610/);
	});

	it('refuse une date qui n’existe pas au calendrier', () => {
		// `Date.parse` ne lève pas sous Bun : « 20260230 » roulerait au 2 mars.
		expect(raison(lire({ dateEmission: '20260230' }))).toMatch(/30\/02\/2026|20260230/);
	});

	it('retient le net à payer quand un acompte a été versé, et le dit', () => {
		const resultat = lire({ totalTTC: '1200.00', netAPayer: '900.00', acompte: '300.00' });
		expect(resultat.factures[0]?.montantTTC).toBe(90_000n);
		// Ce n'est pas un refus : la facture entre, et l'écart est nommé.
		expect(resultat.ignorees).toHaveLength(1);
		expect(resultat.ignorees[0]?.raison).toMatch(/acompte/i);
	});

	it('tolère des décimales nulles et refuse une troisième décimale significative', () => {
		expect(lire({ netAPayer: '1200.0000' }).factures[0]?.montantTTC).toBe(120_000n);
		expect(raison(lire({ netAPayer: '1200.245' }))).toMatch(/1200\.245/);
	});

	it('refuse une facture dont le vendeur n’est pas le créancier', () => {
		// Une facture d'ACHAT déposée par erreur : le XML permet de trancher.
		expect(raison(lire({ vendeurIdLegal: '421931452' }))).toMatch(/421 ?931 ?452|vendeur|émise/i);
	});

	it('laisse passer quand le créancier n’a pas de SIREN, et le dit', () => {
		// ⚠️ APPEL DIRECT, PAS `lire(…, undefined)` : passer `undefined` à un
		// paramètre qui a une valeur par défaut REMET la valeur par défaut. Le test
		// aurait alors vérifié le refus du cas précédent en croyant vérifier
		// celui-ci.
		const resultat = resultatDepuisFacturX(
			{ ...NOMINAL, vendeurIdLegal: '421931452' },
			'facture.pdf',
			undefined
		);
		expect(resultat.factures).toHaveLength(1);
		expect(resultat.ignorees[0]?.raison).toMatch(/SIREN/);
	});

	it('refuse un document sans nom d’acheteur exploitable', () => {
		expect(raison(lire({ acheteurNom: '   ' }))).toMatch(/client|acheteur/i);
	});

	it('n’invente jamais de règlement, même quand un acompte est connu', () => {
		// `ReglementImporte` exige une date, et `TotalPrepaidAmount` n'en porte pas.
		expect(lire({ acompte: '300.00', netAPayer: '900.00' }).reglements).toHaveLength(0);
	});
});
