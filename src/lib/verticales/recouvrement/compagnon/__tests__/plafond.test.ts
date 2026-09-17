import { describe, it, expect } from 'vitest';
import {
	PROPOSITIONS_PAR_JOUR,
	PROPOSITIONS_PAR_RANGEE,
	CHAMP_PRESCRIPTION,
	champEteintUnDroit,
	eteintUnDroit,
	plafonner,
	resumeDuPlafond,
	type CandidatProposition
} from '../propositions';

/**
 * LES DEUX GARDE-FOUS DU PLAFOND, ET RIEN D'AUTRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CES DEUX-LÀ MÉRITENT UN TEST NEUF
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce sont exactement les deux règles qu'une réécriture casse EN SILENCE. Le
 * plafond, lui, se voit : une file qui n'affiche rien se remarque le jour même.
 * Les garde-fous non.
 *
 * 1. Une échéance qui éteint un droit avalée par le plafond ne produit aucune
 *    erreur : la file se rend, plus courte, et le gérant perd une prescription
 *    en croyant être surveillé. C'est le pire état du produit, et il est muet.
 *
 * 2. Un reste tronqué en silence ne produit aucune erreur non plus. C'est le
 *    défaut de `MODE_COMPACT` (`accueil.tsx:164`), où les alertes 4 à N ne sont
 *    atteignables nulle part : le code est correct, la mise en page est propre,
 *    et l'information est perdue.
 *
 * ⚠️ SEPT N'EST PAS ÉCRIT EN DUR ICI. Les cas se construisent sur
 * `PROPOSITIONS_PAR_JOUR`, parce que cette constante est une hypothèse DATÉE
 * écrite pour être déplacée : un test qui épingle le sept ferait échouer le
 * déplacement qu'il est censé rendre possible.
 */

function ordinaire(n: number, cible = 'creance-1'): CandidatProposition[] {
	return Array.from({ length: n }, (_, i) => ({
		cible: `${cible}-${i}`,
		champ: 'CONTESTATION_ECRITE',
		valeur: 'OUI',
		source: { nature: 'PIECE' as const, pieceId: `piece-${i}` },
		eteintUnDroit: false
	}));
}

function echeance(n: number): CandidatProposition[] {
	return Array.from({ length: n }, (_, i) => ({
		cible: `debiteur-${i}`,
		champ: CHAMP_PRESCRIPTION,
		valeur: `La facture F-${i} sera prescrite le 14 octobre 2026.`,
		source: { nature: 'REFERENTIEL' as const, cleParametre: 'delaiPrescriptionCommerciale' },
		eteintUnDroit: true
	}));
}

