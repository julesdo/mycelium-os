import { depuisCentimes, versEuros } from '../../../socle/montants';
import { dateLisible } from '../calendrier';

/**
 * LES GABARITS DE COURRIER — ce qui leur est commun.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TEXTE EST FIXE, SEULES LES VARIABLES SONT REMPLIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque gabarit recopie le modèle rédigé et contre-vérifié le 25/09/2026
 * (`docs/superpowers/specs/2026-09-25-modeles/`). Aucune phrase n'est rédigée
 * par l'agent : il ne remplit que des variables, et un gabarit qui manque d'une
 * donnée REFUSE en la nommant plutôt que d'improviser.
 *
 * ⚠️ AU SEUL NOM DU CRÉANCIER. Ni le nom, ni l'adresse, ni l'e-mail de ce
 * logiciel n'y figurent ; les réponses et les paiements arrivent chez le gérant.
 *
 * ⚠️ CE DOSSIER EST LE SEUL EXCLU DU LEXIQUE. Le corps d'un document envoyé garde
 * le vocabulaire juridique exact ; son résumé, lu par le gérant, suit le lexique.
 */

export interface CreancierCourrier {
	readonly denomination: string;
	readonly formeJuridique?: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly email?: string;
	readonly telephone?: string;
	readonly signataireNom?: string;
	readonly signataireQualite?: string;
	/** En centimes. */
	readonly capitalSocial?: bigint;
	readonly immatriculeRcs?: boolean;
	readonly villeGreffeRcs?: string;
	readonly iban?: string;
}

export interface DebiteurCourrier {
	readonly denomination: string;
	readonly formeJuridique?: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly sante: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
}

export interface FactureCourrier {
	readonly reference: string;
	readonly dateEmission?: string;
	readonly dateExigibilite?: string;
	/** En centimes. */
	readonly montantTTC: bigint;
	readonly reglementsRecus: bigint;
	readonly resteDu: bigint;
}

export interface LigneDecompteCourrier {
	readonly reference: string;
	readonly principal: bigint;
	readonly interets: bigint;
	readonly indemnite: bigint;
	readonly total: bigint;
	/** Vrai quand un taux convenu a servi au calcul (et non le taux applicable à défaut). */
	readonly tauxConvenu: boolean;
}

/** Le décompte FIGÉ que le courrier chiffre. Le courrier ne le recalcule jamais. */
export interface DecompteCourrier {
	readonly arreteAu: string;
	readonly convention: 'ACT_365' | 'ACT_ACT';
	readonly principal: bigint;
	readonly interets: bigint;
	readonly indemnites: bigint;
	readonly total: bigint;
	readonly lignes: readonly LigneDecompteCourrier[];
}

export type Canal = 'IMPRIMER_RECOMMANDE' | 'IMPRIMER_SIMPLE' | 'MESSAGERIE';

export interface Courrier {
	readonly ok: true;
	readonly titre: string;
	readonly destinataire: string;
	readonly canal: Canal;
	readonly objet: string;
	/** Le document, tel qu'il partira. */
	readonly corps: string;
	/** Ce que lit le gérant avant de valider, en mots de tous les jours. */
	readonly resume: readonly string[];
}

export interface Refus {
	readonly ok: false;
	/** Ce qui empêche de composer le courrier, nommé. */
	readonly manques: readonly string[];
}

export type Composition = Courrier | Refus;

export function euros(centimes: bigint): string {
	return versEuros(depuisCentimes(centimes));
}

export function date(iso: string): string {
	return dateLisible(iso);
}

/** La commune du siège, lue en fin d'adresse (après le code postal). */
export function commune(adresse: string | undefined): string | undefined {
	if (adresse === undefined) return undefined;
	const m = /\b\d{5}\s+([^,\n]+?)\s*$/.exec(adresse.trim());
	return m?.[1];
}

/**
 * La mention de forme qui suit la dénomination (R123-238 ; R123-237 9° pour
 * l'EI), et si le capital est exigé. `null` : forme non relue, le gabarit refuse.
 */
