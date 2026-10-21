import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { components, internal } from '../_generated/api';
import { demanderLaParole, paroleAccordee } from '../croissance/attention';
import { requireEnv } from '../env';
import { assertResendApiKey, resend } from '../emails/resend';
import { expediteurNomme } from '../emails/helpers';
import { reveilHtml, reveilTexte } from '../emails/modeles/reveil';
import { estRentre } from './jalons';
import { dateLimiteLaPlusProche } from './semaine';
import { jourDeParis } from '../../verticales/recouvrement/compagnon/journee';
import { prochainCreneauDEnvoi } from '../../verticales/recouvrement/plan-relance';
import {
	absenceAssezLongue,
	composerLeReveil,
	quelqueChoseDeVrai,
	type FaitsDuReveil
} from '../../verticales/recouvrement/reveil';

/**
 * LE RÉVEIL UTILE, LU EN BASE ET ENVOYÉ (21/10/2026, le parcours de l'habitude, moment 8).
 * Le module pur décide et dit (`verticales/recouvrement/reveil.ts`) ; ici : la dernière
 * visite d'une personne (la journée de Plume), ce qui s'est passé depuis, et UN e-mail
 * par absence, au créneau de 9 h, dans le budget d'attention.
 *
 * ⚠️ UN SEUL E-MAIL PAR ABSENCE : la clé porte l'heure de la dernière visite. Une visite
 * en pose une autre, rien n'est à remettre à zéro.
 *
 * ⚠️ RIEN ICI N'ÉCRIT LA VISITE : ce serait effacer l'absence qu'on raconte.
 */

/** La dernière visite connue d'une personne dans un établissement, ou `null`. */
export async function derniereVisite(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	userId: string
): Promise<number | null> {
	const recentes = await ctx.db
		.query('journeesPlume')
		.withIndex('by_org_and_user_and_jour', (q) =>
			q.eq('organizationId', organizationId).eq('userId', userId)
		)
		.order('desc')
		.take(14);
	return recentes.find((ligne) => ligne.vueLe !== undefined)?.vueLe ?? null;
}

/** Ce qui s'est passé depuis `depuis` : les paiements, les relances, la date limite. */
export async function faitsDepuis(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	depuis: number,
	maintenant: number
): Promise<FaitsDuReveil> {
	const reglements = (
		await ctx.db
			.query('reglements')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(300)
	).filter((r) => r.creeLe > depuis && estRentre(r));
	const clients = new Set<string>();
	for (const r of reglements) {
		const facture = await ctx.db.get(r.factureId);
		clients.add(facture?.debiteurId ?? r.factureId);
	}
	const relances = (
		await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'PARTI')
			)
			.order('desc')
			.take(300)
	).filter(
		(e) =>
			(e.modele === 'RAPPEL' || e.modele === 'RELANCE_OFFICIELLE') &&
			(e.valideLe ?? (e.partiLe === undefined ? 0 : Date.parse(`${e.partiLe}T12:00:00Z`))) > depuis
	);
	return {
		paiements: reglements.length,
		clientsQuiOntPaye: clients.size,
		rentre: reglements.reduce((total, r) => total + r.montant, 0n),
		relancesParties: relances.length,
		dateLimiteDansJours: await dateLimiteLaPlusProche(ctx, organizationId, jourDeParis(maintenant))
	};
}

function cleDuReveil(organizationId: Id<'organizations'>, depuis: number): string {
	return `reveil:${organizationId}:${depuis}`;
}

async function dejaDit(ctx: QueryCtx, userId: string, cle: string): Promise<boolean> {
	const prise = await ctx.db
		.query('prisesDeParole')
		.withIndex('by_user_and_cle', (q) => q.eq('userId', userId).eq('cle', cle))
		.first();
	return prise !== null;
}

/**
 * LE CŒUR DE LA PRÉPARATION, sans horloge : ce que les tests appellent. Programme, pour
 * chaque personne absente depuis quatorze jours à qui il est arrivé quelque chose de
 * vrai, l'e-mail du prochain créneau. Le week-end, rien : lundi, le passage du jour s'en
 * charge (et « Votre semaine » passe d'abord).
 */
