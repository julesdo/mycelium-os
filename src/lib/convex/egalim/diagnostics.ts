import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from '../functions';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { getUserOrg } from '../lib/auth';
import { REFERENTIEL_VERSION, SEUILS } from '../../egalim/referentiel';
import { FAMILLES, type Famille } from '../../egalim/types';
import { calculerRatios, type LignePourAgregation } from './agregation';
import { vFamille, vLabel } from './tables';

/**
 * Le diagnostic : la mesure, figée.
 *
 * Les ratios sont STOCKÉS CALCULÉS, jamais recalculés à la lecture. Un
 * arbitrage postérieur, une correction de barème ou un nouveau dépôt ne
 * doivent pas altérer un rapport déjà remis. Une nouvelle mesure produit un
 * NOUVEAU diagnostic daté.
 *
 * Rien ici ne promet quoi que ce soit : on mesure, et la déclaration reste
 * signée par la cantine.
 */

const vRatios = v.object({
	durable: v.number(),
	bio: v.number(),
	meatFishDurable: v.number(),
	totalFoodHT: v.number(),
	totalHT: v.number()
});

const vParFamille = v.object({
	family: vFamille,
	totalHT: v.number(),
	durableHT: v.number(),
	bioHT: v.number()
});

const vParFournisseur = v.object({
	supplierName: v.string(),
	totalHT: v.number(),
	durableHT: v.number(),
	bioHT: v.number()
});

const vEcarts = v.object({
	toDurable50: v.number(),
	toBio20: v.number(),
	toMeatFish60: v.number()
});

const FOURNISSEUR_INCONNU = 'Fournisseur non identifié';

/**
 * Produit le diagnostic d'un lot et le fige.
 *
 * Les lignes NON CLASSÉES sont écartées du calcul, jamais comptées comme non
 * qualifiantes : une ligne muettement rangée du côté du non-durable fausse le
 * ratio vers le bas sans qu'aucun test ne le voie. Leur montant est renvoyé à
 * part, pour que le rapport puisse dire ce qu'il n'a pas pu mesurer.
 */
async function produire(
	ctx: MutationCtx,
	batchId: Id<'invoiceBatches'>
): Promise<Id<'diagnostics'>> {
	const batch = await ctx.db.get(batchId);
	if (!batch) {
		throw new ConvexError('Lot introuvable');
	}
	const organizationId = batch.organizationId;
	if (batch.labelsPendingReview > 0) {
		throw new ConvexError(
			`${batch.labelsPendingReview} libellé(s) attendent encore un arbitrage. Le diagnostic serait incomplet.`
		);
	}

	const lignes = await ctx.db
		.query('invoiceLines')
		.withIndex('by_batch', (q) => q.eq('batchId', batchId))
		.collect();

	const classees = lignes.filter(
		(
			l
		): l is (typeof lignes)[number] & {
			isFood: boolean;
			family: Famille;
			isDurable: boolean;
			isBio: boolean;
		} =>
			l.isFood !== undefined &&
			l.family !== undefined &&
			l.isDurable !== undefined &&
			l.isBio !== undefined
	);

	const pourAgregation: LignePourAgregation[] = classees.map((l) => ({
		amountHT: l.amountHT,
		isFood: l.isFood,
		family: l.family,
		isDurable: l.isDurable,
		isBio: l.isBio
	}));

	const ratios = calculerRatios(pourAgregation);

	// Par famille
	const parFamille = FAMILLES.map((family) => {
		const duGroupe = classees.filter((l) => l.isFood && l.family === family);
		return {
			family,
			totalHT: duGroupe.reduce((s, l) => s + l.amountHT, 0),
			durableHT: duGroupe.filter((l) => l.isDurable).reduce((s, l) => s + l.amountHT, 0),
			bioHT: duGroupe.filter((l) => l.isBio).reduce((s, l) => s + l.amountHT, 0)
		};
	}).filter((f) => f.totalHT !== 0);

	// Par fournisseur
	const nomsFournisseurs = new Map<string, string>();
	const parFournisseurBrut = new Map<
		string,
		{ totalHT: number; durableHT: number; bioHT: number }
	>();
	for (const l of classees) {
		if (!l.isFood) continue;
		let nom = FOURNISSEUR_INCONNU;
		if (l.supplierId) {
			const memo = nomsFournisseurs.get(l.supplierId);
			if (memo !== undefined) {
				nom = memo;
			} else {
				const f = await ctx.db.get(l.supplierId);
				nom = f?.name ?? FOURNISSEUR_INCONNU;
				nomsFournisseurs.set(l.supplierId, nom);
			}
		}
		const acc = parFournisseurBrut.get(nom) ?? { totalHT: 0, durableHT: 0, bioHT: 0 };
		acc.totalHT += l.amountHT;
		if (l.isDurable) acc.durableHT += l.amountHT;
		if (l.isBio) acc.bioHT += l.amountHT;
		parFournisseurBrut.set(nom, acc);
	}

	const bySupplier = [...parFournisseurBrut.entries()]
		.map(([supplierName, v2]) => ({ supplierName, ...v2 }))
		.sort((a, b) => b.totalHT - a.totalHT);

	const diagnosticId = await ctx.db.insert('diagnostics', {
		organizationId,
		batchId,
		periodStart: batch.periodStart,
		periodEnd: batch.periodEnd,
		computedAt: Date.now(),
		classifierVersion: REFERENTIEL_VERSION,
		ratios: {
			durable: ratios.durable,
			bio: ratios.bio,
			meatFishDurable: ratios.meatFishDurable,
			totalFoodHT: ratios.totalFoodHT,
			totalHT: ratios.totalHT
		},
		byFamily: parFamille,
		bySupplier,
		gapEuros: ratios.gapEuros,
		status: 'DRAFT'
	});

	await creerDemandesAttestation(ctx, organizationId, batchId, diagnosticId);
	await ctx.db.patch(batchId, { status: 'READY' });

	return diagnosticId;
}

