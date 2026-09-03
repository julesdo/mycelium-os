import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { authedMutation } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';
import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { additionner, depuisCentimes, soustraire, ZERO } from '../../socle/montants';
import { deduireConditions } from '../../verticales/recouvrement/deduction';
import { qualifier, type SignalContestation } from '../../verticales/recouvrement/scoring';
import type { ClePiece, EtatCritere } from '../../verticales/recouvrement/qualification';
import { vEtatCritere } from './tables';

/**
 * La constitution et la qualification d'une créance.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TROIS INVARIANTS, ET CE QU'ILS COÛTERAIENT S'ILS CÉDAIENT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 1. **Un seul débiteur par créance.** Grouper deux clients dans un même
 *    dossier produirait un acte qu'aucun tribunal ne peut traiter — découvert
 *    après avoir mandaté et payé un commissaire de justice.
 *
 * 2. **Une facture n'appartient qu'à une créance.** Sans quoi la même somme
 *    partirait dans deux procédures contre le même débiteur, qui aurait beau
 *    jeu de faire tomber les deux.
 *
 * 3. **Le cloisonnement passe avant tout.** Connaître un identifiant de facture
 *    ne doit pas suffire à l'inclure dans sa propre créance.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA DATE EST UN ARGUMENT, PAS UNE LECTURE D'HORLOGE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `aujourdHui` arrive de l'appelant. L'exigibilité en dépend, et un test qui ne
 * peut pas fixer la date ne peut pas vérifier qu'une facture non échue est bien
 * refusée. C'est la même discipline que le décompte.
 */

const vReponses = v.object({
	certaine: v.optional(vEtatCritere),
	liquide: v.optional(vEtatCritere),
	exigible: v.optional(vEtatCritere),
	entreCommercants: v.optional(vEtatCritere)
});

/** Ce qui reste dû sur une facture, règlements et avoirs déduits. */
async function resteDu(ctx: MutationCtx, facture: Doc<'facturesVente'>) {
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_facture', (q) => q.eq('factureId', facture._id))
		.collect();

	const verse = additionner(...reglements.map((r) => depuisCentimes(r.montant)));
	return soustraire(depuisCentimes(facture.montantTTC), verse);
}

/**
 * Les pièces qui soutiennent cette créance.
 *
 * Deux portées se cumulent : celles rattachées à une facture précise (bon de
 * livraison), et celles rattachées au débiteur (CGV, contrat-cadre). Sans la
 * seconde, des CGV signées une fois pour toutes ne compteraient jamais, et le
 * score sous-estimerait tous les dossiers d'un client régulier.
 */
async function piecesDeLaCreance(
	ctx: MutationCtx,
	debiteurId: Id<'debiteurs'>,
	factureIds: readonly Id<'facturesVente'>[]
): Promise<ClePiece[]> {
	const trouvees = new Set<ClePiece>(['FACTURE']);

	for (const factureId of factureIds) {
		const liaisons = await ctx.db
			.query('piecesFactures')
			.withIndex('by_facture', (q) => q.eq('factureId', factureId))
			.collect();

		for (const liaison of liaisons) {
			const piece = await ctx.db.get(liaison.pieceId);
			if (piece !== null) trouvees.add(piece.type);
		}
	}

	const auDebiteur = await ctx.db
		.query('pieces')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();
	for (const piece of auDebiteur) trouvees.add(piece.type);

	return [...trouvees];
}

/**
 * Les retards déjà observés sur ce débiteur.
 *
 * DÉDUIT, PAS DEMANDÉ. Une facture échue et non soldée EST un retard observé :
 * l'information est déjà en base, et la redemander au gérant serait exactement
 * ce que la première règle d'écran interdit.
 */
async function retardsObserves(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	aujourdHui: string
): Promise<number> {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();

	return factures.filter(
		(facture) =>
			facture.organizationId === organizationId &&
			facture.dateEcheance !== undefined &&
			facture.dateEcheance < aujourdHui &&
			facture.statutPaiement !== 'SOLDEE'
	).length;
}

