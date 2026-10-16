import { v } from 'convex/values';
import { equipeQuery } from './enveloppe';

/**
 * LA RECHERCHE DE L'ADMIN (16/10/2026) : un compte ou un prospect, par son nom, son
 * SIREN ou son adresse. À l'échelle d'aujourd'hui, une lecture bornée suffit ; un
 * index de recherche viendra quand les volumes le demanderont.
 */

function simple(texte: string): string {
	return texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export const chercher = equipeQuery('LECTURE')({
	args: { texte: v.string() },
	returns: v.array(
		v.object({
			type: v.union(v.literal('COMPTE'), v.literal('PROSPECT')),
			id: v.string(),
			libelle: v.string(),
			detail: v.optional(v.string())
		})
	),
	handler: async (ctx, { texte }) => {
		const cherche = simple(texte.trim());
		if (cherche.length < 2) return [];
		const resultats: {
			type: 'COMPTE' | 'PROSPECT';
			id: string;
			libelle: string;
			detail?: string;
		}[] = [];
		for (const org of await ctx.db.query('organizations').take(2000)) {
			if (simple(org.name).includes(cherche)) {
				resultats.push({ type: 'COMPTE', id: org._id, libelle: org.name, detail: 'Compte client' });
			}
		}
		for (const p of await ctx.db.query('prospects').take(5000)) {
			const champs = [p.entreprise, p.siren ?? '', p.email ?? '', p.ville ?? ''].map(simple);
			if (champs.some((c) => c.includes(cherche))) {
				resultats.push({
					type: 'PROSPECT',
					id: p._id,
					libelle: p.entreprise,
					...(p.ville === undefined ? {} : { detail: p.ville })
				});
			}
		}
		return resultats.slice(0, 20);
	}
});
