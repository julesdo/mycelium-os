import { v } from 'convex/values';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import type { Doc, Id } from '../_generated/dataModel';
import { ZERO, additionner, depuisCentimes, enCentimes, fraction } from '../../socle/montants';
import { controlerDecompte } from '../../verticales/recouvrement/controle';
import { vNatureAbandon } from './decompte';

/**
 * CE QUI SERAIT ABANDONNÉ, SUR TOUT L'ÉTABLISSEMENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE CONTRÔLE EXISTAIT, ET IL FALLAIT SAVOIR OÙ REGARDER POUR LE LIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `controlerDecompte` est le garde-fou le plus important du produit : le titre
 * exécutoire ne porte que sur les sommes chiffrées dans l'acte, et ce qui n'y
 * figure pas est perdu, définitivement. Il ne se lisait que par
 * `decompte.dernierDecompte`, c'est-à-dire créance par créance, après l'avoir
 * ouverte.
 *
 * Un décompte amputé ne ressemble pourtant pas à un décompte cassé : il affiche
 * un total plus petit, parfaitement cohérent avec lui-même. Personne ne s'en
 * aperçoit en le relisant — et personne n'ouvre une créance pour vérifier
 * qu'elle va bien. Cette lecture-ci part de l'établissement : elle dit combien
 * d'argent, au total, ne serait pas couvert si les décomptes déjà arrêtés
 * partaient tels quels.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TROIS CHOIX, ÉCRITS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. **Le DERNIER décompte de chaque créance, et lui seul.** Rejouer produit un
 *    nouveau décompte daté ; les précédents restent en base comme pièces, mais
 *    ce qui serait abandonné aujourd'hui se mesure sur le dernier arrêté.
 *
 * 2. **Les abandons se RECALCULENT à la lecture.** Ils ne sont stockés nulle
 *    part, et c'est voulu : le décompte est figé, ce qui l'entoure ne l'est pas.
 *    Une facture importée APRÈS l'arrêté doit apparaître comme non couverte —
 *    c'est même le cas le plus utile, puisqu'il dit qu'il faut refaire un
 *    décompte avant d'agir.
 *
 * 3. **`parametresRequis` n'est pas passé**, exactement comme au seul autre
 *    appelant. `PARAMETRE_MANQUANT` ne peut donc pas se produire ici, et l'écran
 *    qui lira cette requête doit le DIRE plutôt que laisser croire à un verrou
 *    qui n'existe pas encore.
 */

const vAbandonDeLEtablissement = v.object({
	decompteId: v.id('decomptes'),
	creanceId: v.id('creances'),
	debiteurId: v.union(v.id('debiteurs'), v.null()),
	debiteur: v.string(),
	arreteAu: v.string(),
	nature: vNatureAbandon,
	/** La référence de facture, ou la clé du paramètre. */
	reference: v.string(),
	/** `null` quand la perte n'est pas chiffrable. Elle ne s'additionne alors pas. */
	montantEnJeu: v.union(v.int64(), v.null()),
	explication: v.string()
});

