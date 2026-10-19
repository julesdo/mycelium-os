import { fraction, type Fraction } from '../../../../socle/montants';
import { ajouterJours } from '../../calendrier';
import type { Bareme, PeriodeDeTaux } from '../../decompte';
import { PARAMETRES, exiger } from '../../parametres';
import { TAUX_BCE_PAR_SEMESTRE, exigerSemestre, semestreDe } from './taux';

/**
 * LE BARÈME PUBLIC : CE QUE DOIT UN ACHETEUR PUBLIC QUI PAIE EN RETARD (19/10/2026).
 *
 * Le code de la commande publique fait courir des intérêts moratoires et une
 * indemnité forfaitaire, de plein droit, dès le lendemain du délai de paiement
 * (`PARAMETRES.interetsMoratoiresDePleinDroit`). Trois différences avec le barème
 * commercial (L441-10 II), et chacune change le chiffre :
 *
 *   · BCE + 8 points, pas + 10 ;
 *   · UN SEUL taux pour toute la durée du retard, celui du semestre où les intérêts
 *     commencent à courir (R2192-31) — le commercial est recalé chaque semestre ;
 *   · des délais plafonnés par catégorie d'acheteur : trente jours, cinquante pour
 *     un établissement public de santé, soixante pour une entreprise publique.
 *
 * ⚠️ CE QUI N'EST PAS RECONNU N'EST PAS DEVINÉ. La catégorie d'un acheteur se lit sur
 * sa catégorie juridique (INSEE) ; un code que ce module ne range pas rend `null`, et
 * c'est au gérant de qualifier. Annoncer trente jours à un hôpital lui ferait
 * réclamer vingt jours d'intérêts qui ne sont pas dus.
 *
 * Toutes les valeurs viennent du registre ; ce module ne fait que les résoudre.
 */

/** Les dix points commerciaux et les huit points publics, en centièmes de point. */
const MAJORATION_COMMANDE_PUBLIQUE = 800n;

/** Le jour où les intérêts commencent à courir : le lendemain de la fin du délai (R2192-32). */
export function premierJourDInterets(finDuDelai: string): string {
	exiger(PARAMETRES.pointDepartInteretsMoratoires);
	return ajouterJours(finDuDelai, 1);
}

/**
 * Le taux des intérêts moratoires d'un retard qui commence ce jour-là : le taux BCE en
 * vigueur au premier jour de CE semestre, majoré de huit points (R2192-31). Lève en
 * nommant le semestre si la série ne le connaît pas.
 */
export function tauxInteretsMoratoires(premierJour: string): Fraction {
	const bce = exigerSemestre(
		TAUX_BCE_PAR_SEMESTRE,
		semestreDe(premierJour),
		'Taux BCE de refinancement'
	);
	return fraction(bce + MAJORATION_COMMANDE_PUBLIQUE, 10000n);
}

/**
 * Les périodes de taux d'une facture publique, prêtes pour `decompterFacture` : UNE
 * SEULE, qui part de l'échéance (le décompte compte de l'échéance incluse, soit le même
 * nombre de jours que du lendemain inclus) au taux ancré sur le lendemain.
 *
 * ⚠️ NE JAMAIS REMPLACER PAR `periodesDeTauxParDefaut` : sur dix-huit mois de retard,
 * elle poserait trois taux là où l'article n'en connaît qu'un.
 */
export function periodesDeTauxPublics(echeance: string): PeriodeDeTaux[] {
	return [{ debut: echeance, taux: tauxInteretsMoratoires(premierJourDInterets(echeance)) }];
}

/**
 * La catégorie d'un acheteur public, pour son délai de paiement.
 *
 * `POUVOIR_ADJUDICATEUR` : trente jours (R2192-10). `SANTE` : cinquante jours, les
 * établissements publics de santé (R2192-11, 1°). `ENTREPRISE_PUBLIQUE` : soixante
 * jours (R2192-11, 2°), jamais déduite d'un code : elle se qualifie.
 */
export type CategorieAcheteurPublic = 'POUVOIR_ADJUDICATEUR' | 'SANTE' | 'ENTREPRISE_PUBLIQUE';

