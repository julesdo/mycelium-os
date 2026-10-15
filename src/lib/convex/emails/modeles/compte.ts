// LES E-MAILS DU COMPTE : confirmer son adresse, choisir un nouveau mot de passe
// (15/10/2026).
//
// ILS PARTAIENT EN ANGLAIS, sur des modèles générés depuis l'ancien produit
// (« Verify your email », la police Outfit, le gris de l'ancienne marque) : le
// premier e-mail qu'un gérant recevait de Letikette ne lui ressemblait pas, et ne
// parlait pas sa langue. Ils passent sur la coquille commune.
//
// LE LIEN EXPIRE : il s'écrit donc aussi en clair sous le bouton (`secours`), et la
// durée se dit. Et chacun dit quoi faire si l'on n'est pas à l'origine du message,
// parce que c'est la première question qu'on se pose devant un lien de sécurité.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type VerificationData = {
	url: string;
	/** La durée de validité du lien, en minutes. */
	minutes: number;
};

function blocVerification(d: VerificationData): BlocEmail {
	return {
		apercu: 'Un clic pour confirmer votre adresse, et votre espace est prêt.',
		plume: true,
		titre: 'Confirmez votre adresse',
		intro:
			'Bienvenue sur Letikette. Confirmez que cette adresse est bien la vôtre : c’est elle qui recevra votre point du matin et les rappels de votre abonnement.',
		bouton: { libelle: 'Confirmer mon adresse', url: d.url, secours: true },
		apresBouton: `Ce lien est valable ${d.minutes} minutes.`,
		note: 'Vous n’avez pas créé de compte sur Letikette ? Ignorez ce message : sans confirmation, rien n’est ouvert à votre nom.'
	};
}

export function verificationHtml(d: VerificationData): string {
	return coquilleHtml(blocVerification(d));
}

export function verificationTexte(d: VerificationData): string {
	return coquilleTexte(blocVerification(d));
}

export type MotDePasseData = {
	url: string;
	/** Le prénom ou le nom du compte, s'il est connu. */
	nom?: string;
};

function blocMotDePasse(d: MotDePasseData): BlocEmail {
	const prenom = d.nom?.trim().split(/\s+/)[0];
	return {
		apercu: 'Choisissez un nouveau mot de passe pour votre compte Letikette.',
		titre: 'Choisissez un nouveau mot de passe',
		intro: `${prenom ? `Bonjour ${prenom}, vous` : 'Vous'} avez demandé à changer le mot de passe de votre compte Letikette. Le bouton ci-dessous vous y mène.`,
		bouton: { libelle: 'Choisir un mot de passe', url: d.url, secours: true },
		apresBouton: 'Ce lien est valable une heure, et ne sert qu’une fois.',
		note: 'Vous n’êtes pas à l’origine de cette demande ? Ignorez ce message : votre mot de passe actuel reste le même.'
	};
}

export function motDePasseHtml(d: MotDePasseData): string {
	return coquilleHtml(blocMotDePasse(d));
}

export function motDePasseTexte(d: MotDePasseData): string {
	return coquilleTexte(blocMotDePasse(d));
}
