import { describe, expect, it } from 'vitest';
import { depuisEuros } from '../../../socle/montants';
import { aNotifier } from '../briefing';
import type { Evenement } from '../surveillance';

/**
 * CE QUI MÉRITE D'INTERROMPRE, ET RIEN D'AUTRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE SYSTÈME DE NOTIFICATION ÉTAIT DOUBLEMENT MORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Relevé le 12 septembre 2026 : `createNotification` n'était appelée par
 * personne, et `listMyNotifications` non plus. Rien n'en écrivait, rien n'en
 * lisait. Le blueprint le veut pourtant au module 2.1 — « recalcul quotidien,
 * notification SANS QU'ON OUVRE L'ÉCRAN » — et c'est la moitié de ce qui
 * distingue un radar d'un rapport.
 *
 * Construire la cloche d'abord aurait affiché une liste toujours vide : pire
 * que rien, parce qu'on en aurait conclu qu'il ne se passe jamais rien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA RÈGLE N'EST PAS INVENTÉE ICI : ELLE ÉTAIT DÉJÀ ÉCRITE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `surveillance.ts` la pose, mot pour mot : « Les notifications interrompent —
 * elles sont réservées à ce qui fait perdre un droit sans qu'on ait rien fait,
 * c'est-à-dire à la prescription et aux échéances de procédure. Envoyer une
 * notification pour chaque rupture ferait exactement ce que ce module existe
 * pour éviter : du bruit qu'on apprend à ignorer, jusqu'au jour où il portait
 * le signal qui comptait. »
 *
 * Et le blueprint la redouble : « la rareté de l'alarme est ce qui la fait
 * obéir. C'est l'inverse du réflexe de croissance, et c'est une contrainte de
 * conception, pas une préférence. »
 *
 * ⚠️ ON DÉRIVE DE L'URGENCE, PAS D'UNE LISTE DE TYPES. `CRITIQUE` désigne
 * exactement ces deux-là : une prescription l'est toujours, une échéance de
 * procédure seulement quand elle est de gravité CADUCITÉ. Écrire la liste des
 * types à la main créerait une seconde vérité qui divergerait de la première
 * au premier ajout.
 */

function evenement(sur: Partial<Evenement> = {}): Evenement {
	return {
		type: 'PRESCRIPTION_PROCHE',
		reference: 'FA-2021-0087',
		montant: depuisEuros('9240,00'),
		urgence: 'CRITIQUE',
		explication: 'La facture FA-2021-0087 sera prescrite le 2026-10-14.',
		action: 'Ouvrir la facture FA-2021-0087.',
		...sur
	};
}

describe('ce qui mérite une notification', () => {
	it('retient une prescription qui approche', () => {
		expect(aNotifier([evenement()], [])).toHaveLength(1);
	});

	it('retient une échéance de procédure CRITIQUE — celle qui fait perdre le droit', () => {
		const retenus = aNotifier(
			[evenement({ type: 'ECHEANCE_PROCEDURE', reference: 'C-1', urgence: 'CRITIQUE' })],
			[]
		);
		expect(retenus).toHaveLength(1);
	});

	it('écarte une échéance seulement informative', () => {
		// Gravité INFORMATIVE → urgence HAUTE. Elle structure la suite, elle
		// n'éteint rien : elle a sa place dans le flux, pas dans une interruption.
		expect(
			aNotifier([evenement({ type: 'ECHEANCE_PROCEDURE', urgence: 'HAUTE' })], [])
		).toEqual([]);
	});

	it('écarte une rupture d’habitude, une facture échue, une créance mûre', () => {
		// ⚠️ AUCUNE DES TROIS N'ÉTEINT QUOI QUE CE SOIT. Les notifier serait
		// exactement le bruit que la règle existe pour empêcher — et le jour où
		// une prescription arrive, elle serait lue comme les autres.
		expect(
			aNotifier(
				[
					evenement({ type: 'HABITUDE_ROMPUE', urgence: 'NORMALE' }),
					evenement({ type: 'FACTURE_ECHUE', urgence: 'NORMALE' }),
					evenement({ type: 'CREANCE_MURE', urgence: 'HAUTE' })
				],
				[]
			)
		).toEqual([]);
	});

	it('ne redit pas ce qu’il a déjà dit hier', () => {
		// ⚠️ C'EST CE QUI SÉPARE UNE ALERTE D'UN RAPPEL QUOTIDIEN. Une facture
		// reste « bientôt prescrite » pendant quatre-vingt-dix jours : notifier
		// chaque matin apprendrait à écarter la notification en trois jours, et
		// elle serait écartée le matin où une AUTRE arrive.
		const deja = ['PRESCRIPTION_PROCHE:FA-2021-0087'];
		expect(aNotifier([evenement()], deja)).toEqual([]);
	});

	it('dit ce qui est nouveau, même quand l’ancien court toujours', () => {
		const deja = ['PRESCRIPTION_PROCHE:FA-2021-0087'];
		const retenus = aNotifier(
			[evenement(), evenement({ reference: 'FA-2022-0140' })],
			deja
		);

		expect(retenus).toHaveLength(1);
		expect(retenus[0]?.reference).toBe('FA-2022-0140');
	});
});
