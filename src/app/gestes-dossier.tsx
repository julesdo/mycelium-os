import { useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { depuisEuros, enCentimes } from '../lib/socle/montants';
import { dateCourte, eurosCentimes } from '../ui';
import { usePlumeDit, type GesteDeBulle } from './parole-de-plume';

/** Le message d'un refus : `ConvexError` le porte dans `data`, pas dans `message`. */
function messageDuRefus(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'L’opération n’a pas abouti.';
}

/**
 * LES GESTES D'UNE CARTE BALAYÉE, BRANCHÉS — et le mot qui dit qu'ils sont faits.
 *
 * ⚠️ UN SEUL ENDROIT POUR LES DEUX ÉCRANS QUI LES PORTENT (« Aujourd'hui » et
 * « Dossiers »). La lettre composée d'un geste doit être EXACTEMENT celle du lot
 * et du dossier seul : deux copies des choix de relance finiraient par composer
 * deux lettres différentes pour le même dossier.
 *
 * ⚠️ CHAQUE GESTE SE CONFIRME PAR UN MOT, en bas de l'écran. Un geste fait sous
 * le doigt, sans feuille, ne laisse sinon aucune trace — et après un geste aussi
 * court, la question qu'on se pose est « est-ce parti ? ». La réponse est écrite :
 * non, la lettre attend sa relecture (ligne rouge n° 1).
 *
 * ⚠️ ET C'EST PLUME QUI LE DIT, DEPUIS SA BULLE (13/10/2026). Le mot était un toast
 * anonyme ; il sort désormais de Plume, à la première personne, avec UN bouton
 * (« Annuler », « La relire »). Sans bulle à l'écran, il redevient un toast
 * (`usePlumeDit`).
 */

/**
 * Les choix d'une lettre de relance : les valeurs par défaut d'un dossier seul.
 * Un lot ou un geste qui composerait autrement produirait des lettres
 * différentes de celles que le gérant a déjà relues.
 */
export function choixDeRelance(delaiJours: number) {
	return {
		modele: 'RELANCE_OFFICIELLE',
		delaiJours,
		suite: 'SUITE_GENERALE',
		modalite: 'SELON_FACTURES',
		reserveIndemnisationComplementaire: false
	} as const;
}

/**
 * Le délai laissé au client quand le gérant n'en a pas choisi : le premier des
 * délais que propose la feuille du lot (`DELAIS`, dans `screens/dossiers.tsx`).
 */
export const DELAI_DE_RELANCE_PAR_DEFAUT = 8;

/**
 * LE TEMPS DE CHANGER D'AVIS : un mot qui porte « Annuler » reste un peu plus
 * longtemps que les autres (six secondes par défaut).
 */
const DUREE_POUR_ANNULER_MS = 8000;

/**
 * « ANNULER », DANS LE MOT QUI CONFIRME (09/10/2026, sur Gmail, Fiverr et
 * LinkedIn) : un geste fait d'un toucher se défait d'un toucher. Une seule fois :
 * un second appui ne referait rien.
 */
function annuler(defaire: () => Promise<void>): GesteDeBulle {
	let fait = false;
	return {
		libelle: 'Annuler',
		faire: () => {
			if (fait) return;
			fait = true;
			void defaire();
		}
	};
}

export function useGestesDeDossier() {
	const preparerEnLot = useMutation(api.recouvrement.envois.preparerEnLot);
	const noter = useMutation(api.recouvrement.suivi.noter);
	const convenir = useMutation(api.recouvrement.parole.convenirEcheancier);
	const arreter = useMutation(api.recouvrement.parole.arreterEcheancier);
	const classerLeDossier = useMutation(api.recouvrement.classement.classer);
	const rouvrirLeDossier = useMutation(api.recouvrement.classement.rouvrir);
	const effacer = useMutation(api.recouvrement.suivi.effacer);
	const dire = usePlumeDit();
	const navigate = useNavigate();

	/** Défaire une note qu'on vient de poser : elle s'efface vraiment (`suivi.effacer`). */
	function effacerLaNote(entreeId: Id<'suiviDossier'>, titre: string) {
		return async () => {
			try {
				await effacer({ entreeId });
				dire({ titre, texte: `${titre}. C’est comme si rien n’avait été noté.` });
			} catch (e) {
				dire({
					titre: 'Pas annulé',
					texte: `Je n’ai pas pu l’annuler : ${messageDuRefus(e)}`,
					humeur: 'attention'
				});
			}
		};
	}

	/** Composer la lettre de relance d'un dossier et la poser à valider. */
	async function relancer(creanceId: string, client: string, delaiJours: number) {
		// `preparerEnLot` et non `preparer` : il refuse de doubler une lettre qui
		// attend déjà, et rend sa raison au lieu de lever.
		const [resultat] = await preparerEnLot({
			creanceIds: [creanceId as Id<'creances'>],
			choix: choixDeRelance(delaiJours)
		});
		if (resultat?.envoiId !== undefined) {
			// ⚠️ LE MOT MÈNE À LA LETTRE (08/10/2026) : « elle attend dans le dossier »
			// sans y mener faisait chercher ce qu'on venait de faire.
			dire({
				titre: 'Lettre préparée',
				texte: `J’ai préparé la lettre de ${client}. Elle attend votre relecture : rien n’est parti.`,
				geste: {
					libelle: 'La relire',
					faire: () =>
						void navigate({
							to: '/app/dossier/$id',
							params: { id: creanceId },
							search: { ouvrir: 'courriers' } as never
						})
				}
			});
			return;
		}
		dire({
			titre: 'Lettre non préparée',
			texte: resultat?.refus ?? 'Je n’ai pas pu composer la lettre de ce dossier.',
			humeur: 'attention'
		});
	}

	/** Poser un rappel : ce jour-là, le dossier remonte dans « Aujourd'hui ». */
	async function rappeler(creanceId: string, client: string, rappelLe: string) {
		const entreeId = await noter({
			creanceId: creanceId as Id<'creances'>,
			genre: 'RAPPEL',
			texte: 'Revenir sur ce dossier',
			rappelLe
		});
		dire({
			titre: 'Rappel posé',
			texte: `C’est noté : le ${dateCourte(rappelLe)}, je vous remets ${client} sous les yeux dans Aujourd’hui.`,
			geste: annuler(effacerLaNote(entreeId, 'Rappel annulé')),
			dureeMs: DUREE_POUR_ANNULER_MS
		});
	}

	/**
	 * NOTER UNE PROMESSE — et dire ce qu'elle change : les relances se taisent
	 * jusqu'à son jour (`parole.ts`).
	 *
	 * ⚠️ LE MONTANT PASSE PAR `depuisEuros`, JAMAIS PAR `Number` : toute la chaîne
	 * est en centimes entiers. Un montant illisible se refuse en le disant.
	 */
	async function promettre(creanceId: string, client: string, montantEuros: string, le: string) {
		try {
			const montant = enCentimes(depuisEuros(montantEuros));
			const entreeId = await noter({
				creanceId: creanceId as Id<'creances'>,
				genre: 'PROMESSE',
				texte: 'Promesse de paiement',
				montantPromis: montant,
				promisPourLe: le
			});
			dire({
				titre: 'Promesse notée',
				texte: `C’est noté : ${client} paiera ${eurosCentimes(montant)} le ${dateCourte(le)}. Je ne le relance pas d’ici là.`,
				geste: annuler(effacerLaNote(entreeId, 'Promesse annulée')),
				dureeMs: DUREE_POUR_ANNULER_MS
			});
		} catch (e) {
			dire({
				titre: 'Promesse non notée',
				texte: `Je n’ai pas pu noter la promesse : ${messageDuRefus(e)}`,
				humeur: 'attention'
			});
		}
	}

	/** CONVENIR D'UN PAIEMENT EN PLUSIEURS FOIS — suivi versement par versement. */
	async function convenirEcheancier(
		creanceId: string,
		client: string,
		nombre: number,
		premiereLe: string
	) {
		try {
			const entreeId = await convenir({
				creanceId: creanceId as Id<'creances'>,
				nombre,
				premiereLe,
				intervalleMois: 1
			});
			dire({
				titre: `Paiement en ${nombre} fois convenu`,
				texte: `Paiement en ${nombre} fois convenu, premier versement le ${dateCourte(premiereLe)}. Tant que les versements arrivent, je ne relance pas ${client}.`,
				geste: annuler(effacerLaNote(entreeId, 'Paiement en plusieurs fois annulé')),
				dureeMs: DUREE_POUR_ANNULER_MS
			});
		} catch (e) {
			dire({
				titre: 'Échéancier non convenu',
				texte: `Je n’ai pas pu noter ce paiement en plusieurs fois : ${messageDuRefus(e)}`,
				humeur: 'attention'
			});
		}
	}

	/** ARRÊTER UN ÉCHÉANCIER — il reste dans l'historique ; le plan reprend. */
	async function arreterEcheancier(entreeId: string) {
		try {
			await arreter({ entreeId: entreeId as Id<'suiviDossier'> });
			dire({
				titre: 'Échéancier arrêté',
				texte:
					'Échéancier arrêté. Il reste dans l’historique, et je reprends le plan de relance à ma prochaine veille.'
			});
		} catch (e) {
			dire({
				titre: 'Échéancier non arrêté',
				texte: `Je n’ai pas pu arrêter l’échéancier : ${messageDuRefus(e)}`,
				humeur: 'attention'
			});
		}
	}

	/** CLASSER UN DOSSIER — rien n'est effacé ; il se rouvre d'un toucher. */
	async function classer(
		creanceId: string,
		motif: 'GESTE_COMMERCIAL' | 'IRRECOUVRABLE' | 'ERREUR' | 'AUTRE',
		note?: string
	): Promise<boolean> {
		try {
			await classerLeDossier({
				creanceId: creanceId as Id<'creances'>,
				motif,
				...(note === undefined ? {} : { note })
			});
			dire({
				titre: 'Dossier classé',
				texte: 'Dossier classé : j’arrête ses relances, et il quitte vos alertes.',
				geste: annuler(() => rouvrir(creanceId)),
				dureeMs: DUREE_POUR_ANNULER_MS
			});
			return true;
		} catch (e) {
			dire({
				titre: 'Dossier non classé',
				texte: `Je n’ai pas pu classer ce dossier : ${messageDuRefus(e)}`,
				humeur: 'attention'
			});
			return false;
		}
	}

	async function rouvrir(creanceId: string) {
		try {
			await rouvrirLeDossier({ creanceId: creanceId as Id<'creances'> });
			dire({
				titre: 'Dossier rouvert',
				texte: 'Dossier rouvert : il reprend sa place, et je reprends son plan de relance.'
			});
		} catch (e) {
			dire({
				titre: 'Dossier non rouvert',
				texte: `Je n’ai pas pu rouvrir ce dossier : ${messageDuRefus(e)}`,
				humeur: 'attention'
			});
		}
	}

	return { relancer, rappeler, promettre, convenirEcheancier, arreterEcheancier, classer, rouvrir };
}
