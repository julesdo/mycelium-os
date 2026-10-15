/**
 * LE RENDU DES E-MAILS DU COMPTE — confirmer son adresse, changer son mot de passe.
 *
 * Les modèles vivent dans `./modeles` (`compte.ts`), sur la coquille commune
 * (`disposition.ts`). Les six modèles d'avant, générés depuis l'ancien produit en
 * anglais, ont été retirés le 15/10/2026 ; quatre d'entre eux n'étaient plus
 * envoyés par personne (support, inscriptions, code de vérification).
 */

import type { RenderedEmail } from './types';
import { motDePasseHtml, motDePasseTexte, verificationHtml, verificationTexte } from './modeles';

export function renderVerificationEmail(
	verificationUrl: string,
	expiryMinutes = 20
): RenderedEmail {
	const donnees = { url: verificationUrl, minutes: expiryMinutes };
	return { html: verificationHtml(donnees), text: verificationTexte(donnees) };
}

export function renderPasswordResetEmail(resetUrl: string, userName?: string): RenderedEmail {
	const donnees = { url: resetUrl, ...(userName ? { nom: userName } : {}) };
	return { html: motDePasseHtml(donnees), text: motDePasseTexte(donnees) };
}
