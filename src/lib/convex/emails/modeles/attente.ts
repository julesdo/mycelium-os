// LA CONFIRMATION D'UNE INSCRIPTION À LA LISTE D'ATTENTE (19/10/2026, audit, décision 16).
//
// Le premier temps de la double confirmation : le lien mène à `/attente/<jeton>`, où un
// bouton confirme. Le lien expire, il s'écrit donc aussi en clair sous le bouton.
//
// ⚠️ AUCUN VERDICT (ligne rouge n° 3) : le message dit qu'on préviendra le jour où la voie
// s'ouvre, jamais qu'il faudrait l'engager.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type ConfirmationAttenteData = {
	/** L'adresse de la page de confirmation, jeton compris. */
	url: string;
	/** La durée de validité du lien, en jours. */
	jours: number;
};

export const OBJET_CONFIRMATION_ATTENTE = 'Confirmez votre inscription';

function blocConfirmationAttente(d: ConfirmationAttenteData): BlocEmail {
	return {
		apercu: 'Un clic pour être prévenu le jour où la procédure sans juge s’ouvre.',
		titre: 'Confirmez votre inscription',
		intro:
			'Vous avez demandé à être prévenu le jour où la procédure sans juge entre entreprises s’ouvrira. Confirmez que cette adresse est bien la vôtre : c’est elle qui recevra ce message, et aucun autre.',
		bouton: { libelle: 'Confirmer mon inscription', url: d.url, secours: true },
		apresBouton: `Ce lien est valable ${d.jours} jours.`,
		note: 'Vous n’avez rien demandé ? Ignorez ce message : sans confirmation, votre adresse s’efface d’elle-même.'
	};
}

export function confirmationAttenteHtml(d: ConfirmationAttenteData): string {
	return coquilleHtml(blocConfirmationAttente(d));
}

export function confirmationAttenteTexte(d: ConfirmationAttenteData): string {
	return coquilleTexte(blocConfirmationAttente(d));
}
