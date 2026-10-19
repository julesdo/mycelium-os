import { describe, it, expect } from 'vitest';
import type { CreancierCourrier } from '../gabarits/commun';
import {
	composerReclamationInteretsMoratoires,
	composerSignalementMandatement,
	type AcheteurCourrier,
	type FacturePayeeEnRetardCourrier
} from '../gabarits/commande-publique';
import { PARAMETRES } from '../parametres';

/**
 * LES COURRIERS DU CLIENT PUBLIC (19/10/2026, lot 1 bis) : la demande de paiement des
 * intérêts moratoires, et le signalement pour mandatement d'office, que seul le gérant
 * décide. Modèles : `docs/superpowers/specs/2026-10-19-modeles/`.
 */
const CREANCIER: CreancierCourrier = {
	denomination: 'Nettoyage du Val',
	formeJuridique: 'SAS',
	siren: '552100554',
	adresse: '12 rue des Forges, 94000 Créteil',
	email: 'compta@nettoyage-du-val.fr',
	signataireNom: 'Karim Benali',
	signataireQualite: 'Président',
	capitalSocial: 1_000_000n,
	immatriculeRcs: true,
	villeGreffeRcs: 'Créteil',
	iban: 'FR7630006000011234567890189'
};

const HOPITAL: AcheteurCourrier = {
	denomination: 'Centre hospitalier intercommunal de Créteil',
	siren: '269400220',
	adresse: '40 avenue de Verdun, 94000 Créteil',
	categorieJuridique: '7364'
};

const COMMUNE: AcheteurCourrier = {
	denomination: 'Commune de Maisons-Alfort',
	adresse: '118 avenue du Général de Gaulle, 94700 Maisons-Alfort',
	categorieJuridique: '7210'
};

const FACTURES: FacturePayeeEnRetardCourrier[] = [
	{
		reference: 'FA-2026-0120',
		dateEmission: '2026-03-01',
		montantTTC: 1_000_000n,
		echeance: '2026-05-01',
		payeeLe: '2026-09-01',
		jours: 123,
		taux: '10,15 %',
		interets: 34_204n,
		indemnite: 4_000n
	},
	{
		reference: 'FA-2026-0127',
		montantTTC: 500_000n,
		echeance: '2026-06-10',
		payeeLe: '2026-07-01',
		jours: 21,
		taux: '10,15 %',
		interets: 2_919n,
		indemnite: 4_000n
	}
];

describe('la demande de paiement des intérêts moratoires', () => {
	it('liste chaque facture, totalise, cite ses fondements au registre, et demande le mandatement', () => {
		const c = composerReclamationInteretsMoratoires({
			creancier: CREANCIER,
			acheteur: HOPITAL,
			factures: FACTURES,
			dateCourrier: '2026-10-19'
		});
		expect(c.ok).toBe(true);
		if (!c.ok) return;
		expect(c.corps).toContain('facture n° FA-2026-0120 du 1er mars 2026');
		expect(c.corps).toContain('réglée le 1er septembre 2026, soit 123 jours de retard');
		expect(c.corps).toContain('Intérêts moratoires : 371,23 €');
		expect(c.corps).toContain('2 × 40,00 €, soit 80,00 €');
		expect(c.corps).toContain('Total demandé : 451,23 €');
		expect(c.corps).toContain(PARAMETRES.interetsMoratoiresDePleinDroit.source);
		expect(c.corps).toContain(PARAMETRES.paiementAccessoiresPublics.source);
		expect(c.corps).toContain('procéder au mandatement de la somme de 451,23 €');
		expect(c.corps).toContain('FR7630006000011234567890189');
	});

	it('ne nomme pas le logiciel, ne promet rien et ne menace de rien', () => {
		const c = composerReclamationInteretsMoratoires({
			creancier: CREANCIER,
			acheteur: HOPITAL,
			factures: FACTURES,
			dateCourrier: '2026-10-19'
		});
		if (!c.ok) throw new Error(JSON.stringify(c));
		expect(c.corps).not.toMatch(/letikette|garanti|pour le compte de|mandaté par/i);
		expect(c.corps).not.toMatch(/à défaut|tribunal|juridiction|poursuite|contentieux|huissier/i);
		expect(c.corps).not.toContain('—');
	});

	it('refuse sans facture, sans compte bancaire ou sans adresse de l’acheteur, en le nommant', () => {
		const c = composerReclamationInteretsMoratoires({
			creancier: { ...CREANCIER, iban: undefined },
			acheteur: { ...HOPITAL, adresse: undefined },
			factures: [],
			dateCourrier: '2026-10-19'
		});
		expect(c.ok).toBe(false);
		if (c.ok) return;
		expect(c.manques.join(' ')).toMatch(/IBAN/);
		expect(c.manques.join(' ')).toMatch(/adresse/);
		expect(c.manques.join(' ')).toMatch(/facture/);
	});
});

describe('le signalement pour mandatement d’office', () => {
	it('s’adresse à l’agence régionale de santé pour un hôpital, au préfet pour une commune', () => {
		const ars = composerSignalementMandatement({
			creancier: CREANCIER,
			acheteur: HOPITAL,
			factures: FACTURES,
			dateCourrier: '2026-10-19'
		});
		const prefet = composerSignalementMandatement({
			creancier: CREANCIER,
			acheteur: COMMUNE,
			factures: FACTURES,
			dateCourrier: '2026-10-19'
		});
		if (!ars.ok || !prefet.ok) throw new Error('refus inattendu');
		expect(ars.corps).toContain('L6145-5 du code de la santé publique');
		expect(prefet.corps).toContain('L1612-18 du code général des collectivités territoriales');
		for (const c of [ars, prefet]) {
			expect(c.corps).not.toMatch(/chambre régionale|letikette|garanti|tribunal/i);
		}
	});

	it('refuse tant que trente jours ne se sont pas écoulés depuis le paiement du principal', () => {
		const c = composerSignalementMandatement({
			creancier: CREANCIER,
			acheteur: HOPITAL,
			factures: FACTURES,
			dateCourrier: '2026-09-15'
		});
		expect(c.ok).toBe(false);
		if (c.ok) return;
		expect(c.manques.join(' ')).toMatch(/FA-2026-0120/);
	});

	it('refuse pour un acheteur dont la démarche n’a pas été relue', () => {
		const c = composerSignalementMandatement({
			creancier: CREANCIER,
			acheteur: {
				denomination: 'Université',
				adresse: '1 rue X, 75005 Paris',
				categorieJuridique: '7383'
			},
			factures: FACTURES,
			dateCourrier: '2026-10-19'
		});
		expect(c.ok).toBe(false);
	});
});
