// « La campagne ferme le 31 mars. »
//
// Le seul e-mail du produit déclenché par le calendrier et non par une action.
// Il part deux fois, début février et mi-mars, aux établissements qui ont déjà
// déposé au moins une facture.
//
// IL NE DIT PAS LA MÊME CHOSE SELON L'ÉTAT DU DOSSIER, et c'est tout son
// intérêt. Un gérant dont le bilan est prêt n'a rien à faire d'une alerte : il
// a besoin qu'on lui dise où cliquer pour saisir. Un gérant dont la file est
// pleine a besoin qu'on lui dise combien il lui reste à trancher. Un rappel
// identique pour les deux serait ignoré par le premier et inutile au second.
//
// CE QU'IL NE FAIT PAS : agiter un compte à rebours, écrire « plus que X
// jours », ou laisser entendre une sanction. La cible reconnaît ces ficelles, et
// les reconnaître suffit à faire fermer le message. La date est vraie et
// vérifiable en trente secondes, ça suffit.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type EtatDossier =
	/** Le bilan est produit, il ne reste qu'à saisir sur « ma cantine ». */
	| { situation: 'BILAN_PRET'; annee: number }
	/** Des produits attendent encore une confirmation. */
	| { situation: 'FILE_PLEINE'; annee: number; aConfirmer: number }
	/** Des factures sont déposées, mais l'exercice est incomplet. */
	| { situation: 'INCOMPLET'; annee: number; moisCouverts: number };

export type RappelDeclarationData = {
	etat: EtatDossier;
	url: string;
};

function bloc(d: RappelDeclarationData): BlocEmail {
	const commun = {
		titre: 'La campagne « ma cantine » ferme le 31 mars',
		note: 'Vous recevez ce message parce que votre établissement a déposé des factures sur Letikette.'
	};

	if (d.etat.situation === 'BILAN_PRET') {
		return {
			...commun,
			intro: `Votre bilan ${d.etat.annee} est prêt et n'attend plus rien. Il ne vous reste qu'à reporter les chiffres sur « ma cantine ».`,
			corps: [
				"Le fichier de saisie est dans votre bilan, avec chaque montant à la ligne où il doit aller. Comptez quelques minutes.",
				"La déclaration reste établie et signée par votre établissement : nous ne la déposons pas à votre place."
			],
			bouton: { libelle: 'Ouvrir mon bilan', url: d.url }
		};
	}

	if (d.etat.situation === 'FILE_PLEINE') {
		const n = d.etat.aConfirmer;
		return {
			...commun,
			intro: `Vos factures ${d.etat.annee} sont lues, mais ${n} produit${n > 1 ? 's' : ''} attend${n > 1 ? 'ent' : ''} encore votre confirmation. Tant qu'ils sont en attente, aucun bilan ne peut être produit.`,
			corps: [
				"La plupart se confirment d'un geste : le classement est déjà proposé, avec la raison. C'est l'affaire d'une dizaine de minutes.",
				"Une fois la file vide, votre bilan sort tout seul et vous recevez un message."
			],
			bouton: { libelle: 'Vider ma file', url: d.url }
		};
	}

	return {
		...commun,
		intro: `Vous avez déposé ${d.etat.moisCouverts} mois de factures pour ${d.etat.annee}. La déclaration porte sur l'année civile entière : il manque de quoi produire un bilan complet.`,
		corps: [
			"Douze mois se lisent en une fois, quel que soit le moment où vous les déposez. Le plus long est de les rassembler.",
			"Un export comptable suffit et vaut mieux qu'une pile de PDF : il contient déjà toutes les lignes."
		],
		bouton: { libelle: 'Déposer mes factures', url: d.url }
	};
}

export function rappelDeclarationHtml(d: RappelDeclarationData): string {
	return coquilleHtml(bloc(d));
}

export function rappelDeclarationTexte(d: RappelDeclarationData): string {
	return coquilleTexte(bloc(d));
}
