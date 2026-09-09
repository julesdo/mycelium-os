import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { authedMutation, authedQuery } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { depuisCentimes, enCentimes, fraction } from '../../socle/montants';
import { controlerDecompte } from '../../verticales/recouvrement/controle';
import {
	decompterCreance,
	type FacturePourDecompte,
	type PeriodeDeTaux,
	type Reglement
} from '../../verticales/recouvrement/decompte';
import { periodesDeTauxParDefaut } from '../../verticales/recouvrement/pays/france/taux';
import { vConventionJours, vTaux } from './tables';

/**
 * La production d'un décompte, et son gel.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI ON L'ARCHIVE ALORS QU'IL EST REPRODUCTIBLE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le calcul est déterministe : rejoué dans six mois à la même date d'arrêté, il
 * rend le même centime. On pourrait donc ne rien stocker.
 *
 * On stocke quand même, parce que la question n'est pas « combien réclame-t-on
 * aujourd'hui » mais « qu'a-t-on réclamé le jour où on l'a réclamé ». Un
 * règlement enregistré après coup, une facture rattachée plus tard, une
 * correction d'exigibilité : tout cela change le calcul sans changer le passé.
 * Le décompte qui a chiffré un acte doit survivre à l'évolution des données qui
 * l'ont produit.
 *
 * D'où la règle : **rejouer produit un NOUVEAU décompte, daté. Jamais une
 * modification du précédent.** Même discipline que les `diagnostics` d'EGalim.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE TAUX VIENT DU CONTRAT, OU DE LA LOI
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Si la facture porte un taux contractuel, il s'applique sur toute la période.
 * Sinon on tombe sur la série légale française — le taux BCE majoré de dix
 * points, réancré chaque semestre — et la période se découpe d'elle-même.
 *
 * Un semestre absent de la série fait ÉCHOUER le décompte en le nommant. C'est
 * voulu : extrapoler le dernier taux connu produirait un chiffre faux qui a
 * l'air juste, et personne ne s'en apercevrait avant que le débiteur ne refasse
 * le calcul.
 */

async function reglementsDe(
	ctx: MutationCtx,
	factureId: Doc<'facturesVente'>['_id']
): Promise<Reglement[]> {
	const lignes = await ctx.db
		.query('reglements')
		.withIndex('by_facture', (q) => q.eq('factureId', factureId))
		.collect();

	return lignes.map((ligne) => ({
		date: ligne.date,
		montant: depuisCentimes(ligne.montant),
		nature: ligne.nature
	}));
}

/**
 * Les périodes de taux applicables à une facture.
 *
 * Un taux contractuel vaut pour toute la durée : c'est une stipulation, elle ne
 * se réancre pas. À défaut, la série légale, qui change deux fois par an.
 */
function periodesDe(facture: Doc<'facturesVente'>, arreteAu: string): PeriodeDeTaux[] {
	const debut = facture.dateExigibilite!;

	if (facture.tauxContractuel !== undefined) {
		return [
			{
				debut,
				taux: fraction(facture.tauxContractuel.numerateur, facture.tauxContractuel.denominateur)
			}
		];
	}

	return periodesDeTauxParDefaut(debut, arreteAu);
}

