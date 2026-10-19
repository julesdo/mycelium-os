import { v } from 'convex/values';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { components, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { deduireEtapes, type EtatDuCompte, type FormuleVue } from '../../croissance/etapes';
import { SEUIL_APPELER, calculerScore } from '../../croissance/score';
import { prochainConseil } from '../../croissance/conseils';
import { estEchue } from '../../verticales/recouvrement/exigibilite';

/**
 * LE RELEVÉ DES ÉTAPES (16/10/2026) — l'état d'un établissement, lu tel qu'il est.
 *
 * Appelé après la création de l'établissement, la fin d'un dépôt et l'activation
 * des relances (sans rien bloquer : `runAfter(0)`), et chaque nuit pour tous, ce
 * qui rattrape les connexions et l'abonnement sans toucher au code de facturation.
 * La décision (quelles étapes, quel score, quel conseil) vit dans
 * `src/lib/croissance/` ; ce fichier ne fait que lire la base et écrire le parcours.
 */

const FORMULES: readonly string[] = ['solo', 'equipe', 'pro'];

type Releve = EtatDuCompte & { readonly factures: number; readonly membres: number };

/**
 * Une facture échue et pas soldée existe-t-elle ? La lecture est celle de tout ce qui
 * mesure (`verticales/recouvrement/exigibilite.ts`) : une facture sans échéance (un FEC)
 * est échue trente jours après sa date, comme dans la révélation. ⚠️ L'INDEX EST BORNÉ
 * DES DEUX CÔTÉS pour les échéances connues ; les factures sans échéance se lisent à part
 * (`eq(undefined)`). On s'arrête à la première trouvée.
 */
export async function factureEchueImpayee(
	ctx: Pick<MutationCtx, 'db'>,
	organizationId: Id<'organizations'>,
	aujourdHui: string
): Promise<boolean> {
	const echues = ctx.db
		.query('facturesVente')
		.withIndex('by_org_and_echeance', (q) =>
			q.eq('organizationId', organizationId).gt('dateEcheance', '').lt('dateEcheance', aujourdHui)
		);
	for await (const facture of echues) {
		if (estEchue(facture, aujourdHui)) return true;
	}
	const sansEcheance = ctx.db
		.query('facturesVente')
		.withIndex('by_org_and_echeance', (q) =>
			q.eq('organizationId', organizationId).eq('dateEcheance', undefined)
		);
	for await (const facture of sansEcheance) {
		if (estEchue(facture, aujourdHui)) return true;
	}
	return false;
}

/** La première lecture lancée (un dépôt, une connexion qui lit) et la première facture entrée. */
async function datesDuDiagnostic(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>
): Promise<{ lanceLe: number | null; renduLe: number | null }> {
	const premierDepot = await ctx.db
		.query('importsRecouvrement')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	const qonto = await ctx.db
		.query('connexionsQonto')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	const nango = await ctx.db
		.query('connexionsNango')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	const lancements = [
		premierDepot?.deposeLe,
		qonto?.synchroDebuteeLe ?? qonto?.derniereSynchro,
		nango?.lectureDebuteeLe ?? nango?.derniereSynchro
	].filter((t): t is number => t !== undefined);
	const premiereFacture = await ctx.db
		.query('facturesVente')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	return {
		lanceLe: lancements.length === 0 ? null : Math.min(...lancements),
		renduLe: premiereFacture?.creeLe ?? null
	};
}

async function etatDuCompte(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	aujourdHui: string
): Promise<Releve | null> {
	const org = await ctx.db.get(organizationId);
	if (org === null) return null;

	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	const depots = await ctx.db
		.query('importsRecouvrement')
		.withIndex('by_org_and_statut', (q) =>
			q.eq('organizationId', organizationId).eq('statut', 'TERMINE')
		)
		.collect();
	const premierDepotLe = depots.reduce<number | null>((premier, d) => {
		const le = d.termineLe ?? d._creationTime;
		return premier === null || le < premier ? le : premier;
	}, null);
	const factures = (
		await ctx.db
			.query('facturesVente')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.take(101)
	).length;
	const pilote = await ctx.db
		.query('pilotes')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	const membres = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
		.collect();
	const visite = await ctx.db
		.query('journeesPlume')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.order('desc')
		.first();

	// Les étages d'avant le 14/10/2026 se relisent comme Solo et Équipe (`billing.ts`).
	const tier =
		org.paddlePlanTier === 'suivi'
			? 'solo'
			: org.paddlePlanTier === 'procedures'
				? 'equipe'
				: org.paddlePlanTier;
	const relancesActives = pilote?.envoiAutomatique === true;

	const diagnostic = await datesDuDiagnostic(ctx, organizationId);

	return {
		creeLe: org.createdAt,
		sirenConnu: (profil?.siren ?? '') !== '',
		premierDepotLe,
		diagnosticLanceLe: diagnostic.lanceLe,
		diagnosticRenduLe: diagnostic.renduLe,
		factureEchueImpayee: await factureEchueImpayee(ctx, organizationId, aujourdHui),
		relancesActiveesLe: pilote?.activeLe ?? (relancesActives ? pilote._creationTime : null),
		relancesActives,
		statutPaiement: org.paddleStatus ?? null,
		formule: tier !== undefined && FORMULES.includes(tier) ? (tier as FormuleVue) : null,
		rythme: org.paddleRythme ?? null,
		resiliationPrevue: org.paddleResiliationLe !== undefined && org.paddleStatus === 'active',
		derniereActivite: Math.max(visite?.vueLe ?? 0, premierDepotLe ?? 0, org.createdAt),
		factures,
		membres: membres.length
	};
}

/**
 * LE RAPPROCHEMENT D'UN PROSPECT AVEC LE COMPTE QUI S'INSCRIT : par le SIREN de
 * l'établissement, sinon par l'adresse d'un de ses membres. Trouvé, le prospect
 * passe « Inscrit » et pointe vers le compte.
 */
async function rapprocher(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>
): Promise<Id<'prospects'> | undefined> {
	// Sans aucun prospect, rien à rapprocher : on n'interroge personne.
	if ((await ctx.db.query('prospects').first()) === null) return undefined;
	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	let prospect =
		profil?.siren === undefined || profil.siren === ''
			? null
			: await ctx.db
					.query('prospects')
					.withIndex('by_siren', (q) => q.eq('siren', profil.siren))
					.first();
	if (prospect === null) {
		for (const membre of await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.take(20)) {
			const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: 'user',
				where: [{ field: '_id', operator: 'eq', value: membre.userId }]
			})) as { email?: string } | null;
			const email = utilisateur?.email?.trim().toLowerCase();
			if (!email) continue;
			prospect = await ctx.db
				.query('prospects')
				.withIndex('by_email', (q) => q.eq('email', email))
				.first();
			if (prospect !== null) break;
		}
	}
	if (prospect === null || prospect.compteId !== undefined) return undefined;
	await ctx.db.patch(prospect._id, { statut: 'INSCRIT', compteId: organizationId });
	await ctx.db.insert('evenementsCrm', {
		prospectId: prospect._id,
		type: 'STATUT',
		texte: 'INSCRIT',
		auteur: 'machine',
		le: Date.now()
	});
	return prospect._id;
}

