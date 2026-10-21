import { v } from 'convex/values';
import { httpAction, internalMutation, type MutationCtx } from '../_generated/server';
import { components, internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { resend } from '../emails/resend';
import { expediteurNomme } from '../emails/helpers';
import {
	conseilHtml,
	conseilTexte,
	objetDuConseil,
	type DonneesConseil
} from '../emails/modeles/conseils';
import {
	CONSEILS_DES_ADMINS,
	prochainConseil,
	type CleConseilEnvoye
} from '../../croissance/conseils';
import { rapportHtml, rapportTexte, OBJET_DU_RAPPORT } from '../emails/modeles/diagnostic';
import { composerRapportDiagnostic } from '../../verticales/recouvrement/rapport-diagnostic';
import { dateLisible } from '../../verticales/recouvrement/calendrier';
import { jourDeParis } from '../../admin/dates';
import { offreDeBienvenue } from '../../paiement/offres';
import { paiementOuvert } from '../billing';
import { PLAN_PAR_DEFAUT, prochainCreneauDEnvoi } from '../../verticales/recouvrement/plan-relance';
import { PARAMETRES, exiger } from '../../verticales/recouvrement/parametres';
import { estEchue } from '../../verticales/recouvrement/exigibilite';
import { additionner, depuisCentimes, versEuros, ZERO } from '../../socle/montants';
import { resteDu } from '../recouvrement/creances';
import { historiqueDeParole } from './attention';
import { peutParler } from '../../croissance/attention';

/**
 * L'ENVOI DES CONSEILS DE PLUME (16/10/2026).
 *
 * Une tâche toutes les quinze minutes prend les parcours dont le rendez-vous est
 * passé (`prochainConseilLe`, index `by_prochain_conseil`), relit le prochain
 * conseil (`croissance/conseils.ts`), attend le créneau (semaine, 9 h-18 h, le
 * même que les relances), compose et envoie. ⚠️ SANS ENVOI CONFIGURÉ, RIEN N'EST
 * NOTÉ ENVOYÉ : on réessaie dans une heure. Chaque e-mail porte son lien de
 * désinscription et l'en-tête `List-Unsubscribe` en un clic (RFC 8058).
 */

const UNE_HEURE = 60 * 60 * 1000;
const LOT = 50;

type Membre = Pick<Doc<'organizationMembers'>, 'userId' | 'conseilsParCourriel'>;

/** Qui reçoit les conseils : les membres qui ne les ont pas coupés et qui ont une adresse. */
export function destinatairesDesConseils(
	membres: readonly Membre[],
	emails: ReadonlyMap<string, string>
): { userId: string; email: string }[] {
	return membres.flatMap((m) => {
		const email = emails.get(m.userId);
		return m.conseilsParCourriel === false || email === undefined
			? []
			: [{ userId: m.userId, email }];
	});
}

function envoiConfigure(): boolean {
	return Boolean(
		process.env.RESEND_API_KEY &&
		process.env.AUTH_EMAIL &&
		process.env.SITE_URL &&
		process.env.CONVEX_SITE_URL
	);
}

/** Les étapes du plan de relance, une phrase chacune, lues sur le plan lui-même. */
export function lignesDuPlan(): string[] {
	return PLAN_PAR_DEFAUT.map((etape, i) =>
		!etape.automatique
			? `${etape.nom}, seulement si vous la décidez`
			: i === 0
				? `${etape.nom}, ${etape.attente} jours après l’échéance`
				: `${etape.nom}, ${etape.attente} jours plus tard`
	);
}

/** Deux lectures de la base, l'une après l'autre. */
async function* fusionner<T>(...flux: AsyncIterable<T>[]): AsyncGenerator<T> {
	for (const f of flux) for await (const element of f) yield element;
}

/** Ce qui est dû sur les factures échues non soldées, et les frais prévus par la loi. */
async function ceQuiEstDu(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	aujourdHui: string
): Promise<NonNullable<DonneesConseil['du']> | undefined> {
	let total = ZERO;
	let factures = 0;
	// La même lecture que la révélation : une facture sans échéance (un FEC) est échue
	// trente jours après sa date (`exigibilite.ts`).
	const echues = ctx.db
		.query('facturesVente')
		.withIndex('by_org_and_echeance', (q) =>
			q.eq('organizationId', organizationId).gt('dateEcheance', '').lt('dateEcheance', aujourdHui)
		);
	const sansEcheance = ctx.db
		.query('facturesVente')
		.withIndex('by_org_and_echeance', (q) =>
			q.eq('organizationId', organizationId).eq('dateEcheance', undefined)
		);
	for await (const facture of fusionner(echues, sansEcheance)) {
		if (!estEchue(facture, aujourdHui)) continue;
		const reste = await resteDu(ctx, facture);
		if ((reste as bigint) <= 0n) continue;
		total = additionner(total, reste);
		factures += 1;
	}
	if (factures === 0) return undefined;
	const unitaire = depuisCentimes(exiger(PARAMETRES.indemniteForfaitaire));
	return {
		montant: `${versEuros(total)} €`,
		factures,
		indemnite: `${versEuros(unitaire)} €`,
		indemniteTotale: `${versEuros(depuisCentimes((unitaire as bigint) * BigInt(factures)))} €`
	};
}

async function envoyerUnConseil(
	ctx: MutationCtx,
	parcours: Doc<'parcoursComptes'>,
	cle: CleConseilEnvoye,
	maintenant: number
): Promise<void> {
	const organizationId = parcours.organizationId;
	const org = await ctx.db.get(organizationId);
	// L'offre de bienvenue parle d'un achat. Relue au moment d'envoyer : un établissement
	// abonné ou à l'essai entre-temps ne la reçoit plus, et rien ne la propose tant que la
	// facturation n'est pas ouverte. Elle est consommée sans partir.
	const offre = CONSEILS_DES_ADMINS.has(cle);
	// La même règle que la caisse (`paiement/offres.ts`) : ouverte, ou rien.
	const ouverte = offre ? offreDeBienvenue(parcours.etapes, maintenant) : null;
	if (
		offre &&
		(org === null ||
			ouverte === null ||
			org.paddleStatus === 'trialing' ||
			org.paddleStatus === 'active' ||
			!paiementOuvert())
	) {
		await ctx.db.insert('envoisCroissance', { organizationId, userId: '', cle, le: maintenant });
		return;
	}
	const membres = (
		await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.collect()
	).filter((m) => !offre || m.role === 'ORG_ADMIN');

	const emails = new Map<string, string>();
	const prenoms = new Map<string, string>();
	for (const membre of membres) {
		const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: '_id', operator: 'eq', value: membre.userId }]
		})) as { email?: string; name?: string } | null;
		if (utilisateur?.email) emails.set(membre.userId, utilisateur.email);
		const prenom = utilisateur?.name?.trim().split(/\s+/)[0];
		if (prenom) prenoms.set(membre.userId, prenom);
	}
	const destinataires = destinatairesDesConseils(membres, emails);

	// Personne à qui l'écrire : le conseil est consommé quand même, pour que la
	// cadence passe au suivant au lieu de revenir chaque quart d'heure.
	if (destinataires.length === 0 || org === null) {
		await ctx.db.insert('envoisCroissance', { organizationId, userId: '', cle, le: maintenant });
		return;
	}

	const site = (process.env.SITE_URL ?? '').replace(/\/$/, '');
	const convexSite = (process.env.CONVEX_SITE_URL ?? '').replace(/\/$/, '');
	const du =
		cle === 'ce-qui-vous-est-du'
			? await ceQuiEstDu(ctx, organizationId, new Date(maintenant).toISOString().slice(0, 10))
			: undefined;
	const expediteur = expediteurNomme(process.env.AUTH_EMAIL ?? '', 'Plume de Letikette');
	const donneesDeLOffre =
		ouverte === null
			? undefined
			: {
					pourcent: ouverte.pourcent,
					mois: ouverte.mois,
					jusquAu: dateLisible(ouverte.dernierJour)
				};

	for (const { userId, email } of destinataires) {
		const membre = membres.find((m) => m.userId === userId);
		let jeton = membre?.jetonConseils;
		if (membre !== undefined && jeton === undefined) {
			jeton = crypto.randomUUID();
			await ctx.db.patch(membre._id, { jetonConseils: jeton });
		}
		const desinscription = `${convexSite}/conseils/desinscription?j=${jeton ?? ''}`;
		const prenom = prenoms.get(userId);
		const donnees: DonneesConseil = {
			cle,
			nomEtablissement: org.name,
			site,
			desinscription,
			...(prenom === undefined ? {} : { prenom }),
			...(du === undefined ? {} : { du }),
			...(cle === 'ce-qui-partirait' ? { plan: lignesDuPlan() } : {}),
			...(donneesDeLOffre === undefined ? {} : { offre: donneesDeLOffre })
		};
		await resend.sendEmail(ctx, {
			from: expediteur,
			to: email,
			subject: objetDuConseil(cle),
			html: conseilHtml(donnees),
			text: conseilTexte(donnees),
			headers: [
				{ name: 'List-Unsubscribe', value: `<${desinscription}>` },
				{ name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
				{ name: 'X-Email-Category', value: 'conseil' }
			]
		});
		await ctx.db.insert('envoisCroissance', { organizationId, userId, cle, le: maintenant });
	}
}

