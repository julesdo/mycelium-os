import { depuisEuros, enCentimes } from '../../montants';
import type { FactureDepuisConnecteur } from '../facture-connecteur';

/**
 * CE QUI EST COMMUN AUX LOGICIELS QUE NANGO RELIE (13/10/2026).
 *
 * Nango tient l'accès aux logiciels du gérant (OAuth, jetons, rafraîchissement)
 * et relaie nos requêtes par son proxy : nous ne voyons jamais un identifiant.
 * Ce qui reste à écrire, logiciel par logiciel, c'est la LECTURE (quelle
 * adresse, quelle pagination, `lecteurs.ts`) et la TRADUCTION d'une facture
 * dans la forme que l'import connaît déjà (`FactureDepuisConnecteur`).
 *
 * Pur, sans réseau ni base, comme le traducteur de Qonto : c'est la seule
 * partie qui porte des montants, des dates et des SIREN, donc la seule qu'il
 * faut tester au centime.
 */

/**
 * CE QU'EST DEVENUE UNE FACTURE LUE.
 *
 * ⚠️ QUATRE ISSUES, ET AUCUNE N'EST UN REPLI SILENCIEUX :
 *   · FACTURE : une créance, prête pour l'import ;
 *   · HORS_CHAMP : un brouillon, un devis, un avoir, une facture fournisseur, ou
 *     une facture soldée trop ancienne pour compter ; on la laisse sans rien dire ;
 *   · ANNULEE : la source dit la facture annulée. Si elle est déjà chez nous,
 *     l'écran le signale, parce qu'une facture annulée ne se relance pas ;
 *   · ILLISIBLE : une créance qu'on n'a pas su lire (devise, numéro, client,
 *     montant). On la compte, et l'écran le dit : le gérant ne doit pas croire
 *     que tout est entré.
 */
export type TraductionConnecteur =
	| { readonly genre: 'FACTURE'; readonly facture: FactureDepuisConnecteur }
	| { readonly genre: 'HORS_CHAMP' }
	| { readonly genre: 'ANNULEE'; readonly reference: string }
	| { readonly genre: 'ILLISIBLE'; readonly raison: string };

/**
 * UN MONTANT DÉCIMAL EN CENTIMES, SANS CALCUL EN FLOTTANT.
 *
 * Les API rendent « 230.32 » (Pennylane, Sellsy) ou 230.32 (QuickBooks, Xero,
 * Zoho). L'écriture la plus courte d'un nombre qui a au plus deux décimales EST
 * sa forme décimale exacte, et `depuisEuros` la lit sans arithmétique flottante.
 * Trois décimales, une notation scientifique ou un infini sont refusés plutôt
 * qu'arrondis : un centime inventé se retrouverait dans un décompte.
 */
export function centimesDecimaux(valeur: string | number | null | undefined): bigint | null {
	if (valeur === null || valeur === undefined) return null;
	if (typeof valeur === 'number' && !Number.isFinite(valeur)) return null;
	if (typeof valeur === 'string' && valeur.trim() === '') return null;
	try {
		return enCentimes(depuisEuros(valeur));
	} catch {
		return null;
	}
}

/**
 * UN MONTANT DÉJÀ EN CENTIMES (Stripe rend des entiers dans la plus petite unité
 * de la devise). Un nombre qui n'est pas un entier sûr est refusé.
 */
export function centimesEntiers(valeur: number | null | undefined): bigint | null {
	if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur)) return null;
	return BigInt(valeur);
}

/**
 * LE SIREN, SEULEMENT QUAND IL SE LIT.
 *
 * Un SIRET en donne les neuf premiers chiffres ; un numéro de TVA français
 * s'écrit « FR », deux caractères de clé, puis le SIREN. Rien d'autre ne se
 * devine : un SIREN faux rattacherait des factures au mauvais client. La clé de
 * contrôle se vérifie à l'écriture (`estSirenValide`, côté Convex).
 */
export function sirenLu(numero?: string | null, tva?: string | null): string | undefined {
	const identifiant = (numero ?? '').replace(/[\s.]/g, '');
	if (/^\d{9}$/.test(identifiant) || /^\d{14}$/.test(identifiant)) return identifiant.slice(0, 9);
	const intracom = (tva ?? '').replace(/\s/g, '').toUpperCase();
	return /^FR[0-9A-Z]{2}(\d{9})$/.exec(intracom)?.[1];
}

/** La raison sociale, sinon « prénom nom » pour un client particulier. */
export function nomDuClient(
	societe: string | null | undefined,
	prenom?: string | null,
	nom?: string | null
): string | undefined {
	const raison = societe?.trim();
	if (raison) return raison;
	const personne = [prenom, nom]
		.map((part) => part?.trim() ?? '')
		.filter((part) => part !== '')
		.join(' ');
	return personne === '' ? undefined : personne;
}

/** La première adresse qui en a la forme : le socle ne juge pas au-delà. */
export function courrielLu(
	...candidats: readonly (string | null | undefined)[]
): string | undefined {
	for (const candidat of candidats) {
		const propre = candidat?.trim();
		if (propre && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propre)) return propre;
	}
	return undefined;
}

/**
 * UN JOUR « AAAA-MM-JJ », À PARTIR D'UNE DATE OU D'UN HORODATAGE.
 *
 * ⚠️ LE JOUR DOIT EXISTER AU CALENDRIER. `Date.parse` fait rouler le 30 février
 * au 2 mars sans lever (relevé sur bun) : on vérifie soi-même, et un jour qui
 * n'existe pas rend `undefined` plutôt qu'une date voisine.
 */
