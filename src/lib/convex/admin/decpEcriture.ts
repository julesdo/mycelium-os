import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { vEstimationProspect } from './tables';
import { noterAuJournal } from './enveloppe';
import { naissanceDuProspect } from './prospects';

/**
 * L'ÉCRITURE DES FOURNISSEURS PUBLICS AJOUTÉS (19/10/2026, audit, lot 5). Séparée de
 * `decp.ts` pour que l'action n'appelle pas son propre module (cycle d'inférence).
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

export const ajouterLesFournisseurs = internalMutation({
	args: {
		fournisseurs: v.array(vFournisseurAjoute),
		libelle: v.string(),
		lignes: v.number(),
		par: v.string()
	},
	returns: v.object({ importes: v.number(), ecartes: v.number() }),
	handler: async (
		ctx,
		{ fournisseurs, libelle, lignes, par }
	): Promise<{ importes: number; ecartes: number }> => {
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
		const importId = await ctx.db.insert('importsProspects', {
			fichier: libelle,
			lignes,
			importes: retenus.length,
			ecartes: lignes - retenus.length,
			oppositions: 0,
			par,
			le: maintenant
		});
		for (const f of retenus) {
			await ctx.db.insert('prospects', {
				...f,
				cible: 'PME',
				statut: 'A_CONTACTER',
				...naissanceDuProspect({ parcours: 'FOURNISSEUR_PUBLIC', cible: 'PME' }),
				importId,
				creePar: par,
				creeLe: maintenant
			});
		}
		await noterAuJournal(ctx, par, {
			action: 'IMPORT',
			cible: { type: 'IMPORT', id: importId, libelle: `${libelle} : ${retenus.length} prospects` }
		});
		return { importes: retenus.length, ecartes: lignes - retenus.length };
	}
});
