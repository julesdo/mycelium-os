import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * CE QUI FAIT D'UNE PAGE WEB UNE APPLICATION SUR UN TÉLÉPHONE NE SE PERD PAS AU
 * PREMIER AJOUT (20/10/2026).
 *
 * La passe du 20/10 sur les règles d'Apple et du web mobile natif a corrigé des
 * défauts qu'aucun écran d'ordinateur ne montre : un survol qui RESTE allumé
 * après un toucher, une hauteur d'écran qui passe sous la barre du navigateur,
 * une page qu'on empêcherait de zoomer. Chacun revient au premier `:hover` écrit
 * sans garde ou au premier `h-screen` : ce test les refuse là où ils s'écrivent.
 */

const SRC = join(import.meta.dirname, '..', '..');

function fichiers(dossier: string, motif: RegExp, trouves: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		if (entree === '__tests__' || entree === '_generated') continue;
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) fichiers(chemin, motif, trouves);
		else if (motif.test(entree)) trouves.push(chemin);
	}
	return trouves;
}

/**
 * Les règles `:hover` d'une feuille qui ne sont sous AUCUNE requête
 * `(hover: hover)`. Un lecteur d'accolades suffit : commentaires et chaînes
 * retirés, chaque bloc garde le prélude qui l'ouvre.
 */
function survolsSansGarde(css: string): string[] {
	const net = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^']*'|"[^"]*"/g, "''");
	const pile: string[] = [];
	const fautifs: string[] = [];
	let debut = 0;
	for (let i = 0; i < net.length; i++) {
		const c = net[i];
		if (c === '{') {
			const prelude = net.slice(debut, i).trim();
			const garde = pile.some((p) => /^@media\b[^{]*\(hover:\s*hover\)/.test(p));
			if (prelude.includes(':hover') && !prelude.startsWith('@') && !garde) {
				fautifs.push(prelude.replace(/\s+/g, ' '));
			}
			pile.push(prelude);
			debut = i + 1;
		} else if (c === '}') {
			pile.pop();
			debut = i + 1;
		} else if (c === ';') {
			debut = i + 1;
		}
	}
	return fautifs;
}

describe('l’ergonomie au doigt', () => {
	it('ne pose aucun survol sans `@media (hover: hover)` dans nos feuilles', () => {
		const feuilles = [
			...fichiers(join(SRC, 'styles'), /\.css$/),
			...fichiers(join(SRC, 'ui'), /\.css$/)
		];
		expect(feuilles.length).toBeGreaterThan(1);
		const fautifs = feuilles.flatMap((f) =>
			survolsSansGarde(readFileSync(f, 'utf8')).map((s) => `${f.slice(f.indexOf('src'))} — ${s}`)
		);
		expect(fautifs).toEqual([]);
	});

	it('le lecteur d’accolades voit un survol sans garde, et le laisse passer sous garde', () => {
		expect(survolsSansGarde('.a:hover { color: red; }')).toEqual(['.a:hover']);
		expect(
			survolsSansGarde('@media (hover: hover) and (pointer: fine) { .a:hover { color: red; } }')
		).toEqual([]);
		expect(survolsSansGarde('/* .a:hover { } */ .b { content: "{"; }')).toEqual([]);
	});

	it('n’emploie jamais la hauteur d’écran `vh` : `dvh` pour une coquille, `svh` pour un premier écran', () => {
		const sources = ['ui', 'styles', 'screens', 'app', 'marketing', 'routes'].flatMap((d) =>
			fichiers(join(SRC, d), /\.(tsx?|css)$/)
		);
		const fautifs = sources.flatMap((f) =>
			readFileSync(f, 'utf8')
				.split('\n')
				.filter((ligne) => /\b(min-|max-)?h-screen\b|\b\d+vh\b/.test(ligne))
				.map((ligne) => `${f.slice(f.indexOf('src'))} — ${ligne.trim().slice(0, 80)}`)
		);
		expect(fautifs).toEqual([]);
	});

	it('laisse zoomer, peint sous l’encoche et redimensionne au clavier', () => {
		const racine = readFileSync(join(SRC, 'routes', '__root.tsx'), 'utf8');
		const viewport = racine.match(/name: 'viewport',[\s\S]*?content:\s*'([^']+)'/)?.[1] ?? '';
		expect(viewport).toContain('width=device-width');
		expect(viewport).toContain('viewport-fit=cover');
		expect(viewport).toContain('interactive-widget=resizes-content');
		expect(viewport).not.toMatch(/user-scalable|maximum-scale/);
		// Une couleur de barre par thème du système.
		expect(racine.match(/name="theme-color"/g)?.length).toBe(2);
	});
});
