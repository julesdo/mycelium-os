import { v, ConvexError } from 'convex/values';
import type { QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';

/**
 * CLASSER UN DOSSIER — ET LE ROUVRIR (analyse des parcours du 08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ « DÉCLARÉ, LU, JAMAIS ALIMENTÉ » — UNE FOIS DE PLUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page d'un dossier savait dire « Dossier classé. Il peut être rouvert. »,
 * le pilote sautait les dossiers \`CLOSE\`, et RIEN n'écrivait jamais ce statut.
 * Un gérant qui faisait un geste commercial, ou qui n'y croyait plus (une
 * entreprise fermée, une somme qui ne vaut pas le temps qu'elle coûte), gardait
 * ce dossier dans ses listes, ses alertes et son « ce qui vous est dû » pour
 * toujours. Wise (« Close request ») et Stripe (« Mark as uncollectible »)
 * ferment une demande en disant pourquoi.
 *
 * ⚠️ CLASSER N'EFFACE RIEN. Les factures, les courriers partis, l'historique
 * restent ; le motif et la date s'écrivent au journal. Rouvrir rend le dossier
 * tel qu'il était.
 *
 * ⚠️ « IL A PAYÉ » N'EST PAS UN MOTIF. Un règlement se note sur la fiche du
 * client, et c'est lui qui solde les factures : classer un dossier payé sans
 * noter le paiement laisserait des factures « impayées » partout ailleurs.
 */

export const vMotifClassement = v.union(
	v.literal('GESTE_COMMERCIAL'),
	v.literal('IRRECOUVRABLE'),
	v.literal('ERREUR'),
	v.literal('AUTRE')
);

/** Le motif, dit comme le gérant le dirait — au journal et sur la page. */
export const LIBELLE_MOTIF: Readonly<Record<string, string>> = {
	GESTE_COMMERCIAL: 'Geste commercial : vous renoncez à cette somme',
	IRRECOUVRABLE: 'Vous n’y croyez plus',
	ERREUR: 'Facture en erreur ou en double',
	AUTRE: 'Autre raison'
};

/**
 * Les dossiers classés d'un établissement : ce que la surveillance et « ce qui
 * vous est dû » laissent de côté.
 */
export async function dossiersClasses(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>
): Promise<ReadonlySet<string>> {
	const creances = await ctx.db
		.query('creances')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();
	return new Set(creances.filter((c) => c.statut === 'CLOSE').map((c) => c._id as string));
}

export const classer = authedMutation({
	args: {
		creanceId: v.id('creances'),
		motif: vMotifClassement,
		note: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { creanceId, motif, note }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Dossier introuvable');
		}
		if (creance.statut === 'CLOSE') throw new ConvexError('Ce dossier est déjà classé.');
		const precision = note?.trim();
		if (motif === 'AUTRE' && (precision === undefined || precision === '')) {
			throw new ConvexError('Dites en quelques mots pourquoi vous le classez.');
		}

		// Ce qui allait partir ne part pas : une relance programmée, un courrier
		// préparé pas encore validé. Ce qui est parti reste lisible, figé.
		const envois = await ctx.db
			.query('envois')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		for (const envoi of envois) {
			if (envoi.etat !== 'PROGRAMME' && envoi.etat !== 'A_VALIDER') continue;
			if (envoi.envoiProgramme !== undefined) await ctx.scheduler.cancel(envoi.envoiProgramme);
			await ctx.db.patch(envoi._id, { etat: 'ABANDONNE', envoiProgramme: undefined });
		}

		await ctx.db.patch(creanceId, {
			statut: 'CLOSE',
			aDemarrer: undefined,
			classement: {
				motif,
				le: new Date().toISOString().slice(0, 10),
				statutAvant: creance.statut,
				...(precision === undefined || precision === '' ? {} : { note: precision })
			}
		});
		await ctx.db.insert('journal', {
			organizationId,
			cible: creanceId as string,
			cle: 'DOSSIER_CLASSE',
			apres:
				precision === undefined || precision === ''
					? (LIBELLE_MOTIF[motif] ?? motif)
					: `${LIBELLE_MOTIF[motif] ?? motif}. ${precision}`,
			source: 'Votre décision',
			auteur: 'GERANT',
			auteurUserId: user._id,
			consigneLe: Date.now()
		});
		return null;
	}
});

export const rouvrir = authedMutation({
	args: { creanceId: v.id('creances') },
	returns: v.null(),
	handler: async (ctx, { creanceId }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Dossier introuvable');
		}
		if (creance.statut !== 'CLOSE') throw new ConvexError('Ce dossier n’est pas classé.');
		await ctx.db.patch(creanceId, {
			statut: creance.classement?.statutAvant ?? 'QUALIFIEE',
			classement: undefined
		});
		await ctx.db.insert('journal', {
			organizationId,
			cible: creanceId as string,
			cle: 'DOSSIER_ROUVERT',
			source: 'Votre décision',
			auteur: 'GERANT',
			auteurUserId: user._id,
			consigneLe: Date.now()
		});
		return null;
	}
});
