import { describe, it, expect } from 'vitest';
import {
	MACHINES,
	etatApres,
	suivreProcedure,
	type EvenementSurvenu
} from '../apres-procedure';
import { PARAMETRES, exiger } from '../parametres';

/**
 * LA MACHINE À ÉTATS POST-PROCÉDURE — module 4.5 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI ELLE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le blueprint la décrit en une ligne : « surveiller les délais qui courent
 * après une décision. Structurellement identique au compteur de prescription,
 * avec d'autres bornes. »
 *
 * Le produit savait déjà calculer les échéances d'une procédure ENGAGÉE, à
 * partir d'une seule date. Il ne savait rien de ce qui vient après : une
 * ordonnance rendue puis signifiée n'est pas dans le même état qu'une
 * ordonnance rendue et pas encore signifiée, et ce sont des délais différents
 * qui courent — dont un À PEINE DE CADUCITÉ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ÉTAT SE REJOUE, IL NE SE STOCKE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On enregistre les ÉVÉNEMENTS — « l'ordonnance a été signifiée le 14 mars » —
 * et l'état courant s'en déduit en les rejouant. Stocker l'état à côté des
 * événements ferait deux vérités qui finiraient par diverger, et la seconde
 * serait invisible : rien ne casse quand un état ment.
 *
 * C'est aussi ce qui rend le dossier auditable. « Qu'est-ce qui a été fait, et
 * quand » est la question qu'on pose six mois plus tard, devant un juge.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET LES DÉLAIS QU'ON NE CONNAÎT PAS SONT NOMMÉS, PAS OMIS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le délai d'opposition à une ordonnance signifiée EXISTE, et il n'est pas dans
 * le référentiel. Ne rien afficher laisserait croire que rien ne court. La
 * machine déclare donc l'angle mort et NOMME le paramètre manquant — c'est la
 * même règle que la surveillance de prescription, qui dit ses hypothèses.
 */

/** La date d'engagement : l'origine des délais tant que rien n'a bougé. */
const ENGAGEE_LE = '2025-11-02';

function evenement(cle: string, survenuLe: string): EvenementSurvenu {
	return { cle, survenuLe };
}

describe('les machines disponibles', () => {
	it('couvrent les procédures qui ont un après', () => {
		expect(Object.keys(MACHINES)).toContain('injonction-de-payer');
		expect(Object.keys(MACHINES)).toContain('l126-creances-commerciales');
	});

	it('partent toutes d’un état d’entrée unique', () => {
		for (const machine of Object.values(MACHINES)) {
			expect(machine.etats[machine.entree]).toBeDefined();
		}
	});

	it('n’énoncent que des constats, jamais des consignes', () => {
		// Ligne rouge 3. Un état qui dirait « il faut signifier » serait du conseil
		// de procédure ; « l'ordonnance n'est pas encore signifiée » est un fait.
		for (const machine of Object.values(MACHINES)) {
			for (const etat of Object.values(machine.etats)) {
				expect(etat.constat).not.toMatch(
					/vous devriez|il faut|nous vous conseillons|pensez à|n’oubliez pas/i
				);
			}
		}
	});

	it('mènent toutes à au moins un état terminal', () => {
		for (const machine of Object.values(MACHINES)) {
			expect(Object.values(machine.etats).some((e) => e.terminal)).toBe(true);
		}
	});
});

describe('rejouer les événements', () => {
	it('sans événement, rend l’état d’entrée', () => {
		const machine = MACHINES['injonction-de-payer']!;
		expect(etatApres(machine, [])).toBe(machine.entree);
	});

	it('avance d’un état à chaque événement reconnu', () => {
		const machine = MACHINES['injonction-de-payer']!;
		const etat = etatApres(machine, [
			evenement('ordonnance-rendue', '2026-01-10'),
			evenement('ordonnance-signifiee', '2026-02-10')
		]);
		expect(etat).toBe('ORDONNANCE_SIGNIFIEE');
	});

	it('ignore un événement qui ne sort pas de l’état courant', () => {
		// ⚠️ IGNORER PLUTÔT QUE LEVER. Un événement hors séquence est une saisie
		// du gérant, pas un bug : « l'ordonnance a été signifiée » avant qu'il ait
		// enregistré qu'elle était rendue. Refuser la seconde saisie perdrait
		// l'information ; la machine reste où elle est et l'écran le montre.
		const machine = MACHINES['injonction-de-payer']!;
		expect(etatApres(machine, [evenement('ordonnance-signifiee', '2026-02-10')])).toBe(
			machine.entree
		);
	});

	it('ne bouge plus une fois dans un état terminal', () => {
		const machine = MACHINES['injonction-de-payer']!;
		const etat = etatApres(machine, [
			evenement('ordonnance-rendue', '2026-01-10'),
			evenement('requete-rejetee', '2026-01-20')
		]);
		expect(etat).toBe('ORDONNANCE_RENDUE');
	});
});

