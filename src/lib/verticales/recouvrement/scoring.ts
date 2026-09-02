import {
	CONDITIONS_LEGALES,
	LIBELLE_CONDITION,
	type ClePiece,
	type ConditionLegale,
	type EtatCritere
} from './qualification';

/**
 * Le moteur de qualification — dire si une créance est mûre, et pourquoi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI EST FIGÉ, ET CE QUI EST À CALIBRER
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le brief laisse explicitement libres « la pondération, la forme du scoring,
 * l'implémentation de la détection », et précise que ce sont « des choix à
 * calibrer sur données réelles, pas à figer maintenant ». Les valeurs
 * ci-dessous sont donc des HYPOTHÈSES DE DÉPART, documentées pour être
 * discutées et déplacées — pas des vérités.
 *
 * Deux règles, en revanche, ne sont pas négociables parce que le brief les
 * énonce comme telles :
 *
 *   1. **Le doute ne profite jamais au produit.** Un critère indéterminé
 *      compte comme absent dans le score et interdit l'éligibilité. Présumer
 *      favorablement ferait engager des frais sur des dossiers qui se
 *      retourneraient.
 *
 *   2. **Une contestation, même infondée, met fin à la procédure simplifiée.**
 *      C'est le risque produit numéro un. Un signal de contestation écarte donc
 *      l'éligibilité QUEL QUE SOIT le score — un dossier parfait sur le papier
 *      et contesté dans les faits n'est pas un bon dossier.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI LE SCORE ET L'ÉLIGIBILITÉ SONT DEUX CHOSES
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le score mesure la SOLIDITÉ : conditions établies et pièces qui les
 * soutiennent. L'éligibilité est un VERDICT, qui tient compte en plus des
 * risques. Les fondre en un seul nombre ferait disparaître l'information la
 * plus utile — un dossier à 0,95 écarté pour contestation et un dossier à 0,55
 * écarté pour dossier mince appellent deux actions opposées.
 */

/** Les signaux qui annoncent une contestation. Le risque produit numéro un. */
export type SignalContestation =
	| 'RECLAMATION_ANTERIEURE'
	| 'LITIGE_DANS_ECHANGES'
	| 'AVOIR_PARTIEL_ACCORDE'
	| 'ECART_COMMANDE_FACTURE'
	| 'RECEPTION_NON_DOCUMENTEE';

export type TypeRisque =
	| SignalContestation
	| 'PROCEDURE_COLLECTIVE'
	| 'DEBITEUR_RADIE'
	| 'RETARDS_REPETES';

export type SanteDebiteur = 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';

export interface ElementsCreance {
	readonly certaine: EtatCritere;
	readonly liquide: EtatCritere;
	readonly exigible: EtatCritere;
	readonly entreCommercants: EtatCritere;
	readonly piecesFournies: readonly ClePiece[];
	readonly signauxContestation: readonly SignalContestation[];
	readonly santeDebiteur: SanteDebiteur;
	readonly retardsAnterieurs: number;
}

export interface Critere {
	readonly nom: string;
	readonly statut: EtatCritere;
	/** Ce sur quoi le statut se fonde. Aucun critère sans justification. */
	readonly preuve: string;
	readonly poids: number;
}

export interface Risque {
	readonly type: TypeRisque;
	/** Un CONSTAT. Jamais une conséquence juridique qu'on n'a pas reçue. */
	readonly description: string;
	readonly gravite: 'BLOQUANTE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
}

export interface Qualification {
	readonly eligible: boolean;
	/** 0 à 1. Mesure la solidité, pas la décision. */
	readonly score: number;
	readonly criteres: readonly Critere[];
	readonly risques: readonly Risque[];
	readonly piecesManquantes: readonly ClePiece[];
	/** Une question par critère RÉELLEMENT indéterminé, et pour eux seuls. */
	readonly questions: readonly string[];
}

