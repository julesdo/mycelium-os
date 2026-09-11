import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import type { QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { ecartJours, estDateReelle } from '../../verticales/recouvrement/calendrier';
import {
	habitudeDePaiement,
	lireRupture,
	type PaiementObserve
} from '../../verticales/recouvrement/comportement';

/**
 * LE SCORING COMPORTEMENTAL, BRANCHÉ SUR LA BASE.
 *
 * Toute la règle vit dans `verticales/recouvrement/comportement.ts` — la
 * médiane, la dispersion, le plancher, ce qui compte comme rupture. Ce fichier
 * lit les factures d'un débiteur, en déduit son historique de paiement, et
 * confronte ses impayés à son habitude.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE DÉBITEUR, ET LUI SEUL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une habitude est par construction propre à un client. La calculer sur
 * l'ensemble d'un établissement produirait une moyenne qui ne décrit personne,
 * et masquerait exactement ce que le module existe pour voir : que CE
 * client-là, lui, a changé.
 *
 * Le cloisonnement par `organizationId` est vérifié en plus de l'index par
 * débiteur — c'est la règle du produit, sans exception.
 */

/**
 * La date du dernier règlement d'une facture.
 *
 * ⚠️ LE DERNIER, ET PAS LE PREMIER. Une facture réglée en trois fois n'est
 * acquittée qu'au troisième versement : retenir le premier ferait passer un
 * paiement échelonné sur quatre mois pour un paiement à l'heure, et le client
 * qui étale ses règlements — précisément celui qu'on veut voir — deviendrait
 * invisible.
 *
 * Rend `null` si la facture n'a aucun règlement daté valablement : elle sort
 * alors de l'échantillon plutôt que d'y entrer avec une date inventée.
 */
async function dateAcquittement(
	ctx: QueryCtx,
	factureId: Id<'facturesVente'>
): Promise<string | null> {
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_facture', (q) => q.eq('factureId', factureId))
		.collect();

	const dates = reglements
		.map((r) => r.date)
		.filter((d): d is string => typeof d === 'string' && estDateReelle(d))
		.sort();

	return dates.length === 0 ? null : (dates[dates.length - 1] ?? null);
}

const vLecture = v.object({
	/** L'habitude, quand elle est établie. */
	habitude: v.union(
		v.object({ connue: v.literal(false), raison: v.string() }),
		v.object({
			connue: v.literal(true),
			delaiMedianJours: v.number(),
			echantillon: v.number(),
			dispersionJours: v.number()
		})
	),
	/** Les factures impayées dont le retard sort de l'habitude. */
	ruptures: v.array(
		v.object({
			reference: v.string(),
			habituelJours: v.number(),
			ecartJours: v.number(),
			constat: v.string()
		})
	)
});

async function lireComportement(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	aujourdHui: string
) {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();

	const miennes = factures.filter((f) => f.organizationId === organizationId);

	// ── L'HISTORIQUE : ce qui a été payé, et quand ──────────────────────────
	const observes: PaiementObserve[] = [];
	for (const facture of miennes) {
		if (facture.statutPaiement !== 'SOLDEE') continue;
		// ⚠️ FACULTATIVE AU SCHÉMA, et le compilateur l'a rappelé : un FEC ne
		// porte aucune colonne d'échéance. Une facture sans point de départ ne
		// dit rien sur une habitude — elle sort de l'échantillon plutôt que d'y
		// entrer avec une date inventée.
		const exigibilite = facture.dateExigibilite;
		if (exigibilite === undefined || !estDateReelle(exigibilite)) continue;
		const acquitte = await dateAcquittement(ctx, facture._id);
		if (acquitte === null) continue;
		observes.push({
			reference: facture.reference,
			dateExigibilite: exigibilite,
			datePaiement: acquitte
		});
	}

	const habitude = habitudeDePaiement(observes);

	// ── LE PRÉSENT : ce qui reste dû, et depuis combien de temps ────────────
	//
	// ⚠️ ON NE LIT AUCUNE HORLOGE ICI. `aujourdHui` est un argument, comme la
	// date d'arrêté du décompte, et pour la même raison : c'est ce qui rend le
	// résultat rejouable et testable à n'importe quelle date.
	const ruptures: {
		reference: string;
		habituelJours: number;
		ecartJours: number;
		constat: string;
	}[] = [];

	for (const facture of miennes) {
		if (facture.statutPaiement === 'SOLDEE') continue;
		// ⚠️ FACULTATIVE AU SCHÉMA, et le compilateur l'a rappelé : un FEC ne
		// porte aucune colonne d'échéance. Une facture sans point de départ ne
		// dit rien sur une habitude — elle sort de l'échantillon plutôt que d'y
		// entrer avec une date inventée.
		const exigibilite = facture.dateExigibilite;
		if (exigibilite === undefined || !estDateReelle(exigibilite)) continue;

		const retard = ecartJours(exigibilite, aujourdHui);
		// Une facture pas encore exigible n'a rien à dire sur une habitude.
		if (retard <= 0) continue;

		const lecture = lireRupture(habitude, retard);
		if (lecture.etat !== 'RUPTURE') continue;

		ruptures.push({
			reference: facture.reference,
			habituelJours: lecture.habituelJours,
			ecartJours: lecture.ecartJours,
			constat: lecture.constat
		});
	}

	// Les écarts les plus francs d'abord : c'est l'ordre dans lequel un gérant
	// veut les lire, et il ne dépend pas de l'ordre d'insertion en base.
	ruptures.sort((a, b) => b.ecartJours - a.ecartJours);

	return { habitude, ruptures };
}

/** Sans authentification — pour les tests. */
export const lireInterne = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		aujourdHui: v.string()
	},
	returns: vLecture,
	handler: async (ctx, { organizationId, debiteurId, aujourdHui }) =>
		lireComportement(ctx, organizationId, debiteurId, aujourdHui)
});

export const lire = authedQuery({
	args: { debiteurId: v.id('debiteurs'), aujourdHui: v.string() },
	returns: vLecture,
	handler: async (ctx, { debiteurId, aujourdHui }) => {
		const { organizationId } = await getUserOrg(ctx);
		return lireComportement(ctx, organizationId, debiteurId, aujourdHui);
	}
});
