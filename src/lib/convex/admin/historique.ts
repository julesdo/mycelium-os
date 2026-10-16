import { v, ConvexError } from 'convex/values';
import { equipeMutation, equipeQuery } from './enveloppe';
import { vTypeEvenementCrm } from './tables';

/**
 * L'HISTORIQUE D'UNE FICHE (16/10/2026) : les notes, les appels, les e-mails notés,
 * les réponses et les changements de statut, saisis d'un geste. Pour un compte, la
 * fiche y ajoute ses étapes et les conseils de Plume (`admin/comptes.ts`).
 */

const vCibleFiche = v.union(
	v.object({ compte: v.id('organizations') }),
	v.object({ prospect: v.id('prospects') })
);

export const deLaFiche = equipeQuery('LECTURE')({
	args: { cible: vCibleFiche },
	returns: v.array(
		v.object({
			id: v.id('evenementsCrm'),
			type: vTypeEvenementCrm,
			texte: v.optional(v.string()),
			auteur: v.string(),
			le: v.number()
		})
	),
	handler: async (ctx, { cible }) => {
		const evenements =
			'compte' in cible
				? await ctx.db
						.query('evenementsCrm')
						.withIndex('by_org', (q) => q.eq('organizationId', cible.compte))
						.order('desc')
						.take(200)
				: await ctx.db
						.query('evenementsCrm')
						.withIndex('by_prospect', (q) => q.eq('prospectId', cible.prospect))
						.order('desc')
						.take(200);
		return evenements.map((e) => ({
			id: e._id,
			type: e.type,
			...(e.texte === undefined ? {} : { texte: e.texte }),
			auteur: e.auteur,
			le: e.le
		}));
	}
});

export const noter = equipeMutation('SUPPORT')({
	args: {
		cible: vCibleFiche,
		type: v.union(v.literal('NOTE'), v.literal('APPEL'), v.literal('EMAIL'), v.literal('REPONSE')),
		texte: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { cible, type, texte }): Promise<null> => {
		const propre = texte?.trim().slice(0, 4000);
		if (type === 'NOTE' && !propre) throw new ConvexError('La note est vide.');
		const maintenant = Date.now();
		if ('compte' in cible) {
			if ((await ctx.db.get(cible.compte)) === null) throw new ConvexError('Compte introuvable.');
			await ctx.db.insert('evenementsCrm', {
				organizationId: cible.compte,
				type,
				...(propre ? { texte: propre } : {}),
				auteur: ctx.equipier.email,
				le: maintenant
			});
			return null;
		}
		const p = await ctx.db.get(cible.prospect);
		if (p === null) throw new ConvexError('Prospect introuvable.');
		await ctx.db.insert('evenementsCrm', {
			prospectId: cible.prospect,
			type,
			...(propre ? { texte: propre } : {}),
			auteur: ctx.equipier.email,
			le: maintenant
		});
		// Un échange avance le prospect : un appel ou un e-mail le dit contacté,
		// une réponse le dit « a répondu » — sans jamais reculer un statut plus loin.
		if (type === 'APPEL' || type === 'EMAIL') {
			await ctx.db.patch(cible.prospect, {
				dernierContactLe: maintenant,
				...(p.statut === 'A_CONTACTER' ? { statut: 'CONTACTE' as const } : {})
			});
		}
		if (type === 'REPONSE' && ['A_CONTACTER', 'CONTACTE', 'RELANCE'].includes(p.statut)) {
			await ctx.db.patch(cible.prospect, { statut: 'A_REPONDU', dernierContactLe: maintenant });
		}
		return null;
	}
});
