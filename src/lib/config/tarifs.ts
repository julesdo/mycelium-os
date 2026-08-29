/**
 * La grille tarifaire, et ce qu'elle recouvre. Source unique.
 *
 * POURQUOI ELLE VIT ICI, ET PLUS DANS `billing.ts`. Elle y était, et elle y
 * était juste — mais elle avait trois lecteurs, et deux d'entre eux la
 * recopiaient à la main :
 *
 *   `src/lib/convex/billing.ts`  le serveur, qui choisit l'identifiant de prix
 *                                Paddle. Le seul qui l'importait vraiment.
 *   `src/routes/showroom.tsx`    la salle d'exposition, qui réécrivait les six
 *                                montants en clair dans une liste littérale.
 *   la page d'accueil            qui allait faire la même chose.
 *
 * Trois copies d'une grille de prix, c'est trois occasions d'annoncer publiquement
 * un montant que le serveur ne facture pas. Sur un produit vendu par abonnement,
 * c'est le défaut le plus coûteux de tous : il ne casse rien, il ne lève aucune
 * exception, et il se découvre par un client qui a raison de râler.
 *
 * Ce module est PUR — pas d'import Convex, pas de React. C'est ce qui lui permet
 * d'être lu à la fois par les fonctions serveur et par le bundle du navigateur,
 * exactement comme `src/lib/egalim/referentiel.ts` l'est déjà des deux côtés.
 *
 * ELLE PASSE EN REVUE DE CODE, comme le barème EGalim, et pour la même raison :
 * une grille tarifaire modifiable depuis une page d'administration finit par
 * diverger de ce que le vendeur facture. Source des montants : document 03 du
 * business plan.
 */

/**
 * Le palier de taille, qui décide du PRIX et jamais des fonctionnalités.
 *
 * Un établissement de mille couverts reçoit exactement le même produit qu'un
 * établissement de deux cents ; il le paie plus cher parce que la valeur diffère,
 * pas la prestation.
 */
export const PALIERS = ['S', 'M', 'L'] as const;
export type PalierTaille = (typeof PALIERS)[number];

export function palierDeTaille(couvertsJour: number | undefined): PalierTaille {
	// Sans information, on retient le palier le plus bas : facturer trop cher un
	// établissement qui n'a pas rempli son profil serait le pire des défauts.
	if (!couvertsJour || couvertsJour <= 0) return 'S';
	if (couvertsJour < 250) return 'S';
	if (couvertsJour <= 800) return 'M';
	return 'L';
}

/**
 * Les montants, en euros HORS TAXES.
 *
 * Ce sont des montants d'AFFICHAGE. Le montant réellement prélevé est celui du
 * prix Paddle correspondant : c'est Paddle qui facture, en qualité de vendeur de
 * registre. Un écart entre les deux serait un défaut à corriger chez Paddle, pas
 * ici.
 */
export const TARIFS: Record<PalierTaille, { bilan: number; abonnementMensuel: number }> = {
	S: { bilan: 690, abonnementMensuel: 190 },
	M: { bilan: 1190, abonnementMensuel: 290 },
	L: { bilan: 1900, abonnementMensuel: 390 }
};

/** Ce que chaque palier recouvre, pour l'afficher sans faire deviner. */
export const BORNES_PALIER: Record<PalierTaille, string> = {
	S: 'moins de 250 couverts par jour',
	M: 'de 250 à 800 couverts par jour',
	L: 'plus de 800 couverts par jour'
};

/** La même borne, en trois mots, pour un sélecteur qui doit tenir sur 375 px. */
export const BORNES_COURTES: Record<PalierTaille, string> = {
	S: '< 250 couverts',
	M: '250 à 800',
	L: '> 800 couverts'
};

export type ColonneOffre = 'bilan' | 'abonnement';

/**
 * Ce que chaque offre contient.
 *
 * La liste est ÉCRITE UNE FOIS et les deux colonnes la traversent : deux listes
 * parallèles auraient fini par annoncer une fonctionnalité d'un côté et pas de
 * l'autre. Elle doit rester alignée sur `PLAN_FEATURES` dans `billing.ts`, qui
 * décide de ce qui est réellement ouvert — c'est le serveur qui tranche, cette
 * liste ne fait que le dire.
 *
 * AUCUNE LIGNE NE PROMET UN RÉSULTAT. Le mot « garantie » est proscrit dans tout
 * le produit, et un test balaie l'interface pour le vérifier ; la règle vaut
 * aussi pour les tournures qui reviendraient au même par un détour.
 */
export const CE_QUI_EST_INCLUS = [
	{ libelle: 'Dépôt de factures, sans limite', bilan: true, abonnement: true },
	{ libelle: 'Lecture et classification ligne à ligne', bilan: true, abonnement: true },
	{ libelle: 'Les trois taux EGalim, justifiés', bilan: true, abonnement: true },
	{ libelle: 'Bilan PDF daté et signé', bilan: true, abonnement: true },
	{ libelle: 'Courriers de demande d’attestation', bilan: true, abonnement: true },
	{ libelle: 'Fichier de report pour « ma cantine »', bilan: false, abonnement: true },
	{ libelle: 'Suivi mensuel et rappels', bilan: false, abonnement: true }
] as const;

/**
 * L'essai, en jours.
 *
 * TRENTE, parce que la boucle métier complète — réunir douze mois de factures,
 * les déposer, vider la file de confirmation, lire le bilan — se mesure en
 * semaines. Quatorze jours obligeraient à décider pendant qu'on cherche encore
 * les factures de mars.
 *
 * La règle qui l'accompagne — une seule fois par compte, jamais par
 * établissement — vit dans `billing.ts`, avec le drapeau qui la porte.
 */
export const DUREE_ESSAI_JOURS = 30;
