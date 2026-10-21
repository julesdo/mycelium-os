import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { peutParler, type Canal, type PriseDeParole } from '../../croissance/attention';

/**
 * LE BUDGET D'ATTENTION, CÔTÉ CONVEX (21/10/2026, le parcours de l'habitude). Le module
 * pur décide (`croissance/attention.ts`) ; ici on lit l'historique, on demande, on
 * inscrit. L'historique des e-mails compte aussi les conseils déjà envoyés là où ils
 * sont inscrits (`envoisCroissance`) : il n'est pas migré.
 */

const JOUR = 24 * 60 * 60 * 1000;
/** Assez d'historique pour toutes les règles : la semaine, la cadence, deux ignorées. */
const FENETRE_MS = 30 * JOUR;

/**
 * L'historique des prises de parole d'une personne (ou de tout l'établissement quand
 * `userId` est `null` : les conseils se décident par établissement).
 */
export async function historiqueDeParole(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	userId: string | null,
	maintenant: number
): Promise<PriseDeParole[]> {
	const depuis = maintenant - FENETRE_MS;
	const prises = await ctx.db
		.query('prisesDeParole')
		.withIndex('by_org_and_le', (q) => q.eq('organizationId', organizationId).gte('le', depuis))
		.take(500);
	const conseils = await ctx.db
		.query('envoisCroissance')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.take(200);
	return [
		...prises
			.filter((p) => userId === null || p.userId === userId)
			.map((p) => ({
				canal: p.canal,
				genre: p.genre,
				cle: p.cle,
				le: p.le,
				ouverteLe: p.ouverteLe ?? null,
				expireeLe: p.expireeLe ?? null
			})),
		...conseils
			.filter((c) => c.le >= depuis && (userId === null || c.userId === userId || c.userId === ''))
			.map((c) => ({
				canal: 'EMAIL' as const,
				genre: 'conseil',
				cle: `conseil:${c.cle}`,
				le: c.le,
				ouverteLe: null,
				expireeLe: null
			}))
	];
}

/** Ce que la personne a coupé d'un « Ne plus me le proposer » (`marketing:<genre>`). */
export async function coupuresDe(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	userId: string
): Promise<Set<string>> {
	const silences = await ctx.db
		.query('silencesPlume')
		.withIndex('by_org_and_user_and_cle', (q) =>
			q
				.eq('organizationId', organizationId)
				.eq('userId', userId)
				.gte('cle', 'marketing:')
				.lt('cle', 'marketing;')
		)
		.take(50);
	return new Set(silences.map((s) => s.cle));
}

interface Demande {
	readonly organizationId: Id<'organizations'>;
	readonly userId: string;
	readonly canal: Canal;
	readonly genre: string;
	readonly cle: string;
}

/** La parole serait-elle accordée ? En lecture seule : pour une requête (la carte du lundi). */
export async function paroleAccordee(
	ctx: QueryCtx,
	d: Demande,
	maintenant: number = Date.now()
): Promise<boolean> {
	const deja = await ctx.db
		.query('prisesDeParole')
		.withIndex('by_user_and_cle', (q) => q.eq('userId', d.userId).eq('cle', d.cle))
		.first();
	// Une parole déjà accordée sous cette clé le reste : la carte reste là jusqu'à jeudi.
	if (deja !== null && deja.organizationId === d.organizationId) return true;
	const historique = await historiqueDeParole(ctx, d.organizationId, d.userId, maintenant);
	const coupes = await coupuresDe(ctx, d.organizationId, d.userId);
	return peutParler(historique, d, maintenant, coupes).ok;
}

/**
 * DEMANDE LA PAROLE, ET L'INSCRIT QUAND ELLE EST ACCORDÉE. Une clé déjà inscrite rend
 * `true` sans rien inscrire de plus : la même carte qui revient ne coûte pas deux fois.
 */
export async function demanderLaParole(
	ctx: MutationCtx,
	d: Demande,
	maintenant: number = Date.now()
): Promise<boolean> {
	const deja = await ctx.db
		.query('prisesDeParole')
		.withIndex('by_user_and_cle', (q) => q.eq('userId', d.userId).eq('cle', d.cle))
		.first();
	if (deja !== null && deja.organizationId === d.organizationId) return true;
	if (!(await paroleAccordee(ctx, d, maintenant))) return false;
	await ctx.db.insert('prisesDeParole', {
		organizationId: d.organizationId,
		userId: d.userId,
		canal: d.canal,
		genre: d.genre,
		cle: d.cle,
		le: maintenant
	});
	return true;
}

/** La parole de cette clé a été ouverte ou suivie d'effet : elle n'est pas ignorée. */
export async function noterOuverte(
	ctx: MutationCtx,
	userId: string,
	cle: string,
	maintenant: number = Date.now()
): Promise<void> {
	const prise = await ctx.db
		.query('prisesDeParole')
		.withIndex('by_user_and_cle', (q) => q.eq('userId', userId).eq('cle', cle))
		.first();
	if (prise !== null && prise.ouverteLe === undefined) {
		await ctx.db.patch(prise._id, { ouverteLe: maintenant });
	}
}

/** La parole de cette clé est passée sans être ouverte : elle compte comme ignorée. */
export async function noterExpiree(
	ctx: MutationCtx,
	userId: string,
	cle: string,
	maintenant: number = Date.now()
): Promise<void> {
	const prise = await ctx.db
		.query('prisesDeParole')
		.withIndex('by_user_and_cle', (q) => q.eq('userId', userId).eq('cle', cle))
		.first();
	if (prise !== null && prise.ouverteLe === undefined && prise.expireeLe === undefined) {
		await ctx.db.patch(prise._id, { expireeLe: maintenant });
	}
}
