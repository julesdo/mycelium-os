import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { organisationCouranteOuNull } from '../lib/auth';
import { notifier } from '../notifier';
import {
	coupuresDe,
	demanderLaParole,
	noterExpiree,
	noterOuverte,
	paroleAccordee
} from '../croissance/attention';
import { vCleJalon } from './tables';
import { jourDeParis } from '../../admin/dates';
import { cleDeSilence } from '../../croissance/attention';
import { enEuros } from '../../notifications/paiements';
import {
	CLES_JALONS,
	PALIERS_RENTRE,
	estJalonDArgent,
	jalonsFranchis,
	ligneSecondaire,
	plusHautJalon,
	texteDuJalon,
	type CleJalon,
	type EtatDesJalons
} from '../../verticales/recouvrement/jalons';

/**
 * LES RÉUSSITES, RELEVÉES ET FÊTÉES (21/10/2026, le parcours de l'habitude). Le module
 * pur dit ce qui est franchi (`verticales/recouvrement/jalons.ts`) ; ici on relève l'état
 * réel, on inscrit chaque jalon une fois, on prévient, et on rend la célébration à la
 * visite suivante.
 *
 * ⚠️ LE RELÈVEMENT EST PROGRAMMÉ, JAMAIS FAIT DANS LA MUTATION QUI L'APPELLE : un import
 * qui rapproche cent virements ne relit pas en plus tous les règlements depuis l'arrivée.
 * Il part d'un règlement inscrit (import, lettrage, « Virement reçu ») ou d'une relance
 * partie (pilote, courrier déclaré parti).
 */

const JOUR_MS = 24 * 60 * 60 * 1000;
const SEMAINE_MS = 7 * JOUR_MS;
/** Une réussite de plus d'un mois ne se fête plus : elle n'est plus une nouvelle. */
const FRAICHEUR_MS = 30 * JOUR_MS;
/** Le parrainage arrive au lot 7 : sa ligne se tait jusque-là. */
const PARRAINAGE_OUVERT = false;

const vLigne = v.union(v.literal('PUSH'), v.literal('ANNEE'), v.literal('RECOMMANDATION'));

interface Nomme {
	readonly montant: bigint;
	readonly debiteurId: Id<'debiteurs'>;
}

interface Releve {
	readonly etat: EtatDesJalons;
	readonly clients: number;
	readonly premierPaiement: Nomme | null;
	readonly dossierSolde: Nomme | null;
}

/** Une relance est-elle partie (le pilote ou un courrier déclaré parti) ? */
async function uneRelancePartie(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>
): Promise<boolean> {
	const parties = await ctx.db
		.query('envois')
		.withIndex('by_org_and_etat', (q) => q.eq('organizationId', organizationId).eq('etat', 'PARTI'))
		.take(200);
	return parties.some((e) => e.modele === 'RAPPEL' || e.modele === 'RELANCE_OFFICIELLE');
}

/**
 * CE QUI EST RENTRÉ SUR LES DOSSIERS SUIVIS DEPUIS L'ARRIVÉE : les paiements et acomptes
 * rapprochés sur une facture qui appartient à un dossier. Un règlement daté du jour où
 * il a été lu (`LECTURE`) ne compte pas : la source ne dit pas quand il est arrivé, et
 * un premier import ramènerait l'historique comme s'il venait de rentrer.
 */
async function ceQuiEstRentre(
	ctx: MutationCtx,
	org: Doc<'organizations'>
): Promise<{ total: bigint; paiements: number; clients: number; premier: Nomme | null }> {
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_org_and_date', (q) =>
			q.eq('organizationId', org._id).gte('date', jourDeParis(org._creationTime))
		)
		.take(4000);
	const factures = new Map<Id<'facturesVente'>, Doc<'facturesVente'> | null>();
	const clients = new Set<Id<'debiteurs'>>();
	let total = 0n;
	let paiements = 0;
	let premier: Nomme | null = null;
	for (const r of reglements) {
		if ((r.nature !== 'PAIEMENT' && r.nature !== 'ACOMPTE') || r.dateSource === 'LECTURE') continue;
		if (!factures.has(r.factureId)) factures.set(r.factureId, await ctx.db.get(r.factureId));
		const facture = factures.get(r.factureId);
		if (facture === null || facture === undefined || facture.creanceId === undefined) continue;
		total += r.montant;
		paiements += 1;
		clients.add(facture.debiteurId);
		premier ??= { montant: r.montant, debiteurId: facture.debiteurId };
	}
	return { total, paiements, clients: clients.size, premier };
}

/** Le premier dossier dont toutes les factures sont réglées. */
async function unDossierSolde(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>
): Promise<Nomme | null> {
	const creances = await ctx.db
		.query('creances')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.take(300);
	for (const creance of creances) {
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
			.take(50);
		if (factures.length > 0 && factures.every((f) => f.statutPaiement === 'SOLDEE')) {
			return {
				montant: factures.reduce((total, f) => total + f.montantTTC, 0n),
				debiteurId: creance.debiteurId
			};
		}
	}
	return null;
}

