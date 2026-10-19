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
	bilanDesPertes,
	diagnostiquer,
	separerParPeriode,
	type LigneRevelee
} from '../../verticales/recouvrement/revelation';
import { departDuRetard } from '../../verticales/recouvrement/exigibilite';
import {
	baremeDuDebiteur,
	delaiDePaiementPublic,
	periodesDeTauxPublics
} from '../../verticales/recouvrement/pays/france/commande-publique';
import type { Bareme } from '../../verticales/recouvrement/decompte';
import { plancherDHistorique } from '../../config/tarifs';
import { limitesDeLOrganisation } from '../limites';
import type { FacturePourRevelation } from '../../verticales/recouvrement/revelation';
import { periodesDeTauxParDefaut } from '../../verticales/recouvrement/pays/france/taux';
import { prescriptionDe } from '../../verticales/recouvrement/pays/france/prescription';
import type { SecteurCreance } from '../../verticales/recouvrement/pays/france/prescription';
import { estDateReelle } from '../../verticales/recouvrement/calendrier';
import { dossiersClasses } from './classement';
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
function departDe(
	facture: Doc<'facturesVente'>,
	delaiSupposeJours?: number
): { depart: string; supposee: boolean } {
	// La lecture de tout ce qui mesure (`exigibilite.ts`) : l'exigibilité, l'échéance,
	// sinon le délai supplétif depuis la date de la facture, marqué comme hypothèse.
	return departDuRetard(facture, delaiSupposeJours === undefined ? {} : { delaiSupposeJours });
}

/**
 * Le barème d'un client et le délai à supposer pour ses factures sans échéance (lot 1
 * bis) : celui de sa catégorie d'acheteur public, ou le plus long quand elle n'est pas
 * qualifiée. Le doute ne profite jamais au produit : un délai plus long fait partir le
 * retard plus tard.
 */
function baremeEtDelai(debiteur: Doc<'debiteurs'> | undefined): {
	bareme: Bareme;
	delaiSupposeJours?: number;
} {
	const { bareme, categorie } = baremeDuDebiteur({
		...(debiteur?.categorieJuridique === undefined
			? {}
			: { categorieJuridique: debiteur.categorieJuridique }),
		...(debiteur?.acheteurPublic === undefined ? {} : { acheteurPublic: debiteur.acheteurPublic })
	});
	if (bareme === 'COMMERCIAL') return { bareme };
	return {
		bareme,
		delaiSupposeJours:
			categorie === null
				? Math.max(
						delaiDePaiementPublic('POUVOIR_ADJUDICATEUR'),
						delaiDePaiementPublic('SANTE'),
						delaiDePaiementPublic('ENTREPRISE_PUBLIQUE')
					)
				: delaiDePaiementPublic(categorie)
	};
}

/**
 * Les périodes de taux applicables. Même règle que `decompte.ts` : un taux
 * contractuel vaut pour toute la durée, à défaut la série légale se réancre
 * chaque semestre.
 */
function periodesDe(
	facture: Doc<'facturesVente'>,
	depart: string,
	arreteAu: string,
	bareme: Bareme = 'COMMERCIAL'
): PeriodeDeTaux[] {
	// Le barème public : un seul taux, ancré sur le lendemain de l'échéance (R2192-31).
	if (bareme === 'COMMANDE_PUBLIQUE') return periodesDeTauxPublics(depart);
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
/**
 * De quoi rouvrir une ligne de la révélation sur son dossier.
 *
 * ⚠️ LA RÈGLE PURE NE CONNAÎT QUE DES RÉFÉRENCES, et c'est très bien : elle n'a
 * pas à savoir ce qu'est un identifiant Convex. Mais une ligne qui n'affiche
 * qu'une référence ne s'ouvre pas — il faut retrouver la facture dans une liste,
 * à la main, alors que le lien existe une ligne plus haut dans ce fichier. La
 * correspondance se garde donc ici, au moment où les deux sont en main.
 */
interface RepereFacture {
	readonly _id: Id<'facturesVente'>;
	readonly debiteurId: Id<'debiteurs'>;
	readonly debiteur: string;
	/** Le jour d'où court le retard — le MÊME `departDe` que le calcul. */
	readonly exigibleDepuis: string;
}

async function facturesPour(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	arreteAu: string,
	reperes?: Map<string, RepereFacture>
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
	// Ce que le gérant a classé n'est plus « ce qui vous est dû » (`classement.ts`).
	const classes = await dossiersClasses(ctx, organizationId);

	for (const facture of brutes) {
		if (facture.creanceId !== undefined && classes.has(facture.creanceId)) continue;
		const debiteur = debiteurs.get(facture.debiteurId);
		const { bareme, delaiSupposeJours } = baremeEtDelai(debiteur);
		const { depart, supposee } = departDe(facture, delaiSupposeJours);
		const secteur: SecteurCreance = debiteur?.secteur ?? 'INDETERMINE';

		// ⚠️ LA RÉFÉRENCE EST LA CLÉ, et elle est unique par établissement :
		// `by_org_and_reference` est l'index sur lequel l'import dédoublonne, et
		// un créancier ne réutilise pas son propre numéro de facture.
		reperes?.set(facture.reference, {
			_id: facture._id,
			debiteurId: facture.debiteurId,
			debiteur: debiteur?.denomination ?? 'Débiteur inconnu',
			exigibleDepuis: depart
		});

		let taux: PeriodeDeTaux[] = [];
		try {
			taux = periodesDe(facture, depart, arreteAu, bareme);
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
			...(bareme === 'COMMANDE_PUBLIQUE' ? { bareme } : {}),
			statutPaiement: facture.statutPaiement,
			...(reglements.some((r) => r.dateSource === 'LECTURE')
				? { datesDeReglementSures: false }
				: {}),
			...(supposee ? { echeanceSupposee: true } : {}),
			...prescriptionDe([facture.dateExigibilite, facture.dateEcheance], secteur)
		});
	}

	return preparees;
}

