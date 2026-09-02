import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from '../functions';
import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { getUserOrg } from '../lib/auth';
import { REFERENTIEL_VERSION, SEUILS, etatDeSeuil } from '../../verticales/egalim/referentiel';
import { FAMILLES, type Famille } from '../../verticales/egalim/types';
import { calculerRatios, type LignePourAgregation } from '../../verticales/egalim/agregation';
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

	// Le reste à arbitrer se COMPTE, il ne se relit pas dans un champ.
	// `labelsPendingReview` a longtemps été écrit une seule fois puis jamais
	// décrémenté : des lots entièrement confirmés restaient bloqués ici, et le
	// gérant ne pouvait plus produire la mesure qu'il avait fini de préparer.
	// Le champ est maintenant tenu à jour, mais ce garde-là ne lui fait plus
	// confiance — c'est le dernier verrou avant un livrable figé.
	const enAttente = await ctx.db
		.query('invoiceLines')
		.withIndex('by_batch_and_review', (q) =>
			q.eq('batchId', batchId).eq('reviewStatus', 'PENDING_REVIEW')
		)
		.collect();
	const restants = new Set(enAttente.map((l) => l.normalizedLabel)).size;
	if (restants > 0) {
		throw new ConvexError(
			`${restants} produit${restants > 1 ? 's attendent' : ' attend'} encore votre confirmation. Le diagnostic serait incomplet.`
		);
	}

	const lignes = await ctx.db
		.query('invoiceLines')
		.withIndex('by_batch', (q) => q.eq('batchId', batchId))
		.collect();

	// Un lot sans aucune ligne n'a rien mesuré. Produire quand même les ratios
	// donnerait 0 % partout, présenté avec la même autorité qu'une vraie
	// mesure. C'est le pire livrable possible : faux, et crédible.
	if (lignes.length === 0) {
		throw new ConvexError(
			'Aucune ligne extraite sur ce lot : il n’y a rien à mesurer. Vérifiez les fichiers déposés.'
		);
	}

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

	// L'ANNONCE PART EN DIFFÉRÉ, ET C'EST DÉLIBÉRÉ. Un envoi direct ferait
	// dépendre la production du diagnostic de la messagerie : il suffirait
	// qu'`AUTH_EMAIL` soit vide — ce qui est arrivé en production — pour que
	// `requireEnv` lève et annule la transaction entière. Le gérant perdrait son
	// bilan à cause d'un e-mail. Programmée, la panne reste dans l'e-mail.
	await ctx.scheduler.runAfter(0, internal.emails.envoiProduit.envoyerBilanPret, {
		organizationId,
		diagnosticId,
		annee: new Date(batch.periodEnd).getUTCFullYear(),
		lignesLues: classees.length,
		taux: [
			{
				libelle: 'Produits durables',
				valeur: enPourcent(ratios.durable),
				etat: etatDeSeuil(ratios.durable, SEUILS.durable),
				precision: `seuil légal : ${enPourcent(SEUILS.durable)}`
			},
			{
				libelle: 'dont bio',
				valeur: enPourcent(ratios.bio),
				etat: etatDeSeuil(ratios.bio, SEUILS.bio),
				precision: `seuil légal : ${enPourcent(SEUILS.bio)}`
			},
			{
				libelle: 'Viande et poisson',
				valeur: enPourcent(ratios.meatFishDurable),
				etat: etatDeSeuil(ratios.meatFishDurable, SEUILS.viandePoissonDurable),
				precision: `seuil légal : ${enPourcent(SEUILS.viandePoissonDurable)}`
			}
		]
	});

	return diagnosticId;
}

