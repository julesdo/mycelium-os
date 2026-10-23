/**
 * LE CADRAGE D'UN LOGO : ses marges vides retirées, sa taille ramenée (23/10/2026).
 *
 * Un logo arrive souvent avec un grand fond autour : exporté d'un document, d'un
 * site, d'une signature d'e-mail. Posé tel quel en tête d'une lettre, il paraît
 * minuscule au milieu de son cadre. Le navigateur le rogne donc avant l'envoi,
 * sur les pixels que rend un canevas (RGBA) ; ce module dit où.
 *
 * ⚠️ UN FOND N'EST RETIRÉ QUE S'IL EST UNI. Les quatre coins le désignent : tous
 * transparents, ou tous de la même couleur. Une photo, un dégradé, un coin qui
 * diffère des autres : l'image reste entière, plutôt qu'un logo coupé.
 */

export interface Cadre {
	readonly x: number;
	readonly y: number;
	readonly largeur: number;
	readonly hauteur: number;
}

/** Sous cette opacité, un pixel est transparent. */
const OPACITE_MIN = 16;

/** L'écart sous lequel un pixel se confond avec le fond uni. */
const PROCHE_DU_FOND = 24;

export function cadreDuContenu(
	pixels: Uint8ClampedArray,
	largeur: number,
	hauteur: number
): Cadre | null {
	const lire = (x: number, y: number) => {
		const i = (y * largeur + x) * 4;
		return [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, pixels[i + 3]!] as const;
	};
	const coins = [lire(0, 0), lire(largeur - 1, 0), lire(0, hauteur - 1), lire(largeur - 1, hauteur - 1)];
	const transparent = coins.every((c) => c[3] < OPACITE_MIN);
	const premier = coins[0]!;
	const uni =
		!transparent &&
		coins.every(
			(c) =>
				c[3] >= 255 - OPACITE_MIN &&
				Math.hypot(c[0] - premier[0], c[1] - premier[1], c[2] - premier[2]) < PROCHE_DU_FOND
		);
	if (!transparent && !uni) return { x: 0, y: 0, largeur, hauteur };

	const estFond = (x: number, y: number): boolean => {
		const [r, g, b, a] = lire(x, y);
		if (a < OPACITE_MIN) return true;
		return uni && Math.hypot(r - premier[0], g - premier[1], b - premier[2]) < PROCHE_DU_FOND;
	};

	let gauche = largeur;
	let haut = hauteur;
	let droite = -1;
	let bas = -1;
	for (let y = 0; y < hauteur; y++) {
		for (let x = 0; x < largeur; x++) {
			if (estFond(x, y)) continue;
			if (x < gauche) gauche = x;
			if (x > droite) droite = x;
			if (y < haut) haut = y;
			if (y > bas) bas = y;
		}
	}
	if (droite < 0) return null;
	return { x: gauche, y: haut, largeur: droite - gauche + 1, hauteur: bas - haut + 1 };
}

/** La taille qui tient dans le cadre, proportions gardées, sans jamais agrandir. */
export function ajusterDans(
	largeur: number,
	hauteur: number,
	largeurMax: number,
	hauteurMax: number
): { largeur: number; hauteur: number } {
	const echelle = Math.min(1, largeurMax / largeur, hauteurMax / hauteur);
	return {
		largeur: Math.max(1, Math.round(largeur * echelle)),
		hauteur: Math.max(1, Math.round(hauteur * echelle))
	};
}
