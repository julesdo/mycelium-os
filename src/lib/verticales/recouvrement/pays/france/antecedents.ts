import type { ProcedureDUneSociete, SocieteDirigee } from '../../risque/analyse';
import { lireAnnonce } from './bodacc';
import { estSirenValide } from './siren';

/**
 * LES JUGEMENTS D'OUVERTURE DES AUTRES SOCIÉTÉS D'UN DIRIGEANT, au BODACC.
 *
 * Gratuit, sans clé, et déjà lu chaque nuit par le radar : une requête par
 * dirigeant, tous les SIREN de ses autres sociétés en un seul filtre. On ne garde
 * que ce que le BODACC classe LUI-MÊME en « Jugement d'ouverture »
 * (`lireAnnonce`, effet `PROCEDURE_COLLECTIVE`), avec la nature recopiée mot pour
 * mot : le produit ne lit pas le droit, il cite le registre.
 *
 * ⚠️ AUCUN JUGEMENT VISANT UNE PERSONNE. Une faillite personnelle ou une
 * interdiction de gérer est une sanction de la personne : `lireAnnonce` ne les
 * classe pas en ouverture, et ce module ne les garde donc jamais.
 */

/** Au plus tant de sociétés par requête : le filtre reste court, la réponse aussi. */
export const SOCIETES_PAR_REQUETE = 30;

/** Le filtre ODSQL : ces SIREN, la famille des procédures collectives. `null` s'il n'y a rien à chercher. */
export function filtreDesProcedures(societes: readonly SocieteDirigee[]): string | null {
	const sirens = [...new Set(societes.map((s) => s.siren).filter(estSirenValide))].slice(
		0,
		SOCIETES_PAR_REQUETE
	);
	if (sirens.length === 0) return null;
	// Les SIREN ont passé leur clé : neuf chiffres, rien qui puisse fermer le littéral.
	const parSiren = sirens.map((siren) => `registre="${siren}"`).join(' OR ');
	return `(${parSiren}) AND familleavis="collective"`;
}

/** Les annonces lues, réduites aux jugements d'ouverture, une par annonce, les plus récentes d'abord. */
export function proceduresOuvertes(
	annonces: readonly unknown[],
	societes: readonly SocieteDirigee[]
): ProcedureDUneSociete[] {
	const nomParSiren = new Map(societes.map((s) => [s.siren, s.denomination]));
	const vues = new Set<string>();
	const procedures: ProcedureDUneSociete[] = [];
	for (const brut of annonces) {
		const constat = lireAnnonce(brut);
		if (constat === null || constat.effetSurLaSante !== 'PROCEDURE_COLLECTIVE') continue;
		const denomination = nomParSiren.get(constat.siren);
		if (denomination === undefined || vues.has(constat.identifiantAnnonce)) continue;
		vues.add(constat.identifiantAnnonce);
		procedures.push({
			siren: constat.siren,
			denomination,
			dateParution: constat.dateParution,
			nature: constat.nature,
			url: constat.url
		});
	}
	return procedures.sort((a, b) => b.dateParution.localeCompare(a.dateParution));
}
