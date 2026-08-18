import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * La ligne rouge juridique du modèle : Mycelium ne garantit jamais la
 * conformité, il la MESURE, la fait progresser et la prouve. La déclaration
 * reste signée par la cantine.
 *
 * Ce test peut sembler excessif. Il ne l'est pas : la ligne se franchit en
 * une phrase bien intentionnée, et personne ne relit un rapport avant de
 * l'envoyer à un client.
 */

const SOURCES = [
	'src/routes/[[lang]]/app/diagnostic/[id]/+page.svelte',
	'src/routes/[[lang]]/app/factures/+page.svelte',
	'src/lib/convex/egalim/diagnostics.ts'
];

describe('le rapport et le parcours client ne promettent rien', () => {
	it.each(SOURCES)('%s n’emploie jamais « garanti »', (chemin) => {
		expect(readFileSync(chemin, 'utf8').toLowerCase()).not.toMatch(/garanti/);
	});

	it.each(SOURCES)('%s ne promet pas la conformité au futur', (chemin) => {
		const source = readFileSync(chemin, 'utf8').toLowerCase();
		// « conforme » au futur ou au conditionnel : « vous serez conforme »,
		// « vous seriez conforme », « rendra conforme ».
		expect(source).not.toMatch(/(ser[ao][a-z]*|rendr[a-z]+|deviendr[a-z]+)\s+conforme/);
	});

	it('le rapport dit explicitement que la déclaration reste signée par la cantine', () => {
		const source = readFileSync(SOURCES[0]!, 'utf8');
		expect(source).toMatch(/signée par votre établissement/);
	});

	it('le rapport dit explicitement qu’il est figé à sa date', () => {
		const source = readFileSync(SOURCES[0]!, 'utf8');
		expect(source).toMatch(/figé à/);
	});
});
