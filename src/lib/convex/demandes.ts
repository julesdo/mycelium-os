import { v } from 'convex/values';
import { HOUR, RateLimiter } from '@convex-dev/rate-limiter';
import { mutation } from './_generated/server';
import { components } from './_generated/api';
import { OFFRES } from '../config/tarifs';
import { lireDemande, PARCOURS_DE_L_OFFRE } from '../crm/demande';
import { naissanceDuProspect } from './admin/prospects';

/**
 * UNE OFFRE DEMANDÉE SUR LE SITE (19/10/2026, audit stratégique, lot 6).
 *
 * La seule mutation publique du site, avec la désinscription : elle crée (ou retrouve)
 * le prospect au CRM, avec le parcours de l'offre, note la demande à son historique et
 * pose une tâche pour y répondre. Rien n'est vendu ni prélevé ici.
 *
 * ⚠️ TROIS PROTECTIONS, AUCUNE QUI RENSEIGNE UN ROBOT : le champ piège (un robot qui le
 * remplit reçoit la même réponse qu'un humain), une limite par adresse et une limite
 * globale par heure (le limiteur de Convex, enfin instancié).
 */
const limiteur = new RateLimiter(components.rateLimiter, {
	demandeParAdresse: { kind: 'fixed window', rate: 3, period: HOUR },
	demandesDuSite: { kind: 'fixed window', rate: 60, period: HOUR }
});

const RAISON_TROP = 'Trop de demandes en ce moment : réessayez dans une heure.';

export const demanderUneOffre = mutation({
	args: {
		offre: v.string(),
		nom: v.optional(v.string()),
		entreprise: v.string(),
		email: v.string(),
		telephone: v.optional(v.string()),
		message: v.optional(v.string()),
		piege: v.optional(v.string())
	},
	returns: v.union(
		v.object({ ok: v.literal(true) }),
		v.object({ ok: v.literal(false), erreur: v.string() })
	),
	handler: async (ctx, args): Promise<{ ok: true } | { ok: false; erreur: string }> => {
		const lue = lireDemande(args);
		if (!lue.ok) return lue.robot === true ? { ok: true } : { ok: false, erreur: lue.erreur };
		const d = lue.demande;
		if (!(await limiteur.limit(ctx, 'demandesDuSite')).ok)
			return { ok: false, erreur: RAISON_TROP };
		// Une adresse qui insiste reçoit la même réponse : rien ne dit qu'elle est connue.
		if (!(await limiteur.limit(ctx, 'demandeParAdresse', { key: d.email })).ok) return { ok: true };

		const maintenant = Date.now();
		const offre = OFFRES[d.offre].nom;
		const jour = new Date(maintenant).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
		const existant = await ctx.db
			.query('prospects')
			.withIndex('by_email', (q) => q.eq('email', d.email))
			.first();

		let prospectId = existant?._id;
		if (existant !== null && existant.statut !== 'STOP') {
			await ctx.db.patch(existant._id, {
				dernierContactLe: maintenant,
				dernierContactDuProspectLe: maintenant,
				...(existant.emailBase === undefined
					? { emailBase: 'INFORMEE' as const, emailInformeLe: maintenant }
					: {}),
				...(existant.statut === 'A_CONTACTER' ||
				existant.statut === 'CONTACTE' ||
				existant.statut === 'RELANCE'
					? { statut: 'A_REPONDU' as const }
					: {}),
				...(existant.telephone === undefined && d.telephone !== undefined
					? { telephone: d.telephone }
					: {}),
				prochaineAction: 'Répondre à la demande',
				prochaineActionLe: maintenant
			});
		} else {
			prospectId = await ctx.db.insert('prospects', {
				entreprise: d.entreprise,
				...(d.nom === undefined ? {} : { dirigeant: d.nom }),
				email: d.email,
				...(d.telephone === undefined ? {} : { telephone: d.telephone }),
				trouveOu: `Demande sur le site (${offre}), le ${jour}`,
				cible: 'PME',
				statut: 'A_REPONDU',
				prochaineAction: 'Répondre à la demande',
				prochaineActionLe: maintenant,
				dernierContactLe: maintenant,
				dernierContactDuProspectLe: maintenant,
				emailBase: 'INFORMEE',
				emailInformeLe: maintenant,
				creePar: 'site',
				creeLe: maintenant,
				...naissanceDuProspect({ parcours: PARCOURS_DE_L_OFFRE[d.offre], cible: 'PME' })
			});
		}
		await ctx.db.insert('evenementsCrm', {
			prospectId,
			type: 'REPONSE',
			texte: `Demande sur le site : ${offre}${d.message === undefined ? '' : `\n${d.message}`}`,
			auteur: 'site',
			le: maintenant
		});
		await ctx.db.insert('tachesCrm', {
			prospectId,
			titre: `Répondre à la demande : ${offre}`,
			pour: maintenant,
			origine: 'MAIN',
			creePar: 'site',
			creeLe: maintenant
		});
		return { ok: true };
	}
});
