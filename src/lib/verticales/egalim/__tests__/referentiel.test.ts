import { describe, it, expect } from 'vitest';
import {
	REFERENTIEL_VERSION,
	SEUILS,
	estBio,
	estDurable,
	LABELS_QUALIFIANTS,
	FAUX_AMIS
} from '../referentiel';
import { LABELS } from '../types';

describe('REFERENTIEL_VERSION', () => {
	it('est versionnée au format AAAA-MM', () => {
		expect(REFERENTIEL_VERSION).toMatch(/^\d{4}-\d{2}$/);
	});
});

describe('SEUILS', () => {
	it('porte les trois seuils légaux', () => {
		expect(SEUILS.durable).toBe(0.5);
		expect(SEUILS.bio).toBe(0.2);
		expect(SEUILS.viandePoissonDurable).toBe(0.6);
	});
});

describe('estBio — seuls le bio et la conversion comptent', () => {
	it('AB compte en bio', () => expect(estBio(['AB'])).toBe(true));
	it('la conversion compte en bio', () => expect(estBio(['CONVERSION'])).toBe(true));

	it.each([
		'LABEL_ROUGE',
		'AOP_AOC_IGP_STG',
		'HVE3',
		'FERMIER',
		'PECHE_DURABLE',
		'COMMERCE_EQUITABLE',
		'RUP',
		'CYCLE_DE_VIE'
	] as const)('%s ne compte PAS en bio', (label) => {
		expect(estBio([label])).toBe(false);
	});

	it('aucun label ne donne pas bio', () => expect(estBio([])).toBe(false));
});

describe('estDurable — tous les labels du barème comptent', () => {
	it.each(LABELS)('%s compte en durable', (label) => {
		expect(estDurable([label])).toBe(true);
	});
	it('aucun label ne donne pas durable', () => expect(estDurable([])).toBe(false));
});

describe('bio implique durable', () => {
	it('AB est durable', () => expect(estDurable(['AB'])).toBe(true));
	it('la conversion est durable', () => expect(estDurable(['CONVERSION'])).toBe(true));
});

describe('LABELS_QUALIFIANTS couvre exactement le barème', () => {
	it('couvre les 10 labels et rien d’autre', () => {
		expect(Object.keys(LABELS_QUALIFIANTS).sort()).toEqual([...LABELS].sort());
	});
});

describe('FAUX_AMIS — mentions qui ressemblent à des labels sans en être', () => {
	it('cite les faux amis relevés sur de vraies factures', () => {
		const mentions = FAUX_AMIS.map((f) => f.mention).join(' ');
		expect(mentions).toContain('VBF');
		expect(mentions).toContain('plein air');
	});

	it('donne la nature réelle de chaque faux ami', () => {
		for (const f of FAUX_AMIS) {
			expect(f.nature.length).toBeGreaterThan(10);
		}
	});
});
