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
export function etapeDuDossier(faits: FaitsDuDossierPourEtape): EtapeDossier {
	if (faits.nombreFactures > 0 && faits.resteDuCentimes <= 0n) return 'REGLE';
	if (faits.professionnelDesigne || faits.procedureEngageeLe !== null) return 'TRIBUNAL';
	if (faits.lettresValidees.length > 0) return 'ON_LUI_ECRIT';
	return 'PRET';
}

function siRienNeBouge(etape: EtapeDossier, faits: FaitsDuDossierPourEtape): string {
	if (etape === 'REGLE') return 'Plus rien ne court sur ce dossier.';
	const limite =
		faits.dateLimiteAgir === null
			? null
			: faits.dateLimiteAgir < faits.aujourdHui
				? `La date limite pour agir en justice est passée depuis le ${dateLisible(faits.dateLimiteAgir)}.`
				: `Le droit d’agir en justice s’éteint le ${dateLisible(faits.dateLimiteAgir)}, sauf interruption que ce calcul ne suit pas.`;
	const penalites = 'Les pénalités de retard continuent de courir chaque jour.';
	return limite === null ? penalites : `${penalites} ${limite}`;
}

function ceQuiSePasse(etape: EtapeDossier, faits: FaitsDuDossierPourEtape): string {
	switch (etape) {
		case 'PRET':
			return 'Le dossier est prêt : les factures impayées y sont, et le calcul de ce qu’il vous doit est à jour. Il n’a pas payé : à vous de choisir la suite.';
		case 'ON_LUI_ECRIT': {
			const derniere = [...faits.lettresValidees].sort().at(-1)!;
			return `Vous lui avez écrit le ${dateLisible(derniere)}. S’il ne paie pas, les choix qui suivent restent ouverts.`;
		}
		case 'TRIBUNAL':
			return faits.procedureEngageeLe === null
				? 'Un professionnel est désigné sur ce dossier. Les délais qui courent s’affichent ici dès qu’une étape est consignée.'
				: `Une procédure est consignée depuis le ${dateLisible(faits.procedureEngageeLe)}. Les délais qui en découlent sont suivis ici.`;
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
				: `Écrit le ${dateLisible([...faits.lettresValidees].sort().at(-1)!)}`;
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
