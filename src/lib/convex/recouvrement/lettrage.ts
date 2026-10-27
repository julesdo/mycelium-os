import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import {
	additionner,
	depuisCentimes,
	enCentimes,
	soustraire,
	versEuros
} from '../../socle/montants';
import { lettrer, repartirSelonLaLoi } from '../../verticales/recouvrement/lettrage';
import type { FactureCandidate } from '../../verticales/recouvrement/lettrage';
import { estDateReelle } from '../../verticales/recouvrement/calendrier';

/**
 * LE LETTRAGE, BRANCHÉ SUR LA BASE.
 *
 * Toute la règle vit dans `verticales/recouvrement/lettrage.ts` — la recherche,
 * l'ambiguïté qu'on ne tranche pas, la borne de l'espace de recherche. Ce fichier
 * lit les factures du bon débiteur, en déduit ce qui reste dû, et écrit les
 * règlements quand le gérant a choisi.
 *
 * ⚠️ LE GÉRANT SAISIT LE MONTANT QU'IL VOIT SUR SON RELEVÉ. On ne lit pas encore
 * sa banque : l'ingestion automatique est un autre plan. Ce chemin-ci ne dépend
 * de rien et couvre déjà le cas qui fait perdre du temps — un virement groupé
 * qu'il faut ventiler à la main entre six factures.
 *
 * ⚠️ ET LE SERVEUR REVÉRIFIE LE TOTAL À L'APPLICATION. L'écran propose, le gérant
 * choisit, et la mutation reçoit une liste de références. Les appliquer sans
 * recontrôler la somme laisserait un écran périmé — ou une main malveillante —
 * solder des factures avec un montant qui ne leur correspond pas.
 */

/** Ce qui reste dû sur une facture, règlements déjà enregistrés déduits. */
async function resteDu(ctx: QueryCtx | MutationCtx, facture: Doc<'facturesVente'>) {
	const reglements = await ctx.db
		.query('reglements')
		.withIndex('by_facture', (q) => q.eq('factureId', facture._id))
		.collect();

	return soustraire(
		depuisCentimes(facture.montantTTC),
		additionner(...reglements.map((r) => depuisCentimes(r.montant)))
	);
}

/**
 * Les factures du débiteur, avec leur reste dû.
 *
 * ⚠️ CE DÉBITEUR, ET LUI SEUL. Un rapprochement entre clients est absurde et
 * invisible : le paiement d'un client solderait la facture d'un autre, et rien à
 * l'écran ne le dirait.
 */
async function candidatesDe(
	ctx: QueryCtx | MutationCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>
): Promise<Array<{ facture: Doc<'facturesVente'>; reste: bigint }>> {
	const factures = await ctx.db
		.query('facturesVente')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteurId))
		.collect();

	const retenues: Array<{ facture: Doc<'facturesVente'>; reste: bigint }> = [];
	for (const facture of factures) {
		if (facture.organizationId !== organizationId) continue;
		if (facture.statutPaiement === 'SOLDEE') continue;
		retenues.push({ facture, reste: enCentimes(await resteDu(ctx, facture)) });
	}
	return retenues;
}

const vProposition = v.object({
	issue: v.union(
		v.literal('UNIQUE'),
		v.literal('AMBIGU'),
		v.literal('AUCUNE'),
		v.literal('TROP_DE_CANDIDATES')
	),
	combinaisons: v.array(v.object({ references: v.array(v.string()), total: v.int64() })),
	/** Vrai quand d'autres combinaisons existent au-delà de ce qui est montré. */
	tronque: v.boolean(),
	/** Renseigné seulement sur `TROP_DE_CANDIDATES`. */
	candidates: v.optional(v.number()),
	/**
	 * Sur `AUCUNE` : la répartition que prévoit la loi (C. civ. 1342-10) quand le
	 * client ne dit pas quelle facture il paie. Une PROPOSITION, à confirmer.
	 */
	repartition: v.optional(
		v.object({
			lignes: v.array(v.object({ reference: v.string(), montant: v.int64(), solde: v.boolean() })),
			nonAffecte: v.int64()
		})
	)
});

