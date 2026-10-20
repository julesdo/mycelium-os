import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { vEstimationProspect } from './tables';
import { noterAuJournal } from './enveloppe';
import { naissanceDuProspect } from './prospects';

/**
 * L'ÉCRITURE DES FOURNISSEURS PUBLICS AJOUTÉS (19/10/2026, audit, lot 5). Séparée des
 * travaux pour que leur exécution n'appelle pas son propre module (cycle d'inférence).
 * Les doublons se revérifient par SIREN au moment même.
 */
export const vFournisseurAjoute = v.object({
	entreprise: v.string(),
	siren: v.string(),
	activite: v.optional(v.string()),
	effectif: v.optional(v.string()),
	ville: v.optional(v.string()),
	dirigeant: v.optional(v.string()),
	fonction: v.optional(v.string()),
	trouveOu: v.string(),
	notes: v.optional(v.string()),
	montantEstimeCentimes: v.optional(v.int64()),
	dateButoir: v.optional(v.string()),
	estimation: v.optional(vEstimationProspect)
});

/**
 * L'ÉCRITURE PAR LOTS, POUR LES TRAVAUX EN ARRIÈRE-PLAN (20/10/2026). Un ajout de vingt
 * fournisseurs dure plusieurs minutes et se reprend en plusieurs passes : chaque passe écrit
 * ce qu'elle a préparé dans UN seul import, créé à la première et complété aux suivantes.
 */
export const ajouterAuLot = internalMutation({
	args: {
		fournisseurs: v.array(vFournisseurAjoute),
		importId: v.optional(v.id('importsProspects')),
		libelle: v.string(),
		lignes: v.number(),
		par: v.string()
	},
	returns: v.object({
		importId: v.id('importsProspects'),
		importes: v.number(),
		ecartes: v.number()
	}),
	handler: async (ctx, { fournisseurs, importId, libelle, lignes, par }) => {
		const maintenant = Date.now();
		const vus = new Set<string>();
		const retenus = [];
		for (const f of fournisseurs) {
			if (!/^\d{9}$/.test(f.siren) || vus.has(f.siren)) continue;
			vus.add(f.siren);
			const deja = await ctx.db
				.query('prospects')
				.withIndex('by_siren', (q) => q.eq('siren', f.siren))
				.first();
			if (deja === null) retenus.push(f);
		}
		let id = importId;
		if (id === undefined) {
			id = await ctx.db.insert('importsProspects', {
				fichier: libelle,
				lignes,
				importes: 0,
				ecartes: 0,
				oppositions: 0,
				par,
				le: maintenant
			});
			await noterAuJournal(ctx, par, {
				action: 'IMPORT',
				cible: { type: 'IMPORT', id, libelle }
			});
		}
		const lot = await ctx.db.get(id);
		if (lot !== null) {
			await ctx.db.patch(id, {
				importes: lot.importes + retenus.length,
				ecartes: lot.ecartes + (fournisseurs.length - retenus.length)
			});
		}
		for (const f of retenus) {
			await ctx.db.insert('prospects', {
				...f,
				cible: 'PME',
				statut: 'A_CONTACTER',
				...naissanceDuProspect({ parcours: 'FOURNISSEUR_PUBLIC', cible: 'PME' }),
				importId: id,
				creePar: par,
				creeLe: maintenant
			});
		}
		return {
			importId: id,
			importes: retenus.length,
			ecartes: fournisseurs.length - retenus.length
		};
	}
});
