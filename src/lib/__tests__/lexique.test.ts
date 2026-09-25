import { describe, it, expect } from 'vitest';
import { join, relative, sep } from 'node:path';
import { LEXIQUE } from '../verticales/recouvrement/lexique';
import { fichiersSources, lire, textesDInterface } from './textes-interface';

/**
 * LE LANGAGE DE TOUT LE MONDE, TENU PAR UN TEST.
 *
 * Le produit s'adresse à un gérant, pas à un juriste : « votre client » et non
 * « le débiteur », « pénalités de retard » et non « intérêts de retard », « date
 * limite pour agir en justice » et non « prescription ». Le mot du droit reste
 * permis entre parenthèses, en second, jamais en titre ni sur un bouton.
 *
 * ⚠️ DEUX FICHIERS EN SONT EXCLUS, NOMMÉMENT : ils rendent des DOCUMENTS
 * TRANSMIS — le calcul en PDF qui part au client ou au greffe, et le dossier que
 * lit l'avocat. Leur vocabulaire juridique exact est voulu.
 */

const PERIMETRE = [
	join('src', 'ui'),
	join('src', 'screens'),
	join('src', 'routes', 'app'),
	join('src', 'app')
];

const DOCUMENTS_TRANSMIS: Readonly<Record<string, string>> = {
	[join('src', 'ui', 'piece-decompte.ts')]: 'Le calcul en PDF : un document transmis.',
	[join('src', 'screens', 'piece.tsx')]: 'Le dossier que lit l’avocat : un document transmis.'
};

/** Le mot du droit est permis entre parenthèses : c'est sa place, en second. */
function horsParentheses(texte: string): string {
	return texte.replace(/\([^)]*\)/g, ' ');
}

function ecarts(): string[] {
	const trouves: string[] = [];
	for (const dossier of PERIMETRE) {
		for (const chemin of fichiersSources(join(process.cwd(), dossier))) {
			const local = relative(process.cwd(), chemin);
			if (local in DOCUMENTS_TRANSMIS) continue;
			for (const { ligne, texte } of textesDInterface(lire(chemin), chemin)) {
				const vu = horsParentheses(texte);
				for (const entree of LEXIQUE) {
					if (entree.motif !== null && entree.motif.test(vu)) {
						trouves.push(
							`${local.split(sep).join('/')}:${ligne} — « ${entree.droit} » → « ${entree.interface} » : ${texte.slice(0, 120)}`
						);
					}
				}
			}
		}
	}
	return trouves;
}

describe('le lexique', () => {
	it('le balayage voit bien l’interface', () => {
		const n = PERIMETRE.flatMap((d) => fichiersSources(join(process.cwd(), d))).length;
		expect(n).toBeGreaterThanOrEqual(100);
	});

	it('reconnaît un mot du droit, et le laisse passer entre parenthèses', () => {
		const [texte] = textesDInterface('export const t = <p>Le débiteur n’a pas payé.</p>;');
		expect(LEXIQUE.some((e) => e.motif?.test(horsParentheses(texte!.texte)))).toBe(true);
		const [second] = textesDInterface(
			'export const t = <p>Lettre de relance officielle (mise en demeure)</p>;'
		);
		expect(LEXIQUE.some((e) => e.motif?.test(horsParentheses(second!.texte)))).toBe(false);
	});

	it('aucun écran n’emploie le mot du droit là où le mot de tous les jours est attendu', () => {
		expect(
			ecarts(),
			'Reprendre ces textes avec le mot de l’interface (src/lib/verticales/recouvrement/lexique.ts).'
		).toEqual([]);
	});

	it('n’exclut que des fichiers qui existent', () => {
		const tous = new Set(
			PERIMETRE.flatMap((d) => fichiersSources(join(process.cwd(), d))).map((c) =>
				relative(process.cwd(), c)
			)
		);
		for (const exclu of Object.keys(DOCUMENTS_TRANSMIS)) expect(tous.has(exclu), exclu).toBe(true);
	});
});
