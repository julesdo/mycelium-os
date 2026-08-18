/** Familles de produits alimentaires, au sens du diagnostic EGalim. */
export const FAMILLES = [
	'VIANDE',
	'POISSON',
	'FRUITS_LEGUMES',
	'LAITIERS',
	'EPICERIE_SECHE',
	'EPICERIE_APPERTISEE',
	'BOISSONS',
	'AUTRE'
] as const;
export type Famille = (typeof FAMILLES)[number];

/** Les familles qui portent le seuil des 60 % de durable. */
export const FAMILLES_VIANDE_POISSON: readonly Famille[] = ['VIANDE', 'POISSON'];

/** Labels reconnus par le barème EGalim. */
export const LABELS = [
	'AB',
	'CONVERSION',
	'LABEL_ROUGE',
	'AOP_AOC_IGP_STG',
	'HVE3',
	'FERMIER',
	'PECHE_DURABLE',
	'COMMERCE_EQUITABLE',
	'RUP',
	'CYCLE_DE_VIE'
] as const;
export type Label = (typeof LABELS)[number];

export type ProofStatus = 'PROVEN' | 'TO_JUSTIFY' | 'NONE';
export type ReviewStatus = 'AUTO' | 'PENDING_REVIEW' | 'CONFIRMED' | 'CORRECTED';