export const envoyerLesConseils = internalMutation({
	args: { maintenant: v.optional(v.number()) },
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const maintenant = args.maintenant ?? Date.now();
		// ⚠️ BORNÉ DES DEUX CÔTÉS : un rendez-vous absent se range avant toutes les
		// valeurs, et une borne `lte` seule ramènerait les parcours sans conseil.
		const dus = await ctx.db
			.query('parcoursComptes')
			.withIndex('by_prochain_conseil', (q) =>
				q.gte('prochainConseilLe', 0).lte('prochainConseilLe', maintenant)
			)
			.take(LOT);

		for (const parcours of dus) {
			const envoyes = (
				await ctx.db
					.query('envoisCroissance')
					.withIndex('by_org', (q) => q.eq('organizationId', parcours.organizationId))
					.collect()
			).map((e) => ({ cle: e.cle, le: e.le }));
			const prochain = prochainConseil(parcours.etapes, envoyes, maintenant);

			if (prochain === null) {
				await ctx.db.patch(parcours._id, { prochainConseilLe: undefined });
				continue;
			}
			if (prochain.des > maintenant) {
				await ctx.db.patch(parcours._id, { prochainConseilLe: prochain.des });
				continue;
			}
			const creneau = prochainCreneauDEnvoi(maintenant);
			if (creneau > maintenant) {
				await ctx.db.patch(parcours._id, { prochainConseilLe: creneau });
				continue;
			}
			if (!envoiConfigure()) {
				await ctx.db.patch(parcours._id, { prochainConseilLe: maintenant + UNE_HEURE });
				continue;
			}
			// LE BUDGET D'ATTENTION (21/10/2026) : un conseil ne part pas sur un e-mail
			// « Votre semaine » ou un réveil de la veille, ni au-delà de deux par semaine.
			const historique = await historiqueDeParole(ctx, parcours.organizationId, null, maintenant);
			if (!peutParler(historique, { canal: 'EMAIL', genre: 'conseil' }, maintenant, new Set()).ok) {
				await ctx.db.patch(parcours._id, { prochainConseilLe: maintenant + 6 * UNE_HEURE });
				continue;
			}

			await envoyerUnConseil(ctx, parcours, prochain.cle, maintenant);
			const suivant = prochainConseil(
				parcours.etapes,
				[...envoyes, { cle: prochain.cle, le: maintenant }],
				maintenant
			);
			await ctx.db.patch(parcours._id, { prochainConseilLe: suivant?.des });
		}
		return null;
	}
});

