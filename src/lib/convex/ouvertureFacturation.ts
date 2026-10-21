import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { components } from './_generated/api';
import { resend, assertResendApiKey } from './emails/resend';
import { rappelAbonnementHtml, rappelAbonnementTexte } from './emails/modeles/abonnement';
import { requireEnv } from './env';
import { DUREE_ESSAI_JOURS, FORMULES, GRILLE } from '../config/tarifs';
import { expediteurNomme } from './emails/helpers';
import { notifier } from './notifier';

/**
 * L'OUVERTURE DE LA FACTURATION — le préavis aux comptes qui existent déjà
 * (14/10/2026).
 *
 * Deux engagements écrits avant que rien ne se paie : l'écran disait « nous
 * revenons vers vous avant toute facturation », et l'article 16 des conditions
 * générales annonce toute modification substantielle trente jours avant. Avant de
 * poser `PADDLE_FACTURATION_OUVERTE=oui`, le fondateur lance donc, une fois :
 *
 *   npx convex run --prod ouvertureFacturation:prevenir                    lecture seule
 *   npx convex run --prod ouvertureFacturation:prevenir '{"envoyer":true}' prévient
 *
 * Chaque établissement sans abonnement reçoit trente jours d'ACCÈS OFFERT
 * (`freeTrialEndsAt`, relu comme Équipe par `resolveEffectivePlan`) : rien ne
 * se ferme le jour de l'ouverture. Ses administrateurs reçoivent une
 * notification et un e-mail : la date, les formules, et que rien ne sera
 * prélevé sans qu'ils l'aient choisie. Un établissement déjà prévenu ne l'est
 * pas deux fois (`rappelsAbonnement` porte « preavis-ouverture »). Les
 * établissements se lisent par pages de cinq cents : tant que `suite` n'est pas
 * `null`, relancer avec `{"envoyer":true,"curseur":"<suite>"}`.
 */
const CLE = 'preavis-ouverture';

/** Le texte du préavis, le même dans la notification et dans l'e-mail (et dans `emails/essai.ts`). */
export function texteDuPreavis(date: string): { titre: string; message: string } {
	const formules = FORMULES.map((f) => `${GRILLE[f].nom} ${GRILLE[f].mensuel} €`).join(', ');
	return {
		titre: 'Le paiement en ligne ouvre sur Letikette',
		message:
			`Jusqu’ici, tout vous était ouvert sans rien payer. Le paiement en ligne ouvre : votre accès reste entier jusqu’au ${date}. ` +
			`D’ici là, choisissez votre formule dans Compte, puis Abonnement (${formules} HT par mois, TVA en plus, l’année à dix mois) : rien ne sera prélevé sans que vous l’ayez choisie. ` +
			`Les conditions générales évoluent avec elle (version 2.3) ; si vous les refusez, vous pouvez résilier sans frais jusqu’au ${date}.`
	};
}
const LOT = 500;

export const prevenir = internalMutation({
	args: { envoyer: v.optional(v.boolean()), curseur: v.optional(v.union(v.string(), v.null())) },
	returns: v.object({
		etablissements: v.number(),
		deja: v.number(),
		jusquAu: v.string(),
		envoye: v.boolean(),
		suite: v.union(v.string(), v.null())
	}),
	handler: async (
		ctx,
		{ envoyer, curseur }
	): Promise<{
		etablissements: number;
		deja: number;
		jusquAu: string;
		envoye: boolean;
		suite: string | null;
	}> => {
		const finDuPreavis = Date.now() + DUREE_ESSAI_JOURS * 24 * 60 * 60 * 1000;
		const date = new Date(finDuPreavis).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'Europe/Paris'
		});
		const page = await ctx.db
			.query('organizations')
			.paginate({ numItems: LOT, cursor: curseur ?? null });
		const organisations = page.page;
		const suite = page.isDone ? null : page.continueCursor;
		const aPrevenir = organisations.filter(
			(o) =>
				o.paddleStatus !== 'active' &&
				o.paddleStatus !== 'trialing' &&
				!(o.rappelsAbonnement ?? []).includes(CLE)
		);
		const deja = organisations.length - aPrevenir.length;
		if (envoyer !== true) {
			return { etablissements: aPrevenir.length, deja, jusquAu: date, envoye: false, suite };
		}

		const { titre, message } = texteDuPreavis(date);

		let email: { expediteur: string; url: string } | null;
		try {
			assertResendApiKey();
			email = {
				expediteur: expediteurNomme(
					requireEnv('AUTH_EMAIL', { feature: 'ouverture de la facturation' })
				),
				url: `${requireEnv('SITE_URL', { feature: 'ouverture de la facturation' })}/app/compte?ouvrir=facturation`
			};
		} catch {
			email = null;
		}

		for (const org of aPrevenir) {
			await ctx.db.patch(org._id, {
				freeTrialEndsAt: Math.max(org.freeTrialEndsAt ?? 0, finDuPreavis),
				rappelsAbonnement: [...(org.rappelsAbonnement ?? []), CLE]
			});
			const admins = (
				await ctx.db
					.query('organizationMembers')
					.withIndex('by_organization', (q) => q.eq('organizationId', org._id))
					.collect()
			).filter((m) => m.role === 'ORG_ADMIN');
			for (const admin of admins) {
				await notifier(ctx, {
					organizationId: org._id,
					userId: admin.userId,
					type: 'ABONNEMENT',
					title: titre,
					message,
					link: '/app/compte?ouvrir=facturation'
				});
				if (email === null) continue;
				const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
					model: 'user',
					where: [{ field: '_id', operator: 'eq', value: admin.userId }]
				})) as { email?: string } | null;
				if (!utilisateur?.email) continue;
				const donnees = { nomEntreprise: org.name, titre, message, url: email.url };
				await resend.sendEmail(ctx, {
					from: email.expediteur,
					to: utilisateur.email,
					subject: titre,
					html: rappelAbonnementHtml(donnees),
					text: rappelAbonnementTexte(donnees)
				});
			}
		}
		return { etablissements: aPrevenir.length, deja, jusquAu: date, envoye: true, suite };
	}
});
