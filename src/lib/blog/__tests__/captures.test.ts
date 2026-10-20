import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { capturesInconnues, ECRANS_DE_CAPTURE } from '../captures';

describe('les écrans de capture du blog', () => {
	it.each(ECRANS_DE_CAPTURE)('%s a ses deux images', (ecran) => {
		for (const largeur of [393, 786]) {
			expect(existsSync(join(process.cwd(), 'public', 'ecrans', `${ecran}-${largeur}.png`))).toBe(true);
		}
	});

	it('nomme un écran appelé sans capture', () => {
		expect(capturesInconnues('<Capture ecran="dossier" legende="x" />\n<Capture ecran="sante" />')).toEqual([
			'dossier'
		]);
	});
});