/** Vingt-quatre essais, une heure d'écart : un jour pour que l'envoi soit configuré. */
const ESSAIS_DU_RAPPORT = 24;

/**
 * LE RAPPORT DU DIAGNOSTIC (19/10/2026, audit, lot 7) : un e-mail TRANSACTIONNEL, la
 * réponse au geste du gérant. Programmé par le relevé quand le diagnostic vient d'être
 * rendu, il part hors du créneau des conseils et sans tenir compte de leur coupure, aux
 * administrateurs, une fois par établissement. Ses chiffres sont ceux de l'écran
 * `/app/diagnostic` (`diagnosticInterne`, `composerRapportDiagnostic`), lus au moment
 * d'envoyer. Il se note comme un conseil : les rappels de l'offre comptent leur
 * cadence à partir de lui.
 */
export const envoyerLeRapport = internalMutation({
	args: { organizationId: v.id('organizations'), essai: v.optional(v.number()) },
	returns: v.null(),
	handler: async (ctx, { organizationId, essai }): Promise<null> => {
		const envois = await ctx.db
			.query('envoisCroissance')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		if (envois.some((e) => e.cle === 'rapport-diagnostic')) return null;
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		if (!envoiConfigure()) {
			const n = (essai ?? 0) + 1;
			if (n <= ESSAIS_DU_RAPPORT) {
				await ctx.scheduler.runAfter(UNE_HEURE, internal.croissance.conseils.envoyerLeRapport, {
					organizationId,
					essai: n
				});
			}
			return null;
		}
		const maintenant = Date.now();
		const admins = (
			await ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
				.collect()
		).filter((m) => m.role === 'ORG_ADMIN');
		const destinataires: { userId: string; email: string; prenom?: string }[] = [];
		for (const membre of admins) {
			const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: 'user',
				where: [{ field: '_id', operator: 'eq', value: membre.userId }]
			})) as { email?: string; name?: string } | null;
			if (!utilisateur?.email) continue;
			const prenom = utilisateur.name?.trim().split(/\s+/)[0];
			destinataires.push({
				userId: membre.userId,
				email: utilisateur.email,
				...(prenom ? { prenom } : {})
			});
		}
		if (destinataires.length === 0) {
			await ctx.db.insert('envoisCroissance', {
				organizationId,
				userId: '',
				cle: 'rapport-diagnostic',
				le: maintenant
			});
			return null;
		}
		const diagnostic = await ctx.runQuery(internal.recouvrement.revelation.diagnosticInterne, {
			organizationId,
			arreteAu: jourDeParis(maintenant)
		});
		const rapport = composerRapportDiagnostic(diagnostic, org.name);
		const site = (process.env.SITE_URL ?? '').replace(/\/$/, '');
		const expediteur = expediteurNomme(process.env.AUTH_EMAIL ?? '', 'Plume de Letikette');
		for (const { userId, email, prenom } of destinataires) {
			const donnees = {
				...(prenom === undefined ? {} : { prenom }),
				nomEtablissement: org.name,
				site,
				periode: rapport.periode,
				compteAu: rapport.compteAu,
				enJeu: rapport.enJeu,
				encoreDues: {
					factures: diagnostic.impayees.nombreFactures,
					montant: `${versEuros(depuisCentimes(diagnostic.impayees.principal))} €`
				},
				payeesEnRetard: diagnostic.payeesEnRetard.nombreFactures,
				nonChiffrees: diagnostic.nonChiffrees.length,
				hypotheses: rapport.hypotheses,
				avertissement: rapport.avertissement
			};
			await resend.sendEmail(ctx, {
				from: expediteur,
				to: email,
				subject: OBJET_DU_RAPPORT,
				html: rapportHtml(donnees),
				text: rapportTexte(donnees),
				headers: [{ name: 'X-Email-Category', value: 'diagnostic' }]
			});
			await ctx.db.insert('envoisCroissance', {
				organizationId,
				userId,
				cle: 'rapport-diagnostic',
				le: maintenant
			});
		}
		const parcours = await ctx.db
			.query('parcoursComptes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		if (parcours !== null) {
			const prochain = prochainConseil(
				parcours.etapes,
				[
					...envois.map((e) => ({ cle: e.cle, le: e.le })),
					{ cle: 'rapport-diagnostic' as const, le: maintenant }
				],
				maintenant
			);
			await ctx.db.patch(parcours._id, { prochainConseilLe: prochain?.des });
		}
		return null;
	}
});

