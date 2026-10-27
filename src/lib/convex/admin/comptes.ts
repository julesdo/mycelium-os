import { v, ConvexError } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { components } from '../_generated/api';
import { ETAPES, LIBELLES_D_UNE_ETAPE, type Etape } from '../../croissance/etapes';
import { libelleDeSource } from '../../croissance/source';
import { SEUIL_APPELER } from '../../croissance/score';
import { equipeMutation, equipeQuery, noterAuJournal } from './enveloppe';

/**
 * LES COMPTES CLIENTS, VUS DE L'ÉQUIPE (16/10/2026).
 *
 * ⚠️ DES DONNÉES DE COMPTE SEULEMENT : l'établissement, sa formule, ses membres,
 * son parcours. Jamais un débiteur, une facture, un montant, un document — la
 * barrière `admin-tables.test.ts` borne les tables lues ici.
 */

const JOUR = 24 * 60 * 60 * 1000;
const NOMS_FORMULES: Record<string, string> = {
	solo: 'Solo',
	suivi: 'Solo',
	equipe: 'Équipe',
	procedures: 'Équipe',
	pro: 'Pro'
};

export const vVueComptes = v.union(
	v.literal('TOUS'),
	v.literal('A_APPELER'),
	v.literal('ESSAI'),
	v.literal('ABONNES'),
	v.literal('A_RISQUE'),
	v.literal('CETTE_SEMAINE')
);

export function formuleDe(org: Doc<'organizations'>): string {
	const nom =
		org.paddlePlanTier === undefined
			? 'Découverte'
			: (NOMS_FORMULES[org.paddlePlanTier] ?? 'Découverte');
	if (org.paddleStatus === 'trialing') return `${nom} · essai`;
	if (org.paddleStatus === 'canceled') return 'Résilié';
	if (org.paddleStatus === 'past_due') return `${nom} · impayé`;
	return nom;
}

function derniereEtape(etapes: Doc<'parcoursComptes'>['etapes']): Etape | undefined {
	return [...ETAPES].reverse().find((e) => e !== 'A_RISQUE' && etapes[e] !== undefined);
}

const vLigneCompte = v.object({
	id: v.id('organizations'),
	nom: v.string(),
	siren: v.optional(v.string()),
	formule: v.string(),
	etape: v.string(),
	etapeLe: v.optional(v.number()),
	/** Les étapes atteintes : le kanban et l'entonnoir des comptes les lisent. */
	etapes: v.array(v.string()),
	score: v.number(),
	source: v.string(),
	inscritLe: v.number(),
	aRisque: v.boolean()
});

async function lignes(ctx: QueryCtx) {
	const organisations = await ctx.db.query('organizations').take(2000);
	const resultat: (typeof vLigneCompte.type)[] = [];
	for (const org of organisations) {
		const parcours = await ctx.db
			.query('parcoursComptes')
			.withIndex('by_org', (q) => q.eq('organizationId', org._id))
			.first();
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', org._id))
			.first();
		const etapes = parcours?.etapes ?? {};
		const etape = derniereEtape(etapes);
		resultat.push({
			id: org._id,
			nom: org.name,
			...(profil?.siren ? { siren: profil.siren } : {}),
			formule: formuleDe(org),
			etape: etape === undefined ? 'Inscrit' : LIBELLES_D_UNE_ETAPE[etape],
			...(etape === undefined || etapes[etape] === undefined ? {} : { etapeLe: etapes[etape] }),
			etapes: ETAPES.filter((e) => etapes[e] !== undefined),
			score: parcours?.score ?? 0,
			source: libelleDeSource(parcours?.source ?? null),
			inscritLe: org.createdAt,
			aRisque: etapes.A_RISQUE !== undefined
		});
	}
	return { resultat, organisations };
}

export const liste = equipeQuery('LECTURE')({
	args: { vue: vVueComptes },
	returns: v.array(vLigneCompte),
	handler: async (ctx, { vue }) => {
		const { resultat, organisations } = await lignes(ctx);
		const parId = new Map(organisations.map((o) => [o._id, o]));
		const maintenant = Date.now();
		return resultat
			.filter((l) => {
				const org = parId.get(l.id);
				switch (vue) {
					case 'A_APPELER':
						return l.score >= SEUIL_APPELER;
					case 'ESSAI':
						return org?.paddleStatus === 'trialing';
					case 'ABONNES':
						return org?.paddleStatus === 'active';
					case 'A_RISQUE':
						return l.aRisque;
					case 'CETTE_SEMAINE':
						return maintenant - l.inscritLe <= 7 * JOUR;
					default:
						return true;
				}
			})
			.sort((a, b) => b.score - a.score || b.inscritLe - a.inscritLe);
	}
});