/**
 * LE PLANCHER D'HISTORIQUE DE L'ÉTABLISSEMENT (19/10/2026) : d'où partent ses chiffres.
 * Découverte calcule les trois derniers mois ; toute formule, et la facturation fermée,
 * calculent tout (`null`). La SEULE fonction qui le dit : la révélation, « Ce qui est
 * dû » et le diagnostic la lisent toutes trois, et ne peuvent donc pas diverger.
 */
export async function plancherDe(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	arreteAu: string
): Promise<string | null> {
	const { historiqueMois } = await limitesDeLOrganisation(ctx, organizationId);
	return estDateReelle(arreteAu) ? plancherDHistorique(historiqueMois, arreteAu) : null;
}

const vHorsPeriode = v.object({ nombre: v.number(), principal: v.int64() });

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
			/**
			 * LA FACTURE ELLE-MÊME, pour que la ligne s'ouvre au doigt.
			 *
			 * ⚠️ FACULTATIF, parce que la règle pure peut nommer une facture que ce
			 * fichier n'a pas repérée — une graphie de référence inattendue, une
			 * donnée ancienne. La ligne s'affiche alors sans mener nulle part, ce
			 * qui est la vérité ; fabriquer une destination ouvrirait le mauvais
			 * dossier, et c'est pire qu'une ligne qu'on ne peut pas ouvrir.
			 */
			_id: v.optional(v.id('facturesVente')),
			debiteurId: v.optional(v.id('debiteurs')),
			/** La dénomination du client, ou `null` quand la facture n'a pas été repérée. */
			debiteur: v.union(v.string(), v.null()),
			principalRestantDu: v.int64(),
			interets: v.int64(),
			indemniteForfaitaire: v.int64(),
			supplement: v.int64(),
			/**
			 * LE JOUR D'OÙ COURT LE RETARD, celui-là même que le calcul emploie
			 * (`departDe`). C'est lui qui range la facture dans sa tranche
			 * d'ancienneté sur l'écran du matin (07/10/2026) ; le relire ailleurs
			 * ferait ranger par une date que le calcul n'a pas prise.
			 *
			 * ⚠️ FACULTATIF POUR LA MÊME RAISON QUE `_id` : une facture que la règle
			 * nomme sans que ce fichier l'ait repérée n'en a pas, et l'écran la
			 * nomme à part au lieu de la ranger au hasard.
			 */
			exigibleDepuis: v.optional(v.string())
		})
	),
	nonChiffrees: v.array(v.object({ reference: v.string(), raison: v.string() })),
	/** D'où partent les chiffres ; `null` : de toujours. */
	du: v.union(v.string(), v.null()),
	/** Ce qui est plus ancien que `du` : compté, jamais chiffré. */
	horsPeriode: vHorsPeriode
});

function ligneAffichee(ligne: LigneRevelee, reperes: ReadonlyMap<string, RepereFacture>) {
	const repere = reperes.get(ligne.reference);
	return {
		reference: ligne.reference,
		_id: repere?._id,
		debiteurId: repere?.debiteurId,
		debiteur: repere?.debiteur ?? null,
		principalRestantDu: enCentimes(ligne.principalRestantDu),
		interets: enCentimes(ligne.interets),
		indemniteForfaitaire: enCentimes(ligne.indemniteForfaitaire),
		supplement: enCentimes(ligne.supplement),
		exigibleDepuis: repere?.exigibleDepuis
	};
}

