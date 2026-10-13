import { depuisEuros } from '../../../../socle/montants';
import { estDateReelle } from '../../calendrier';
import type {
	ComptesDeposes,
	DirigeantPublie,
	ExerciceFinancier,
	FicheEntreprise,
	ProcedureDeLEntreprise,
	Rapprochement,
	SocieteDirigee
} from '../../risque/analyse';
import { estSirenValide } from './siren';

/**
 * LA LECTURE DE PAPPERS — l'API v2 (`https://api.pappers.fr/v2/`), relevée dans sa
 * spécification OpenAPI 2.20.0 le 13/10/2026.
 *
 * Pappers republie les données de l'INSEE, de l'INPI (registre du commerce,
 * comptes déposés) et du journal officiel des entreprises. Une fiche coûte un
 * crédit ; une recherche, un dixième de crédit par résultat.
 *
 * ⚠️ CE MODULE NE LÈVE JAMAIS. Un champ absent, mal typé ou d'un format inattendu
 * devient « inconnu », jamais une valeur inventée : un indice calculé sur un
 * chiffre deviné est pire qu'un indice qui dit ce qu'il ne sait pas.
 *
 * ⚠️ CE QU'ON NE DEMANDE PAS À PAPPERS : `sanctions`, `personne_politiquement_exposee`,
 * `decisions` (des décisions de justice), et le score financier. Les trois
 * premiers touchent à des données que l'article 46 de la loi n° 78-17 réserve à
 * d'autres ; le dernier est une note qu'on ne saurait pas expliquer.
 */

// ═══════════════════════════════════════════════════════════════════════════
// LES PETITES LECTURES
// ═══════════════════════════════════════════════════════════════════════════

function objet(valeur: unknown): Record<string, unknown> | null {
	return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
		? (valeur as Record<string, unknown>)
		: null;
}

function texte(valeur: unknown): string | undefined {
	return typeof valeur === 'string' && valeur.trim() !== '' ? valeur.trim() : undefined;
}

function nombre(valeur: unknown): number | undefined {
	return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : undefined;
}

function vrai(valeur: unknown): boolean {
	return valeur === true;
}

/** Une date `AAAA-MM-JJ` qui existe au calendrier, sinon rien. */
function date(valeur: unknown): string | undefined {
	const lue = texte(valeur);
	return lue !== undefined && estDateReelle(lue) ? lue : undefined;
}

/** Des euros (nombre JSON) en centimes ; un nombre illisible ne devient rien. */
function centimes(valeur: unknown): bigint | undefined {
	const euros = nombre(valeur);
	if (euros === undefined) return undefined;
	try {
		return depuisEuros(euros);
	} catch {
		return undefined;
	}
}

function liste(valeur: unknown): readonly unknown[] {
	return Array.isArray(valeur) ? valeur : [];
}

/**
 * LE MOIS DE NAISSANCE, depuis « 1970-01-06 », « 1970-01 » ou « 01/1970 ». Il ne
 * sert qu'à rapprocher un dirigeant de ses autres sociétés, jamais à l'afficher.
 */
export function moisDeNaissance(valeur: unknown): { annee: number; mois: number } | undefined {
	const lue = texte(valeur);
	if (lue === undefined) return undefined;
	const iso = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(lue);
	const fr = /^(?:\d{2}\/)?(\d{2})\/(\d{4})$/.exec(lue);
	const annee = Number(iso?.[1] ?? fr?.[2]);
	const mois = Number(iso?.[2] ?? fr?.[1]);
	if (!Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12)
		return undefined;
	if (annee < 1900 || annee > 2100) return undefined;
	return { annee, mois };
}

// ═══════════════════════════════════════════════════════════════════════════
// LA FICHE (`GET /v2/entreprise?siren=…`)
// ═══════════════════════════════════════════════════════════════════════════

/** Ce que la fiche demande en plus : la situation de l'actif net (1 crédit). */
export const CHAMPS_SUPPLEMENTAIRES = 'actif_net_inferieur_moitie_capital';

function lireComptes(brut: unknown): ComptesDeposes[] {
	return liste(brut).flatMap((element) => {
		const c = objet(element);
		const annee = nombre(c?.annee_cloture);
		if (c === null || annee === undefined) return [];
		const dateCloture = date(c.date_cloture);
		const dateDepot = date(c.date_depot);
		return [
			{
				anneeCloture: annee,
				...(dateCloture === undefined ? {} : { dateCloture }),
				...(dateDepot === undefined ? {} : { dateDepot }),
				confidentiels: vrai(c.confidentialite),
				resultatConfidentiel: vrai(c.confidentialite_compte_de_resultat)
			}
		];
	});
}

