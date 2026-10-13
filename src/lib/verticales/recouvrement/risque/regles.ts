/**
 * LES RÈGLES DE L'INDICE DE SANTÉ — chaque seuil et chaque poids, nommés.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE NE SONT PAS DES VALEURS JURIDIQUES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aucune ne sort d'un texte et aucune n'entre dans un montant réclamé : ce sont
 * des paramètres de LECTURE, comme ceux de `comportement.ts`. Ils n'ont donc rien
 * à faire dans `parametres.ts`, qui n'accueille que ce qui se source sur
 * Légifrance. Ils sont écrits ici, un par un, pour être déplacés quand on aura
 * des données réelles, et la page « Comment c'est calculé » les redit au gérant.
 *
 * ⚠️ L'INDICE SE DÉCOMPOSE TOUJOURS. Il part de `INDICE_DE_DEPART` et chaque fait
 * l'ajoute ou le retire : un indice qu'on ne peut pas refaire à la main est un
 * chiffre qu'on demande de croire, et le produit n'en publie aucun.
 *
 * ⚠️ ET IL NE DIT PAS SI CE CLIENT PAIERA. Il résume des faits ; la décision de
 * livrer, de demander un acompte ou de fixer un plafond reste au gérant.
 */

/** La version des règles : une analyse garde celle qui l'a calculée. */
export const VERSION_DES_REGLES = 1;

/** Ne rien savoir, c'est « à surveiller » : le doute ne profite jamais au produit. */
export const INDICE_DE_DEPART = 50;

/** Les bornes des niveaux, bas compris. */
export const SEUIL_RIEN_A_SIGNALER = 70;
export const SEUIL_A_SURVEILLER = 50;
export const SEUIL_PRUDENCE = 30;

/** Une procédure collective en cours : l'indice ne monte pas au-dessus. */
export const PLAFOND_EN_PROCEDURE = 10;

/** Le poids qu'un effet donne à un fait, d'après sa valeur absolue. */
export const POIDS_FORT_DES = 12;
export const POIDS_MOYEN_DES = 6;

// ── LE REGISTRE ──────────────────────────────────────────────────────────

/** L'ancienneté, en mois : une jeune entreprise n'a pas encore d'histoire. */
export const ANCIENNETE = {
	moinsDUnAn: -10,
	unATroisAns: -5,
	troisADixAns: 3,
	plusDeDixAns: 8
} as const;

/** Une procédure terminée, selon qu'elle date de moins ou de plus de cinq ans. */
export const PROCEDURE_TERMINEE = { recente: -15, ancienne: -6, anneesRecente: 5 } as const;

/** L'effet affiché d'une procédure en cours, avant que l'indice ne soit plafonné. */
export const PROCEDURE_EN_COURS = -40;

// ── LES FINANCES (le dernier exercice publié, s'il a moins de trois ans) ──

/** Au-delà, les comptes ne disent plus la situation d'aujourd'hui. */
export const AGE_MAXIMAL_DES_COMPTES_MOIS = 36;

export const RESULTAT = { perte: -10, benefice: 6, deuxiemePerte: -6 } as const;

/** Capitaux propres sous la moitié du capital, au registre. */
export const ACTIF_NET_SOUS_MOITIE = -15;

/** L'autonomie financière (capitaux propres sur total du bilan), en %. */
export const AUTONOMIE = {
	negative: -12,
	faibleSous: 10,
	faible: -5,
	solideDes: 40,
	solide: 5
} as const;

/** La liquidité générale (actif court terme sur dettes court terme). */
export const LIQUIDITE = { sous: 1, faible: -6, confortableDes: 1.5, confortable: 4 } as const;

/** Une trésorerie négative : les découverts dépassent les disponibilités. */
export const TRESORERIE_NEGATIVE = -6;

/**
 * LE DÉLAI AUQUEL IL PAIE SES PROPRES FOURNISSEURS, en jours, tel que ses comptes
 * le donnent. C'est le chiffre public le plus proche de la question du gérant.
 */
export const DELAI_FOURNISSEURS = {
	longDes: 90,
	long: -8,
	etireDes: 60,
	etire: -4,
	courtJusqua: 45,
	court: 3
} as const;

/** La variation du chiffre d'affaires sur un an, en %. */
export const CROISSANCE = { chuteJusqua: -20, chute: -6, hausseDes: 10, hausse: 3 } as const;

// ── LA TRANSPARENCE ──────────────────────────────────────────────────────

/** Des comptes clos il y a moins de dix-huit mois sont « à jour ». */
export const COMPTES_A_JOUR_MOIS = 18;
/** Au-delà de deux ans sans comptes déposés, c'est un fait. */
export const COMPTES_EN_RETARD_MOIS = 24;
export const COMPTES = { aJour: 4, enRetard: -8, jamais: -8 } as const;

// ── LES DIRIGEANTS ───────────────────────────────────────────────────────

/** La fenêtre dans laquelle on lit le passé d'un dirigeant. */
export const FENETRE_DIRIGEANTS_ANNEES = 10;

/** Ce que pèsent les procédures collectives des autres sociétés d'un dirigeant. */
export const PROCEDURES_DES_DIRIGEANTS = {
	une: -6,
	deux: -12,
	troisOuPlus: -18,
	plafond: -24
} as const;

/**
 * DES SOCIÉTÉS OUVERTES PUIS FERMÉES EN MOINS DE DEUX ANS. À partir de trois, sur
 * la fenêtre, c'est une rotation qui se voit.
 */
export const SOCIETES_BREVES = { dureeMois: 24, aPartirDe: 3, effet: -6 } as const;

/** Beaucoup de sociétés en activité : la règle ne juge pas, elle signale. */
export const MANDATS = {
	nombreuxDes: 10,
	nombreux: -3,
	tresNombreuxDes: 25,
	tresNombreux: -6
} as const;

/** Un dirigeant arrivé depuis moins de six mois. */
export const NOUVEAU_DIRIGEANT = { mois: 6, effet: -2 } as const;

/** Au plus tant de dirigeants lus par analyse : chacun coûte une recherche. */
export const DIRIGEANTS_LUS = 4;

// ── VOS PAIEMENTS (votre historique avec lui) ────────────────────────────

/** Le délai habituel, en jours après l'échéance (la médiane de `comportement.ts`). */
export const HABITUDE = [
	{ jusqua: 5, effet: 10 },
	{ jusqua: 15, effet: 3 },
	{ jusqua: 30, effet: -4 },
	{ jusqua: 60, effet: -10 },
	{ jusqua: Number.POSITIVE_INFINITY, effet: -15 }
] as const;

/** La plus vieille facture en retard chez vous, en jours. */
export const RETARD_EN_COURS = { longDes: 90, long: -8, installeDes: 60, installe: -4 } as const;

// ── LE COÛT ──────────────────────────────────────────────────────────────

/** Au plus une analyse par heure et par entreprise, sauf la relecture mensuelle. */
export const INTERVALLE_MINIMAL_MS = 60 * 60 * 1000;
/** La relecture mensuelle des clients qui vous doivent de l'argent. */
export const AGE_AVANT_RELECTURE_MS = 30 * 24 * 60 * 60 * 1000;
/** Au plus tant d'analyses par établissement et par mois. */
export const ANALYSES_PAR_MOIS = 300;
/** Une baisse qui mérite d'être dite, en points d'indice. */
export const BAISSE_SIGNALEE = 10;