export function mentionForme(
	formeJuridique: string | undefined
): { readonly mention: string; readonly capitalExige: boolean } | null {
	if (formeJuridique === undefined) return null;
	const f = formeJuridique.toUpperCase();
	if (/\bEIRL\b/.test(f)) return null;
	if (/\bEI\b|ENTREPRENEUR INDIVIDUEL|ENTREPRISE INDIVIDUELLE/.test(f)) {
		return { mention: 'EI', capitalExige: false };
	}
	if (/\bSASU?\b|PAR ACTIONS SIMPLIFI/.test(f)) return { mention: 'SAS', capitalExige: true };
	if (/\bSCA\b|COMMANDITE PAR ACTIONS/.test(f)) return { mention: 'SCA', capitalExige: true };
	if (/\bSCS\b|COMMANDITE SIMPLE/.test(f)) return { mention: 'SCS', capitalExige: false };
	if (/\bSNC\b|NOM COLLECTIF/.test(f)) return { mention: 'SNC', capitalExige: false };
	if (/\bSE\b|SOCIÉTÉ EUROPÉENNE|SOCIETE EUROPEENNE/.test(f))
		return { mention: 'SE', capitalExige: true };
	if (/\bE?SARL\b|\bEURL\b|RESPONSABILIT[ÉE] LIMIT/.test(f))
		return { mention: 'SARL', capitalExige: true };
	if (/\bSA\b|SOCIÉTÉ ANONYME|SOCIETE ANONYME/.test(f))
		return { mention: 'SA', capitalExige: true };
	return null;
}

/** Ce qui manque au créancier pour signer un courrier, nommé. */
export function manquesCreancier(
	c: CreancierCourrier,
	exiger: { readonly entete?: boolean; readonly siren?: boolean } = {}
): string[] {
	const manques: string[] = [];
	if (c.adresse === undefined)
		manques.push('l’adresse de votre siège (Mon compte, votre entreprise)');
	if (c.email === undefined)
		manques.push('votre adresse e-mail pour les réponses (Mon compte, vos courriers)');
	if (c.signataireNom === undefined || c.signataireQualite === undefined) {
		manques.push('le nom et la fonction de la personne qui signe (Mon compte, vos courriers)');
	}
	if (exiger.siren === true && c.siren === undefined)
		manques.push('votre numéro SIREN (Mon compte)');
	if (exiger.entete === true) {
		const forme = mentionForme(c.formeJuridique);
		if (forme === null) {
			manques.push(
				'une forme juridique relue pour l’en-tête (SARL, SAS, SA, SNC, SCS, SCA, SE ou EI). Les autres formes ne sont pas encore relues'
			);
		} else if (forme.capitalExige && c.capitalSocial === undefined) {
			manques.push('votre capital social, exigé en tête des courriers de votre forme de société');
		}
		if (c.immatriculeRcs === undefined) {
			manques.push('si vous êtes inscrit au registre du commerce (Mon compte, vos courriers)');
		} else if (c.immatriculeRcs === true && c.villeGreffeRcs === undefined) {
			manques.push('la ville du greffe où vous êtes inscrit');
		} else if (c.immatriculeRcs === false) {
			manques.push(
				'la mention qui remplace « RCS » pour une entreprise qui n’y est pas inscrite n’est pas encore relue'
			);
		}
	}
	return manques;
}

/** Ce qui manque au débiteur pour lui adresser un courrier, nommé. */
export function manquesDebiteur(d: DebiteurCourrier): string[] {
	const manques: string[] = [];
	if (d.adresse === undefined) manques.push('l’adresse du siège de votre client (sa fiche)');
	if (d.siren === undefined) manques.push('le numéro SIREN de votre client (sa fiche)');
	if (d.formeJuridique === undefined) manques.push('la forme juridique de votre client (sa fiche)');
	return manques;
}

/** Le bas de lettre : les coordonnées de réponse, au seul nom du créancier. */
export function coordonnees(c: CreancierCourrier): string {
	return `${c.email ?? ''}${c.telephone === undefined ? '' : `, ${c.telephone}`}`;
}
