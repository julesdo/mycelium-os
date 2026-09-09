/**
 * LE SIREN — l'identifiant sans lequel aucun registre public n'est interrogeable.
 *
 * Neuf chiffres attribués par l'INSEE, dont le dernier est une clé de contrôle
 * de Luhn. C'est la charnière du produit vers l'extérieur : le radar BODACC et
 * la normalisation Sirene s'interrogent par SIREN, et la colonne existait en
 * base depuis le premier jour sans que rien ne l'écrive jamais.
 *
 * ⚠️ POURQUOI UN RAPPROCHEMENT PAR NOM EST HORS DE QUESTION. Sur un flux
 * national de plusieurs millions d'annonces, une correspondance de raison
 * sociale finit par annoncer à un gérant que son client solvable est en
 * liquidation. C'est la faute symétrique de la relance d'un client qui a déjà
 * payé, et elle coûte plus cher : elle fait cesser des livraisons. La clé de
 * contrôle est ce qui rend le rapprochement par identifiant fiable, et elle
 * attrape TOUTE faute de frappe d'un chiffre — c'est exactement le service
 * qu'on lui demande sur un numéro saisi à la main.
 *
 * SOURCE : la clé de Luhn du SIREN est une spécification de l'INSEE, pas une
 * règle de droit. Elle ne passe donc pas par `parametres.ts` — il n'y a ni taux,
 * ni délai, ni montant ici, et rien qui puisse figurer dans un acte. Elle est
 * vérifiée dans ses tests contre TROIS SIREN RÉELS relevés au BODACC, ce qui
 * vaut mieux qu'une source recopiée : un jeu d'essai inventé pour un algorithme
 * de clé valide surtout la manière dont on l'a inventé.
 *
 * ⚠️ CE MODULE NE VALIDE PAS LA CLÉ DU SIRET. Le NIC de cinq chiffres porte la
 * sienne, dont l'algorithme n'a pas été relevé. L'inventer produirait des refus
 * arbitraires sur des numéros parfaitement valides — et le doute, ici, doit
 * profiter au numéro que le gérant a lu sur un document, pas à notre
 * arithmétique. On se contente d'en extraire les neuf premiers chiffres, qui
 * SONT le SIREN par construction, et de valider ceux-là.
 */

const NEUF_CHIFFRES = /^\d{9}$/;
const QUATORZE_CHIFFRES = /^\d{14}$/;

/** Ne garde que les chiffres : espaces, points et tirets sont des habitudes de saisie. */
function chiffresSeuls(brut: string): string {
	return brut.replace(/\D/g, '');
}

/**
 * La clé de Luhn du SIREN : on double les chiffres de rang PAIR depuis la
 * gauche, on ramène les résultats à deux chiffres par somme, et le total doit
 * être un multiple de dix.
 */
function cleDeLuhnTombe(neufChiffres: string): boolean {
	let total = 0;
	for (let rang = 0; rang < 9; rang++) {
		const chiffre = Number(neufChiffres[rang]);
		// Rang 0 est le 1er : on double les 2e, 4e, 6e et 8e.
		const double = rang % 2 === 1 ? chiffre * 2 : chiffre;
		total += double > 9 ? double - 9 : double;
	}
	return total % 10 === 0;
}

/**
 * Ce candidat est-il un SIREN ?
 *
 * Neuf chiffres, clé juste, et pas la suite de zéros — celle-ci est bien formée,
 * sa clé tombe, et elle n'est l'identifiant de personne. La laisser passer
 * ferait interroger le registre sur une entreprise qui n'existe pas, et l'absence
 * de réponse se lirait comme une absence de procédure.
 */
export function estSirenValide(candidat: string): boolean {
	if (!NEUF_CHIFFRES.test(candidat)) return false;
	if (candidat === '000000000') return false;
	return cleDeLuhnTombe(candidat);
}

/**
 * Le SIREN nu tiré d'une graphie quelconque, ou `null`.
 *
 * NE LÈVE PAS : l'appelant traite un lot — un import, une saisie — et un numéro
 * illisible ne doit pas faire échouer les autres. Il décide s'il refuse la ligne
 * ou s'il laisse simplement le champ vide.
 */
export function normaliserSiren(brut: string): string | null {
	const chiffres = chiffresSeuls(brut);
	return estSirenValide(chiffres) ? chiffres : null;
}

/**
 * Le SIREN d'un SIRET — ses neuf premiers chiffres.
 *
 * Il s'y LIT, il ne s'y calcule pas : un SIRET est un SIREN suivi d'un NIC
 * d'établissement. On valide le SIREN obtenu, et rien d'autre (voir la note de
 * tête sur la clé du NIC).
 */
export function sirenDepuisSiret(brut: string): string | null {
	const chiffres = chiffresSeuls(brut);
	if (!QUATORZE_CHIFFRES.test(chiffres)) return null;
	return normaliserSiren(chiffres.slice(0, 9));
}
