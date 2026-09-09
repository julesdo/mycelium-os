import { v } from 'convex/values';
import { internalQuery } from '../_generated/server';
import type { QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { depuisCentimes, enCentimes, fraction } from '../../socle/montants';
import type { PeriodeDeTaux, Reglement } from '../../verticales/recouvrement/decompte';
import {
	reveler,
	interetsCourusEntre,
	bilanDesPertes
} from '../../verticales/recouvrement/revelation';
import type { FacturePourRevelation } from '../../verticales/recouvrement/revelation';
import { periodesDeTauxParDefaut } from '../../verticales/recouvrement/pays/france/taux';
import { prescriptionDe } from '../../verticales/recouvrement/pays/france/prescription';
import type { SecteurCreance } from '../../verticales/recouvrement/pays/france/prescription';
import { estDateReelle } from '../../verticales/recouvrement/calendrier';
import { ajouterJours } from '../../verticales/recouvrement/calendrier';

/**
 * LA RÉVÉLATION, BRANCHÉE SUR LA BASE — l'assemblage, et rien d'autre.
 *
 * Toute la règle vit dans `verticales/recouvrement/revelation.ts` : ce qui
 * entre dans le calcul, ce qui en est écarté, ce qu'on ne sait pas chiffrer.
 * Ce fichier lit des lignes et les met en forme. Il ne décide de rien.
 *
 * ⚠️ SAUF D'UNE CHOSE, ET ELLE N'EST PAS UNE RÈGLE MÉTIER : savoir si l'on a le
 * DROIT d'affirmer « 0 € perdu depuis N jours ». Cette phrase porte sur NOTRE
 * travail, pas sur les données du client, et elle n'est vraie que si le
 * battement quotidien n'a pas échoué dans la période. La règle pure ne peut pas
 * le savoir — la table `battements` vit ici. C'est donc ici que les deux se
 * croisent, et le refus s'exprime par un champ, jamais par un silence.
 */

const CONVENTION = 'ACT_365' as const;

/**
 * Le point de départ des intérêts d'une facture.
 *
 * ⚠️ UNE EXIGIBILITÉ ABSENTE ET UNE EXIGIBILITÉ FAUSSE NE SE TRAITENT PAS
 * PAREIL, et c'est un test qui a imposé la distinction.
 *
 *   · **ABSENTE** — on retombe sur l'échéance. C'est un manque LÉGITIME et
 *     documenté : `dateExigibilite` est facultative en base parce qu'un FEC n'en
 *     porte pas, l'information vivant dans les conditions de règlement, hors du
 *     fichier. Sans ce repli, toutes les factures venues d'un export comptable
 *     seraient non chiffrées, et la révélation serait vide chez la majorité des
 *     clients. Le drapeau `exigibiliteDeduite` dit déjà au gérant ce qu'il
 *     confirme.
 *
 *   · **PRÉSENTE MAIS FAUSSE** — on ne retombe sur RIEN. Une exigibilité
 *     renseignée l'a été délibérément ; lui substituer l'échéance en silence
 *     décalerait le décompte de plusieurs jours d'intérêts SUR UNE SOMME
 *     RÉCLAMÉE, sans que rien ne le signale. C'est exactement le défaut que ce
 *     produit existe pour ne pas commettre. On rend la date telle quelle, pour
 *     que `reveler` la range dans `nonChiffrees` en la NOMMANT.
 *
 * La différence avec `prescriptionDe`, qui saute un candidat abîmé, n'est pas
 * une incohérence : une prescription approximée reste une surveillance, alors
 * qu'un intérêt approximé est un chiffre faux qu'on envoie à un débiteur.
 */
function departDe(facture: Doc<'facturesVente'>): string {
	if (facture.dateExigibilite !== undefined) return facture.dateExigibilite;
	return facture.dateEcheance ?? facture.dateEmission;
}

/**
 * Les périodes de taux applicables. Même règle que `decompte.ts` : un taux
 * contractuel vaut pour toute la durée, à défaut la série légale se réancre
 * chaque semestre.
 */
function periodesDe(
	facture: Doc<'facturesVente'>,
	depart: string,
	arreteAu: string
): PeriodeDeTaux[] {
	if (facture.tauxContractuel !== undefined) {
		return [
			{
				debut: depart,
				taux: fraction(facture.tauxContractuel.numerateur, facture.tauxContractuel.denominateur)
			}
		];
	}
	return periodesDeTauxParDefaut(depart, arreteAu);
}

/**
 * Les factures de l'organisation, prêtes pour la règle pure.
 *
 * ⚠️ NE LÈVE JAMAIS. Une facture dont la date de départ est inexploitable
 * ferait échouer `periodesDeTauxParDefaut` ici, avant même d'atteindre
 * `reveler` — et la révélation entière disparaîtrait de l'écran le jour du
 * premier import, celui qui décide de tout. Les périodes sont donc calculées
 * dans un `try`, et une facture qui en manque part avec une série VIDE :
 * `decompterFacture` lèvera dessus, `reveler` la nommera. Le refus reste
 * visible, à un seul endroit.
 */
async function facturesPour(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	arreteAu: string
): Promise<FacturePourRevelation[]> {
	const brutes = await ctx.db
		.query('facturesVente')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	const debiteurs = new Map(
		(
			await ctx.db
				.query('debiteurs')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect()
		).map((debiteur) => [debiteur._id, debiteur])
	);

	const preparees: FacturePourRevelation[] = [];

	for (const facture of brutes) {
		const depart = departDe(facture);
		const secteur: SecteurCreance = debiteurs.get(facture.debiteurId)?.secteur ?? 'INDETERMINE';

		let taux: PeriodeDeTaux[] = [];
		try {
			taux = periodesDe(facture, depart, arreteAu);
		} catch {
			// Série vide : le décompte lèvera, et `reveler` nommera la facture.
		}

		const reglements = await ctx.db
			.query('reglements')
			.withIndex('by_facture', (q) => q.eq('factureId', facture._id))
			.collect();

		preparees.push({
			reference: facture.reference,
			montantExigible: depuisCentimes(facture.montantTTC),
			dateExigibilite: depart,
			reglements: reglements.map(
				(ligne): Reglement => ({
					date: ligne.date,
					montant: depuisCentimes(ligne.montant),
					nature: ligne.nature
				})
			),
			taux,
			statutPaiement: facture.statutPaiement,
			...prescriptionDe([facture.dateExigibilite, facture.dateEcheance], secteur)
		});
	}

	return preparees;
}

const vRevelation = v.object({
	nombreFactures: v.number(),
	principal: v.int64(),
	interets: v.int64(),
	indemnites: v.int64(),
	supplement: v.int64(),
	total: v.int64(),
	interetsCourusDepuisHier: v.int64(),
	lignes: v.array(
		v.object({
			reference: v.string(),
			principalRestantDu: v.int64(),
			interets: v.int64(),
			indemniteForfaitaire: v.int64(),
			supplement: v.int64()
		})
	),
	nonChiffrees: v.array(v.object({ reference: v.string(), raison: v.string() }))
});

async function composerRevelation(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	arreteAu: string
) {
	const factures = await facturesPour(ctx, organizationId, arreteAu);
	const revelation = reveler(factures, arreteAu, CONVENTION);

	// LE COMPTEUR VIVANT. La veille se calcule ici plutôt que d'être demandée à
	// l'écran : deux dates envoyées séparément pourraient diverger d'un rendu à
	// l'autre, et le compteur paraîtrait bouger sans raison.
	const hier = estDateReelle(arreteAu) ? ajouterJours(arreteAu, -1) : arreteAu;

	return {
		nombreFactures: revelation.nombreFactures,
		principal: enCentimes(revelation.principal),
		interets: enCentimes(revelation.interets),
		indemnites: enCentimes(revelation.indemnites),
		supplement: enCentimes(revelation.supplement),
		total: enCentimes(revelation.total),
		interetsCourusDepuisHier: enCentimes(interetsCourusEntre(factures, hier, arreteAu, CONVENTION)),
		lignes: revelation.lignes.map((ligne) => ({
			reference: ligne.reference,
			principalRestantDu: enCentimes(ligne.principalRestantDu),
			interets: enCentimes(ligne.interets),
			indemniteForfaitaire: enCentimes(ligne.indemniteForfaitaire),
			supplement: enCentimes(ligne.supplement)
		})),
		nonChiffrees: revelation.nonChiffrees.map((n) => ({ ...n }))
	};
}

const vBilan = v.object({
	eteintesAvant: v.int64(),
	nombreEteintesAvant: v.number(),
	eteintesDepuis: v.int64(),
	nombreEteintesDepuis: v.number(),
	nonSurveillees: v.array(v.string()),
	joursSousSurveillance: v.number(),
	/**
	 * Le jour où le battement a échoué depuis l'arrivée du client, s'il y en a
	 * eu un. Renseigné, il INTERDIT d'afficher le compteur de zéro perte.
	 */
	surveillanceInterrompueLe: v.optional(v.string())
});

async function composerBilan(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	aujourdHui: string
) {
	const organisation = await ctx.db.get(organizationId);
	const depuis = new Date(organisation?.createdAt ?? Date.now()).toISOString().slice(0, 10);

	const factures = await facturesPour(ctx, organizationId, aujourdHui);
	const bilan = bilanDesPertes(factures, depuis, aujourdHui);

	// ⚠️ LE CROISEMENT QUI EMPÊCHE LE MENSONGE. Un seul jour d'échec depuis
	// l'arrivée suffit à retirer le droit d'affirmer « 0 € perdu » : pendant ce
	// jour-là, rien n'était surveillé. Les échecs ANTÉRIEURS à l'arrivée ne
	// comptent pas — ils portent sur une période dont on ne dit rien.
	const releves = await ctx.db
		.query('battements')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();
	const echec = releves
		.filter((releve) => releve.statut === 'ECHEC' && releve.jour >= depuis)
		.map((releve) => releve.jour)
		.sort()[0];

	return {
		eteintesAvant: enCentimes(bilan.eteintesAvant),
		nombreEteintesAvant: bilan.nombreEteintesAvant,
		eteintesDepuis: enCentimes(bilan.eteintesDepuis),
		nombreEteintesDepuis: bilan.nombreEteintesDepuis,
		nonSurveillees: [...bilan.nonSurveillees],
		joursSousSurveillance: bilan.joursSousSurveillance,
		surveillanceInterrompueLe: echec
	};
}

/** La révélation, sans authentification — pour les tests et les tâches planifiées. */
export const revelationInterne = internalQuery({
	args: { organizationId: v.id('organizations'), arreteAu: v.string() },
	returns: vRevelation,
	handler: async (ctx, { organizationId, arreteAu }) =>
		composerRevelation(ctx, organizationId, arreteAu)
});

export const revelation = authedQuery({
	args: { arreteAu: v.string() },
	returns: vRevelation,
	handler: async (ctx, { arreteAu }) => {
		const { organizationId } = await getUserOrg(ctx);
		return composerRevelation(ctx, organizationId, arreteAu);
	}
});

/** Le bilan des pertes, sans authentification — pour les tests. */
export const bilanInterne = internalQuery({
	args: { organizationId: v.id('organizations'), aujourdHui: v.string() },
	returns: vBilan,
	handler: async (ctx, { organizationId, aujourdHui }) =>
		composerBilan(ctx, organizationId, aujourdHui)
});

export const bilan = authedQuery({
	args: { aujourdHui: v.string() },
	returns: vBilan,
	handler: async (ctx, { aujourdHui }) => {
		const { organizationId } = await getUserOrg(ctx);
		return composerBilan(ctx, organizationId, aujourdHui);
	}
});
