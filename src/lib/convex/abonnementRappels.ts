import { v } from 'convex/values';
import { internalMutation, type MutationCtx } from './_generated/server';
import { components, internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { paiementOuvert } from './billing';
import { resend, assertResendApiKey } from './emails/resend';
import { rappelAbonnementHtml, rappelAbonnementTexte } from './emails/modeles/abonnement';
import { requireEnv } from './env';
import { DUREE_ESSAI_JOURS, type Formule, type Rythme } from '../config/tarifs';
import {
	rappelsDus,
	texteDuRappel,
	type EtatPourRappels,
	type RappelDu
} from '../paiement/rappels';
import { expediteurNomme } from './emails/helpers';

/**
 * LES RAPPELS D'ABONNEMENT, CHAQUE MATIN (14/10/2026).
 *
 * Le prélèvement ne surprend jamais : à J-7 de la fin de l'essai, Plume fait le
 * point dans la boîte de réception ; à J-2, une notification et un e-mail ;
 * trente jours avant un renouvellement annuel, les mêmes. Ce qui est dû se
 * décide dans `paiement/rappels.ts`, testé ; ici, on lit, on envoie, et on
 * note la clé du rappel sur l'établissement (`rappelsAbonnement`) pour ne
 * jamais l'envoyer deux fois.
 *
 * Rien ne part tant que la facturation n'est pas ouverte (`paiementOuvert`).
 */
export const rappelerTous = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		if (!paiementOuvert()) return null;
		const maintenant = Date.now();
		for (const statut of ['trialing', 'active'] as const) {
			const organisations = await ctx.db
				.query('organizations')
				.withIndex('by_paddle_status', (q) => q.eq('paddleStatus', statut))
				.collect();
			for (const org of organisations) {
				const dus = rappelsDus(etatDe(org), maintenant);
				if (dus.length === 0) continue;
				await ctx.scheduler.runAfter(0, internal.abonnementRappels.rappeler, {
					organizationId: org._id,
					cles: dus.map((d) => d.cle)
				});
			}
		}
		return null;
	}
});

function etatDe(org: Doc<'organizations'>): EtatPourRappels {
	const formule: Formule | null =
		org.paddlePlanTier === 'suivi'
			? 'solo'
			: org.paddlePlanTier === 'procedures'
				? 'equipe'
				: (org.paddlePlanTier ?? null);
	return {
		statut: org.paddleStatus ?? null,
		formule,
		rythme: (org.paddleRythme ?? null) as Rythme | null,
		essaiFinLe: org.paddleEssaiFinLe ?? null,
		prochainPrelevementLe: org.paddleProchainPrelevementLe ?? null,
		resiliationLe: org.paddleResiliationLe ?? null,
		deja: org.rappelsAbonnement ?? []
	};
}

/**
 * Un établissement : le rappel le plus urgent part, tous ceux qui étaient dus
 * sont notés (un essai souscrit à cinq jours de la fin ne reçoit pas le point de
 * J-7 puis le rappel de J-2 le même matin).
 */
export const rappeler = internalMutation({
	args: { organizationId: v.id('organizations'), cles: v.array(v.string()) },
	returns: v.null(),
	handler: async (ctx, { organizationId, cles }): Promise<null> => {
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		const etat = etatDe(org);
		// Relu au moment d'envoyer : une résiliation, ou un rappel parti entre-temps.
		const dus = rappelsDus(etat, Date.now()).filter((d) => cles.includes(d.cle));
		const rappel = dus[0];
		if (rappel === undefined || etat.formule === null || etat.rythme === null) return null;

		// Le montant du prix que l'établissement paie, pas celui de la grille du jour.
		const prixSouscrit =
			org.paddlePrixId === undefined
				? null
				: await ctx.db
						.query('prixPaddle')
						.withIndex('by_prix', (q) => q.eq('prixId', org.paddlePrixId!))
						.first();
		const texte = texteDuRappel(
			rappel,
			etat.formule,
			etat.rythme,
			await bilanDe(ctx, org, rappel),
			prixSouscrit?.montant ?? null
		);
		const admins = (
			await ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
				.collect()
		).filter((m) => m.role === 'ORG_ADMIN');

		for (const admin of admins) {
			await ctx.db.insert('notifications', {
				organizationId,
				userId: admin.userId,
				type: 'ABONNEMENT',
				title: texte.titre,
				message: texte.message,
				link: '/app/compte?ouvrir=facturation',
				isRead: false,
				createdAt: Date.now()
			});
		}

		if (rappel.email) await envoyerLesEmails(ctx, org, admins, texte);

		await ctx.db.patch(organizationId, {
			rappelsAbonnement: [...etat.deja, ...dus.map((d) => d.cle)]
		});
		return null;
	}
});

/** Ce qui s'est passé depuis le début de l'essai : relances parties, sommes rentrées. */
async function bilanDe(
	ctx: MutationCtx,
	org: Doc<'organizations'>,
	rappel: RappelDu
): Promise<{ relancesParties: number; rentre: bigint }> {
	const depuis = new Date(rappel.date - DUREE_ESSAI_JOURS * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
	const parties = await ctx.db
		.query('envois')
		.withIndex('by_org_and_etat', (q) => q.eq('organizationId', org._id).eq('etat', 'PARTI'))
		.collect();
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_org_and_date', (q) => q.eq('organizationId', org._id).gte('date', depuis))
		.collect();
	return {
		relancesParties: parties.filter((e) => (e.partiLe ?? '') >= depuis).length,
		rentre: reglements.reduce((total, r) => total + r.montant, 0n)
	};
}

/**
 * ⚠️ UN E-MAIL QUI NE PEUT PAS PARTIR N'EMPÊCHE PAS LA NOTIFICATION. Sans clé
 * Resend ou sans adresse d'envoi, le rappel reste dans la boîte de réception,
 * et il est noté : on ne le renverra pas le lendemain en double.
 */
async function envoyerLesEmails(
	ctx: MutationCtx,
	org: Doc<'organizations'>,
	admins: readonly Doc<'organizationMembers'>[],
	texte: { titre: string; message: string }
): Promise<void> {
	let expediteur: string;
	let url: string;
	try {
		assertResendApiKey();
		expediteur = expediteurNomme(requireEnv('AUTH_EMAIL', { feature: 'rappels d’abonnement' }));
		url = `${requireEnv('SITE_URL', { feature: 'rappels d’abonnement' })}/app/compte?ouvrir=facturation`;
	} catch {
		return;
	}
	for (const admin of admins) {
		const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: '_id', operator: 'eq', value: admin.userId }]
		})) as { email?: string } | null;
		if (!utilisateur?.email) continue;
		const donnees = { nomEntreprise: org.name, titre: texte.titre, message: texte.message, url };
		await resend.sendEmail(ctx, {
			from: expediteur,
			to: utilisateur.email,
			subject: texte.titre,
			html: rappelAbonnementHtml(donnees),
			text: rappelAbonnementTexte(donnees)
		});
	}
}
