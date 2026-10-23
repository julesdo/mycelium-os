import { useConvex, useMutation } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import type { GestesDuGuide } from '../screens/dossier-guide/commun';
import type { ChoixCourrierAffiche } from '../ui';

/** Les choix d'un courrier, tels que Convex les attend : un professionnel est un identifiant. */
export function versConvex(choix: ChoixCourrierAffiche) {
	if (choix.modele === 'TRANSMISSION_AVOCAT' || choix.modele === 'DEMANDE_SIGNIFICATION') {
		return { ...choix, intervenantId: choix.intervenantId as Id<'intervenants'> | null };
	}
	return choix;
}

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
export function useGestesDuGuide(
	creanceId: Id<'creances'>,
	debiteurId: string | null,
	aujourdHui: string
): GestesDuGuide {
	const convex = useConvex();
	const noter = useMutation(api.recouvrement.suivi.noter);
	const effacer = useMutation(api.recouvrement.suivi.effacer);
	const convenir = useMutation(api.recouvrement.parole.convenirEcheancier);
	const declarerFait = useMutation(api.recouvrement.creances.declarerFait);
	const classerLeDossier = useMutation(api.recouvrement.classement.classer);
	const rouvrirLeDossier = useMutation(api.recouvrement.classement.rouvrir);
	const preparer = useMutation(api.recouvrement.envois.preparer);
	const valider = useMutation(api.recouvrement.envois.valider);
	const partir = useMutation(api.recouvrement.envois.declarerParti);
	const abandonner = useMutation(api.recouvrement.envois.abandonner);
	const retenir = useMutation(api.recouvrement.pilote.retenir);
	const repondre = useMutation(api.recouvrement.creances.repondre);
	const remettreLeDossier = useMutation(api.recouvrement.conseil.remettreLeDossier);
	const designer = useMutation(api.recouvrement.apresProcedure.designerIntervenant);
	const personne = useMutation(api.recouvrement.apresProcedure.aucunIntervenant);
	const appliquer = useMutation(api.recouvrement.lettrage.appliquer);
	const repartir = useMutation(api.recouvrement.lettrage.appliquerRepartition);
	const trancher = useMutation(api.recouvrement.suivi.trancherPromesse);
	const rappelFait = useMutation(api.recouvrement.suivi.rappelFait);
	const engager = useMutation(api.recouvrement.apresProcedure.engagerProcedure);
	const consigner = useMutation(api.recouvrement.apresProcedure.consignerEvenement);

	/** Un paiement se rapproche des factures d'UN client : sans lui, rien ne se rapproche. */
	const client = () => {
		if (debiteurId === null) throw new Error('Le client du dossier n’est pas encore chargé.');
		return debiteurId as Id<'debiteurs'>;
	};

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
		},
		declarerFait: async (cle, reponse) => {
			await declarerFait({ creanceId, cle: cle as 'CONTESTATION_ECRITE', reponse });
		},
		repondreCondition: async (condition, reponse) => {
			await repondre({ creanceId, reponses: { [condition]: reponse } });
		},
		remettre: async ({ remisLe, intervenantId }) => {
			await remettreLeDossier({
				creanceId,
				remisLe,
				...(intervenantId === undefined
					? {}
					: { intervenantId: intervenantId as Id<'intervenants'> })
			});
		},
		/* Ceux qui manquent s'ajoutent, ceux qui n'y sont plus se retirent ; vide : moi-même. */
		nommer: async (ids, avant) => {
			if (ids.length === 0) {
				await personne({ creanceId });
				return;
			}
			for (const id of avant.filter((a) => !ids.includes(a))) {
				await designer({ creanceId, intervenantId: id as Id<'intervenants'>, designe: false });
			}
			for (const id of ids.filter((i) => !avant.includes(i))) {
				await designer({ creanceId, intervenantId: id as Id<'intervenants'>, designe: true });
			}
		},
		proposerReglement: async (montant) =>
			await convex.query(api.recouvrement.lettrage.proposer, { debiteurId: client(), montant }),
		/*
		  ⚠️ LA RÉPARTITION EST RECALCULÉE PAR LE SERVEUR, jamais reçue de l'écran : entre
		  la proposition et le geste, un autre règlement a pu arriver (`appliquerRepartition`).
		*/
		noterReglement: async ({ montant, date, references }) => {
			if (references === undefined) await repartir({ debiteurId: client(), montant, date });
			else await appliquer({ debiteurId: client(), references: [...references], montant, date });
		},
		trancherPromesse: async (noteId, issue) => {
			await trancher({ entreeId: noteId as Id<'suiviDossier'>, issue });
		},
		rappelFait: async (noteId) => {
			await rappelFait({ entreeId: noteId as Id<'suiviDossier'>, faitLe: aujourdHui });
		},
		/*
		  ⚠️ LE LOGICIEL N'ENGAGE PAS, IL ENREGISTRE (ligne rouge n° 3). L'intervenant ne
		  se rattache que s'il a été DIT : un silence n'est pas un « moi-même ».
		*/
		declarerProcedure: async (procedure, engageeLe, choix) => {
			await engager({ creanceId, procedure, engageeLe });
			if (choix === null) return;
			if (choix.ids.length === 0) await personne({ creanceId });
			for (const id of choix.ids) {
				await designer({ creanceId, intervenantId: id as Id<'intervenants'>, designe: true });
			}
		},
		consigner: async (cle, survenuLe) => {
			await consigner({ creanceId, cle, survenuLe });
		},
		preparerCourrier: async (choix) => await preparer({ creanceId, choix: versConvex(choix) }),
		validerCourrier: async (envoiId) => await valider({ envoiId: envoiId as Id<'envois'> }),
		declarerParti: async (envoiId, partiLe, avecRappel) => {
			await partir({ envoiId: envoiId as Id<'envois'>, partiLe, avecRappel });
		},
		abandonnerCourrier: async (envoiId) => {
			await abandonner({ envoiId: envoiId as Id<'envois'> });
		},
		retenirRelance: async (envoiId) => {
			await retenir({ envoiId: envoiId as Id<'envois'> });
		}
	};
}
