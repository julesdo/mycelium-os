import { prochainCreneauDEnvoi } from '../verticales/recouvrement/plan-relance';

/**
 * LES NOTIFICATIONS PUSH, PAR CATÉGORIE (21/10/2026, le parcours de l'habitude,
 * `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md`).
 *
 * Le gérant règle ses notifications par CATÉGORIE, jamais type par type : quatre
 * interrupteurs dans son profil, comme les réglages d'iOS. Chaque type de notification
 * de la boîte de réception tombe dans une catégorie, et un type nouveau ne compile pas
 * tant qu'il n'en a pas une (`Record` exhaustif).
 */

export const TYPES_DE_NOTIFICATION = [
	'IMPORT_TERMINE',
	'CREANCE_MURE',
	'ECHEANCE_PROCHE',
	'PRESCRIPTION_PROCHE',
	'DEBITEUR_DEGRADE',
	'HUMAN_ASSIST_REPLY',
	'PILOTE_BLOQUE',
	'RISQUE_EN_BAISSE',
	'ABONNEMENT',
	'PAIEMENT_RECU',
	'JALON',
	'SEMAINE'
] as const;
export type TypeDeNotification = (typeof TYPES_DE_NOTIFICATION)[number];

export const CATEGORIES_PUSH = ['PAIEMENTS', 'REPONSES', 'SEMAINE', 'COMPTE'] as const;
export type CategoriePush = (typeof CATEGORIES_PUSH)[number];

/** Le nom de chaque catégorie, tel que le profil l'écrit. */
export const NOM_DE_LA_CATEGORIE: Readonly<Record<CategoriePush, string>> = {
	PAIEMENTS: 'Paiements reçus',
	REPONSES: 'Ce qui attend votre réponse',
	SEMAINE: 'Votre semaine',
	COMPTE: 'Abonnement et compte'
};

const CATEGORIE: Readonly<Record<TypeDeNotification, CategoriePush>> = {
	PAIEMENT_RECU: 'PAIEMENTS',
	JALON: 'PAIEMENTS',
	IMPORT_TERMINE: 'REPONSES',
	CREANCE_MURE: 'REPONSES',
	ECHEANCE_PROCHE: 'REPONSES',
	PRESCRIPTION_PROCHE: 'REPONSES',
	DEBITEUR_DEGRADE: 'REPONSES',
	PILOTE_BLOQUE: 'REPONSES',
	RISQUE_EN_BAISSE: 'REPONSES',
	SEMAINE: 'SEMAINE',
	ABONNEMENT: 'COMPTE',
	HUMAN_ASSIST_REPLY: 'COMPTE'
};

export function categorieDuType(type: TypeDeNotification): CategoriePush {
	return CATEGORIE[type];
}

/**
 * Seul « Votre semaine » est du marketing : tout le reste dit ce qui vient d'arriver
 * au gérant (un paiement, une question, un rappel d'abonnement).
 */
export function estTransactionnel(type: TypeDeNotification): boolean {
	return type !== 'SEMAINE';
}

/** Les heures où un push transactionnel part tout de suite, heure de Paris. */
const HEURES_DU_TRANSACTIONNEL = { de: 8, a: 21 } as const;
const QUART_D_HEURE = 15 * 60_000;

/**
 * QUAND UN PUSH PART. Un paiement à 23 h 30 se lit au réveil, pas dans la nuit : le
 * transactionnel part tout de suite entre 8 h et 21 h, heure de Paris, sinon au prochain
 * 8 h. Le marketing suit le créneau des relances (semaine, 9 h-18 h).
 */
export function heureDEnvoi(type: TypeDeNotification, maintenant: number): number {
	if (!estTransactionnel(type)) return prochainCreneauDEnvoi(maintenant);
	if (dansLesHeures(maintenant)) return maintenant;
	// Paris est décalé d'heures entières : ses quarts d'heure tombent sur ceux d'UTC.
	let t = Math.ceil(maintenant / QUART_D_HEURE) * QUART_D_HEURE;
	for (let i = 0; i < 24 * 4; i++) {
		if (dansLesHeures(t)) return t;
		t += QUART_D_HEURE;
	}
	return maintenant;
}

const HEURE_DE_PARIS = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/Paris',
	hour: '2-digit',
	hourCycle: 'h23'
});

function dansLesHeures(t: number): boolean {
	const heure = Number(
		HEURE_DE_PARIS.formatToParts(new Date(t)).find((p) => p.type === 'hour')?.value
	);
	return heure >= HEURES_DU_TRANSACTIONNEL.de && heure < HEURES_DU_TRANSACTIONNEL.a;
}