/**
 * Les poids, sur un total de 20.
 *
 * LES CONDITIONS LÉGALES PÈSENT 12 SUR 20 — plus que tout le reste réuni. Ce
 * n'est pas arbitraire : sans elles, il n'y a pas de créance à recouvrer, quelle
 * que soit l'épaisseur du dossier. Les huit points restants mesurent la
 * SOLIDITÉ PROBATOIRE, et suivent la hiérarchie que le brief décrit — « une
 * facture seule est plus fragile qu'une facture adossée à un bon de commande
 * signé et un bon de livraison ».
 *
 * Commande et livraison valent 3 chacune parce qu'elles répondent aux deux
 * questions qu'un débiteur pose en premier : ai-je commandé, ai-je reçu. Les
 * CGV et la mise en demeure valent 1 : utiles, jamais décisives.
 *
 * Une facture seule vaut donc 0,6 — recevable en droit, fragile en preuve. Le
 * chiffre est volontairement inférieur au seuil : un dossier réduit à sa facture
 * part en relance amiable, pas en procédure.
 */
export const POIDS = {
	certaine: 3,
	liquide: 3,
	exigible: 3,
	entreCommercants: 3,
	commande: 3,
	livraison: 3,
	conditionsContractuelles: 1,
	miseEnDemeure: 1
} as const;

/**
 * Le seuil au-dessus duquel une créance est tenue pour mûre.
 *
 * 0,75 place la barre juste au-dessus des conditions légales seules (0,60) : il
 * faut les quatre conditions ET au moins un document de fond. C'est une
 * hypothèse de départ, à recalibrer sur le taux de contestation réellement
 * observé — c'est-à-dire quand il y aura des données.
 */
export const SEUIL_QUALIFICATION = 0.75;

/** Au-delà, un historique de retard cesse d'être un accident. */
const RETARDS_TOLERES = 2;

const DESCRIPTIONS_CONTESTATION: Record<SignalContestation, string> = {
	RECLAMATION_ANTERIEURE: 'Le débiteur a formulé une réclamation antérieure sur cette facturation.',
	LITIGE_DANS_ECHANGES: 'Un litige est mentionné dans les échanges rattachés à ce dossier.',
	AVOIR_PARTIEL_ACCORDE: 'Un avoir partiel a été accordé sur cette facturation.',
	ECART_COMMANDE_FACTURE: 'Un écart existe entre ce qui a été commandé et ce qui a été facturé.',
	RECEPTION_NON_DOCUMENTEE: "La réception de la prestation n'est documentée par aucune pièce."
};

/** Une pièce parmi plusieurs suffit à établir un même fait. */
function fournie(pieces: readonly ClePiece[], candidates: readonly ClePiece[]): boolean {
	return candidates.some((candidate) => pieces.includes(candidate));
}

