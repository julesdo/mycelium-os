import { describe, it, expect } from 'vitest';
import {
	habitudeDePaiement,
	lireRupture,
	ECHANTILLON_MINIMAL,
	PLANCHER_RUPTURE_JOURS,
	type PaiementObserve
} from '../comportement';

/**
 * LE SCORING COMPORTEMENTAL — la rupture d'habitude, pas le seuil absolu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN SEUIL ABSOLU NE DIT RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Alerter au-delà de soixante jours de retard » traite de la même façon deux
 * situations opposées :
 *
 *   · un client qui paie TOUJOURS à soixante-cinq jours, depuis quatre ans,
 *     parce que c'est son cycle de trésorerie. Rien ne se passe. L'alerte est
 *     du bruit, et le bruit s'apprend : au troisième faux positif, le gérant
 *     cesse de lire les alertes ;
 *   · un client qui paie TOUJOURS à huit jours et qui vient de passer à
 *     trente-cinq. Sous le seuil, donc muet — alors que c'est précisément le
 *     signal le plus fort qu'un produit de recouvrement puisse donner. Une
 *     habitude qui casse précède souvent la difficulté de paiement.
 *
 * Le second est le cas qui justifie ce module : le seuil absolu le RATE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE MODULE NE PRÉDIT RIEN, ET NE RECOMMANDE RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il ne dit pas « ce client va faire défaut » — ce serait une prédiction
 * invérifiable posée sur douze observations. Il ne dit pas non plus « relancez »
 * : recommander une démarche est la troisième ligne rouge du produit.
 *
 * Il dit un CONSTAT arithmétique, refaisable à la main : « ce client règle
 * habituellement à N jours ; cette facture en est à M ». Le gérant en tire ce
 * qu'il veut.
 */

function paiement(reference: string, exigibilite: string, paiementLe: string): PaiementObserve {
	return { reference, dateExigibilite: exigibilite, datePaiement: paiementLe };
}

/** Un historique régulier : toujours à peu près le même délai. */
function regulier(delais: readonly number[]): PaiementObserve[] {
	return delais.map((jours, rang) => {
		const mois = String((rang % 12) + 1).padStart(2, '0');
		const exigibilite = `2026-${mois}-01`;
		// On décale la date de paiement du délai voulu, en restant dans le mois
		// suivant : les quantièmes n'ont aucune importance ici, seul l'écart en a.
		const instant = Date.parse(`${exigibilite}T00:00:00Z`) + jours * 86_400_000;
		return paiement(`F-${rang}`, exigibilite, new Date(instant).toISOString().slice(0, 10));
	});
}

describe('l’habitude de paiement', () => {
	it('retient la MÉDIANE et non la moyenne', () => {
		// ⚠️ LE TEST QUI PORTE LA DÉCISION. Neuf règlements à trente jours et un
		// à trois cents — un litige ancien, réglé tard. La moyenne monterait à
		// cinquante-sept jours, et l'habitude réelle du client disparaîtrait
		// derrière un seul incident. La médiane ne bouge pas.
		const habitude = habitudeDePaiement(regulier([30, 30, 30, 30, 30, 30, 30, 30, 30, 300]));

		expect(habitude.connue).toBe(true);
		if (!habitude.connue) return;
		expect(habitude.delaiMedianJours).toBe(30);
	});

	it('compte les paiements en avance comme des délais négatifs', () => {
		// Un client qui paie AVANT l'échéance a un délai négatif, et c'est une
		// information : sa rupture à lui, c'est de passer à zéro.
		const habitude = habitudeDePaiement(regulier([-10, -8, -9, -11, -10]));

		expect(habitude.connue).toBe(true);
		if (!habitude.connue) return;
		expect(habitude.delaiMedianJours).toBe(-10);
	});

	it('refuse de parler d’habitude sous l’échantillon minimal', () => {
		// ⚠️ LE DOUTE NE PROFITE JAMAIS AU PRODUIT. Avec deux règlements, on ne
		// tient pas une habitude : on tient deux nombres. Inventer une médiane
		// dessus ferait produire des « ruptures » sur du hasard, et c'est la
		// façon la plus sûre de rendre le module inutile.
		const habitude = habitudeDePaiement(regulier([30, 32]));

		expect(habitude.connue).toBe(false);
		if (habitude.connue) return;
		expect(habitude.raison).toMatch(/2 règlement/);
	});

	it('accepte exactement l’échantillon minimal', () => {
		const habitude = habitudeDePaiement(regulier(Array(ECHANTILLON_MINIMAL).fill(30)));
		expect(habitude.connue).toBe(true);
	});

	it('mesure la DISPERSION, pas seulement le centre', () => {
		// Deux clients de même médiane et de régularité opposée n'appellent pas
		// le même seuil de rupture. Celui qui paie à 30 ± 1 jour est en rupture
		// à 40 ; celui qui oscille entre 10 et 50 ne l'est pas.
		const regle = habitudeDePaiement(regulier([30, 30, 31, 29, 30, 30]));
		const erratique = habitudeDePaiement(regulier([10, 50, 12, 48, 30, 35]));

		expect(regle.connue && erratique.connue).toBe(true);
		if (!regle.connue || !erratique.connue) return;
		expect(regle.dispersionJours).toBeLessThan(erratique.dispersionJours);
	});

	it('écarte un règlement dont une date n’existe pas au calendrier', () => {
		// ⚠️ `2026-02-30` ne lève pas sur bun — `Date.parse` le roule au 2 mars.
		// Une date fausse gardée dans l'échantillon décalerait la médiane sans
		// qu'aucun test d'arithmétique ne tombe.
		const avecFaute = [
			...regulier([30, 30, 30, 30]),
			paiement('F-FAUSSE', '2026-02-30', '2026-03-15')
		];
		const habitude = habitudeDePaiement(avecFaute);

		expect(habitude.connue).toBe(true);
		if (!habitude.connue) return;
		// Quatre règlements retenus, pas cinq.
		expect(habitude.echantillon).toBe(4);
	});
});

