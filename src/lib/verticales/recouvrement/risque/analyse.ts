import { estDateReelle } from '../calendrier';
import { PARAMETRES } from '../parametres';
import {
	ACTIF_NET_SOUS_MOITIE,
	AGE_MAXIMAL_DES_COMPTES_MOIS,
	ANCIENNETE,
	AUTONOMIE,
	COMPTES,
	COMPTES_A_JOUR_MOIS,
	COMPTES_EN_RETARD_MOIS,
	CROISSANCE,
	DELAI_FOURNISSEURS,
	FENETRE_DIRIGEANTS_ANNEES,
	HABITUDE,
	INDICE_DE_DEPART,
	LIQUIDITE,
	MANDATS,
	NOUVEAU_DIRIGEANT,
	PLAFOND_EN_PROCEDURE,
	POIDS_FORT_DES,
	POIDS_MOYEN_DES,
	PROCEDURE_EN_COURS,
	PROCEDURE_TERMINEE,
	PROCEDURES_DES_DIRIGEANTS,
	RESULTAT,
	RETARD_EN_COURS,
	SEUIL_A_SURVEILLER,
	SEUIL_PRUDENCE,
	SEUIL_RIEN_A_SIGNALER,
	SOCIETES_BREVES,
	TRESORERIE_NEGATIVE,
	VERSION_DES_REGLES
} from './regles';

/**
 * L'ANALYSE DU RISQUE D'UN CLIENT — des faits publics et votre historique,
 * résumés en un indice qui se décompose (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE CE MODULE FAIT, ET CE QU'IL REFUSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il lit une fiche d'entreprise (traduite de Pappers par `pays/france/pappers.ts`),
 * le parcours de ses dirigeants et l'habitude de paiement que le gérant observe
 * chez lui. Il rend des FAITS, chacun avec sa source et son effet sur l'indice,
 * et un indice qui en est la somme.
 *
 * ⚠️ IL NE LIT NI CONDAMNATION, NI SANCTION PERSONNELLE. L'article 46 de la loi
 * n° 78-17 en réserve le traitement à des personnes que nous ne sommes pas. Les
 * antécédents d'un dirigeant se lisent dans les SOCIÉTÉS qu'il a dirigées
 * (procédures collectives publiées), jamais dans sa personne.
 *
 * ⚠️ UN RAPPROCHEMENT INCERTAIN N'ATTRIBUE RIEN. Deux homonymes nés le même mois,
 * ou une date de naissance absente : le parcours n'est pas lu, et la lisibilité
 * le dit. Attribuer à tort la liquidation d'un autre serait la faute la plus
 * grave de ce module.
 *
 * ⚠️ DES COMPTES CONFIDENTIELS NE BAISSENT PAS L'INDICE. La loi le permet aux
 * petites entreprises (article L232-25 du code de commerce) : ils réduisent la
 * LISIBILITÉ, qui s'affiche à part. Ne pas déposer ses comptes, en revanche, est
 * un fait.
 *
 * ⚠️ AUCUN MOT DE JUGEMENT. Des faits (« 3 sociétés dirigées par Jean Dupont ont
 * connu une procédure collective »), jamais « suspect », jamais « fraude ».
 *
 * ⚠️ AUCUNE HORLOGE ICI : `aujourdHui` est un argument, comme pour le décompte.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CE QUI ENTRE
// ═══════════════════════════════════════════════════════════════════════════

export interface ComptesDeposes {
	readonly anneeCloture: number;
	/** `AAAA-MM-JJ`. */
	readonly dateCloture?: string;
	readonly dateDepot?: string;
	/** Confidentialité totale (micro-entreprise). */
	readonly confidentiels: boolean;
	/** Seul le compte de résultat est confidentiel (petite entreprise). */
	readonly resultatConfidentiel: boolean;
}

/** Un exercice, tel que ses comptes publiés le chiffrent. Les montants en centimes. */
export interface ExerciceFinancier {
	readonly annee: number;
	readonly dateCloture?: string;
	readonly chiffreAffaires?: bigint;
	readonly resultat?: bigint;
	readonly tresorerie?: bigint;
	/** Capitaux propres sur total du bilan, en %. */
	readonly autonomieFinancierePct?: number;
	readonly liquiditeGenerale?: number;
	/** Le délai auquel il paie ses fournisseurs, en jours. */
	readonly delaiFournisseursJours?: number;
	/** Variation du chiffre d'affaires sur un an, en %. */
	readonly croissancePct?: number;
}

export interface ProcedureDeLEntreprise {
	/** Le type, tel que le registre l'écrit (« Liquidation judiciaire »). */
	readonly type: string;
	readonly debut?: string;
	readonly fin?: string;
}

