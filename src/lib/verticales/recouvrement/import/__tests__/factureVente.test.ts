import { describe, it, expect } from 'vitest';
import { versEuros } from '../../../../socle/montants';
import {
	documentVenteSchema,
	construirePromptVente,
	versFactureImportee,
	resultatDepuisDocument
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
		clientSiret: null,
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

/**
 * UNE DATE QUI PASSE LE FORMAT N'EST PAS UNE DATE.
 *
 * Le modèle rend `AAAA-MM-JJ` parce qu'on le lui demande, mais il lit un
 * document : un « 30/02/2026 » imprimé par erreur, ou un OCR qui transforme un
 * 0 en 3, produisent une chaîne bien formée et impossible. Elle traversait la
 * conversion, puis la validation Convex (c'est une chaîne), et faisait exploser
 * le calcul de prescription — pour TOUTE l'organisation, pas seulement pour
 * cette facture.
 */
describe('dates impossibles', () => {
	it('refuse une date d’émission bien formée mais qui n’existe pas', () => {
		const resultat = versFactureImportee(
			documentVenteSchema.parse(doc({ invoiceDate: '2026-02-30' }))
		);
		expect(resultat.ok).toBe(false);
		if (resultat.ok) return;
		expect(resultat.raison).toMatch(/2026-02-30/);
	});

	it('refuse une date d’émission au mois impossible', () => {
		const resultat = versFactureImportee(
			documentVenteSchema.parse(doc({ invoiceDate: '2026-13-01' }))
		);
		expect(resultat.ok).toBe(false);
		if (resultat.ok) return;
		expect(resultat.raison).toMatch(/2026-13-01/);
	});

	it('écarte une échéance impossible comme une échéance absente, sans refuser la facture', () => {
		// Le même traitement qu'une échéance non imprimée, et pour la même
		// raison : la facture existe, seul son point de départ manque. La refuser
		// entièrement ferait perdre une créance pour une faute de frappe.
		const resultat = versFactureImportee(documentVenteSchema.parse(doc({ dueDate: '2026-02-30' })));
		expect(resultat.ok).toBe(true);
		if (!resultat.ok) return;
		expect(resultat.facture.dateEcheance).toBeUndefined();
	});
});

/**
 * LE SIREN DU CLIENT — la charnière vers les registres publics.
 *
 * Il est IMPRIMÉ sur beaucoup de factures françaises, à côté du bloc « Facturé
 * à ». Le relever coûte un champ de plus dans le schéma d'extraction, et c'est
 * la seule chose qui rendra un jour le radar BODACC fiable : sans identifiant,
 * un rapprochement se ferait par raison sociale, et finirait par annoncer à un
 * gérant que son client solvable est en liquidation.
 *
 * ⚠️ ON NE GARDE QUE CE QUI PASSE LA CLÉ DE CONTRÔLE. Un numéro mal lu par un
 * OCR — un 8 pour un 3 — donne un SIREN bien formé et faux, qui pointerait vers
 * une AUTRE entreprise. Mieux vaut aucun identifiant qu'un identifiant qui
 * désigne quelqu'un d'autre.
 */
describe('le SIREN du client', () => {
	it('relève un SIREN imprimé', () => {
		const resultat = versFactureImportee(
			documentVenteSchema.parse(doc({ clientSiret: '853 479 236' }))
		);
		expect(resultat.ok).toBe(true);
		if (!resultat.ok) return;
		expect(resultat.facture.debiteurSiren).toBe('853479236');
	});

	it('tire le SIREN d’un SIRET imprimé', () => {
		const resultat = versFactureImportee(
			documentVenteSchema.parse(doc({ clientSiret: '853 479 236 00017' }))
		);
		expect(resultat.ok).toBe(true);
		if (!resultat.ok) return;
		expect(resultat.facture.debiteurSiren).toBe('853479236');
	});

	it('laisse le champ vide quand rien n’est imprimé', () => {
		const resultat = versFactureImportee(documentVenteSchema.parse(doc({ clientSiret: null })));
		expect(resultat.ok).toBe(true);
		if (!resultat.ok) return;
		expect(resultat.facture.debiteurSiren).toBeUndefined();
	});

	it('écarte un numéro dont la clé ne tombe pas, sans refuser la facture', () => {
		// La facture reste parfaitement exploitable : c'est l'identifiant qui
		// manque, pas la créance. Et un identifiant faux serait pire que rien.
		const resultat = versFactureImportee(
			documentVenteSchema.parse(doc({ clientSiret: '853 479 237' }))
		);
		expect(resultat.ok).toBe(true);
		if (!resultat.ok) return;
		expect(resultat.facture.debiteurSiren).toBeUndefined();
	});

	it('demande le numéro au modèle, et lui interdit de le déduire', () => {
		// Le mot « SIRET » figurait DÉJÀ dans le prompt — pour dire au modèle de ne
		// pas confondre l'en-tête de l'émetteur avec le bloc du client. Chercher le
		// mot ne prouvait donc rien. On cherche l'INSTRUCTION.
		const p = construirePromptVente();
		expect(p).toMatch(/identifiant du client/i);
		expect(p).toMatch(/ne le (calcule|déduis|devine)/i);
	});
});

describe('une facture déposée devient un résultat d’import', () => {
	/**
	 * ⚠️ NEUVIÈME OCCURRENCE DE « DÉCLARÉ, LU, JAMAIS ALIMENTÉ », ET LA PLUS
	 * VISIBLE : c'est une promesse faite à l'écran.
	 *
	 * `import-factures.tsx` propose « Factures en PDF — chaque facture est relue
	 * par le modèle », le mode `FACTURE_DEPOSEE` est enregistré en base et rendu
	 * par les requêtes… et `traiterImport` ne s'en sert jamais. Il décodait le
	 * PDF en texte et le passait au parseur d'export comptable, qui répondait
	 * « Export non reconnu ».
	 *
	 * `documentVenteSchema`, `construirePromptVente` et `versFactureImportee`
	 * existaient, testés, sans un seul appelant en production.
	 *
	 * Cette fonction est le raccord : un document extrait devient un
	 * `ResultatImport`, la forme que tout le reste de la chaîne sait déjà
	 * enregistrer et mettre en bilan.
	 */
	it('rend une facture quand le document est exploitable', () => {
		const resultat = resultatDepuisDocument(doc(), 'facture-du-14.pdf');

		expect(resultat.format).toBe('FACTURE_DEPOSEE');
		expect(resultat.factures).toHaveLength(1);
		expect(resultat.ignorees).toEqual([]);
	});

	it('NOMME le fichier quand il n’est pas exploitable, au lieu de le perdre', () => {
		// ⚠️ « Ce qui n'a pas pu être lu » est la moitié du bilan. Un import qui
		// affiche « 0 facture créée » sans dire quel fichier ni pourquoi est un
		// échec muet — et l'omission porte sur l'argent qu'on ne réclamera pas.
		const resultat = resultatDepuisDocument(
			doc({ invoiceNumber: null }),
			'scan_illisible.pdf'
		);

		expect(resultat.factures).toEqual([]);
		expect(resultat.ignorees).toHaveLength(1);
		expect(resultat.ignorees[0]!.texte).toBe('scan_illisible.pdf');
		expect(resultat.ignorees[0]!.raison).toMatch(/numéro/i);
	});

	it('ne rend jamais de règlement', () => {
		// Une facture déposée ne porte pas les encaissements : les inventer
		// solderait des créances que personne n'a payées.
		expect(resultatDepuisDocument(doc(), 'f.pdf').reglements).toEqual([]);
	});

	it('ne compte rien hors périmètre', () => {
		// La notion vient du FEC, où des lignes de TVA et de trésorerie se mêlent
		// aux ventes. Un document unique n'a rien à écarter.
		expect(resultatDepuisDocument(doc(), 'f.pdf').horsPerimetre).toBe(0);
	});
});
