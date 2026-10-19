import { depuisCentimes, fraction, multiplier, type Montant } from '../socle/montants';
import { PARAMETRES, estUtilisable } from '../verticales/recouvrement/parametres';
import { tauxInteretsMoratoires } from '../verticales/recouvrement/pays/france/commande-publique';
import { datePrescriptionQuadriennale } from '../verticales/recouvrement/pays/france/prescription';
import { dedoublonner, type GenreAcheteur, type LigneDecp } from './decp';
import {
	dixiemesLisibles,
	HOPITAUX_PAR_TAILLE,
	RETARDS_PUBLICS,
	DELAIS_DES_BUDGETS
} from './retards-publics';

/**
 * CE QU'UN ACHETEUR PUBLIC POURRAIT DEVOIR À UN FOURNISSEUR, ESTIMÉ AVANT L'APPEL
 * (19/10/2026, audit stratégique, lot 5).
 *
 * UN MAJORANT DÉCOMPOSÉ, qui se refait à la main : un segment par acheteur et par année,
 * avec le montant de l'année, le retard retenu, les pénalités au barème public et les
 * frais de recouvrement. Et SES HYPOTHÈSES ÉCRITES, parce qu'aucune donnée publique ne
 * dit ce qui a été facturé ni quand cela a été payé :
 *
 * - le montant d'un marché est un PLAFOND attribué : réparti mois par mois sur sa durée,
 *   jusqu'au mois en cours, il donne ce qui a PU être facturé ;
 * - une facture par mois de marché ;
 * - le retard est la moyenne de la catégorie (hôpitaux) ou du budget (collectivité,
 *   DGFiP), moins le délai permis, appliquée à tout le montant ;
 * - les frais de recouvrement, à la part des paiements faits après le délai ;
 * - les années que la loi peut laisser prescrites ne sont pas comptées (lecture de la
 *   loi de 1968, `PARAMETRES.delaiPrescriptionQuadriennale`) ; la date butoir est celle
 *   de la plus ancienne année comptée.
 *
 * ⚠️ RESERVÉE À L'ÉQUIPE, POUR PRÉPARER UN APPEL : ce n'est pas un décompte, elle ne part
 * jamais vers un acheteur, et on ne nomme pas un acheteur public dans un message public.
 * Seul le décompte des vraies factures du fournisseur (le diagnostic) chiffre ce qui est dû.
 */

export interface SegmentEstime {
	readonly acheteur: string;
	readonly annee: number;
	readonly montantAnnuelCentimes: bigint;
	/** Le retard retenu, au dixième de jour. */
	readonly joursDeRetard: number;
	readonly interetsCentimes: bigint;
	readonly indemnitesCentimes: bigint;
}

export interface Estimation {
	readonly segments: SegmentEstime[];
	readonly hypotheses: string[];
	readonly totalCentimes: bigint;
	/** Le dernier jour pour réclamer la plus ancienne année comptée (lecture), ou `null`. */
	readonly dateButoir: string | null;
}

/** Au-delà, les plus petits segments se regroupent : la fiche reste lisible. */
const SEGMENTS_MAX = 120;