export async function composerProposition(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	montant: bigint
) {
	const candidates: FactureCandidate[] = (await candidatesDe(ctx, organizationId, debiteurId)).map(
		({ facture, reste }) => ({ reference: facture.reference, resteDu: depuisCentimes(reste) })
	);

	const resultat = lettrer(candidates, depuisCentimes(montant));

	if (resultat.issue === 'UNIQUE') {
		return {
			issue: 'UNIQUE' as const,
			combinaisons: [
				{
					references: [...resultat.combinaison.references],
					total: enCentimes(resultat.combinaison.total)
				}
			],
			tronque: false
		};
	}
	if (resultat.issue === 'AMBIGU') {
		return {
			issue: 'AMBIGU' as const,
			combinaisons: resultat.combinaisons.map((c) => ({
				references: [...c.references],
				total: enCentimes(c.total)
			})),
			tronque: resultat.tronque
		};
	}
	if (resultat.issue === 'TROP_DE_CANDIDATES') {
		return {
			issue: 'TROP_DE_CANDIDATES' as const,
			combinaisons: [],
			tronque: false,
			candidates: resultat.candidates
		};
	}
	// AUCUNE combinaison exacte : un versement partiel, ou un trop-perçu. La loi dit
	// comment le répartir ; le logiciel le propose, le gérant confirme.
	const repartition = await repartitionDe(ctx, organizationId, debiteurId, montant);
	return { issue: 'AUCUNE' as const, combinaisons: [], tronque: false, repartition };
}

async function repartitionDe(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	montant: bigint
) {
	const candidates = await candidatesDe(ctx, organizationId, debiteurId);
	const r = repartirSelonLaLoi(
		candidates.map(({ facture, reste }) => ({
			reference: facture.reference,
			resteDu: depuisCentimes(reste),
			dateEcheance: facture.dateExigibilite ?? facture.dateEcheance ?? null
		})),
		depuisCentimes(montant),
		new Date().toISOString().slice(0, 10)
	);
	return {
		lignes: r.lignes.map((l) => ({
			reference: l.reference,
			montant: enCentimes(l.montant),
			solde: l.solde
		})),
		nonAffecte: enCentimes(r.nonAffecte)
	};
}

/** Sans authentification — pour les tests. */
export const proposerInterne = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		montant: v.int64()
	},
	returns: vProposition,
	handler: async (ctx, { organizationId, debiteurId, montant }) =>
		composerProposition(ctx, organizationId, debiteurId, montant)
});

export const proposer = authedQuery({
	args: { debiteurId: v.id('debiteurs'), montant: v.int64() },
	returns: vProposition,
	handler: async (ctx, { debiteurId, montant }) => {
		const { organizationId } = await getUserOrg(ctx);
		return composerProposition(ctx, organizationId, debiteurId, montant);
	}
});

export const appliquerInterne = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		references: v.array(v.string()),
		montant: v.int64(),
		date: v.string(),
		/** Qui a noté le virement : l'historique du dossier le signe. */
		auteurUserId: v.optional(v.string())
	},
	/** Les règlements posés : ce qu'« Annuler » retire, et rien d'autre. */
	returns: v.array(v.id('reglements')),
	handler: async (
		ctx,
		{ organizationId, debiteurId, references, montant, date, auteurUserId }
	): Promise<Id<'reglements'>[]> => {
		// LA DATE ENTRE DANS LE CALCUL DES INTÉRÊTS. Un « 2026-02-30 » y produirait
		// un décalage muet sur une somme réclamée — c'est exactement le défaut que
		// `estDateReelle` existe pour empêcher.
		if (!estDateReelle(date)) {
			throw new ConvexError(
				`« ${date} » n’est pas une date : un règlement mal daté décale le calcul des intérêts.`
			);
		}
		if (references.length === 0) {
			throw new ConvexError('Aucune facture choisie : il n’y a rien à lettrer.');
		}

		const candidates = await candidatesDe(ctx, organizationId, debiteurId);
		const parReference = new Map(candidates.map((c) => [c.facture.reference, c]));

		const choisies = references.map((reference) => {
			const candidate = parReference.get(reference);
			if (candidate === undefined) {
				// Une facture d'un autre débiteur, déjà soldée, ou inconnue. Dans les
				// trois cas la combinaison ne vaut rien.
				throw new ConvexError(
					`La facture ${reference} n’est pas une facture non soldée de ce débiteur.`
				);
			}
			return candidate;
		});

		// ⚠️ ON REVÉRIFIE LE TOTAL, ET C'EST LE CŒUR DE CETTE MUTATION. L'écran a
		// pu être calculé sur des données périmées — un règlement enregistré
		// entre-temps, une facture rattachée à une créance. Faire confiance à la
		// liste reçue solderait des factures avec un montant qui ne leur correspond
		// pas, et le produit afficherait ensuite des restes dus faux.
		const somme = choisies.reduce((total, c) => total + c.reste, 0n);
		if (somme !== montant) {
			throw new ConvexError(
				`Les factures choisies font ${versEuros(depuisCentimes(somme))} €, pas ` +
					`${versEuros(depuisCentimes(montant))} €. Le rapprochement a peut-être été calculé ` +
					'avant un autre règlement : reprenez la recherche.'
			);
		}

		const poses: Id<'reglements'>[] = [];
		for (const { facture, reste } of choisies) {
			const pose = await ctx.db.insert('reglements', {
				organizationId,
				factureId: facture._id,
				date,
				// CHAQUE FACTURE REÇOIT SON RESTE DÛ, pas une part du virement. Un
				// virement groupé n'est pas un paiement partiel réparti : c'est le
				// solde de plusieurs factures, et c'est ce que le décompte doit lire.
				montant: reste,
				nature: 'PAIEMENT',
				creeLe: Date.now(),
				// Le jour que le gérant a donné : une date réelle.
				dateSource: 'REELLE'
			});
			poses.push(pose);
			await ctx.db.patch(facture._id, { statutPaiement: 'SOLDEE' });
		}

		// L'HISTORIQUE DE CHAQUE DOSSIER TOUCHÉ (diagnostic UX du 27/10/2026) : réglé par un
		// virement, le dossier ne disait nulle part ce qui l'avait réglé.
		const parDossier = new Map<string, { references: string[]; total: bigint }>();
		for (const { facture, reste } of choisies) {
			if (facture.creanceId === undefined) continue;
			const deja = parDossier.get(facture.creanceId) ?? { references: [], total: 0n };
			deja.references.push(facture.reference);
			deja.total += reste;
			parDossier.set(facture.creanceId, deja);
		}
		const [annee, mois, jour] = date.split('-');
		for (const [creanceId, { references: refs, total }] of parDossier) {
			await ctx.db.insert('journal', {
				organizationId,
				cible: creanceId,
				cle: 'VIREMENT_NOTE',
				apres: `${refs.join(', ')} ${refs.length > 1 ? 'soldées' : 'soldée'} : ${versEuros(depuisCentimes(total))} €, reçus le ${jour}/${mois}/${annee}.`,
				auteur: 'GERANT',
				...(auteurUserId === undefined ? {} : { auteurUserId }),
				consigneLe: Date.now()
			});
		}

		// Un paiement peut faire franchir un jalon (`recouvrement/jalons.ts`).
		await ctx.scheduler.runAfter(0, internal.recouvrement.jalons.relever, { organizationId });
		return poses;
	}
});

