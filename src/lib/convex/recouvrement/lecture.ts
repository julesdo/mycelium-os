import { v, ConvexError } from 'convex/values';
import { authedQuery } from '../functions';
import type { QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { additionner, depuisCentimes, enCentimes, soustraire, ZERO } from '../../socle/montants';
import { qualifier } from '../../verticales/recouvrement/scoring';
import { PROCEDURES, proceduresEnvisageables } from '../../verticales/recouvrement/procedures';
import { conditionsADemander } from '../../verticales/recouvrement/deduction';
import { LIBELLE_CONDITION, type ClePiece } from '../../verticales/recouvrement/qualification';
import { regimePrescription, dateDePrescription } from '../../verticales/recouvrement/pays/france/prescription';
import { getUserOrg } from '../lib/auth';
import { vEtatCritere } from './tables';

/**
 * Les lectures du recouvrement — ce que les écrans consomment.
 *
 * ELLES RENVOIENT DES MONTANTS EN CENTIMES (`int64`), jamais des nombres à
 * virgule. La conversion en texte lisible se fait à l'affichage, une seule
 * fois, avec `versEuros`. Renvoyer un `number` ici rouvrirait la porte aux
 * flottants sur tout le chemin de retour, pour le confort d'un composant.
 *
 * AUCUNE NE FAIT DE CALCUL MÉTIER PROPRE. Le score vient de `qualifier`, les
 * procédures de `proceduresEnvisageables`, la prescription du module France.
 * Une requête qui recalculerait à sa façon finirait par diverger de l'écran
 * suivant, et deux écrans afficheraient deux vérités.
 */

const vDebiteur = v.object({
	_id: v.id('debiteurs'),
	denomination: v.string(),
	siren: v.optional(v.string()),
	estCommercant: vEtatCritere,
	santeFinanciere: v.union(
		v.literal('INCONNUE'),
		v.literal('SAINE'),
		v.literal('PROCEDURE_COLLECTIVE'),
		v.literal('RADIEE')
	),
	secteurDetermine: v.boolean(),
	/** Ce qui reste dû, toutes factures non soldées confondues. */
	encours: v.int64(),
	facturesEchues: v.number(),
	facturesTotal: v.number()
});

const vFacture = v.object({
	_id: v.id('facturesVente'),
	reference: v.string(),
	montantTTC: v.int64(),
	resteDu: v.int64(),
	dateEmission: v.string(),
	dateEcheance: v.optional(v.string()),
	dateExigibilite: v.optional(v.string()),
	exigibiliteDeduite: v.boolean(),
	statutPaiement: v.union(
		v.literal('IMPAYEE'),
		v.literal('PARTIELLEMENT_PAYEE'),
		v.literal('SOLDEE'),
		v.literal('LITIGIEUSE')
	),
	datePrescription: v.optional(v.string()),
	dansUneCreance: v.boolean()
});

/** Ce qui reste dû sur une facture. */
async function resteDu(ctx: QueryCtx, facture: Doc<'facturesVente'>) {
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_facture', (q) => q.eq('factureId', facture._id))
		.collect();

	return soustraire(
		depuisCentimes(facture.montantTTC),
		additionner(...reglements.map((r) => depuisCentimes(r.montant)))
	);
}

async function facturesDe(ctx: QueryCtx, organizationId: Id<'organizations'>) {
	return await ctx.db
		.query('facturesVente')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();
}

/**
 * Les débiteurs, avec leur encours.
 *
 * L'ENCOURS EST LA COLONNE QUI COMPTE. Une liste de noms trie par ordre
 * alphabétique ; une liste d'encours trie par ce qu'on a à récupérer, et c'est
 * la seule question que le gérant se pose en ouvrant cet écran.
 */
export const listerDebiteurs = authedQuery({
	args: {},
	returns: v.array(vDebiteur),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const aujourdHui = new Date().toISOString().slice(0, 10);

		const debiteurs = await ctx.db
			.query('debiteurs')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const factures = await facturesDe(ctx, organizationId);

		const lignes = await Promise.all(
			debiteurs.map(async (debiteur) => {
				const siennes = factures.filter((f) => f.debiteurId === debiteur._id);
				const nonSoldees = siennes.filter((f) => f.statutPaiement !== 'SOLDEE');
				const restes = await Promise.all(nonSoldees.map((f) => resteDu(ctx, f)));

				return {
					_id: debiteur._id,
					denomination: debiteur.denomination,
					siren: debiteur.siren,
					estCommercant: debiteur.estCommercant,
					santeFinanciere: debiteur.santeFinanciere,
					secteurDetermine: debiteur.secteur !== undefined && debiteur.secteur !== 'INDETERMINE',
					encours: enCentimes(restes.length > 0 ? additionner(...restes) : ZERO),
					facturesEchues: nonSoldees.filter(
						(f) => f.dateEcheance !== undefined && f.dateEcheance < aujourdHui
					).length,
					facturesTotal: siennes.length
				};
			})
		);

		// Le plus gros encours d'abord : c'est l'ordre dans lequel on agit.
		return lignes.sort((a, b) => (b.encours > a.encours ? 1 : b.encours < a.encours ? -1 : 0));
	}
});

