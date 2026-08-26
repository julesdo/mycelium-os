// « Votre bilan EGalim est prêt. »
//
// Le seul e-mail du produit qui porte une bonne nouvelle. Il arrive quand un
// diagnostic vient d'être produit, c'est-à-dire quand la file de confirmation
// s'est vidée et que le lot est passé en READY.
//
// LES TROIS TAUX SONT DANS L'E-MAIL, pas seulement derrière un lien. C'est
// l'information que le gérant attend ; la lui faire cliquer pour l'obtenir
// serait un jeu. Le lien sert à ce qui ne tient pas dans un courriel : la
// justification ligne à ligne, la répartition, le fichier de télédéclaration.

import {
	coquilleHtml,
	coquilleTexte,
	formaterEntier,
	type BlocEmail,
	type EtatSeuil
} from './disposition';

export type BilanPretData = {
	annee: number;
	lignesLues: number;
	taux: readonly { libelle: string; valeur: string; etat: EtatSeuil; precision?: string }[];
	url: string;
};

function bloc(d: BilanPretData): BlocEmail {
	return {
		titre: `Votre bilan EGalim ${d.annee} est prêt`,
		intro: `${formaterEntier(d.lignesLues)} lignes de facture ont été lues et classées. Voici vos trois taux, mesurés en valeur d'achat hors taxes.`,
		chiffres: d.taux,
		corps: [
			"Le bilan est figé à sa date : il ne changera plus. Il contient la justification retenue pour chaque ligne, la répartition par famille d'achat, et le fichier prêt à saisir sur « ma cantine ».",
			"Si vous déposez d'autres factures ensuite, elles produiront un nouveau bilan, daté à son tour. L'ancien restera consultable tel qu'il était."
		],
		bouton: { libelle: 'Ouvrir mon bilan', url: d.url },
		note: "Vous recevez ce message parce qu'un bilan vient d'être produit pour votre établissement."
	};
}

export function bilanPretHtml(d: BilanPretData): string {
	return coquilleHtml(bloc(d));
}

export function bilanPretTexte(d: BilanPretData): string {
	return coquilleTexte(bloc(d));
}