/** Recalcule le score d'une créance à partir de son état courant. */
async function recalculerScore(
	ctx: MutationCtx,
	creance: Doc<'creances'>,
	aujourdHui: string
): Promise<number> {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
		.collect();

	const debiteur = await ctx.db.get(creance.debiteurId);

	const qualification = qualifier({
		certaine: creance.certaine,
		liquide: creance.liquide,
		exigible: creance.exigible,
		entreCommercants: creance.entreCommercants,
		piecesFournies: await piecesDeLaCreance(
			ctx,
			creance.debiteurId,
			factures.map((f) => f._id)
		),
		// Aucun signal de contestation n'est encore collecté : les détecter
		// demande de lire les échanges, ce qui n'est pas construit. Les
		// supposer absents serait présumer favorablement — mais ici l'absence
		// est REELLE au regard de ce qu'on sait, et le questionnaire reste la
		// voie pour qu'un gérant en déclare un.
		signauxContestation: [] as SignalContestation[],
		santeDebiteur: debiteur?.santeFinanciere ?? 'INCONNUE',
		retardsAnterieurs: await retardsObserves(
			ctx,
			creance.organizationId,
			creance.debiteurId,
			aujourdHui
		)
	});

	return qualification.score;
}

/** Les quatre conditions sont-elles toutes tranchées ? */
function toutesTranchees(conditions: {
	certaine: EtatCritere;
	liquide: EtatCritere;
	exigible: EtatCritere;
	entreCommercants: EtatCritere;
}): boolean {
	return Object.values(conditions).every((etat) => etat !== 'unknown');
}

export const creerCreance = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		factureIds: v.array(v.id('facturesVente')),
		aujourdHui: v.string()
	},
	returns: v.id('creances'),
	handler: async (ctx, { organizationId, factureIds, aujourdHui }) => {
		if (factureIds.length === 0) {
			throw new ConvexError('Une créance sans facture n’a rien à réclamer.');
		}

		const factures: Doc<'facturesVente'>[] = [];
		for (const factureId of factureIds) {
			const facture = await ctx.db.get(factureId);

			// Le cloisonnement AVANT tout : même message qu'une facture
			// inexistante, pour ne pas révéler qu'elle existe ailleurs.
			if (facture === null || facture.organizationId !== organizationId) {
				throw new ConvexError('Facture introuvable');
			}
			if (facture.creanceId !== undefined) {
				throw new ConvexError(
					`La facture ${facture.reference} appartient déjà à une créance. La réclamer ` +
						'deux fois exposerait les deux procédures.'
				);
			}
			factures.push(facture);
		}

		const debiteurId = factures[0]!.debiteurId;
		if (factures.some((facture) => facture.debiteurId !== debiteurId)) {
			throw new ConvexError(
				'Une créance ne peut porter que sur UN débiteur. Constituer une créance par ' +
					'débiteur, sans quoi l’acte produit serait irrecevable.'
			);
		}

		const [profil, debiteur] = await Promise.all([
			ctx.db
				.query('profilsCreancier')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.first(),
			ctx.db.get(debiteurId)
		]);

		const restes = await Promise.all(factures.map((facture) => resteDu(ctx, facture)));
		const montantExigible = restes.length > 0 ? additionner(...restes) : ZERO;

		// L'exigibilité de la créance est la PLUS TARDIVE de ses factures : tant
		// qu'une seule n'est pas due, l'ensemble ne l'est pas.
		const exigibilites = factures
			.map((facture) => facture.dateExigibilite)
			.filter((date): date is string => date !== undefined);
		const dateExigibilite =
			exigibilites.length === factures.length && exigibilites.length > 0
				? exigibilites.reduce((tardive, date) => (date > tardive ? date : tardive))
				: undefined;

		const conditions = deduireConditions({
			montantExigible,
			dateExigibilite,
			aujourdHui,
			creancierCommercant: profil?.estCommercant ?? 'unknown',
			debiteurCommercant: debiteur?.estCommercant ?? 'unknown'
		});

		const creanceId = await ctx.db.insert('creances', {
			organizationId,
			debiteurId,
			statut: 'BROUILLON',
			...conditions,
			creeLe: Date.now()
		});

		for (const facture of factures) {
			await ctx.db.patch(facture._id, { creanceId });
		}

		const creance = (await ctx.db.get(creanceId))!;
		await ctx.db.patch(creanceId, {
			score: await recalculerScore(ctx, creance, aujourdHui)
		});

		return creanceId;
	}
});

