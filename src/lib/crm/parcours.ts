import type { Cible } from './statuts';

/**
 * LES PARCOURS DE PROSPECTION (19/10/2026, audit stratégique du 18/10, § 2).
 *
 * Cinq façons d'acheter Letikette, et chacune a ses étapes : on ne vend pas une
 * réclamation à un fournisseur d'hôpital comme on vend un abonnement à une agence.
 * Le STATUT reste commun (contacté, a répondu, perdu, « Stop ») : il porte
 * l'opposition et l'entonnoir global. L'ÉTAPE dit où en est la vente de CE parcours.
 *
 * L'ordre des étapes est leur rang : l'entonnoir d'un parcours compte ce qui a
 * atteint AU MOINS chaque étape, comme celui de la prospection.
 */

export const PARCOURS = [
	'FOURNISSEUR_PUBLIC',
	'TRANSPORTEUR',
	'EXPERT_COMPTABLE',
	'PME_LOGICIEL',
	'PILOTE'
] as const;
export type Parcours = (typeof PARCOURS)[number];

export interface EtapeDeParcours {
	readonly cle: string;
	readonly libelle: string;
}

export interface DefinitionDuParcours {
	readonly libelle: string;
	/** Ce qui se vend au bout. */
	readonly offre: string;
	/** Le premier geste : l'appel, ou l'e-mail quand il est permis. */
	readonly telephoneDAbord: boolean;
	/** D'où viennent ses prospects. */
	readonly source: 'DECP' | 'ANNUAIRE' | 'MAIN';
	readonly etapes: readonly EtapeDeParcours[];
}

export const REGISTRE_DES_PARCOURS: Readonly<Record<Parcours, DefinitionDuParcours>> = {
	FOURNISSEUR_PUBLIC: {
		libelle: 'Fournisseurs publics',
		offre: 'Réclamation clé en main',
		telephoneDAbord: true,
		source: 'DECP',
		etapes: [
			{ cle: 'ESTIME', libelle: 'Estimé' },
			{ cle: 'APPELE', libelle: 'Appelé' },
			{ cle: 'PIECES', libelle: 'Pièces demandées' },
			{ cle: 'DEVIS', libelle: 'Devis envoyé' },
			{ cle: 'PAYE', libelle: 'Payé' },
			{ cle: 'REMIS', libelle: 'Courriers remis' }
		]
	},
	TRANSPORTEUR: {
		libelle: 'Transporteurs',
		offre: 'Réclamation ou abonnement',
		telephoneDAbord: true,
		source: 'ANNUAIRE',
		etapes: [
			{ cle: 'A_APPELER', libelle: 'À appeler' },
			{ cle: 'APPELE', libelle: 'Appelé' },
			{ cle: 'FACTURES', libelle: 'Factures reçues' },
			{ cle: 'CALCUL', libelle: 'Calcul montré' },
			{ cle: 'GAGNE', libelle: 'Gagné' }
		]
	},
	EXPERT_COMPTABLE: {
		libelle: 'Experts-comptables',
		offre: 'Partenariat, 20 % de la première année',
		telephoneDAbord: true,
		source: 'ANNUAIRE',
		etapes: [
			{ cle: 'A_APPELER', libelle: 'À appeler' },
			{ cle: 'APPELE', libelle: 'Appelé' },
			{ cle: 'DEMO', libelle: 'Démonstration faite' },
			{ cle: 'CONVENTION', libelle: 'Convention signée' },
			{ cle: 'PREMIER_CLIENT', libelle: 'Premier client apporté' }
		]
	},
	PME_LOGICIEL: {
		libelle: 'PME logiciel',
		offre: 'Abonnement, offre fondateurs',
		telephoneDAbord: false,
		source: 'ANNUAIRE',
		etapes: [
			{ cle: 'A_CONTACTER', libelle: 'À contacter' },
			{ cle: 'CONTACTE', libelle: 'Contacté' },
			{ cle: 'DIAGNOSTIC', libelle: 'Diagnostic lancé' },
			{ cle: 'ESSAI', libelle: 'À l’essai' },
			{ cle: 'ABONNE', libelle: 'Abonné' }
		]
	},
	PILOTE: {
		libelle: 'Pilotes',
		offre: 'Pilote accompagné, 90 jours',
		telephoneDAbord: true,
		source: 'MAIN',
		etapes: [
			{ cle: 'QUALIFIE', libelle: 'Qualifié' },
			{ cle: 'RDV', libelle: 'Rendez-vous' },
			{ cle: 'PROPOSITION', libelle: 'Proposition envoyée' },
			{ cle: 'SIGNE', libelle: 'Signé' },
			{ cle: 'BILAN', libelle: 'Bilan à 90 jours' }
		]
	}
};

export function estParcours(valeur: unknown): valeur is Parcours {
	return typeof valeur === 'string' && (PARCOURS as readonly string[]).includes(valeur);
}

/**
 * Le parcours d'un prospect qui n'en a pas : un cabinet est un partenaire, un
 * transporteur (49.41) un transporteur, le reste une PME logiciel. Jamais un
 * fournisseur public ni un pilote par défaut : ceux-là se décident.
 */
export function parcoursParDefaut(cible: Cible, activite?: string): Parcours {
	if (cible === 'CABINET') return 'EXPERT_COMPTABLE';
	if (/\b49\.41/.test(activite ?? '')) return 'TRANSPORTEUR';
	return 'PME_LOGICIEL';
}

/** Le parcours d'un prospect, lu ou déduit (les prospects d'avant le 19/10 n'en ont pas). */
export function parcoursDe(p: {
	readonly parcours?: Parcours;
	readonly cible: Cible;
	readonly activite?: string;
}): Parcours {
	return p.parcours ?? parcoursParDefaut(p.cible, p.activite);
}

export function etapeInitiale(parcours: Parcours): string {
	return REGISTRE_DES_PARCOURS[parcours].etapes[0]!.cle;
}

export function etapeValide(parcours: Parcours, cle: string): boolean {
	return REGISTRE_DES_PARCOURS[parcours].etapes.some((e) => e.cle === cle);
}

/** Le rang d'une étape dans son parcours ; une étape inconnue compte comme la première. */
export function rangDeLEtape(parcours: Parcours, cle: string | undefined): number {
	const rang = REGISTRE_DES_PARCOURS[parcours].etapes.findIndex((e) => e.cle === cle);
	return rang < 0 ? 0 : rang;
}

export function libelleDeLEtape(parcours: Parcours, cle: string | undefined): string {
	const etapes = REGISTRE_DES_PARCOURS[parcours].etapes;
	return (etapes.find((e) => e.cle === cle) ?? etapes[0]!).libelle;
}

/** Combien de prospects ont atteint AU MOINS chaque étape du parcours. */
export function atteintsParEtape(
	parcours: Parcours,
	etapes: readonly (string | undefined)[]
): { cle: string; libelle: string; nombre: number }[] {
	const rangs = etapes.map((e) => rangDeLEtape(parcours, e));
	return REGISTRE_DES_PARCOURS[parcours].etapes.map((etape, i) => ({
		cle: etape.cle,
		libelle: etape.libelle,
		nombre: rangs.filter((r) => r >= i).length
	}));
}