/**
 * Un taux, écrit pour un courriel.
 *
 * L'espace insécable est DÉCLARÉE par son point de code, jamais tapée. Le lint
 * refuse les espaces irrégulières dans le code, et il a raison : une insécable
 * invisible au milieu d'une expression est une coquille que personne ne voit à
 * la relecture. Ici elle est voulue, donc elle s'écrit en toutes lettres.
 *
 * Insécable ordinaire, et pas l'espace fine qu'`Intl` insère : les clients de
 * messagerie la rendent de façon imprévisible, et cette même finesse a déjà
 * cassé des assertions de test sur le PDF.
 */
const INSECABLE = String.fromCharCode(0x00a0);

function enPourcent(part: number): string {
	return `${Math.round(part * 100)}${INSECABLE}%`;
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
		if (!batch) return null;

		const enAttente = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch_and_review', (q) =>
				q.eq('batchId', batchId).eq('reviewStatus', 'PENDING_REVIEW')
			)
			.first();
		if (enAttente) return null;

		// La classification doit être ALLÉE À SON TERME, pas seulement avoir
		// vidé la file d'arbitrage à un instant donné. `labelsPendingReview` à
		// zéro ne dit rien pendant que la classification tourne encore : les
		// libellés des tranches suivantes n'y sont simplement pas encore.
		const job = await ctx.db
			.query('classificationJobs')
			.withIndex('by_batch', (q) => q.eq('batchId', batchId))
			.first();
		if (!job || job.finishedAt === undefined) return null;
		if (batch.status !== 'READY' && batch.status !== 'REVIEW') return null;

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

	const parFournisseur = new Map<Id<'suppliers'>, { lineCount: number; montant: number }>();

	for (const l of lignes) {
		if (l.proofStatus !== 'TO_JUSTIFY' || !l.supplierId) continue;
		const acc = parFournisseur.get(l.supplierId) ?? { lineCount: 0, montant: 0 };
		acc.lineCount += 1;
		acc.montant += l.amountHT;
		parFournisseur.set(l.supplierId, acc);
	}

	for (const [supplierId, { lineCount, montant }] of parFournisseur) {
		await ctx.db.insert('attestationRequests', {
			organizationId,
			supplierId,
			diagnosticId,
			lineCount,
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
			/** Le premier champ qu'un contrôleur vérifie : de quel établissement parle ce document. */
			siret: v.union(v.string(), v.null()),
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

		// Les produits à justifier, groupés par fournisseur, en UNE passe sur les
		// lignes déjà en mémoire. La demande ne porte plus la liste de ses
		// lignes : c'était un tableau non borné dans un document Convex, et un
		// fournisseur dont tout est à justifier sur trois ans faisait échouer
		// l'insertion, donc la production du diagnostic entier.
		const produitsParFournisseur = new Map<string, string[]>();
		for (const l of lignes) {
			if (l.proofStatus !== 'TO_JUSTIFY' || !l.supplierId) continue;
			const liste = produitsParFournisseur.get(l.supplierId) ?? [];
			// Coupe à 30 : au-delà, la liste ne sert plus le courrier.
			if (liste.length < 30 && !liste.includes(l.rawLabel)) liste.push(l.rawLabel);
			produitsParFournisseur.set(l.supplierId, liste);
		}

		const attestations = [];
		for (const demande of demandes) {
			const fournisseur = await ctx.db.get(demande.supplierId);
			const produits = produitsParFournisseur.get(demande.supplierId) ?? [];

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
			siret: org.siret ?? null,
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

/**
 * Les diagnostics produits, du plus récent au plus ancien.
 *
 * Un diagnostic est une preuve datée : celui de mars doit rester retrouvable en
 * juin, et celui de l'an dernier en cas de contrôle. Sans cette liste, un
 * rapport figé n'était accessible que par l'écran du dépôt qui l'a produit,
 * c'est-à-dire en pratique par personne.
 *
 * Borné à 100 : au rythme d'un diagnostic par exercice, cent couvre un siècle.
 * La borne existe pour que la requête ne puisse pas dégénérer, pas parce qu'on
 * s'attend à l'atteindre.
 */
export const listerDiagnostics = authedQuery({
	args: {},
	returns: v.array(
		v.object({
			diagnosticId: v.id('diagnostics'),
			periodStart: v.string(),
			periodEnd: v.string(),
			computedAt: v.number(),
			status: v.union(v.literal('DRAFT'), v.literal('DELIVERED')),
			ratios: vRatios
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const lignes = await ctx.db
			.query('diagnostics')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(100);

		return lignes.map((d) => ({
			diagnosticId: d._id,
			periodStart: d.periodStart,
			periodEnd: d.periodEnd,
			computedAt: d.computedAt,
			status: d.status,
			ratios: d.ratios
		}));
	}
});

/**
 * Peut-on produire un diagnostic, et sinon pourquoi.
 *
 * POURQUOI CETTE REQUÊTE EXISTE. Le bouton « produire » vivait au bas de
 * l'écran des factures, sous une bannière qui n'apparaissait que si un lot
 * était dans le bon état. Un gérant qui venait chercher son rapport ne le
 * trouvait donc pas là où il le cherchait, et quand il ne s'affichait pas,
 * rien ne lui disait ce qui manquait.
 *
 * La question « puis-je éditer mon bilan ? » a une réponse et une seule, et
 * elle appartient à l'écran des diagnostics. Elle vient donc avec son motif :
 * un bouton grisé sans explication est pire qu'un bouton absent.
 */
export const etatProduction = authedQuery({
	args: {},
	returns: v.object({
		/** L'exercice concerné, celui du dépôt le plus récent. */
		annee: v.union(v.string(), v.null()),
		batchId: v.union(v.id('invoiceBatches'), v.null()),
		motif: v.union(
			v.literal('PRET'),
			v.literal('DEJA_PRODUIT'),
			v.literal('A_CONFIRMER'),
			v.literal('EN_TRAITEMENT'),
			v.literal('AUCUNE_FACTURE')
		),
		/** Combien de produits attendent encore, quand c'est ce qui bloque. */
		produitsAConfirmer: v.number(),
		/** Le diagnostic déjà produit pour ce dépôt, s'il existe. */
		diagnosticExistant: v.union(v.id('diagnostics'), v.null())
	}),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const lots = await ctx.db
			.query('invoiceBatches')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const dernier = lots.sort((a, b) => b.createdAt - a.createdAt)[0];
		if (!dernier) {
			return {
				annee: null,
				batchId: null,
				motif: 'AUCUNE_FACTURE' as const,
				produitsAConfirmer: 0,
				diagnosticExistant: null
			};
		}

		const annee = dernier.periodStart.slice(0, 4);

		const existant = await ctx.db
			.query('diagnostics')
			.withIndex('by_batch', (q) => q.eq('batchId', dernier._id))
			.first();

		// Recompté, jamais relu d'un champ : c'est la règle du domaine, et c'est
		// ce compteur mémorisé de travers qui a bloqué la production pendant des
		// semaines sans que rien ne le dise (voir `lot.ts`).
		const enAttente = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch_and_review', (q) =>
				q.eq('batchId', dernier._id).eq('reviewStatus', 'PENDING_REVIEW')
			)
			.collect();
		const produitsAConfirmer = new Set(enAttente.map((l) => l.normalizedLabel)).size;

		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch', (q) => q.eq('batchId', dernier._id))
			.first();

		const motif = !lignes
			? ('AUCUNE_FACTURE' as const)
			: dernier.status === 'DRAFT' ||
				  dernier.status === 'EXTRACTING' ||
				  dernier.status === 'CLASSIFYING'
				? ('EN_TRAITEMENT' as const)
				: produitsAConfirmer > 0
					? ('A_CONFIRMER' as const)
					: existant
						? ('DEJA_PRODUIT' as const)
						: ('PRET' as const);

		return {
			annee,
			batchId: dernier._id,
			motif,
			produitsAConfirmer,
			diagnosticExistant: existant?._id ?? null
		};
	}
});