export function qualifier(elements: ElementsCreance): Qualification {
	const criteres: Critere[] = [];
	const questions: string[] = [];

	// ── Les quatre conditions légales ────────────────────────────────────────
	for (const condition of CONDITIONS_LEGALES) {
		const statut = elements[condition as ConditionLegale];
		criteres.push({
			nom: condition,
			statut,
			preuve:
				statut === 'ok'
					? `${LIBELLE_CONDITION[condition]} est établi.`
					: statut === 'ko'
						? `${LIBELLE_CONDITION[condition]} n'est pas rempli.`
						: `${LIBELLE_CONDITION[condition]} n'est pas déterminé par les pièces fournies.`,
			poids: POIDS[condition]
		});

		// Le questionnaire ne se déclenche que sur du RÉELLEMENT indéterminé :
		// poser une question dont la réponse est déjà connue use la seule
		// ressource vraiment rare, l'attention de l'utilisateur.
		if (statut === 'unknown') {
			questions.push(`Pouvez-vous confirmer ${LIBELLE_CONDITION[condition]} de cette créance ?`);
		}
	}

	// ── La solidité documentaire ─────────────────────────────────────────────
	const preuves: ReadonlyArray<{
		cle: keyof typeof POIDS;
		accepte: readonly ClePiece[];
		fait: string;
	}> = [
		{
			cle: 'commande',
			accepte: ['BON_DE_COMMANDE', 'DEVIS_SIGNE'],
			fait: "l'engagement du débiteur à commander"
		},
		{ cle: 'livraison', accepte: ['BON_DE_LIVRAISON'], fait: 'la réception de la prestation' },
		{
			cle: 'conditionsContractuelles',
			accepte: ['CGV', 'CONTRAT'],
			fait: 'les conditions de paiement applicables'
		},
		{ cle: 'miseEnDemeure', accepte: ['MISE_EN_DEMEURE'], fait: "l'interpellation préalable" }
	];

	for (const preuve of preuves) {
		const presente = fournie(elements.piecesFournies, preuve.accepte);
		criteres.push({
			nom: preuve.cle,
			statut: presente ? 'ok' : 'unknown',
			preuve: presente
				? `${preuve.fait} est documenté.`
				: `Aucune pièce ne documente ${preuve.fait}.`,
			poids: POIDS[preuve.cle]
		});
	}

	// ── Le score ─────────────────────────────────────────────────────────────
	// Un critère `unknown` compte comme absent : c'est la règle « ne jamais
	// présumer favorablement », appliquée au numérateur.
	const poidsTotal = Object.values(POIDS).reduce((somme, poids) => somme + poids, 0);
	const poidsAcquis = criteres
		.filter((critere) => critere.statut === 'ok')
		.reduce((somme, critere) => somme + critere.poids, 0);
	const score = poidsAcquis / poidsTotal;

	// ── Les risques ──────────────────────────────────────────────────────────
	const risques: Risque[] = [];

	for (const signal of elements.signauxContestation) {
		risques.push({
			type: signal,
			description: DESCRIPTIONS_CONTESTATION[signal],
			// BLOQUANTE, sans nuance : le brief établit qu'une contestation même
			// infondée met fin à la procédure simplifiée. Le mérite du fond ne
			// change rien à l'effet.
			gravite: 'BLOQUANTE'
		});
	}

	if (elements.santeDebiteur === 'PROCEDURE_COLLECTIVE') {
		risques.push({
			type: 'PROCEDURE_COLLECTIVE',
			// Un CONSTAT. L'effet juridique d'une procédure collective sur le
			// recouvrement n'a pas été fourni, et l'inventer serait du conseil.
			description: "Le débiteur fait l'objet d'une procédure collective.",
			gravite: 'HAUTE'
		});
	}

	if (elements.santeDebiteur === 'RADIEE') {
		risques.push({
			type: 'DEBITEUR_RADIE',
			description: 'Le débiteur est radié du registre.',
			gravite: 'HAUTE'
		});
	}

	if (elements.retardsAnterieurs > RETARDS_TOLERES) {
		risques.push({
			type: 'RETARDS_REPETES',
			description: `${elements.retardsAnterieurs} retards de paiement ont été observés sur ce débiteur.`,
			gravite: 'MOYENNE'
		});
	}

	// ── Les pièces qui renforceraient le dossier ─────────────────────────────
	const piecesManquantes = preuves
		.filter((preuve) => !fournie(elements.piecesFournies, preuve.accepte))
		.map((preuve) => preuve.accepte[0]!);

	// ── Le verdict ───────────────────────────────────────────────────────────
	const conditionsToutesEtablies = CONDITIONS_LEGALES.every(
		(condition) => elements[condition as ConditionLegale] === 'ok'
	);
	const aUnBloquant = risques.some((risque) => risque.gravite === 'BLOQUANTE');

	return {
		eligible: conditionsToutesEtablies && !aUnBloquant && score >= SEUIL_QUALIFICATION,
		score,
		criteres,
		risques,
		piecesManquantes,
		questions
	};
}
