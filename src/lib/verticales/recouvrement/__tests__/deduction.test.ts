import { describe, it, expect } from 'vitest';
import { depuisEuros, ZERO } from '../../../socle/montants';
import { deduireConditions } from '../deduction';

/**
 * Ce que le logiciel déduit seul, et ce qu'il doit demander.
 *
 * RÈGLE D'ÉCRAN N° 1 DU PROJET : « le logiciel décide, le gérant confirme.
 * Aucun écran ne demande une saisie que le logiciel peut déduire. Un champ vide
 * qu'il aurait pu remplir est un défaut. »
 *
 * Deux des quatre conditions légales se déduisent des données. Les deux autres
 * ne se déduisent pas, et le questionnaire ne doit porter que sur elles :
 * poser quatre questions quand deux suffisent use la seule ressource vraiment
 * rare, l'attention du gérant.
 */

const BASE = {
	montantExigible: depuisEuros('12000,00'),
	dateExigibilite: '2026-05-15',
	aujourdHui: '2026-09-03',
	creancierCommercant: 'ok' as const,
	debiteurCommercant: 'ok' as const
};

describe('caractère liquide — déductible', () => {
	it('est établi dès que le montant est chiffré', () => {
		// Une créance liquide est une créance dont le montant est déterminé.
		// C'est le cas par construction dès qu'une facture porte un total.
		expect(deduireConditions(BASE).liquide).toBe('ok');
	});

	it('n’est pas établi sur un montant nul', () => {
		expect(deduireConditions({ ...BASE, montantExigible: ZERO }).liquide).toBe('ko');
	});

	it('n’est pas établi sur un solde négatif', () => {
		// Plus d'avoirs que de factures : il n'y a rien à réclamer.
		expect(deduireConditions({ ...BASE, montantExigible: depuisEuros('-50,00') }).liquide).toBe(
			'ko'
		);
	});
});

describe('caractère exigible — déductible', () => {
	it('est établi quand la date d’exigibilité est passée', () => {
		expect(deduireConditions(BASE).exigible).toBe('ok');
	});

	it('est établi le jour même de l’exigibilité', () => {
		expect(deduireConditions({ ...BASE, aujourdHui: '2026-05-15' }).exigible).toBe('ok');
	});

	it('est expressément absent tant que la date n’est pas atteinte', () => {
		// Pas « inconnu » : on SAIT que ce n'est pas encore exigible. Poser la
		// question au gérant serait lui demander de confirmer une évidence.
		expect(deduireConditions({ ...BASE, aujourdHui: '2026-01-01' }).exigible).toBe('ko');
	});

	it('reste indéterminé quand aucune date d’exigibilité n’est connue', () => {
		expect(deduireConditions({ ...BASE, dateExigibilite: undefined }).exigible).toBe('unknown');
	});
});

describe('qualité de commerçant — déductible des deux parties', () => {
	it('est établie quand les deux parties sont commerçantes', () => {
		expect(deduireConditions(BASE).entreCommercants).toBe('ok');
	});

	it('est absente dès qu’une partie ne l’est pas', () => {
		expect(
			deduireConditions({ ...BASE, debiteurCommercant: 'ko' }).entreCommercants
		).toBe('ko');
		expect(
			deduireConditions({ ...BASE, creancierCommercant: 'ko' }).entreCommercants
		).toBe('ko');
	});

	it('reste indéterminée dès qu’une partie est indéterminée', () => {
		// Le doute d'un côté suffit : deux inconnues ne font pas une certitude.
		expect(
			deduireConditions({ ...BASE, debiteurCommercant: 'unknown' }).entreCommercants
		).toBe('unknown');
	});

	it('laisse le « ko » l’emporter sur le « unknown »', () => {
		// Savoir qu'une partie n'est PAS commerçante tranche la question, même si
		// l'autre est inconnue : la condition ne sera pas remplie.
		expect(
			deduireConditions({
				...BASE,
				creancierCommercant: 'unknown',
				debiteurCommercant: 'ko'
			}).entreCommercants
		).toBe('ko');
	});
});

describe('caractère certain — jamais déduit', () => {
	it('reste indéterminé, toujours', () => {
		// Une créance est certaine si elle n'est pas sérieusement contestée. Rien
		// dans une facture ne le dit : l'absence de contestation CONNUE n'est pas
		// une absence de contestation. Le déduire à « ok » serait présumer
		// favorablement, ce que le brief interdit expressément.
		expect(deduireConditions(BASE).certaine).toBe('unknown');
	});
});

describe('ce qui reste à demander', () => {
	it('ne pose qu’une question quand tout le reste est déduit', () => {
		const conditions = deduireConditions(BASE);
		const aDemander = Object.entries(conditions).filter(([, etat]) => etat === 'unknown');
		expect(aDemander.map(([nom]) => nom)).toEqual(['certaine']);
	});

	it('en pose deux quand la qualité du débiteur est inconnue', () => {
		const conditions = deduireConditions({ ...BASE, debiteurCommercant: 'unknown' });
		const aDemander = Object.entries(conditions).filter(([, etat]) => etat === 'unknown');
		expect(aDemander.map(([nom]) => nom).sort()).toEqual(['certaine', 'entreCommercants']);
	});
});
