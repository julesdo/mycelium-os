// « Rejoignez l'établissement X sur Letikette. »
//
// IL DIT QUI INVITE, ET POURQUOI. Une invitation anonyme à un logiciel se lit comme
// un hameçonnage. Le nom de l'établissement est dans le titre, le rôle proposé dans
// le premier paragraphe, avant le bouton, et ce qu'on y fera en trois lignes.
//
// LA DURÉE DE L'INVITATION se lit sur la constante qui la tient
// (`config/invitations.ts`) : écrite en dur ici, elle mentirait au premier
// changement.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';
import { JOURS_VALIDITE_INVITATION } from '../../../config/invitations';

export type InvitationData = {
	nomEtablissement: string;
	roleLibelle: string;
	url: string;
};

function bloc(d: InvitationData): BlocEmail {
	return {
		apercu: `${d.nomEtablissement} vous invite à suivre ses factures impayées sur Letikette.`,
		titre: `Rejoignez ${d.nomEtablissement}`,
		intro: `Vous êtes invité à rejoindre l’espace de ${d.nomEtablissement} sur Letikette, en tant que ${d.roleLibelle.toLowerCase()}. Letikette suit les factures impayées de l’entreprise : ce que chaque client doit, pénalités comprises, et les relances qui partent à son nom.`,
		points: [
			'Voir ce que chaque client doit, et depuis quand',
			'Suivre les relances et les réponses des clients',
			'Déposer des factures et des pièces au coffre-fort'
		],
		bouton: { libelle: `Rejoindre ${d.nomEtablissement}`, url: d.url, secours: true },
		apresBouton: `L’invitation est valable ${JOURS_VALIDITE_INVITATION} jours.`,
		note: 'Vous n’attendiez pas cette invitation ? Ignorez ce message : aucun compte n’est créé tant que vous ne l’avez pas acceptée.'
	};
}

export function invitationHtml(d: InvitationData): string {
	return coquilleHtml(bloc(d));
}

export function invitationTexte(d: InvitationData): string {
	return coquilleTexte(bloc(d));
}