export const releverLesEtapes = internalMutation({
	args: { organizationId: v.id('organizations') },
	returns: v.null(),
	handler: async (ctx, { organizationId }): Promise<null> => {
		const maintenant = Date.now();
		const etat = await etatDuCompte(
			ctx,
			organizationId,
			new Date(maintenant).toISOString().slice(0, 10)
		);
		if (etat === null) return null;

		const parcours = await ctx.db
			.query('parcoursComptes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const memoire = deduireEtapes(
			etat,
			parcours === null
				? { etapes: {} }
				: {
						etapes: parcours.etapes,
						...(parcours.formuleVue === undefined ? {} : { formuleVue: parcours.formuleVue }),
						...(parcours.rythmeVu === undefined ? {} : { rythmeVu: parcours.rythmeVu })
					},
			maintenant
		);
		const { score, raisons } = calculerScore({
			etapes: memoire.etapes,
			derniereActivite: etat.derniereActivite,
			maintenant,
			factures: etat.factures,
			interetFormuleLe: parcours?.interetFormuleLe ?? null,
			membres: etat.membres
		});
		const envoyes = (
			await ctx.db
				.query('envoisCroissance')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect()
		).map((e) => ({ cle: e.cle, le: e.le }));
		const prochain = prochainConseil(memoire.etapes, envoyes, maintenant);

		const champs = {
			etapes: memoire.etapes,
			...(memoire.formuleVue === undefined ? {} : { formuleVue: memoire.formuleVue }),
			...(memoire.rythmeVu === undefined ? {} : { rythmeVu: memoire.rythmeVu }),
			score,
			raisonsDuScore: raisons,
			prochainConseilLe: prochain?.des,
			releveLe: maintenant
		};
		// Le CRM (`admin/`) : le prospect qui s'inscrit, une fois ; et la tâche
		// « Appeler » quand le score franchit son seuil, une fois par compte.
		const prospectId = parcours?.prospectId ?? (await rapprocher(ctx, organizationId));
		const appeler = score >= SEUIL_APPELER && parcours?.tacheScoreLe === undefined;
		if (appeler) {
			await ctx.db.insert('tachesCrm', {
				organizationId,
				titre: 'Appeler',
				pour: maintenant,
				origine: 'SCORE',
				creePar: 'machine',
				creeLe: maintenant
			});
		}
		const suite = {
			...champs,
			...(prospectId === undefined ? {} : { prospectId }),
			...(appeler ? { tacheScoreLe: maintenant } : {})
		};
		if (parcours === null) await ctx.db.insert('parcoursComptes', { organizationId, ...suite });
		else await ctx.db.patch(parcours._id, suite);
		return null;
	}
});

/** Chaque nuit : tous les établissements, par lots, pour rattraper ce qu'aucun geste n'a signalé. */
export const releverTous = internalMutation({
	args: { curseur: v.optional(v.union(v.string(), v.null())) },
	returns: v.null(),
	handler: async (ctx, { curseur }): Promise<null> => {
		const page = await ctx.db
			.query('organizations')
			.paginate({ numItems: 50, cursor: curseur ?? null });
		for (const org of page.page) {
			await ctx.scheduler.runAfter(0, internal.croissance.releve.releverLesEtapes, {
				organizationId: org._id
			});
		}
		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.croissance.releve.releverTous, {
				curseur: page.continueCursor
			});
		}
		return null;
	}
});
