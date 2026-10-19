/**
 * LA GRILLE TARIFAIRE, ET CE QU'ELLE RECOUVRE. Source unique.
 *
 * Trois lecteurs, et aucun ne recopie un montant : le serveur (`billing.ts`,
 * qui applique les limites, et `paiement/paddle.ts`, qui crée le catalogue
 * Paddle d'après ces montants), l'écran Compte › Abonnement, et la section
 * Tarifs du site. Une grille recopiée à la main finit par annoncer un montant
 * que Paddle ne prélève pas : ça ne casse rien, et ça se découvre par un client
 * qui a raison de râler.
 *
 * ⚠️ REFAITE LE 14/10/2026 (`docs/superpowers/specs/2026-10-14-pricing-abonnements.md`).
 * L'ancienne grille venait d'EGalim : trois paliers par volume de factures
 * DÉCLARÉ (S, M, L), 190 à 390 € par mois et un premier bilan à 690 €. Elle
 * coûtait plus qu'un outil de PME pour un produit qui vise d'abord les TPE,
 * n'avait rien pour les micro-entreprises, et faisait déclarer un volume qu'on
 * pouvait corriger pour payer moins. Désormais :
 *
 *   · DÉCOUVERTE, gratuite : on voit ce qu'on vous doit, rien ne part ;
 *   · trois FORMULES qu'on choisit (Solo, Équipe, Pro), au mois ou à l'année ;
 *   · l'année payée en une fois vaut DIX mois ;
 *   · trente jours d'essai, la carte enregistrée chez Paddle, 0 € le premier jour.
 *
 * Module PUR : ni Convex ni React. Il se lit des deux côtés du réseau.
 *
 * LES MONTANTS SONT HORS TAXES. Paddle, vendeur de registre, ajoute la TVA du
 * pays du client (`tax_mode: external`).
 */

export const FORMULES = ['solo', 'equipe', 'pro'] as const;
export type Formule = (typeof FORMULES)[number];

/** L'annuel d'abord : c'est le rythme que la bascule montre par défaut. */
export const RYTHMES = ['annuel', 'mensuel'] as const;
export type Rythme = (typeof RYTHMES)[number];

/** Ce que la grille sait de chaque formule. */
export interface FormuleDeLaGrille {
	readonly nom: string;
	/** Pour qui, en cinq mots au plus : c'est ce qui fait choisir. */
	readonly pour: string;
	/** En euros hors taxes. */
	readonly mensuel: number;
	/** En euros hors taxes, payé en une fois : dix mois. */
	readonly annuel: number;
}

export const GRILLE: Readonly<Record<Formule, FormuleDeLaGrille>> = {
	solo: {
		nom: 'Solo',
		pour: 'Indépendants et micro-entreprises',
		mensuel: 12,
		annuel: 120
	},
	equipe: {
		nom: 'Équipe',
		pour: 'TPE, jusqu’à dix personnes',
		mensuel: 59,
		annuel: 590
	},
	pro: {
		nom: 'Pro',
		pour: 'PME',
		mensuel: 149,
		annuel: 1490
	}
};

/**
 * LA VERSION DE LA GRILLE, PORTÉE PAR L'ÉTIQUETTE DE CHAQUE PRIX PADDLE.
 *
 * ⚠️ UN PRIX PADDLE NE SE CORRIGE PAS. Le 19/10/2026, Équipe passe de 39 à 59 € et
 * Pro de 119 à 149 € (audit stratégique du 18/10, adopté par le fondateur). Sans
 * version, le catalogue retrouvait l'ancien prix sous la même étiquette, le
 * signalait en écart et n'en créait aucun : le site aurait affiché 59 € pendant que
 * Paddle prélevait 39 €. Avec elle, les nouveaux prix naissent à côté des anciens,
 * qui restent en base pour les abonnés qui les paient (`prixPaddle` n'est jamais vidé).
 *
 * Changer un montant de `GRILLE`, c'est changer cette version.
 */
export const VERSION_GRILLE = 'g2';

/** La formule mise en avant sur le site et proposée par défaut. */
export const FORMULE_RECOMMANDEE: Formule = 'equipe';

