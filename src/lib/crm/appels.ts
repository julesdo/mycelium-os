import { jourDeRelance } from './modeles';
import type { StatutProspect } from './statuts';

/**
 * L'APPEL, ET CE QU'IL CHANGE (19/10/2026, audit stratégique : « le téléphone passe
 * en premier »).
 *
 * Une issue par appel, choisie dans une liste fermée : elle avance le statut sans
 * jamais le faire reculer (la règle de `historique.noter`), pose la prochaine action
 * et, quand la personne accepte de recevoir un e-mail après qu'on lui a dit qui
 * appelle et pourquoi, note qu'elle a été INFORMÉE (article 14 du RGPD, CNIL du
 * 10/06/2026) : c'est ce qui rend l'e-mail permis à une adresse nominative.
 *
 * ⚠️ LE CONTRAT PADDLE (clause 11.1 xv) interdit le télémarketing sortant, même pour
 * des produits qu'il ne vend pas. La file d'appels le dit en tête ; l'accord écrit de
 * Paddle reste à obtenir par le fondateur.
 */

export const APPELS_PAR_JOUR = 10;

export const ISSUES_APPEL = [
	'PAS_DE_REPONSE',
	'MESSAGE_LAISSE',
	'BARRAGE',
	'A_RAPPELER',
	'PAS_INTERESSE',
	'INTERESSE',
	'EMAIL_ACCEPTE',
	'RDV',
	'STOP'
] as const;
export type IssueAppel = (typeof ISSUES_APPEL)[number];

export const LIBELLES_DES_ISSUES: Readonly<Record<IssueAppel, string>> = {
	PAS_DE_REPONSE: 'Pas de réponse',
	MESSAGE_LAISSE: 'Message laissé',
	BARRAGE: 'Pas joint le dirigeant',
	A_RAPPELER: 'À rappeler',
	PAS_INTERESSE: 'Pas intéressé',
	INTERESSE: 'Intéressé',
	EMAIL_ACCEPTE: 'D’accord pour un e-mail',
	RDV: 'Rendez-vous pris',
	STOP: 'Ne veut plus être contacté'
};

/** Le rang des statuts, pour ne jamais faire reculer un prospect. */
const RANG: Readonly<Record<StatutProspect, number>> = {
	A_CONTACTER: 0,
	CONTACTE: 1,
	RELANCE: 1,
	A_REPONDU: 2,
	INTERESSE: 3,
	INSCRIT: 4,
	GAGNE: 4,
	PERDU: 4,
	STOP: 5
};

export interface EffetDeLIssue {
	readonly statut: StatutProspect;
	readonly prochaineAction?: string;
	readonly prochaineActionLe?: number;
	/** La personne a été informée : l'e-mail devient permis. */
	readonly informee: boolean;
	/** Le contact vient du prospect : la durée de conservation repart de lui. */
	readonly contactDuProspect: boolean;
	/** L'issue arrête tout : les coordonnées s'effacent (`arreterLeProspect`). */
	readonly arreter: boolean;
}

function auMoins(actuel: StatutProspect, vise: StatutProspect): StatutProspect {
	return RANG[vise] > RANG[actuel] ? vise : actuel;
}

/**
 * Ce que change une issue. `rappelerLe` : le jour choisi pour « À rappeler » (sinon,
 * deux jours ouvrés). Un prospect clos (inscrit, gagné, perdu) ne rouvre pas : seul
 * « Stop » le touche encore.
 */
export function effetDeLIssue(
	issue: IssueAppel,
	statut: StatutProspect,
	maintenant: number,
	rappelerLe?: number
): EffetDeLIssue {
	const base = { informee: false, contactDuProspect: false, arreter: false } as const;
	switch (issue) {
		case 'PAS_DE_REPONSE':
		case 'MESSAGE_LAISSE':
		case 'BARRAGE':
			return {
				...base,
				statut: auMoins(statut, 'CONTACTE'),
				prochaineAction: 'Rappeler',
				prochaineActionLe: jourDeRelance(maintenant, 2)
			};
		case 'A_RAPPELER':
			return {
				...base,
				contactDuProspect: true,
				statut: auMoins(statut, 'A_REPONDU'),
				prochaineAction: 'Rappeler',
				prochaineActionLe: rappelerLe ?? jourDeRelance(maintenant, 2)
			};
		case 'PAS_INTERESSE':
			return { ...base, contactDuProspect: true, statut: auMoins(statut, 'PERDU') };
		case 'INTERESSE':
			return {
				...base,
				contactDuProspect: true,
				statut: auMoins(statut, 'INTERESSE'),
				prochaineAction: 'Envoyer la proposition',
				prochaineActionLe: jourDeRelance(maintenant, 1)
			};
		case 'EMAIL_ACCEPTE':
			return {
				...base,
				informee: true,
				contactDuProspect: true,
				statut: auMoins(statut, 'A_REPONDU'),
				prochaineAction: 'Envoyer l’e-mail promis',
				prochaineActionLe: jourDeRelance(maintenant, 0)
			};
		case 'RDV':
			return {
				...base,
				contactDuProspect: true,
				statut: auMoins(statut, 'INTERESSE'),
				prochaineAction: 'Rendez-vous',
				prochaineActionLe: rappelerLe ?? jourDeRelance(maintenant, 2)
			};
		case 'STOP':
			return { ...base, contactDuProspect: true, statut: 'STOP', arreter: true };
	}
}
