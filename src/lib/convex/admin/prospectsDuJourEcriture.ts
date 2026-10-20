import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { versProspect } from '../../crm/annuaire';
import { PARCOURS_DU_SECTEUR } from './annuaire';
import { vFournisseurAjoute } from './decpEcriture';
import { noterAuJournal } from './enveloppe';
import { naissanceDuProspect } from './prospects';
import { vEntrepriseTrouvee, vSecteur } from './validateursProspection';

/**
 * L'ÉCRITURE DU CHOIX DE PLUME (20/10/2026) : les prospects du jour, en un seul import.
 * Séparée de l'exécution pour qu'elle n'appelle pas son propre module. Les doublons se
 * revérifient par SIREN au moment même : un prospect entré entre-temps n'entre pas deux fois.
 */
export const ajouterLeChoix = internalMutation({
	args: {
		entreprises: v.array(
			v.object({ entreprise: vEntrepriseTrouvee, secteur: vSecteur, notes: v.string() })
		),
		fournisseurs: v.array(vFournisseurAjoute),
		libelle: v.string(),
		par: v.string()
	},
	returns: v.object({ sirens: v.array(v.string()) }),
	handler: async (ctx, { entreprises, fournisseurs, libelle, par }) => {
		const maintenant = Date.now();
		const vus = new Set<string>();
		const nouveau = async (siren: string): Promise<boolean> => {
			if (!/^\d{9}$/.test(siren) || vus.has(siren)) return false;
			vus.add(siren);
			const deja = await ctx.db
				.query('prospects')
				.withIndex('by_siren', (q) => q.eq('siren', siren))
				.first();
			return deja === null;
		};
		const entreprisesRetenues = [];
		for (const e of entreprises) if (await nouveau(e.entreprise.siren)) entreprisesRetenues.push(e);
		const fournisseursRetenus = [];
		for (const f of fournisseurs) if (await nouveau(f.siren)) fournisseursRetenus.push(f);
		const total = entreprisesRetenues.length + fournisseursRetenus.length;
		if (total === 0) return { sirens: [] };

		const importId = await ctx.db.insert('importsProspects', {
			fichier: libelle,
			lignes: entreprises.length + fournisseurs.length,
			importes: total,
			ecartes: entreprises.length + fournisseurs.length - total,
			oppositions: 0,
			par,
			le: maintenant
		});
		for (const { entreprise, secteur, notes } of entreprisesRetenues) {
			const prospect = versProspect(entreprise, secteur, maintenant);
			await ctx.db.insert('prospects', {
				...prospect,
				notes,
				...naissanceDuProspect({ ...prospect, parcours: PARCOURS_DU_SECTEUR[secteur] }),
				importId,
				creePar: par,
				creeLe: maintenant
			});
		}
		for (const f of fournisseursRetenus) {
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
			cible: { type: 'IMPORT', id: importId, libelle: `${libelle} : ${total} prospects` }
		});
		return {
			sirens: [
				...entreprisesRetenues.map((e) => e.entreprise.siren),
				...fournisseursRetenus.map((f) => f.siren)
			]
		};
	}
});