/** Ce que l'année fait gagner, en mois : « 2 mois offerts ». */
export function moisOfferts(formule: Formule): number {
	const { mensuel, annuel } = GRILLE[formule];
	return Math.round((mensuel * 12 - annuel) / mensuel);
}

/*
 * ⚠️ PAS DE PRIX ANNUEL RAMENÉ AU MOIS (le fondateur, 14/10/2026 : « je ne veux pas
 * de chiffre à virgule pour le pricing annuel »). L'année à dix mois tombait sur
 * des centimes une fois divisée par douze (32,50 €, 99,17 €). À l'année, on montre
 * le prix de l'année, rond, et ses mois offerts.
 */

/** Le montant prélevé à chaque échéance, en euros HT. */
export function montantDuRythme(formule: Formule, rythme: Rythme): number {
	return rythme === 'annuel' ? GRILLE[formule].annuel : GRILLE[formule].mensuel;
}

// ── Les limites ────────────────────────────────────────────────────────────

/** Ce qui s'applique : Découverte (rien de souscrit) ou une formule. */
export type Palier = 'decouverte' | Formule;

export interface Limites {
	/**
	 * Les relances, les courriers et la lettre officielle partent. Découverte
	 * mesure, elle n'agit pas.
	 */
	readonly agir: boolean;
	/**
	 * Les clients en retard que le pilote relance en même temps. `null` :
	 * sans limite. Au-delà, le client suivant est MESURÉ et ses relances
	 * attendent : rien ne se perd, rien ne bloque la lecture.
	 */
	readonly clientsSuivis: number | null;
	/** Les personnes qui ont accès à l'établissement, le gérant compris. */
	readonly utilisateurs: number;
	/** Les analyses de santé client par mois, relecture mensuelle comprise. */
	readonly analysesParMois: number;
	/** Les logiciels qui se branchent : une liste, ou tous. */
	readonly logiciels: 'tous' | readonly LogicielOuvert[];
	/**
	 * Les mois d'historique que les CHIFFRES de l'établissement couvrent (19/10/2026,
	 * audit : Découverte devient le diagnostic express). `null` : tout. Le reste est
	 * gardé et COMPTÉ (« N factures plus anciennes »), et la surveillance de la
	 * prescription ne se borne jamais : une limite arrête ce que Découverte CALCULE,
	 * jamais ce qu'elle SURVEILLE.
	 */
	readonly historiqueMois: number | null;
}

/** Les logiciels qu'une liste peut ouvrir, par leur lecteur (`socle/connecteurs`). */
export type LogicielOuvert = 'qonto' | 'pennylane';

/** Ce palier ouvre-t-il ce logiciel ? `fournisseur` : celui du lecteur (« pennylane », « xero »…). */
export function logicielOuvert(limites: Pick<Limites, 'logiciels'>, fournisseur: string): boolean {
	return (
		limites.logiciels === 'tous' || (limites.logiciels as readonly string[]).includes(fournisseur)
	);
}

/**
 * La date d'où partent les chiffres : aujourd'hui moins N mois du calendrier, au
 * dernier jour du mois quand le jour manque (le 31 mai moins trois mois donne le
 * 28 février). `null` : aucun plancher.
 */
export function plancherDHistorique(mois: number | null, aujourdHui: string): string | null {
	if (mois === null) return null;
	const [a, m, j] = aujourdHui.split('-').map(Number);
	const annee = a ?? 1970;
	const rang = (m ?? 1) - 1 - mois;
	const dernierJour = new Date(Date.UTC(annee, rang + 1, 0)).getUTCDate();
	return new Date(Date.UTC(annee, rang, Math.min(j ?? 1, dernierJour))).toISOString().slice(0, 10);
}

export const LIMITES: Readonly<Record<Palier, Limites>> = {
	decouverte: {
		agir: false,
		clientsSuivis: 0,
		utilisateurs: 1,
		analysesParMois: 1,
		logiciels: ['qonto', 'pennylane'],
		historiqueMois: 3
	},
	solo: {
		agir: true,
		clientsSuivis: 10,
		utilisateurs: 1,
		analysesParMois: 10,
		logiciels: ['qonto', 'pennylane'],
		historiqueMois: null
	},
	equipe: {
		agir: true,
		clientsSuivis: 50,
		utilisateurs: 3,
		analysesParMois: 50,
		logiciels: 'tous',
		historiqueMois: null
	},
	pro: {
		agir: true,
		clientsSuivis: null,
		utilisateurs: 10,
		analysesParMois: 300,
		logiciels: 'tous',
		historiqueMois: null
	}
};

