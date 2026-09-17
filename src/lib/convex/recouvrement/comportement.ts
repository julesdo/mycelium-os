import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import type { QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
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
 * Les dates de règlement RÉELLES d'une facture, croissantes.
 *
 * ⚠️ C'EST LA DERNIÈRE QUI ACQUITTE, PAS LA PREMIÈRE. Une facture réglée en
 * trois fois n'est acquittée qu'au troisième versement : retenir le premier
 * ferait passer un paiement échelonné sur quatre mois pour un paiement à
 * l'heure, et le client qui étale ses règlements — précisément celui qu'on veut
 * voir — deviendrait invisible. Le tri est ici, une fois, pour que les deux
 * lectures prennent le même dernier élément.
 *
 * Une liste vide fait sortir la facture de l'échantillon, plutôt que d'y entrer
 * avec une date inventée.
 */
function datesReelles(reglements: readonly Doc<'reglements'>[]): string[] {
	return reglements
		.map((r) => r.date)
		.filter((d): d is string => typeof d === 'string' && estDateReelle(d))
		.sort();
}

async function dateAcquittement(ctx: QueryCtx, factureId: Id<'facturesVente'>): Promise<string[]> {
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_facture', (q) => q.eq('factureId', factureId))
		.collect();

	return datesReelles(reglements);
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

/**
 * L'habitude et les ruptures, à partir de factures DÉJÀ LUES.
 *
 * ⚠️ UN SEUL CORPS POUR LES DEUX LECTURES, et c'est la raison d'être de cette
 * découpe. La lecture par client et celle par établissement diffèrent seulement
 * par la façon dont les factures arrivent ; recopier la règle des deux côtés la
 * ferait diverger au premier ajustement, et deux habitudes de paiement qui ne
 * disent pas la même chose du même client sont pires qu'une seule approximative.
 *
 * `dates` rend les dates de règlement d'une facture. Par client on les lit à la
 * demande sur `reglements.by_facture` ; par établissement elles sont déjà
 * groupées en mémoire, ce qui évite une lecture d'index par facture.
 */
async function composerComportement(
	factures: readonly Doc<'facturesVente'>[],
	dates: (factureId: Id<'facturesVente'>) => Promise<string[]>,
	aujourdHui: string
) {
	const miennes = factures;

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
		const acquittees = await dates(facture._id);
		const acquitte = acquittees.length === 0 ? null : (acquittees[acquittees.length - 1] ?? null);
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

	return composerComportement(
		factures.filter((f) => f.organizationId === organizationId),
		(factureId) => dateAcquittement(ctx, factureId),
		aujourdHui
	);
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

/**
 * L'HABITUDE DE CHAQUE CLIENT, EN UNE LECTURE.
 *
 * ⚠️ `lire` EXIGE UN `debiteurId`, ET C'EST CE QUI RENDAIT LA RUPTURE
 * INTROUVABLE. Un gérant ne sait pas à l'avance QUEL client vient de changer
 * d'habitude — c'est exactement ce qu'il vient chercher. Avec la seule lecture
 * par client, il fallait ouvrir les fiches une par une pour découvrir celle qui
 * avait quelque chose à dire, donc ne jamais le découvrir.
 *
 * ⚠️ DEUX LECTURES DE TABLE, PAS DEUX PAR CLIENT. Appeler `lire` en boucle
 * coûterait, pour cent clients, cent lectures de `facturesVente.by_debiteur`
 * plus une lecture de `reglements.by_facture` par facture. Les deux index par
 * organisation rendent la même matière en deux passes, et le groupement se fait
 * en mémoire. La règle, elle, ne bouge pas : c'est `composerComportement` des
 * deux côtés.
 *
 * ⚠️ LE CLOISONNEMENT EST DANS L'INDEX ICI, et les règlements sont revérifiés
 * contre les factures retenues : un règlement porte son organisation, mais c'est
 * la facture qui décide à quel client il se rapporte.
 *
 * ⚠️ LECTURE NON BORNÉE, ASSUMÉE ET NOMMÉE. Elle croît avec le nombre de
 * factures de l'établissement, pas avec le temps passé dessus. Le jour où un
 * client dépasse la limite de documents lus par transaction, c'est cette requête
 * qui tombe la première, et il faudra la paginer par client.
 */
export const lireParEtablissement = authedQuery({
	args: { aujourdHui: v.string() },
	returns: v.array(
		v.object({
			debiteurId: v.id('debiteurs'),
			debiteur: v.string(),
			habitude: vLecture.fields.habitude,
			ruptures: vLecture.fields.ruptures
		})
	),
	handler: async (ctx, { aujourdHui }) => {
		const { organizationId } = await getUserOrg(ctx);

		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const reglements = await ctx.db
			.query('reglements')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const parFacture = new Map<Id<'facturesVente'>, Doc<'reglements'>[]>();
		for (const reglement of reglements) {
			const deja = parFacture.get(reglement.factureId);
			if (deja === undefined) parFacture.set(reglement.factureId, [reglement]);
			else deja.push(reglement);
		}

		const parDebiteur = new Map<Id<'debiteurs'>, Doc<'facturesVente'>[]>();
		for (const facture of factures) {
			const deja = parDebiteur.get(facture.debiteurId);
			if (deja === undefined) parDebiteur.set(facture.debiteurId, [facture]);
			else deja.push(facture);
		}

		const dates = (factureId: Id<'facturesVente'>): Promise<string[]> =>
			Promise.resolve(datesReelles(parFacture.get(factureId) ?? []));

		const lectures = [];
		for (const [debiteurId, siennes] of parDebiteur) {
			const debiteur = await ctx.db.get(debiteurId);
			if (debiteur === null || debiteur.organizationId !== organizationId) continue;

			const lecture = await composerComportement(siennes, dates, aujourdHui);
			lectures.push({
				debiteurId,
				debiteur: debiteur.denomination,
				habitude: lecture.habitude,
				ruptures: lecture.ruptures
			});
		}

		// Les clients qui ont le plus à dire d'abord, par écart le plus franc. Un
		// client sans rupture reste dans la liste : son habitude est une
		// information, et l'absence de rupture en est une aussi.
		return lectures.sort(
			(a, b) => (b.ruptures[0]?.ecartJours ?? 0) - (a.ruptures[0]?.ecartJours ?? 0)
		);
	}
});
