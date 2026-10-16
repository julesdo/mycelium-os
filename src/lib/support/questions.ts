/**
 * LES TROIS QUESTIONS DE L'ACCUEIL DE L'AIDE, CALCULÉES SUR L'ÉTAT DU COMPTE (16/10/2026, sur
 * Revolut et Wise) — jamais sur les dossiers. Ce qui ne va pas monte d'abord ; l'argent ne se
 * propose qu'à un administrateur ; quand tout va bien, des questions de départ.
 */

export interface EtatPourLesQuestions {
	readonly relancesActivees: boolean;
	readonly essaiEnCours: boolean;
	/** Le nom du logiciel branché dont la dernière lecture a échoué, ou `null`. */
	readonly connexionEnErreur: string | null;
	readonly documentsEnEchec: number;
	readonly estAdministrateur: boolean;
}

export interface QuestionProposee {
	/** La clé de l'article qui y répond (`articles.ts`). */
	readonly cle: string;
	readonly question: string;
}

const DE_DEPART: readonly QuestionProposee[] = [
	{ cle: 'ajouter-factures', question: 'Comment ajouter mes factures ?' },
	{ cle: 'plume-que-fait-il', question: 'Que fait Plume ?' },
	{ cle: 'inviter-collegue', question: 'Comment inviter un collègue ?' }
];

export function questionsDuCompte(etat: EtatPourLesQuestions): QuestionProposee[] {
	const urgentes: QuestionProposee[] = [];
	if (etat.connexionEnErreur !== null) {
		urgentes.push({
			cle: 'connexion-erreur',
			question: `Ma connexion à ${etat.connexionEnErreur} ne lit plus rien`
		});
	}
	if (etat.documentsEnEchec > 0) {
		urgentes.push({ cle: 'document-pas-entre', question: 'Un de mes documents n’est pas entré' });
	}
	if (!etat.relancesActivees) {
		urgentes.push({ cle: 'relances-rien-parti', question: 'Pourquoi rien n’est encore parti ?' });
	}
	if (etat.essaiEnCours && etat.estAdministrateur) {
		urgentes.push({ cle: 'essai', question: 'Quand serai-je prélevé ?' });
	}
	const deja = new Set(urgentes.map((q) => q.cle));
	return [...urgentes, ...DE_DEPART.filter((q) => !deja.has(q.cle))].slice(0, 3);
}
