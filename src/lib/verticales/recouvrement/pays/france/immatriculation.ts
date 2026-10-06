import { estSirenValide } from './siren';

/**
 * CE QUE LE BODACC PUBLIE DE L'IMMATRICULATION D'UNE SOCIÉTÉ (06/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE LECTEUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le capital social, l'inscription au registre du commerce et la ville du
 * greffe s'impriment en tête de chaque courrier du gérant, et il les tapait à
 * la main. Le registre des entreprises (recherche-entreprises) ne les donne
 * pas ; le BODACC, si : chaque annonce d'immatriculation ou de modification
 * porte, dans `listepersonnes`, la personne avec son capital (`montantCapital`,
 * `devise`) et son immatriculation (`codeRCS`, `nomGreffeImmat`).
 *
 * ⚠️ LE PLUS RÉCENT GAGNE, CHAMP PAR CHAMP. Un capital se modifie par une
 * annonce ; celle d'avant porte l'ancien. On lit les annonces de la plus
 * récente à la plus ancienne, et chaque champ prend la première valeur
 * trouvée, avec la date de l'annonce qui la porte : le gérant voit de quand
 * date ce qu'il reprend.
 *
 * ⚠️ PAR IDENTIFIANT, JAMAIS PAR NOM. Une annonce ne compte que si la personne
 * qu'elle décrit porte CE SIREN — une annonce peut en nommer plusieurs.
 *
 * ⚠️ AUCUN « NON » DÉDUIT. Un code autre que « RCS » ne dit pas que la société
 * n'est pas inscrite au registre du commerce : on ne le propose simplement pas.
 *
 * Ce module NE LÈVE JAMAIS : `listepersonnes` arrive en chaîne JSON, et une
 * annonce illisible est écartée sans emporter les autres.
 */

export interface ImmatriculationLue {
	/** Le capital en centimes, `null` si aucune annonce ne le porte en euros. */
	readonly capitalCentimes: bigint | null;
	readonly capitalPublieLe: string | null;
	/** « RCS », tel que le registre l'écrit. */
	readonly registre: string | null;
	/** « Antibes », tel que le registre l'écrit. */
	readonly villeGreffe: string | null;
	readonly greffePublieLe: string | null;
}

interface PersonneLue {
	readonly siren: string | null;
	readonly capitalCentimes: bigint | null;
	readonly registre: string | null;
	readonly villeGreffe: string | null;
}

function texte(valeur: unknown): string | null {
	return typeof valeur === 'string' && valeur.trim() !== '' ? valeur.trim() : null;
}

/**
 * « 1200.00 » rend 120 000 centimes. Sans aucun flottant : la chaîne se coupe
 * au point. Tout ce qui n'a pas cette forme rend `null`, plutôt qu'un montant
 * approché qui s'imprimerait en tête des courriers.
 */
export function centimesDuCapital(montant: string): bigint | null {
	const forme = /^(\d{1,15})(?:\.(\d{1,2}))?$/.exec(montant.trim());
	if (forme === null) return null;
	const [, euros, centimes = ''] = forme;
	return BigInt(euros ?? '0') * 100n + BigInt(centimes.padEnd(2, '0'));
}

function lirePersonne(brut: unknown): PersonneLue | null {
	if (typeof brut !== 'object' || brut === null) return null;
	const p = brut as {
		numeroImmatriculation?: {
			numeroIdentification?: unknown;
			codeRCS?: unknown;
			nomGreffeImmat?: unknown;
		};
		capital?: { montantCapital?: unknown; devise?: unknown };
	};
	const numero = texte(p.numeroImmatriculation?.numeroIdentification);
	const chiffres = numero === null ? null : numero.replace(/\D/g, '');
	const montant = texte(p.capital?.montantCapital);
	return {
		siren: chiffres !== null && estSirenValide(chiffres) ? chiffres : null,
		// Une autre devise ne se convertit pas : elle ne s'imprime pas en euros.
		capitalCentimes:
			montant !== null && texte(p.capital?.devise) === 'EUR' ? centimesDuCapital(montant) : null,
		registre: texte(p.numeroImmatriculation?.codeRCS),
		villeGreffe: texte(p.numeroImmatriculation?.nomGreffeImmat)
	};
}

/** Les personnes d'une annonce : `personne` est un objet, ou une liste. */
function personnesDe(listepersonnes: unknown): PersonneLue[] {
	if (typeof listepersonnes !== 'string') return [];
	let charge: unknown;
	try {
		charge = JSON.parse(listepersonnes);
	} catch {
		return [];
	}
	if (typeof charge !== 'object' || charge === null) return [];
	const personne = (charge as { personne?: unknown }).personne;
	const liste = Array.isArray(personne) ? personne : [personne];
	return liste.map(lirePersonne).filter((p): p is PersonneLue => p !== null);
}

/**
 * L'immatriculation d'un SIREN, d'après ses annonces BODACC. `null` quand
 * aucune annonce ne porte ni capital ni greffe pour lui.
 */
export function immatriculationDesAnnonces(
	annonces: readonly unknown[],
	siren: string
): ImmatriculationLue | null {
	const datees = annonces
		.map((annonce) => {
			if (typeof annonce !== 'object' || annonce === null) return null;
			const a = annonce as { dateparution?: unknown; listepersonnes?: unknown };
			const date = texte(a.dateparution);
			return date === null ? null : { date, personnes: personnesDe(a.listepersonnes) };
		})
		.filter((a): a is { date: string; personnes: PersonneLue[] } => a !== null)
		.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));

	let capitalCentimes: bigint | null = null;
	let capitalPublieLe: string | null = null;
	let registre: string | null = null;
	let villeGreffe: string | null = null;
	let greffePublieLe: string | null = null;

	for (const { date, personnes } of datees) {
		for (const personne of personnes) {
			if (personne.siren !== siren) continue;
			if (capitalCentimes === null && personne.capitalCentimes !== null) {
				capitalCentimes = personne.capitalCentimes;
				capitalPublieLe = date;
			}
			if (villeGreffe === null && personne.villeGreffe !== null) {
				villeGreffe = personne.villeGreffe;
				registre = personne.registre;
				greffePublieLe = date;
			}
		}
	}

	if (capitalCentimes === null && villeGreffe === null) return null;
	return { capitalCentimes, capitalPublieLe, registre, villeGreffe, greffePublieLe };
}
