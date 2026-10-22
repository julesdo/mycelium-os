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
	| 'REPONSE'
	| 'QUESTIONS'
	| 'DOCUMENT'
	| 'RAPPEL'
	| 'CONSEIL'
	| 'CLASSER'
	| 'PLUME';

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
		...(d.regle ? [] : (['REPONSE'] as const)),
		...(d.questionsEnAttente > 0 ? (['QUESTIONS'] as const) : []),
		'DOCUMENT',
		'RAPPEL',
		...(d.auTribunal || d.regle ? [] : (['CONSEIL'] as const)),
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
	}
}