/**
 * Le gérant tranche ce que le logiciel n'a pas pu déduire.
 *
 * La créance ne devient `QUALIFIEE` que lorsque les QUATRE conditions sont
 * tranchées — pas quand le questionnaire a été soumis. La nuance compte : une
 * créance qualifiée est une créance sur laquelle on peut décider, et il en
 * manque toujours une si personne n'a dit si le débiteur est commerçant.
 */
export const repondreQuestionnaire = internalMutation({
	args: {
		creanceId: v.id('creances'),
		reponses: vReponses,
		aujourdHui: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { creanceId, reponses, aujourdHui }) => {
		const creance = await ctx.db.get(creanceId);
		if (creance === null) throw new ConvexError('Créance introuvable');

		const conditions = {
			certaine: reponses.certaine ?? creance.certaine,
			liquide: reponses.liquide ?? creance.liquide,
			exigible: reponses.exigible ?? creance.exigible,
			entreCommercants: reponses.entreCommercants ?? creance.entreCommercants
		};

		await ctx.db.patch(creanceId, conditions);

		const misAJour = (await ctx.db.get(creanceId))!;
		const score = await recalculerScore(ctx, misAJour, aujourdHui);

		const complete = toutesTranchees(conditions);
		await ctx.db.patch(creanceId, {
			score,
			statut: complete && creance.statut === 'BROUILLON' ? 'QUALIFIEE' : creance.statut,
			qualifieeLe: complete ? Date.now() : creance.qualifieeLe
		});

		return null;
	}
});

/**
 * Les entrées authentifiées.
 *
 * Elles sont MINCES, délibérément : elles résolvent l'organisation, fournissent
 * la date du jour, et délèguent. Toute la logique reste dans les mutations
 * internes, qui sont celles que les tests exercent — monter le composant Better
 * Auth pour tester coûterait plus cher que ça ne rapporterait, comme le note
 * déjà `rgpd.test.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE TYPE DE RETOUR EST ANNOTÉ À LA MAIN, ET CE N'EST PAS DÉCORATIF
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ces handlers appellent `internal.recouvrement.creances.*` — c'est-à-dire une
 * fonction de LEUR PROPRE MODULE. Le type de `internal` inclut donc le type de
 * ces handlers, qui dépend de `internal` : TypeScript boucle, renonce, et
 * retombe sur `any`.
 *
 * Le coût de cet `any` n'est pas local. Il remonte dans le type de `api` tout
 * entier, et TOUS les écrans perdent leur inférence d'un coup — y compris ceux
 * d'EGalim, qui n'ont rien à voir. C'est exactement ce qui est arrivé en
 * écrivant ces deux fonctions : dix-huit erreurs apparues dans des routes qui
 * n'avaient pas bougé.
 *
 * L'annotation explicite casse le cycle. Ne pas la retirer.
 */
export const creer = authedMutation({
	args: { factureIds: v.array(v.id('facturesVente')) },
	returns: v.id('creances'),
	handler: async (ctx, { factureIds }): Promise<Id<'creances'>> => {
		const { organizationId } = await getUserOrg(ctx);
		return await ctx.runMutation(internal.recouvrement.creances.creerCreance, {
			organizationId,
			factureIds,
			aujourdHui: new Date().toISOString().slice(0, 10)
		});
	}
});

export const repondre = authedMutation({
	args: { creanceId: v.id('creances'), reponses: vReponses },
	returns: v.null(),
	handler: async (ctx, { creanceId, reponses }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);

		// Le cloisonnement AVANT la délégation : la mutation interne fait
		// confiance à son appelant, c'est donc ici que la barrière se pose.
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Créance introuvable');
		}

		await ctx.runMutation(internal.recouvrement.creances.repondreQuestionnaire, {
			creanceId,
			reponses,
			aujourdHui: new Date().toISOString().slice(0, 10)
		});
		return null;
	}
});
