/**
 * L'empreinte d'un bilan — ce que la signature engage réellement.
 *
 * CE QU'ON SIGNE, ET POURQUOI CE N'EST PAS LE PDF. Un fichier PDF contient sa
 * date de création, ses identifiants internes et l'ordre de ses objets : deux
 * rendus du même bilan, à deux secondes d'écart, n'ont pas les mêmes octets.
 * Signer le fichier reviendrait donc à signer un exemplaire, et rien ne
 * permettrait de vérifier qu'un second téléchargement porte la même mesure.
 *
 * On signe donc LA MESURE : les chiffres du bilan, sérialisés sous une forme
 * canonique — clés ordonnées, décimales fixées, familles et fournisseurs triés.
 * Deux sérialisations du même bilan sont identiques au bit près, quel que soit
 * l'ordre dans lequel la base a rendu ses lignes.
 *
 * C'est aussi la bonne sémantique métier. Un diagnostic est figé à sa date :
 * l'empreinte d'un bilan ne peut donc jamais changer, et si elle change, c'est
 * qu'on ne regarde plus le même bilan. La vérification consiste exactement en
 * ça — recalculer, comparer.
 *
 * SHA-256, via l'API Web Crypto : présente dans les navigateurs comme dans le
 * runtime des actions Convex, sans aucune dépendance. Le même code produit la
 * même empreinte des deux côtés, ce qui est précisément ce qu'on veut vérifier.
 */

export interface BilanAEmpreindre {
	organizationName: string;
	siret: string | null;
	periodStart: string;
	periodEnd: string;
	computedAt: number;
	classifierVersion: string;
	ratios: {
		durable: number;
		bio: number;
		meatFishDurable: number;
		totalFoodHT: number;
		totalHT: number;
	};
	byFamily: ReadonlyArray<{ family: string; totalHT: number; durableHT: number; bioHT: number }>;
	bySupplier: ReadonlyArray<{ supplierName: string; totalHT: number; durableHT: number }>;
}

/**
 * Les montants sont arrêtés au centime, les taux à six décimales.
 *
 * Un flottant IEEE 754 ne se sérialise pas identiquement partout : `0.1 + 0.2`
 * rend `0.30000000000000004`, et une somme calculée dans un ordre différent
 * peut varier au dernier bit. Fixer la précision AVANT de sérialiser est ce qui
 * rend l'empreinte reproductible — sans quoi elle changerait sans que la mesure
 * change, et la vérification accuserait à tort.
 */
const centime = (n: number): string => n.toFixed(2);
const taux = (n: number): string => n.toFixed(6);

/** La forme canonique du bilan. Stable, ordonnée, indépendante de la base. */
export function formeCanonique(b: BilanAEmpreindre): string {
	const familles = [...b.byFamily]
		.sort((x, y) => x.family.localeCompare(y.family))
		.map((f) => [f.family, centime(f.totalHT), centime(f.durableHT), centime(f.bioHT)]);

	const fournisseurs = [...b.bySupplier]
		.sort((x, y) => x.supplierName.localeCompare(y.supplierName))
		.map((s) => [s.supplierName, centime(s.totalHT), centime(s.durableHT)]);

	// Un tableau plutôt qu'un objet : l'ordre des clés d'un objet JSON dépend de
	// l'ordre d'insertion, et deux chemins de code peuvent l'inverser sans que
	// personne s'en aperçoive. Un tableau a l'ordre qu'on lui donne, et cet
	// ordre est écrit ici, une fois.
	return JSON.stringify([
		'mycelium.bilan.v1',
		b.organizationName,
		b.siret ?? '',
		b.periodStart,
		b.periodEnd,
		b.computedAt,
		b.classifierVersion,
		taux(b.ratios.durable),
		taux(b.ratios.bio),
		taux(b.ratios.meatFishDurable),
		centime(b.ratios.totalFoodHT),
		centime(b.ratios.totalHT),
		familles,
		fournisseurs
	]);
}

/** L'empreinte SHA-256 de la forme canonique, en hexadécimal minuscule. */
export async function empreinteBilan(b: BilanAEmpreindre): Promise<string> {
	const octets = new TextEncoder().encode(formeCanonique(b));
	const condensat = await globalThis.crypto.subtle.digest('SHA-256', octets);
	return [...new Uint8Array(condensat)].map((o) => o.toString(16).padStart(2, '0')).join('');
}

/**
 * L'empreinte telle qu'on l'imprime : groupée par blocs de quatre.
 *
 * Soixante-quatre caractères d'affilée ne se comparent pas à l'œil. Découpés,
 * ils se lisent et se dictent — ce que quelqu'un qui vérifie fera vraiment.
 */
export function empreinteLisible(empreinte: string): string {
	return (empreinte.match(/.{1,4}/g) ?? []).join(' ').toUpperCase();
}
