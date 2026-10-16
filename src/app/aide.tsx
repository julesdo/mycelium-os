import type { ReactNode } from 'react';
import type { FunctionReturnType } from 'convex/server';
import type { api } from '../lib/convex/_generated/api';
import { ECRANS_D_AIDE } from '../lib/support/articles';
import {
	phraseDeReponseAttendue,
	phraseDesHoraires,
	reponseAttendue
} from '../lib/support/horaires';
import { phraseDeMasquage } from '../lib/support/masquage';
import { LIBELLES_DES_ACTES, LIBELLES_DES_RAISONS } from '../lib/support/passage';
import type { CarteDeConversationAffichee, EcranDuFil, ElementDuFilAide } from '../screens/aide';
import { heureEnMots, heureOuJour } from './heures';

/**
 * LES CORRESPONDANCES DE L'AIDE — ce que rend le serveur, dit en mots pour l'écran
 * (16/10/2026). Les heures se calculent ici, au rendu : une requête ne lit jamais
 * l'horloge.
 */

type Accueil = FunctionReturnType<typeof api.support.fil.accueil>;
type Carte = Accueil['conversations'][number];
type Conversation = NonNullable<FunctionReturnType<typeof api.support.fil.conversation>>;

const DUREE_D_UNE_CONVERSATION_ANCIENNE_MS = 7 * 24 * 60 * 60 * 1000;

/** « réponse attendue aujourd'hui avant 17 h », ou le retard et la nouvelle estimation. */
export function delaiAnnonce(
	passeeLe: number,
	maintenant: number,
	absentJusquAu: number | null
): { attendue: string; enRetard?: string } {
	const attendueLe = reponseAttendue(passeeLe, absentJusquAu ?? undefined);
	const attendue = `Réponse attendue ${phraseDeReponseAttendue(attendueLe, passeeLe)}`;
	if (maintenant <= attendueLe) return { attendue };
	return {
		attendue,
		enRetard: `Réponse en retard : nous visons ${phraseDeReponseAttendue(reponseAttendue(maintenant), maintenant)}`
	};
}

/** « 20 min », « 2 h », « 3 j » : une durée, en mots courts. */
export function dureeEnMots(ms: number): string {
	const minutes = Math.max(1, Math.round(ms / 60_000));
	if (minutes < 60) return `${minutes} min`;
	const heures = Math.round(minutes / 60);
	if (heures < 24) return `${heures} h`;
	return `${Math.round(heures / 24)} j`;
}

export function carteDeConversation(
	carte: Carte,
	maintenant: number,
	absentJusquAu: number | null
): CarteDeConversationAffichee {
	const ligne = (() => {
		switch (carte.etat) {
			case 'PLUME':
				return carte.dernierMessagePar === 'PLUME' ? 'Plume vous a répondu' : 'Plume réfléchit';
			case 'A_NOUS': {
				if (carte.passeeLe === undefined) return 'Transmis à l’équipe';
				const { attendue, enRetard } = delaiAnnonce(carte.passeeLe, maintenant, absentJusquAu);
				return enRetard ?? `Transmis · ${attendue.charAt(0).toLowerCase()}${attendue.slice(1)}`;
			}
			case 'EN_ATTENTE_CLIENT':
				return carte.nonLue
					? `${carte.repondantNom ?? 'L’équipe'} vous a répondu`
					: 'L’équipe attend votre réponse';
			case 'TERMINEE':
				return 'Terminée';
		}
	})();
	return {
		id: carte.id,
		titre: carte.titre,
		ligne,
		date: heureOuJour(carte.dernierMessageLe),
		attention: carte.nonLue
	};
}

export function horairesDeLEquipe(
	maintenant: number,
	absentJusquAu: number | null
): { horaires: string; attendue: string; absence?: string } {
	const attendueLe = reponseAttendue(maintenant, absentJusquAu ?? undefined);
	return {
		horaires: phraseDesHoraires(),
		attendue: `Une question posée maintenant : réponse attendue ${phraseDeReponseAttendue(attendueLe, maintenant)}.`,
		...(absentJusquAu !== null && absentJusquAu > maintenant
			? {
					absence: `Équipe absente jusqu’au ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(new Date(absentJusquAu))} : réponse attendue ${phraseDeReponseAttendue(attendueLe, maintenant)}.`
				}
			: {})
	};
}

export function ecranDuFil(cle: string): EcranDuFil | null {
	if (!(cle in ECRANS_D_AIDE)) return null;
	const ecran = ECRANS_D_AIDE[cle as keyof typeof ECRANS_D_AIDE];
	return {
		libelle: ecran.libelle,
		vers: ecran.vers,
		...('recherche' in ecran ? { recherche: ecran.recherche } : {})
	};
}

/** « Assistant automatique · l'équipe peut aussi répondre », « Avec Camille », « Terminée ». */
export function sousTitreDuFil(conversation: Conversation | null, plumeOuvert: boolean, attendue?: string): string {
	if (conversation === null) {
		return plumeOuvert ? 'Assistant automatique · l’équipe peut aussi répondre' : 'L’équipe Letikette';
	}
	switch (conversation.etat) {
		case 'PLUME':
			return 'Assistant automatique · l’équipe peut aussi répondre';
		case 'A_NOUS':
			return attendue === undefined ? 'Transmis à l’équipe' : `Transmis · ${attendue.charAt(0).toLowerCase()}${attendue.slice(1)}`;
		case 'EN_ATTENTE_CLIENT':
			return conversation.repondantNom === undefined ? 'Avec l’équipe' : `Avec ${conversation.repondantNom}`;
		case 'TERMINEE':
			return 'Terminée';
	}
}

