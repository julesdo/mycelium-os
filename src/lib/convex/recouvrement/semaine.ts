import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { components, internal } from '../_generated/api';
import { authedMutation, authedQuery } from '../functions';
import { organisationCouranteOuNull } from '../lib/auth';
import {
	GENRE_VISITE,
	demanderLaParole,
	noterOuverte,
	paroleAccordee
} from '../croissance/attention';
import { notifier } from '../notifier';
import { estRentre, jalonEnAttente, lireLesJalons } from './jalons';
import { requireEnv } from '../env';
import { assertResendApiKey, resend } from '../emails/resend';
import { expediteurNomme } from '../emails/helpers';
import { semaineHtml, semaineTexte } from '../emails/modeles/semaine';
import { enEuros } from '../../notifications/paiements';
import { ajouterJours, dateLisible, ecartJours } from '../../verticales/recouvrement/calendrier';
import { prochainCreneauDEnvoi } from '../../verticales/recouvrement/plan-relance';
import { jourDeParis } from '../../verticales/recouvrement/compagnon/journee';
import { prescriptionDe } from '../../verticales/recouvrement/pays/france/prescription';
import {
	bornesDeLaSemaineEcoulee,
	composerLaSemaine,
	lundiDe,
	phraseDeLaSemaine,
	rangeesDeLaSemaine,
	repartirLeLundi,
	type VotreSemaine
} from '../../verticales/recouvrement/votre-semaine';

/**
 * « VOTRE SEMAINE », LUE EN BASE (21/10/2026, le parcours de l'habitude). Le module pur
 * compose (`verticales/recouvrement/votre-semaine.ts`) ; ici on lit les règlements, les
 * relances parties et les dates limites, pour l'écran, la carte du lundi et l'e-mail.
 *
 * ⚠️ LA CARTE DU LUNDI PASSE PAR LE BUDGET D'ATTENTION : elle se montre du lundi au
 * mercredi, si la parole est accordée, et s'inscrit avec son expiration du jeudi. Ouvrir
 * l'écran la fait disparaître ; ne jamais l'ouvrir la compte ignorée.
 */

const JOURS_PAR_SEMAINE = 7;
/** Assez de semaines pour « meilleure semaine depuis juin ». */
const SEMAINES_D_HISTORIQUE = 26;

const vSemaine = v.object({
	debut: v.string(),
	fin: v.string(),
	rentre: v.int64(),
	relancesParties: v.number(),
	clientsQuiOntPaye: v.number(),
	dateLimiteDansJours: v.union(v.number(), v.null()),
	huitSemaines: v.array(v.int64()),
	meilleureDepuis: v.union(v.string(), v.null())
});

/**
 * La clé d'une semaine, PAR ÉTABLISSEMENT : un gérant de deux établissements a deux
 * cartes du lundi, et ouvrir l'une ne cache pas l'autre.
 */
export function cleDeLaSemaine(organizationId: Id<'organizations'>, debut: string): string {
	return `semaine:${organizationId}:${debut}`;
}

/** La plus proche des dates limites pour agir des dossiers ouverts, en jours d'ici. */
async function dateLimiteLaPlusProche(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	aujourdHui: string
): Promise<number | null> {
	const creances = await ctx.db
		.query('creances')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.take(500);
	let plusProche: string | null = null;
	for (const creance of creances) {
		// Classé ou devant un juge : la date limite ne presse plus le gérant.
		if (creance.statut === 'CLOSE' || creance.engageeLe !== undefined) continue;
		const [factures, debiteur] = await Promise.all([
			ctx.db
				.query('facturesVente')
				.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
				.take(100),
			ctx.db.get(creance.debiteurId)
		]);
		const secteur = debiteur?.secteur ?? 'INDETERMINE';
		for (const facture of factures) {
			if (facture.statutPaiement === 'SOLDEE') continue;
			const limite = prescriptionDe(
				[facture.dateExigibilite, facture.dateEcheance],
				secteur
			).datePrescription;
			if (limite === undefined || limite < aujourdHui) continue;
			if (plusProche === null || limite < plusProche) plusProche = limite;
		}
	}
	return plusProche === null ? null : ecartJours(aujourdHui, plusProche);
}

