/**
 * LES COULEURS D'UNE MARQUE : les lire, les comparer, les rendre lisibles (23/10/2026).
 *
 * Le gérant pose la couleur de ses courriers ; ce module dit si elle se lit sur
 * le blanc d'une lettre, l'assombrit juste ce qu'il faut quand elle ne se lit pas,
 * et lit dans son logo les teintes qu'on lui propose. Le contraste est celui des
 * WCAG (luminance relative), le seul qu'un relevé puisse recouper.
 *
 * ⚠️ UNE COULEUR ILLISIBLE LÈVE EN LA NOMMANT, sauf à `lireCouleur`, dont c'est
 * le métier de dire non. Une couleur devinée finirait dans un e-mail envoyé.
 */

export interface Rgb {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#rrggbb` ou `#rgb`, ou `null`. */
export function lireCouleur(texte: string): Rgb | null {
	const trouve = HEX.exec(texte.trim());
	if (trouve === null) return null;
	const brut = trouve[1]!;
	const long =
		brut.length === 3
			? brut
					.split('')
					.map((c) => c + c)
					.join('')
			: brut;
	return {
		r: parseInt(long.slice(0, 2), 16),
		g: parseInt(long.slice(2, 4), 16),
		b: parseInt(long.slice(4, 6), 16)
	};
}

function exiger(texte: string): Rgb {
	const couleur = lireCouleur(texte);
	if (couleur === null) throw new Error(`« ${texte} » n’est pas une couleur (#rrggbb attendu).`);
	return couleur;
}

function canal(n: number): string {
	return Math.max(0, Math.min(255, Math.round(n)))
		.toString(16)
		.padStart(2, '0');
}

export function versHex({ r, g, b }: Rgb): string {
	return `#${canal(r)}${canal(g)}${canal(b)}`;
}

/** La forme écrite d'une couleur valide : `#rrggbb`, en minuscules. */
export function normaliserCouleur(texte: string): string {
	return versHex(exiger(texte));
}

function lineaire(valeur: number): number {
	const v = valeur / 255;
	return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminanceRelative(couleur: string): number {
	const { r, g, b } = exiger(couleur);
	return 0.2126 * lineaire(r) + 0.7152 * lineaire(g) + 0.0722 * lineaire(b);
}

/** Le rapport de contraste, de 1 (aucun) à 21 (noir sur blanc). */
export function contraste(a: string, b: string): number {
	const la = luminanceRelative(a);
	const lb = luminanceRelative(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `part` de `autre` dans `couleur` : 0 la laisse, 1 la remplace. */
export function melanger(couleur: string, autre: string, part: number): string {
	const a = exiger(couleur);
	const b = exiger(autre);
	return versHex({
		r: a.r + (b.r - a.r) * part,
		g: a.g + (b.g - a.g) * part,
		b: a.b + (b.b - a.b) * part
	});
}

/**
 * La couleur, assombrie par petits pas jusqu'à atteindre le contraste demandé sur
 * le fond. Une couleur qui se lit déjà revient telle quelle : on ne retouche pas
 * la marque de quelqu'un sans raison.
 */
export function assombrirJusquA(couleur: string, fond: string, minimum: number): string {
	const depart = normaliserCouleur(couleur);
	if (contraste(depart, fond) >= minimum) return depart;
	for (let part = 0.02; part < 1; part += 0.02) {
		const essai = melanger(depart, '#000000', part);
		if (contraste(essai, fond) >= minimum) return essai;
	}
	return '#000000';
}

/** L'écart sous lequel deux couleurs voisines se lisent comme une seule. */
const VOISINES = 48;

/** Sous cet écart entre le canal le plus fort et le plus faible, c'est un gris (blanc et noir compris). */
const GRIS = 40;

/**
 * LES TEINTES FRANCHES D'UN LOGO, de la plus présente à la moins présente.
 *
 * Les pixels arrivent en RGBA, comme les rend un canevas. Le transparent, le
 * blanc, le noir et les gris sont écartés : ce sont le fond et le trait, pas la
 * couleur de la marque. Les nuances voisines (l'anticrénelage d'un bord) se
 * fondent dans la teinte la plus présente, et ce qui pèse moins d'un centième
 * des pixels colorés ne compte pas.
 */
export function teintesDominantes(
	pixels: Uint8ClampedArray | readonly number[],
	maximum = 3
): string[] {
	const cases = new Map<number, { n: number; r: number; g: number; b: number }>();
	let colores = 0;
	for (let i = 0; i + 3 < pixels.length; i += 4) {
		const r = pixels[i]!;
		const g = pixels[i + 1]!;
		const b = pixels[i + 2]!;
		const a = pixels[i + 3]!;
		if (a < 128) continue;
		if (Math.max(r, g, b) - Math.min(r, g, b) < GRIS) continue;
		colores += 1;
		const cle = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
		const c = cases.get(cle) ?? { n: 0, r: 0, g: 0, b: 0 };
		c.n += 1;
		c.r += r;
		c.g += g;
		c.b += b;
		cases.set(cle, c);
	}
	const seuil = colores / 100;
	const retenues: { rgb: Rgb; n: number }[] = [];
	for (const c of [...cases.values()].sort((x, y) => y.n - x.n)) {
		const rgb = { r: c.r / c.n, g: c.g / c.n, b: c.b / c.n };
		const voisine = retenues.find(
			(t) => Math.hypot(t.rgb.r - rgb.r, t.rgb.g - rgb.g, t.rgb.b - rgb.b) < VOISINES
		);
		if (voisine !== undefined) {
			voisine.n += c.n;
			continue;
		}
		retenues.push({ rgb, n: c.n });
	}
	return retenues
		.filter((t) => t.n >= seuil)
		.sort((x, y) => y.n - x.n)
		.slice(0, maximum)
		.map((t) => versHex(t.rgb));
}
