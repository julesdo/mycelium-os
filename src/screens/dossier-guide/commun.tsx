import { useState, type ReactNode } from 'react';
import {
	BoutonDeReponse,
	RangeeDeReponses,
	ReponseDePlume,
	messageDuRefus,
	type CanalDEchange,
	type ChoixCourrierAffiche,
	type MotifClassement
} from '../../ui';
import type { DossierPourLesIntentions } from './intentions';

/**
 * CE QUE PARTAGENT LES CONVERSATIONS D'UN DOSSIER — ce qu'elles savent, les gestes
 * qu'elles font, et leur fin (22/10/2026).
 *
 * ⚠️ TOUT ARRIVE EN PROPRIÉTÉS, et chaque geste est une promesse : la salle
 * d'exposition joue ces conversations sans backend, comme celle du démarrage.
 */

/** Ce que la conversation sait du dossier. */
export interface DossierDuGuide {
	readonly client: string;
	readonly aujourdHui: string;
	/** Ce qui reste dû sur les factures, hors pénalités : le montant proposé d'office. */
	readonly resteDu: bigint;
	/** Un paiement en plusieurs fois peut se convenir (il reste dû, aucun ne court). */
	readonly echeancierPossible: boolean;
	/**
	 * Plume relance ce client selon le plan. Faux en procédure collective, pour une
	 * entreprise radiée, ou quand le gérant le garde en main : ce que Plume dit après
	 * une contestation ne promet pas une relance qui ne partira pas.
	 */
	readonly relanceParPlume: boolean;
	/** L'accord écrit s'applique à ce client (pas en procédure collective ni radié). */
	readonly accordPossible: boolean;
	readonly pourLesIntentions: DossierPourLesIntentions;
}

/** Défaire un geste qu'on vient de faire : une note s'efface, un dossier classé se rouvre. */
export type Annulation = () => Promise<void>;

/**
 * LES GESTES DE LA CONVERSATION — chacun rend de quoi l'annuler, ou lève un refus
 * lisible (`ConvexError`), que la conversation dit dans le fil.
 */
export interface GestesDuGuide {
	readonly promettre: (p: { readonly montant: bigint; readonly le: string }) => Promise<Annulation>;
	readonly convenirEcheancier: (c: {
		readonly nombre: number;
		readonly premiereLe: string;
	}) => Promise<Annulation>;
	/** Une contestation est un FAIT du dossier, jamais un verrou : rien ne s'arrête. */
	readonly noterContestation: (c: {
		readonly canal: CanalDEchange;
		readonly texte: string;
	}) => Promise<void>;
	/** Une note dans l'historique ; un échange quand on sait par quel canal. */
	readonly noter: (n: {
		readonly texte: string;
		readonly canal?: CanalDEchange;
	}) => Promise<Annulation>;
	readonly rappeler: (r: { readonly le: string; readonly texte: string }) => Promise<Annulation>;
	readonly classer: (c: {
		readonly motif: MotifClassement;
		readonly note?: string;
	}) => Promise<Annulation>;

	/* ── Les courriers : rien ne part sans le gérant (ligne rouge n° 1) ──── */
	/** Composer un courrier et le poser à valider. Rend l'identifiant de l'envoi. */
	readonly preparerCourrier: (choix: ChoixCourrierAffiche) => Promise<string>;
	/** Valider, c'est figer le texte. `A_RELIRE` : le dossier a changé, le texte aussi. */
	readonly validerCourrier: (envoiId: string) => Promise<'VALIDE' | 'A_RELIRE'>;
	/** Le jour du départ, celui qui compte ; et un rappel au jour où le délai expire. */
	readonly declarerParti: (envoiId: string, partiLe: string, avecRappel: boolean) => Promise<void>;
	readonly abandonnerCourrier: (envoiId: string) => Promise<void>;
	/** Retenir une relance que Plume a programmée : elle ne part pas, le client sort du pilote. */
	readonly retenirRelance: (envoiId: string) => Promise<void>;
}

/** Ce que reçoit chaque conversation d'un geste. */
export interface PropsDuFil {
	readonly dossier: DossierDuGuide;
	readonly gestes: GestesDuGuide;
	/** Le nom du geste, en tête de la page : « Il m'a répondu ». */
	readonly titre: string;
	/**
	 * « Que voulez-vous faire ? » et sa réponse, en tête du fil. Verrouillée quand le
	 * travail est lancé : on ne change plus de geste pendant qu'il se fait.
	 */
	readonly prelude: (verrouille: boolean) => ReactNode;
	readonly onFermer: () => void;
	/** Revenir à « Que voulez-vous faire ? », pour enchaîner un autre geste. */
	readonly onAutreChose: () => void;
}

/** Ce qu'il advient d'un « Annuler » touché à la fin d'une conversation. */
export type EtatDAnnulation = 'pret' | 'enCours' | 'fait' | { readonly erreur: string };

export function useAnnulation() {
	const [etat, setEtat] = useState<EtatDAnnulation>('pret');
	function annuler(annulation: Annulation) {
		setEtat('enCours');
		annulation().then(
			() => setEtat('fait'),
			(e: unknown) => setEtat({ erreur: messageDuRefus(e) })
		);
	}
	return { etat, annuler };
}

/** Ce que Plume dit d'un « Annuler », dans le fil. */
export function MotDAnnulation({ etat }: { readonly etat: EtatDAnnulation }) {
	if (etat === 'pret' || etat === 'enCours') return null;
	return etat === 'fait' ? (
		<ReponseDePlume texte="C’est annulé : comme si rien n’avait été fait." />
	) : (
		<ReponseDePlume humeur="attention" texte={`Je n’ai pas pu l’annuler : ${etat.erreur}`} />
	);
}

/**
 * LA FIN D'UNE CONVERSATION : revenir au dossier (le seul bouton plein), annuler quand
 * le geste se défait, et enchaîner un autre geste.
 */
export function ReponsesDeFin({
	annulation,
	etat,
	onAnnuler,
	onFermer,
	onAutreChose,
	avant
}: {
	readonly annulation: Annulation | null;
	readonly etat: EtatDAnnulation;
	readonly onAnnuler: (annulation: Annulation) => void;
	readonly onFermer: () => void;
	readonly onAutreChose: () => void;
	/** Une suite propre à ce geste, au-dessus : « Préparer l'accord écrit ». */
	readonly avant?: ReactNode;
}) {
	const annulable = annulation !== null && (etat === 'pret' || etat === 'enCours');
	return (
		<>
			{avant}
			<BoutonDeReponse principal libelle="Revenir au dossier" onClick={onFermer} />
			<RangeeDeReponses>
				{annulable ? (
					<BoutonDeReponse
						libelle="Annuler"
						enCours={etat === 'enCours'}
						onClick={() => onAnnuler(annulation)}
					/>
				) : null}
				<BoutonDeReponse libelle="Autre chose" onClick={onAutreChose} />
			</RangeeDeReponses>
		</>
	);
}

/** Un refus du serveur, dit par Plume : rien n'a été fait, on peut réessayer. */
export function RefusDuGeste({ erreur }: { readonly erreur: string | null }) {
	if (erreur === null) return null;
	return (
		<ReponseDePlume
			humeur="attention"
			texte={`${erreur} Rien n’a été fait : vous pouvez réessayer.`}
		/>
	);
}