/** Coupe les conseils du membre qui porte ce jeton. Silencieux sur un jeton inconnu. */
export const desinscrire = internalMutation({
	args: { jeton: v.string() },
	returns: v.null(),
	handler: async (ctx, { jeton }): Promise<null> => {
		if (jeton === '') return null;
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_jeton_conseils', (q) => q.eq('jetonConseils', jeton))
			.first();
		if (membre !== null) await ctx.db.patch(membre._id, { conseilsParCourriel: false });
		return null;
	}
});

function page(corps: string): Response {
	return new Response(
		`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Les conseils de Plume</title></head><body style="margin:0;padding:48px 20px;background:#f7f0e5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1b253f"><div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e8e1d5;border-radius:20px;padding:32px">${corps}</div></body></html>`,
		{ status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
	);
}

/**
 * LE LIEN DE DÉSINSCRIPTION. ⚠️ UN GET NE DÉSINSCRIT PAS : les antivirus ouvrent
 * les liens des e-mails à la place des gens. Il montre une page avec un bouton ;
 * le POST (ce bouton, ou le clic unique des messageries, RFC 8058) désinscrit.
 * La réponse est la même pour un jeton inconnu : elle ne révèle rien.
 */
export const desinscriptionConseils = httpAction(async (ctx, requete): Promise<Response> => {
	const jeton = new URL(requete.url).searchParams.get('j') ?? '';
	if (requete.method === 'GET') {
		return page(
			`<h1 style="margin:0 0 12px;font-size:22px">Ne plus recevoir les conseils de Plume ?</h1><p style="margin:0 0 20px;line-height:1.6;color:#3f485b">Vous recevrez toujours les e-mails liés à votre compte et à votre abonnement.</p><form method="post"><button type="submit" style="border:0;border-radius:999px;background:#1b253f;color:#f7f0e5;padding:14px 26px;font-size:15px;font-weight:700;cursor:pointer">Ne plus les recevoir</button></form>`
		);
	}
	await ctx.runMutation(internal.croissance.conseils.desinscrire, { jeton: jeton.slice(0, 100) });
	return page(
		`<h1 style="margin:0 0 12px;font-size:22px">C’est noté.</h1><p style="margin:0;line-height:1.6;color:#3f485b">Plume ne vous enverra plus de conseils. Vous pouvez les réactiver dans Votre compte, puis Votre profil.</p>`
	);
});
