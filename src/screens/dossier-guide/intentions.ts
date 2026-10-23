/**
 * « QUE VOULEZ-VOUS FAIRE ? » — ce que la conversation d'un dossier propose, et dans
 * quels mots (22/10/2026, `docs/superpowers/specs/2026-10-22-dossier-guide.md`).
 *
 * ⚠️ DANS LES MOTS DU GÉRANT, PAS DANS LA TAXONOMIE DU LOGICIEL. Les rangées
 * s'appelaient « Courriers et e-mails », « Vos réponses », « Les suites possibles » :
 * il fallait savoir ce qu'il y avait dedans avant de les ouvrir. Une réponse dit ce
 * que le gérant a vécu ou veut faire — « Il m'a répondu », « Me le rappeler » — comme
 * les « What happened? » de Lemonade et les « What do you need help with? » de
 * DoorDash, relevés sur Mobbin.
 *
 * ⚠️ AUCUNE NE NOMME UNE VOIE DE DROIT, et aucune n'est mise en avant parmi les
 * suites (ligne rouge n° 3) : « Le confier à un professionnel » est un geste de
 * bureau, au même rang que « Me le rappeler » et « Classer le dossier ».
 */

export type IntentionDuDossier =
	| 'ECRIRE'
	/** Sa page de paiement, ouverte et envoyée : l'IBAN du créancier, aucun fonds ne passe. */
	| 'LIEN'
	/** Relire un courrier préparé : la proposition de la carte de Plume, jamais une réponse de la liste. */
	| 'RELIRE'
	| 'REPONSE'
	| 'QUESTIONS'
	| 'DOCUMENT'
	| 'RAPPEL'
	| 'CONSEIL'
	| 'CLASSER'
	| 'PLUME'
	/** Sa promesse est arrivée à son jour : la carte de Plume pose la question. */
	| 'PROMESSE'
	/** Un rappel que le gérant s'était posé, arrivé à son jour. */
	| 'RAPPEL_DU_JOUR'
	/** Déclarer une démarche engagée : le logiciel compte ses délais. */
	| 'PROCEDURE'
	/** Noter ce qui s'est passé dans la démarche engagée. */
	| 'ETAPE';

/** Ce que la page sait du dossier, et qui décide des réponses proposées. */
export interface DossierPourLesIntentions {
	readonly classe: boolean;
	/** Toutes les factures sont payées. */
	readonly regle: boolean;
	/** Une procédure est engagée : le dossier est entre les mains d'un professionnel. */
	readonly auTribunal: boolean;
	/** Procédure collective ou radiation : les relances sont suspendues par la loi. */
	readonly relancesSuspendues: boolean;
	/** Les faits que le gérant seul peut dire, encore sans réponse. */
	readonly questionsEnAttente: number;
	/** Le dossier se classe d'ici (le geste est branché). */
	readonly classable: boolean;
	/** La conversation libre du dossier est branchée. */
	readonly plumeJoignable: boolean;
	/** Une démarche peut être déclarée engagée (une voie a un déroulé, aucune ne l'est). */
	readonly procedureDeclarable: boolean;
	/** Une démarche est engagée, et une suite peut s'y noter. */
	readonly etapeANoter: boolean;
}

export interface LibelleDIntention {
	readonly titre: string;
	/** Ce qui va se passer, en une ligne. */
	readonly ligne: string;
}

/** Les réponses à « Que voulez-vous faire ? », dans l'ordre d'un dossier. */
export function intentionsDuDossier(d: DossierPourLesIntentions): IntentionDuDossier[] {
	if (d.classe) return ['DOCUMENT', ...(d.plumeJoignable ? (['PLUME'] as const) : [])];
	return [
		'ECRIRE',
		// Un client en procédure collective ne paie plus ce qu'il devait : pas de page.
		...(d.regle || d.relancesSuspendues ? [] : (['LIEN'] as const)),
		...(d.regle ? [] : (['REPONSE'] as const)),
		...(d.questionsEnAttente > 0 ? (['QUESTIONS'] as const) : []),
		'DOCUMENT',
		'RAPPEL',
		...(d.auTribunal || d.regle ? [] : (['CONSEIL'] as const)),
		...(d.procedureDeclarable && !d.regle ? (['PROCEDURE'] as const) : []),
		...(d.etapeANoter ? (['ETAPE'] as const) : []),
		...(d.classable ? (['CLASSER'] as const) : []),
		...(d.plumeJoignable ? (['PLUME'] as const) : [])
	];
}

export function libelleDIntention(
	intention: IntentionDuDossier,
	d: Pick<DossierPourLesIntentions, 'relancesSuspendues' | 'questionsEnAttente' | 'regle'>
): LibelleDIntention {
	switch (intention) {
		case 'ECRIRE':
			return d.relancesSuspendues
				? { titre: 'Préparer un courrier', ligne: 'Ce que sa situation permet, prêt à relire' }
				: d.regle
					? { titre: 'Lui écrire', ligne: 'Un e-mail ou une lettre, prêts à relire' }
					: { titre: 'Le relancer', ligne: 'Un e-mail ou une lettre, prêts à relire' };
		case 'LIEN':
			return { titre: 'Lui envoyer de quoi payer', ligne: 'Sa page de paiement, avec votre IBAN' };
		case 'RELIRE':
			return { titre: 'Relire le courrier', ligne: 'Le lire, le valider, l’envoyer' };
		case 'REPONSE':
			return {
				titre: 'Il m’a répondu',
				ligne: 'Une date, plusieurs fois, une contestation'
			};
		case 'QUESTIONS':
			return {
				titre: 'Répondre à mes questions',
				ligne:
					d.questionsEnAttente === 1
						? 'Un fait que vous seul pouvez dire'
						: `${d.questionsEnAttente} faits que vous seul pouvez dire`
			};
		case 'DOCUMENT':
			return {
				titre: 'Ajouter un document',
				ligne: 'Facture, bon de commande, échange'
			};
		case 'RAPPEL':
			return { titre: 'Me le rappeler', ligne: 'Je vous le remets sous les yeux le jour dit' };
		case 'CONSEIL':
			return {
				titre: 'Le confier à un professionnel',
				ligne: 'Votre avocat, ou quelqu’un près de chez lui'
			};
		case 'CLASSER':
			return { titre: 'Classer le dossier', ligne: 'Rien n’est effacé, il se rouvre d’un toucher' };
		case 'PLUME':
			return { titre: 'Le dire avec mes mots', ligne: 'Plume comprend, et prépare le geste' };
		case 'PROMESSE':
			return { titre: 'Vérifier sa promesse', ligne: 'Il devait payer : l’a-t-il fait ?' };
		case 'RAPPEL_DU_JOUR':
			return { titre: 'Mon rappel', ligne: 'Ce que vous vouliez faire aujourd’hui' };
		case 'PROCEDURE':
			return { titre: 'Une démarche est engagée', ligne: 'Je compte ses délais depuis son jour' };
		case 'ETAPE':
			return { titre: 'Noter ce qui s’est passé', ligne: 'Une étape de la démarche, à sa date' };
	}
}
