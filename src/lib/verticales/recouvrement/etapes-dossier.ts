import { dateLisible } from './calendrier';

/**
 * LES QUATRE ÉTAPES D'UN DOSSIER — Prêt, On lui écrit, Le tribunal si besoin,
 * Réglé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ L'ÉTAPE SE DÉDUIT DES FAITS, JAMAIS D'UN VERDICT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle ne dépend ni de `eligible`, ni du score, ni de `creances.statut` : un
 * dossier avance parce que quelque chose s'est PASSÉ — une lettre est partie, un
 * professionnel est désigné, une procédure est consignée, les factures sont
 * soldées. Le logiciel constate où en est le dossier ; il ne dit pas s'il
 * « devrait » avancer.
 *
 * ⚠️ ET LES TEXTES NE RECOMMANDENT RIEN. « Si rien ne bouge » dit ce qui arrive
 * avec une date ; les choix qui suivent sont présentés à égalité, sans « prochaine
 * étape recommandée ».
 */

export type EtapeDossier = 'PRET' | 'ON_LUI_ECRIT' | 'TRIBUNAL' | 'REGLE';

export const ORDRE_ETAPES: readonly EtapeDossier[] = ['PRET', 'ON_LUI_ECRIT', 'TRIBUNAL', 'REGLE'];

export const TITRE_ETAPE: Record<EtapeDossier, string> = {
	PRET: 'Prêt',
	ON_LUI_ECRIT: 'On lui écrit',
	TRIBUNAL: 'Le tribunal, si besoin',
	REGLE: 'Réglé'
};

export interface FaitsDuDossierPourEtape {
	readonly nombreFactures: number;
	/** Le reste dû, en centimes, toutes factures du dossier confondues. */
	readonly resteDuCentimes: bigint;
	/** Les dates (ISO) des courriers au client que le gérant a validés. */
	readonly lettresValidees: readonly string[];
	/** Un avocat ou un commissaire de justice est désigné sur le dossier. */
	readonly professionnelDesigne: boolean;
	/** La date (ISO) à laquelle une procédure a été consignée, ou `null`. */
	readonly procedureEngageeLe: string | null;
	/** Le dossier a été classé par le gérant. */
	readonly classe: boolean;
	/** La date limite pour agir en justice la plus proche, ou `null`. */
	readonly dateLimiteAgir: string | null;
	readonly aujourdHui: string;
}

export type EtatEtape = 'FAITE' | 'EN_COURS' | 'A_VENIR';

export interface EtapeLue {
	readonly cle: EtapeDossier;
	readonly titre: string;
	readonly etat: EtatEtape;
	/** Ce qui a fait passer le dossier par cette étape, en une ligne. */
	readonly detail: string | null;
}

export interface LectureEtapes {
	readonly etape: EtapeDossier;
	readonly classe: boolean;
	readonly etapes: readonly EtapeLue[];
	/** Ce qui se passe à l'étape en cours, en mots simples. */
	readonly ceQuiSePasse: string;
	/** Ce qui arrive si rien ne bouge, avec une date quand il y en a une. */
	readonly siRienNeBouge: string;
}

/** Où en est le dossier, d'après ses faits. */
/**
 * La dernière lettre validée, par la date.
 *
 * ⚠️ PAS DE `.at(-1)` : ce module est importé par une fonction Convex depuis
 * l'index des dossiers, et le `tsconfig` de Convex vise une bibliothèque
 * antérieure à ES2022. `.at()` y fait échouer la compilation du backend entier.
 */
function derniereLettre(lettres: readonly string[]): string | undefined {
	const triees = [...lettres].sort();
	return triees[triees.length - 1];
}

export function etapeDuDossier(faits: FaitsDuDossierPourEtape): EtapeDossier {
	if (faits.nombreFactures > 0 && faits.resteDuCentimes <= 0n) return 'REGLE';
	if (faits.professionnelDesigne || faits.procedureEngageeLe !== null) return 'TRIBUNAL';
	if (faits.lettresValidees.length > 0) return 'ON_LUI_ECRIT';
	return 'PRET';
}

/**
 * CE QUI ARRIVE SI RIEN NE BOUGE.
 *
 * ⚠️ LA DATE LIMITE NE S'Y RÉÉCRIT PLUS QUAND ELLE EST À VENIR. Elle est une
 * pastille en tête de la page dossier, à quatre cents pixels d'ici, et la
 * répéter était l'une des cinq redites relevées le 30/09/2026 — elle s'écrivait
 * trois fois sur le même écran.
 *
 * ⚠️ PASSÉE, ELLE SE RÉPÈTE QUAND MÊME, ET C'EST DÉLIBÉRÉ. C'est le seul état du
 * produit où l'on perd tout sans que personne n'ait rien fait, et une pastille
 * seule y serait trop discrète. Une redite se juge à ce qu'elle coûte de ne pas
 * la faire.
 */