/**
 * Les catégories juridiques reconnues, relevées sur le traitement des données de la
 * commande publique (decp-processing, `enrich.py`) et vérifiées sur AP-HP et le CHU de
 * Dijon par l'API Recherche d'entreprises : `docs/superpowers/recherches/2026-10-19-audit/
 * recherche-decp.json`. Les syndicats inter-hospitaliers (7365), les groupements de
 * coopération sanitaire (7470) et le médico-social public (7366) ne sont PAS rangés :
 * leur délai n'a pas été relevé.
 */
const SANTE = new Set(['7364']);
const COLLECTIVITES = new Set(['7210', '7312', '7354', '7355', '7220', '7225', '7229', '7230']);

export function categorieAcheteurPublic(
	categorieJuridique: string | undefined
): CategorieAcheteurPublic | null {
	if (categorieJuridique === undefined) return null;
	const code = categorieJuridique.trim();
	if (SANTE.has(code)) return 'SANTE';
	if (COLLECTIVITES.has(code) || code.startsWith('734') || code.startsWith('71')) {
		return 'POUVOIR_ADJUDICATEUR';
	}
	return null;
}

/** Une personne publique au sens des catégories juridiques INSEE : le chiffre 7. */
export function estPersonnePublique(categorieJuridique: string | undefined): boolean {
	return categorieJuridique !== undefined && /^7\d{3}$/.test(categorieJuridique.trim());
}

/** Le délai plafond d'une catégorie, en jours, lu au registre. */
export function delaiDePaiementPublic(categorie: CategorieAcheteurPublic): number {
	return exiger(PARAMETRES.delaisPaiementPublics)[categorie];
}

/**
 * L'échéance légale d'une demande de paiement reçue tel jour : la réception, plus le
 * délai de la catégorie. Sans catégorie connue : `null` — l'échéance ne se devine pas.
 */
export function echeanceLegalePublique(
	receptionDemande: string,
	categorie: CategorieAcheteurPublic | null
): string | null {
	if (categorie === null) return null;
	return ajouterJours(receptionDemande, delaiDePaiementPublic(categorie));
}

/** Les intérêts et l'indemnité se paient dans les 45 jours du paiement du principal (R2192-36). */
export function dateLimitePaiementDesAccessoires(miseEnPaiementDuPrincipal: string): string {
	return ajouterJours(miseEnPaiementDuPrincipal, exiger(PARAMETRES.paiementAccessoiresPublics));
}

/**
 * Ce que le gérant a dit de son client : une catégorie d'acheteur public, ou « privé ».
 * Une QUALIFICATION, pas une déduction cachée : elle l'emporte sur la catégorie juridique.
 */
export type QualificationAcheteur = CategorieAcheteurPublic | 'PRIVE';

/**
 * LE BARÈME D'UN CLIENT (19/10/2026, lot 1 bis) : la qualification du gérant d'abord,
 * puis la catégorie juridique lue au registre. Une personne publique que ce module ne
 * range pas est au barème public, catégorie à qualifier (son délai n'est pas connu).
 * `qualifie` dit si c'est le gérant qui l'a établi, pour que l'écran montre une
 * déduction comme une déduction.
 */
export function baremeDuDebiteur(debiteur: {
	readonly categorieJuridique?: string;
	readonly acheteurPublic?: QualificationAcheteur;
}): { bareme: Bareme; categorie: CategorieAcheteurPublic | null; qualifie: boolean } {
	if (debiteur.acheteurPublic === 'PRIVE') {
		return { bareme: 'COMMERCIAL', categorie: null, qualifie: true };
	}
	if (debiteur.acheteurPublic !== undefined) {
		return { bareme: 'COMMANDE_PUBLIQUE', categorie: debiteur.acheteurPublic, qualifie: true };
	}
	const categorie = categorieAcheteurPublic(debiteur.categorieJuridique);
	if (categorie !== null) return { bareme: 'COMMANDE_PUBLIQUE', categorie, qualifie: false };
	if (estPersonnePublique(debiteur.categorieJuridique)) {
		return { bareme: 'COMMANDE_PUBLIQUE', categorie: null, qualifie: false };
	}
	return { bareme: 'COMMERCIAL', categorie: null, qualifie: false };
}

/**
 * Une collectivité territoriale ou l'un de ses établissements publics, d'après sa
 * catégorie juridique : ceux que vise le mandatement d'office de L1612-18 du CGCT.
 */
export function estCollectiviteTerritoriale(categorieJuridique: string | undefined): boolean {
	return categorieJuridique !== undefined && COLLECTIVITES.has(categorieJuridique.trim());
}
