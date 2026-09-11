/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * L'enregistrement d'un import, et les trois façons dont il pourrait mentir.
 *
 * 1. **En doublonnant.** Un gérant redépose son export « pour être sûr ». Si la
 *    facture entre deux fois, la créance double et le total reste plausible —
 *    exactement le défaut que le dédoublonnage d'EGalim existe pour empêcher.
 *
 * 2. **En perdant un règlement.** Un règlement dont la facture est inconnue ne
 *    doit pas disparaître : il signale soit un import partiel, soit une facture
 *    antérieure au périmètre. Le compter est la seule façon de s'en apercevoir.
 *
 * 3. **En devinant l'exigibilité.** Elle n'est pas toujours la date d'échéance.
 *    On la déduit quand on n'a rien de mieux, mais on MARQUE qu'elle est
 *    déduite, pour que le gérant sache ce qu'il confirme.
 */

const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

async function poserOrganisation(t: ReturnType<typeof convexTest>): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: 'Thumbbb Agency', createdAt: Date.now() })
	);
}

const FACTURE_DURAND = {
	reference: 'FA-2026-0042',
	debiteur: 'Fournitures Durand',
	debiteurCompte: '411DURAND',
	montantTTC: 1_200_000n,
	dateEmission: '2026-04-15',
	dateEcheance: '2026-05-15'
};

describe('enregistrement d’un import', () => {
	it('crée le débiteur et la facture', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const bilan = await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});

		expect(bilan.debiteursCrees).toBe(1);
		expect(bilan.facturesCreees).toBe(1);

		await t.run(async (ctx) => {
			const factures = await ctx.db.query('facturesVente').collect();
			expect(factures).toHaveLength(1);
			expect(factures[0]!.montantTTC).toBe(1_200_000n);
			expect(factures[0]!.statutPaiement).toBe('IMPAYEE');

			const debiteurs = await ctx.db.query('debiteurs').collect();
			expect(debiteurs[0]!.denomination).toBe('Fournitures Durand');
			// Rien n'est su de sa qualité de commerçant : on ne la présume pas.
			expect(debiteurs[0]!.estCommercant).toBe('unknown');
		});
	});

	it('déduit l’exigibilité de l’échéance, et le marque', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.dateExigibilite).toBe('2026-05-15');
			expect(facture.exigibiliteDeduite).toBe(true);
		});
	});

	it('n’invente aucune exigibilité quand l’échéance manque', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [{ ...FACTURE_DURAND, dateEcheance: undefined }],
			reglements: []
		});

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.dateEcheance).toBeUndefined();
			expect(facture.dateExigibilite).toBeUndefined();
		});
	});

	it('ne crée pas deux fois la même facture si l’export est redéposé', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const args = { organizationId, factures: [FACTURE_DURAND], reglements: [] };
		await t.mutation(internal.recouvrement.import.enregistrerImport, args);
		const second = await t.mutation(internal.recouvrement.import.enregistrerImport, args);

		expect(second.facturesCreees).toBe(0);
		expect(second.facturesDejaConnues).toBe(1);

		await t.run(async (ctx) => {
			expect(await ctx.db.query('facturesVente').collect()).toHaveLength(1);
		});
	});

	it('réutilise un débiteur déjà connu au lieu d’en créer un second', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});
		const second = await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [{ ...FACTURE_DURAND, reference: 'FA-2026-0043' }],
			reglements: []
		});

		expect(second.debiteursCrees).toBe(0);
		await t.run(async (ctx) => {
			expect(await ctx.db.query('debiteurs').collect()).toHaveLength(1);
		});
	});
});

describe('règlements', () => {
	it('rattache un règlement et passe la facture en partiellement payée', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [{ reference: 'FA-2026-0042', date: '2026-06-10', montant: 400_000n }]
		});

		await t.run(async (ctx) => {
			const reglements = await ctx.db.query('reglements').collect();
			expect(reglements).toHaveLength(1);
			expect(reglements[0]!.montant).toBe(400_000n);

			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.statutPaiement).toBe('PARTIELLEMENT_PAYEE');
		});
	});

	it('solde la facture quand les règlements l’égalent', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [{ reference: 'FA-2026-0042', date: '2026-06-10', montant: 1_200_000n }]
		});

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.statutPaiement).toBe('SOLDEE');
		});
	});

	it('compte un règlement orphelin au lieu de le perdre', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const bilan = await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [{ reference: 'FA-INCONNUE', date: '2026-06-10', montant: 100_000n }]
		});

		expect(bilan.reglementsOrphelins).toBe(1);
		await t.run(async (ctx) => {
			expect(await ctx.db.query('reglements').collect()).toHaveLength(0);
		});
	});

	it('ne rejoue pas un règlement déjà enregistré', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const args = {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [{ reference: 'FA-2026-0042', date: '2026-06-10', montant: 400_000n }]
		};
		await t.mutation(internal.recouvrement.import.enregistrerImport, args);
		await t.mutation(internal.recouvrement.import.enregistrerImport, args);

		await t.run(async (ctx) => {
			expect(await ctx.db.query('reglements').collect()).toHaveLength(1);
		});
	});
});