/**
 * ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : ce handler appelle
 * `internal.<son propre module>`, ce qui crée un cycle d'inférence faisant
 * retomber le type `api` ENTIER à `any`.
 */
export const appliquer = authedMutation({
	args: {
		debiteurId: v.id('debiteurs'),
		references: v.array(v.string()),
		montant: v.int64(),
		date: v.string()
	},
	returns: v.array(v.id('reglements')),
	handler: async (ctx, args): Promise<Id<'reglements'>[]> => {
		const { organizationId } = await getUserOrg(ctx);
		const poses = await ctx.runMutation(internal.recouvrement.lettrage.appliquerInterne, {
			organizationId,
			...args,
			auteurUserId: ctx.user._id
		});
		// Un virement rapproché déplace ce qui reste dû : le pilote relit tout de suite.
		await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });
		return poses;
	}
});

/** Une erreur de rapprochement se défait dans la journée, pas un mois plus tard. */
const DELAI_POUR_ANNULER_MS = 24 * 60 * 60 * 1000;

/**
 * « ANNULER » UN RAPPROCHEMENT (diagnostic UX du 27/10/2026 : « je n'ai pas trouvé de
 * moyen d'annuler »). Un virement rapproché au mauvais client arrête les relances de qui
 * n'a pas payé : la pire erreur d'un logiciel de recouvrement, après relancer qui a payé.
 *
 * ⚠️ IL NE RETIRE QUE LES RÈGLEMENTS QU'IL A POSÉS, nommés par leur identifiant, de la
 * journée, et seulement si rien n'a été noté depuis sur ces factures : défaire par-dessus
 * un autre paiement rendrait un reste dû faux.
 */
export const annuler = authedMutation({
	args: { reglementIds: v.array(v.id('reglements')) },
	returns: v.null(),
	handler: async (ctx, { reglementIds }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		return annulerLesReglements(ctx, organizationId, reglementIds, ctx.user._id);
	}
});

