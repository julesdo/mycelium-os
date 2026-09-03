// « Rejoignez l'établissement X sur Letikette. »
//
// CE MODÈLE REMPLACE UN VESTIGE. L'invitation partait encore sur la coquille de
// l'ancien produit : fond noir, accent jaune #f5e642, et le mot « Letikette »
// posé dessus. Un destinataire qui n'a jamais entendu parler du service recevait
// donc un courriel qui ne ressemble à rien de ce qu'il verra ensuite — c'est
// exactement le message qu'on classe en indésirable.
//
// IL DIT QUI INVITE, ET POURQUOI. Une invitation anonyme à un logiciel de
// conformité se lit comme un hameçonnage. Le nom de l'établissement et le rôle
// proposé sont donc dans le premier paragraphe, avant le bouton.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type InvitationData = {
	nomEtablissement: string;
	roleLibelle: string;
	url: string;
};

function bloc(d: InvitationData): BlocEmail {
	return {
		titre: `Rejoindre ${d.nomEtablissement}`,
		intro: `Vous êtes invité à rejoindre l'espace Letikette de ${d.nomEtablissement}, en tant que ${d.roleLibelle.toLowerCase()}.`,
		corps: [
			'Letikette lit les factures d’une entreprise, chiffre ce que ses clients lui doivent — principal, intérêts de retard, indemnité forfaitaire — et surveille les délais au-delà desquels une créance s’éteint.',
			'En rejoignant cet espace, vous pourrez déposer des factures, suivre l’avancement de la lecture et confirmer ce qui engage la responsabilité de l’entreprise.'
		],
		bouton: { libelle: 'Rejoindre l’entreprise', url: d.url },
		note: "Ce lien expire dans sept jours. Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message : aucun compte n'est créé tant que vous n'avez pas cliqué."
	};
}

export function invitationHtml(d: InvitationData): string {
	return coquilleHtml(bloc(d));
}

export function invitationTexte(d: InvitationData): string {
	return coquilleTexte(bloc(d));
}
