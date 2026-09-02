import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { normaliserFournisseur } from '../../socle/normalisation';

/**
 * L'enregistrement d'un import de factures de vente.
 *
 * Il reçoit ce que `verticales/recouvrement/import/*` a su lire — d'un export
 * comptable ou d'un dépôt de fichiers, peu importe : les deux chemins
 * convergent ici, sur la même forme.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TROIS FAÇONS DONT UN IMPORT PEUT MENTIR, ET CE QUI LES EMPÊCHE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 1. **EN DOUBLONNANT.** Un gérant redépose son export « pour être sûr ». Si la
 *    facture entre deux fois, la créance double et le total reste plausible :
 *    ni négatif, ni aberrant, juste faux. C'est le défaut le plus grave d'un
 *    import, et c'est exactement celui que le dédoublonnage d'EGalim existe
 *    pour empêcher. Ici, la paire (organisation, référence) suffit : un
 *    créancier ne réutilise pas son propre numéro de facture.
 *
 * 2. **EN PERDANT UN RÈGLEMENT.** Un règlement dont la facture est inconnue
 *    n'est pas jeté : il est COMPTÉ. Il signale soit un import partiel, soit
 *    une facture antérieure au périmètre — deux choses qu'il faut voir. Le
 *    silence ferait apparaître une créance plus élevée qu'elle n'est.
 *
 * 3. **EN DEVINANT L'EXIGIBILITÉ.** Elle n'est pas toujours la date
 *    d'échéance. On la déduit quand on n'a rien de mieux — un champ vide qu'on
 *    aurait pu remplir est un défaut — mais on MARQUE la déduction, pour que le
 *    gérant sache ce qu'il confirme.
 *
 * RIEN N'EST PRÉSUMÉ DU DÉBITEUR. Sa qualité de commerçant et sa santé
 * financière naissent à `unknown` / `INCONNUE`. Ne rien savoir n'est pas la
 * même chose que savoir que tout va bien, et c'est cette confusion qui ferait
 * engager des frais sur un débiteur déjà radié.
 */

const vFactureImportee = v.object({
	reference: v.string(),
	debiteur: v.string(),
	debiteurCompte: v.optional(v.string()),
	montantTTC: v.int64(),
	dateEmission: v.string(),
	dateEcheance: v.optional(v.string())
});

const vReglementImporte = v.object({
	reference: v.string(),
	date: v.string(),
	montant: v.int64()
});

/**
 * Retrouve un débiteur, ou le crée.
 *
 * Le rapprochement passe par le nom NORMALISÉ — le même `normaliserFournisseur`
 * que le socle applique aux fournisseurs d'EGalim, qui retire les formes
 * juridiques et les points d'acronyme. « Fournitures Durand », « FOURNITURES
 * DURAND SARL » et « Fournitures Durand S.A.R.L. » sont la même maison, et les
 * traiter comme trois débiteurs éclaterait la créance en trois dossiers dont
 * aucun n'atteindrait le seuil.
 */
async function trouverOuCreerDebiteur(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	denomination: string
): Promise<{ id: Id<'debiteurs'>; cree: boolean }> {
	const normalise = normaliserFournisseur(denomination);

	const existant = await ctx.db
		.query('debiteurs')
		.withIndex('by_org_and_denomination', (q) =>
			q.eq('organizationId', organizationId).eq('denominationNormalisee', normalise)
		)
		.first();

	if (existant !== null) {
		// On conserve chaque graphie rencontrée : c'est ce qui permettra plus
		// tard d'expliquer POURQUOI deux lignes ont été rapprochées.
		if (!existant.denominationsBrutes.includes(denomination)) {
			await ctx.db.patch(existant._id, {
				denominationsBrutes: [...existant.denominationsBrutes, denomination]
			});
		}
		return { id: existant._id, cree: false };
	}

	const id = await ctx.db.insert('debiteurs', {
		organizationId,
		// Le nom lisible est la graphie d'origine ; la forme normalisée ne sert
		// qu'à rapprocher.
		denomination,
		denominationNormalisee: normalise,
		denominationsBrutes: [denomination],
		estCommercant: 'unknown',
		santeFinanciere: 'INCONNUE',
		creeLe: Date.now()
	});
	return { id, cree: true };
}

/** Le statut d'une facture au vu de ce qui a été réglé. */
function statutDe(
	montantTTC: bigint,
	regle: bigint
): 'IMPAYEE' | 'PARTIELLEMENT_PAYEE' | 'SOLDEE' {
	if (regle <= 0n) return 'IMPAYEE';
	return regle >= montantTTC ? 'SOLDEE' : 'PARTIELLEMENT_PAYEE';
}