/** Les factures d'un débiteur, avec leur date de prescription. */
export const listerFacturesDuDebiteur = authedQuery({
	args: { debiteurId: v.id('debiteurs') },
	returns: v.array(vFacture),
	handler: async (ctx, { debiteurId }) => {
		const { organizationId } = await getUserOrg(ctx);

		const debiteur = await ctx.db.get(debiteurId);
		if (debiteur === null || debiteur.organizationId !== organizationId) {
			throw new ConvexError('Débiteur introuvable');
		}

		const secteur = debiteur.secteur ?? 'INDETERMINE';
		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
			.collect();

		return await Promise.all(
			factures
				.filter((facture) => facture.organizationId === organizationId)
				.map(async (facture) => {
					const depart = facture.dateExigibilite ?? facture.dateEcheance;
					return {
						_id: facture._id,
						reference: facture.reference,
						montantTTC: facture.montantTTC,
						resteDu: enCentimes(await resteDu(ctx, facture)),
						dateEmission: facture.dateEmission,
						dateEcheance: facture.dateEcheance,
						dateExigibilite: facture.dateExigibilite,
						exigibiliteDeduite: facture.exigibiliteDeduite ?? false,
						statutPaiement: facture.statutPaiement,
						datePrescription:
							depart === undefined ? undefined : dateDePrescription(depart, secteur),
						dansUneCreance: facture.creanceId !== undefined
					};
				})
		);
	}
});

