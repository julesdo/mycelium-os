import { describe, it, expect } from 'vitest';
import { recouvrementTables } from '../tables';

/**
 * Les invariants du schéma de recouvrement, rendus opposables.
 *
 * Ce ne sont pas des tests de comportement : ce sont des règles d'architecture
 * que `CLAUDE.md` énonce et qu'aucun compilateur ne fait respecter. Une table
 * ajoutée à la va-vite sans `organizationId` ne casse rien le jour même — elle
 * crée une fuite entre clients qui se découvre en production.
 */

/** Le schéma d'une table, tel que `defineTable` le rend. */
interface TableInspectable {
	validator: { fields?: Record<string, unknown> };
	/** Rend un OBJET, pas une chaîne JSON — vérifié sur `convex@1.37`. */
	export: () => { indexes?: Array<{ indexDescriptor: string; fields: string[] }> };
}

function champs(table: unknown): string[] {
	const validateur = (table as TableInspectable).validator;
	return Object.keys(validateur.fields ?? {});
}

function indexes(table: unknown): Array<{ indexDescriptor: string; fields: string[] }> {
	// `export()` est la seule voie publique pour inspecter les index.
	return (table as TableInspectable).export().indexes ?? [];
}

const TABLES = Object.entries(recouvrementTables);

describe('schéma du recouvrement', () => {
	it('déclare les sept tables du modèle de domaine', () => {
		expect(TABLES.map(([nom]) => nom).sort()).toEqual([
			'creances',
			'debiteurs',
			'decomptes',
			'dossiers',
			'facturesVente',
			'pieces',
			'piecesFactures',
			'profilsCreancier',
			'reglements'
		]);
	});

	it.each(TABLES)('« %s » porte organizationId — multi-tenant strict', (_nom, table) => {
		expect(champs(table)).toContain('organizationId');
	});

	it.each(TABLES)('« %s » est indexable par organisation', (_nom, table) => {
		const parOrg = indexes(table).filter((index) => index.fields[0] === 'organizationId');
		// `piecesFactures` et `reglements` sont d'abord interrogées par leur
		// parent, mais gardent un index par organisation pour la purge RGPD.
		expect(parOrg.length).toBeGreaterThanOrEqual(1);
	});

	it('ne stocke aucun montant en flottant', () => {
		// Le cœur du modèle : un `v.number()` sur un champ de montant
		// réintroduirait l'erreur de représentation dès l'écriture en base,
		// avant même le premier calcul.
		const champsMonetaires = [
			['facturesVente', 'montantHT'],
			['facturesVente', 'montantTTC'],
			['reglements', 'montant'],
			['decomptes', 'principalRestantDu'],
			['decomptes', 'interets'],
			['decomptes', 'indemniteForfaitaire'],
			['decomptes', 'total']
		] as const;

		for (const [nomTable, champ] of champsMonetaires) {
			const table = recouvrementTables[nomTable] as unknown as TableInspectable;
			const validateur = table.validator.fields?.[champ] as { kind?: string } | undefined;
			expect(validateur, `${nomTable}.${champ}`).toBeDefined();
			expect(validateur!.kind, `${nomTable}.${champ} doit être un int64`).toBe('int64');
		}
	});

	it('sépare la date d’échéance de la date d’exigibilité', () => {
		// Les confondre décalerait chaque décompte de plusieurs jours
		// d'intérêts, sans que rien ne le signale.
		const facture = champs(recouvrementTables.facturesVente);
		expect(facture).toContain('dateEcheance');
		expect(facture).toContain('dateExigibilite');
	});

	it('ne porte aucun tableau d’identifiants — la leçon d’attestationRequests', () => {
		// Un tableau Convex plafonne à 8 192 entrées, et le dépassement fait
		// échouer l'écriture entière. Le lien facture → créance vit donc sur la
		// facture.
		expect(champs(recouvrementTables.creances)).not.toContain('factureIds');
		expect(champs(recouvrementTables.facturesVente)).toContain('creanceId');
	});
});
