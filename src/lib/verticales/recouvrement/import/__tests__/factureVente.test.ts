import { describe, it, expect } from 'vitest';
import { versEuros } from '../../../../socle/montants';
import {
	documentVenteSchema,
	construirePromptVente,
	versFactureImportee
} from '../factureVente';

/**
 * Le dépôt de fichiers pour des factures de VENTE.
 *
 * C'est le chemin de repli quand le créancier n'a pas d'export comptable sous
 * la main. Il réutilise toute la machinerie d'extraction du socle, mais PAS son
 * schéma d'achat : sur une facture de vente, l'émetteur est le créancier
 * lui-même, et le débiteur — la seule partie qui compte — est le CLIENT.
 */

function doc(surcharge: Record<string, unknown> = {}) {
	return {
		clientName: 'Fournitures Durand',
		invoiceNumber: 'FA-2026-0042',
		invoiceDate: '2026-04-15',
		dueDate: '2026-05-15',
		totalTTC: 12000,
		lignes: [
			{
				rawLabel: 'Prestation de conseil',
				quantity: null,
				unit: null,
				unitPrice: null,
				amountHT: 10000,
				vatRate: 20
			}
		],
		totaux: { totalHT: 10000, basesParTaux: [{ taux: 20, baseHT: 10000 }] },
		illisible: false,
		raisonIllisible: null,
		...surcharge
	};
}

describe('schéma de facture de vente', () => {
	it('accepte un document complet', () => {
		expect(() => documentVenteSchema.parse(doc())).not.toThrow();
	});

	it('demande le CLIENT, pas le fournisseur', () => {
		const analyse = documentVenteSchema.parse(doc());
		expect(analyse).toHaveProperty('clientName');
		expect(analyse).not.toHaveProperty('supplierName');
	});

	it('porte la date d’échéance, que le schéma d’achat ignore', () => {
		// Sans elle, aucun intérêt de retard n'est calculable.
		expect(documentVenteSchema.parse(doc()).dueDate).toBe('2026-05-15');
	});

	it('garde les lignes et les totaux communs du socle', () => {
		const analyse = documentVenteSchema.parse(doc());
		expect(analyse.lignes).toHaveLength(1);
		expect(analyse.totaux.totalHT).toBe(10000);
	});
});

describe('prompt de vente', () => {
	it('est déterministe, octet pour octet', () => {
		expect(construirePromptVente()).toBe(construirePromptVente());
	});

	it('dépasse le minimum cacheable de 512 tokens', () => {
		expect(construirePromptVente().length).toBeGreaterThan(2000);
	});

	it('ne contient aucune date, qui invaliderait le cache', () => {
		expect(construirePromptVente()).not.toMatch(/\d{4}-\d{2}-\d{2}/);
		expect(construirePromptVente()).not.toMatch(/\b(19|20)\d{2}\b/);
	});

	it('dit au modèle de relever le client et l’échéance', () => {
		const p = construirePromptVente();
		expect(p).toMatch(/client/i);
		expect(p).toMatch(/échéance/i);
	});
});

describe('conversion en facture importée', () => {
	it('rend une facture exacte au centime', () => {
		const facture = versFactureImportee(documentVenteSchema.parse(doc()));
		expect(facture.ok).toBe(true);
		if (!facture.ok) return;

		expect(facture.facture.reference).toBe('FA-2026-0042');
		expect(facture.facture.debiteur).toBe('Fournitures Durand');
		expect(versEuros(facture.facture.montantTTC)).toBe('12 000,00');
		expect(facture.facture.dateEmission).toBe('2026-04-15');
		expect(facture.facture.dateEcheance).toBe('2026-05-15');
	});

	it('lit un montant à décimales sans le dénaturer', () => {
		const facture = versFactureImportee(documentVenteSchema.parse(doc({ totalTTC: 1234.56 })));
		expect(facture.ok).toBe(true);
		if (!facture.ok) return;
		expect(versEuros(facture.facture.montantTTC)).toBe('1 234,56');
	});

	it('refuse un document que le modèle a déclaré illisible', () => {
		const resultat = versFactureImportee(
			documentVenteSchema.parse(doc({ illisible: true, raisonIllisible: 'photo floue' }))
		);
		expect(resultat.ok).toBe(false);
		if (resultat.ok) return;
		expect(resultat.raison).toMatch(/photo floue/);
	});

	it('refuse une facture sans client identifiable', () => {
		const resultat = versFactureImportee(documentVenteSchema.parse(doc({ clientName: null })));
		expect(resultat.ok).toBe(false);
		if (resultat.ok) return;
		expect(resultat.raison).toMatch(/client/i);
	});

	it('refuse une facture sans montant', () => {
		const resultat = versFactureImportee(documentVenteSchema.parse(doc({ totalTTC: null })));
		expect(resultat.ok).toBe(false);
		if (resultat.ok) return;
		expect(resultat.raison).toMatch(/montant/i);
	});

	it('refuse une facture sans référence', () => {
		const resultat = versFactureImportee(documentVenteSchema.parse(doc({ invoiceNumber: null })));
		expect(resultat.ok).toBe(false);
		if (resultat.ok) return;
		expect(resultat.raison).toMatch(/référence|numéro/i);
	});

	it('accepte une facture sans échéance imprimée, sans l’inventer', () => {
		// L'échéance manquante n'empêche pas d'enregistrer la facture : elle
		// empêchera de calculer des intérêts, et c'est au gérant de la saisir.
		const resultat = versFactureImportee(documentVenteSchema.parse(doc({ dueDate: null })));
		expect(resultat.ok).toBe(true);
		if (!resultat.ok) return;
		expect(resultat.facture.dateEcheance).toBeUndefined();
	});

	it('refuse un montant à trois décimales plutôt que de l’arrondir', () => {
		const resultat = versFactureImportee(documentVenteSchema.parse(doc({ totalTTC: 1234.567 })));
		expect(resultat.ok).toBe(false);
		if (resultat.ok) return;
		expect(resultat.raison).toMatch(/montant/i);
	});
});