function lireExercices(brut: unknown): ExerciceFinancier[] {
	const exercices = liste(brut).flatMap((element): ExerciceFinancier[] => {
		const f = objet(element);
		const annee = nombre(f?.annee);
		if (f === null || annee === undefined) return [];
		const champs = {
			dateCloture: date(f.date_de_cloture_exercice),
			chiffreAffaires: centimes(f.chiffre_affaires),
			resultat: centimes(f.resultat),
			tresorerie: centimes(f.tresorerie),
			autonomieFinancierePct: nombre(f.autonomie_financiere),
			liquiditeGenerale: nombre(f.liquidite_generale),
			delaiFournisseursJours: nombre(f.delai_paiement_fournisseurs_jours),
			croissancePct: nombre(f.taux_croissance_chiffre_affaires)
		};
		return [
			{
				annee,
				...Object.fromEntries(Object.entries(champs).filter(([, v]) => v !== undefined))
			} as ExerciceFinancier
		];
	});
	// Du plus récent au plus ancien, quel que soit l'ordre de la réponse.
	return exercices.sort((a, b) => b.annee - a.annee);
}

function lireProcedures(brut: unknown): ProcedureDeLEntreprise[] {
	return liste(brut).flatMap((element) => {
		const p = objet(element);
		const type = texte(p?.type);
		if (p === null || type === undefined) return [];
		const debut = date(p.date_debut);
		const fin = date(p.date_fin);
		return [
			{
				type,
				...(debut === undefined ? {} : { debut }),
				...(fin === undefined ? {} : { fin })
			}
		];
	});
}

function lireDirigeants(brut: unknown): DirigeantPublie[] {
	return liste(brut).flatMap((element): DirigeantPublie[] => {
		const r = objet(element);
		if (r === null) return [];
		const personneMorale = vrai(r.personne_morale);
		const nomComplet =
			texte(r.nom_complet) ??
			(personneMorale
				? texte(r.denomination)
				: [texte(r.prenom_usuel) ?? texte(r.prenom), texte(r.nom)].filter(Boolean).join(' '));
		if (nomComplet === undefined || nomComplet === '') return [];
		const qualites = liste(r.qualites).filter((q): q is string => typeof q === 'string');
		const depuis = date(r.date_prise_de_poste);
		const naissance = personneMorale ? undefined : moisDeNaissance(r.date_de_naissance);
		const nom = texte(r.nom);
		const prenom = texte(r.prenom);
		const siren = texte(r.siren);
		return [
			{
				nomComplet,
				personneMorale,
				qualites,
				...(nom === undefined ? {} : { nom }),
				...(prenom === undefined ? {} : { prenom }),
				...(siren === undefined || !estSirenValide(siren) ? {} : { siren }),
				...(depuis === undefined ? {} : { depuis }),
				...(naissance === undefined ? {} : { naissance })
			}
		];
	});
}

/**
 * LA FICHE, traduite. `null` quand la réponse n'est pas une fiche d'entreprise
 * lisible (pas de SIREN valide) : rien ne s'analyse sur une identité incertaine.
 */
export function lireFichePappers(brut: unknown, releveLe: string): FicheEntreprise | null {
	const f = objet(brut);
	const siren = texte(f?.siren);
	if (f === null || siren === undefined || !estSirenValide(siren)) return null;

	const statutRcs = texte(f.statut_rcs);
	const statutConsolide = texte(f.statut_consolide);
	const fermee = vrai(f.entreprise_cessee) || statutRcs === 'Radié' || statutConsolide === 'cessé';
	const dateFermeture = date(f.date_cessation) ?? date(f.date_radiation_rcs);
	const actif = objet(f.actif_net_inferieur_moitie_capital);
	const depuis = date(actif?.date_debut);
	const dateCreation = date(f.date_creation);
	const formeJuridique = texte(f.forme_juridique);

	return {
		siren,
		denomination: texte(f.denomination) ?? texte(f.nom_entreprise) ?? `Entreprise ${siren}`,
		...(formeJuridique === undefined ? {} : { formeJuridique }),
		personneMorale: f.personne_morale !== false,
		...(dateCreation === undefined ? {} : { dateCreation }),
		fermee,
		...(dateFermeture === undefined ? {} : { dateFermeture }),
		procedureEnCours: vrai(f.procedure_collective_en_cours),
		procedures: lireProcedures(f.procedures_collectives),
		comptes: lireComptes(f.comptes),
		exercices: lireExercices(f.finances),
		actifNetSousMoitie:
			actif === null
				? null
				: { enCours: vrai(actif.en_cours), ...(depuis === undefined ? {} : { depuis }) },
		dirigeants: lireDirigeants(f.representants),
		releveLe
	};
}