export const figerDecompte = internalMutation({
	args: {
		creanceId: v.id('creances'),
		arreteAu: v.string(),
		convention: vConventionJours
	},
	returns: v.id('decomptes'),
	handler: async (ctx, { creanceId, arreteAu, convention }) => {
		const creance = await ctx.db.get(creanceId);
		if (creance === null) throw new ConvexError('Créance introuvable');

		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();

		if (factures.length === 0) {
			throw new ConvexError('Cette créance ne porte aucune facture : il n’y a rien à décompter.');
		}

		const pourDecompte: FacturePourDecompte[] = [];
		for (const facture of factures) {
			if (facture.dateExigibilite === undefined) {
				throw new ConvexError(
					`La facture ${facture.reference} n’a pas de date d’exigibilité. Les intérêts ` +
						'courent à compter de cette date : sans elle, le décompte serait arbitraire. ' +
						'La renseigner avant de décompter.'
				);
			}

			pourDecompte.push({
				reference: facture.reference,
				montantExigible: depuisCentimes(facture.montantTTC),
				dateExigibilite: facture.dateExigibilite,
				reglements: await reglementsDe(ctx, facture._id),
				taux: periodesDe(facture, arreteAu)
			});
		}

		const decompte = decompterCreance(pourDecompte, arreteAu, convention);

		// LES IDENTITES SE FIGENT AVEC LE CHIFFRE. Un decompte part chez un tiers ;
		// regenere plus tard, il doit dire la MEME chose — y compris qui reclamait a
		// qui. Les relire au moment du rendu ferait porter a la piece un nom que le
		// debiteur n'avait pas le jour de l'arrete.
		//
		// Aucun des deux n'est exige : le profil creancier est facultatif, et un
		// decompte reste un decompte. Refuser de le produire pour un en-tete
		// manquant transformerait une gene d'affichage en blocage de calcul.
		const debiteur = await ctx.db.get(creance.debiteurId);
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', creance.organizationId))
			.first();

		return await ctx.db.insert('decomptes', {
			organizationId: creance.organizationId,
			creanceId,
			arreteAu,
			convention,
			principalRestantDu: enCentimes(decompte.principalRestantDu),
			interets: enCentimes(decompte.interets),
			indemniteForfaitaire: enCentimes(decompte.indemniteForfaitaire),
			total: enCentimes(decompte.total),
			lignes: decompte.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: enCentimes(ligne.principalRestantDu),
				interets: enCentimes(ligne.interets),
				indemniteForfaitaire: enCentimes(ligne.indemniteForfaitaire),
				total: enCentimes(ligne.total),
				// Les segments SONT la preuve. Sans eux, le total est un chiffre
				// qu'on demande de croire ; avec eux, il se refait à la main.
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: enCentimes(segment.principal),
					taux: {
						numerateur: segment.taux.numerateur,
						denominateur: segment.taux.denominateur
					},
					baseAnnuelle: segment.baseAnnuelle,
					interets: enCentimes(segment.interets)
				}))
			})),
			creancier:
				profil === null
					? undefined
					: {
							denomination: profil.denomination,
							siren: profil.siren,
							adresse: profil.adresse
						},
			debiteur:
				debiteur === null
					? undefined
					: {
							denomination: debiteur.denomination,
							siren: debiteur.siren,
							adresse: debiteur.adresse
						},
			produitLe: Date.now()
		});
	}
});

/**
 * L'entrée authentifiée.
 *
 * Le TYPE DE RETOUR est annoté à la main : ce handler appelle
 * `internal.recouvrement.decompte.figerDecompte`, une fonction de son propre
 * module, ce qui crée un cycle d'inférence. Sans l'annotation, TypeScript
 * retombe sur `any` et cet `any` remonte dans le type d'`api` tout entier —
 * tous les écrans du produit perdent leur inférence d'un coup. Voir `CLAUDE.md`.
 */
export const produire = authedMutation({
	args: { creanceId: v.id('creances'), convention: vConventionJours },
	returns: v.id('decomptes'),
	handler: async (ctx, { creanceId, convention }): Promise<Id<'decomptes'>> => {
		const { organizationId } = await getUserOrg(ctx);

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Créance introuvable');
		}

		return await ctx.runMutation(internal.recouvrement.decompte.figerDecompte, {
			creanceId,
			// La date d'arrêté est CELLE DU JOUR, et elle est écrite dans le
			// décompte. Laisser l'utilisateur la choisir ouvrirait la porte à un
			// décompte arrêté à une date qui l'arrange.
			arreteAu: new Date().toISOString().slice(0, 10),
			convention
		});
	}
});

/**
 * Le dernier décompte arrêté, celui que l'écran montre — et ce qu'il ne couvre
 * pas.
 *
 * Les précédents ne sont pas supprimés : ils prouvent ce qui était réclamé aux
 * dates où on l'a réclamé. Ils ne sont simplement pas ce qu'on regarde d'abord.
 *
 * ⚠️ LES ABANDONS SONT RENDUS AVEC LE DÉCOMPTE, ET C'EST NOUVEAU.
 * `controlerDecompte` les chiffrait depuis longtemps — et AUCUNE requête ne
 * l'appelait. Un module écrit, testé, et injoignable.
 *
 * C'est la différence entre une pièce et un extrait : un tiers qui reçoit le
 * décompte doit voir ce qui n'y figure PAS, parce qu'une facture laissée de côté
 * ne pourra plus être réclamée au titre de cette procédure.
 *
 * ⚠️ ILS SE RECALCULENT À LA LECTURE, ET C'EST VOULU. Le décompte est figé ; ce
 * qui l'entoure ne l'est pas. Une facture importée APRÈS l'arrêté doit apparaître
 * comme non couverte — c'est même le cas le plus utile, puisqu'il dit au gérant
 * qu'il faut refaire un décompte avant d'agir.
 */
