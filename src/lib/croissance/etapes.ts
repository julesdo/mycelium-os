/**
 * LES ÉTAPES D'UN ÉTABLISSEMENT (16/10/2026), de l'inscription à la reconquête.
 *
 * ⚠️ ELLES SE DÉDUISENT DE L'ÉTAT, ELLES NE S'ÉCRIVENT PAS À LA MAIN. Le relevé
 * (`convex/croissance/releve.ts`) lit l'état courant et appelle cette fonction,
 * qui ne fait qu'ajouter les étapes nouvellement atteintes. Une date déjà notée
 * ne se réécrit jamais ; seule « à risque » se lève, parce que c'est un état et
 * non un passage.
 */

export const ETAPES = [
	'INSCRIT',
	'ENTREPRISE',
	'FACTURES_DEPOSEES',
	'MONTANT_REVELE',
	'RELANCES_ACTIVEES',
	'ESSAI',
	'ABONNE',
	'MONTEE_EN_GAMME',
	'A_RISQUE',
	'RESILIE',
	'RECONQUIS'
] as const;

export type Etape = (typeof ETAPES)[number];

/**
 * Le nom d'une étape pour UN compte, sur sa fiche (« Abonné ») ; le point du lundi
 * compte des comptes et garde le pluriel (`LIBELLES_DES_ETAPES`).
 */
export const LIBELLES_D_UNE_ETAPE: Record<Etape, string> = {
	INSCRIT: 'Inscrit',
	ENTREPRISE: 'Entreprise renseignée',
	FACTURES_DEPOSEES: 'Factures déposées',
	MONTANT_REVELE: 'Factures échues trouvées',
	RELANCES_ACTIVEES: 'Relances activées',
	ESSAI: 'Essai commencé',
	ABONNE: 'Abonné',
	MONTEE_EN_GAMME: 'Montée en gamme',
	A_RISQUE: 'À risque',
	RESILIE: 'Résilié',
	RECONQUIS: 'Reconquis'
};
export type DatesDesEtapes = Partial<Record<Etape, number>>;
export type FormuleVue = 'solo' | 'equipe' | 'pro';
export type RythmeVu = 'mensuel' | 'annuel';

/** Ce que le relevé lit dans la base, déjà réduit à ce qui compte. */
export interface EtatDuCompte {
	readonly creeLe: number;
	readonly sirenConnu: boolean;
	readonly premierDepotLe: number | null;
	readonly factureEchueImpayee: boolean;
	readonly relancesActiveesLe: number | null;
	readonly relancesActives: boolean;
	/** `paddleStatus` : `trialing`, `active`, `canceled`, `past_due`… ou rien. */
	readonly statutPaiement: string | null;
	readonly formule: FormuleVue | null;
	readonly rythme: RythmeVu | null;
	/** Une résiliation demandée qui n'a pas encore pris effet. */
	readonly resiliationPrevue: boolean;
	readonly derniereActivite: number;
}

export interface MemoireDuParcours {
	readonly etapes: DatesDesEtapes;
	readonly formuleVue?: FormuleVue;
	readonly rythmeVu?: RythmeVu;
}

/** Sans visite depuis quinze jours, un abonné est à risque. */
export const JOURS_SANS_VISITE_A_RISQUE = 14;
const JOUR = 24 * 60 * 60 * 1000;
const RANG: Record<FormuleVue, number> = { solo: 1, equipe: 2, pro: 3 };

export function deduireEtapes(
	etat: EtatDuCompte,
	memoire: MemoireDuParcours,
	maintenant: number
): MemoireDuParcours {
	const e: DatesDesEtapes = { ...memoire.etapes };
	const noter = (cle: Etape, le: number) => {
		if (e[cle] === undefined) e[cle] = le;
	};

	noter('INSCRIT', etat.creeLe);
	if (etat.sirenConnu) noter('ENTREPRISE', maintenant);
	if (etat.premierDepotLe !== null) noter('FACTURES_DEPOSEES', etat.premierDepotLe);
	if (etat.factureEchueImpayee) noter('MONTANT_REVELE', maintenant);
	if (etat.relancesActiveesLe !== null) noter('RELANCES_ACTIVEES', etat.relancesActiveesLe);

	const enEssai = etat.statutPaiement === 'trialing';
	const abonne = etat.statutPaiement === 'active';
	if (enEssai) noter('ESSAI', maintenant);
	if (abonne) noter('ABONNE', maintenant);
	if (etat.statutPaiement === 'canceled') noter('RESILIE', maintenant);
	if ((abonne || enEssai) && e.RESILIE !== undefined) noter('RECONQUIS', maintenant);

	let formuleVue = memoire.formuleVue;
	let rythmeVu = memoire.rythmeVu;
	if (abonne && formuleVue === undefined && etat.formule !== null) {
		formuleVue = etat.formule;
		rythmeVu = etat.rythme ?? undefined;
	}
	if (abonne && formuleVue !== undefined && etat.formule !== null) {
		const plusHaute = RANG[etat.formule] > RANG[formuleVue];
		const alAnnee = rythmeVu === 'mensuel' && etat.rythme === 'annuel';
		if (plusHaute || alAnnee) noter('MONTEE_EN_GAMME', maintenant);
	}

	const risque =
		(abonne || enEssai) &&
		(maintenant - etat.derniereActivite > JOURS_SANS_VISITE_A_RISQUE * JOUR ||
			(e.RELANCES_ACTIVEES !== undefined && !etat.relancesActives) ||
			etat.resiliationPrevue);
	if (risque) noter('A_RISQUE', maintenant);
	else delete e.A_RISQUE;

	return {
		etapes: e,
		...(formuleVue === undefined ? {} : { formuleVue }),
		...(rythmeVu === undefined ? {} : { rythmeVu })
	};
}