// ═══════════════════════════════════════════════════════════════════════════
// LES AUTRES SOCIÉTÉS D'UN DIRIGEANT (`GET /v2/recherche-dirigeants`)
// ═══════════════════════════════════════════════════════════════════════════

/** Le jour au format que Pappers attend dans une recherche : `JJ-MM-AAAA`. */
function jourPappers(annee: number, mois: number, jour: number): string {
	return `${String(jour).padStart(2, '0')}-${String(mois).padStart(2, '0')}-${annee}`;
}

/**
 * LA RECHERCHE D'UN DIRIGEANT : son nom, son prénom, et son mois de naissance en
 * bornes. `null` quand on ne peut pas chercher sans risquer l'homonyme : une
 * personne morale, ou une personne dont la naissance n'est pas publiée.
 */
export function rechercheDuDirigeant(
	dirigeant: DirigeantPublie
): Readonly<Record<string, string>> | null {
	if (dirigeant.personneMorale || dirigeant.naissance === undefined) return null;
	if (dirigeant.nom === undefined || dirigeant.prenom === undefined) return null;
	const { annee, mois } = dirigeant.naissance;
	const dernier = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
	return {
		nom_dirigeant: dirigeant.nom,
		// Le premier prénom seul : le registre les écrit tous, la recherche n'en veut qu'un.
		prenom_dirigeant: dirigeant.prenom.split(/[\s,]+/)[0] ?? dirigeant.prenom,
		date_de_naissance_dirigeant_min: jourPappers(annee, mois, 1),
		date_de_naissance_dirigeant_max: jourPappers(annee, mois, dernier),
		type_dirigeant: 'physique',
		par_page: '5'
	};
}

export interface DirigeantRapproche {
	readonly rapprochement: Rapprochement;
	readonly societesTotal?: number;
	readonly societes: readonly SocieteDirigee[];
}

/**
 * LE RAPPROCHEMENT, sur la réponse d'une recherche.
 *
 * ⚠️ LA PREUVE, C'EST LA SOCIÉTÉ ANALYSÉE. Parmi les personnes rendues, on ne
 * retient que celle qui dirige l'entreprise qu'on analyse : nom, prénom et mois
 * de naissance ne suffisent pas à départager deux homonymes, sa présence à la
 * tête de CETTE société, oui. Plusieurs personnes qui la dirigent, ou aucune : on
 * n'attribue rien.
 */
export function rapprocherLeDirigeant(brut: unknown, sirenAnalyse: string): DirigeantRapproche {
	const resultats = liste(objet(brut)?.resultats);
	if (resultats.length === 0) return { rapprochement: 'NON_TROUVE', societes: [] };

	const candidats = resultats.flatMap((element) => {
		const r = objet(element);
		if (r === null) return [];
		const entreprises = liste(r.entreprises).flatMap((e): SocieteDirigee[] => {
			const s = objet(e);
			const siren = texte(s?.siren);
			if (s === null || siren === undefined || !estSirenValide(siren)) return [];
			const creeLe = date(s.date_creation);
			const fermeeLe = date(s.date_cessation);
			const statut = texte(s.statut_consolide);
			return [
				{
					siren,
					denomination: texte(s.denomination) ?? texte(s.nom_entreprise) ?? siren,
					enActivite: !vrai(s.entreprise_cessee) && statut !== 'cessé',
					...(creeLe === undefined ? {} : { creeLe }),
					...(fermeeLe === undefined ? {} : { fermeeLe })
				}
			];
		});
		const total = nombre(r.nb_entreprises_total);
		return [{ entreprises, total }];
	});

	const siens = candidats.filter((c) => c.entreprises.some((e) => e.siren === sirenAnalyse));
	if (siens.length !== 1) {
		return { rapprochement: siens.length === 0 ? 'NON_TROUVE' : 'HOMONYMES', societes: [] };
	}
	const lui = siens[0]!;
	return {
		rapprochement: 'IDENTIFIE',
		...(lui.total === undefined ? {} : { societesTotal: lui.total }),
		societes: lui.entreprises.filter((e) => e.siren !== sirenAnalyse)
	};
}
