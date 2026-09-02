/**
 * L'arithmétique exacte des montants.
 *
 * POURQUOI CE MODULE EXISTE. La verticale EGalim somme des `number` en euros,
 * et c'est acceptable : elle produit un RATIO, où l'erreur de représentation
 * des flottants est très inférieure au bruit de classification. Un décompte de
 * créance ne pardonne pas la même chose. Ce qui n'est pas chiffré dans un acte
 * exécutoire est définitivement perdu, et un centime réclamé en trop est une
 * somme demandée sans fondement. Les deux fautes se paient, dans les deux sens.
 *
 * LA REPRÉSENTATION EST UN ENTIER DE CENTIMES, EN `bigint`. Pas un `number` :
 * un `number` est exact jusqu'à 2^53, ce qui suffirait largement en centimes,
 * mais cesse de l'être dès qu'on MULTIPLIE — et le calcul d'intérêts multiplie
 * un principal par un taux et par un nombre de jours avant de diviser. En
 * `bigint`, cette chaîne reste exacte jusqu'à la division finale, qui est le
 * seul endroit où un arrondi est décidé, explicitement.
 *
 * LE TYPE EST MARQUÉ. `Montant` n'est pas un alias de `bigint` : c'est un type
 * distinct, qu'on ne peut pas fabriquer par accident à partir d'un entier qui
 * traînait. Additionner un montant et un nombre de jours ne compile pas.
 */

declare const CENTIMES: unique symbol;

/** Un montant en euros, porté par un entier de centimes. Jamais un flottant. */
export type Montant = bigint & { readonly [CENTIMES]: true };

function marquer(centimes: bigint): Montant {
	return centimes as Montant;
}

export const ZERO: Montant = marquer(0n);

/**
 * Les espaces qui séparent les milliers sur une facture. Les exports PDF et
 * tableur les sèment sans prévenir, et deux montants identiques à l'œil
 * doivent se lire pareil.
 *
 * `\s` SUFFIT, ET C'EST VÉRIFIÉ PLUTÔT QUE SUPPOSÉ. En JavaScript, la classe
 * couvre toute la catégorie Unicode Zs — donc l'insécable U+00A0 et
 * l'insécable étroite U+202F, qui sont les deux qu'on rencontre réellement.
 * Les énumérer en plus était redondant, et les écrire en littéral dans la
 * source les rendait invisibles à la relecture. Un test les vérifie
 * nommément, pour que la garantie ne dépende pas de la mémoire du lecteur.
 */
const ESPACES = /\s/g;

/**
 * Un montant écrit, à la française ou à l'anglaise.
 *
 * Un séparateur décimal au plus, suivi d'un ou deux chiffres. Trois chiffres
 * après la virgule ne sont pas un montant en euros : c'est soit un séparateur
 * de milliers pris pour une virgule, soit un prix unitaire — et deviner
 * laquelle des deux ferait varier le résultat d'un facteur mille.
 */
const MONTANT_ECRIT = /^(-?)(\d+)(?:[.,](\d{1,2}))?$/;

/**
 * Lit un montant écrit. Lève sur tout ce qui n'en est pas un.
 *
 * L'ÉCHEC EST BRUYANT, DÉLIBÉRÉMENT. Rendre zéro sur une saisie illisible
 * ferait disparaître une créance en silence, et personne ne peut s'apercevoir
 * d'une ligne absente en relisant un décompte.
 */
export function depuisEuros(texte: string | number): Montant {
	const brut = typeof texte === 'number' ? texte.toString() : texte;
	const nettoye = brut.replace(ESPACES, '');

	const trouve = MONTANT_ECRIT.exec(nettoye);
	if (trouve === null) {
		throw new Error(`Montant illisible : ${JSON.stringify(brut)}`);
	}

	const [, signe, entiers, decimales = ''] = trouve;
	const centimes = decimales.padEnd(2, '0');
	const valeur = BigInt(entiers!) * 100n + BigInt(centimes);

	return marquer(signe === '-' ? -valeur : valeur);
}

