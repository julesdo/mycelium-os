import { estDateReelle } from '../../calendrier';
import { estSirenValide } from './siren';

/**
 * LA LECTURE D'UNE ANNONCE BODACC — et ce que le produit refuse d'y lire.
 *
 * Le BODACC publie chaque jour les annonces des greffes : créations,
 * modifications, radiations, procédures collectives. C'est une donnée ouverte,
 * sans clé, et c'est la seule source gratuite qui dise qu'un débiteur vient
 * d'être placé en liquidation.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LE PRODUIT NE LIT PAS LE DROIT, IL CITE LA TAXONOMIE DU REGISTRE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Toutes les annonces de la famille « Procédures collectives » ne disent pas
 * qu'une entreprise est insolvable. Un « Jugement d'interdiction de gérer » vise
 * une PERSONNE, pas la solvabilité de la société ; une « Liste des créances »
 * est une formalité de procédure. Classer soi-même la `nature` en état de santé
 * serait une lecture juridique — exactement ce que `CLAUDE.md` interdit, et la
 * plus dangereuse des trois lignes rouges à franchir en silence.
 *
 * On retient donc le champ que le BODACC remplit LUI-MÊME, `jugement.famille` :
 * quand il vaut « Jugement d'ouverture », l'état bascule. Pour tout le reste, le
 * constat est enregistré et affiché VERBATIM sans que l'état ne bouge. Le gérant
 * lit le registre, pas notre interprétation.
 *
 * **On ne classe que dans un sens.** Un jugement de clôture ne restaure jamais
 * `SAINE` : décider qu'une entreprise va de nouveau bien est une lecture, et
 * elle irait dans le sens qui fait engager des frais. Le constat de clôture
 * s'affiche ; l'état reste où il est jusqu'à ce qu'un humain en décide.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CE MODULE NE LÈVE JAMAIS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `jugement` arrive en **chaîne JSON** — pas en objet — et `JSON.parse` échouera
 * tôt ou tard sur un flux de plusieurs millions d'annonces. Une annonce
 * illisible ne doit pas emporter le lot du jour : elle rend `null`, ou un
 * constat sans effet. C'est la même discipline que `reveler` et `prescriptionDe`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ET ON NE RAPPROCHE QUE PAR IDENTIFIANT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `registre` porte le SIREN en deux graphies — `["853479236", "853 479 236"]`.
 * On retient le premier qui passe sa clé de contrôle, et **on rend `null` si
 * aucun ne passe**. Rapprocher par raison sociale sur un flux national finirait
 * par annoncer à un gérant que son client solvable est en liquidation : c'est la
 * faute symétrique de la relance d'un client qui a déjà payé, et elle coûte plus
 * cher — elle fait cesser des livraisons.
 */

export type EffetSurLaSante = 'PROCEDURE_COLLECTIVE' | 'RADIEE' | 'AUCUN';

export interface ConstatBodacc {
	/** L'identifiant d'annonce du BODACC. Stable : il porte l'idempotence. */
	readonly identifiantAnnonce: string;
	readonly siren: string;
	readonly dateParution: string;
	/** La nature, telle que le registre l'écrit. **Jamais reformulée.** */
	readonly nature: string;
	/** La date du jugement, quand elle est lisible. Différente de la parution. */
	readonly dateJugement?: string;
	readonly tribunal?: string;
	/** L'annonce elle-même, pour que le gérant puisse la lire à la source. */
	readonly url: string;
	readonly effetSurLaSante: EffetSurLaSante;
}

/** La valeur que le BODACC pose lui-même sur un jugement qui OUVRE une procédure. */
const FAMILLE_OUVERTURE = "Jugement d'ouverture";

function texteOuVide(valeur: unknown): string {
	return typeof valeur === 'string' ? valeur : '';
}

/** Le premier numéro du registre qui passe sa clé de contrôle, ou `null`. */
function sirenDuRegistre(registre: unknown): string | null {
	if (!Array.isArray(registre)) return null;
	for (const entree of registre) {
		if (typeof entree !== 'string') continue;
		const chiffres = entree.replace(/\D/g, '');
		if (estSirenValide(chiffres)) return chiffres;
	}
	return null;
}

interface JugementLu {
	readonly famille: string;
	readonly nature: string;
	readonly date?: string;
}

/** Le jugement, ou `null` si la chaîne n'est pas lisible. Ne lève pas. */
function lireJugement(brut: unknown): JugementLu | null {
	if (typeof brut !== 'string' || brut.trim() === '') return null;
	try {
		const analyse: unknown = JSON.parse(brut);
		if (typeof analyse !== 'object' || analyse === null) return null;
		const objet = analyse as Record<string, unknown>;
		const date = texteOuVide(objet.date);
		return {
			famille: texteOuVide(objet.famille),
			nature: texteOuVide(objet.nature),
			// Une date de jugement impossible n'écarte pas l'annonce : c'est la DATE
			// qu'on ne sait pas lire, pas le jugement.
			date: estDateReelle(date) ? date : undefined
		};
	} catch {
		return null;
	}
}

export function lireAnnonce(brut: unknown): ConstatBodacc | null {
	if (typeof brut !== 'object' || brut === null) return null;
	const annonce = brut as Record<string, unknown>;

	const famille = texteOuVide(annonce.familleavis);
	// Deux familles nous concernent, et deux seulement. Les créations, les
	// modifications et les ventes ne disent rien de la solvabilité d'un débiteur.
	if (famille !== 'collective' && famille !== 'radiation') return null;

	const siren = sirenDuRegistre(annonce.registre);
	if (siren === null) return null;

	const dateParution = texteOuVide(annonce.dateparution);
	if (!estDateReelle(dateParution)) return null;

	const identifiantAnnonce = texteOuVide(annonce.id);
	if (identifiantAnnonce === '') return null;

	const jugement = lireJugement(annonce.jugement);

	// Le libellé de famille du registre sert de nature quand aucun jugement n'est
	// joint — c'est le cas des radiations.
	const nature =
		jugement !== null && jugement.nature !== ''
			? jugement.nature
			: texteOuVide(annonce.familleavis_lib);

	const effetSurLaSante: EffetSurLaSante =
		famille === 'radiation'
			? 'RADIEE'
			: jugement !== null && jugement.famille === FAMILLE_OUVERTURE
				? 'PROCEDURE_COLLECTIVE'
				: 'AUCUN';

	const tribunal = texteOuVide(annonce.tribunal);

	return {
		identifiantAnnonce,
		siren,
		dateParution,
		nature,
		dateJugement: jugement?.date,
		tribunal: tribunal === '' ? undefined : tribunal,
		url: texteOuVide(annonce.url_complete),
		effetSurLaSante
	};
}