/**
 * Produit le diagnostic si le lot est prêt et n'en a pas encore.
 *
 * Appelée à la clôture de la classification et après chaque arbitrage : ce
 * sont les deux seuls moments où le dernier libellé peut basculer. Le
 * garde-fou « un diagnostic existe déjà » rend l'appel sûr à répéter, alors
 * qu'une relance DÉLIBÉRÉE par `produireDiagnostic` en crée bien un nouveau,
 * daté — une nouvelle mesure ne réécrit jamais l'ancienne.
 */
export const produireSiPret = internalMutation({
	args: { batchId: v.id('invoiceBatches') },
	returns: v.union(v.id('diagnostics'), v.null()),
	handler: async (ctx, { batchId }) => {
		const batch = await ctx.db.get(batchId);
		if (!batch || batch.labelsPendingReview > 0) return null;

		const existant = await ctx.db
			.query('diagnostics')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.first();
		if (existant) return existant._id;

		return await produire(ctx, batchId);
	}
});

/** Relance délibérée : produit un NOUVEAU diagnostic daté, sans toucher aux précédents. */
export const produireDiagnostic = authedMutation({
	args: { batchId: v.id('invoiceBatches') },
	returns: v.id('diagnostics'),
	handler: async (ctx, { batchId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const batch = await ctx.db.get(batchId);
		if (!batch || batch.organizationId !== organizationId) {
			throw new ConvexError('Lot introuvable');
		}
		return await produire(ctx, batchId);
	}
});

/**
 * Les courriers de demande de justificatif, un par fournisseur.
 *
 * Les lignes `TO_JUSTIFY` portent un label revendiqué sur la facture mais non
 * prouvé. Réclamer les certificats rapporte des points de ratio sans changer
 * un seul achat : c'est ce qui rend le diagnostic rentable dès sa remise, et
 * ça ne doit donc pas se réduire à une ligne dans le rapport.
 */
async function creerDemandesAttestation(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	batchId: Id<'invoiceBatches'>,
	diagnosticId: Id<'diagnostics'>
): Promise<void> {
	const lignes = await ctx.db
		.query('invoiceLines')
		.withIndex('by_batch', (q) => q.eq('batchId', batchId))
		.collect();

	const parFournisseur = new Map<
		Id<'suppliers'>,
		{ lineIds: Id<'invoiceLines'>[]; montant: number }
	>();

	for (const l of lignes) {
		if (l.proofStatus !== 'TO_JUSTIFY' || !l.supplierId) continue;
		const acc = parFournisseur.get(l.supplierId) ?? { lineIds: [], montant: 0 };
		acc.lineIds.push(l._id);
		acc.montant += l.amountHT;
		parFournisseur.set(l.supplierId, acc);
	}

	for (const [supplierId, { lineIds, montant }] of parFournisseur) {
		await ctx.db.insert('attestationRequests', {
			organizationId,
			supplierId,
			diagnosticId,
			lineIds,
			amountAtStake: montant,
			status: 'DRAFT'
		});
	}
}

/**
 * Le rapport complet, tel qu'il a été figé, plus ce qu'on peut en dériver
 * sans le modifier : où basculer, et les courriers à envoyer.
 */
export const obtenirDiagnostic = authedQuery({
	args: { diagnosticId: v.id('diagnostics') },
	returns: v.union(
		v.object({
			periodStart: v.string(),
			periodEnd: v.string(),
			computedAt: v.number(),
			classifierVersion: v.string(),
			organizationName: v.string(),
			status: v.union(v.literal('DRAFT'), v.literal('DELIVERED')),
			ratios: vRatios,
			seuils: v.object({
				durable: v.number(),
				bio: v.number(),
				viandePoissonDurable: v.number()
			}),
			byFamily: v.array(vParFamille),
			bySupplier: v.array(vParFournisseur),
			gapEuros: vEcarts,
			/**
			 * Là où il reste le plus d'achats alimentaires non durables, donc le
			 * plus de marge de manœuvre. Trié par montant basculable décroissant.
			 */
			ouBasculer: v.array(
				v.object({
					family: vFamille,
					montantNonDurableHT: v.number(),
					pointsSiTotalementBascule: v.number()
				})
			),
			attestations: v.array(
				v.object({
					attestationId: v.id('attestationRequests'),
					supplierName: v.string(),
					amountAtStake: v.number(),
					pointsRecuperables: v.number(),
					produits: v.array(v.string()),
					status: v.union(
						v.literal('DRAFT'),
						v.literal('SENT'),
						v.literal('RECEIVED'),
						v.literal('REFUSED')
					)
				})
			),
			/** Montant des lignes que la mesure n'a pas pu classer. */
			montantNonMesureHT: v.number()
		}),
		v.null()
	),
	handler: async (ctx, { diagnosticId }) => {
		const { organizationId, org } = await getUserOrg(ctx);
		const d = await ctx.db.get(diagnosticId);
		if (!d || d.organizationId !== organizationId) return null;

		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch', (q) => q.eq('batchId', d.batchId))
			.collect();

		const montantNonMesureHT = lignes
			.filter((l) => l.isFood === undefined)
			.reduce((s, l) => s + l.amountHT, 0);

		const base = d.ratios.totalFoodHT;
		const ouBasculer = d.byFamily
			.map((f) => {
				const nonDurable = f.totalHT - f.durableHT;
				return {
					family: f.family,
					montantNonDurableHT: nonDurable,
					pointsSiTotalementBascule: base > 0 ? (nonDurable / base) * 100 : 0
				};
			})
			.filter((f) => f.montantNonDurableHT > 0)
			.sort((a, b) => b.montantNonDurableHT - a.montantNonDurableHT);

		const demandes = await ctx.db
			.query('attestationRequests')
			.withIndex('by_diagnostic', (q) => q.eq('diagnosticId', diagnosticId))
			.collect();

		const attestations = [];
		for (const demande of demandes) {
			const fournisseur = await ctx.db.get(demande.supplierId);
			const produits = [
				...new Set(
					demande.lineIds
						.map((id) => lignes.find((l) => l._id === id)?.rawLabel)
						.filter((x): x is string => x !== undefined)
				)
			].slice(0, 30);

			attestations.push({
				attestationId: demande._id,
				supplierName: fournisseur?.name ?? FOURNISSEUR_INCONNU,
				amountAtStake: demande.amountAtStake,
				pointsRecuperables: base > 0 ? (demande.amountAtStake / base) * 100 : 0,
				produits,
				status: demande.status
			});
		}
		attestations.sort((a, b) => b.amountAtStake - a.amountAtStake);

		return {
			periodStart: d.periodStart,
			periodEnd: d.periodEnd,
			computedAt: d.computedAt,
			classifierVersion: d.classifierVersion,
			organizationName: org.name,
			status: d.status,
			ratios: d.ratios,
			seuils: SEUILS,
			byFamily: d.byFamily,
			bySupplier: d.bySupplier,
			gapEuros: d.gapEuros,
			ouBasculer,
			attestations,
			montantNonMesureHT
		};
	}
});

/**
 * Les lignes d'un libellé, telles que le diagnostic les a comptées. Sert à la
 * traçabilité : d'un chiffre du rapport, on doit pouvoir descendre jusqu'au
 * libellé source et à sa justification.
 */
export const listerLignesDuDiagnostic = authedQuery({
	args: { diagnosticId: v.id('diagnostics'), family: v.optional(vFamille) },
	returns: v.array(
		v.object({
			rawLabel: v.string(),
			amountHT: v.number(),
			family: v.optional(vFamille),
			qualifyingLabels: v.optional(v.array(vLabel)),
			justification: v.optional(v.string()),
			invoiceDate: v.string()
		})
	),
	handler: async (ctx, { diagnosticId, family }) => {
		const { organizationId } = await getUserOrg(ctx);
		const d = await ctx.db.get(diagnosticId);
		if (!d || d.organizationId !== organizationId) return [];

		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch', (q) => q.eq('batchId', d.batchId))
			.collect();

		return lignes
			.filter((l) => l.isFood === true && (family === undefined || l.family === family))
			.sort((a, b) => b.amountHT - a.amountHT)
			.map((l) => ({
				rawLabel: l.rawLabel,
				amountHT: l.amountHT,
				family: l.family,
				qualifyingLabels: l.qualifyingLabels,
				justification: l.justification,
				invoiceDate: l.invoiceDate
			}));
	}
});

/**
 * Fige la remise. Un diagnostic remis ne se modifie plus : une nouvelle
 * mesure produit un nouveau diagnostic daté.
 */
export const marquerRemis = authedMutation({
	args: { diagnosticId: v.id('diagnostics') },
	returns: v.null(),
	handler: async (ctx, { diagnosticId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const d = await ctx.db.get(diagnosticId);
		if (!d || d.organizationId !== organizationId) throw new ConvexError('Diagnostic introuvable');
		if (d.status === 'DELIVERED') return null;
		await ctx.db.patch(diagnosticId, { status: 'DELIVERED', deliveredAt: Date.now() });
		return null;
	}
});
