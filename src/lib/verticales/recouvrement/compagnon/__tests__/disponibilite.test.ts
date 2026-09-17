import { describe, expect, it } from 'vitest';
import {
	ARRET_MENSUEL,
	AVERTISSEMENT_MENSUEL,
	coutDuTour,
	evaluerPlafond,
	refusAppelEchoue,
	refusSansCle
} from '../disponibilite';

/**
 * LE PLAFOND DE COÛT, ET CE QU'IL NE COUPE PAS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE TEST EXISTE, ALORS QUE LE COMPILATEUR NE VOIT RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux règles qu'une réécriture casse en silence :
 *
 * 1. **L'ORDRE DES DEUX SEUILS.** Un avertissement placé au-dessus de l'arrêt
 *    ne prévient jamais : le gérant découvre le plafond en le heurtant. Rien ne
 *    tombe, et le compteur fonctionne parfaitement.
 * 2. **D0 : LE REFUS EST UN CHEMIN, PAS UN MUR.** Un refus dont la première
 *    ligne est vide est un mur quel que soit ce qui suit — et c'est la forme
 *    que prend un refus composé sur une donnée absente. `composerRefus` le
 *    vérifie au point de construction ; ce test vérifie que chacun des trois
 *    refus de ce module la passe vraiment, et qu'il NOMME ce qui continue.
 *
 * ⚠️ ET CE QUI S'ARRÊTE EST LA CONVERSATION LIBRE, ELLE SEULE. La file, les
 * échéances, la prescription, les décomptes et les propositions ne passent par
 * aucun appel modèle : les trois refus le disent en toutes lettres, parce qu'un
 * refus qui commencerait par ce qui manque se lirait comme une panne du
 * logiciel entier.
 */

describe('les deux seuils', () => {
	it('préviennent avant d’arrêter', () => {
		expect(AVERTISSEMENT_MENSUEL).toBeLessThan(ARRET_MENSUEL);
	});

	it('laissent la conversation ouverte sous l’avertissement', () => {
		const etat = evaluerPlafond(AVERTISSEMENT_MENSUEL - 0.01);
		expect(etat.niveau).toBe('OUVERT');
		expect(etat.refus).toBeNull();
	});

	it('préviennent à l’avertissement, sans rien couper', () => {
		const etat = evaluerPlafond(AVERTISSEMENT_MENSUEL);
		expect(etat.niveau).toBe('AVERTI');
		expect(etat.refus).toBeNull();
		expect(etat.reste).toBeCloseTo(ARRET_MENSUEL - AVERTISSEMENT_MENSUEL, 10);
	});

	it('arrêtent au plafond de sécurité, et pas un centime avant', () => {
		expect(evaluerPlafond(ARRET_MENSUEL - 0.01).niveau).toBe('AVERTI');
		expect(evaluerPlafond(ARRET_MENSUEL).niveau).toBe('ARRETE');
		expect(evaluerPlafond(ARRET_MENSUEL * 3).niveau).toBe('ARRETE');
	});

	it('ne rendent jamais un reste négatif', () => {
		expect(evaluerPlafond(ARRET_MENSUEL * 10).reste).toBe(0);
	});
});

describe('le refus du plafond', () => {
	const refus = evaluerPlafond(ARRET_MENSUEL)?.refus;

	it('existe, et porte ses quatre parties remplies', () => {
		expect(refus).not.toBeNull();
		expect(refus!.peutFaire.trim()).not.toBe('');
		expect(refus!.constat.trim()).not.toBe('');
		expect(refus!.blocages.length).toBeGreaterThan(0);
		expect(refus!.coutDeLAttente.trim()).not.toBe('');
	});

	it('énumère d’abord ce qui continue, et le nomme', () => {
		// D0 : « un refus dont la première ligne est vide est un mur ». Vide ne
		// veut pas dire seulement la chaîne vide : une première ligne qui ne
		// nommerait rien de concret en est un aussi.
		expect(refus!.peutFaire).toMatch(/file/i);
		expect(refus!.peutFaire).toMatch(/prescription/i);
		expect(refus!.peutFaire).toMatch(/décompte/i);
	});

	it('dit que c’est la conversation LIBRE qui s’arrête, et elle seule', () => {
		expect(refus!.constat).toMatch(/conversation libre/i);
	});

	it('chiffre le cumul et déclare son unité comme un budget, pas une facture', () => {
		expect(refus!.constat).toMatch(/budget de pilotage/i);
		expect(refus!.constat).toMatch(/jamais une facture/i);
	});

	it('écrit le cumul à la française, virgule comprise', () => {
		// L'interface est en français, et « 30.00 » au milieu d'une phrase
		// française se lit comme une sortie de machine — sur la seule ligne du
		// produit qui doive convaincre que ce chiffre n'est pas une facture.
		expect(refus!.constat).toContain(`${ARRET_MENSUEL.toFixed(2).replace('.', ',')}`);
		expect(refus!.constat).not.toMatch(/\d\.\d\d/);
	});

	it('dit ce qui le lève au CONSTAT, jamais à l’impératif', () => {
		// « ce verrou se lève par… », pas « attendez le mois prochain ».
		expect(refus!.blocages.join(' ')).toMatch(/se lève/i);
	});

	it('déclare que l’attente ne coûte rien sur les droits, et pourquoi', () => {
		expect(refus!.coutDeLAttente).toMatch(/chiffrable/i);
		expect(refus!.coutDeLAttente).toMatch(/échéance/i);
	});
});

describe('les deux autres silences', () => {
	it('la clé absente rend un refus, jamais une erreur de SDK', () => {
		const refus = refusSansCle();
		expect(refus.peutFaire.trim()).not.toBe('');
		expect(refus.constat).toMatch(/clé d’appel/i);
		expect(refus.blocages.length).toBeGreaterThan(0);
	});

	it('l’appel échoué nomme l’échec sans le réessayer en silence', () => {
		const refus = refusAppelEchoue();
		expect(refus.peutFaire.trim()).not.toBe('');
		expect(refus.constat).toMatch(/silence/i);
		expect(refus.coutDeLAttente.trim()).not.toBe('');
	});
});

describe('le coût d’un tour', () => {
	it('lit le barème du socle, et compte le cache à part', () => {
		// Le seul site d'appel d'`estimerCout` dans tout le produit. Sans lui, le
		// barème est un module que personne n'interroge, et le plafond n'existe
		// que dans une spec.
		const sansCache = coutDuTour({ tokensIn: 8_000, tokensOut: 600, cacheReadTokens: 0 });
		const avecCache = coutDuTour({ tokensIn: 5_000, tokensOut: 600, cacheReadTokens: 3_000 });
		expect(sansCache).toBeGreaterThan(0);
		expect(avecCache).toBeLessThan(sansCache);
	});

	it('vaut zéro sur un tour qui n’a rien consommé', () => {
		expect(coutDuTour({ tokensIn: 0, tokensOut: 0, cacheReadTokens: 0 })).toBe(0);
	});

	it('franchit le plafond quand assez de tours s’additionnent', () => {
		// La chaîne entière, du jeton au refus : c'est elle qui manquait, et pas
		// l'un de ses maillons.
		const parTour = coutDuTour({ tokensIn: 8_000, tokensOut: 600, cacheReadTokens: 0 });
		const tours = Math.ceil(ARRET_MENSUEL / parTour);
		expect(evaluerPlafond(parTour * (tours - 1)).niveau).not.toBe('ARRETE');
		expect(evaluerPlafond(parTour * tours).niveau).toBe('ARRETE');
	});
});