/** L'état réel, lu seulement pour ce qui n'est pas encore franchi. */
async function releverLEtat(
	ctx: MutationCtx,
	org: Doc<'organizations'>,
	atteints: ReadonlySet<CleJalon>
): Promise<Releve> {
	const argentFranchi =
		atteints.has('PREMIER_PAIEMENT') && PALIERS_RENTRE.every((p) => atteints.has(p.cle));
	const rentre = argentFranchi
		? { total: PALIERS_RENTRE[PALIERS_RENTRE.length - 1]!.seuil, paiements: 1, clients: 0, premier: null }
		: await ceQuiEstRentre(ctx, org);
	const relance = atteints.has('PREMIERE_RELANCE') || (await uneRelancePartie(ctx, org._id));
	const dossierSolde = atteints.has('PREMIER_DOSSIER_SOLDE')
		? null
		: await unDossierSolde(ctx, org._id);
	return {
		etat: {
			relancesParties: relance ? 1 : 0,
			paiements: rentre.paiements,
			rentreCumule: rentre.total,
			dossiersSoldes: atteints.has('PREMIER_DOSSIER_SOLDE') || dossierSolde !== null ? 1 : 0
		},
		clients: rentre.clients,
		premierPaiement: rentre.premier,
		dossierSolde
	};
}

function semainesDepuis(org: Doc<'organizations'>, instant: number): number {
	return Math.ceil((instant - org._creationTime) / SEMAINE_MS);
}

/**
 * PRÉVIENT UNE FOIS, POUR LA PLUS HAUTE. Les paliers d'argent et le dossier soldé
 * font une notification ; la première relance se fête à la visite sans notification, et
 * le premier paiement a déjà la sienne (« Garage Martin vous a payé »).
 */
async function prevenir(
	ctx: MutationCtx,
	org: Doc<'organizations'>,
	nouveaux: readonly CleJalon[],
	releve: Releve,
	membres: readonly Doc<'organizationMembers'>[],
	maintenant: number
): Promise<void> {
	const cle = plusHautJalon(
		nouveaux.filter((c) => estJalonDArgent(c) || c === 'PREMIER_DOSSIER_SOLDE')
	);
	if (cle === null) return;
	const solde = cle === 'PREMIER_DOSSIER_SOLDE' ? releve.dossierSolde : null;
	const debiteur = solde === null ? null : await ctx.db.get(solde.debiteurId);
	const texte = texteDuJalon(cle, {
		semaines: semainesDepuis(org, maintenant),
		clients: releve.clients,
		client: debiteur?.denomination ?? null,
		montant: solde?.montant ?? null
	});
	const titre =
		estJalonDArgent(cle) && texte.montant !== null
			? `${enEuros(texte.montant)} rentrés sur les dossiers suivis`
			: texte.titre;
	for (const membre of membres) {
		await notifier(ctx, {
			organizationId: org._id,
			userId: membre.userId,
			type: 'JALON',
			title: titre,
			message: texte.detail,
			link: '/app'
		});
	}
}

/**
 * RELÈVE LES JALONS D'UN ÉTABLISSEMENT. Chaque clé s'inscrit une fois ; au premier
 * relevé, ce qui était déjà franchi s'inscrit vu de tous et ne prévient personne.
 */
export const relever = internalMutation({
	args: { organizationId: v.id('organizations') },
	returns: v.null(),
	handler: async (ctx, { organizationId }): Promise<null> => {
		const org = await ctx.db.get(organizationId);
		if (org === null) return null;
		const deja = await ctx.db
			.query('jalonsAtteints')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.take(CLES_JALONS.length * 2);
		const atteints = new Set<CleJalon>(deja.map((j) => j.cle));
		const premierReleve = org.jalonsRelevesLe === undefined;
		const maintenant = Date.now();

		if (CLES_JALONS.some((c) => !atteints.has(c))) {
			const releve = await releverLEtat(ctx, org, atteints);
			const nouveaux = jalonsFranchis(releve.etat).filter((c) => !atteints.has(c));
			if (nouveaux.length > 0) {
				const membres = await ctx.db
					.query('organizationMembers')
					.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
					.take(100);
				for (const cle of nouveaux) {
					const nomme =
						cle === 'PREMIER_PAIEMENT'
							? releve.premierPaiement
							: cle === 'PREMIER_DOSSIER_SOLDE'
								? releve.dossierSolde
								: null;
					await ctx.db.insert('jalonsAtteints', {
						organizationId,
						cle,
						atteintLe: maintenant,
						...(nomme === null ? {} : { montant: nomme.montant, debiteurId: nomme.debiteurId }),
						...(estJalonDArgent(cle) ? { clients: releve.clients } : {}),
						vusPar: premierReleve ? membres.map((m) => m.userId) : []
					});
				}
				if (!premierReleve) await prevenir(ctx, org, nouveaux, releve, membres, maintenant);
			}
		}
		if (premierReleve) await ctx.db.patch(organizationId, { jalonsRelevesLe: maintenant });
		return null;
	}
});

