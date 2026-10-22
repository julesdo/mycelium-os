import { useState } from 'react';
import { CadreGuide, Echange, ListeDeReponses, PleinEcran, ReponseDePlume } from '../../ui';
import type { SectionCreance } from '../sections-creance';
import type { DossierDuGuide, GestesDuGuide, PropsDuFil } from './commun';
import { FilClassement } from './fil-classement';
import { FilEcrire, type LettresDuGuide } from './fil-ecrire';
import { FilRelire } from './fil-relire';
import { FilRappel } from './fil-rappel';
import { FilReponse } from './fil-reponse';
import { intentionsDuDossier, libelleDIntention, type IntentionDuDossier } from './intentions';

/**
 * LA CONVERSATION DU DOSSIER — « Que voulez-vous faire ? », puis le geste, guidé
 * comme le démarrage (22/10/2026, `docs/superpowers/specs/2026-10-22-dossier-guide.md`).
 *
 * Elle s'ouvre par-dessus la page du dossier, et la croix y ramène. Les réponses de
 * la carte de Plume l'ouvrent DÉJÀ RÉPONDUE à sa première question : la bulle
 * « Il m'a répondu » est là, avec son crayon, et l'on peut encore changer de geste.
 *
 * ⚠️ UN GESTE QUI A DÉJÀ SON PARCOURS N'EN A PAS DEUX. Ajouter un document ouvre le
 * dépôt au coffre, le même partout ; parler à Plume ouvre sa conversation libre. Les
 * gestes qui ne sont pas encore une conversation ouvrent leur rubrique de la page.
 */

/** Les gestes qui se font dans la conversation ; les autres mènent à leur parcours. */
const GUIDEES: readonly IntentionDuDossier[] = ['ECRIRE', 'RELIRE', 'REPONSE', 'RAPPEL', 'CLASSER'];

export function estGuidee(intention: IntentionDuDossier): boolean {
	return GUIDEES.includes(intention);
}

export interface SortiesDeLaConversation {
	/** Une rubrique de la page, pour un geste qui n'est pas encore une conversation. */
	readonly onOuvrirRubrique: (cle: SectionCreance) => void;
	readonly onAjouterDocument: () => void;
	readonly onDemanderAPlume?: () => void;
	/** La fiche du client, sa feuille « Un virement reçu » ouverte. */
	readonly onNoterUnReglement: () => void;
	/** L'accord écrit, rempli du calendrier convenu. */
	readonly onAccordEcrit?: (calendrier: { nombre: number; premiereLe: string }) => void;
}

/**
 * MÈNE UN GESTE QUI N'EST PAS UNE CONVERSATION à son parcours. Rend `false` pour un
 * geste guidé : c'est alors à la conversation de s'ouvrir.
 */
export function menerHorsConversation(
	intention: IntentionDuDossier,
	sorties: SortiesDeLaConversation
): boolean {
	switch (intention) {
		case 'ECRIRE':
		case 'RELIRE':
			sorties.onOuvrirRubrique('courriers');
			return true;
		case 'QUESTIONS':
			sorties.onOuvrirRubrique('litige');
			return true;
		case 'CONSEIL':
			sorties.onOuvrirRubrique('voies');
			return true;
		case 'DOCUMENT':
			sorties.onAjouterDocument();
			return true;
		case 'PLUME':
			sorties.onDemanderAPlume?.();
			return true;
		default:
			return false;
	}
}

export function ConversationDuDossier({
	ouverte,
	depart,
	envoiDepart = null,
	onFermer,
	dossier,
	gestes,
	lettres,
	sorties
}: {
	readonly ouverte: boolean;
	/** Le geste déjà choisi à l'ouverture (une réponse de la carte de Plume), ou rien. */
	readonly depart: IntentionDuDossier | null;
	/** Le courrier à relire, quand on l'a touché dans la liste des courriers. */
	readonly envoiDepart?: string | null;
	readonly onFermer: () => void;
	readonly dossier: DossierDuGuide;
	readonly gestes: GestesDuGuide;
	/** Les courriers et les e-mails du dossier, en direct : un courrier change sous nos yeux. */
	readonly lettres: LettresDuGuide;
	readonly sorties: SortiesDeLaConversation;
}) {
	const [intention, setIntention] = useState<IntentionDuDossier | null>(depart);
	/* Le courrier à relire, quand la conversation enchaîne depuis sa préparation. */
	const [envoiId, setEnvoiId] = useState<string | null>(envoiDepart);
	/* « Autre chose » à la fin d'un geste : la conversation repart de zéro. */
	const [tour, setTour] = useState(0);

	const intentions = intentionsDuDossier(dossier.pourLesIntentions);
	const question = (
		<ReponseDePlume texte={`Que voulez-vous faire pour le dossier de ${dossier.client} ?`} />
	);

	function choisir(choisie: IntentionDuDossier) {
		if (estGuidee(choisie)) {
			setIntention(choisie);
			return;
		}
		onFermer();
		menerHorsConversation(choisie, sorties);
	}

	function recommencer() {
		setIntention(null);
		setEnvoiId(null);
		setTour((t) => t + 1);
	}

	function relire(id: string) {
		setIntention('RELIRE');
		setEnvoiId(id);
		setTour((t) => t + 1);
	}

	const commun: Omit<PropsDuFil, 'titre'> = {
		dossier,
		gestes,
		onFermer,
		onAutreChose: recommencer,
		prelude: (verrouille) => (
			<Echange
				question={question}
				reponse={
					intention === null
						? undefined
						: libelleDIntention(intention, dossier.pourLesIntentions).titre
				}
				{...(verrouille ? {} : { onModifier: () => setIntention(null) })}
			/>
		)
	};
	const titre =
		intention === null
			? 'Le dossier'
			: libelleDIntention(intention, dossier.pourLesIntentions).titre;

	return (
		<PleinEcran ouvert={ouverte} onFermer={onFermer} libelle={`Le dossier de ${dossier.client}`}>
			{intention === 'REPONSE' ? (
				<FilReponse
					key={tour}
					{...commun}
					titre={titre}
					onNoterUnReglement={() => {
						onFermer();
						sorties.onNoterUnReglement();
					}}
					{...(sorties.onAccordEcrit === undefined
						? {}
						: {
								onAccordEcrit: (calendrier: { nombre: number; premiereLe: string }) => {
									onFermer();
									sorties.onAccordEcrit?.(calendrier);
								}
							})}
				/>
			) : intention === 'ECRIRE' ? (
				<FilEcrire key={tour} {...commun} titre={titre} lettres={lettres} onRelire={relire} />
			) : intention === 'RELIRE' ? (
				<FilRelire
					key={tour}
					{...commun}
					titre={titre}
					lettres={lettres}
					envoiId={envoiId}
					onRelire={relire}
				/>
			) : intention === 'RAPPEL' ? (
				<FilRappel key={tour} {...commun} titre={titre} />
			) : intention === 'CLASSER' ? (
				<FilClassement key={tour} {...commun} titre={titre} />
			) : (
				<CadreGuide
					titre={titre}
					sousTitre={dossier.client}
					onFermer={onFermer}
					suivi={`choix-${tour}`}
					reponses={
						<ListeDeReponses
							choix={intentions.map((i) => ({
								cle: i,
								...libelleDIntention(i, dossier.pourLesIntentions),
								onClick: () => choisir(i)
							}))}
						/>
					}
				>
					<Echange question={question} />
				</CadreGuide>
			)}
		</PleinEcran>
	);
}