/**
 * Le palier EFFECTIF d'un établissement (`resolveEffectivePlan`, `billing.ts`) :
 * `none` pour Découverte, une formule, ou `dev` quand tout est ouvert (pas de
 * clé, facturation fermée, plan posé à la main).
 */
export type PlanTier = 'none' | Formule | 'dev';

/** Les limites d'un palier effectif. `dev` n'en a aucune. */
export function limitesDe(tier: PlanTier): Limites {
	if (tier === 'dev') {
		return {
			agir: true,
			clientsSuivis: null,
			utilisateurs: 9999,
			analysesParMois: 300,
			logiciels: 'tous',
			historiqueMois: null
		};
	}
	return LIMITES[tier === 'none' ? 'decouverte' : tier];
}

/**
 * Ce que chaque formule recouvre, ligne à ligne, pour l'afficher sans faire
 * deviner. Une valeur par formule : `true` (inclus), `false` (absent) ou le
 * texte de la limite. Écrite UNE fois : le site et l'écran d'abonnement la
 * traversent tous deux.
 *
 * AUCUNE LIGNE NE PROMET UN RÉSULTAT. Le mot « garantie » est proscrit dans
 * tout le produit, et un test balaie l'interface pour le vérifier.
 */
export const CE_QUI_EST_INCLUS: readonly {
	readonly libelle: string;
	readonly valeurs: Readonly<Record<Palier, boolean | string>>;
}[] = [
	{
		libelle: 'Vos factures lues, ce qu’on vous doit, pénalités et frais de recouvrement compris',
		valeurs: { decouverte: '3 derniers mois', solo: true, equipe: true, pro: true }
	},
	{
		libelle: 'Relances automatiques et lettre officielle, à votre nom',
		valeurs: { decouverte: false, solo: true, equipe: true, pro: true }
	},
	{
		libelle: 'Clients en retard suivis en même temps',
		valeurs: {
			decouverte: false,
			solo: libelleDeLimite(LIMITES.solo.clientsSuivis),
			equipe: libelleDeLimite(LIMITES.equipe.clientsSuivis),
			pro: libelleDeLimite(LIMITES.pro.clientsSuivis)
		}
	},
	{
		libelle: 'Utilisateurs',
		valeurs: {
			decouverte: '1',
			solo: String(LIMITES.solo.utilisateurs),
			equipe: String(LIMITES.equipe.utilisateurs),
			pro: String(LIMITES.pro.utilisateurs)
		}
	},
	{
		libelle: 'Santé de vos clients, analyses par mois',
		valeurs: {
			decouverte: String(LIMITES.decouverte.analysesParMois),
			solo: String(LIMITES.solo.analysesParMois),
			equipe: String(LIMITES.equipe.analysesParMois),
			pro: String(LIMITES.pro.analysesParMois)
		}
	},
	{
		libelle: 'Vos logiciels branchés (Pennylane, QuickBooks…)',
		valeurs: {
			decouverte: 'Qonto, Pennylane',
			solo: 'Qonto, Pennylane',
			equipe: true,
			pro: true
		}
	}
];

function libelleDeLimite(limite: number | null): string {
	return limite === null ? 'Sans limite' : String(limite);
}

/**
 * La formule à proposer d'abord, d'après ce que le registre dit de
 * l'entreprise. Une entreprise individuelle se voit proposer Solo ; toute
 * autre, Équipe. C'est une RECOMMANDATION qui se change d'un toucher : rien
 * n'est souscrit sans que le gérant l'ait choisi.
 */
export function formuleRecommandee(formeJuridique: string | undefined): Formule {
	if (
		formeJuridique !== undefined &&
		/individuel|\bEI\b|micro|auto-?entrepr/i.test(formeJuridique)
	) {
		return 'solo';
	}
	return FORMULE_RECOMMANDEE;
}

// ── L'essai et les rappels ─────────────────────────────────────────────────