export const abandonsDeLEtablissement = authedQuery({
	args: {},
	returns: v.object({
		abandons: v.array(vAbandonDeLEtablissement),
		/**
		 * La somme des abandons CHIFFRABLES, en centimes.
		 *
		 * ⚠️ LES AUTRES NE S'ADDITIONNENT PAS, et leur compte est rendu à part :
		 * les fondre dans un total ferait passer un abandon qu'on ne sait pas
		 * chiffrer pour un abandon de zéro euro, ce qui est l'inverse de ce qu'il
		 * signifie.
		 */
		montantAbandonne: v.int64(),
		nombreNonChiffrables: v.number(),
		/** Combien de décomptes arrêtés ont été contrôlés, y compris les complets. */
		decomptesControles: v.number(),
		/** Combien d'entre eux portent au moins un abandon. */
		decomptesIncomplets: v.number()
	}),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const decomptes = await ctx.db
			.query('decomptes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		// Le dernier arrêté de chaque créance. `produitLe` tranche, pas l'ordre
		// d'insertion : deux décomptes du même jour restent départagés.
		const dernierParCreance = new Map<Id<'creances'>, Doc<'decomptes'>>();
		for (const decompte of decomptes) {
			const deja = dernierParCreance.get(decompte.creanceId);
			if (deja === undefined || decompte.produitLe > deja.produitLe) {
				dernierParCreance.set(decompte.creanceId, decompte);
			}
		}

		// Toutes les factures de l'établissement, groupées par client : c'est la
		// comparaison avec cette liste qui révèle l'oubli. Une lecture de table,
		// pas une par créance.
		const facturesParDebiteur = new Map<Id<'debiteurs'>, Doc<'facturesVente'>[]>();
		for (const facture of await ctx.db
			.query('facturesVente')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect()) {
			const deja = facturesParDebiteur.get(facture.debiteurId);
			if (deja === undefined) facturesParDebiteur.set(facture.debiteurId, [facture]);
			else deja.push(facture);
		}

		const abandons = [];
		let montantAbandonne = ZERO;
		let nombreNonChiffrables = 0;
		let decomptesControles = 0;
		let decomptesIncomplets = 0;

		for (const [creanceId, decompte] of dernierParCreance) {
			const creance = await ctx.db.get(creanceId);
			// Le cloisonnement est revérifié sur la créance : `decomptes.by_org`
			// garantit le décompte, pas ce qu'il désigne.
			if (creance === null || creance.organizationId !== organizationId) continue;

			const debiteur = await ctx.db.get(creance.debiteurId);
			const sien =
				debiteur !== null && debiteur.organizationId === organizationId ? debiteur : null;

			const controle = controlerDecompte({
				decompte: {
					lignes: decompte.lignes.map((ligne) => ({
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
					principalRestantDu: depuisCentimes(decompte.principalRestantDu),
					interets: depuisCentimes(decompte.interets),
					indemniteForfaitaire: depuisCentimes(decompte.indemniteForfaitaire),
					total: depuisCentimes(decompte.total),
					arreteAu: decompte.arreteAu,
					convention: decompte.convention
				},
				facturesConnues: (facturesParDebiteur.get(creance.debiteurId) ?? []).map((facture) => ({
					reference: facture.reference,
					montantExigible: depuisCentimes(facture.montantTTC)
				}))
			});

			decomptesControles += 1;
			if (controle.abandons.length > 0) decomptesIncomplets += 1;
			montantAbandonne = additionner(montantAbandonne, controle.montantAbandonne);

			for (const abandon of controle.abandons) {
				if (abandon.montantEnJeu === null) nombreNonChiffrables += 1;
				abandons.push({
					decompteId: decompte._id,
					creanceId,
					debiteurId: sien === null ? null : sien._id,
					// La dénomination figée du décompte d'abord : c'est le nom que la
					// pièce porte, et c'est celui qu'on retrouve en la relisant.
					debiteur: decompte.debiteur?.denomination ?? sien?.denomination ?? 'Débiteur inconnu',
					arreteAu: decompte.arreteAu,
					nature: abandon.nature,
					reference: abandon.reference,
					montantEnJeu: abandon.montantEnJeu === null ? null : enCentimes(abandon.montantEnJeu),
					explication: abandon.explication
				});
			}
		}

		// Le plus cher d'abord ; ce qu'on ne sait pas chiffrer ferme la liste plutôt
		// que de se faire ranger comme un abandon de zéro euro.
		abandons.sort((a, b) => {
			if (a.montantEnJeu === null) return b.montantEnJeu === null ? 0 : 1;
			if (b.montantEnJeu === null) return -1;
			return a.montantEnJeu > b.montantEnJeu ? -1 : a.montantEnJeu < b.montantEnJeu ? 1 : 0;
		});

		return {
			abandons,
			montantAbandonne: enCentimes(montantAbandonne),
			nombreNonChiffrables,
			decomptesControles,
			decomptesIncomplets
		};
	}
});