/** Un montant directement en centimes — pour les constantes légales. */
export function depuisCentimes(centimes: bigint): Montant {
	return marquer(centimes);
}

/** Le montant en centimes, pour le stockage. Jamais pour l'affichage. */
export function enCentimes(montant: Montant): bigint {
	return montant;
}

/** L'écriture française : espace pour les milliers, virgule pour les décimales. */
export function versEuros(montant: Montant): string {
	const negatif = montant < 0n;
	const absolu = negatif ? -montant : montant;

	const entiers = (absolu / 100n).toString();
	const centimes = (absolu % 100n).toString().padStart(2, '0');

	const groupes = entiers.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

	return `${negatif ? '-' : ''}${groupes},${centimes}`;
}

export function additionner(...montants: readonly Montant[]): Montant {
	let total = 0n;
	for (const montant of montants) total += montant;
	return marquer(total);
}

export function soustraire(a: Montant, b: Montant): Montant {
	return marquer(a - b);
}

/**
 * Une fraction exacte, gardée non réduite.
 *
 * Le calcul d'intérêts est un produit de rapports — un taux annuel, un nombre
 * de jours sur une base annuelle — et les composer en flottant fait dériver le
 * résultat avant même la première division. Portés en `bigint`, numérateur et
 * dénominateur se multiplient entre eux sans jamais perdre un chiffre.
 */
export interface Fraction {
	readonly numerateur: bigint;
	readonly denominateur: bigint;
}

export function fraction(numerateur: bigint, denominateur: bigint): Fraction {
	if (denominateur === 0n) {
		throw new Error('Fraction de dénominateur nul : le calcul serait indéfini.');
	}
	return { numerateur, denominateur };
}

/**
 * La division entière avec arrondi au plus proche, à égalité en s'éloignant de
 * zéro.
 *
 * POURQUOI CET ARRONDI ET PAS UN AUTRE. C'est l'arrondi commercial, celui que
 * lit un comptable et celui qu'attend un débiteur qui refait le calcul. Deux
 * autres étaient possibles et sont écartés :
 *
 *   - l'arrondi « au pair » (banquier) répartit mieux l'erreur sur un grand
 *     nombre d'opérations, mais rend 0,125 € → 0,12 € et 0,135 € → 0,14 €, ce
 *     qui est indéfendable devant quelqu'un qui vérifie une ligne isolée ;
 *   - la troncature favorise systématiquement le débiteur, ce qui revient à
 *     abandonner une fraction de créance à chaque ligne, définitivement.
 *
 * LA SYMÉTRIE EST UNE PROPRIÉTÉ, PAS UN DÉTAIL. -0,125 € donne -0,13 € et non
 * -0,12 € : sans quoi un avoir et un achat de même montant ne s'annuleraient
 * pas, et rejouer un décompte en sens inverse ne rendrait pas zéro.
 */
function diviserArrondi(numerateur: bigint, denominateur: bigint): bigint {
	// Le signe est porté par le numérateur, une fois pour toutes.
	const denPositif = denominateur < 0n ? -denominateur : denominateur;
	const numOriente = denominateur < 0n ? -numerateur : numerateur;

	const negatif = numOriente < 0n;
	const absolu = negatif ? -numOriente : numOriente;

	const quotient = absolu / denPositif;
	const reste = absolu % denPositif;

	// `reste * 2 >= dénominateur` est la comparaison « reste ≥ ½ » sans jamais
	// former une demi-unité, donc sans jamais quitter les entiers.
	const arrondi = reste * 2n >= denPositif ? quotient + 1n : quotient;

	return negatif ? -arrondi : arrondi;
}

/**
 * Applique une fraction à un montant. **L'unique endroit de tout le calcul où
 * de l'information se perd**, et il est explicite.
 */
export function multiplier(montant: Montant, facteur: Fraction): Montant {
	return marquer(diviserArrondi(montant * facteur.numerateur, facteur.denominateur));
}
