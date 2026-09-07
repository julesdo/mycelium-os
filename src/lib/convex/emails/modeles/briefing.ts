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
				precision: 'intérêts de retard courus inclus'
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
