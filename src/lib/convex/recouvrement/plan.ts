import { v } from 'convex/values';
import type { QueryCtx } from '../_generated/server';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import type { Doc, Id } from '../_generated/dataModel';
import {
	prochaineEtape,
	suiteDuPlan,
	type EtapeFaite,
	type ProchaineEtape
} from '../../verticales/recouvrement/plan-relance';

/**
 * LE PLAN D'UN DOSSIER, LU DANS LA BASE — où il en est, et ce qui vient.
 *
 * La règle vit dans `verticales/recouvrement/plan-relance.ts` ; ce fichier ne
 * fait que relire ce qui a été fait (les courriers, la remise au conseil) et la
 * date d'où part le plan (la plus ancienne échéance qui reste due).
 */

/** Ce qui a été fait sur un dossier, étape par étape, d'après ses traces. */
export function etapesFaites(
	envois: readonly Doc<'envois'>[],
	remises: readonly Doc<'remisesAuConseil'>[]
): EtapeFaite[] {
	const faites: EtapeFaite[] = [];
	for (const envoi of envois) {
		/*
		  ⚠️ UN COURRIER PROGRAMMÉ COMPTE DÉJÀ. Il partira seul dans l'heure ; le
		  compter « à faire » ferait programmer la même étape une seconde fois à la
		  veille suivante.
		*/
		if (envoi.etat !== 'PARTI' && envoi.etat !== 'VALIDE' && envoi.etat !== 'PROGRAMME') continue;
		const le =
			envoi.partiLe ??
			new Date(envoi.partiraLe ?? envoi.valideLe ?? envoi.prepareLe).toISOString().slice(0, 10);
		// Une lettre officielle préparée à la main compte pour son étape : le plan ne
		// repropose pas un rappel courtois à qui l'a déjà reçue.
		const cle =
			envoi.etapePlan ?? (envoi.modele === 'RELANCE_OFFICIELLE' ? 'LETTRE_OFFICIELLE' : null);
		if (cle !== null) faites.push({ cle, le });
	}
	for (const remise of remises) {
		if (remise.remisLe !== undefined) faites.push({ cle: 'CONSEIL', le: remise.remisLe });
	}
	return faites;
}

/**
 * LA DATE D'OÙ PART LE PLAN : la plus ancienne exigibilité d'une facture qui
 * reste due. Sans aucune date connue, il n'y a pas de plan — on ne relance pas
 * une facture dont on ignore l'échéance.
 */
export function ancreDuDossier(factures: readonly Doc<'facturesVente'>[]): string | null {
	const dates = factures
		.filter((f) => f.statutPaiement !== 'SOLDEE')
		.map((f) => f.dateExigibilite ?? f.dateEcheance)
		.filter((d): d is string => d !== undefined)
		.sort();
	return dates[0] ?? null;
}

export interface PlanDuDossier {
	readonly prochaine: ProchaineEtape;
	readonly suite: readonly ProchaineEtape[];
}

/**
 * LE PLAN D'UN DOSSIER, ou `null` quand il n'en a plus : réglé, au tribunal,
 * sans échéance connue, ou au bout du plan.
 */
export async function planDuDossier(
	ctx: QueryCtx,
	creance: Doc<'creances'>,
	factures: readonly Doc<'facturesVente'>[],
	aujourdHui: string,
	envoisLus?: readonly Doc<'envois'>[]
): Promise<PlanDuDossier | null> {
	if (creance.statut === 'CLOSE' || creance.engageeLe !== undefined) return null;
	const ancre = ancreDuDossier(factures);
	if (ancre === null) return null;
	const envois =
		envoisLus ??
		(await ctx.db
			.query('envois')
			.withIndex('by_creance', (q) => q.eq('creanceId', creance._id as Id<'creances'>))
			.collect());
	const remises = await ctx.db
		.query('remisesAuConseil')
		.withIndex('by_creance', (q) => q.eq('creanceId', creance._id as Id<'creances'>))
		.collect();
	const faites = etapesFaites(envois, remises);
	const prochaine = prochaineEtape({ ancre, faites, aujourdHui });
	if (prochaine === null) return null;
	return { prochaine, suite: suiteDuPlan({ ancre, faites, aujourdHui }) };
}

/**
 * LA SUITE DU PLAN D'UN DOSSIER, pour sa page : chaque étape à venir et sa date.
 *
 * ⚠️ UNE PROJECTION, ET L'ÉCRAN LE DIT. Chaque date suppose que la précédente se
 * fait le jour prévu et que rien n'arrive entre-temps ; un paiement l'arrête.
 */
export const suiteDuDossier = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.union(
		v.null(),
		v.array(
			v.object({
				cle: v.string(),
				nom: v.string(),
				le: v.string(),
				automatique: v.boolean(),
				due: v.boolean()
			})
		)
	),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) return null;
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		const plan = await planDuDossier(ctx, creance, factures, new Date().toISOString().slice(0, 10));
		if (plan === null) return null;
		return plan.suite.map((e) => ({
			cle: e.etape.cle,
			nom: e.etape.nom,
			le: e.le,
			automatique: e.etape.automatique,
			due: e.due
		}));
	}
});
