import { describe, expect, it } from 'vitest';
import { ANCIENNETE_DEMO, ARRETE_AU_DEMO, REVELATION_DEMO } from '../../routes/-salle/revelation';
import { JOUR_DE_LA_DEMO, VITRINE, dateCourte } from '../site/vitrine-demo';

/**
 * LE TÉLÉPHONE DE L'EN-TÊTE NE DIT QUE CE QUE LE MOTEUR CALCULE (28/10/2026).
 *
 * Ses chiffres sont recopiés de la salle d'exposition pour ne pas la tirer dans le paquet de
 * l'accueil ; ce test refuse qu'ils s'en écartent. Si le moteur, la série des taux ou les
 * factures de la salle changent, il tombe, et la vitrine se corrige au centime.
 */
const JOUR = 86_400_000;
const age = (depuis: string | undefined) =>
	depuis === undefined ? NaN : (Date.parse(ARRETE_AU_DEMO) - Date.parse(depuis)) / JOUR;

describe('les chiffres de la vitrine', () => {
	it('sont arrêtés au jour de la démonstration de la salle', () => {
		expect(JOUR_DE_LA_DEMO).toBe(ARRETE_AU_DEMO);
		expect(dateCourte('2026-09-09')).toBe('9 sept. 2026');
	});

	it('portent le total, le nombre de factures et ce qui n’a jamais été réclamé du moteur', () => {
		expect(BigInt(VITRINE.du)).toBe(REVELATION_DEMO.total);
		expect(VITRINE.factures).toBe(REVELATION_DEMO.nombreFactures);
		expect(BigInt(VITRINE.penalites)).toBe(REVELATION_DEMO.interets);
		expect(BigInt(VITRINE.frais)).toBe(REVELATION_DEMO.indemnites);
		expect(BigInt(VITRINE.jamaisReclame)).toBe(REVELATION_DEMO.supplement);
	});

	it('rangent chaque facture dans sa tranche d’ancienneté', () => {
		const tranche = (de: number, a: number) =>
			ANCIENNETE_DEMO.filter(
				(l) => age(l.exigibleDepuis) >= de && age(l.exigibleDepuis) < a
			).reduce((s, l) => s + l.montant, 0n);
		expect(BigInt(VITRINE.moinsDe30)).toBe(tranche(0, 30));
		expect(BigInt(VITRINE.de30a90)).toBe(tranche(30, 90));
		expect(BigInt(VITRINE.plusDe90)).toBe(tranche(90, Infinity));
	});

	it('font de la fiction des clients une somme juste', () => {
		const { roux, durand, vidal, rousseau } = VITRINE.clients;
		expect(roux + durand + vidal + rousseau).toBe(VITRINE.du);
		expect(roux + durand + vidal).toBe(VITRINE.plusDe90);
		expect(rousseau).toBe(VITRINE.de30a90);
	});
});
