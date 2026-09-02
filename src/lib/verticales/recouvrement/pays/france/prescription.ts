import { ajouterMois } from '../../calendrier';
import { joursEntre } from '../../decompte';

/**
 * La prescription des créances, secteur par secteur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE N'EST PAS UN SEUL CHIFFRE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le brief demandait « le délai de prescription commerciale », au singulier.
 * L'article L110-4 du code de commerce pose bien cinq ans entre commerçants —
 * mais il réserve dans la même phrase les créances « soumises à des
 * prescriptions spéciales plus courtes », et il énumère lui-même trois cas à
 * un an. D'autres textes en ajoutent : un an pour le transport de marchandises
 * (L133-6 du code de commerce), deux ans pour ce qu'un professionnel fournit à
 * un consommateur (L218-2 du code de la consommation).
 *
 * Un transporteur à qui l'on annoncerait cinq ans perdrait sa créance quatre
 * ans avant de s'en apercevoir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SENS DE L'ERREUR N'EST PAS SYMÉTRIQUE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * C'est ce qui commande le traitement du secteur INDÉTERMINÉ. Face à
 * l'inconnu, ce module retient **le délai le plus court connu**, pas le régime
 * général, et le déclare comme une hypothèse.
 *
 *   · Annoncer cinq ans à quelqu'un qui en a un : la créance s'éteint en
 *     silence, sans que personne n'ait rien fait. Irréversible.
 *   · Annoncer un an à quelqu'un qui en a cinq : il agit trop tôt. Ça ne coûte
 *     rien.
 *
 * C'est le même raisonnement que la détection de doublons d'EGalim : on se
 * trompe du côté qui se voit et se répare.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE CE MODULE NE FAIT PAS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Il ne détermine pas le POINT DE DÉPART. Celui-ci varie — jour où le créancier
 * a connu ou aurait dû connaître les faits, remise de la marchandise,
 * acceptation de l'ouvrage — et relève de l'appréciation des faits, pas du
 * calcul. Il est donc fourni en argument, et le régime documente lequel
 * s'applique pour que l'utilisateur sache quelle date lui est demandée.
 *
 * Il ne gère ni suspension ni interruption. Une mise en demeure, une
 * reconnaissance de dette ou une action en justice les provoquent, avec des
 * effets différents. Les traiter demanderait des règles qui n'ont pas été
 * fournies.
 *
 * Sources relevées le 2026-09-03 sur legifrance.gouv.fr. Relevé par le
 * logiciel, pas validé par un avocat — voir `parametres.ts`.
 */

export type SecteurCreance =
	| 'GENERAL'
	| 'TRANSPORT_MARCHANDISES'
	| 'CONSOMMATEUR'
	| 'NOURRITURE_MARINS'
	| 'FOURNITURE_NAVIRE'
	| 'OUVRAGE_ACCEPTE'
	| 'INDETERMINE';

export interface RegimePrescription {
	readonly dureeAnnees: number;
	readonly source: string;
	/** La date que l'utilisateur doit fournir, en clair. */
	readonly pointDeDepart: string;
	/** `true` quand le régime est une hypothèse conservatrice, pas un constat. */
	readonly hypothese: boolean;
	readonly note: string;
}

export const REGIMES_PRESCRIPTION: Record<
	Exclude<SecteurCreance, 'INDETERMINE'>,
	RegimePrescription
> = {
	GENERAL: {
		dureeAnnees: 5,
		source: 'Article L110-4 du code de commerce',
		pointDeDepart:
			'Le jour où le créancier a connu ou aurait dû connaître les faits lui permettant d’agir.',
		hypothese: false,
		note:
			'Régime général des obligations nées à l’occasion de leur commerce, entre commerçants ' +
			'ou entre commerçants et non-commerçants. S’efface devant toute prescription spéciale ' +
			'plus courte.'
	},
	TRANSPORT_MARCHANDISES: {
		dureeAnnees: 1,
		source: 'Article L133-6 du code de commerce',
		pointDeDepart:
			'Le jour où la marchandise a été remise ou offerte au destinataire ; en cas de perte ' +
			'totale, le jour où la remise aurait dû être effectuée.',
		hypothese: false,
		note:
			'Vise TOUTES les actions nées du contrat de transport, pas seulement celles pour ' +
			'avaries, pertes ou retards — donc aussi l’action en paiement du prix.'
	},
	CONSOMMATEUR: {
		dureeAnnees: 2,
		source: 'Article L218-2 du code de la consommation',
		pointDeDepart: 'Selon le droit commun, la fourniture du bien ou du service.',
		hypothese: false,
		note:
			'Action d’un professionnel pour les biens ou services fournis à un consommateur. ' +
			'L’article L218-1 interdit d’en modifier la durée, même d’un commun accord.'
	},
	NOURRITURE_MARINS: {
		dureeAnnees: 1,
		source: 'Article L110-4 du code de commerce',
		pointDeDepart: 'La fourniture.',
		hypothese: false,
		note: 'Nourriture fournie aux marins par ordre du capitaine.'
	},
	FOURNITURE_NAVIRE: {
		dureeAnnees: 1,
		source: 'Article L110-4 du code de commerce',
		pointDeDepart: 'La fourniture.',
		hypothese: false,
		note:
			'Matériaux et fournitures nécessaires aux constructions, équipements et ravitaillements ' +
			'du navire.'
	},
	OUVRAGE_ACCEPTE: {
		dureeAnnees: 1,
		source: 'Article L110-4 du code de commerce',
		pointDeDepart: 'L’acceptation de l’ouvrage.',
		hypothese: false,
		note: 'Ouvrages faits, à compter de leur acceptation.'
	}
};

/** Le délai le plus court de tous les régimes connus, en années. */
export function secteurLePlusCourt(): number {
	return Math.min(...Object.values(REGIMES_PRESCRIPTION).map((r) => r.dureeAnnees));
}

export function regimePrescription(secteur: SecteurCreance): RegimePrescription {
	if (secteur !== 'INDETERMINE') return REGIMES_PRESCRIPTION[secteur];

	const duree = secteurLePlusCourt();
	return {
		dureeAnnees: duree,
		source: 'Aucune — hypothèse du logiciel',
		pointDeDepart: 'À déterminer avec le secteur.',
		hypothese: true,
		note:
			`Le secteur n’est pas déterminé. Le délai LE PLUS COURT connu (${duree} an) est retenu, ` +
			'volontairement : annoncer cinq ans à une créance qui en a un la ferait s’éteindre en ' +
			'silence, alors qu’annoncer un an à une créance qui en a cinq fait seulement agir trop ' +
			'tôt. Préciser le secteur lèvera cette hypothèse conservatrice.'
	};
}

/** La date à laquelle la créance est prescrite, bornes de quantième à quantième. */
export function dateDePrescription(pointDeDepart: string, secteur: SecteurCreance): string {
	return ajouterMois(pointDeDepart, regimePrescription(secteur).dureeAnnees * 12);
}

/** Les jours restants. Jamais négatif. */
export function joursAvantPrescription(
	pointDeDepart: string,
	secteur: SecteurCreance,
	aujourdHui: string
): number {
	return joursEntre(aujourdHui, dateDePrescription(pointDeDepart, secteur));
}

/** Prescrite dès que la date est ATTEINTE, pas seulement dépassée. */
export function estPrescrite(
	pointDeDepart: string,
	secteur: SecteurCreance,
	aujourdHui: string
): boolean {
	return aujourdHui >= dateDePrescription(pointDeDepart, secteur);
}
