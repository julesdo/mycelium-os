/**
 * LE REFUS EN QUATRE PARTIES, PARTAGÉ PAR TOUT LE PRODUIT (D0, B14).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE TYPE SORT DE `relance.ts`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La forme existait déjà, mais à un seul endroit : la branche `disponible:
 * false` de `Relance`, qui porte les trois refus du composeur de brouillons.
 * Elle y était née bonne du premier coup, et elle y serait restée seule.
 *
 * Or D0 ne s'applique pas en gros : il s'applique à CHAQUE endroit du produit
 * qui dit non. Les filtres avant rendu (`filtres.ts`) en ajoutent cinq d'un
 * coup, et la conversation en ajoutera d'autres. Une forme tenue à N endroits
 * se perd au premier ajout ; celle-ci se tient ici, à un seul, et le
 * compilateur la réclame partout ailleurs.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES QUATRE PARTIES, ET LEUR CORRESPONDANCE AVEC D0
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ordre de lecture est déjà écrit au dépôt, dans le validateur qui porte ces
 * quatre champs vers l'écran (`convex/recouvrement/lecture.ts`) : « `peutFaire`
 * d'abord, ce que le produit fait tout de suite, puis `constat` et `blocages`
 * qui nomment ce qui manque et ce qui le lève, puis `coutDeLAttente` ».
 *
 *   1. ce qu'on peut faire tout de suite  →  `peutFaire`   (JAMAIS vide)
 *   2. ce qui manque, nommé               →  `constat`
 *   3. ce qui lève le manque, au constat  →  `blocages`
 *   4. ce que coûte l'attente, chiffré    →  `coutDeLAttente`
 *
 * ⚠️ `peutFaire` EST REQUIS, ET C'EST TOUT L'INTÉRÊT DU CHAMP. Un refus dont
 * la première ligne est vide est un mur, quel que soit ce qui suit ; en faire
 * un champ optionnel aurait laissé chaque nouveau site de refus l'oublier sans
 * que rien ne tombe.
 *
 * ⚠️ CE QUE CE TYPE NE COUVRE PAS, ET C'EST DÉLIBÉRÉ : les erreurs de
 * développement. `exiger()` sur une SERIE n'atteint jamais l'écran, et
 * transformer ce refus-là en chemin d'interface rendrait rattrapable une faute
 * qui doit casser le build.
 */

export interface Refus {
	/**
	 * CE QUE LE PRODUIT FAIT TOUT DE SUITE, malgré ce refus. Requis, et
	 * vérifié au point de construction par `composerRefus`.
	 */
	readonly peutFaire: string;
	/** Ce qui manque, nommé. Un constat, jamais une consigne. */
	readonly constat: string;
	/**
	 * Ce qui lève le manque, énoncé au CONSTAT et jamais à l'impératif. Le
	 * produit dit « ce verrou se lève par le contrôle d'un juriste sur la
	 * valeur et son applicabilité » ; il ne dit pas de faire valider, qui est
	 * une conduite à tenir.
	 *
	 * La liste peut être VIDE, et c'est une information : deux des trois refus
	 * de `relance.ts` n'ont rien à y mettre parce que leur `constat` porte déjà
	 * ce qui les lève, en une phrase.
	 */
	readonly blocages: readonly string[];
	/**
	 * CE QUE L'ATTENTE COÛTE, chiffré quand c'est chiffrable et DÉCLARÉ non
	 * chiffrable sinon. Jamais tu : un total silencieusement amputé est pire
	 * qu'un total incomplet annoncé.
	 */
	readonly coutDeLAttente: string;
}

/**
 * Compose un refus, et refuse de composer un mur.
 *
 * ⚠️ LA VÉRIFICATION EST AU POINT D'USAGE, PAS DANS UN TEST QUI BALAIE LE
 * CODE. Le type rend `peutFaire` obligatoire, ce qui attrape l'oubli ; il
 * n'attrape pas la chaîne vide, ni la chaîne d'espaces, que produit un refus
 * dont la première ligne est COMPOSÉE à partir d'une donnée absente. C'est ce
 * cas-là qui fait le mur, et c'est celui que le compilateur ne voit pas.
 */
export function composerRefus(parties: Refus): Refus {
	manquant('peutFaire', parties.peutFaire);
	manquant('constat', parties.constat);
	manquant('coutDeLAttente', parties.coutDeLAttente);
	return parties;
}

function manquant(champ: string, valeur: string): void {
	if (valeur.trim() !== '') return;
	throw new Error(
		`Refus incomplet : le champ « ${champ} » est vide. Un refus dont une des ` +
			`quatre parties manque est un mur, et D0 en fait un défaut de produit.`
	);
}
