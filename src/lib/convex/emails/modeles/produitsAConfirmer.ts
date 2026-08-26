// « Des produits attendent votre confirmation. »
//
// Arrive quand la lecture d'un lot se termine et laisse des produits en file.
// C'est l'e-mail le plus important du produit : sans lui, le gérant dépose ses
// factures, referme l'onglet, et personne ne vient jamais vider la file. Le
// lot reste bloqué, aucun bilan ne sort, et l'abonnement ne sert à rien.
//
// IL DIT LE MONTANT EN JEU, pas seulement le nombre. « Douze produits » est une
// corvée ; « douze produits qui pèsent 34 000 € de vos achats » est une raison
// de s'y mettre. C'est la même information, et une seule des deux fait agir.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type ProduitsAConfirmerData = {
	nombre: number;
	/** Déjà formaté en euros par l'appelant, qui a le bon formateur. */
	montantEnJeu: string;
	/** Combien, parmi eux, sont de la viande ou du poisson. */
	viandePoisson: number;
	url: string;
};

function bloc(d: ProduitsAConfirmerData): BlocEmail {
	const pluriel = d.nombre > 1;
	const corps = [
		`Ces produits pèsent ${d.montantEnJeu} sur vos achats. Tant qu'ils ne sont pas confirmés, ils ne comptent dans aucun de vos trois taux.`
	];

	if (d.viandePoisson > 0) {
		corps.push(
			`${d.viandePoisson} ${d.viandePoisson > 1 ? 'concernent' : 'concerne'} la viande ou le poisson. Ceux-là passent toujours devant vous, quel que soit le niveau de certitude du logiciel : c'est là que se joue le seuil de 60 %.`
		);
	}

	corps.push(
		"Un libellé confirmé l'est définitivement. Il ne vous sera pas redemandé l'an prochain."
	);

	return {
		titre: `${d.nombre} produit${pluriel ? 's' : ''} attend${pluriel ? 'ent' : ''} votre confirmation`,
		intro: `Vos factures sont lues. Le logiciel a proposé un classement pour chacun de ces produits, avec la raison. Il vous reste à trancher ce qui engage votre responsabilité.`,
		corps,
		bouton: { libelle: 'Confirmer mes produits', url: d.url },
		note: 'Vous recevez ce message parce que la lecture de vos factures vient de se terminer.'
	};
}

export function produitsAConfirmerHtml(d: ProduitsAConfirmerData): string {
	return coquilleHtml(bloc(d));
}

export function produitsAConfirmerTexte(d: ProduitsAConfirmerData): string {
	return coquilleTexte(bloc(d));
}