describe('cloisonnement entre organisations', () => {
	it('ne réutilise jamais le débiteur ni la facture d’une autre organisation', async () => {
		const t = convexTest(schema, modules);
		const premiere = await poserOrganisation(t);
		const seconde = await t.run(async (ctx) =>
			ctx.db.insert('organizations', { name: 'Autre cantine', createdAt: Date.now() })
		);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId: premiere,
			factures: [FACTURE_DURAND],
			reglements: []
		});
		const bilan = await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId: seconde,
			factures: [FACTURE_DURAND],
			reglements: []
		});

		// Même référence, même débiteur : ce sont pourtant deux dossiers
		// étrangers l'un à l'autre.
		expect(bilan.debiteursCrees).toBe(1);
		expect(bilan.facturesCreees).toBe(1);

		await t.run(async (ctx) => {
			expect(await ctx.db.query('facturesVente').collect()).toHaveLength(2);
			expect(await ctx.db.query('debiteurs').collect()).toHaveLength(2);
		});
	});
});

/**
 * LE SIREN DU DÉBITEUR, PERSISTÉ À L'IMPORT.
 *
 * La colonne existait en base depuis le premier jour, elle était lue à l'écran,
 * et **rien ne l'écrivait jamais**. C'est le blocage qui commande tout le module
 * des registres externes : le radar BODACC et la normalisation Sirene
 * s'interrogent par SIREN.
 *
 * ⚠️ LE RAPPROCHEMENT NE CHANGE PAS DE CLÉ. On continue de retrouver un débiteur
 * par son nom normalisé, et on ENRICHIT sa fiche du SIREN quand une facture en
 * apporte un. Basculer le rapprochement sur le SIREN fusionnerait ou scinderait
 * des débiteurs existants selon la couverture du champ — c'est une décision à
 * prendre sur des données réelles, pas un effet de bord de cette tâche.
 *
 * ⚠️ ET UN SIREN DÉJÀ CONNU NE SE FAIT PAS ÉCRASER. Deux factures portant deux
 * numéros différents pour la même raison sociale ne sont pas une correction :
 * c'est un signal — deux entités, ou un OCR fautif. Le dernier arrivé n'a aucune
 * raison d'avoir raison.
 */
describe('le SIREN du débiteur', () => {
	it('est enregistré quand une facture en apporte un', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [{ ...FACTURE_DURAND, debiteurSiren: '853479236' }],
			reglements: []
		});

		const debiteur = await t.run(async (ctx) => ctx.db.query('debiteurs').first());
		expect(debiteur?.siren).toBe('853479236');
	});

	it('laisse la fiche sans numéro quand aucune facture n’en porte', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});

		const debiteur = await t.run(async (ctx) => ctx.db.query('debiteurs').first());
		expect(debiteur?.siren).toBeUndefined();
	});

	it('enrichit un débiteur déjà créé sans numéro', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});
		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [
				{
					...FACTURE_DURAND,
					reference: 'FA-2026-0043',
					debiteur: 'Fournitures Durand SARL',
					debiteurSiren: '853479236'
				}
			],
			reglements: []
		});

		const debiteurs = await t.run(async (ctx) => ctx.db.query('debiteurs').collect());
		expect(debiteurs).toHaveLength(1);
		expect(debiteurs[0]!.siren).toBe('853479236');
	});

	it('n’écrase pas un numéro déjà connu par un autre', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [{ ...FACTURE_DURAND, debiteurSiren: '853479236' }],
			reglements: []
		});
		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [{ ...FACTURE_DURAND, reference: 'FA-2026-0044', debiteurSiren: '502592959' }],
			reglements: []
		});

		const debiteur = await t.run(async (ctx) => ctx.db.query('debiteurs').first());
		expect(debiteur?.siren).toBe('853479236');
	});
/**
	 * CHAQUE MONTANT REMONTE A SA PIECE.
	 *
	 * ⚠️ LE CHAMP EXISTAIT, AVEC SA RAISON D'ETRE ECRITE A COTE — « le document
	 * source, pour que chaque montant remonte a sa piece » — et RIEN ne
	 * l'ecrivait, rien ne le lisait. Douzieme cas de cette famille dans le depot.
	 *
	 * Ce n'est pas un confort. L'auditabilite est non negociable ici : « tout
	 * montant reclame est decomposable », et « un total qu'on ne peut pas
	 * decomposer est un chiffre qu'on demande de croire ». Un debiteur qui
	 * conteste une ligne fait exactement ce chemin — de la somme vers la piece.
	 * Sans ce lien, la chaine s'arretait a la ligne du tableur.
	 */
	it('rattache chaque facture au fichier dont elle est issue', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		const documentId = await t.run(async (ctx) =>
			ctx.storage.store(new Blob(['reference;montant'], { type: 'text/csv' }))
		);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: [],
			documentId
		});

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.documentId).toBe(documentId);
		});
	});

	it('reste possible sans document source, sans rien inventer', async () => {
		// Une facture peut entrer autrement qu'en deposant un fichier — une
		// saisie, une reprise. Exiger le document rendrait ces chemins
		// impossibles ; fabriquer un identifiant serait pire.
		const t = convexTest(schema, modules);
		const organizationId = await poserOrganisation(t);

		await t.mutation(internal.recouvrement.import.enregistrerImport, {
			organizationId,
			factures: [FACTURE_DURAND],
			reglements: []
		});

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			expect(facture.documentId).toBeUndefined();
		});
	});
});