describe('les délais qui courent dans l’état', () => {
	it('compte la signification depuis l’ordonnance, PAS depuis le dépôt', () => {
		// ⚠️ LE TEST QUI PORTE L'ÉCHÉANCE LA PLUS DANGEREUSE DU PRODUIT. Trois mois
		// sous peine de caducité, à compter de l'ordonnance. Les compter depuis le
		// dépôt de la requête avancerait la date limite de tout le temps
		// d'instruction — et ferait annoncer une caducité qui n'existe pas, ou
		// pire, la manquerait dans l'autre sens si l'instruction est rapide.
		const suivi = suivreProcedure('injonction-de-payer', [
			evenement('requete-deposee', '2025-11-02'),
			evenement('ordonnance-rendue', '2026-01-10')
		], ENGAGEE_LE);

		const signification = suivi.echeances.find((e) => e.cle === 'signification');
		expect(signification).toBeDefined();
		expect(signification!.gravite).toBe('CADUCITE');
		expect(signification!.dateLimite).toBe('2026-04-10');
		expect(exiger(PARAMETRES.delaiSignificationInjonction)).toBe(3);
	});

	it('ne fait plus courir la signification une fois signifiée', () => {
		const suivi = suivreProcedure('injonction-de-payer', [
			evenement('ordonnance-rendue', '2026-01-10'),
			evenement('ordonnance-signifiee', '2026-02-10')
		], ENGAGEE_LE);

		expect(suivi.echeances.find((e) => e.cle === 'signification')).toBeUndefined();
	});

	it('additionne le mois de contestation et les huit jours du procès-verbal', () => {
		// Les deux délais S'AJOUTENT : le procès-verbal se dresse huit jours après
		// l'EXPIRATION du mois, pas huit jours après la signification.
		const suivi = suivreProcedure('l126-creances-commerciales', [
			evenement('commandement-signifie', '2026-01-15')
		], ENGAGEE_LE);

		expect(suivi.echeances.find((e) => e.cle === 'fin-contestation')!.dateLimite).toBe(
			'2026-02-15'
		);
		expect(suivi.echeances.find((e) => e.cle === 'proces-verbal-possible')!.dateLimite).toBe(
			'2026-02-23'
		);
	});

	it('rend les échéances dans l’ordre où elles tombent', () => {
		const suivi = suivreProcedure('l126-creances-commerciales', [
			evenement('commandement-signifie', '2026-01-15')
		], ENGAGEE_LE);

		const dates = suivi.echeances.map((e) => e.dateLimite);
		expect([...dates].sort()).toEqual(dates);
	});

	it('ne fait courir aucun délai dans un état terminal', () => {
		const suivi = suivreProcedure('l126-creances-commerciales', [
			evenement('commandement-signifie', '2026-01-15'),
			evenement('contestation-recue', '2026-01-28')
		], ENGAGEE_LE);

		expect(suivi.echeances).toEqual([]);
		expect(suivi.terminal).toBe(true);
	});
});

describe('ce que la machine ne sait pas', () => {
	it('NOMME le délai d’opposition, qu’aucune source ne fournit', () => {
		// ⚠️ CE QUE LE LOGICIEL NE VOIT PAS S'AFFICHE AUSSI. Un délai d'opposition
		// court après la signification ; sa durée n'est pas au référentiel. Ne rien
		// montrer laisserait croire que rien ne court — et un gérant qui croit sa
		// procédure surveillée ne la surveille pas lui-même.
		const suivi = suivreProcedure('injonction-de-payer', [
			evenement('ordonnance-rendue', '2026-01-10'),
			evenement('ordonnance-signifiee', '2026-02-10')
		], ENGAGEE_LE);

		expect(suivi.anglesMorts.length).toBeGreaterThan(0);
		expect(suivi.anglesMorts.join(' ')).toMatch(/opposition/i);
	});

	it('n’invente jamais une date pour un délai qu’elle ignore', () => {
		// Un angle mort est une phrase, jamais une échéance datée. Une date
		// inventée est plus dangereuse qu'une absence, parce qu'elle a l'air
		// vérifiable — c'est la règle 0.1 du projet, appliquée au calendrier.
		const suivi = suivreProcedure('injonction-de-payer', [
			evenement('ordonnance-rendue', '2026-01-10'),
			evenement('ordonnance-signifiee', '2026-02-10')
		], ENGAGEE_LE);

		for (const echeance of suivi.echeances) {
			expect(echeance.dateLimite).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
		expect(suivi.echeances.some((e) => e.cle.includes('opposition'))).toBe(false);
	});

	it('refuse une procédure sans machine plutôt que d’en inventer une', () => {
		expect(() => suivreProcedure('relance-amiable', [], ENGAGEE_LE)).toThrow(/relance-amiable/);
	});
});

describe('ce qu’on peut enregistrer ensuite', () => {
	it('rend les événements qui sortent de l’état courant, et eux seuls', () => {
		const suivi = suivreProcedure('injonction-de-payer', [
			evenement('ordonnance-rendue', '2026-01-10')
		], ENGAGEE_LE);

		const cles = suivi.suites.map((s) => s.cle);
		expect(cles).toContain('ordonnance-signifiee');
		// On n'a pas encore signifié : constater l'absence d'opposition n'a pas
		// de sens, et le proposer ferait enregistrer une étape sautée.
		expect(cles).not.toContain('absence-opposition-constatee');
	});

	it('ne propose plus rien dans un état terminal', () => {
		const suivi = suivreProcedure('injonction-de-payer', [
			evenement('ordonnance-rendue', '2026-01-10'),
			evenement('ordonnance-signifiee', '2026-02-10'),
			evenement('opposition-formee', '2026-02-20')
		], ENGAGEE_LE);

		expect(suivi.suites).toEqual([]);
		expect(suivi.terminal).toBe(true);
	});
});
