import { useMutation } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import type { GestesDuGuide } from '../screens/dossier-guide/commun';

/**
 * LES GESTES DE LA CONVERSATION D'UN DOSSIER, BRANCHÉS (22/10/2026).
 *
 * ⚠️ PAS CEUX DES CARTES BALAYÉES (`gestes-dossier.tsx`). Ceux-là se confirment par
 * un mot de Plume, en bas de l'écran, avec « Annuler » ; ici, c'est la conversation
 * qui dit ce qui est fait, dans son fil, et qui propose d'annuler. Chaque geste rend
 * donc de quoi le défaire, et LÈVE son refus, que le fil dit tel quel.
 *
 * ⚠️ LES MONTANTS ARRIVENT EN CENTIMES ENTIERS : la conversation les a lus avec
 * `centimesDe`, jamais avec `Number`.
 */
export function useGestesDuGuide(creanceId: Id<'creances'>, aujourdHui: string): GestesDuGuide {
	const noter = useMutation(api.recouvrement.suivi.noter);
	const effacer = useMutation(api.recouvrement.suivi.effacer);
	const convenir = useMutation(api.recouvrement.parole.convenirEcheancier);
	const declarerFait = useMutation(api.recouvrement.creances.declarerFait);
	const classerLeDossier = useMutation(api.recouvrement.classement.classer);
	const rouvrirLeDossier = useMutation(api.recouvrement.classement.rouvrir);

	/** Défaire une note qu'on vient de poser : elle s'efface vraiment. */
	const effacerLaNote = (entreeId: Id<'suiviDossier'>) => async () => {
		await effacer({ entreeId });
	};

	return {
		promettre: async ({ montant, le }) =>
			effacerLaNote(
				await noter({
					creanceId,
					genre: 'PROMESSE',
					texte: 'Promesse de paiement',
					montantPromis: montant,
					promisPourLe: le
				})
			),
		convenirEcheancier: async ({ nombre, premiereLe }) =>
			effacerLaNote(await convenir({ creanceId, nombre, premiereLe, intervalleMois: 1 })),
		/*
		  ⚠️ UNE CONTESTATION EST UN FAIT, PAS UN VERROU. Écrite, elle répond à la
		  question du dossier (« avez-vous reçu une contestation écrite ? ») ; dans tous
		  les cas, ce qu'il a dit va à l'historique. Rien ne s'arrête.
		*/
		noterContestation: async ({ canal, texte }) => {
			if (canal !== 'APPEL' && canal !== 'VISITE') {
				await declarerFait({ creanceId, cle: 'CONTESTATION_ECRITE', reponse: 'OUI' });
			}
			await noter({ creanceId, genre: 'ECHANGE', texte, canal, survenuLe: aujourdHui });
		},
		noter: async ({ texte, canal }) =>
			effacerLaNote(
				await noter(
					canal === undefined
						? { creanceId, genre: 'NOTE', texte }
						: { creanceId, genre: 'ECHANGE', texte, canal, survenuLe: aujourdHui }
				)
			),
		rappeler: async ({ le, texte }) =>
			effacerLaNote(await noter({ creanceId, genre: 'RAPPEL', texte, rappelLe: le })),
		classer: async ({ motif, note }) => {
			await classerLeDossier({ creanceId, motif, ...(note === undefined ? {} : { note }) });
			return async () => {
				await rouvrirLeDossier({ creanceId });
			};
		}
	};
}
