import { describe, expect, it } from 'vitest';

/**
 * TOUTE MODALE EST UNE PAGE PLEINE (12/10/2026).
 *
 * Le fondateur : « toutes les modales de l'app doivent être comme le système
 * d'upload ou le choix de la défense, en plein écran, pour rester cohérent ».
 * Vingt-quatre feuilles centrées ont été converties le même jour en
 * `FeuillePleinEcran` (`ui/plein-ecran.tsx`). Une feuille centrée qui reviendrait
 * — un `<Popup>` écrit à la main dans un nouvel écran — referait deux grammaires
 * de modale dans le même produit : ce balayage la refuse.
 *
 * La seule exception est la coquille elle-même, `PleinEcran`, qui tire une feuille
 * de Cladd sur tout l'écran pour garder son piège à focus.
 */
const EXCEPTIONS = ['plein-ecran.tsx'];

describe('les modales du produit', () => {
	it('sont toutes des pages pleines', () => {
		const fichiers = import.meta.glob('../../{app,routes,screens,ui}/**/*.tsx', {
			query: '?raw',
			import: 'default',
			eager: true
		}) as Record<string, string>;

		const centrees: string[] = [];
		for (const [chemin, source] of Object.entries(fichiers)) {
			if (/__tests__\//.test(chemin)) continue;
			if (EXCEPTIONS.some((e) => chemin.endsWith(e))) continue;
			source.split('\n').forEach((ligne, rang) => {
				if (/<Popup(\s|>|$)/.test(ligne)) centrees.push(`${chemin}:${rang + 1}`);
			});
		}

		expect(centrees, 'Une modale part de FeuillePleinEcran, pas de Popup').toEqual([]);
	});
});
