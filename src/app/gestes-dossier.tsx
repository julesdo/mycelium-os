import type { ReactNode } from 'react';
import { useMutation } from 'convex/react';
import { useToast } from '@cladd-ui/react';
import { AlarmClockIcon, CalendarCheckIcon, HandshakeIcon, SendIcon } from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { depuisEuros, enCentimes } from '../lib/socle/montants';
import { Lien, dateCourte, eurosCentimes } from '../ui';

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
 * longtemps que les autres (cinq secondes par défaut).
 */
const DUREE_POUR_ANNULER_MS = 8000;

/**
 * « ANNULER », DANS LE MOT QUI CONFIRME (09/10/2026, sur Gmail, Fiverr et
 * LinkedIn) : un geste fait d'un toucher se défait d'un toucher. Une seule fois :
 * le mot reste affiché après l'annulation, et un second appui ne referait rien.
 */
function avecAnnuler(texte: ReactNode, defaire: () => Promise<void>): ReactNode {
	let fait = false;
	return (
		<>
			{texte}{' '}
			{/* Un lien d'action dans la phrase, comme « Voir l'historique » à côté de lui. */}
			<button
				type="button"
				className="font-medium text-cladd-primary underline underline-offset-2"
				onClick={() => {
					if (fait) return;
					fait = true;
					void defaire();
				}}
			>
				Annuler
			</button>
		</>
	);
}

export function useGestesDeDossier() {
	const preparerEnLot = useMutation(api.recouvrement.envois.preparerEnLot);
	const noter = useMutation(api.recouvrement.suivi.noter);
	const convenir = useMutation(api.recouvrement.parole.convenirEcheancier);
	const arreter = useMutation(api.recouvrement.parole.arreterEcheancier);
	const classerLeDossier = useMutation(api.recouvrement.classement.classer);
	const rouvrirLeDossier = useMutation(api.recouvrement.classement.rouvrir);
	const effacer = useMutation(api.recouvrement.suivi.effacer);
	const toast = useToast();

	/** Défaire une note qu'on vient de poser : elle s'efface vraiment (`suivi.effacer`). */
	function effacerLaNote(entreeId: Id<'suiviDossier'>, titre: string) {
		return async () => {
			try {
				await effacer({ entreeId });
				toast({ title: titre, text: 'C’est comme si rien n’avait été noté.' });
			} catch (e) {
				toast({ title: 'Pas annulé', text: messageDuRefus(e) });
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
		const entreeId = await noter({
			creanceId: creanceId as Id<'creances'>,
			genre: 'RAPPEL',
			texte: 'Revenir sur ce dossier',
			rappelLe
		});
		toast({
			title: 'Rappel posé',
			text: avecAnnuler(
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
				</>,
				effacerLaNote(entreeId, 'Rappel annulé')
			),
			icon: AlarmClockIcon,
			timeout: DUREE_POUR_ANNULER_MS
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
			toast({
				title: 'Promesse notée',
				text: avecAnnuler(
					`${client} paiera ${eurosCentimes(montant)} le ${dateCourte(le)}. Je ne le relance pas d’ici là.`,
					effacerLaNote(entreeId, 'Promesse annulée')
				),
				icon: HandshakeIcon,
				timeout: DUREE_POUR_ANNULER_MS
			});
		} catch (e) {
			toast({ title: 'Promesse non notée', text: messageDuRefus(e) });
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
			toast({
				title: `Paiement en ${nombre} fois convenu`,
				text: avecAnnuler(
					`Premier versement le ${dateCourte(premiereLe)}. Tant que les versements arrivent, je ne relance pas ${client}.`,
					effacerLaNote(entreeId, 'Paiement en plusieurs fois annulé')
				),
				icon: CalendarCheckIcon,
				timeout: DUREE_POUR_ANNULER_MS
			});
		} catch (e) {
			toast({ title: 'Échéancier non convenu', text: messageDuRefus(e) });
		}
	}

	/** ARRÊTER UN ÉCHÉANCIER — il reste dans l'historique ; le plan reprend. */
	async function arreterEcheancier(entreeId: string) {
		try {
			await arreter({ entreeId: entreeId as Id<'suiviDossier'> });
			toast({
				title: 'Échéancier arrêté',
				text: 'Il reste dans l’historique. Les relances du plan reprennent à la prochaine veille.'
			});
		} catch (e) {
			toast({ title: 'Échéancier non arrêté', text: messageDuRefus(e) });
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
			toast({
				title: 'Dossier classé',
				text: avecAnnuler(
					'Les relances s’arrêtent, et il quitte vos alertes.',
					() => rouvrir(creanceId)
				),
				timeout: DUREE_POUR_ANNULER_MS
			});
			return true;
		} catch (e) {
			toast({ title: 'Dossier non classé', text: messageDuRefus(e) });
			return false;
		}
	}

	async function rouvrir(creanceId: string) {
		try {
			await rouvrirLeDossier({ creanceId: creanceId as Id<'creances'> });
			toast({
				title: 'Dossier rouvert',
				text: 'Il reprend sa place, et le plan de relance aussi.'
			});
		} catch (e) {
			toast({ title: 'Dossier non rouvert', text: messageDuRefus(e) });
		}
	}

	return { relancer, rappeler, promettre, convenirEcheancier, arreterEcheancier, classer, rouvrir };
}