/** LA SEMAINE ÉCOULÉE D'UN ÉTABLISSEMENT, ou `null` quand elle est vide. */
export async function lireLaSemaine(
	ctx: QueryCtx,
	org: Doc<'organizations'>,
	maintenant: number
): Promise<VotreSemaine | null> {
	const { debut, fin } = bornesDeLaSemaineEcoulee(maintenant);
	const arriveeLe = jourDeParis(org._creationTime);
	// Arrivé après la fin de la semaine : elle n'est pas la sienne.
	if (fin < arriveeLe) return null;
	// Une semaine compte en entier dès qu'elle finit après l'arrivée.
	const plusTot = ajouterJours(debut, -JOURS_PAR_SEMAINE * SEMAINES_D_HISTORIQUE);
	const semaineDArrivee = lundiDe(arriveeLe);
	const depuis = semaineDArrivee > plusTot ? semaineDArrivee : plusTot;

	// Les plus récents d'abord : une borne coupe le passé lointain, jamais la semaine.
	const reglements = (
		await ctx.db
			.query('reglements')
			.withIndex('by_org_and_date', (q) =>
				q.eq('organizationId', org._id).gte('date', depuis).lte('date', fin)
			)
			.order('desc')
			.take(5000)
	).filter(estRentre);

	// Le client de chaque paiement de la semaine : « 2 clients ont payé ».
	const factures = new Map<Id<'facturesVente'>, Doc<'facturesVente'> | null>();
	const paiements: { date: string; montant: bigint; debiteurId: string }[] = [];
	for (const r of reglements) {
		if (r.date < debut) continue;
		if (!factures.has(r.factureId)) factures.set(r.factureId, await ctx.db.get(r.factureId));
		const facture = factures.get(r.factureId);
		paiements.push({
			date: r.date,
			montant: r.montant,
			debiteurId: facture?.debiteurId ?? r.factureId
		});
	}

	// Les semaines d'avant, de la plus récente à la plus ancienne, depuis l'arrivée.
	const historique: bigint[] = [];
	const datesDesSemaines: string[] = [];
	for (let k = 1; k <= SEMAINES_D_HISTORIQUE; k++) {
		const lundi = ajouterJours(debut, -JOURS_PAR_SEMAINE * k);
		const dimanche = ajouterJours(lundi, JOURS_PAR_SEMAINE - 1);
		if (dimanche < arriveeLe) break;
		historique.push(
			reglements
				.filter((r) => r.date >= lundi && r.date <= dimanche)
				.reduce((total, r) => total + r.montant, 0n)
		);
		datesDesSemaines.push(lundi);
	}

	// Les plus récents d'abord, et seulement ce qui s'adresse au client : un rappel ou la
	// lettre officielle, pas la lettre à l'avocat ni la déclaration au mandataire.
	const parties = (
		await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) => q.eq('organizationId', org._id).eq('etat', 'PARTI'))
			.order('desc')
			.take(1000)
	).filter((e) => e.modele === 'RAPPEL' || e.modele === 'RELANCE_OFFICIELLE');

	return composerLaSemaine({
		debut,
		fin,
		paiements,
		relancesParties: parties.filter(
			(e) => e.partiLe !== undefined && e.partiLe >= debut && e.partiLe <= fin
		).length,
		dateLimiteDansJours: await dateLimiteLaPlusProche(ctx, org._id, jourDeParis(maintenant)),
		historique,
		datesDesSemaines,
		arriveeLe
	});
}

/** L'ÉCRAN « VOTRE SEMAINE » : la semaine écoulée, et ce que Plume a programmé ensuite. */
export const votreSemaine = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({ semaine: v.union(vSemaine, v.null()), relancesProgrammees: v.number() })
	),
	handler: async (ctx) => {
		const organizationId = await organisationCouranteOuNull(ctx, ctx.user._id);
		if (organizationId === null) return null;
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		const programmees = await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'PROGRAMME')
			)
			.take(200);
		return {
			semaine: await lireLaSemaine(ctx, org, Date.now()),
			relancesProgrammees: programmees.length
		};
	}
});

/** Le jour de la semaine à Paris, du lundi (1) au dimanche (7). */
function jourDeLaSemaine(maintenant: number): number {
	const jour = new Date(`${jourDeParis(maintenant)}T12:00:00Z`).getUTCDay();
	return jour === 0 ? 7 : jour;
}

/**
 * LA CARTE DU LUNDI, sur Aujourd'hui : du lundi au mercredi, quand la semaine n'est pas
 * vide, que l'écran n'a pas été ouvert et que le budget d'attention l'accorde.
 */
