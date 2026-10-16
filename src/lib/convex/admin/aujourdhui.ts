import { v } from 'convex/values';
import { libelleDeSource } from '../../croissance/source';
import { SEUIL_APPELER } from '../../croissance/score';
import { equipeQuery } from './enveloppe';
import { tacheAffichee, vTache } from './taches';

/**
 * L'ÉCRAN « AUJOURD'HUI » DE L'ADMIN (16/10/2026) : les tâches ouvertes, les
 * comptes à appeler (score de 60 ou plus, sans tâche faite depuis sept jours) et
 * les derniers inscrits avec leur source.
 */

const JOUR = 24 * 60 * 60 * 1000;

export const resume = equipeQuery('LECTURE')({
	args: {},
	returns: v.object({
		taches: v.array(vTache),
		aAppeler: v.array(
			v.object({
				id: v.id('organizations'),
				nom: v.string(),
				score: v.number(),
				raison: v.optional(v.string())
			})
		),
		inscrits: v.array(
			v.object({ id: v.id('organizations'), nom: v.string(), source: v.string(), le: v.number() })
		)
	}),
	handler: async (ctx) => {
		const maintenant = Date.now();
		const ouvertes = await ctx.db
			.query('tachesCrm')
			.withIndex('by_faite_et_pour', (q) => q.eq('faiteLe', undefined))
			.take(300);
		const taches = [];
		for (const t of ouvertes) taches.push(await tacheAffichee(ctx, t));

		const parcours = await ctx.db.query('parcoursComptes').take(3000);
		const aAppeler = [];
		for (const p of parcours.filter((x) => (x.score ?? 0) >= SEUIL_APPELER)) {
			const recentes = await ctx.db
				.query('tachesCrm')
				.withIndex('by_org', (q) => q.eq('organizationId', p.organizationId))
				.take(50);
			if (recentes.some((t) => t.faiteLe !== undefined && maintenant - t.faiteLe < 7 * JOUR))
				continue;
			const org = await ctx.db.get(p.organizationId);
			if (org === null) continue;
			aAppeler.push({
				id: org._id,
				nom: org.name,
				score: p.score ?? 0,
				...(p.raisonsDuScore?.[0] === undefined ? {} : { raison: p.raisonsDuScore[0] })
			});
		}
		aAppeler.sort((a, b) => b.score - a.score);

		const inscrits = [];
		for (const p of parcours) {
			const le = p.etapes.INSCRIT;
			if (le === undefined || maintenant - le > 7 * JOUR) continue;
			const org = await ctx.db.get(p.organizationId);
			if (org === null) continue;
			inscrits.push({ id: org._id, nom: org.name, source: libelleDeSource(p.source ?? null), le });
		}
		inscrits.sort((a, b) => b.le - a.le);

		return { taches, aAppeler: aAppeler.slice(0, 10), inscrits: inscrits.slice(0, 10) };
	}
});
