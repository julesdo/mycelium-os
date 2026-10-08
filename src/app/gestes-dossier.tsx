import { useMutation } from 'convex/react';
import { useToast } from '@cladd-ui/react';
import { AlarmClockIcon, SendIcon } from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { Lien, dateCourte } from '../ui';

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

export function useGestesDeDossier() {
	const preparerEnLot = useMutation(api.recouvrement.envois.preparerEnLot);
	const noter = useMutation(api.recouvrement.suivi.noter);
	const toast = useToast();

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
			toast({
				title: 'Lettre préparée',
				text: (
					<>
						Elle attend votre relecture. Rien n’est parti.{' '}
						<Lien
							to="/app/dossier/$id"
							params={{ id: creanceId }}
							search={{ ouvrir: 'courriers' }}
							className="font-medium text-cladd-primary underline underline-offset-2"
						>
							Relire la lettre de {client}
						</Lien>
					</>
				),
				icon: SendIcon
			});
			return;
		}
		toast({
			title: 'Lettre non préparée',
			text: resultat?.refus ?? 'Ce dossier n’a pas pu être composé.'
		});
	}

	/** Poser un rappel : ce jour-là, le dossier remonte dans « Aujourd'hui ». */
	async function rappeler(creanceId: string, client: string, rappelLe: string) {
		await noter({
			creanceId: creanceId as Id<'creances'>,
			genre: 'RAPPEL',
			texte: 'Revenir sur ce dossier',
			rappelLe
		});
		toast({
			title: 'Rappel posé',
			text: (
				<>
					Le {dateCourte(rappelLe)}, le dossier de {client} remontera dans Aujourd’hui.{' '}
					<Lien
						to="/app/dossier/$id"
						params={{ id: creanceId }}
						search={{ ouvrir: 'suivi' }}
						className="font-medium text-cladd-primary underline underline-offset-2"
					>
						Voir l’historique
					</Lien>
				</>
			),
			icon: AlarmClockIcon
		});
	}

	return { relancer, rappeler };
}
