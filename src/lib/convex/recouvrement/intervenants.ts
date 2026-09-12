import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';

/**
 * LE CARNET D'INTERVENANTS.
 *
 * Le gérant dit avec qui il travaille ; le logiciel le retient et le rattache à
 * un dossier quand un acte est fait. Il ne recommande personne, ne classe
 * personne, et n'écrit à personne.
 */

const vRole = v.union(
	v.literal('AVOCAT'),
	v.literal('COMMISSAIRE_DE_JUSTICE'),
	v.literal('AUTRE')
);

const vOrigine = v.union(
	v.literal('SAISI_A_LA_MAIN'),
	v.literal('RETENU_DEPUIS_UN_REPERTOIRE')
);

const vIntervenant = v.object({
	_id: v.id('intervenants'),
	nom: v.string(),
	role: vRole,
	ressort: v.optional(v.string()),
	telephone: v.optional(v.string()),
	courriel: v.optional(v.string()),
	adresse: v.optional(v.string()),
	siren: v.optional(v.string()),
	origine: vOrigine,
	sourceRepertoire: v.optional(v.string()),
	sourceReleveeLe: v.optional(v.string())
});

const argsAjout = {
	nom: v.string(),
	role: vRole,
	ressort: v.optional(v.string()),
	telephone: v.optional(v.string()),
	courriel: v.optional(v.string()),
	adresse: v.optional(v.string()),
	siren: v.optional(v.string()),
	origine: vOrigine,
	sourceRepertoire: v.optional(v.string()),
	sourceReleveeLe: v.optional(v.string())
};

type Ajout = {
	nom: string;
	role: 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';
	ressort?: string;
	telephone?: string;
	courriel?: string;
	adresse?: string;
	siren?: string;
	origine: 'SAISI_A_LA_MAIN' | 'RETENU_DEPUIS_UN_REPERTOIRE';
	sourceRepertoire?: string;
	sourceReleveeLe?: string;
};

/**
 * ⚠️ LA TRAÇABILITÉ EST UNE CONDITION, PAS UN CHAMP FACULTATIF. Une fiche venue
 * d'un répertoire public sans sa source ni sa date devient indiscernable d'une
 * donnée officielle et fraîche. Les deux fichiers utilisés sont des
 * photographies datées : le taire serait un repli silencieux.
 */
async function ajouter(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	fiche: Ajout
): Promise<Id<'intervenants'>> {
	if (
		fiche.origine === 'RETENU_DEPUIS_UN_REPERTOIRE' &&
		(fiche.sourceRepertoire === undefined || fiche.sourceReleveeLe === undefined)
	) {
		throw new ConvexError(
			'Une fiche retenue depuis un répertoire porte sa source et sa date de relevé, sans quoi ' +
				'rien ne la distingue d’une donnée officielle et fraîche.'
		);
	}

	return await ctx.db.insert('intervenants', {
		organizationId,
		...fiche,
		creeLe: Date.now()
	});
}

async function lister(ctx: QueryCtx, organizationId: Id<'organizations'>) {
	const lignes = await ctx.db
		.query('intervenants')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	// Par ordre alphabétique, jamais par « pertinence ». Un ordre de pertinence
	// serait une mise en avant, et une mise en avant est une orientation.
	return lignes
		.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
		.map((l) => ({
			_id: l._id,
			nom: l.nom,
			role: l.role,
			ressort: l.ressort,
			telephone: l.telephone,
			courriel: l.courriel,
			adresse: l.adresse,
			siren: l.siren,
			origine: l.origine,
			sourceRepertoire: l.sourceRepertoire,
			sourceReleveeLe: l.sourceReleveeLe
		}));
}

export const ajouterInterne = internalMutation({
	args: { organizationId: v.id('organizations'), ...argsAjout },
	returns: v.id('intervenants'),
	handler: async (ctx, { organizationId, ...fiche }): Promise<Id<'intervenants'>> =>
		ajouter(ctx, organizationId, fiche)
});

export const listerInterne = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: v.array(vIntervenant),
	handler: async (ctx, { organizationId }) => lister(ctx, organizationId)
});

export const monCarnet = authedQuery({
	args: {},
	returns: v.array(vIntervenant),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		return await lister(ctx, organizationId);
	}
});

export const ajouterIntervenant = authedMutation({
	args: argsAjout,
	returns: v.id('intervenants'),
	handler: async (ctx, fiche): Promise<Id<'intervenants'>> => {
		const { organizationId } = await getUserOrg(ctx);
		return await ajouter(ctx, organizationId, fiche);
	}
});

export const oublierIntervenant = authedMutation({
	args: { intervenantId: v.id('intervenants') },
	returns: v.null(),
	handler: async (ctx, { intervenantId }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const fiche = await ctx.db.get(intervenantId);
		if (fiche === null || fiche.organizationId !== organizationId) {
			throw new ConvexError('Intervenant introuvable');
		}
		await ctx.db.delete(intervenantId);
		return null;
	}
});