/** Le cœur de l'annulation, appelé tel quel par les tests (Better Auth n'y est pas). */
export async function annulerLesReglements(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	reglementIds: readonly Id<'reglements'>[],
	userId: string
): Promise<null> {
	const maintenant = Date.now();
	const reglements = await Promise.all(reglementIds.map((id) => ctx.db.get(id)));
	const parDossier = new Map<string, string[]>();
	for (const reglement of reglements) {
		if (
			reglement === null ||
			reglement.organizationId !== organizationId ||
			reglement.nature !== 'PAIEMENT' ||
			maintenant - reglement.creeLe > DELAI_POUR_ANNULER_MS
		) {
			throw new ConvexError(
				'Ce virement ne s’annule plus d’ici : notez la correction sur la fiche du client.'
			);
		}
		const autres = await ctx.db
			.query('reglements')
			.withIndex('by_facture', (q) => q.eq('factureId', reglement.factureId))
			.collect();
		if (autres.some((a) => a._id !== reglement._id && a.creeLe > reglement.creeLe)) {
			throw new ConvexError(
				'Un autre paiement a été noté depuis sur l’une de ces factures : rien n’a été annulé.'
			);
		}
	}
	for (const reglement of reglements) {
		if (reglement === null) continue;
		await ctx.db.delete(reglement._id);
		const restants = (
			await ctx.db
				.query('reglements')
				.withIndex('by_facture', (q) => q.eq('factureId', reglement.factureId))
				.collect()
		).filter((r) => r._id !== reglement._id);
		const facture = await ctx.db.get(reglement.factureId);
		if (facture === null) continue;
		await ctx.db.patch(facture._id, {
			statutPaiement: restants.length > 0 ? 'PARTIELLEMENT_PAYEE' : 'IMPAYEE'
		});
		if (facture.creanceId !== undefined) {
			const refs = parDossier.get(facture.creanceId) ?? [];
			refs.push(facture.reference);
			parDossier.set(facture.creanceId, refs);
		}
	}
	for (const [creanceId, refs] of parDossier) {
		await ctx.db.insert('journal', {
			organizationId,
			cible: creanceId,
			cle: 'VIREMENT_ANNULE',
			apres: `${refs.join(', ')} de nouveau ${refs.length > 1 ? 'ouvertes' : 'ouverte'}.`,
			auteur: 'GERANT',
			auteurUserId: userId,
			consigneLe: maintenant
		});
	}
	await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });
	return null;
}

/**
 * LE GÉRANT CONFIRME LA RÉPARTITION QUE PRÉVOIT LA LOI (C. civ. 1342-10).
 *
 * ⚠️ ELLE EST RECALCULÉE ICI, JAMAIS REÇUE DE L'ÉCRAN : entre l'affichage et le
 * geste, un règlement a pu arriver. Chaque part devient un règlement daté ; une
 * facture que la part ne solde pas passe en « partiellement payée ».
 */
export const appliquerRepartition = authedMutation({
	args: { debiteurId: v.id('debiteurs'), montant: v.int64(), date: v.string() },
	returns: v.null(),
	handler: async (ctx, { debiteurId, montant, date }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		if (!estDateReelle(date)) {
			throw new ConvexError(
				`« ${date} » n’est pas une date : un règlement mal daté décale le calcul des pénalités.`
			);
		}
		const debiteur = await ctx.db.get(debiteurId);
		if (debiteur === null || debiteur.organizationId !== organizationId) {
			throw new ConvexError('Client introuvable');
		}
		await appliquerLaRepartition(ctx, organizationId, debiteurId, montant, date);
		await ctx.scheduler.runAfter(0, internal.recouvrement.pilote.reveiller, { organizationId });
		return null;
	}
});

/**
 * LA RÉPARTITION QUE PRÉVOIT LA LOI, ÉCRITE — recalculée ici, jamais reçue de
 * l'écran. Partagée par « Virement reçu » sur la fiche et par le geste de Plume
 * (12/10/2026) : un même paiement se répartit pareil, d'où qu'on le note.
 */
export async function appliquerLaRepartition(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	montant: bigint,
	date: string
): Promise<{ reference: string; montant: bigint; solde: boolean }[]> {
	const repartition = await repartitionDe(ctx, organizationId, debiteurId, montant);
	if (repartition.lignes.length === 0) {
		throw new ConvexError('Aucune facture de ce client n’attend de paiement.');
	}
	const candidates = await candidatesDe(ctx, organizationId, debiteurId);
	const parReference = new Map(candidates.map((c) => [c.facture.reference, c.facture]));
	for (const ligne of repartition.lignes) {
		const facture = parReference.get(ligne.reference)!;
		await ctx.db.insert('reglements', {
			organizationId,
			factureId: facture._id,
			date,
			montant: ligne.montant,
			nature: 'PAIEMENT',
			creeLe: Date.now(),
			// Le jour que le gérant a donné : une date réelle.
			dateSource: 'REELLE'
		});
		await ctx.db.patch(facture._id, {
			statutPaiement: ligne.solde ? 'SOLDEE' : 'PARTIELLEMENT_PAYEE'
		});
	}
	// Un paiement peut faire franchir un jalon (`recouvrement/jalons.ts`).
	await ctx.scheduler.runAfter(0, internal.recouvrement.jalons.relever, { organizationId });
	return repartition.lignes;
}