export const carteDuLundi = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			debut: v.string(),
			rentre: v.int64(),
			relancesParties: v.number(),
			clientsQuiOntPaye: v.number(),
			dateLimiteDansJours: v.union(v.number(), v.null())
		})
	),
	handler: async (ctx) => {
		const userId = ctx.user._id;
		const organizationId = await organisationCouranteOuNull(ctx, userId);
		if (organizationId === null) return null;
		return carteDuLundiPour(ctx, organizationId, userId, Date.now());
	}
});

/** Le cœur de la carte du lundi, sans session : ce que les tests appellent. */
export async function carteDuLundiPour(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	userId: string,
	maintenant: number
): Promise<{
	debut: string;
	rentre: bigint;
	relancesParties: number;
	clientsQuiOntPaye: number;
	dateLimiteDansJours: number | null;
} | null> {
	if (jourDeLaSemaine(maintenant) > 3) return null;
	const [org, membre] = await Promise.all([
		ctx.db.get(organizationId),
		ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', userId)
			)
			.unique()
	]);
	if (org === null || membre === null) return null;
	// « Votre semaine » coupée dans les réglages des notifications : ni carte ni e-mail.
	if (membre.categoriesCoupees?.includes('SEMAINE') === true) return null;
	// Une réussite attend d'être fêtée : elle passe d'abord, la carte attend demain.
	const jalons = await lireLesJalons(ctx, organizationId);
	if (jalonEnAttente(jalons, userId, membre._creationTime, maintenant) !== null) return null;
	const { debut } = bornesDeLaSemaineEcoulee(maintenant);
	const cle = cleDeLaSemaine(organizationId, debut);
	const prise = await ctx.db
		.query('prisesDeParole')
		.withIndex('by_user_and_cle', (q) => q.eq('userId', userId).eq('cle', cle))
		.first();
	if (prise?.ouverteLe !== undefined) return null;
	const accordee = await paroleAccordee(
		ctx,
		{ organizationId, userId, canal: 'APP', genre: 'semaine', cle },
		maintenant
	);
	if (!accordee) return null;
	const semaine = await lireLaSemaine(ctx, org, maintenant);
	if (semaine === null) return null;
	return {
		debut: semaine.debut,
		rentre: semaine.rentre,
		relancesParties: semaine.relancesParties,
		clientsQuiOntPaye: semaine.clientsQuiOntPaye,
		dateLimiteDansJours: semaine.dateLimiteDansJours
	};
}

/** La carte s'est montrée : la parole s'inscrit, avec son expiration du jeudi. */
export const carteMontree = authedMutation({
	args: { debut: v.string() },
	returns: v.null(),
	handler: async (ctx, { debut }): Promise<null> => {
		const userId = ctx.user._id;
		const organizationId = await organisationCouranteOuNull(ctx, userId);
		if (organizationId === null) return null;
		const jeudi = ajouterJours(debut, JOURS_PAR_SEMAINE + 3);
		await demanderLaParole(ctx, {
			organizationId,
			userId,
			canal: 'APP',
			genre: 'semaine',
			cle: cleDeLaSemaine(organizationId, debut),
			expireLe: Date.parse(`${jeudi}T00:00:00Z`)
		});
		return null;
	}
});

/** L'écran s'est ouvert : la carte disparaît, la parole est suivie d'effet. */
export const semaineVue = authedMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const userId = ctx.user._id;
		const organizationId = await organisationCouranteOuNull(ctx, userId);
		if (organizationId === null) return null;
		await semaineVuePour(ctx, organizationId, userId, Date.now());
		return null;
	}
});

/**
 * Le cœur de `semaineVue`, sans session. Ouvert sans la carte (l'e-mail, un lien), la
 * visite se note pour que la carte ne revienne pas cette semaine — comme une VISITE, que
 * le budget d'attention ne compte pas : c'est la personne qui est venue.
 */
export async function semaineVuePour(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	userId: string,
	maintenant: number
): Promise<void> {
	const cle = cleDeLaSemaine(organizationId, bornesDeLaSemaineEcoulee(maintenant).debut);
	const prise = await ctx.db
		.query('prisesDeParole')
		.withIndex('by_user_and_cle', (q) => q.eq('userId', userId).eq('cle', cle))
		.first();
	if (prise === null) {
		await ctx.db.insert('prisesDeParole', {
			organizationId,
			userId,
			canal: 'APP',
			genre: GENRE_VISITE,
			cle,
			le: maintenant,
			ouverteLe: maintenant
		});
	} else await noterOuverte(ctx, userId, cle, maintenant);
}

/* ── LE LUNDI : L'E-MAIL ET LA NOTIFICATION ─────────────────────────────────── */

