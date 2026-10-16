import type { RaisonDePassage } from './passage';
import type { Sujet } from './sujets';

/**
 * LA MESURE DU SUPPORT (16/10/2026, spec § 6) — trente jours, comparés aux trente
 * d'avant. Calculée par du code, d'heure en heure, jamais par le modèle : l'entonnoir
 * (combien Plume a réglé seul, combien sont passées, réglées par l'équipe ou restées
 * sans nouvelles), deux médianes en heures ouvrées, le taux de « Oui » de Plume, la
 * satisfaction après l'équipe (masquée sous dix avis : sous ce nombre, un avis est une
 * personne), le tableau par sujet et ce que Plume n'a pas su.
 */

export interface ConversationPourLaMesure {
	readonly id: string;
	readonly titre: string;
	readonly creeeLe: number;
	readonly etat: 'PLUME' | 'A_NOUS' | 'EN_ATTENTE_CLIENT' | 'TERMINEE';
	readonly passeeLe?: number;
	readonly raisonDePassage?: RaisonDePassage;
	readonly sujet?: Sujet;
	readonly issue?: 'RESOLUE_PAR_PLUME' | 'RESOLUE_PAR_EQUIPE' | 'SANS_NOUVELLES';
	readonly premiereReponseOuvreeMin?: number;
	/** La durée de la conversation, en minutes ouvrées, quand l'équipe l'a terminée. */
	readonly resolutionOuvreeMin?: number;
	readonly avis?: { readonly utile: boolean };
	readonly ouiPlume: number;
	readonly nonPlume: number;
}

export interface EntonnoirDuSupport {
	readonly conversations: number;
	readonly resoluesParPlume: number;
	readonly passees: number;
	readonly resoluesParLEquipe: number;
	readonly sansNouvelles: number;
}

export interface MesureDuSupport {
	readonly calculeeLe: number;
	readonly entonnoir: EntonnoirDuSupport;
	readonly precedent: EntonnoirDuSupport;
	readonly medianes: {
		readonly premiereReponseH: number | null;
		readonly resolutionH: number | null;
		/** Sur combien de premières réponses la médiane se calcule. */
		readonly reponses: number;
	};
	readonly tauxDeOuiPlume: number | null;
	readonly satisfaction: number | null;
	readonly parSujet: readonly { readonly sujet: Sujet; readonly conversations: number; readonly passees: number }[];
	readonly lacunes: readonly {
		readonly id: string;
		readonly titre: string;
		readonly sujet?: Sujet;
		readonly raison: 'LACUNE' | 'REFUS';
	}[];
}

const JOUR = 24 * 60 * 60 * 1000;
export const SATISFACTION_A_PARTIR_DE = 10;

function entonnoir(conversations: readonly ConversationPourLaMesure[]): EntonnoirDuSupport {
	return {
		conversations: conversations.length,
		resoluesParPlume: conversations.filter((c) => c.issue === 'RESOLUE_PAR_PLUME').length,
		passees: conversations.filter((c) => c.passeeLe !== undefined).length,
		resoluesParLEquipe: conversations.filter((c) => c.issue === 'RESOLUE_PAR_EQUIPE').length,
		sansNouvelles: conversations.filter((c) => c.issue === 'SANS_NOUVELLES').length
	};
}

function mediane(valeurs: readonly number[]): number | null {
	if (valeurs.length === 0) return null;
	const triees = [...valeurs].sort((a, b) => a - b);
	const milieu = Math.floor(triees.length / 2);
	return triees.length % 2 === 1 ? triees[milieu]! : (triees[milieu - 1]! + triees[milieu]!) / 2;
}

function enHeures(minutes: number | null): number | null {
	return minutes === null ? null : Math.round((minutes / 60) * 10) / 10;
}

export function calculerLaMesure(
	toutes: readonly ConversationPourLaMesure[],
	maintenant: number
): MesureDuSupport {
	const recentes = toutes.filter((c) => c.creeeLe > maintenant - 30 * JOUR);
	const precedentes = toutes.filter(
		(c) => c.creeeLe <= maintenant - 30 * JOUR && c.creeeLe > maintenant - 60 * JOUR
	);
	const premieres = recentes
		.map((c) => c.premiereReponseOuvreeMin)
		.filter((m): m is number => m !== undefined);
	const resolutions = recentes
		.map((c) => c.resolutionOuvreeMin)
		.filter((m): m is number => m !== undefined);
	const oui = recentes.reduce((s, c) => s + c.ouiPlume, 0);
	const non = recentes.reduce((s, c) => s + c.nonPlume, 0);
	const avis = recentes.filter((c) => c.issue === 'RESOLUE_PAR_EQUIPE' && c.avis !== undefined);

	const sujets = new Map<Sujet, { conversations: number; passees: number }>();
	for (const c of recentes) {
		if (c.sujet === undefined) continue;
		const ligne = sujets.get(c.sujet) ?? { conversations: 0, passees: 0 };
		ligne.conversations += 1;
		if (c.passeeLe !== undefined) ligne.passees += 1;
		sujets.set(c.sujet, ligne);
	}

	return {
		calculeeLe: maintenant,
		entonnoir: entonnoir(recentes),
		precedent: entonnoir(precedentes),
		medianes: {
			premiereReponseH: enHeures(mediane(premieres)),
			resolutionH: enHeures(mediane(resolutions)),
			reponses: premieres.length
		},
		tauxDeOuiPlume: oui + non === 0 ? null : oui / (oui + non),
		satisfaction:
			avis.length < SATISFACTION_A_PARTIR_DE
				? null
				: avis.filter((c) => c.avis?.utile === true).length / avis.length,
		parSujet: [...sujets.entries()]
			.map(([sujet, ligne]) => ({ sujet, ...ligne }))
			.sort((a, b) => b.conversations - a.conversations),
		lacunes: recentes
			.filter(
				(c): c is ConversationPourLaMesure & { raisonDePassage: 'LACUNE' | 'REFUS' } =>
					c.raisonDePassage === 'LACUNE' || c.raisonDePassage === 'REFUS'
			)
			.slice(0, 20)
			.map((c) => ({
				id: c.id,
				titre: c.titre,
				...(c.sujet === undefined ? {} : { sujet: c.sujet }),
				raison: c.raisonDePassage
			}))
	};
}
