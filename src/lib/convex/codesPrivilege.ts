import { v, type Infer } from 'convex/values';
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx
} from './_generated/server';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { authedAction } from './functions';
import { organisationCouranteOuNull } from './lib/auth';
import { formuleSouscrite } from './billing';
import { vAvantagePrivilege } from './admin/tables';
import {
	REFUS_DU_CODE,
	REFUS_SANS_ADMINISTRATEUR,
	REFUS_TROP_D_ESSAIS,
	consequencesDuCode,
	empreinteDuCode,
	etatDuCode,
	libelleDeLAvantage,
	normaliserCode,
	refusPourLEtablissement,
	tenterUnCode,
	type EtablissementPourUnCode
} from '../paiement/codes-privilege';

/**
 * LES CODES PRIVILÈGES, CÔTÉ GÉRANT (27/10/2026). Le Compte porte « Code privilège » :
 * on saisit le code, on voit ce qu'il offre et ce qu'il change, puis on l'active. Deux
 * temps, comme l'App Store et Forest : rien ne se consomme sur une faute de frappe.
 *
 * ⚠️ CHAQUE ESSAI COMPTE, examen compris : cinq par quart d'heure et par établissement
 * (`tenterUnCode`). Un refus est RENDU, jamais levé : une mutation qui lève annule
 * l'essai qu'elle venait de compter. Et un code qui ne sert pas, pour quelque raison que
 * ce soit, reçoit le même refus (`REFUS_DU_CODE`).
 *
 * L'accès à vie ouvre sa formule tout de suite (`resolveEffectivePlan`) et résilie
 * l'abonnement d'avant à son échéance ; la remise se pose chez Paddle sur l'abonnement
 * en cours, ou attend qu'il existe (`paddle.appliquerLaRemisePrivilege`).
 */

const vResultat = v.union(
	v.object({
		ok: v.literal(true),
		avantage: vAvantagePrivilege,
		titre: v.string(),
		consequences: v.array(v.string())
	}),
	v.object({ ok: v.literal(false), raison: v.string() })
);
export type ResultatDuCode = Infer<typeof vResultat>;

/** L'établissement courant, si la personne l'administre. */
async function etablissementAdministre(
	ctx: QueryCtx | MutationCtx,
	userId: string
): Promise<Doc<'organizations'> | null> {
	const orgId = await organisationCouranteOuNull(ctx, userId);
	if (orgId === null) return null;
	const membre = await ctx.db
		.query('organizationMembers')
		.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', userId))
		.unique();
	if (membre?.role !== 'ORG_ADMIN') return null;
	return ctx.db.get(orgId);
}

/** Ce qui compte de l'établissement pour un code, tel qu'il est maintenant. */
function pourUnCode(org: Doc<'organizations'>): EtablissementPourUnCode {
	const statut = org.paddleStatus;
	const formule = formuleSouscrite(org);
	return {
		accesOffert: org.accesOffert !== undefined,
		remiseEnAttente: org.remisePrivilege?.etat === 'EN_ATTENTE',
		abonnement:
			(statut === 'active' || statut === 'trialing') &&
			formule !== null &&
			org.paddleRythme !== undefined
				? {
						statut,
						formule,
						rythme: org.paddleRythme,
						resilie: org.paddleResiliationLe !== undefined
					}
				: null
	};
}

/** Compte un essai d'examen ; rend le refus, ou `null` quand l'examen peut avoir lieu. */
export const _compterUnEssai = internalMutation({
	args: { userId: v.string() },
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, { userId }): Promise<string | null> => {
		const org = await etablissementAdministre(ctx, userId);
		if (org === null) return REFUS_SANS_ADMINISTRATEUR;
		const essai = tenterUnCode(org.essaisDeCodes, Date.now());
		await ctx.db.patch(org._id, { essaisDeCodes: essai.etat });
		return essai.autorise ? null : REFUS_TROP_D_ESSAIS;
	}
});

export const _examiner = internalQuery({
	args: { userId: v.string(), empreinte: v.string() },
	returns: vResultat,
	handler: async (ctx, { userId, empreinte }): Promise<ResultatDuCode> => {
		const org = await etablissementAdministre(ctx, userId);
		if (org === null) return { ok: false, raison: REFUS_SANS_ADMINISTRATEUR };
		const code = await ctx.db
			.query('codesPrivilege')
			.withIndex('by_empreinte', (q) => q.eq('empreinte', empreinte))
			.unique();
		if (code === null || etatDuCode(code, Date.now()) !== 'DISPONIBLE') {
			return { ok: false, raison: REFUS_DU_CODE };
		}
		const etablissement = pourUnCode(org);
		const refus = refusPourLEtablissement(code.avantage, etablissement);
		if (refus !== null) return { ok: false, raison: refus };
		return {
			ok: true,
			avantage: code.avantage,
			titre: libelleDeLAvantage(code.avantage),
			consequences: [...consequencesDuCode(code.avantage, etablissement)]
		};
	}
});