function cleDeLEmail(organizationId: Id<'organizations'>, debut: string): string {
	return `semaine-email:${organizationId}:${debut}`;
}

/** Ce que disent la notification et l'objet : en une phrase, sans cadran à zéro. */
/**
 * LE LUNDI, AU PASSAGE DU POINT DU MATIN (`battement.ts`) : « Votre semaine » part à 9 h
 * à qui la reçoit, la notification et son push à qui ne l'a pas coupée. Rend ceux qui
 * la reçoivent par e-mail : le point du matin ne leur part pas. Un seul e-mail.
 */
export async function preparerLeLundi(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	maintenant: number
): Promise<ReadonlySet<string>> {
	const org = await ctx.db.get(organizationId);
	if (org === null) return new Set();
	const semaine = await lireLaSemaine(ctx, org, maintenant);
	if (semaine === null) return new Set();
	const membres = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
		.take(100);
	const cle = cleDeLEmail(organizationId, semaine.debut);
	const repartition = repartirLeLundi(
		await Promise.all(
			membres.map(async (m) => ({
				userId: m.userId,
				pointDuMatin: m.pointDuMatinParCourriel !== false,
				semaineCoupee: m.categoriesCoupees?.includes('SEMAINE') === true,
				paroleAccordee: await paroleAccordee(
					ctx,
					{ organizationId, userId: m.userId, canal: 'EMAIL', genre: 'semaine', cle },
					maintenant
				)
			}))
		),
		false
	);
	// La notification et son push, pour qui ne reçoit pas l'e-mail : un seul canal.
	for (const userId of repartition.notification) {
		await notifier(ctx, {
			organizationId,
			userId,
			type: 'SEMAINE',
			title: 'Votre semaine',
			message: phraseDeLaSemaine(semaine),
			link: '/app/semaine'
		});
	}
	const creneau = prochainCreneauDEnvoi(maintenant);
	for (const userId of repartition.semaine) {
		await ctx.scheduler.runAt(creneau, internal.recouvrement.semaine.envoyerLaSemaine, {
			organizationId,
			userId,
			debut: semaine.debut
		});
	}
	return new Set(repartition.semaine);
}

/**
 * L'E-MAIL « VOTRE SEMAINE », à 9 h. La parole s'inscrit au départ ; une semaine
 * devenue vide entre-temps, ou une clé d'envoi absente, ne fait rien partir.
 */
export const envoyerLaSemaine = internalMutation({
	args: { organizationId: v.id('organizations'), userId: v.string(), debut: v.string() },
	returns: v.null(),
	handler: async (ctx, { organizationId, userId, debut }): Promise<null> => {
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		const maintenant = Date.now();
		const semaine = await lireLaSemaine(ctx, org, maintenant);
		if (semaine === null || semaine.debut !== debut) return null;
		const accordee = await demanderLaParole(
			ctx,
			{
				organizationId,
				userId,
				canal: 'EMAIL',
				genre: 'semaine',
				cle: cleDeLEmail(organizationId, debut)
			},
			maintenant
		);
		if (!accordee) return null;
		const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: '_id', operator: 'eq', value: userId }]
		})) as { email?: string } | null;
		const email = utilisateur?.email;
		if (!email) return null;
		let expediteur: string;
		let url: string;
		try {
			assertResendApiKey();
			expediteur = expediteurNomme(
				requireEnv('AUTH_EMAIL', { feature: 'votre semaine' }),
				'Plume de Letikette'
			);
			url = `${requireEnv('SITE_URL', { feature: 'votre semaine' })}/app/semaine`;
		} catch {
			return null;
		}
		const rangees = rangeesDeLaSemaine(semaine);
		const donnees = {
			nomEntreprise: org.name,
			periode: `la semaine du ${dateLisible(semaine.debut)}`,
			rentreLisible: semaine.rentre > 0n ? enEuros(semaine.rentre) : null,
			meilleure:
				semaine.meilleureDepuis === null
					? null
					: semaine.meilleureDepuis === 'arrivee'
						? 'Votre meilleure semaine depuis votre arrivée.'
						: `Votre meilleure semaine depuis le ${dateLisible(semaine.meilleureDepuis)}.`,
			rangees,
			url
		};
		await resend.sendEmail(ctx, {
			from: expediteur,
			to: email,
			subject: `Votre semaine : ${phraseDeLaSemaine(semaine)}`,
			html: semaineHtml(donnees),
			text: semaineTexte(donnees)
		});
		return null;
	}
});
