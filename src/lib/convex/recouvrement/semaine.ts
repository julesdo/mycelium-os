import { v } from 'convex/values';
import type { QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { organisationCouranteOuNull } from '../lib/auth';
import { demanderLaParole, noterOuverte, paroleAccordee } from '../croissance/attention';
import { ajouterJours, ecartJours } from '../../verticales/recouvrement/calendrier';
import { jourDeParis } from '../../verticales/recouvrement/compagnon/journee';
import { prescriptionDe } from '../../verticales/recouvrement/pays/france/prescription';
import {
	bornesDeLaSemaineEcoulee,
	composerLaSemaine,
	lundiDe,
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

export function cleDeLaSemaine(debut: string): string {
	return `semaine:${debut}`;
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

	const reglements = (
		await ctx.db
			.query('reglements')
			.withIndex('by_org_and_date', (q) =>
				q.eq('organizationId', org._id).gte('date', depuis).lte('date', fin)
			)
			.take(5000)
	).filter(
		(r) => (r.nature === 'PAIEMENT' || r.nature === 'ACOMPTE') && r.dateSource !== 'LECTURE'
	);

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

	const parties = await ctx.db
		.query('envois')
		.withIndex('by_org_and_etat', (q) => q.eq('organizationId', org._id).eq('etat', 'PARTI'))
		.take(1000);

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
		const maintenant = Date.now();
		if (jourDeLaSemaine(maintenant) > 3) return null;
		const organizationId = await organisationCouranteOuNull(ctx, userId);
		if (organizationId === null) return null;
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
		const { debut } = bornesDeLaSemaineEcoulee(maintenant);
		const cle = cleDeLaSemaine(debut);
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
});

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
			cle: cleDeLaSemaine(debut),
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
		const maintenant = Date.now();
		const cle = cleDeLaSemaine(bornesDeLaSemaineEcoulee(maintenant).debut);
		const prise = await ctx.db
			.query('prisesDeParole')
			.withIndex('by_user_and_cle', (q) => q.eq('userId', userId).eq('cle', cle))
			.first();
		if (prise === null) {
			// Ouvert sans la carte (l'e-mail, un lien) : la carte ne reviendra pas cette semaine.
			await ctx.db.insert('prisesDeParole', {
				organizationId,
				userId,
				canal: 'APP',
				genre: 'semaine',
				cle,
				le: maintenant,
				ouverteLe: maintenant
			});
		} else await noterOuverte(ctx, userId, cle, maintenant);
		return null;
	}
});
