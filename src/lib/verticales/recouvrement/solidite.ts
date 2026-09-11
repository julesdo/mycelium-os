import { POIDS } from './scoring';
import type { ClePiece } from './qualification';

/**
 * LA PYRAMIDE DE PREUVES — module 4.2 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL AJOUTE À CE QUI EXISTAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le score savait déjà quelles pièces manquaient, et l'écran les affichait en
 * pastilles nues : « bon de commande », « bon de livraison ». Deux étiquettes
 * de même apparence, dont l'une vaut trois points sur vingt et l'autre un
 * seul — et aucune ne disait ce qu'elle établit.
 *
 * Le blueprint pose la hiérarchie : « facture seule = fragile, + bon de
 * commande + preuve de livraison = blindé ». C'est une pyramide, et une
 * pyramide se montre : chaque étage porte le FAIT qu'il établit, les documents
 * qui l'établissent, et ce qu'il pèse.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA FORMULATION EST JURIDIQUEMENT STRUCTURANTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le blueprint le dit mot pour mot : « trois des quatre pièces attendues sont
 * absentes » est un CONSTAT ; « ce dossier est trop faible » est un CONSEIL.
 *
 * La nuance n'est pas rhétorique. Un dossier « trop faible » est un verdict sur
 * les chances de succès — c'est-à-dire l'appréciation juridique qu'on n'a pas
 * le droit de donner, et celle sur laquelle un client se retournerait. Compter
 * des pièces absentes est une mesure ; le gérant en tire ce qu'il veut.
 *
 * Un test balaie chaque phrase produite ici à la recherche de « faible »,
 * « solide », « vos chances » et leurs voisins.
 */

export type CleEtage = 'commande' | 'livraison' | 'conditionsContractuelles' | 'miseEnDemeure';

export interface Etage {
	readonly cle: CleEtage;
	/** Ce que cet étage établit, en clair. C'est ça qui décide, pas le nom. */
	readonly fait: string;
	/**
	 * La phrase quand l'étage est établi, ÉCRITE À LA MAIN.
	 *
	 * ⚠️ ELLE NE SE COMPOSE PAS DEPUIS `fait`. La première version faisait
	 * `${majuscule(fait)} est documenté.` et sortait trois phrases fausses sur
	 * quatre — « Les conditions de paiement applicables EST DOCUMENTÉ » —
	 * parce que l'accord d'un participe dépend du genre et du nombre du sujet,
	 * et qu'aucune règle ne les tire d'une chaîne. Trouvé à l'écran, pas en
	 * test : une faute de français sur un produit vendu à des dirigeants dit
	 * que personne n'a lu.
	 */
	readonly etabli: string;
	/** Les documents qui l'établissent. UN SEUL suffit. */
	readonly pieces: readonly ClePiece[];
	/** Son poids au score, sur un total de 20. Lu depuis `POIDS`, jamais recopié. */
	readonly poids: number;
}

/**
 * Les quatre étages, du plus lourd au plus léger.
 *
 * ⚠️ LE POIDS VIENT DE `POIDS`, il n'est pas réécrit ici. Deux tables des mêmes
 * pondérations finiraient par diverger, et l'écran montrerait une pyramide qui
 * ne correspondrait plus au chiffre affiché juste au-dessus.
 *
 * L'ORDRE N'EST PAS ARBITRAIRE. Commande et livraison valent 3 chacune parce
 * qu'elles répondent aux deux questions qu'un débiteur pose en premier : ai-je
 * commandé, ai-je reçu. Les CGV et la mise en demeure valent 1 : utiles,
 * jamais décisives. À poids égal, l'ordre de cette liste départage — un ordre
 * stable vaut mieux qu'un choix qui changerait d'un rendu à l'autre.
 */
