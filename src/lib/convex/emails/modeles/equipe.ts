// « Rejoindre l'équipe de Letikette » (16/10/2026) : l'invitation d'un membre de
// l'équipe à l'interface admin. Elle dit qui invite, avec quel rôle, et ce qu'il
// faut pour entrer : un compte à cette adresse, et la double authentification.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type InvitationEquipeData = {
	readonly invitePar: string;
	readonly roleLibelle: string;
	readonly roleDescription: string;
	readonly url: string;
};

function bloc(d: InvitationEquipeData): BlocEmail {
	return {
		apercu: `${d.invitePar} vous invite dans l’équipe de Letikette.`,
		titre: 'Rejoignez l’équipe de Letikette',
		intro: `${d.invitePar} vous invite dans l’équipe, avec le rôle ${d.roleLibelle.toLowerCase()} : ${d.roleDescription.charAt(0).toLowerCase()}${d.roleDescription.slice(1)}`,
		points: [
			'Connectez-vous avec cette adresse, ou créez votre compte avec elle.',
			'Activez la double authentification dans Votre compte, puis Votre profil.',
			'Ouvrez l’admin depuis Votre compte.'
		],
		bouton: { libelle: 'Rejoindre l’équipe', url: d.url, secours: true },
		note: 'Vous n’attendiez pas cette invitation ? Ignorez ce message : rien ne s’ouvre sans vous.'
	};
}

export function invitationEquipeHtml(d: InvitationEquipeData): string {
	return coquilleHtml(bloc(d));
}

export function invitationEquipeTexte(d: InvitationEquipeData): string {
	return coquilleTexte(bloc(d));
}