/**
 * LA RÉUSSITE À FÊTER, à la visite suivante : la plus haute que la personne n'a pas vue,
 * franchie depuis qu'elle est là et il y a moins d'un mois, si le budget d'attention
 * l'accorde aujourd'hui. Avec au plus une ligne sous le bouton.
 */
export const jalonAMontrer = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			id: v.id('jalonsAtteints'),
			cle: vCleJalon,
			titre: v.string(),
			montant: v.union(v.int64(), v.null()),
			detail: v.string(),
			secondaire: v.union(vLigne, v.null())
		})
	),
	handler: async (ctx) => {
		const userId = ctx.user._id;
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
		const maintenant = Date.now();
		const tous = await ctx.db
			.query('jalonsAtteints')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.take(CLES_JALONS.length * 2);
		const enAttente = tous.filter(
			(j) =>
				!j.vusPar.includes(userId) &&
				j.atteintLe >= membre._creationTime &&
				j.atteintLe >= maintenant - FRAICHEUR_MS
		);
		const cle = plusHautJalon(enAttente.map((j) => j.cle));
		const jalon = enAttente.find((j) => j.cle === cle);
		if (cle === null || jalon === undefined) return null;
		const accordee = await paroleAccordee(
			ctx,
			{ organizationId, userId, canal: 'APP', genre: 'jalon', cle: `jalon:${jalon._id}` },
			maintenant
		);
		if (!accordee) return null;

		const coupes = await coupuresDe(ctx, organizationId, userId);
		const appareil = await ctx.db
			.query('abonnementsPush')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.first();
		const secondaire = ligneSecondaire(cle, {
			// Sans clés VAPID, le push dort : on ne propose pas ce qui ne marcherait pas.
			pushActif:
				!process.env.VAPID_PUBLIC_KEY || appareil !== null || coupes.has(cleDeSilence('push')),
			// L'année ne se propose qu'à qui peut changer la formule.
			mensuel:
				membre.role === 'ORG_ADMIN' &&
				org.paddleRythme === 'mensuel' &&
				(org.paddleStatus === 'active' || org.paddleStatus === 'trialing'),
			anneeProposee:
				tous.some((j) => j.secondaire === 'ANNEE') || coupes.has(cleDeSilence('annee')),
			recommandationCoupee: !PARRAINAGE_OUVERT || coupes.has(cleDeSilence('recommandation'))
		});
		const debiteur = jalon.debiteurId === undefined ? null : await ctx.db.get(jalon.debiteurId);
		const texte = texteDuJalon(cle, {
			semaines: semainesDepuis(org, jalon.atteintLe),
			clients: jalon.clients ?? 0,
			client: debiteur?.denomination ?? null,
			montant: jalon.montant ?? null
		});
		return {
			id: jalon._id,
			cle,
			titre: texte.titre,
			montant: texte.montant,
			detail: texte.detail,
			secondaire
		};
	}
});

/**
 * LA RÉUSSITE A ÉTÉ VUE : elle et les autres en attente sont marquées vues pour la
 * personne, la prise de parole s'inscrit, et la ligne passée sans être touchée compte
 * comme ignorée (la célébration elle-même ne l'est jamais).
 */
export const jalonVu = authedMutation({
	args: {
		id: v.id('jalonsAtteints'),
		ligne: v.union(v.literal('TOUCHEE'), v.literal('PASSEE'), v.literal('AUCUNE')),
		secondaire: v.optional(vLigne)
	},
	returns: v.null(),
	handler: async (ctx, { id, ligne, secondaire }): Promise<null> => {
		const userId = ctx.user._id;
		const organizationId = await organisationCouranteOuNull(ctx, userId);
		const jalon = await ctx.db.get(id);
		if (organizationId === null || jalon === null || jalon.organizationId !== organizationId) {
			return null;
		}
		const enAttente = (
			await ctx.db
				.query('jalonsAtteints')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.take(CLES_JALONS.length * 2)
		).filter((j) => !j.vusPar.includes(userId));
		for (const j of enAttente) {
			const proposee =
				j._id === id && ligne !== 'AUCUNE' && secondaire !== undefined && j.secondaire === undefined;
			await ctx.db.patch(j._id, {
				vusPar: [...j.vusPar, userId],
				...(proposee ? { secondaire } : {})
			});
		}
		const cle = `jalon:${id}`;
		await demanderLaParole(ctx, { organizationId, userId, canal: 'APP', genre: 'jalon', cle });
		if (ligne === 'PASSEE') await noterExpiree(ctx, userId, cle);
		else await noterOuverte(ctx, userId, cle);
		return null;
	}
});