/** Les pièces qui soutiennent une créance, toutes portées confondues. */
async function piecesDeLaCreance(
	ctx: QueryCtx,
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
 * Tout ce qu'un écran de créance a besoin de savoir, en une lecture.
 *
 * Y COMPRIS CE QUI MANQUE. `questions` porte les conditions non tranchées avec
 * leur formulation ; `piecesManquantes` ce qui renforcerait le dossier ;
 * `risques` ce qui l'affaiblit. Un écran qui n'afficherait que le score
 * laisserait le gérant devant un nombre sans prise.
 */
export const creanceComplete = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.object({
		statut: v.union(
			v.literal('BROUILLON'),
			v.literal('QUALIFIEE'),
			v.literal('ENGAGEE'),
			v.literal('CLOSE')
		),
		debiteur: v.string(),
		score: v.number(),
		eligible: v.boolean(),
		principalRestantDu: v.int64(),
		factures: v.array(vFacture),
		conditions: v.object({
			certaine: vEtatCritere,
			liquide: vEtatCritere,
			exigible: vEtatCritere,
			entreCommercants: vEtatCritere
		}),
		questions: v.array(v.object({ condition: v.string(), libelle: v.string() })),
		risques: v.array(
			v.object({ type: v.string(), description: v.string(), gravite: v.string() })
		),
		piecesManquantes: v.array(v.string()),
		procedures: v.array(
			v.object({
				cle: v.string(),
				nom: v.string(),
				disponible: v.boolean(),
				blocages: v.array(v.string())
			})
		),
		regimePrescriptionNote: v.string()
	}),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);

		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Créance introuvable');
		}

		const debiteur = await ctx.db.get(creance.debiteurId);
		const secteur = debiteur?.secteur ?? 'INDETERMINE';

		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();

		const restes = await Promise.all(factures.map((facture) => resteDu(ctx, facture)));

		const conditions = {
			certaine: creance.certaine,
			liquide: creance.liquide,
			exigible: creance.exigible,
			entreCommercants: creance.entreCommercants
		};

		const qualification = qualifier({
			...conditions,
			piecesFournies: await piecesDeLaCreance(
				ctx,
				creance.debiteurId,
				factures.map((f) => f._id)
			),
			signauxContestation: [],
			santeDebiteur: debiteur?.santeFinanciere ?? 'INCONNUE',
			retardsAnterieurs: 0
		});

		const envisageables = proceduresEnvisageables({ ...conditions, piecesFournies: [] });
		const clesEnvisageables = new Set(envisageables.map((p) => p.cle));

		return {
			statut: creance.statut,
			debiteur: debiteur?.denomination ?? 'Débiteur inconnu',
			score: qualification.score,
			eligible: qualification.eligible,
			principalRestantDu: enCentimes(restes.length > 0 ? additionner(...restes) : ZERO),
			factures: await Promise.all(
				factures.map(async (facture) => {
					const depart = facture.dateExigibilite ?? facture.dateEcheance;
					return {
						_id: facture._id,
						reference: facture.reference,
						montantTTC: facture.montantTTC,
						resteDu: enCentimes(await resteDu(ctx, facture)),
						dateEmission: facture.dateEmission,
						dateEcheance: facture.dateEcheance,
						dateExigibilite: facture.dateExigibilite,
						exigibiliteDeduite: facture.exigibiliteDeduite ?? false,
						statutPaiement: facture.statutPaiement,
						datePrescription:
							depart === undefined ? undefined : dateDePrescription(depart, secteur),
						dansUneCreance: true
					};
				})
			),
			conditions,
			// Une question par condition non tranchée, et pour elles seules.
			questions: conditionsADemander(conditions).map((condition) => ({
				condition,
				libelle: `Pouvez-vous confirmer ${
					LIBELLE_CONDITION[condition as keyof typeof LIBELLE_CONDITION]
				} de cette créance ?`
			})),
			risques: qualification.risques.map((risque) => ({
				type: risque.type,
				description: risque.description,
				gravite: risque.gravite
			})),
			piecesManquantes: [...qualification.piecesManquantes],
			// Toutes les procédures sont listées, y compris indisponibles : un
			// écran qui masquerait L.126 laisserait croire qu'elle n'existe pas,
			// alors qu'elle attend seulement son décret.
			procedures: Object.values(PROCEDURES).map((procedure) => ({
				cle: procedure.cle,
				nom: procedure.nom,
				disponible: clesEnvisageables.has(procedure.cle) && procedure.peutEvaluer(),
				blocages: [...procedure.blocagesProductionActe()]
			})),
			regimePrescriptionNote: regimePrescription(secteur).note
		};
	}
});

/** Les créances de l'établissement, la plus mûre d'abord. */
export const listerCreances = authedQuery({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id('creances'),
			debiteur: v.string(),
			statut: v.string(),
			score: v.number(),
			principalRestantDu: v.int64(),
			nombreFactures: v.number()
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const creances = await ctx.db
			.query('creances')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		return await Promise.all(
			creances.map(async (creance) => {
				const factures = await ctx.db
					.query('facturesVente')
					.withIndex('by_creance', (q) => q.eq('creanceId', creance._id))
					.collect();
				const restes = await Promise.all(factures.map((f) => resteDu(ctx, f)));
				const debiteur = await ctx.db.get(creance.debiteurId);

				return {
					_id: creance._id,
					debiteur: debiteur?.denomination ?? 'Débiteur inconnu',
					statut: creance.statut,
					score: creance.score ?? 0,
					principalRestantDu: enCentimes(restes.length > 0 ? additionner(...restes) : ZERO),
					nombreFactures: factures.length
				};
			})
		);
	}
});