export interface DirigeantPublie {
	readonly nomComplet: string;
	readonly nom?: string;
	readonly prenom?: string;
	readonly personneMorale: boolean;
	readonly siren?: string;
	readonly qualites: readonly string[];
	readonly depuis?: string;
	/** Le mois de naissance, quand le registre le publie : il sert à rapprocher, jamais à afficher. */
	readonly naissance?: { readonly annee: number; readonly mois: number };
}

export interface FicheEntreprise {
	readonly siren: string;
	readonly denomination: string;
	readonly formeJuridique?: string;
	readonly personneMorale: boolean;
	readonly dateCreation?: string;
	/** L'entreprise n'est plus en activité (cessation ou radiation). */
	readonly fermee: boolean;
	readonly dateFermeture?: string;
	readonly procedureEnCours: boolean;
	readonly procedures: readonly ProcedureDeLEntreprise[];
	readonly comptes: readonly ComptesDeposes[];
	/** Du plus récent au plus ancien. */
	readonly exercices: readonly ExerciceFinancier[];
	/** `null` : le registre n'a pas été interrogé sur ce point. */
	readonly actifNetSousMoitie: { readonly enCours: boolean; readonly depuis?: string } | null;
	readonly dirigeants: readonly DirigeantPublie[];
	/** La date de la donnée, pour la source affichée. */
	readonly releveLe: string;
}

/** Comment un dirigeant a été rapproché de ses autres sociétés. */
export type Rapprochement =
	| 'IDENTIFIE'
	| 'HOMONYMES'
	| 'SANS_NAISSANCE'
	| 'NON_TROUVE'
	| 'PERSONNE_MORALE'
	| 'NON_LU';

export interface SocieteDirigee {
	readonly siren: string;
	readonly denomination: string;
	readonly enActivite: boolean;
	readonly creeLe?: string;
	readonly fermeeLe?: string;
}

/** Une annonce de jugement d'ouverture, au journal officiel des entreprises. */
export interface ProcedureDUneSociete {
	readonly siren: string;
	readonly denomination: string;
	readonly dateParution: string;
	/** La nature, telle que le journal l'écrit. Jamais reformulée. */
	readonly nature: string;
	readonly url: string;
}

export interface ParcoursDirigeant {
	readonly nomComplet: string;
	readonly qualites: readonly string[];
	readonly depuis?: string;
	readonly rapprochement: Rapprochement;
	/** Le nombre total de sociétés, quand le registre le donne. */
	readonly societesTotal?: number;
	/** Les autres sociétés (pas celle qu'on analyse). */
	readonly societes: readonly SocieteDirigee[];
	/** Les jugements d'ouverture de ces autres sociétés, dans la fenêtre. */
	readonly procedures: readonly ProcedureDUneSociete[];
}

/** Ce que le gérant observe chez lui. `null` : ce n'est pas (encore) un client. */
export interface PaiementsChezVous {
	/** Le délai médian après l'échéance, quand l'habitude est établie. */
	readonly habitudeJours: number | null;
	readonly echantillon: number;
	readonly plusVieuxRetardJours: number | null;
	readonly facturesEnRetard: number;
}

