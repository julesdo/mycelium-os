import { dateLisible } from './calendrier';
import { estUtilisable, tousLesParametres, type ParametreLegalBase } from './parametres';

/**
 * L'ÉTAT DU RÉFÉRENTIEL, COMPTÉ ET DIT UNE FOIS PAR SURFACE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `parametres.ts` porte deux booléens par valeur : `verifie` autorise à
 * CALCULER, `valideParAvocat` autorise à produire un ACTE. Ce produit n'émet
 * aucun acte, donc chaque chiffre qu'il affiche vit sous `exiger()`, et jamais
 * sous `exigerPourActe()`.
 *
 * Reste à le DIRE, et à le dire juste. Refuser une pièce à un avocat au motif
 * qu'un avocat ne l'a pas validée serait un mur circulaire ; la lui donner sans
 * dire ce qu'elle tient serait pire. La sortie est une mention qui compte :
 * combien de valeurs sont relevées sur une source publique citable, combien ne
 * le sont pas, combien ont été contrôlées par un juriste, et à quelles dates le
 * relevé a été fait.
 *
 * ⚠️ ELLE SE COMPTE, ELLE NE S'ÉCRIT PAS. Une phrase qui annoncerait « douze
 * valeurs vérifiées » en dur deviendrait fausse le jour où une treizième est
 * relevée, sans qu'aucun test ne tombe : c'est exactement le défaut que la
 * règle « aucune valeur juridique écrite en dur » combat ailleurs. Les nombres
 * viennent donc de `tousLesParametres()`, à chaque rendu.
 *
 * ⚠️ ET ELLE SE REND UNE FOIS PAR SURFACE. Les quinze paramètres portent le même
 * état ; le répéter à chaque segment serait du bruit, et le bruit s'apprend.
 */

/** Une valeur juridique, telle qu'un tiers doit pouvoir la contrôler. */
export interface FicheParametre {
	readonly cle: string;
	/** L'article ou le texte. Jamais deviné, jamais recopié ailleurs. */
	readonly source: string;
	/** La date du relevé, en AAAA-MM-JJ. */
	readonly verifieLe: string;
	readonly verifie: boolean;
	readonly valideParAvocat: boolean;
	/** `true` quand la valeur suffit à calculer. */
	readonly utilisable: boolean;
	/** Pour une série : le module de pays qui la résout. */
	readonly resoluPar?: string;
	readonly note: string;
}

export interface EtatReferentiel {
	readonly total: number;
	readonly verifies: number;
	readonly nonVerifies: number;
	readonly validesParAvocat: number;
	/** La première date de relevé, et la dernière. Égales quand il n'y en a eu qu'un. */
	readonly premierReleve: string;
	readonly dernierReleve: string;
	readonly fiches: readonly FicheParametre[];
}

function fiche(parametre: ParametreLegalBase): FicheParametre {
	return {
		cle: parametre.cle,
		source: parametre.source,
		verifieLe: parametre.verifieLe,
		verifie: parametre.verifie,
		valideParAvocat: parametre.valideParAvocat,
		utilisable: estUtilisable(parametre),
		resoluPar: parametre.resoluPar,
		note: parametre.note
	};
}

export function etatDuReferentiel(): EtatReferentiel {
	const parametres = tousLesParametres();
	const dates = [...parametres.map((parametre) => parametre.verifieLe)].sort();

	return {
		total: parametres.length,
		verifies: parametres.filter((parametre) => parametre.verifie).length,
		nonVerifies: parametres.filter((parametre) => !parametre.verifie).length,
		validesParAvocat: parametres.filter((parametre) => parametre.valideParAvocat).length,
		// Une série vide n'arrive pas : `PARAMETRES` n'est jamais vide. Le repli
		// existe pour que le type ne mente pas, pas pour couvrir un cas réel.
		premierReleve: dates[0] ?? '',
		dernierReleve: dates[dates.length - 1] ?? '',
		fiches: parametres.map(fiche)
	};
}

/** Le pluriel des nombres écrits en lettres ne se devine pas : on les écrit en chiffres. */
function accord(nombre: number, singulier: string, pluriel: string): string {
	return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

/**
 * La mention en tête de toute surface qui affiche un chiffre calculé.
 *
 * ⚠️ ELLE NE DIT PAS « faites valider par un avocat ». Ce serait une conduite à
 * tenir. Elle nomme ce qui lève le verrou, à la troisième personne, et laisse
 * la décision d'agir là où elle est : chez le client.
 */
export function mentionEtatReferentiel(etat: EtatReferentiel = etatDuReferentiel()): string {
	const releve =
		etat.premierReleve === etat.dernierReleve
			? `relevé du ${dateLisible(etat.premierReleve)}`
			: `relevé du ${dateLisible(etat.premierReleve)}, complété le ${dateLisible(etat.dernierReleve)}`;

	return (
		`Sur ${accord(etat.total, 'valeur juridique', 'valeurs juridiques')} au référentiel : ` +
		`${accord(etat.verifies, 'relevée', 'relevées')} sur une source publique citable, ` +
		`${accord(etat.nonVerifies, 'non relevée', 'non relevées')}, ` +
		`${accord(etat.validesParAvocat, 'contrôlée', 'contrôlées')} par un juriste. ${releve}. ` +
		`Ce qui est relevé suffit à calculer et à expliquer un chiffre, qui se corrige. ` +
		`Ce logiciel n’émet aucun acte, et aucun de ces chiffres ne part à un greffe.`
	);
}