/** « 2025-03 » plus `k` mois. */
function moisPlus(mois: string, k: number): string {
	const [a, m] = mois.split('-').map(Number) as [number, number];
	const total = a * 12 + (m - 1) + k;
	return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

interface Cumul {
	acheteur: string;
	acheteurId: string;
	genre: Exclude<GenreAcheteur, 'AUTRE'>;
	annee: number;
	montant: Montant;
	factures: number;
}

function pluriel(n: number, un: string, plusieurs: string): string {
	return `${n} ${n > 1 ? plusieurs : un}`;
}

export function estimer(
	lignesBrutes: readonly LigneDecp[],
	delaisDesBudgets: ReadonlyMap<string, number>,
	jour: string
): Estimation {
	const annee = Number(jour.slice(0, 4));
	const moisCourant = jour.slice(0, 7);
	const anneeMin = annee - Number(PARAMETRES.delaiPrescriptionQuadriennale.valeur);
	const delais = PARAMETRES.delaisPaiementPublics.valeur;
	const indemnite = PARAMETRES.indemniteForfaitairePublique;
	const indemniteCentimes =
		estUtilisable(indemnite) && typeof indemnite.valeur === 'bigint' ? indemnite.valeur : null;

	const lignes = dedoublonner(lignesBrutes);
	let autres = 0;
	let sansDuree = 0;
	const cumuls = new Map<string, Cumul>();
	for (const l of lignes) {
		if (l.genre === 'AUTRE') {
			autres += 1;
			continue;
		}
		const duree = l.dureeMois ?? 12;
		if (l.dureeMois === undefined) sansDuree += 1;
		const moisParAnnee = new Map<number, number>();
		const depart = l.dateNotification.slice(0, 7);
		for (let k = 0; k < duree; k += 1) {
			const mois = moisPlus(depart, k);
			if (mois > moisCourant) break;
			const a = Number(mois.slice(0, 4));
			if (a < anneeMin) continue;
			moisParAnnee.set(a, (moisParAnnee.get(a) ?? 0) + 1);
		}
		for (const [a, mois] of moisParAnnee) {
			const cle = `${l.acheteurId}|${a}`;
			const part = multiplier(
				depuisCentimes(l.montantCentimes),
				fraction(BigInt(mois), BigInt(duree))
			);
			const c = cumuls.get(cle);
			if (c === undefined) {
				cumuls.set(cle, {
					acheteur: l.acheteurNom,
					acheteurId: l.acheteurId,
					genre: l.genre,
					annee: a,
					montant: part,
					factures: mois
				});
			} else {
				c.montant = depuisCentimes(c.montant + part);
				c.factures += mois;
			}
		}
	}

	const tauxManquants = new Set<number>();
	let budgetsLus = 0;
	const budgetsVus = new Set<string>();
	const segments: SegmentEstime[] = [...cumuls.values()]
		.sort((a, b) => a.annee - b.annee || a.acheteur.localeCompare(b.acheteur, 'fr'))
		.map((c) => {
			const permis = (c.genre === 'HOPITAL' ? delais.SANTE : delais.POUVOIR_ADJUDICATEUR) * 10;
			const budget = c.genre === 'COLLECTIVITE' ? delaisDesBudgets.get(c.acheteurId) : undefined;
			if (budget !== undefined && !budgetsVus.has(c.acheteurId)) {
				budgetsVus.add(c.acheteurId);
				budgetsLus += 1;
			}
			const moyen =
				c.genre === 'HOPITAL'
					? RETARDS_PUBLICS.hopitaux.delaiMoyen
					: (budget ?? RETARDS_PUBLICS.collectivites.delaiMoyen);
			const retard = Math.max(0, moyen - permis);
			let interets = 0n;
			if (retard > 0) {
				try {
					// Le taux d'un retard qui commence au milieu de l'année (un seul taux, R2192-31).
					const debut = `${c.annee}-07-01` <= jour ? `${c.annee}-07-01` : jour;
					const t = tauxInteretsMoratoires(debut);
					interets = multiplier(
						c.montant,
						fraction(t.numerateur * BigInt(retard), t.denominateur * 3650n)
					);
				} catch {
					tauxManquants.add(c.annee);
				}
			}
			const partAuDela =
				c.genre === 'HOPITAL'
					? RETARDS_PUBLICS.hopitaux.partAuDela
					: RETARDS_PUBLICS.collectivites.partAuDela;
			const enRetard = retard > 0 ? Math.round((c.factures * partAuDela) / 1000) : 0;
			return {
				acheteur: c.acheteur,
				annee: c.annee,
				montantAnnuelCentimes: c.montant,
				joursDeRetard: retard / 10,
				interetsCentimes: interets,
				indemnitesCentimes: indemniteCentimes === null ? 0n : indemniteCentimes * BigInt(enRetard)
			};
		});

	const compte = (s: SegmentEstime) => s.interetsCentimes + s.indemnitesCentimes;
	const totalCentimes = segments.reduce((t, s) => t + compte(s), 0n);
	const anneesComptees = segments.filter((s) => compte(s) > 0n).map((s) => s.annee);
	const dateButoir =
		anneesComptees.length === 0
			? null
			: datePrescriptionQuadriennale(Math.min(...anneesComptees)).dernierJourPourAgir;

	const hopitaux = segments.length > 0 && [...cumuls.values()].some((c) => c.genre === 'HOPITAL');
	const collectivites = [...cumuls.values()].some((c) => c.genre === 'COLLECTIVITE');
	const h = RETARDS_PUBLICS.hopitaux;
	const co = RETARDS_PUBLICS.collectivites;
	const tailles = HOPITAUX_PAR_TAILLE.map((t) => t.delaiMoyen);
	const hypotheses = [
		'Le montant de chaque marché est un plafond attribué (données de la commande publique) : ce qui a été facturé peut être moindre. L’estimation est un majorant.',
		`Chaque montant est réparti mois par mois sur la durée du marché, jusqu’au mois en cours, à raison d’une facture par mois${sansDuree === 0 ? '' : ` ; ${pluriel(sansDuree, 'marché sans durée publiée', 'marchés sans durée publiée')} : douze mois retenus`}.`,
		...(hopitaux
			? [
					`Hôpitaux : ${dixiemesLisibles(h.delaiMoyen)} jours de délai moyen de paiement en métropole (de ${dixiemesLisibles(Math.min(...tailles))} à ${dixiemesLisibles(Math.max(...tailles))} jours selon leur taille, inconnue ici), pour ${delais.SANTE} jours permis ; ${dixiemesLisibles(h.partAuDela)} % des paiements après ce délai. Source : ${h.source}.`
				]
			: []),
		...(collectivites
			? [
					`Collectivités : le délai moyen de chaque budget quand il est publié (${budgetsLus} trouvé${budgetsLus > 1 ? 's' : ''} ; ${DELAIS_DES_BUDGETS.source}), à défaut ${dixiemesLisibles(co.delaiMoyen)} jours en moyenne en métropole, pour ${delais.POUVOIR_ADJUDICATEUR} jours permis ; ${dixiemesLisibles(co.partAuDela)} % des paiements après ce délai. Source : ${co.source}.`
				]
			: []),
		'Le retard moyen est appliqué à tout le montant de l’année ; les frais de recouvrement, à la part des factures payées après le délai.',
		`Les années avant ${anneeMin} ne sont pas comptées : leurs pénalités peuvent être prescrites (lecture de la loi : quatre ans à partir du 1er janvier qui suit l’année des prestations).`,
		...(autres === 0
			? []
			: [
					`${pluriel(autres, 'marché avec d’autres acheteurs publics n’est pas compté', 'marchés avec d’autres acheteurs publics ne sont pas comptés')} (État, établissements publics) : aucun délai moyen relevé pour eux.`
				]),
		...(tauxManquants.size === 0
			? []
			: [
					`Le taux de la BCE manque pour ${[...tauxManquants].join(', ')} : les pénalités de ces années ne sont pas comptées.`
				])
	];

	// Une fiche lisible : les plus petits segments au-delà du plafond sont écartés, et comptés.
	if (segments.length > SEGMENTS_MAX) {
		const gardes = [...segments].sort((a, b) =>
			compte(b) > compte(a) ? 1 : compte(b) < compte(a) ? -1 : 0
		);
		const retires = gardes.splice(SEGMENTS_MAX);
		hypotheses.push(
			`${retires.length} petits segments ne sont pas détaillés ici ; ils restent dans le total.`
		);
		return {
			segments: gardes.sort(
				(a, b) => a.annee - b.annee || a.acheteur.localeCompare(b.acheteur, 'fr')
			),
			hypotheses,
			totalCentimes,
			dateButoir
		};
	}
	return { segments, hypotheses, totalCentimes, dateButoir };
}
