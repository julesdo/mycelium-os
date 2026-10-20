import { v, ConvexError } from 'convex/values';
import { SECTEURS, versProspect, ZONES, type CleSecteur } from '../../crm/annuaire';
import { equipeMutation, noterAuJournal } from './enveloppe';
import { naissanceDuProspect } from './prospects';
import { vEntrepriseTrouvee, vSecteur, vZone } from './validateursProspection';
import type { Parcours } from '../../crm/parcours';

/** Le parcours de prospection de chaque secteur cherché à l'annuaire. */
export const PARCOURS_DU_SECTEUR: Readonly<Record<CleSecteur, Parcours>> = {
	TRANSPORT: 'TRANSPORTEUR',
	BATIMENT: 'PME_LOGICIEL',
	SERVICES: 'PME_LOGICIEL',
	CABINETS: 'EXPERT_COMPTABLE'
};

/**
 * TROUVER DES ENTREPRISES À L'ANNUAIRE, PUIS LES AJOUTER (17/10/2026).
 *
 * La recherche tourne en arrière-plan, dans les travaux de l'équipe (`travaux.ts`,
 * `prospection.ts`). `ajouter` écrit celles que l'équipe a cochées, en revérifiant les doublons par
 * SIREN au moment même, et inscrit l'ajout dans l'historique des imports.
 */

/** Une page cochée entière, quatre fois : au-delà, on ajoute en plusieurs fois. */
const AJOUT_MAX = 100;

export const ajouter = equipeMutation('SUPPORT')({
	args: { secteur: vSecteur, zone: vZone, entreprises: v.array(vEntrepriseTrouvee) },
	returns: v.object({ importes: v.number(), ecartes: v.number() }),
	handler: async (ctx, { secteur, zone, entreprises }) => {
		if (entreprises.length === 0) throw new ConvexError('Aucune entreprise cochée.');
		if (entreprises.length > AJOUT_MAX) {
			throw new ConvexError(`Au plus ${AJOUT_MAX} entreprises à la fois.`);
		}
		const maintenant = Date.now();
		const vues = new Set<string>();
		const retenues = [];
		for (const e of entreprises) {
			if (!/^\d{9}$/.test(e.siren) || e.entreprise.trim() === '' || vues.has(e.siren)) continue;
			vues.add(e.siren);
			const deja = await ctx.db
				.query('prospects')
				.withIndex('by_siren', (q) => q.eq('siren', e.siren))
				.first();
			if (deja === null) retenues.push(e);
		}
		const libelle = `Annuaire : ${SECTEURS[secteur].libelle}, ${ZONES[zone].libelle}`;
		const importId = await ctx.db.insert('importsProspects', {
			fichier: libelle,
			lignes: entreprises.length,
			importes: retenues.length,
			ecartes: entreprises.length - retenues.length,
			oppositions: 0,
			par: ctx.equipier.email,
			le: maintenant
		});
		for (const e of retenues) {
			const prospect = versProspect(e, secteur, maintenant);
			await ctx.db.insert('prospects', {
				...prospect,
				...naissanceDuProspect({ ...prospect, parcours: PARCOURS_DU_SECTEUR[secteur] }),
				importId,
				creePar: ctx.equipier.email,
				creeLe: maintenant
			});
		}
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'IMPORT',
			cible: { type: 'IMPORT', id: importId, libelle: `${libelle} : ${retenues.length} prospects` }
		});
		return { importes: retenues.length, ecartes: entreprises.length - retenues.length };
	}
});