function siRienNeBouge(etape: EtapeDossier, faits: FaitsDuDossierPourEtape): string {
	if (etape === 'REGLE') return 'Plus rien ne court sur ce dossier.';
	const penalites = 'Les pénalités de retard courent chaque jour.';
	if (faits.dateLimiteAgir !== null && faits.dateLimiteAgir < faits.aujourdHui) {
		return `${penalites} La date limite pour agir en justice est passée depuis le ${dateLisible(faits.dateLimiteAgir)}.`;
	}
	return penalites;
}

/**
 * CE QUI SE PASSE À L'ÉTAPE EN COURS — UNE PHRASE, DEUX AU PLUS.
 *
 * ⚠️ « À VOUS DE CHOISIR LA SUITE » ET « LES CHOIX QUI SUIVENT RESTENT OUVERTS »
 * ONT ÉTÉ RETIRÉS. Ils disaient en mots ce que le fil du dossier montre
 * désormais en trois échelons, juste en dessous.
 */
function ceQuiSePasse(etape: EtapeDossier, faits: FaitsDuDossierPourEtape): string {
	switch (etape) {
		case 'PRET':
			return 'Le dossier est prêt et chiffré. Il n’a pas payé.';
		case 'ON_LUI_ECRIT': {
			const derniere = derniereLettre(faits.lettresValidees)!;
			return `Vous lui avez écrit le ${dateLisible(derniere)}.`;
		}
		case 'TRIBUNAL':
			return faits.procedureEngageeLe === null
				? 'Un professionnel est désigné. Les délais s’affichent dès qu’une étape est consignée.'
				: `Une procédure est consignée depuis le ${dateLisible(faits.procedureEngageeLe)}.`;
		case 'REGLE':
			return 'Toutes les factures de ce dossier sont réglées.';
	}
}

function detail(cle: EtapeDossier, faits: FaitsDuDossierPourEtape): string | null {
	switch (cle) {
		case 'PRET':
			return `${faits.nombreFactures} facture${faits.nombreFactures > 1 ? 's' : ''} dans le dossier`;
		case 'ON_LUI_ECRIT':
			return faits.lettresValidees.length === 0
				? null
				: `Écrit le ${dateLisible(derniereLettre(faits.lettresValidees)!)}`;
		case 'TRIBUNAL':
			return faits.procedureEngageeLe !== null
				? `Depuis le ${dateLisible(faits.procedureEngageeLe)}`
				: faits.professionnelDesigne
					? 'Un professionnel est désigné'
					: null;
		case 'REGLE':
			return null;
	}
}

/** Les quatre étapes, leur état, et ce que dit l'étape en cours. */
export function lireEtapes(faits: FaitsDuDossierPourEtape): LectureEtapes {
	const etape = etapeDuDossier(faits);
	const rang = ORDRE_ETAPES.indexOf(etape);
	return {
		etape,
		classe: faits.classe,
		etapes: ORDRE_ETAPES.map((cle, i) => ({
			cle,
			titre: TITRE_ETAPE[cle],
			// Réglé : toutes les étapes sont derrière, y compris la dernière.
			etat: etape === 'REGLE' || i < rang ? 'FAITE' : i === rang ? 'EN_COURS' : 'A_VENIR',
			detail: i <= rang ? detail(cle, faits) : null
		})),
		ceQuiSePasse: ceQuiSePasse(etape, faits),
		siRienNeBouge: siRienNeBouge(etape, faits)
	};
}

/**
 * DEUX QUESTIONS DÉJÀ ÉCRITES PAR ÉTAPE, sur les faits et les calculs du dossier.
 *
 * ⚠️ AUCUNE N'EST UNE QUESTION DE DROIT. Le compagnon répond sur ce que le dossier
 * contient ; une question de droit sur un cas précis revient à un avocat.
 */
export const QUESTIONS_PAR_ETAPE: Record<EtapeDossier, readonly [string, string]> = {
	PRET: [
		'Comment est calculé ce qu’il me doit ?',
		'Quelles factures sont dans ce dossier, et depuis quand ?'
	],
	ON_LUI_ECRIT: [
		'Combien de pénalités ont couru depuis ma lettre ?',
		'Quelles factures ma lettre réclame-t-elle ?'
	],
	TRIBUNAL: [
		'Quelles dates sont à surveiller dans ce dossier ?',
		'Qu’est-ce qui a été noté dans la procédure, et quand ?'
	],
	REGLE: [
		'Comment les paiements ont-ils été répartis ?',
		'Quand la dernière facture a-t-elle été réglée ?'
	]
};