export const ETAGES_DE_PREUVE: readonly Etage[] = [
	{
		cle: 'commande',
		fait: 'l’engagement du débiteur à commander',
		etabli: 'L’engagement du débiteur à commander est documenté.',
		pieces: ['BON_DE_COMMANDE', 'DEVIS_SIGNE'],
		poids: POIDS.commande
	},
	{
		cle: 'livraison',
		fait: 'la réception de la prestation',
		etabli: 'La réception de la prestation est documentée.',
		pieces: ['BON_DE_LIVRAISON'],
		poids: POIDS.livraison
	},
	{
		cle: 'conditionsContractuelles',
		fait: 'les conditions de paiement applicables',
		etabli: 'Les conditions de paiement applicables sont documentées.',
		pieces: ['CGV', 'CONTRAT'],
		poids: POIDS.conditionsContractuelles
	},
	{
		cle: 'miseEnDemeure',
		fait: 'l’interpellation préalable',
		etabli: 'L’interpellation préalable est documentée.',
		pieces: ['MISE_EN_DEMEURE'],
		poids: POIDS.miseEnDemeure
	}
];

export interface EtageLu extends Etage {
	readonly presente: boolean;
	/** Ce qu'on constate de cet étage. Au présent, sans verdict. */
	readonly etat: string;
}

export interface Pyramide {
	readonly etages: readonly EtageLu[];
	readonly etablies: number;
	readonly attendues: number;
	/** « Trois des quatre pièces attendues sont absentes. » Un compte. */
	readonly constat: string;
	/**
	 * L'étage absent au poids le plus fort, ou `null` si tout est établi.
	 *
	 * ⚠️ CE N'EST PAS UN CONSEIL, C'EST UNE MESURE. « Le bon de commande vaut
	 * trois points sur vingt » se vérifie au tableau des poids. « Procurez-vous
	 * d'abord le bon de commande » serait une consigne — et ce produit n'en
	 * donne pas.
	 */
	readonly prochaine: EtageLu | null;
}

const EN_TOUTES_LETTRES = ['aucune', 'une', 'deux', 'trois', 'quatre'] as const;

function lettres(n: number): string {
	return EN_TOUTES_LETTRES[n] ?? String(n);
}

export function pyramideDePreuves(piecesFournies: readonly ClePiece[]): Pyramide {
	const etages: EtageLu[] = ETAGES_DE_PREUVE.map((etage) => {
		// UNE pièce suffit : un devis signé vaut un bon de commande, les deux
		// établissent le même fait.
		const presente = etage.pieces.some((piece) => piecesFournies.includes(piece));
		return {
			...etage,
			presente,
			// La forme négative se compose sans risque : « Aucune pièce ne documente
			// X » ne s'accorde pas avec X. La positive, elle, est écrite à la main.
			etat: presente ? etage.etabli : `Aucune pièce ne documente ${etage.fait}.`
		};
	});

	const etablies = etages.filter((e) => e.presente).length;
	const attendues = etages.length;
	const absentes = attendues - etablies;

	// Le plus lourd d'abord ; à poids égal, l'ordre de la liste départage. Le
	// tri est STABLE en JavaScript moderne, donc cet ordre tient.
	const prochaine =
		[...etages].filter((e) => !e.presente).sort((a, b) => b.poids - a.poids)[0] ?? null;

	return {
		etages,
		etablies,
		attendues,
		// ⚠️ UN COMPTE, JAMAIS UN VERDICT. Le blueprint nomme cette phrase
		// exactement : « trois des quatre pièces attendues sont absentes » est un
		// constat, « ce dossier est trop faible » est un conseil.
		constat:
			absentes === 0
				? `Les ${lettres(attendues)} pièces attendues sont réunies.`
				: `${lettres(absentes).charAt(0).toUpperCase()}${lettres(absentes).slice(1)} des ` +
					`${lettres(attendues)} pièces attendues ` +
					`${absentes > 1 ? 'sont absentes' : 'est absente'}.`,
		prochaine
	};
}