export function estAncienne(conversation: Conversation, maintenant: number): boolean {
	return (
		conversation.etat === 'TERMINEE' &&
		conversation.termineeLe !== undefined &&
		maintenant - conversation.termineeLe > DUREE_D_UNE_CONVERSATION_ANCIENNE_MS
	);
}

/**
 * LE FIL, ÉLÉMENT PAR ÉLÉMENT. La carte « Transmis » se pose à la place de l'événement
 * de passage ; « Ça répond ? » ne s'offre que sous la DERNIÈRE réponse de Plume, tant
 * que la conversation est chez lui et qu'on n'a pas répondu.
 */
export function elementsDuFil(
	conversation: Conversation,
	maintenant: number,
	absentJusquAu: number | null,
	gestes: {
		readonly onAvis: (messageId: string, utile: boolean) => void;
		readonly versLEspace: (question: string) => void;
		readonly cartesArreter: ReactNode;
	}
): ElementDuFilAide[] {
	const derniereDePlume = [...conversation.messages]
		.reverse()
		.find((m) => m.auteur === 'PLUME' && m.genre === 'MESSAGE');
	let derniereQuestion = '';
	const elements: ElementDuFilAide[] = [];
	for (const m of conversation.messages) {
		const heure = heureEnMots(m.le);
		if (m.retire) {
			elements.push({
				genre: 'RETIRE',
				id: m.id,
				auteur: m.auteur === 'EQUIPE' ? 'EQUIPE' : m.auteur === 'PLUME' ? 'PLUME' : 'GERANT',
				heure
			});
			continue;
		}
		if (m.genre === 'EVENEMENT') {
			if (m.evenement === 'PASSE' && conversation.raisonDePassage !== undefined) {
				const { attendue, enRetard } = delaiAnnonce(m.le, maintenant, absentJusquAu);
				const pourquoi =
					conversation.acte === undefined
						? LIBELLES_DES_RAISONS[conversation.raisonDePassage].gerant
						: `${LIBELLES_DES_ACTES[conversation.acte]} : seule l’équipe peut traiter cette demande.`;
				const depuis = conversation.depuis === undefined ? null : ecranDuFil(conversation.depuis);
				elements.push({
					genre: 'TRANSMIS',
					id: m.id,
					heure,
					question: derniereQuestion || conversation.titre,
					pourquoi,
					...(depuis === null ? {} : { depuis: depuis.libelle }),
					attendue,
					...(conversation.etat === 'A_NOUS' && enRetard !== undefined ? { enRetard } : {})
				});
			} else {
				elements.push({
					genre: 'LIGNE',
					id: m.id,
					texte: m.texte,
					heure,
					annoncee: m.evenement === 'REJOINT'
				});
			}
			continue;
		}
		if (m.auteur === 'GERANT') {
			derniereQuestion = m.texte;
			const masquage = m.masques === undefined ? null : phraseDeMasquage(m.masques);
			elements.push({
				genre: 'GERANT',
				id: m.id,
				texte: m.texte,
				heure,
				parEmail: m.canal === 'EMAIL',
				...(masquage === null ? {} : { masquage })
			});
		} else if (m.auteur === 'PLUME') {
			const question = derniereQuestion;
			const offrirSatisfaction =
				conversation.etat === 'PLUME' && m.id === derniereDePlume?.id && m.avis === undefined;
			elements.push({
				genre: 'PLUME',
				id: m.id,
				phrases: (m.phrases ?? [{ texte: m.texte, source: { genre: 'AUCUNE' as const } }]).map((p) => ({
					texte: p.texte,
					genreSource: p.source.genre === 'AUCUNE' ? ('AUCUNE' as const) : ('PARAMETRE' as const),
					libelleSource: p.source.genre === 'COMPTE' ? 'votre compte' : p.source.genre === 'ARTICLE' ? 'aide' : ''
				})),
				heure,
				ecrans: (m.ecrans ?? []).map(ecranDuFil).filter((e): e is EcranDuFil => e !== null),
				...(m.carte === 'ARRETER_LES_ENVOIS' ? { cartes: gestes.cartesArreter } : {}),
				...(m.ecrans?.includes('PLUME') && question !== ''
					? { versLEspace: () => gestes.versLEspace(question) }
					: {}),
				...(offrirSatisfaction
					? {
							satisfaction: {
								onOui: () => gestes.onAvis(m.id, true),
								onNon: () => gestes.onAvis(m.id, false)
							}
						}
					: {})
			});
		} else if (m.auteur === 'EQUIPE') {
			elements.push({
				genre: 'EQUIPE',
				id: m.id,
				nom: m.auteurNom ?? 'L’équipe',
				photo: null,
				texte: m.texte,
				heure
			});
		}
	}
	return elements;
}