export const fiche = equipeQuery('LECTURE')({
	args: { organizationId: v.id('organizations') },
	returns: v.union(
		v.null(),
		v.object({
			id: v.id('organizations'),
			nom: v.string(),
			siren: v.optional(v.string()),
			ville: v.optional(v.string()),
			inscritLe: v.number(),
			formule: v.string(),
			rythme: v.optional(v.string()),
			prochainPrelevementLe: v.optional(v.number()),
			resiliationLe: v.optional(v.number()),
			raisonResiliation: v.optional(v.string()),
			source: v.string(),
			pageEntree: v.optional(v.string()),
			score: v.number(),
			raisonsDuScore: v.array(v.string()),
			etapes: v.array(
				v.object({ etape: v.string(), libelle: v.string(), le: v.optional(v.number()) })
			),
			membres: v.array(
				v.object({
					nom: v.optional(v.string()),
					email: v.optional(v.string()),
					role: v.string(),
					derniereVisite: v.optional(v.number())
				})
			),
			conseils: v.array(v.object({ cle: v.string(), le: v.number() }))
		})
	),
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		const parcours = await ctx.db
			.query('parcoursComptes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const membresDocs = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.take(50);
		const membres = [];
		for (const m of membresDocs) {
			const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: 'user',
				where: [{ field: '_id', operator: 'eq', value: m.userId }]
			})) as { name?: string; email?: string } | null;
			const visite = await ctx.db
				.query('journeesPlume')
				.withIndex('by_org_and_user_and_jour', (q) =>
					q.eq('organizationId', organizationId).eq('userId', m.userId)
				)
				.order('desc')
				.first();
			membres.push({
				...(utilisateur?.name ? { nom: utilisateur.name } : {}),
				...(utilisateur?.email ? { email: utilisateur.email } : {}),
				role: m.role === 'ORG_ADMIN' ? 'Administrateur' : 'Membre',
				...(visite?.vueLe === undefined ? {} : { derniereVisite: visite.vueLe })
			});
		}
		const conseils = (
			await ctx.db
				.query('envoisCroissance')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.take(50)
		)
			.filter((e) => e.userId !== '')
			.map((e) => ({ cle: e.cle, le: e.le }));
		const etapes = parcours?.etapes ?? {};
		const ville = profil?.adresse
			? /\b\d{5}\s+([^,\n]+?)\s*$/.exec(profil.adresse.trim())?.[1]
			: undefined;

		return {
			id: org._id,
			nom: org.name,
			...(profil?.siren ? { siren: profil.siren } : {}),
			...(ville === undefined ? {} : { ville }),
			inscritLe: org.createdAt,
			formule: formuleDe(org),
			...(org.paddleRythme === undefined
				? {}
				: { rythme: org.paddleRythme === 'annuel' ? 'À l’année' : 'Au mois' }),
			...(org.paddleCurrentPeriodEnd === undefined
				? {}
				: { prochainPrelevementLe: org.paddleCurrentPeriodEnd }),
			...(org.paddleResiliationLe === undefined ? {} : { resiliationLe: org.paddleResiliationLe }),
			...(org.raisonResiliation === undefined ? {} : { raisonResiliation: org.raisonResiliation }),
			source: libelleDeSource(parcours?.source ?? null),
			...(parcours?.source?.pageEntree === undefined
				? {}
				: { pageEntree: parcours.source.pageEntree }),
			score: parcours?.score ?? 0,
			raisonsDuScore: parcours?.raisonsDuScore ?? [],
			etapes: ETAPES.filter((e) => e !== 'A_RISQUE' || etapes.A_RISQUE !== undefined).map((e) => ({
				etape: e,
				libelle: LIBELLES_D_UNE_ETAPE[e],
				...(etapes[e] === undefined ? {} : { le: etapes[e] })
			})),
			membres,
			conseils
		};
	}
});

/** L'ouverture d'une fiche client par l'équipe, notée au journal. */
export const ouvrirFiche = equipeMutation('LECTURE')({
	args: { organizationId: v.id('organizations') },
	returns: v.null(),
	handler: async (ctx, { organizationId }): Promise<null> => {
		const org = await ctx.db.get(organizationId);
		if (org === null) throw new ConvexError('Compte introuvable.');
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'FICHE_OUVERTE',
			cible: { type: 'COMPTE', id: organizationId, libelle: org.name },
			organizationId
		});
		return null;
	}
});

export type IdCompte = Id<'organizations'>;
