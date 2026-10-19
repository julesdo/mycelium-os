import { LIBELLES_DES_ETAPES } from '../croissance/semaine';
import type { Etape } from '../croissance/etapes';
import type { StatutProspect } from '../crm/statuts';

/**
 * LES ENTONNOIRS DE L'ADMIN (16/10/2026, sur Pipedrive, Squarespace et Zoho) : la
 * prospection (ajoutés → contactés → ont répondu → intéressés → inscrits) et le
 * parcours des comptes (inscrits → … → abonnés).
 *
 * ⚠️ « A ATTEINT AU MOINS CETTE ÉTAPE ». Un compte abonné sans avoir activé ses
 * relances a quand même passé l'étape des relances dans l'entonnoir : compté au
 * seul « a franchi », le passage dépasserait 100 % et ne voudrait plus rien dire.
 * Un prospect perdu ou en « Stop » a répondu : il compte jusqu'à « Ont répondu ».
 *
 * Les parts sont des pourcentages entiers, arrondis : ils se lisent, ils ne se
 * facturent pas.
 */

export interface EtapeDEntonnoir {
	readonly cle: string;
	readonly libelle: string;
	readonly nombre: number;
	/** La part du départ, en pour cent. */
	readonly partDuDepart: number;
	/** Le passage depuis l'étape d'avant, en pour cent ; `null` pour la première. */
	readonly passage: number | null;
	/** Ce qui s'est arrêté à l'étape d'avant. */
	readonly perdus: number;
}

function pourCent(part: number, total: number): number {
	return total === 0 ? 0 : Math.round((part * 100) / total);
}

/** Des comptes par étape (déjà cumulés), mis en entonnoir. */
export function enEntonnoir(
	etapes: readonly { readonly cle: string; readonly libelle: string; readonly nombre: number }[]
): EtapeDEntonnoir[] {
	const depart = etapes[0]?.nombre ?? 0;
	return etapes.map((etape, i) => {
		const avant = i === 0 ? null : (etapes[i - 1]?.nombre ?? 0);
		return {
			...etape,
			partDuDepart: pourCent(etape.nombre, depart),
			passage: avant === null ? null : pourCent(etape.nombre, avant),
			perdus: avant === null ? 0 : Math.max(0, avant - etape.nombre)
		};
	});
}

/** Le rang qu'un statut a atteint dans la prospection. */
const RANG: Record<StatutProspect, number> = {
	A_CONTACTER: 0,
	CONTACTE: 1,
	RELANCE: 1,
	A_REPONDU: 2,
	PERDU: 2,
	STOP: 2,
	INTERESSE: 3,
	INSCRIT: 4,
	// Une réclamation payée, un pilote signé : gagné sans inscription.
	GAGNE: 4
};

export const ETAPES_DE_PROSPECTION = [
	{ cle: 'AJOUTES', libelle: 'Ajoutés', rang: 0 },
	{ cle: 'CONTACTES', libelle: 'Contactés', rang: 1 },
	{ cle: 'REPONDU', libelle: 'Ont répondu', rang: 2 },
	{ cle: 'INTERESSES', libelle: 'Intéressés', rang: 3 },
	{ cle: 'INSCRITS', libelle: 'Inscrits', rang: 4 }
] as const;

/** Le prospect a-t-il atteint cette étape de l'entonnoir ? */
export function atteintEtapeDeProspection(statut: StatutProspect, cle: string): boolean {
	const etape = ETAPES_DE_PROSPECTION.find((e) => e.cle === cle);
	return etape !== undefined && RANG[statut] >= etape.rang;
}

export function entonnoirDeProspection(statuts: readonly StatutProspect[]): EtapeDEntonnoir[] {
	return enEntonnoir(
		ETAPES_DE_PROSPECTION.map((e) => ({
			cle: e.cle,
			libelle: e.libelle,
			nombre: statuts.filter((s) => RANG[s] >= e.rang).length
		}))
	);
}

/** Les étapes du parcours d'un compte qui font l'entonnoir, dans l'ordre. */
export const ETAPES_DES_COMPTES: readonly Etape[] = [
	'INSCRIT',
	'ENTREPRISE',
	'DIAGNOSTIC_LANCE',
	'FACTURES_DEPOSEES',
	'DIAGNOSTIC_RENDU',
	'MONTANT_REVELE',
	'RELANCES_ACTIVEES',
	'ESSAI',
	'ABONNE'
];

/** Le rang le plus avancé qu'un compte a atteint ; -1 s'il n'en a atteint aucune. */
export function rangDuCompte(etapes: readonly string[]): number {
	return ETAPES_DES_COMPTES.reduce((rang, e, i) => (etapes.includes(e) ? i : rang), -1);
}

export function entonnoirDesComptes(
	comptes: readonly { readonly etapes: readonly string[] }[]
): EtapeDEntonnoir[] {
	const rangs = comptes.map((c) => rangDuCompte(c.etapes));
	return enEntonnoir(
		ETAPES_DES_COMPTES.map((e, i) => ({
			cle: e,
			libelle: LIBELLES_DES_ETAPES[e],
			nombre: rangs.filter((r) => r >= i).length
		}))
	);
}
