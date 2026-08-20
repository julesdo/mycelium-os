/**
 * Le vocabulaire EGalim, en français lisible par un gérant.
 *
 * Le backend manipule des constantes (`AOP_AOC_IGP_STG`, `VIANDE_POISSON`).
 * Elles ne doivent jamais atteindre l'écran telles quelles : un gérant de
 * cantine ne lit pas des identifiants, et une capture d'écran de son taux peut
 * finir devant un contrôleur.
 */

/** Les mentions qui comptent au barème, et ce qu'elles rapportent. */
export const LABELS: Record<string, { nom: string; compteBio: boolean }> = {
	AB: { nom: 'Bio (AB)', compteBio: true },
	CONVERSION: { nom: 'Bio en conversion', compteBio: true },
	LABEL_ROUGE: { nom: 'Label Rouge', compteBio: false },
	AOP_AOC_IGP_STG: { nom: 'AOP, AOC, IGP ou STG', compteBio: false },
	HVE3: { nom: 'HVE niveau 3', compteBio: false },
	FERMIER: { nom: 'Fermier', compteBio: false },
	PECHE_DURABLE: { nom: 'Pêche durable', compteBio: false },
	COMMERCE_EQUITABLE: { nom: 'Commerce équitable', compteBio: false },
	RUP: { nom: 'Région ultrapériphérique', compteBio: false },
	CYCLE_DE_VIE: { nom: 'Coût du cycle de vie', compteBio: false }
};

/** L'ordre d'affichage : le bio d'abord, c'est le seuil le plus dur à tenir. */
export const LABELS_ORDONNES = [
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

/** Pourquoi ce libellé demande une confirmation. Dit au gérant, pas au dévelopeur. */
export const MOTIFS: Record<string, { court: string; explication: string }> = {
	NON_CLASSE: {
		court: 'Non classé',
		explication:
			"Nous n'avons pas su classer ce produit. Sans votre réponse, il ne compte dans aucun taux."
	},
	VIANDE_POISSON: {
		court: 'Viande ou poisson',
		explication:
			'La viande et le poisson passent toujours devant vous, quelle que soit notre confiance : c’est là que se joue le seuil de 60 %.'
	},
	REGULARISATION: {
		court: 'Remise ou avoir',
		explication:
			'Cette ligne corrige un montant. Si elle porte sur de l’alimentaire, elle change le dénominateur de vos trois taux.'
	},
	CONFIANCE_BASSE: {
		court: 'Doute',
		explication: 'Notre classification est incertaine. Un mot de vous la rend défendable.'
	}
};
