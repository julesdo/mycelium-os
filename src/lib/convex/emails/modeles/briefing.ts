import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type BriefingData = {
	nomEntreprise: string;
	titre: string;
	intro: string;
	lignes: readonly string[];
	/** L'action du jour, ou `null` quand il n'y a rien à faire. */
	action: string | null;
	/** Déjà formaté par l'appelant — ce module ne calcule rien. */
	montantLisible: string;
	url: string;
};

/**
 * LE BRIEFING DU MATIN.
 *
 * ⚠️ IL PART VERS LE CLIENT, JAMAIS VERS LE DÉBITEUR. C'est la ligne rouge n° 1
 * du produit, et elle se tient ici comme ailleurs : rien dans ce gabarit ne
 * s'adresse à la personne qui doit de l'argent.
 *
 * LE MONTANT ARRIVE DÉJÀ FORMATÉ. Ce module ne fait aucun calcul et n'importe
 * aucun moteur : un chiffre formaté à deux endroits différemment, c'est deux
 * chiffres différents aux yeux du lecteur.
 */
function bloc(d: BriefingData): BlocEmail {
	return {
		titre: d.titre,
		intro: d.intro,
		chiffres: [
			{
				libelle: 'Identifié à ce jour',
				valeur: d.montantLisible,
				etat: 'atteint',
				// ⚠️ NE JAMAIS ÉCRIRE « intérêts inclus » NI RIEN D'ÉQUIVALENT ICI.
				// `montantLisible` vient de `flux.montantIdentifie`, qui ADDITIONNE
				// UNIQUEMENT le `montant` des événements FACTURE_ECHUE et
				// PRESCRIPTION_PROCHE, dédupliqués par facture — le TTC de chaque
				// facture (`montantExigible = depuisCentimes(facture.montantTTC)`,
				// sans un centime d'intérêt), jamais deux fois la même.
				//
				// LES AUTRES ÉVÉNEMENTS DU JOUR N'Y ENTRENT PAS, ET C'EST VOULU. Le
				// total d'une créance qualifiée, le montant en jeu d'une échéance de
				// procédure, l'encours d'un débiteur dégradé sont des VUES AGRÉGÉES
				// de la MÊME monnaie que les factures qui les composent : les
				// additionner à leurs propres composants serait un double compte —
				// une facture échue, proche de sa prescription, portée par une
				// créance mûre chez un débiteur qui se dégrade produirait quatre
				// événements sur une seule somme. `montantIdentifie` (voir
				// `verticales/recouvrement/surveillance.ts`) l'évite en ne retenant
				// que la facture, l'unité atomique de ce qui est dû.
				//
				// C'est donc le principal TTC des factures identifiées ci-dessous,
				// et RIEN D'AUTRE : aucun intérêt de retard ni indemnité forfaitaire
				// n'y entre. Sur un produit dont l'argument entier est l'exactitude,
				// un chiffre juste sous une étiquette fausse est pire qu'un chiffre
				// absent.
				precision:
					'principal TTC de vos factures identifiées ci-dessous, hors intérêts et indemnité forfaitaire'
			}
		],
		corps: d.lignes,
		bouton: d.action === null ? undefined : { libelle: 'Ouvrir le produit', url: d.url },
		note:
			d.action === null
				? `Vous recevez ce message parce que ${d.nomEntreprise} est suivie par Letikette. Rien ne réclame votre attention aujourd’hui.`
				: `À faire aujourd’hui : ${d.action}`
	};
}

export function briefingHtml(d: BriefingData): string {
	return coquilleHtml(bloc(d));
}

export function briefingTexte(d: BriefingData): string {
	return coquilleTexte(bloc(d));
}