describe('garde-fou 1 : une échéance qui éteint un droit ne compte jamais dans les sept', () => {
	it('pose toutes les échéances même quand le plafond est déjà atteint', () => {
		const pose = plafonner([...ordinaire(PROPOSITIONS_PAR_JOUR), ...echeance(5)]);

		expect(pose.aPoser.filter((c) => c.eteintUnDroit)).toHaveLength(5);
		expect(pose.horsPlafond).toBe(5);
		// Elles ne sont ni différées, ni comptées comme un dépassement.
		expect(pose.enAttente).toBe(0);
	});

	it('ne laisse pas une échéance consommer la place d’une proposition ordinaire', () => {
		// Les échéances passent EN PREMIER : si elles comptaient dans les sept,
		// les ordinaires qui suivent seraient toutes repoussées.
		const pose = plafonner([...echeance(40), ...ordinaire(PROPOSITIONS_PAR_JOUR)]);

		expect(pose.aPoser).toHaveLength(40 + PROPOSITIONS_PAR_JOUR);
		expect(pose.enAttente).toBe(0);
	});

	it('ne compte pas davantage celles déjà posées plus tôt dans la journée', () => {
		const dejaPosees = [
			...Array.from({ length: 30 }, (_, i) => ({ cible: `d-${i}`, eteintUnDroit: true })),
			{ cible: 'creance-0', eteintUnDroit: false }
		];

		const pose = plafonner(ordinaire(PROPOSITIONS_PAR_JOUR), dejaPosees);

		// Une seule place est prise : les trente échéances n'en prennent aucune.
		expect(pose.aPoser).toHaveLength(PROPOSITIONS_PAR_JOUR - 1);
		expect(pose.enAttente).toBe(1);
	});

	it('dit la même chose à la pose et au recompte', () => {
		// ⚠️ LE TROU QUE CE CAS FERME. À la pose, l'exemption se lit sur
		// l'ÉVÉNEMENT ; au recompte de ce qui a déjà été posé aujourd'hui,
		// l'événement n'existe plus et il ne reste que le champ écrit en base. Si
		// les deux lectures divergeaient, une prescription posée le matin
		// consommerait une des sept places de l'après-midi, en silence.
		const posee = echeance(1)[0]!;
		expect(posee.eteintUnDroit).toBe(true);
		expect(champEteintUnDroit(posee.champ)).toBe(true);

		const ordinaires = ordinaire(1)[0]!;
		expect(ordinaires.eteintUnDroit).toBe(false);
		expect(champEteintUnDroit(ordinaires.champ)).toBe(false);
	});

	it('reconnaît la prescription et la caducité, et rien d’autre', () => {
		expect(eteintUnDroit({ type: 'PRESCRIPTION_PROCHE', urgence: 'CRITIQUE' })).toBe(true);
		// Une échéance de procédure CRITIQUE est une caducité : `surveillance.ts`
		// n'élève à CRITIQUE que la gravité `CADUCITE`.
		expect(eteintUnDroit({ type: 'ECHEANCE_PROCEDURE', urgence: 'CRITIQUE' })).toBe(true);
		expect(eteintUnDroit({ type: 'ECHEANCE_PROCEDURE', urgence: 'HAUTE' })).toBe(false);
		expect(eteintUnDroit({ type: 'FACTURE_ECHUE', urgence: 'HAUTE' })).toBe(false);
		expect(eteintUnDroit({ type: 'DEBITEUR_DEGRADE', urgence: 'HAUTE' })).toBe(false);
	});
});

describe('garde-fou 2 : ce qui dépasse est compté, jamais tronqué en silence', () => {
	it('compte exactement le reste au lieu de le jeter', () => {
		const pose = plafonner(ordinaire(PROPOSITIONS_PAR_JOUR + 12));

		expect(pose.aPoser).toHaveLength(PROPOSITIONS_PAR_JOUR);
		expect(pose.enAttente).toBe(12);
		// Rien ne se perd : ce qui est posé plus ce qui attend fait le tout.
		expect(pose.aPoser.length + pose.enAttente).toBe(PROPOSITIONS_PAR_JOUR + 12);
	});

	it('compte aussi ce que la règle de grain diffère sur une rangée', () => {
		const surUneSeuleRangee: CandidatProposition[] = Array.from({ length: 5 }, (_, i) => ({
			cible: 'creance-unique',
			champ: `CHAMP_${i}`,
			valeur: 'OUI',
			source: { nature: 'PIECE' as const, pieceId: `piece-${i}` },
			eteintUnDroit: false
		}));

		const pose = plafonner(surUneSeuleRangee);

		expect(pose.aPoser).toHaveLength(PROPOSITIONS_PAR_RANGEE);
		expect(pose.enAttente).toBe(5 - PROPOSITIONS_PAR_RANGEE);
	});

	it('nomme le reste en toutes lettres, et ne se tait jamais quand il en reste', () => {
		expect(resumeDuPlafond(7, 12)).toContain('12 autres en attente');
		expect(resumeDuPlafond(7, 1)).toContain('1 autre en attente');
		expect(resumeDuPlafond(1, 0)).toBe('1 proposition aujourd’hui, rien en attente.');
	});

	it('ne pose rien et compte tout quand la journée est déjà pleine', () => {
		const dejaPosees = Array.from({ length: PROPOSITIONS_PAR_JOUR }, (_, i) => ({
			cible: `c-${i}`,
			eteintUnDroit: false
		}));

		const pose = plafonner(ordinaire(4), dejaPosees);

		expect(pose.aPoser).toHaveLength(0);
		expect(pose.enAttente).toBe(4);
	});
});