export function jourLu(valeur: string | null | undefined): string | undefined {
	const trouve = /^(\d{4})-(\d{2})-(\d{2})/.exec(valeur?.trim() ?? '');
	if (trouve === null) return undefined;
	const [, a, m, j] = trouve;
	const annee = Number(a);
	const mois = Number(m);
	const jour = Number(j);
	if (mois < 1 || mois > 12 || jour < 1) return undefined;
	const joursDuMois = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
	if (jour > joursDuMois) return undefined;
	return `${a}-${m}-${j}`;
}

/** Un instant Unix en secondes (Stripe), en jour UTC. */
export function jourDepuisUnix(secondes: number | null | undefined): string | undefined {
	if (typeof secondes !== 'number' || !Number.isFinite(secondes) || secondes <= 0) return undefined;
	return new Date(secondes * 1000).toISOString().slice(0, 10);
}

/**
 * CE QUI A ÉTÉ RÉGLÉ, DÉDUIT DU RESTE À PAYER : montant moins reste, borné entre
 * zéro et le montant. `null` quand rien n'est réglé : l'import n'écrit alors
 * aucun cumul.
 *
 * ⚠️ UN CUMUL, JAMAIS UN RÈGLEMENT. L'import n'en retient que le complément de
 * ce qui est déjà enregistré : relire n'éteint jamais deux fois la même dette.
 */
export function regleDepuisLeReste(
	montantTTC: bigint,
	reste: bigint,
	date: string,
	dateSure: boolean
): { readonly montant: bigint; readonly date: string; readonly dateSure: boolean } | null {
	const paye = montantTTC - reste;
	const borne = paye < 0n ? 0n : paye > montantTTC ? montantTTC : paye;
	return borne > 0n ? { montant: borne, date, dateSure } : null;
}

/**
 * UNE FACTURE SOLDÉE ET PLUS ANCIENNE QUE L'HORIZON NE COMPTE PLUS : elle n'est
 * plus réclamable et n'apprend rien au produit. Une facture IMPAYÉE, elle,
 * entre quel que soit son âge : c'est précisément celle dont la date limite pour
 * agir approche, ou est passée, et l'écran doit le dire.
 */
export function horsDeLHorizon(
	dateEmission: string,
	horizon: string,
	montantTTC: bigint,
	regle: { readonly montant: bigint } | null
): boolean {
	return dateEmission < horizon && regle !== null && regle.montant >= montantTTC;
}

export function siPresent<K extends string, V>(cle: K, valeur: V | undefined): { [P in K]?: V } {
	return (valeur === undefined ? {} : { [cle]: valeur }) as { [P in K]?: V };
}

/**
 * LE GABARIT COMMUN D'UNE FACTURE TRADUITE, une fois ce qui varie d'un logiciel
 * à l'autre lu : référence, client, devise, montant, dates, reste.
 *
 * Toutes les traductions passent par ici, ce qui garantit les mêmes refus
 * partout : une facture en devise n'entre pas plutôt que d'entrer fausse, une
 * facture sans numéro ni client ne s'invente pas.
 */
export function factureLue(lu: {
	readonly reference: string | null | undefined;
	readonly devise: string | null | undefined;
	readonly debiteur: string | undefined;
	readonly debiteurSiren?: string | undefined;
	readonly debiteurEmail?: string | undefined;
	readonly montantTTC: bigint | null;
	readonly dateEmission: string | undefined;
	readonly dateEcheance?: string | undefined;
	/** Le reste à payer, quand la source le dit. `undefined` : inconnu. */
	readonly reste?: bigint | null | undefined;
	/** La source dit la facture soldée, sans reste chiffré. */
	readonly soldee?: boolean;
	readonly datePaiement?: string | undefined;
	readonly aujourdHui: string;
	readonly horizon: string;
}): TraductionConnecteur {
	const devise = (lu.devise ?? '').trim().toUpperCase();
	if (devise !== 'EUR') {
		return { genre: 'ILLISIBLE', raison: `facture en devise (${devise || 'inconnue'})` };
	}
	const reference = lu.reference?.trim();
	if (!reference) return { genre: 'ILLISIBLE', raison: 'facture sans numéro' };
	if (lu.debiteur === undefined) return { genre: 'ILLISIBLE', raison: 'facture sans client' };
	if (lu.montantTTC === null) return { genre: 'ILLISIBLE', raison: 'montant illisible' };
	if (lu.montantTTC <= 0n) return { genre: 'HORS_CHAMP' };
	if (lu.dateEmission === undefined) return { genre: 'ILLISIBLE', raison: 'facture sans date' };
	if (lu.reste === null) return { genre: 'ILLISIBLE', raison: 'reste à payer illisible' };

	// Sans date de paiement transmise (Pennylane, QuickBooks, Sellsy), le jour de la
	// lecture date l'écriture, et le dit : il ne sert jamais à calculer des pénalités.
	const dateSure = lu.datePaiement !== undefined;
	const datePaiement = lu.datePaiement ?? lu.aujourdHui;
	const regleCumule =
		lu.reste !== undefined
			? regleDepuisLeReste(lu.montantTTC, lu.reste, datePaiement, dateSure)
			: lu.soldee === true
				? { montant: lu.montantTTC, date: datePaiement, dateSure }
				: null;

	if (horsDeLHorizon(lu.dateEmission, lu.horizon, lu.montantTTC, regleCumule)) {
		return { genre: 'HORS_CHAMP' };
	}

	return {
		genre: 'FACTURE',
		facture: {
			reference,
			debiteur: lu.debiteur,
			...siPresent('debiteurSiren', lu.debiteurSiren),
			...siPresent('debiteurEmail', lu.debiteurEmail),
			montantTTC: lu.montantTTC,
			dateEmission: lu.dateEmission,
			...siPresent('dateEcheance', lu.dateEcheance),
			regleCumule
		}
	};
}