/** La facture portant cette référence dans cette organisation, ou `null`. */
async function factureParReference(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	reference: string
) {
	return await ctx.db
		.query('facturesVente')
		.withIndex('by_org_and_reference', (q) =>
			q.eq('organizationId', organizationId).eq('reference', reference)
		)
		.first();
}

export const enregistrerImport = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		factures: v.array(vFactureImportee),
		reglements: v.array(vReglementImporte)
	},
	returns: v.object({
		debiteursCrees: v.number(),
		facturesCreees: v.number(),
		facturesDejaConnues: v.number(),
		reglementsCrees: v.number(),
		reglementsOrphelins: v.number()
	}),
	handler: async (ctx, { organizationId, factures, reglements }) => {
		let debiteursCrees = 0;
		let facturesCreees = 0;
		let facturesDejaConnues = 0;

		/** Les factures touchées par ce lot, pour ne pas les relire ensuite. */
		const touchees = new Map<string, { id: Id<'facturesVente'>; montantTTC: bigint }>();

		for (const facture of factures) {
			const deja = await factureParReference(ctx, organizationId, facture.reference);

			if (deja !== null) {
				facturesDejaConnues++;
				touchees.set(facture.reference, { id: deja._id, montantTTC: deja.montantTTC });
				continue;
			}

			const debiteur = await trouverOuCreerDebiteur(ctx, organizationId, facture.debiteur);
			if (debiteur.cree) debiteursCrees++;

			const id = await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId: debiteur.id,
				reference: facture.reference,
				// Le HT n'est pas connu de toutes les sources : un FEC ne donne que
				// ce que le client doit. On ne le déduit pas d'un taux de TVA
				// supposé — ce serait inventer une ventilation.
				montantHT: 0n,
				montantTTC: facture.montantTTC,
				dateEmission: facture.dateEmission,
				dateEcheance: facture.dateEcheance,
				// Déduite de l'échéance faute de mieux, et marquée comme telle.
				dateExigibilite: facture.dateEcheance,
				exigibiliteDeduite: facture.dateEcheance !== undefined,
				statutPaiement: 'IMPAYEE',
				creeLe: Date.now()
			});

			facturesCreees++;
			touchees.set(facture.reference, { id, montantTTC: facture.montantTTC });
		}

		let reglementsCrees = 0;
		let reglementsOrphelins = 0;

		for (const reglement of reglements) {
			let cible = touchees.get(reglement.reference);

			if (cible === undefined) {
				const trouvee = await factureParReference(ctx, organizationId, reglement.reference);
				if (trouvee !== null) {
					cible = { id: trouvee._id, montantTTC: trouvee.montantTTC };
					touchees.set(reglement.reference, cible);
				}
			}

			if (cible === undefined) {
				reglementsOrphelins++;
				continue;
			}

			// Un même règlement redéposé ne doit pas éteindre deux fois la dette.
			// La comparaison se fait en mémoire sur les règlements de CETTE
			// facture — quelques lignes, jamais un balayage de table.
			const existants = await ctx.db
				.query('reglements')
				.withIndex('by_facture', (q) => q.eq('factureId', cible.id))
				.collect();

			const dejaEnregistre = existants.some(
				(r) => r.date === reglement.date && r.montant === reglement.montant
			);
			if (dejaEnregistre) continue;

			await ctx.db.insert('reglements', {
				organizationId,
				factureId: cible.id,
				date: reglement.date,
				montant: reglement.montant,
				nature: 'PAIEMENT',
				creeLe: Date.now()
			});
			reglementsCrees++;
		}

		// Le statut se recalcule depuis TOUS les règlements de la facture, pas
		// seulement ceux de ce lot : un import partiel ne doit pas faire
		// réapparaître une facture soldée comme impayée.
		for (const { id, montantTTC } of touchees.values()) {
			const tous = await ctx.db
				.query('reglements')
				.withIndex('by_facture', (q) => q.eq('factureId', id))
				.collect();

			const regle = tous.reduce((somme, r) => somme + r.montant, 0n);
			await ctx.db.patch(id, { statutPaiement: statutDe(montantTTC, regle) });
		}

		return {
			debiteursCrees,
			facturesCreees,
			facturesDejaConnues,
			reglementsCrees,
			reglementsOrphelins
		};
	}
});