export async function preparerLesReveilsPour(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	exclus: readonly string[],
	maintenant: number
): Promise<number> {
	const creneau = prochainCreneauDEnvoi(maintenant);
	if (jourDeParis(creneau) !== jourDeParis(maintenant)) return 0;
	const membres = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
		.take(100);
	let programmes = 0;
	for (const membre of membres) {
		// Les e-mails de Plume coupés (le profil, ou le lien d'un conseil) coupent aussi celui-ci.
		if (exclus.includes(membre.userId) || membre.conseilsParCourriel === false) continue;
		const depuis = await derniereVisite(ctx, organizationId, membre.userId);
		if (depuis === null || !absenceAssezLongue(depuis, maintenant)) continue;
		const cle = cleDuReveil(organizationId, depuis);
		if (await dejaDit(ctx, membre.userId, cle)) continue;
		const faits = await faitsDepuis(ctx, organizationId, depuis, maintenant);
		if (!quelqueChoseDeVrai(faits)) continue;
		const accordee = await paroleAccordee(
			ctx,
			{ organizationId, userId: membre.userId, canal: 'EMAIL', genre: 'reveil', cle },
			creneau
		);
		if (!accordee) continue;
		await ctx.scheduler.runAt(creneau, internal.recouvrement.reveil.envoyerLeReveil, {
			organizationId,
			userId: membre.userId,
			depuis
		});
		programmes += 1;
	}
	return programmes;
}

/** Chaque nuit, au passage du point du matin (`battement.ts`), dans sa propre transaction. */
export const preparerLesReveils = internalMutation({
	args: { organizationId: v.id('organizations'), exclus: v.array(v.string()) },
	returns: v.null(),
	handler: async (ctx, { organizationId, exclus }): Promise<null> => {
		await preparerLesReveilsPour(ctx, organizationId, exclus, Date.now());
		return null;
	}
});

/**
 * L'E-MAIL DU RÉVEIL, au créneau. Revenu entre-temps, devenu sans objet, déjà dit, ou le
 * budget plein : rien ne part. Une clé d'envoi absente ne fait rien partir non plus.
 */
export const envoyerLeReveil = internalMutation({
	args: { organizationId: v.id('organizations'), userId: v.string(), depuis: v.number() },
	returns: v.null(),
	handler: async (ctx, { organizationId, userId, depuis }): Promise<null> => {
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		if ((await derniereVisite(ctx, organizationId, userId)) !== depuis) return null;
		const cle = cleDuReveil(organizationId, depuis);
		if (await dejaDit(ctx, userId, cle)) return null;
		const maintenant = Date.now();
		const faits = await faitsDepuis(ctx, organizationId, depuis, maintenant);
		if (!quelqueChoseDeVrai(faits)) return null;
		const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: '_id', operator: 'eq', value: userId }]
		})) as { email?: string } | null;
		const email = utilisateur?.email;
		if (!email) return null;
		let expediteur: string;
		let site: string;
		try {
			assertResendApiKey();
			expediteur = expediteurNomme(
				requireEnv('AUTH_EMAIL', { feature: 'réveil utile' }),
				'Plume de Letikette'
			);
			site = requireEnv('SITE_URL', { feature: 'réveil utile' }).replace(/\/$/, '');
		} catch {
			return null;
		}
		const accordee = await demanderLaParole(
			ctx,
			{ organizationId, userId, canal: 'EMAIL', genre: 'reveil', cle },
			maintenant
		);
		if (!accordee) return null;

		// Le lien en un clic des e-mails de Plume, comme les conseils.
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', userId)
			)
			.unique();
		let jeton = membre?.jetonConseils;
		if (membre !== null && jeton === undefined) {
			jeton = crypto.randomUUID();
			await ctx.db.patch(membre._id, { jetonConseils: jeton });
		}
		const convexSite = (process.env.CONVEX_SITE_URL ?? '').replace(/\/$/, '');
		const desinscription = `${convexSite}/conseils/desinscription?j=${jeton ?? ''}`;
		const { phrase, rangees } = composerLeReveil(faits);
		const donnees = {
			nomEntreprise: org.name,
			phrase,
			rangees,
			url: `${site}/app`,
			desinscription
		};
		await resend.sendEmail(ctx, {
			from: expediteur,
			to: email,
			subject: phrase,
			html: reveilHtml(donnees),
			text: reveilTexte(donnees),
			headers: [
				{ name: 'List-Unsubscribe', value: `<${desinscription}>` },
				{ name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' }
			]
		});
		return null;
	}
});