/** Premier temps : ce que le code offre, et ce qu'il changera. Rien n'est consommé. */
export const examinerUnCode = authedAction({
	args: { code: v.string() },
	handler: async (ctx, { code }): Promise<ResultatDuCode> => {
		const refus = await ctx.runMutation(internal.codesPrivilege._compterUnEssai, {
			userId: ctx.user._id
		});
		if (refus !== null) return { ok: false, raison: refus };
		const normal = normaliserCode(code);
		if (normal === null) return { ok: false, raison: REFUS_DU_CODE };
		return ctx.runQuery(internal.codesPrivilege._examiner, {
			userId: ctx.user._id,
			empreinte: await empreinteDuCode(normal)
		});
	}
});

/**
 * Second temps : le code se consomme, en une transaction. Deux personnes qui l'activent
 * à la même seconde ne l'auront pas deux fois : Convex rejoue la seconde, qui le trouve
 * utilisé.
 */
export const _consommer = internalMutation({
	args: { userId: v.string(), empreinte: v.union(v.string(), v.null()) },
	returns: vResultat,
	handler: async (ctx, { userId, empreinte }): Promise<ResultatDuCode> => {
		const org = await etablissementAdministre(ctx, userId);
		if (org === null) return { ok: false, raison: REFUS_SANS_ADMINISTRATEUR };
		const maintenant = Date.now();
		const essai = tenterUnCode(org.essaisDeCodes, maintenant);
		if (!essai.autorise) return { ok: false, raison: REFUS_TROP_D_ESSAIS };

		const code =
			empreinte === null
				? null
				: await ctx.db
						.query('codesPrivilege')
						.withIndex('by_empreinte', (q) => q.eq('empreinte', empreinte))
						.unique();
		const etablissement = pourUnCode(org);
		const refus =
			code === null || etatDuCode(code, maintenant) !== 'DISPONIBLE'
				? REFUS_DU_CODE
				: refusPourLEtablissement(code.avantage, etablissement);
		if (code === null || refus !== null) {
			await ctx.db.patch(org._id, { essaisDeCodes: essai.etat });
			return { ok: false, raison: refus ?? REFUS_DU_CODE };
		}

		await ctx.db.patch(code._id, {
			utiliseLe: maintenant,
			utiliseParOrganisation: org._id,
			utiliseParNom: org.name
		});
		const avantage = code.avantage;
		if (avantage.genre === 'A_VIE') {
			await ctx.db.patch(org._id, {
				essaisDeCodes: undefined,
				accesOffert: { formule: avantage.formule, depuis: maintenant, codeId: code._id }
			});
			if (etablissement.abonnement !== null && !etablissement.abonnement.resilie) {
				await ctx.scheduler.runAfter(0, internal.paddle.resilierPourAccesOffert, {
					organizationId: org._id,
					tentative: 0
				});
			}
		} else {
			await ctx.db.patch(org._id, {
				essaisDeCodes: undefined,
				remisePrivilege: {
					pourcent: avantage.pourcent,
					mois: avantage.mois,
					codeId: code._id,
					etat: 'EN_ATTENTE'
				}
			});
			if (etablissement.abonnement !== null && !etablissement.abonnement.resilie) {
				await ctx.scheduler.runAfter(0, internal.paddle.appliquerLaRemisePrivilege, {
					organizationId: org._id
				});
			}
		}
		return {
			ok: true,
			avantage,
			titre: libelleDeLAvantage(avantage),
			consequences: [...consequencesDuCode(avantage, etablissement)]
		};
	}
});

/** Second temps, côté écran : le code s'active, ou le refus se dit. */
export const utiliserUnCode = authedAction({
	args: { code: v.string() },
	handler: async (ctx, { code }): Promise<ResultatDuCode> => {
		const normal = normaliserCode(code);
		return ctx.runMutation(internal.codesPrivilege._consommer, {
			userId: ctx.user._id,
			empreinte: normal === null ? null : await empreinteDuCode(normal)
		});
	}
});

/**
 * LE PASSAGE QUOTIDIEN : une remise privilège restée en attente alors qu'un abonnement
 * court (Paddle muet le jour de l'activation) se repose. Les autres attendent leur
 * abonnement, que son rappel déclenche (`upsertSubscription`).
 */
export const reprendreLesRemises = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const enAttente = await ctx.db
			.query('organizations')
			.withIndex('by_remise_privilege', (q) => q.eq('remisePrivilege.etat', 'EN_ATTENTE'))
			.take(100);
		for (const org of enAttente) {
			if (org.paddleStatus !== 'active' && org.paddleStatus !== 'trialing') continue;
			await ctx.scheduler.runAfter(0, internal.paddle.appliquerLaRemisePrivilege, {
				organizationId: org._id as Id<'organizations'>
			});
		}
		return null;
	}
});
