import { useState } from 'react';
import {
	CadreGuide,
	Echange,
	ListeDeReponses,
	PleinEcran,
	ReponseDePlume,
	choixDeLAccord,
	type LiensDePaiementAffiches,
	type ModeleCourrierAffiche
} from '../../ui';
import type { SectionCreance } from '../sections-creance';
import type { DossierDuGuide, GestesDuGuide, PropsDuFil } from './commun';
import { FilClassement } from './fil-classement';
import { FilConseil, type DefenseDuGuide } from './fil-conseil';
import { FilEcrire, type LettresDuGuide } from './fil-ecrire';
import { FilLien } from './fil-lien';
import { FilQuestions, type QuestionsDuGuide } from './fil-questions';
import { FilEtape, FilProcedure, type ProcedureDuGuide } from './fil-procedure';
import { FilPromesse, type PromesseAVerifier } from './fil-promesse';
import { FilRappelDuJour, type RappelDuJour } from './fil-rappel-du-jour';
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
const GUIDEES: readonly IntentionDuDossier[] = [
	'ECRIRE',
	'LIEN',
	'RELIRE',
	'REPONSE',
	'QUESTIONS',
	'RAPPEL',
	'CONSEIL',
	'CLASSER',
	'PROMESSE',
	'RAPPEL_DU_JOUR',
	'PROCEDURE',
	'ETAPE'
];

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
	voieDepart = null,
	reponseDepart = null,
	lettreAuDepart = null,
	onFermer,
	dossier,
	gestes,
	lettres,
	questions,
	defense,
	attentes,
	procedure,
	paiement,
	sorties
}: {
	readonly ouverte: boolean;
	/** Le geste déjà choisi à l'ouverture (une réponse de la carte de Plume), ou rien. */
	readonly depart: IntentionDuDossier | null;
	/** Le courrier à relire, quand on l'a touché dans la liste des courriers. */
	readonly envoiDepart?: string | null;
	/** La démarche déjà choisie, quand on vient de sa fiche (« Je l'ai engagée »). */
	readonly voieDepart?: string | null;
	/** La réponse déjà donnée sur la carte de Plume ; elle ne vaut qu'au premier tour. */
	readonly reponseDepart?: string | null;
	/** La lettre déjà choisie et remplie quand on arrive (l'accord écrit, depuis l'échéancier). */
	readonly lettreAuDepart?: {
		readonly modele: ModeleCourrierAffiche;
		readonly titre: string;
	} | null;
	/** Ce qui attend le gérant : sa promesse arrivée à son jour, un rappel du jour. */
	readonly attentes: {
		readonly promesse: PromesseAVerifier | null;
		readonly rappel: RappelDuJour | null;
	};
	/** Les démarches du dossier : celles qu'on peut déclarer, celle qui est engagée. */
	readonly procedure: ProcedureDuGuide;
	/** Sa page de paiement : les liens ouverts, leur adresse, l'e-mail qui les porte. */
	readonly paiement: Pick<LiensDePaiementAffiches, 'liens' | 'adresseDe' | 'courriel'>;
	readonly onFermer: () => void;
	readonly dossier: DossierDuGuide;
	readonly gestes: GestesDuGuide;
	/** Les courriers et les e-mails du dossier, en direct : un courrier change sous nos yeux. */
	readonly lettres: LettresDuGuide;
	/** Les faits et les conditions que le gérant seul peut dire, en direct. */
	readonly questions: QuestionsDuGuide;
	/** Les professionnels du dossier et l'annuaire du parcours du choix. */
	readonly defense: DefenseDuGuide;
	readonly sorties: SortiesDeLaConversation;
}) {
	const [intention, setIntention] = useState<IntentionDuDossier | null>(depart);
	/* Le courrier à relire, quand la conversation enchaîne depuis sa préparation. */
	const [envoiId, setEnvoiId] = useState<string | null>(envoiDepart);
	/*
	  L'ACCORD ÉCRIT APRÈS UN PAIEMENT EN PLUSIEURS FOIS (23/10/2026) : la conversation
	  enchaîne sur « Le relancer », la lettre déjà choisie et remplie du calendrier,
	  au lieu de fermer pour ouvrir les courriers de la page.
	*/
	const [lettreDepart, setLettreDepart] = useState<{
		readonly modele: ModeleCourrierAffiche;
		readonly titre: string;
	} | null>(lettreAuDepart);
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
		setLettreDepart(null);
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
						: intention === 'ECRIRE' && lettreDepart !== null
							? lettreDepart.titre
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
					onAccordEcrit={(calendrier: { nombre: number; premiereLe: string }) => {
						lettres.courriers.onChoisir(
							choixDeLAccord(lettres.courriers, {
								nombre: calendrier.nombre,
								premiereEcheance: calendrier.premiereLe,
								intervalleMois: 1
							})
						);
						setLettreDepart({
							modele: 'ACCORD_ECHEANCIER',
							titre:
								lettres.courriers.modeles.find((m) => m.cle === 'ACCORD_ECHEANCIER')?.titre ??
								'Accord d’échéancier'
						});
						setIntention('ECRIRE');
						setTour((t) => t + 1);
					}}
				/>
			) : intention === 'ECRIRE' ? (
				<FilEcrire
					key={tour}
					{...commun}
					titre={lettreDepart === null ? titre : lettreDepart.titre}
					lettres={lettres}
					onRelire={relire}
					{...(lettreDepart === null ? {} : { lettreDepart })}
				/>
			) : intention === 'LIEN' ? (
				<FilLien
					key={tour}
					{...commun}
					titre={titre}
					paiement={paiement}
					{...(lettres.debiteurEmail === undefined ? {} : { debiteurEmail: lettres.debiteurEmail })}
				/>
			) : intention === 'RELIRE' ? (
				<FilRelire
					key={tour}
					{...commun}
					titre={titre}
					lettres={lettres}
					envoiId={envoiId}
					onRelire={relire}
				/>
			) : intention === 'QUESTIONS' ? (
				<FilQuestions key={tour} {...commun} titre={titre} questions={questions} />
			) : intention === 'PROMESSE' && attentes.promesse !== null ? (
				<FilPromesse
					key={tour}
					{...commun}
					titre={titre}
					promesse={attentes.promesse}
					{...(tour === 0 && (reponseDepart === 'OUI' || reponseDepart === 'NON')
						? { reponseDepart }
						: {})}
					onFiche={() => {
						onFermer();
						sorties.onNoterUnReglement();
					}}
				/>
			) : intention === 'RAPPEL_DU_JOUR' && attentes.rappel !== null ? (
				<FilRappelDuJour
					key={tour}
					{...commun}
					titre={titre}
					rappel={attentes.rappel}
					plusTardAuDepart={tour === 0 && reponseDepart === 'PLUS_TARD'}
				/>
			) : intention === 'PROCEDURE' ? (
				<FilProcedure
					key={tour}
					{...commun}
					titre={titre}
					procedure={procedure}
					defense={defense}
					voieDepart={voieDepart}
				/>
			) : intention === 'ETAPE' ? (
				<FilEtape key={tour} {...commun} titre={titre} procedure={procedure} />
			) : intention === 'CONSEIL' ? (
				<FilConseil key={tour} {...commun} titre={titre} defense={defense} />
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
				>
					<Echange question={question} />
					{/*
					  ⚠️ LA LISTE EST DANS LE FIL, PAS SOUS LE POUCE (23/10/2026). Neuf réponses
					  prenaient 555 px sur un écran de 667 dans la zone collée en bas, et un
					  écran plus petit n'aurait pas pu les faire défiler : une zone collante plus
					  haute que l'écran ne défile pas. Dans le fil, elle défile avec la page.
					*/}
					<ListeDeReponses
						choix={intentions.map((i) => ({
							cle: i,
							...libelleDIntention(i, dossier.pourLesIntentions),
							onClick: () => choisir(i)
						}))}
					/>
				</CadreGuide>
			)}
		</PleinEcran>
	);
}