describe('la rupture d’habitude', () => {
	const reguliere = habitudeDePaiement(regulier([30, 30, 31, 29, 30, 30]));

	it('ne dit RIEN quand l’habitude est inconnue', () => {
		const sansHistorique = habitudeDePaiement(regulier([30]));
		const lecture = lireRupture(sansHistorique, 400);

		expect(lecture.etat).toBe('HABITUDE_INCONNUE');
	});

	it('voit la rupture d’un client habituellement ponctuel', () => {
		// ⚠️ LE CAS QUE LE SEUIL ABSOLU RATE. Trente-cinq jours de retard, c'est
		// sous n'importe quel seuil de relance — mais ce client-ci règle à trente,
		// toujours, et il en est à soixante-cinq. C'est le signal.
		expect(reguliere.connue).toBe(true);
		if (!reguliere.connue) return;

		const lecture = lireRupture(reguliere, 65);
		expect(lecture.etat).toBe('RUPTURE');
		if (lecture.etat !== 'RUPTURE') return;
		expect(lecture.habituelJours).toBe(30);
		expect(lecture.ecartJours).toBe(35);
	});

	it('se tait sur un client habituellement lent qui reste dans son habitude', () => {
		// ⚠️ L'AUTRE MOITIÉ DU MÊME TEST. Soixante-cinq jours de retard sur un
		// client qui paie TOUJOURS à soixante-cinq : rien ne s'est passé. Un
		// seuil absolu crierait, et le bruit s'apprend.
		const lente = habitudeDePaiement(regulier([65, 64, 66, 65, 65, 65]));
		expect(lente.connue).toBe(true);
		if (!lente.connue) return;

		expect(lireRupture(lente, 65).etat).toBe('CONFORME');
	});

	it('ne crie pas pour un écart plus petit que le plancher', () => {
		// Un client qui règle à trois jours et qui passe à huit n'est pas en
		// difficulté : il est parti en vacances. Sans plancher, une habitude très
		// serrée rendrait le module hystérique.
		const ponctuelle = habitudeDePaiement(regulier([3, 3, 3, 3, 3, 3]));
		expect(ponctuelle.connue).toBe(true);
		if (!ponctuelle.connue) return;

		expect(lireRupture(ponctuelle, 3 + PLANCHER_RUPTURE_JOURS - 1).etat).toBe('CONFORME');
		expect(lireRupture(ponctuelle, 3 + PLANCHER_RUPTURE_JOURS + 1).etat).toBe('RUPTURE');
	});

	it('demande un écart plus large à un payeur erratique', () => {
		// Même médiane, dispersion opposée : le seuil suit la dispersion.
		const erratique = habitudeDePaiement(regulier([10, 50, 12, 48, 30, 35]));
		expect(erratique.connue).toBe(true);
		if (!erratique.connue) return;

		// Un écart qui met le régulier en rupture laisse l'erratique conforme.
		expect(lireRupture(reguliere, 55).etat).toBe('RUPTURE');
		expect(lireRupture(erratique, 55).etat).toBe('CONFORME');
	});

	it('rend un constat refaisable à la main, jamais une recommandation', () => {
		expect(reguliere.connue).toBe(true);
		if (!reguliere.connue) return;

		const lecture = lireRupture(reguliere, 65);
		if (lecture.etat !== 'RUPTURE') return;

		// ⚠️ LIGNE ROUGE 3 : on ne recommande jamais une démarche. Le constat
		// porte des nombres et un fait, pas un verbe d'action.
		expect(lecture.constat).toMatch(/30/);
		expect(lecture.constat).toMatch(/65/);
		expect(lecture.constat).not.toMatch(/relanc|mise en demeure|injonction|poursuiv|recouvr/i);
	});

	it('ne voit aucune rupture sur un retard nul', () => {
		expect(reguliere.connue).toBe(true);
		if (!reguliere.connue) return;
		expect(lireRupture(reguliere, 0).etat).toBe('CONFORME');
	});
});
