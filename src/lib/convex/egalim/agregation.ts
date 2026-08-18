import { SEUILS } from '../../egalim/referentiel';
import { FAMILLES_VIANDE_POISSON, type Famille } from '../../egalim/types';

/**
 * Une ligne PRÊTE à agréger : tous les champs de classification sont renseignés.
 * Dans le schéma Convex, `isFood`/`family`/`isDurable`/`isBio` sont optionnels
 * tant que la ligne n'est pas classée — l'appelant doit donc écarter les lignes
 * non classées AVANT d'appeler `calculerRatios`, jamais les traiter comme non
 * qualifiantes. Une ligne non classée silencieusement comptée comme non durable
 * fausse le ratio vers le bas sans qu'aucun test ne le voie.
 */
export interface LignePourAgregation {
	amountHT: number;
	isFood: boolean;
	family: Famille;
	isDurable: boolean;
	isBio: boolean;
}

export interface Ratios {
	durable: number;
	bio: number;
	meatFishDurable: number;
	totalFoodHT: number;
	totalHT: number;
	gapEuros: { toDurable50: number; toBio20: number; toMeatFish60: number };
}

/** Combien d'euros basculer pour amener `actuel / base` au seuil visé. */
function ecartVersSeuil(actuelHT: number, baseHT: number, seuil: number): number {
	const manque = seuil * baseHT - actuelHT;
	return manque > 0 ? manque : 0;
}

export function calculerRatios(lignes: readonly LignePourAgregation[]): Ratios {
	let totalHT = 0;
	let totalFoodHT = 0;
	let durableHT = 0;
	let bioHT = 0;
	let meatFishHT = 0;
	let meatFishDurableHT = 0;

	for (const l of lignes) {
		totalHT += l.amountHT;
		if (!l.isFood) continue;

		// Un avoir porte un montant négatif : il retranche du dénominateur
		// comme du numérateur, sans traitement particulier.
		totalFoodHT += l.amountHT;
		if (l.isDurable) durableHT += l.amountHT;
		if (l.isBio) bioHT += l.amountHT;

		if (FAMILLES_VIANDE_POISSON.includes(l.family)) {
			meatFishHT += l.amountHT;
			if (l.isDurable) meatFishDurableHT += l.amountHT;
		}
	}

	const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);

	return {
		durable: ratio(durableHT, totalFoodHT),
		bio: ratio(bioHT, totalFoodHT),
		meatFishDurable: ratio(meatFishDurableHT, meatFishHT),
		totalFoodHT,
		totalHT,
		gapEuros: {
			toDurable50: ecartVersSeuil(durableHT, totalFoodHT, SEUILS.durable),
			toBio20: ecartVersSeuil(bioHT, totalFoodHT, SEUILS.bio),
			toMeatFish60: ecartVersSeuil(meatFishDurableHT, meatFishHT, SEUILS.viandePoissonDurable)
		}
	};
}