export interface EntreesDeLAnalyse {
	readonly fiche: FicheEntreprise;
	readonly dirigeants: readonly ParcoursDirigeant[];
	readonly paiements: PaiementsChezVous | null;
	/** `AAAA-MM-JJ`. */
	readonly aujourdHui: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CE QUI SORT
// ═══════════════════════════════════════════════════════════════════════════

export type Pilier = 'REGISTRE' | 'FINANCES' | 'TRANSPARENCE' | 'DIRIGEANTS' | 'PAIEMENTS';

export const PILIERS: readonly Pilier[] = [
	'REGISTRE',
	'FINANCES',
	'TRANSPARENCE',
	'DIRIGEANTS',
	'PAIEMENTS'
];

export const NOM_DU_PILIER: Readonly<Record<Pilier, string>> = {
	REGISTRE: 'Registre',
	FINANCES: 'Finances',
	TRANSPARENCE: 'Transparence',
	DIRIGEANTS: 'Dirigeants',
	PAIEMENTS: 'Vos paiements'
};

export type Poids = 'FORT' | 'MOYEN' | 'FAIBLE' | 'INFORMATIF';

export interface SourceDuFait {
	/** « Pappers · comptes 2024 », « Le journal officiel des entreprises », « Vos factures ». */
	readonly nom: string;
	readonly date?: string;
	readonly url?: string;
	/** L'article qui dit ce que la loi en fait, quand il y en a un. */
	readonly article?: string;
}

export interface Fait {
	readonly cle: string;
	readonly pilier: Pilier;
	/** La phrase qui se vérifie. */
	readonly titre: string;
	/** Quatre mots au plus : ce que le bulletin dit du pilier. */
	readonly court: string;
	readonly detail?: string;
	/** Ce qu'il ajoute à l'indice, ou lui retire. */
	readonly effet: number;
	readonly poids: Poids;
	readonly source: SourceDuFait;
}

export type Niveau =
	| 'RIEN_A_SIGNALER'
	| 'A_SURVEILLER'
	| 'PRUDENCE'
	| 'RISQUE_ELEVE'
	| 'PROCEDURE'
	| 'FERMEE';

export const MOT_DU_NIVEAU: Readonly<Record<Niveau, string>> = {
	RIEN_A_SIGNALER: 'Rien à signaler',
	A_SURVEILLER: 'À surveiller',
	PRUDENCE: 'Prudence',
	RISQUE_ELEVE: 'Risque élevé',
	PROCEDURE: 'Procédure en cours',
	FERMEE: 'Entreprise fermée'
};

/** Du plus serein au plus grave : l'ordre dans lequel on trie un portefeuille. */
export const ORDRE_DES_NIVEAUX: readonly Niveau[] = [
	'RIEN_A_SIGNALER',
	'A_SURVEILLER',
	'PRUDENCE',
	'RISQUE_ELEVE',
	'PROCEDURE',
	'FERMEE'
];

export interface EtatDuPilier {
	readonly pilier: Pilier;
	/** De 1 à 5 traits pleins ; 0 quand on n'en sait rien. */
	readonly traits: number;
	readonly resume: string;
	readonly connu: boolean;
}

export type Lisibilite = 'BONNE' | 'PARTIELLE' | 'FAIBLE';

export interface AnalyseDeRisque {
	readonly indice: number;
	readonly niveau: Niveau;
	/** Les faits, les plus lourds d'abord ; les faits informatifs à la fin. */
	readonly faits: readonly Fait[];
	readonly piliers: readonly EtatDuPilier[];
	readonly lisibilite: Lisibilite;
	/** Ce qu'on ne sait pas, en une phrase, ou `null` quand on sait tout. */
	readonly lisibiliteRaison: string | null;
	readonly versionDesRegles: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES AIDES
// ═══════════════════════════════════════════════════════════════════════════

function poidsDe(effet: number): Poids {
	const absolu = Math.abs(effet);
	if (absolu === 0) return 'INFORMATIF';
	if (absolu >= POIDS_FORT_DES) return 'FORT';
	if (absolu >= POIDS_MOYEN_DES) return 'MOYEN';
	return 'FAIBLE';
}

/** Les mois entiers entre deux dates `AAAA-MM-JJ` (négatif si `b` précède `a`). */
export function moisEntre(a: string, b: string): number {
	const [ya, ma, ja] = a.split('-').map(Number) as [number, number, number];
	const [yb, mb, jb] = b.split('-').map(Number) as [number, number, number];
	let mois = (yb - ya) * 12 + (mb - ma);
	if (jb < ja) mois -= 1;
	return mois;
}

/** Des euros ronds, lisibles : « 82 000 € », « -1 250 000 € ». */
export function eurosRonds(centimes: bigint): string {
	const negatif = centimes < 0n;
	const absolu = negatif ? -centimes : centimes;
	const euros = (absolu + 50n) / 100n;
	const groupes = euros.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
	return `${negatif ? '-' : ''}${groupes} €`;
}

function pourcent(valeur: number): string {
	return `${Math.round(Math.abs(valeur))} %`;
}

const MOIS = [
	'janvier',
	'février',
	'mars',
	'avril',
	'mai',
	'juin',
	'juillet',
	'août',
	'septembre',
	'octobre',
	'novembre',
	'décembre'
];

/** « mars 2026 ». */
export function moisLisible(date: string): string {
	const mois = Number(date.slice(5, 7));
	return `${MOIS[mois - 1] ?? ''} ${date.slice(0, 4)}`.trim();
}

function dureeLisible(mois: number): string {
	if (mois < 12) return `${mois} mois`;
	const ans = Math.floor(mois / 12);
	return `${ans} an${ans > 1 ? 's' : ''}`;
}

function fait(
	pilier: Pilier,
	cle: string,
	titre: string,
	court: string,
	effet: number,
	source: SourceDuFait,
	detail?: string
): Fait {
	return {
		cle,
		pilier,
		titre,
		court,
		effet,
		poids: poidsDe(effet),
		source,
		...(detail === undefined ? {} : { detail })
	};
}

/** Les sources, écrites une fois. */
function sourceRegistre(fiche: FicheEntreprise): SourceDuFait {
	return { nom: 'Pappers, d’après l’INSEE et le registre du commerce', date: fiche.releveLe };
}

function sourceComptes(fiche: FicheEntreprise, annee: number): SourceDuFait {
	return { nom: `Pappers, comptes ${annee}`, date: fiche.releveLe };
}

const SOURCE_PAIEMENTS: SourceDuFait = { nom: 'Vos factures et leurs règlements' };

// ═══════════════════════════════════════════════════════════════════════════
// LES RÈGLES, PILIER PAR PILIER
// ═══════════════════════════════════════════════════════════════════════════

function faitsDuRegistre(fiche: FicheEntreprise, aujourdHui: string): Fait[] {
	const faits: Fait[] = [];
	const source = sourceRegistre(fiche);

	if (fiche.procedureEnCours) {
		const enCours = fiche.procedures.find((p) => p.fin === undefined);
		faits.push(
			fait(
				'REGISTRE',
				'procedure-en-cours',
				enCours?.debut === undefined
					? `Une procédure collective est en cours : ${(enCours?.type ?? 'procédure collective').toLowerCase()}`
					: `Une procédure collective est en cours depuis ${moisLisible(enCours.debut)} : ${enCours.type.toLowerCase()}`,
				'Procédure en cours',
				PROCEDURE_EN_COURS,
				source
			)
		);
	}

	for (const procedure of fiche.procedures) {
		if (procedure.fin === undefined || !estDateReelle(procedure.fin)) continue;
		const ans = moisEntre(procedure.fin, aujourdHui) / 12;
		const recente = ans < PROCEDURE_TERMINEE.anneesRecente;
		faits.push(
			fait(
				'REGISTRE',
				`procedure-terminee-${procedure.fin}`,
				`${procedure.type} terminée en ${moisLisible(procedure.fin)}`,
				recente ? 'Procédure récente' : 'Procédure ancienne',
				recente ? PROCEDURE_TERMINEE.recente : PROCEDURE_TERMINEE.ancienne,
				source,
				procedure.debut === undefined
					? undefined
					: `Ouverte en ${moisLisible(procedure.debut)}, close en ${moisLisible(procedure.fin)}.`
			)
		);
	}

	if (fiche.dateCreation !== undefined && estDateReelle(fiche.dateCreation)) {
		const mois = moisEntre(fiche.dateCreation, aujourdHui);
		const effet =
			mois < 12
				? ANCIENNETE.moinsDUnAn
				: mois < 36
					? ANCIENNETE.unATroisAns
					: mois < 120
						? ANCIENNETE.troisADixAns
						: ANCIENNETE.plusDeDixAns;
		faits.push(
			fait(
				'REGISTRE',
				'anciennete',
				`Créée il y a ${dureeLisible(Math.max(0, mois))}, en ${moisLisible(fiche.dateCreation)}`,
				mois < 36
					? `Créée il y a ${dureeLisible(Math.max(0, mois))}`
					: `${Math.floor(mois / 12)} ans d’existence`,
				effet,
				source
			)
		);
	}
	return faits;
}

/** L'exercice qui dit encore quelque chose d'aujourd'hui, s'il y en a un. */
function exerciceRecent(fiche: FicheEntreprise, aujourdHui: string): ExerciceFinancier | null {
	const dernier = fiche.exercices[0];
	if (dernier === undefined) return null;
	const cloture = dernier.dateCloture ?? `${dernier.annee}-12-31`;
	if (!estDateReelle(cloture)) return null;
	return moisEntre(cloture, aujourdHui) <= AGE_MAXIMAL_DES_COMPTES_MOIS ? dernier : null;
}

function faitsDesFinances(fiche: FicheEntreprise, aujourdHui: string): Fait[] {
	const faits: Fait[] = [];

	if (fiche.actifNetSousMoitie?.enCours === true) {
		faits.push(
			fait(
				'FINANCES',
				'actif-net-sous-moitie',
				fiche.actifNetSousMoitie.depuis === undefined
					? 'Ses capitaux propres sont passés sous la moitié de son capital'
					: `Ses capitaux propres sont sous la moitié de son capital depuis ${moisLisible(fiche.actifNetSousMoitie.depuis)}`,
				'Capitaux propres entamés',
				ACTIF_NET_SOUS_MOITIE,
				{ ...sourceRegistre(fiche), article: PARAMETRES.capitauxPropresEntames.source },
				PARAMETRES.capitauxPropresEntames.valeur
			)
		);
	}

	const exercice = exerciceRecent(fiche, aujourdHui);
	if (exercice === null) return faits;
	const source = sourceComptes(fiche, exercice.annee);

	if (exercice.resultat !== undefined) {
		if (exercice.resultat < 0n) {
			faits.push(
				fait(
					'FINANCES',
					'resultat',
					`Perte de ${eurosRonds(-exercice.resultat)} en ${exercice.annee}`,
					`Perte en ${exercice.annee}`,
					RESULTAT.perte,
					source
				)
			);
			const precedent = fiche.exercices[1];
			if (precedent?.resultat !== undefined && precedent.resultat < 0n) {
				faits.push(
					fait(
						'FINANCES',
						'deuxieme-perte',
						`Deuxième année de perte d’affilée (${precedent.annee} et ${exercice.annee})`,
						'Pertes répétées',
						RESULTAT.deuxiemePerte,
						source
					)
				);
			}
		} else if (exercice.resultat > 0n) {
			faits.push(
				fait(
					'FINANCES',
					'resultat',
					`Bénéfice de ${eurosRonds(exercice.resultat)} en ${exercice.annee}`,
					`Bénéfice en ${exercice.annee}`,
					RESULTAT.benefice,
					source
				)
			);
		}
	}

	const autonomie = exercice.autonomieFinancierePct;
	if (autonomie !== undefined) {
		if (autonomie < 0) {
			faits.push(
				fait(
					'FINANCES',
					'autonomie',
					`Ses capitaux propres sont négatifs en ${exercice.annee}`,
					'Capitaux propres négatifs',
					AUTONOMIE.negative,
					source,
					'Ses dettes dépassent ce qu’il possède : ce qui est à lui ne couvre plus ce qu’il doit.'
				)
			);
		} else if (autonomie < AUTONOMIE.faibleSous) {
			faits.push(
				fait(
					'FINANCES',
					'autonomie',
					`Ses capitaux propres ne pèsent que ${pourcent(autonomie)} de son bilan`,
					'Peu de fonds propres',
					AUTONOMIE.faible,
					source
				)
			);
		} else if (autonomie >= AUTONOMIE.solideDes) {
			faits.push(
				fait(
					'FINANCES',
					'autonomie',
					`Ses capitaux propres pèsent ${pourcent(autonomie)} de son bilan`,
					'Fonds propres solides',
					AUTONOMIE.solide,
					source
				)
			);
		}
	}

	const liquidite = exercice.liquiditeGenerale;
	if (liquidite !== undefined) {
		if (liquidite < LIQUIDITE.sous) {
			faits.push(
				fait(
					'FINANCES',
					'liquidite',
					'Ses dettes à moins d’un an dépassent ce qu’il peut mobiliser dans l’année',
					'Liquidité courte',
					LIQUIDITE.faible,
					source,
					`Liquidité générale de ${liquidite.toFixed(2).replace('.', ',')} en ${exercice.annee} : en dessous de 1, l’actif à court terme ne couvre pas les dettes à court terme.`
				)
			);
		} else if (liquidite >= LIQUIDITE.confortableDes) {
			faits.push(
				fait(
					'FINANCES',
					'liquidite',
					'Ce qu’il peut mobiliser dans l’année couvre largement ses dettes à court terme',
					'Liquidité confortable',
					LIQUIDITE.confortable,
					source,
					`Liquidité générale de ${liquidite.toFixed(2).replace('.', ',')} en ${exercice.annee}.`
				)
			);
		}
	}

	if (exercice.tresorerie !== undefined && exercice.tresorerie < 0n) {
		faits.push(
			fait(
				'FINANCES',
				'tresorerie',
				`Trésorerie négative de ${eurosRonds(-exercice.tresorerie)} en ${exercice.annee}`,
				'Trésorerie négative',
				TRESORERIE_NEGATIVE,
				source
			)
		);
	}

	const delai = exercice.delaiFournisseursJours;
	if (delai !== undefined && delai >= 0) {
		const jours = Math.round(delai);
		const effet =
			jours > DELAI_FOURNISSEURS.longDes
				? DELAI_FOURNISSEURS.long
				: jours > DELAI_FOURNISSEURS.etireDes
					? DELAI_FOURNISSEURS.etire
					: jours <= DELAI_FOURNISSEURS.courtJusqua
						? DELAI_FOURNISSEURS.court
						: 0;
		if (effet !== 0) {
			faits.push(
				fait(
					'FINANCES',
					'delai-fournisseurs',
					`Il paie ses fournisseurs à ${jours} jours en moyenne`,
					`Paie ses fournisseurs à ${jours} j`,
					effet,
					source,
					`Calculé sur ses comptes ${exercice.annee}.`
				)
			);
		}
	}

	const croissance = exercice.croissancePct;
	if (croissance !== undefined) {
		if (croissance <= CROISSANCE.chuteJusqua) {
			faits.push(
				fait(
					'FINANCES',
					'croissance',
					`Son chiffre d’affaires a baissé de ${pourcent(croissance)} en ${exercice.annee}`,
					'Activité en baisse',
					CROISSANCE.chute,
					source
				)
			);
		} else if (croissance >= CROISSANCE.hausseDes) {
			faits.push(
				fait(
					'FINANCES',
					'croissance',
					`Son chiffre d’affaires a augmenté de ${pourcent(croissance)} en ${exercice.annee}`,
					'Activité en hausse',
					CROISSANCE.hausse,
					source
				)
			);
		}
	}
	return faits;
}

/**
 * LES SOCIÉTÉS TENUES DE DÉPOSER LEURS COMPTES : les sociétés commerciales à
 * responsabilité limitée et par actions. Une entreprise individuelle n'en dépose
 * pas, et le lui reprocher serait faux.
 */
function doitDeposerSesComptes(fiche: FicheEntreprise): boolean {
	if (!fiche.personneMorale) return false;
	const forme = (fiche.formeJuridique ?? '').toLowerCase();
	return /responsabilit[ée] limit[ée]e|par actions|soci[ée]t[ée] anonyme|\bsarl\b|\bsas\b|\bsasu\b|\beurl\b|\bsa\b/.test(
		forme
	);
}

function faitsDeTransparence(fiche: FicheEntreprise, aujourdHui: string): Fait[] {
	const faits: Fait[] = [];
	const dernier = [...fiche.comptes].sort((a, b) => b.anneeCloture - a.anneeCloture)[0];
	const ageMois =
		fiche.dateCreation !== undefined && estDateReelle(fiche.dateCreation)
			? moisEntre(fiche.dateCreation, aujourdHui)
			: null;

	if (dernier === undefined) {
		if (doitDeposerSesComptes(fiche) && ageMois !== null && ageMois >= COMPTES_EN_RETARD_MOIS) {
			faits.push(
				fait(
					'TRANSPARENCE',
					'comptes-jamais',
					'Aucun compte déposé au greffe',
					'Aucun compte déposé',
					COMPTES.jamais,
					sourceRegistre(fiche),
					'Une société commerciale dépose ses comptes chaque année au registre du commerce.'
				)
			);
		}
		return faits;
	}

	const cloture = dernier.dateCloture ?? `${dernier.anneeCloture}-12-31`;
	const age = estDateReelle(cloture) ? moisEntre(cloture, aujourdHui) : null;
	const source = sourceComptes(fiche, dernier.anneeCloture);

	if (age !== null && age > COMPTES_EN_RETARD_MOIS && doitDeposerSesComptes(fiche)) {
		faits.push(
			fait(
				'TRANSPARENCE',
				'comptes-en-retard',
				`Aucun compte déposé depuis l’exercice ${dernier.anneeCloture}`,
				`Derniers comptes : ${dernier.anneeCloture}`,
				COMPTES.enRetard,
				source
			)
		);
	} else if (age !== null && age <= COMPTES_A_JOUR_MOIS) {
		faits.push(
			fait(
				'TRANSPARENCE',
				'comptes-a-jour',
				`Comptes ${dernier.anneeCloture} déposés${dernier.dateDepot === undefined ? '' : ` en ${moisLisible(dernier.dateDepot)}`}`,
				`Comptes ${dernier.anneeCloture} déposés`,
				COMPTES.aJour,
				source
			)
		);
	}

	if (dernier.confidentiels || dernier.resultatConfidentiel) {
		faits.push(
			fait(
				'TRANSPARENCE',
				'confidentialite',
				dernier.confidentiels
					? `Ses comptes ${dernier.anneeCloture} sont confidentiels`
					: `Son compte de résultat ${dernier.anneeCloture} est confidentiel`,
				dernier.confidentiels ? 'Comptes confidentiels' : 'Résultat confidentiel',
				0,
				{ ...source, article: PARAMETRES.confidentialiteDesComptes.source },
				PARAMETRES.confidentialiteDesComptes.valeur
			)
		);
	}
	return faits;
}

function faitsDesDirigeants(
	fiche: FicheEntreprise,
	dirigeants: readonly ParcoursDirigeant[],
	aujourdHui: string
): Fait[] {
	const faits: Fait[] = [];
	const debutFenetre = `${Number(aujourdHui.slice(0, 4)) - FENETRE_DIRIGEANTS_ANNEES}${aujourdHui.slice(4)}`;
	let cumulProcedures = 0;

	for (const dirigeant of dirigeants) {
		if (
			dirigeant.depuis !== undefined &&
			estDateReelle(dirigeant.depuis) &&
			moisEntre(dirigeant.depuis, aujourdHui) < NOUVEAU_DIRIGEANT.mois
		) {
			faits.push(
				fait(
					'DIRIGEANTS',
					`nouveau-${dirigeant.nomComplet}`,
					`${dirigeant.nomComplet} dirige l’entreprise depuis ${moisLisible(dirigeant.depuis)}`,
					'Nouveau dirigeant',
					NOUVEAU_DIRIGEANT.effet,
					sourceRegistre(fiche)
				)
			);
		}

		// ⚠️ RIEN N'EST ATTRIBUÉ SANS RAPPROCHEMENT CERTAIN.
		if (dirigeant.rapprochement !== 'IDENTIFIE') continue;
		const source: SourceDuFait = {
			nom: 'Pappers et le journal officiel des entreprises',
			date: fiche.releveLe
		};

		const procedures = dirigeant.procedures.filter((p) => p.dateParution >= debutFenetre);
		const societesTouchees = new Set(procedures.map((p) => p.siren));
		if (societesTouchees.size > 0 && cumulProcedures > PROCEDURES_DES_DIRIGEANTS.plafond) {
			const n = societesTouchees.size;
			const brut =
				n === 1
					? PROCEDURES_DES_DIRIGEANTS.une
					: n === 2
						? PROCEDURES_DES_DIRIGEANTS.deux
						: PROCEDURES_DES_DIRIGEANTS.troisOuPlus;
			const effet = Math.max(brut, PROCEDURES_DES_DIRIGEANTS.plafond - cumulProcedures);
			cumulProcedures += effet;
			const annees = [...new Set(procedures.map((p) => p.dateParution.slice(0, 4)))].sort();
			faits.push(
				fait(
					'DIRIGEANTS',
					`procedures-${dirigeant.nomComplet}`,
					`${n} autre${n > 1 ? 's' : ''} société${n > 1 ? 's' : ''} dirigée${n > 1 ? 's' : ''} par ${dirigeant.nomComplet} ${n > 1 ? 'ont' : 'a'} connu une procédure collective`,
					`${n} procédure${n > 1 ? 's' : ''} passée${n > 1 ? 's' : ''}`,
					effet,
					source,
					`En ${annees.join(', ')}, sur les ${FENETRE_DIRIGEANTS_ANNEES} dernières années. Chaque annonce se relit à la source.`
				)
			);
		}

		const breves = dirigeant.societes.filter(
			(s) =>
				s.creeLe !== undefined &&
				s.fermeeLe !== undefined &&
				estDateReelle(s.creeLe) &&
				estDateReelle(s.fermeeLe) &&
				s.fermeeLe >= debutFenetre &&
				moisEntre(s.creeLe, s.fermeeLe) < SOCIETES_BREVES.dureeMois
		);
		if (breves.length >= SOCIETES_BREVES.aPartirDe) {
			faits.push(
				fait(
					'DIRIGEANTS',
					`breves-${dirigeant.nomComplet}`,
					`${breves.length} sociétés de ${dirigeant.nomComplet} ont fermé moins de deux ans après leur création`,
					'Sociétés brèves',
					SOCIETES_BREVES.effet,
					source
				)
			);
		}

		const actives = dirigeant.societes.filter((s) => s.enActivite).length;
		if (actives >= MANDATS.nombreuxDes) {
			faits.push(
				fait(
					'DIRIGEANTS',
					`mandats-${dirigeant.nomComplet}`,
					`${dirigeant.nomComplet} dirige ${actives} autres sociétés en activité`,
					`${actives} autres mandats`,
					actives >= MANDATS.tresNombreuxDes ? MANDATS.tresNombreux : MANDATS.nombreux,
					source,
					'Le temps et l’attention d’un dirigeant se partagent entre ses sociétés ; certaines sont souvent des structures de détention.'
				)
			);
		}
	}
	return faits;
}

function faitsDesPaiements(paiements: PaiementsChezVous | null): Fait[] {
	if (paiements === null) return [];
	const faits: Fait[] = [];
	if (paiements.habitudeJours !== null) {
		const jours = Math.round(paiements.habitudeJours);
		const palier = HABITUDE.find((p) => jours <= p.jusqua) ?? HABITUDE[HABITUDE.length - 1]!;
		faits.push(
			fait(
				'PAIEMENTS',
				'habitude',
				jours <= 0
					? `Il vous paie à l’échéance, ou avant (${paiements.echantillon} règlements)`
					: `Il vous paie en moyenne ${jours} jours après l’échéance (${paiements.echantillon} règlements)`,
				jours <= 0 ? 'Paie à l’échéance' : `Paie à ${jours} j de retard`,
				palier.effet,
				SOURCE_PAIEMENTS,
				'Le délai médian, compté de l’échéance au règlement : une facture réglée très en retard ne fait pas, à elle seule, l’habitude.'
			)
		);
	}
	const retard = paiements.plusVieuxRetardJours;
	if (retard !== null && retard > RETARD_EN_COURS.installeDes) {
		faits.push(
			fait(
				'PAIEMENTS',
				'retard-en-cours',
				`Une facture attend son paiement depuis ${retard} jours`,
				`Retard de ${retard} jours`,
				retard > RETARD_EN_COURS.longDes ? RETARD_EN_COURS.long : RETARD_EN_COURS.installe,
				SOURCE_PAIEMENTS
			)
		);
	}
	return faits;
}

// ═══════════════════════════════════════════════════════════════════════════
// L'ASSEMBLAGE
// ═══════════════════════════════════════════════════════════════════════════

const RESUME_PAR_DEFAUT: Readonly<Record<Pilier, string>> = {
	REGISTRE: 'Rien au registre',
	FINANCES: 'Rien de notable',
	TRANSPARENCE: 'Rien de notable',
	DIRIGEANTS: 'Rien de relevé',
	PAIEMENTS: 'Rien de notable'
};

/** Le niveau d’un indice : les bornes de `regles.ts`, écrites une fois. */
export function niveauDeLIndice(indice: number): Niveau {
	if (indice >= SEUIL_RIEN_A_SIGNALER) return 'RIEN_A_SIGNALER';
	if (indice >= SEUIL_A_SURVEILLER) return 'A_SURVEILLER';
	if (indice >= SEUIL_PRUDENCE) return 'PRUDENCE';
	return 'RISQUE_ELEVE';
}

/** Cinq traits : quatre quand rien ne pèse, un de plus pour un vrai plus, un de moins par six points perdus. */
function traitsDe(somme: number): number {
	if (somme >= POIDS_MOYEN_DES) return 5;
	return Math.min(4, Math.max(1, 4 + Math.round(somme / POIDS_MOYEN_DES)));
}

export function analyserLeRisque({
	fiche,
	dirigeants,
	paiements,
	aujourdHui
}: EntreesDeLAnalyse): AnalyseDeRisque {
	const faits = [
		...faitsDuRegistre(fiche, aujourdHui),
		...faitsDesFinances(fiche, aujourdHui),
		...faitsDeTransparence(fiche, aujourdHui),
		...faitsDesDirigeants(fiche, dirigeants, aujourdHui),
		...faitsDesPaiements(paiements)
	];

	const somme = faits.reduce((total, f) => total + f.effet, 0);
	let indice = Math.max(0, Math.min(100, INDICE_DE_DEPART + somme));
	let niveau = niveauDeLIndice(indice);
	if (fiche.procedureEnCours) {
		indice = Math.min(indice, PLAFOND_EN_PROCEDURE);
		niveau = 'PROCEDURE';
	}
	if (fiche.fermee) {
		indice = 0;
		niveau = 'FERMEE';
	}

	// ── CE QU'ON SAIT DE LUI, pilier par pilier ─────────────────────────────
	const finances = exerciceRecent(fiche, aujourdHui);
	const comptesConfidentiels = [...fiche.comptes].sort((a, b) => b.anneeCloture - a.anneeCloture)[0]
		?.confidentiels;
	const physiques = dirigeants.filter((d) => d.rapprochement !== 'PERSONNE_MORALE');
	const identifies = physiques.filter((d) => d.rapprochement === 'IDENTIFIE');
	const connu: Readonly<Record<Pilier, boolean>> = {
		REGISTRE: true,
		FINANCES: finances !== null || fiche.actifNetSousMoitie?.enCours === true,
		TRANSPARENCE: true,
		DIRIGEANTS: physiques.length === 0 ? dirigeants.length > 0 : identifies.length > 0,
		PAIEMENTS: paiements !== null && paiements.habitudeJours !== null
	};

	const piliers: EtatDuPilier[] = PILIERS.map((pilier) => {
		const siens = faits.filter((f) => f.pilier === pilier);
		if (!connu[pilier] && siens.length === 0) {
			return {
				pilier,
				traits: 0,
				connu: false,
				resume:
					pilier === 'FINANCES'
						? comptesConfidentiels === true
							? 'Comptes confidentiels'
							: 'Pas de comptes récents'
						: pilier === 'DIRIGEANTS'
							? 'Non rapprochés'
							: paiements === null
								? 'Pas encore client'
								: 'Trop peu de règlements'
			};
		}
		const total = siens.reduce((t, f) => t + f.effet, 0);
		const plusLourd = [...siens]
			.filter((f) => f.effet !== 0)
			.sort((a, b) => Math.abs(b.effet) - Math.abs(a.effet))[0];
		return {
			pilier,
			traits: pilier === 'REGISTRE' && fiche.procedureEnCours ? 1 : traitsDe(total),
			connu: true,
			resume: plusLourd?.court ?? siens[0]?.court ?? RESUME_PAR_DEFAUT[pilier]
		};
	});

	// ── LA LISIBILITÉ : ce qu'on ne sait pas, dit à part de l'indice ────────
	const manques: string[] = [];
	if (!connu.FINANCES) {
		manques.push(
			comptesConfidentiels === true
				? 'ses comptes sont confidentiels'
				: 'aucun compte récent n’est publié'
		);
	}
	if (!connu.DIRIGEANTS) manques.push('ses dirigeants n’ont pas pu être rapprochés avec certitude');
	// Une entreprise qui n'est pas encore cliente n'a pas d'historique à lire : ce n'est pas un manque.
	if (!connu.PAIEMENTS && paiements !== null) manques.push('trop peu de règlements chez vous');
	const lisibilite: Lisibilite =
		manques.length === 0 ? 'BONNE' : manques.length === 1 ? 'PARTIELLE' : 'FAIBLE';
	const lisibiliteRaison =
		manques.length === 0
			? null
			: `${manques[0]!.charAt(0).toUpperCase()}${manques[0]!.slice(1)}${manques.length > 1 ? `, ${manques.slice(1).join(', ')}` : ''}.`;

	const tries = [...faits].sort((a, b) => {
		if ((a.effet === 0) !== (b.effet === 0)) return a.effet === 0 ? 1 : -1;
		return Math.abs(b.effet) - Math.abs(a.effet);
	});

	return {
		indice,
		niveau,
		faits: tries,
		piliers,
		lisibilite,
		lisibiliteRaison,
		versionDesRegles: VERSION_DES_REGLES
	};
}
