import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type BriefingData = {
	nomEntreprise: string;
	titre: string;
	intro: string;
	lignes: readonly string[];
	/** L'action du jour, ou `null` quand il n'y a rien à faire. */
	action: string | null;
	/** Déjà formaté par l'appelant : ce module ne calcule rien. `null` quand rien n'est dû. */
	montantLisible: string | null;
	url: string;
};

/**
 * LE POINT DU MATIN, SIGNÉ PLUME (refait le 15/10/2026).
 *
 * ⚠️ IL PART VERS LE CLIENT, JAMAIS VERS LE DÉBITEUR. C'est la ligne rouge n° 1
 * du produit, et elle se tient ici comme ailleurs : rien dans ce gabarit ne
 * s'adresse à la personne qui doit de l'argent.
 *
 * LE MONTANT ARRIVE DÉJÀ FORMATÉ. Ce module ne fait aucun calcul et n'importe
 * aucun moteur : un chiffre formaté à deux endroits différemment, c'est deux
 * chiffres différents aux yeux du lecteur.
 *
 * ⚠️ NE JAMAIS ÉCRIRE « pénalités comprises » NI RIEN D'ÉQUIVALENT SOUS LE MONTANT.
 * `montantLisible` vient de `flux.montantIdentifie`, qui additionne UNIQUEMENT le
 * TTC des factures échues ou proches de leur date limite, dédupliquées par facture
 * (`verticales/recouvrement/surveillance.ts`) : le principal, sans un centime
 * d'intérêt ni d'indemnité. Sur un produit dont l'argument entier est
 * l'exactitude, un chiffre juste sous une étiquette fausse est pire qu'un chiffre
 * absent.
 */

/**
 * LE CHEMIN POUR NE PLUS LE RECEVOIR, écrit dans chaque envoi (09/10/2026) : le
 * réglage vit dans le profil de chaque membre (`briefing.reglerPointDuMatin`).
 */
const CHEMIN = 'Pour ne plus le recevoir par e-mail : Votre compte, puis Votre profil.';

function bloc(d: BriefingData): BlocEmail {
	return {
		apercu: d.intro,
		plume: true,
		titre: d.titre,
		intro: d.intro,
		...(d.montantLisible === null
			? {}
			: {
					montant: {
						libelle: 'Factures échues, à ce jour',
						valeur: d.montantLisible,
						precision:
							'Le montant TTC de vos factures identifiées, hors pénalités de retard et frais de recouvrement.'
					}
				}),
		// ⚠️ UN JOUR CALME N'A NI ACTION NI BOUTON : rien ne pousse à ouvrir
		// l'application quand rien ne l'attend. Son introduction le dit déjà ; ses
		// lignes (« Aucun point d'attention ») le rediraient.
		...(d.action === null
			? {}
			: {
					points: d.lignes,
					corps: [`À faire aujourd’hui : ${d.action}`],
					bouton: { libelle: 'Ouvrir Letikette', url: d.url }
				}),
		note: `Vous recevez ce point parce que ${d.nomEntreprise} est suivie par Letikette. ${CHEMIN}`
	};
}

export function briefingHtml(d: BriefingData): string {
	return coquilleHtml(bloc(d));
}

export function briefingTexte(d: BriefingData): string {
	return coquilleTexte(bloc(d));
}