/** L'identite figee, telle que le decompte la porte. Facultative sur les
 * decomptes produits avant le gel. */
const vIdentiteFigee = v.optional(
	v.object({
		denomination: v.string(),
		siren: v.optional(v.string()),
		adresse: v.optional(v.string())
	})
);

const vDernierDecompte = v.object({
	arreteAu: v.string(),
	convention: vConventionJours,
	principalRestantDu: v.int64(),
	interets: v.int64(),
	indemniteForfaitaire: v.int64(),
	total: v.int64(),
	creancier: vIdentiteFigee,
	debiteur: vIdentiteFigee,
	lignes: v.array(
		v.object({
			reference: v.string(),
			principalRestantDu: v.int64(),
			interets: v.int64(),
			indemniteForfaitaire: v.int64(),
			total: v.int64(),
			segments: v.array(
				v.object({
					debut: v.string(),
					fin: v.string(),
					jours: v.number(),
					principal: v.int64(),
					taux: vTaux,
					baseAnnuelle: v.number(),
					interets: v.int64()
				})
			)
		})
	),
	abandons: v.array(
		v.object({
			reference: v.string(),
			/** `null` quand la perte n'est pas chiffrable — un paramètre absent. */
			montantEnJeu: v.union(v.int64(), v.null()),
			explication: v.string()
		})
	)
});

async function composerDernierDecompte(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	creanceId: Id<'creances'>
) {
	const decomptes = await ctx.db
		.query('decomptes')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.order('desc')
		.take(1);

	const dernier = decomptes[0];
	if (dernier === undefined || dernier.organizationId !== organizationId) return null;

	const creance = await ctx.db.get(creanceId);

	// TOUTES les factures du MÊME débiteur — c'est la comparaison avec cette
	// liste qui révèle l'oubli. Celles d'un autre débiteur n'ont rien à faire
	// dans ce décompte : les annoncer « abandonnées » serait un faux positif, et
	// la pièce perdrait sa crédibilité au premier lecteur attentif.
	const facturesConnues =
		creance === null
			? []
			: (
					await ctx.db
						.query('facturesVente')
						.withIndex('by_debiteur', (q) => q.eq('debiteurId', creance.debiteurId))
						.collect()
				)
					.filter((facture) => facture.organizationId === organizationId)
					.map((facture) => ({
						reference: facture.reference,
						montantExigible: depuisCentimes(facture.montantTTC)
					}));

	const controle = controlerDecompte({
		decompte: {
			lignes: dernier.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: depuisCentimes(ligne.principalRestantDu),
				interets: depuisCentimes(ligne.interets),
				indemniteForfaitaire: depuisCentimes(ligne.indemniteForfaitaire),
				total: depuisCentimes(ligne.total),
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: depuisCentimes(segment.principal),
					taux: fraction(segment.taux.numerateur, segment.taux.denominateur),
					baseAnnuelle: segment.baseAnnuelle,
					interets: depuisCentimes(segment.interets)
				}))
			})),
			principalRestantDu: depuisCentimes(dernier.principalRestantDu),
			interets: depuisCentimes(dernier.interets),
			indemniteForfaitaire: depuisCentimes(dernier.indemniteForfaitaire),
			total: depuisCentimes(dernier.total),
			arreteAu: dernier.arreteAu,
			convention: dernier.convention
		},
		facturesConnues
	});

	return {
		arreteAu: dernier.arreteAu,
		convention: dernier.convention,
		principalRestantDu: dernier.principalRestantDu,
		interets: dernier.interets,
		indemniteForfaitaire: dernier.indemniteForfaitaire,
		total: dernier.total,
		creancier: dernier.creancier,
		debiteur: dernier.debiteur,
		lignes: dernier.lignes,
		abandons: controle.abandons.map((abandon) => ({
			reference: abandon.reference,
			montantEnJeu: abandon.montantEnJeu === null ? null : enCentimes(abandon.montantEnJeu),
			explication: abandon.explication
		}))
	};
}

/** Sans authentification — pour les tests et les tâches planifiées. */
export const dernierDecompteInterne = internalQuery({
	args: { organizationId: v.id('organizations'), creanceId: v.id('creances') },
	returns: v.union(v.null(), vDernierDecompte),
	handler: async (ctx, { organizationId, creanceId }) =>
		composerDernierDecompte(ctx, organizationId, creanceId)
});

export const dernierDecompte = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.union(v.null(), vDernierDecompte),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		return composerDernierDecompte(ctx, organizationId, creanceId);
	}
});