async function composerRevelation(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	arreteAu: string
) {
	const reperes = new Map<string, RepereFacture>();
	const du = await plancherDe(ctx, organizationId, arreteAu);
	const { dansLaPeriode: factures, horsPeriode } = separerParPeriode(
		await facturesPour(ctx, organizationId, arreteAu, reperes),
		du
	);
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
		lignes: revelation.lignes.map((ligne) => ligneAffichee(ligne, reperes)),
		nonChiffrees: revelation.nonChiffrees.map((n) => ({ ...n })),
		du,
		horsPeriode: { nombre: horsPeriode.nombre, principal: enCentimes(horsPeriode.principal) }
	};
}

const vDiagnostic = v.object({
	du: v.union(v.string(), v.null()),
	arreteAu: v.string(),
	impayees: v.object({
		nombreFactures: v.number(),
		principal: v.int64(),
		interets: v.int64(),
		indemnites: v.int64(),
		supplement: v.int64(),
		lignes: vRevelation.fields.lignes
	}),
	payeesEnRetard: v.object({
		nombreFactures: v.number(),
		interets: v.int64(),
		indemnites: v.int64(),
		supplement: v.int64(),
		lignes: v.array(
			v.object({
				reference: v.string(),
				_id: v.optional(v.id('facturesVente')),
				debiteur: v.union(v.string(), v.null()),
				debiteurId: v.optional(v.id('debiteurs')),
				/** Le client est un acheteur public : sa réclamation se prépare (lot 1 bis). */
				public: v.boolean(),
				payeeLe: v.string(),
				joursDeRetard: v.number(),
				interets: v.int64(),
				indemniteForfaitaire: v.int64(),
				supplement: v.int64(),
				echeanceSupposee: v.boolean()
			})
		)
	}),
	horsPeriode: vHorsPeriode,
	nonChiffrees: v.array(v.object({ reference: v.string(), raison: v.string() })),
	supplementTotal: v.int64(),
	echeancesSupposees: v.number()
});

/**
 * LE DIAGNOSTIC EXPRESS (19/10/2026) : la révélation sur la période, plus ce que la loi
 * ajoutait aux factures payées en retard. La règle vit dans `diagnostiquer` ; ici, on lit
 * et on met en forme.
 */
async function composerDiagnostic(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	arreteAu: string
) {
	const reperes = new Map<string, RepereFacture>();
	const du = await plancherDe(ctx, organizationId, arreteAu);
	const factures = await facturesPour(ctx, organizationId, arreteAu, reperes);
	const d = diagnostiquer(factures, du, arreteAu, CONVENTION);
	const publiques = new Set(
		factures.filter((f) => f.bareme === 'COMMANDE_PUBLIQUE').map((f) => f.reference)
	);
	return {
		du: d.du,
		arreteAu: d.arreteAu,
		impayees: {
			nombreFactures: d.impayees.nombreFactures,
			principal: enCentimes(d.impayees.principal),
			interets: enCentimes(d.impayees.interets),
			indemnites: enCentimes(d.impayees.indemnites),
			supplement: enCentimes(d.impayees.supplement),
			lignes: d.impayees.lignes.map((ligne) => ligneAffichee(ligne, reperes))
		},
		payeesEnRetard: {
			nombreFactures: d.payeesEnRetard.nombreFactures,
			interets: enCentimes(d.payeesEnRetard.interets),
			indemnites: enCentimes(d.payeesEnRetard.indemnites),
			supplement: enCentimes(d.payeesEnRetard.supplement),
			lignes: d.payeesEnRetard.lignes.map((l) => ({
				reference: l.reference,
				_id: reperes.get(l.reference)?._id,
				debiteur: reperes.get(l.reference)?.debiteur ?? null,
				debiteurId: reperes.get(l.reference)?.debiteurId,
				public: publiques.has(l.reference),
				payeeLe: l.payeeLe,
				joursDeRetard: l.joursDeRetard,
				interets: enCentimes(l.interets),
				indemniteForfaitaire: enCentimes(l.indemniteForfaitaire),
				supplement: enCentimes(l.supplement),
				echeanceSupposee: l.echeanceSupposee
			}))
		},
		horsPeriode: { nombre: d.horsPeriode.nombre, principal: enCentimes(d.horsPeriode.principal) },
		nonChiffrees: d.nonChiffrees.map((n) => ({ ...n })),
		supplementTotal: enCentimes(d.supplementTotal),
		echeancesSupposees: d.echeancesSupposees
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

/** Le diagnostic, sans authentification — pour les tests et le relevé des étapes. */
export const diagnosticInterne = internalQuery({
	args: { organizationId: v.id('organizations'), arreteAu: v.string() },
	returns: vDiagnostic,
	handler: async (ctx, { organizationId, arreteAu }) =>
		composerDiagnostic(ctx, organizationId, arreteAu)
});

export const diagnostic = authedQuery({
	args: { arreteAu: v.string() },
	returns: vDiagnostic,
	handler: async (ctx, { arreteAu }) => {
		const { organizationId } = await getUserOrg(ctx);
		return composerDiagnostic(ctx, organizationId, arreteAu);
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
