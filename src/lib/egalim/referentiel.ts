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
