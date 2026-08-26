import type { Label } from './types';

/**
 * Version du barème, enregistrée sur chaque classification produite.
 *
 * À revérifier contre « ma cantine » AVANT toute production de rapport client,
 * et à incrémenter à chaque évolution réglementaire.
 * Source : docs/agri/business-plan/10-fiche-egalim-1page.md
 */
export const REFERENTIEL_VERSION = '2026-08';

/** Les trois seuils légaux, en fraction de la valeur d'achat HT. */
export const SEUILS = {
	/** ≥ 50 % de durable, sur la totalité des achats alimentaires. */
	durable: 0.5,
	/** ≥ 20 % de bio. */
	bio: 0.2,
	/** ≥ 60 % de durable sur les familles viande et poisson. */
	viandePoissonDurable: 0.6
} as const;

/**
 * Le barème de qualification. `bio: true` implique toujours `durable: true` :
 * un produit bio compte dans les deux ratios.
 */
export const LABELS_QUALIFIANTS: Record<
	Label,
	{ durable: boolean; bio: boolean; libelle: string }
> = {
	AB: { durable: true, bio: true, libelle: 'Agriculture biologique (AB, Eurofeuille)' },
	CONVERSION: { durable: true, bio: true, libelle: 'En conversion vers le bio' },
	LABEL_ROUGE: { durable: true, bio: false, libelle: 'Label Rouge' },
	AOP_AOC_IGP_STG: { durable: true, bio: false, libelle: 'AOP / AOC / IGP / STG' },
	HVE3: { durable: true, bio: false, libelle: 'Haute Valeur Environnementale niveau 3' },
	FERMIER: { durable: true, bio: false, libelle: 'Mention fermier / produit de la ferme' },
	PECHE_DURABLE: { durable: true, bio: false, libelle: 'Pêche durable (MSC, écolabel pêche)' },
	COMMERCE_EQUITABLE: { durable: true, bio: false, libelle: 'Commerce équitable' },
	RUP: { durable: true, bio: false, libelle: 'Régions ultrapériphériques' },
	CYCLE_DE_VIE: { durable: true, bio: false, libelle: 'Acquis selon le coût du cycle de vie' }
};

/**
 * Mentions fréquentes sur les factures qui ne qualifient RIEN au sens de la loi.
 * Le code de la commande publique interdit la préférence géographique directe :
 * « local » n'est pas un critère légal. C'est l'erreur la plus répandue chez les
 * gestionnaires, et la première que le diagnostic corrige.
 */
export const MENTIONS_NON_QUALIFIANTES = [
	'local',
	'circuit court',
	'de saison',
	'fait maison',
	'artisanal',
	'de qualité',
	'traditionnel',
	'régional'
] as const;

/**
 * Faux amis relevés sur de vraies factures : des sigles et mentions qui
 * RESSEMBLENT à un label officiel mais n'en sont pas. Ils sont injectés comme
 * contre-exemples explicites dans le prompt de classification — un modèle non
 * prévenu les qualifie sans hésiter, et ils sont souvent apposés sur les lignes
 * les plus chères de la facture.
 */
export const FAUX_AMIS: ReadonlyArray<{ mention: string; nature: string }> = [
	{ mention: 'VBF / V.B.F.', nature: 'Viande Bovine Française — une origine, pas un label' },
	{ mention: 'VPF / V.P.F.', nature: 'Viande Porcine Française — une origine, pas un label' },
	{ mention: 'plein air', nature: "mode d'élevage des volailles, pas un label EGalim" },
	{ mention: 'Code 0 / 1 / 2 / 3', nature: "code d'élevage des poules pondeuses" },
	{ mention: 'FR, FRANCE, origine France', nature: 'origine géographique' },
	{ mention: 'ATL. N.E, FAO 27', nature: 'zone de pêche, pas un écolabel' },
	{ mention: 'HVE niveau 1, HVE niveau 2', nature: 'seul le niveau 3 qualifie' },
	{ mention: 'sans OGM, sans antibiotique', nature: 'allégation produit, pas un label EGalim' }
];

/** Un produit est bio s'il porte AB ou la mention de conversion. */
export function estBio(labels: readonly Label[]): boolean {
	return labels.some((l) => LABELS_QUALIFIANTS[l].bio);
}

/** Un produit est durable s'il porte au moins un label du barème. */
export function estDurable(labels: readonly Label[]): boolean {
	return labels.some((l) => LABELS_QUALIFIANTS[l].durable);
}

/** Les trois états d'un taux face à son seuil légal. */
export type EtatSeuil = 'atteint' | 'proche' | 'manque';

/**
 * Où se situe un taux par rapport à son seuil.
 *
 * CETTE RÈGLE VIVAIT DANS UN COMPOSANT D'INTERFACE, `TauxEGalim`, alors qu'elle
 * n'a rien de visuel : elle décide de ce qu'on affirme sur la conformité d'un
 * établissement. Trois endroits en ont besoin — l'écran, le PDF du bilan, et
 * l'e-mail qui annonce ce bilan — et trois copies auraient fini par diverger,
 * chacune racontant une conformité différente du même chiffre.
 *
 * LE PALIER DE « PROCHE » EST À CINQ POINTS, et c'est un choix, pas une donnée
 * légale : la loi ne connaît que le franchi et le non franchi. Cinq points, sur
 * un budget de cantine, c'est l'ordre de grandeur de ce qu'un gérant peut
 * rattraper en déplaçant quelques achats. Au-delà, lui dire qu'il y est presque
 * serait une politesse trompeuse.
 */
export function etatDeSeuil(mesure: number, seuil: number): EtatSeuil {
	if (mesure >= seuil) return 'atteint';
	return seuil - mesure <= 0.05 ? 'proche' : 'manque';
}

/**
 * L'ordre sous lequel un produit portant PLUSIEURS mentions est déclaré.
 *
 * La télédéclaration détaillée demande une ventilation par catégorie. Un
 * poulet Label Rouge ET bio ne doit y figurer qu'une fois : le compter dans les
 * deux colonnes ferait un total supérieur aux achats réels, et une déclaration
 * qui ne s'additionne pas est une déclaration qu'on fait refaire.
 *
 * CE CHOIX NE CHANGE AUCUN DES TROIS TAUX. Les seuils portent sur « bio » et
 * sur « durable », qui se calculent par produit et non par catégorie : un
 * produit bio est bio, quelles que soient ses autres mentions. L'ordre ci-
 * dessous ne décide donc que d'une chose — dans quelle ligne du DÉTAIL un
 * produit multi-labels apparaît.
 *
 * Le bio vient en tête parce que c'est la seule catégorie qui porte son propre
 * seuil : l'y voir figurer est ce que le déclarant vérifie en premier. Le reste
 * suit la notoriété de la mention, ce qui rend le détail lisible sans le rendre
 * plus juste.
 */
export const ORDRE_DECLARATION: readonly Label[] = [
	'AB',
	'CONVERSION',
	'LABEL_ROUGE',
	'AOP_AOC_IGP_STG',
	'HVE3',
	'PECHE_DURABLE',
	'FERMIER',
	'COMMERCE_EQUITABLE',
	'RUP',
	'CYCLE_DE_VIE'
];

/**
 * La catégorie sous laquelle déclarer un produit, ou `null` s'il ne qualifie
 * rien. Une seule, toujours — voir `ORDRE_DECLARATION`.
 */
export function categorieDeclaration(labels: readonly Label[]): Label | null {
	for (const candidat of ORDRE_DECLARATION) {
		if (labels.includes(candidat)) return candidat;
	}
	return null;
}