/**
 * L'essai, en jours. TRENTE, parce que le plan de relance met vingt-trois jours
 * à aller du premier rappel à la lettre officielle (`plan-relance.ts`) : un
 * essai plus court se terminerait avant que le gérant ait vu un virement
 * rentrer. La carte est enregistrée chez Paddle au premier jour, rien n'est
 * prélevé avant la fin.
 */
export const DUREE_ESSAI_JOURS = 30;

/** Les jours avant le premier prélèvement où le gérant est prévenu. */
export const RAPPELS_AVANT_PRELEVEMENT_JOURS = [7, 2] as const;

/** Les jours avant un renouvellement annuel où le gérant est prévenu. */
export const RAPPEL_RENOUVELLEMENT_JOURS = 30;

/**
 * Le remboursement intégral d'un paiement, sur demande, dans les jours qui le
 * suivent. TRENTE, ratifiés par le fondateur le 14/10/2026 : ce que Paddle
 * recommande, et plus que les quatorze que ses conditions lui permettent
 * d'appliquer seul. Écrit aussi dans deux textes publiés (`05-remboursement.md`
 * et l'article 8.2 des conditions générales) : le changer, c'est changer les trois.
 */
export const JOURS_DE_REMBOURSEMENT = 30;

// ── Les offres hors abonnement ─────────────────────────────────────────────

/**
 * LES OFFRES QUI NE SONT PAS DES FORMULES (audit stratégique du 18/10/2026, § 2).
 *
 * ⚠️ JAMAIS DANS `GRILLE` NI DANS LE CATALOGUE PADDLE. Le catalogue crée trois
 * produits de quatre prix d'abonnement ; ces offres-là se vendent SUR DEMANDE (devis
 * et facture du fondateur) tant que Paddle n'a pas approuvé des services ponctuels
 * (son règlement d'usage exclut les prestations humaines sans lien avec un logiciel ;
 * `docs/superpowers/specs/2026-10-19-trajectoire-de-l-audit.md`, décision 3). L'offre
 * fondateurs, elle, est un abonnement : elle passera par Paddle avec son propre prix.
 *
 * Montants en centimes, hors taxes.
 */
export const OFFRES = {
	diagnosticComplet: {
		nom: 'Diagnostic complet',
		/** 290 € HT. */
		prixCentimes: 29_000,
		/** Remboursé si moins de 2 900 € sont identifiés. */
		rembourseSousCentimes: 290_000,
		/** Après un diagnostic : 20 % sur les trois premiers mois d'abonnement. */
		remiseBienvenuePourcent: 20,
		remiseBienvenueMois: 3
	},
	reclamation: {
		nom: 'Réclamation clé en main',
		/** 5 % du montant calculé, borné entre 290 € et 2 000 €, payé d'avance. */
		pourcent: 5,
		minimumCentimes: 29_000,
		maximumCentimes: 200_000
	},
	pilote: {
		nom: 'Pilote accompagné',
		/** 2 500 € HT sur 90 jours, la formule Pro comprise pendant le pilote. */
		prixCentimes: 250_000,
		dureeJours: 90
	},
	fondateurs: {
		nom: 'Offre fondateurs',
		formule: 'pro' as Formule,
		rythme: 'annuel' as Rythme,
		/** Le prix bloqué à vie : celui de Pro à l'année. */
		prixCentimes: 149_000,
		places: 50,
		/** Dernier jour, heure de Paris. */
		jusquAu: '2026-12-31'
	}
} as const;

/** Les jours pendant lesquels l'offre de bienvenue reste valable après un diagnostic. */
export const JOURS_OFFRE_DE_BIENVENUE = 14;

/**
 * Le prix d'une réclamation clé en main : 5 % du montant calculé, jamais moins de
 * 290 €, jamais plus de 2 000 €. En centimes entiers, arrondi au centime le plus proche.
 */
export function prixDeLaReclamation(montantCalculeCentimes: bigint): bigint {
	const { pourcent, minimumCentimes, maximumCentimes } = OFFRES.reclamation;
	const brut = (montantCalculeCentimes * BigInt(pourcent) + 50n) / 100n;
	const min = BigInt(minimumCentimes);
	const max = BigInt(maximumCentimes);
	return brut < min ? min : brut > max ? max : brut;
}
