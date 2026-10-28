import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * LA FEUILLE DU SITE NE TOUCHE JAMAIS L'APPLICATION (28/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUE CE TEST EXISTE POUR EMPÊCHER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `styles/site/` est chargée par le `head` des pages publiques, et TanStack ne la retire PAS
 * quand on navigue vers l'application. Mesuré le jour même : après l'appel du site,
 * `/inscription` prenait la police, le fond et les titres du site. Chaque règle vise donc
 * l'intérieur de `.site`, la page entière seulement quand le site est affiché
 * (`:root:has(.site)`, `html:has(.site)`, `body:has(.site)`), et chaque animation porte le
 * préfixe `site-` : douze noms de Plume étaient communs avec l'application, et la dernière
 * définition chargée l'emporte pour tout le document.
 */
const DOSSIER = join(import.meta.dirname, '..', '..', 'styles', 'site');

const CLOISONNE =
	/^(\.site\b|:root:has\(\.site\)|html:has\(\.site\)|body:has\(\.site\)|body \.site\b|html\.menu-ouvert\b)/;

/** Les sélecteurs d'une feuille, hors `@keyframes`, avec un lecteur d'accolades. */
function selecteurs(css: string): { selecteurs: string[]; animations: string[] } {
	const texte = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const pile: string[] = [];
	const trouves: string[] = [];
	const animations: string[] = [];
	let prelude = '';
	let chaine: string | null = null;
	for (const c of texte) {
		if (chaine) {
			if (c === chaine) chaine = null;
			prelude += c;
			continue;
		}
		if (c === '"' || c === "'") {
			chaine = c;
			prelude += c;
		} else if (c === '{') {
			const p = prelude.trim();
			const dansAnimation = pile.some((x) => x.startsWith('@keyframes'));
			if (p.startsWith('@keyframes')) animations.push(p.replace('@keyframes', '').trim());
			else if (!p.startsWith('@') && !dansAnimation) {
				let profondeur = 0;
				let courant = '';
				for (const x of p) {
					if (x === '(') profondeur++;
					if (x === ')') profondeur--;
					if (x === ',' && profondeur === 0) {
						trouves.push(courant.trim());
						courant = '';
					} else courant += x;
				}
				trouves.push(courant.trim());
			}
			pile.push(p);
			prelude = '';
		} else if (c === '}') {
			pile.pop();
			prelude = '';
		} else if (c === ';') {
			prelude = '';
		} else prelude += c;
	}
	return { selecteurs: trouves, animations };
}

describe('la feuille du site', () => {
	const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.css') && f !== 'site.css');

	it('existe, découpée par section', () => {
		expect(fichiers.length).toBeGreaterThan(20);
	});

	it('ne vise que l’intérieur de `.site`, ou la page quand le site est affiché', () => {
		const fuites = fichiers.flatMap((f) =>
			selecteurs(readFileSync(join(DOSSIER, f), 'utf8'))
				.selecteurs.filter((s) => !CLOISONNE.test(s))
				.map((s) => `${f} — ${s}`)
		);
		expect(fuites).toEqual([]);
	});

	it('préfixe chacune de ses animations par `site-`', () => {
		const nues = fichiers.flatMap((f) =>
			selecteurs(readFileSync(join(DOSSIER, f), 'utf8'))
				.animations.filter((a) => !a.startsWith('site-'))
				.map((a) => `${f} — ${a}`)
		);
		expect(nues).toEqual([]);
	});

	it('n’importe que ses polices et ses sections', () => {
		const index = readFileSync(join(DOSSIER, 'site.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
		const imports = [...index.matchAll(/@import\s+'([^']+)'/g)].map((m) => m[1] ?? '');
		expect(imports.filter((i) => !i.startsWith('@fontsource') && !i.startsWith('./'))).toEqual([]);
		expect(index.replace(/@import[^;]+;/g, '').trim()).toBe('');
	});

	/**
	 * ⚠️ UN NOM DE CLASSE DE LA MAQUETTE PEUT ÊTRE UN UTILITAIRE TAILWIND. Tailwind génère un
	 * utilitaire pour tout mot qu'il lit dans les sources : la carte `.table` de la loi devenait
	 * `display: table` et disparaissait (28/10/2026). Chaque nom de cette liste — les utilitaires
	 * sans valeur, ceux qu'un mot seul déclenche — doit être neutralisé dans `defauts.css`.
	 */
	it('neutralise chaque classe qui porte le nom d’un utilitaire Tailwind', () => {
		const UTILITAIRES = new Set(
			'block inline inline-block flex inline-flex grid inline-grid table table-row table-cell table-caption contents list-item hidden flow-root static fixed absolute relative sticky visible invisible collapse isolate truncate italic underline overline uppercase lowercase capitalize grow shrink container border rounded shadow ring outline blur transform transition filter invert grayscale sepia resize'.split(
				' '
			)
		);
		const sources = ['site', join('..', 'ui', 'site')].flatMap((d) => {
			const dossier = join(import.meta.dirname, '..', d);
			return readdirSync(dossier)
				.filter((f) => /\.tsx?$/.test(f))
				.map((f) => readFileSync(join(dossier, f), 'utf8'));
		});
		const classes = new Set(
			sources.flatMap((t) =>
				[...t.matchAll(/class(?:Name)?=["']([^"']+)["']/g)].flatMap((m) =>
					(m[1] ?? '').split(/\s+/)
				)
			)
		);
		const defauts = readFileSync(join(DOSSIER, 'defauts.css'), 'utf8');
		const nues = [...classes].filter(
			(c) => UTILITAIRES.has(c) && !defauts.includes(`.site .${c} {`)
		);
		expect(nues).toEqual([]);
	});

	it('lit ses sélecteurs comme il faut', () => {
		expect(
			selecteurs('.a, .b:is(.c, .d) { x: 1; } @media (x) { .e { y: 2; } }').selecteurs
		).toEqual(['.a', '.b:is(.c, .d)', '.e']);
		expect(selecteurs('@keyframes k { from { x: 0 } to { x: 1 } } .f { content: "{"; }')).toEqual({
			selecteurs: ['.f'],
			animations: ['k']
		});
	});
});
