// Les e-mails du service client (16/10/2026, spec § 5.1).
//
// Au gérant : la réponse de l'équipe, quand il ne l'a pas lue dans le fil dix minutes
// après ; le rappel d'une conversation qui attend sa réponse. À l'équipe : « une
// conversation vous attend », un lien, JAMAIS le contenu. Aucun pixel, aucun suivi,
// aucun lien d'avis.

import { DELIMITEUR as DELIMITEUR_EMAIL } from '../../../support/citation';
import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type ReponseDuSupportData = {
	readonly prenom: string;
	readonly titre: string;
	readonly texte: string;
	readonly url: string;
	/** La réception est ouverte : on peut répondre à ce message (au-dessus de la ligne). */
	readonly repondreParEmail: boolean;
};

function blocReponse(d: ReponseDuSupportData): BlocEmail {
	return {
		apercu: `${d.prenom}, de l’équipe Letikette, vous a répondu.`,
		titre: `${d.prenom} vous a répondu`,
		intro: `Votre question : « ${d.titre} »`,
		corps: d.texte.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p !== ''),
		bouton: { libelle: 'Ouvrir la conversation', url: d.url },
		note: d.repondreParEmail
			? 'Vous pouvez répondre à ce message : votre réponse arrive dans la même conversation.'
			: 'Pour répondre, ouvrez la conversation : ce message ne reçoit pas de réponse.'
	};
}

export function reponseDuSupportHtml(d: ReponseDuSupportData): string {
	return coquilleHtml(blocReponse(d));
}

export function reponseDuSupportTexte(d: ReponseDuSupportData): string {
	const texte = coquilleTexte(blocReponse(d));
	return d.repondreParEmail ? `${DELIMITEUR_EMAIL}\n\n${texte}` : texte;
}

export type RappelDuSupportData = { readonly titre: string; readonly url: string };

function blocRappel(d: RappelDuSupportData): BlocEmail {
	return {
		apercu: 'L’équipe attend votre réponse.',
		titre: 'L’équipe attend votre réponse',
		intro: `Votre question : « ${d.titre} ». L’équipe vous a répondu il y a trois jours et attend votre retour pour continuer.`,
		bouton: { libelle: 'Ouvrir la conversation', url: d.url },
		note: 'Sans nouvelles, la conversation se termine d’elle-même dans quatre jours. Écrire la rouvre.'
	};
}

export function rappelDuSupportHtml(d: RappelDuSupportData): string {
	return coquilleHtml(blocRappel(d));
}

export function rappelDuSupportTexte(d: RappelDuSupportData): string {
	return coquilleTexte(blocRappel(d));
}

export type AlerteDuSupportData = { readonly url: string; readonly reservee: boolean };

function blocAlerte(d: AlerteDuSupportData): BlocEmail {
	return {
		apercu: 'Une conversation vous attend dans l’admin.',
		titre: 'Une conversation vous attend',
		intro: d.reservee
			? 'Une conversation réservée au fondateur vient d’arriver dans la boîte du support.'
			: 'Une conversation vient de passer à l’équipe dans la boîte du support.',
		bouton: { libelle: 'Ouvrir la boîte', url: d.url },
		note: 'Ce message ne porte jamais le contenu de la conversation : il se lit dans l’admin.'
	};
}

export function alerteDuSupportHtml(d: AlerteDuSupportData): string {
	return coquilleHtml(blocAlerte(d));
}

export function alerteDuSupportTexte(d: AlerteDuSupportData): string {
	return coquilleTexte(blocAlerte(d));
}
